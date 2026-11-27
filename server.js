const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

require("dotenv").config();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
const rawAdminPath = (process.env.ADMIN_PATH || "/admin").trim().replace(/^\/+|\/+$/g, "");
const ADMIN_PATH = rawAdminPath && !["api", "invite"].includes(rawAdminPath.toLowerCase())
  ? `/${rawAdminPath}`
  : "/admin";

// One bounded TLS pool serves application queries and admin sessions.
const db = require("./database");

// =====================================================
// IN-MEMORY RATE LIMITER (PER WARM INSTANCE)
// =====================================================
const rateLimitMap = new Map();
function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetTime) {
    if (!record && rateLimitMap.size >= 10000) return false;
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return 1 <= limit;
  }
  record.count++;
  return record.count <= limit;
}

const rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) rateLimitMap.delete(key);
  }
}, 60000);
rateLimitCleanup.unref();

function sanitizeText(str) {
  return typeof str === "string" ? str.trim() : "";
}

function safeEqual(input, expected) {
  if (typeof input !== "string" || typeof expected !== "string" || !expected) return false;
  const hashA = crypto.createHash("sha256").update(input, "utf8").digest();
  const hashB = crypto.createHash("sha256").update(expected, "utf8").digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function buildInviteLink(req, token) {
  const base = PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/invite/${token}`;
}

// =====================================================
// GLOBAL SECURITY & PARSER MIDDLEWARES
// =====================================================
app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: false, limit: "16kb" }));

// Block direct /guests.html, /admin.html, and legacy /admin when ADMIN_PATH is customized
const NOT_FOUND_HTML_PATH = path.join(PUBLIC_DIR, "404.html");

function sendNotFoundPage(res) {
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  return res.status(404).sendFile(NOT_FOUND_HTML_PATH);
}

app.use((req, res, next) => {
  const reqPath = req.path.toLowerCase();
  if (
    reqPath === "/admin.html" ||
    reqPath === "/guests.html" ||
    reqPath === "/404.html" ||
    (ADMIN_PATH.toLowerCase() !== "/admin" && (reqPath === "/admin" || reqPath === "/admin/"))
  ) {
    return sendNotFoundPage(res);
  }
  next();
});

// Static files with Cache-Control headers (0 in development to prevent stale browser cache)
app.use(
  express.static(PUBLIC_DIR, {
    maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
    setHeaders(res, file) {
      if (/asset\.[a-f0-9]{12}\.(mp3|jpg|jfif|webp|png|avif)$/i.test(file)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (/\.(html|css|js|webmanifest)$/i.test(file)) {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      }
    },
    etag: true
  })
);

// =====================================================
// PRE-DB API RATE LIMITING & TOKEN VALIDATION
// Protects MySQL pool & session store from flood traffic
// =====================================================
app.param("token", (req, res, next, token) => {
  if (req.path.startsWith("/api/") && !/^[a-f0-9]{32}$/i.test(token)) {
    return res.status(404).json({ success: false, message: "Link thiệp không hợp lệ." });
  }
  next();
});

app.use("/api", (req, res, next) => {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";

  if (req.path === "/admin/login" && req.method === "POST") {
    if (!checkRateLimit(`login_${ip}`, 15, 5 * 60 * 1000)) {
      res.setHeader("Retry-After", "300");
      return res.status(429).json({
        success: false,
        message: "Quá nhiều lần thử đăng nhập. Vui lòng chờ 5 phút."
      });
    }
    return next();
  }

  if (req.path.startsWith("/admin")) {
    const isRead = req.method === "GET" || req.method === "HEAD";
    const key = `admin_${ip}_${isRead ? "read" : "write"}`;
    const limit = isRead ? 180 : 120;
    if (!checkRateLimit(key, limit, 60000)) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ success: false, message: "Quá nhiều yêu cầu quản trị. Vui lòng chờ giây lát." });
    }
    return next();
  }

  const match = req.path.match(/^\/invite\/([a-f0-9]{32})(?:\/(wishes|attendance))?$/i);
  const isRead = req.method === "GET" || req.method === "HEAD";
  const key = match ? `invite_${match[1]}_${req.method}_${match[2] || "info"}` : `pub_${ip}_${isRead ? "read" : "write"}`;
  const limit = isRead ? 120 : 20;
  if (!checkRateLimit(key, limit, 60000)) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ success: false, message: "Quá nhiều yêu cầu. Vui lòng chờ một phút." });
  }
  next();
});

// =====================================================
// SESSION STORE (ISOLATED ONLY TO ADMIN ROUTES)
// =====================================================
// Initialize the session table lazily; opening a static invitation never queries DB.
const sessionStore = new MySQLStore({
  createDatabaseTable: false,
  clearExpired: false,
  endConnectionOnClose: false
}, db);
let sessionReady;
async function ensureSessionTable(req, res, next) {
  try {
    if (!sessionReady) {
      sessionReady = sessionStore.createDatabaseTable().catch((error) => {
        sessionReady = null;
        throw error;
      });
    }
    await sessionReady;
    next();
  } catch (error) {
    next(error);
  }
}

if (process.env.NODE_ENV === "production" && (!process.env.SESSION_SECRET ||
    /^(wedding_long_loan_2026_super_secret|replace_with_a_long_random_secret)/.test(process.env.SESSION_SECRET))) {
  throw new Error("Production requires a private SESSION_SECRET.");
}
const adminSession = session({
  secret: process.env.SESSION_SECRET || "wedding_long_loan_2026_super_secret",
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
});

// Attach session ONLY to admin API routes to avoid MySQL query overhead for guests
app.use("/api/admin", ensureSessionTable, adminSession);

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Bạn chưa đăng nhập admin."
  });
}

// =====================================================
// HEALTH CHECK
// =====================================================
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    return res.json({
      success: true,
      message: "Wedding API is running.",
      database: "connected"
    });
  } catch (error) {
    console.error("DATABASE HEALTH ERROR:", error);
    return res.status(503).json({
      success: false,
      message: "Không thể kết nối cơ sở dữ liệu MySQL."
    });
  }
});

// =====================================================
// ADMIN AUTH APIS
// =====================================================
app.post("/api/admin/login", async (req, res) => {
  try {
    const username = sanitizeText(req.body?.username);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin."
      });
    }

    const validUser = safeEqual(username, process.env.ADMIN_USERNAME);
    const validPass = safeEqual(password, process.env.ADMIN_PASSWORD);
    if (validUser && validPass) {
      await new Promise((resolve, reject) => req.session.regenerate((err) => err ? reject(err) : resolve()));
      req.session.isAdmin = true;
      return req.session.save((err) => {
        if (err) {
          console.error("SESSION SAVE ERROR:", err);
          return res.status(500).json({
            success: false,
            message: "Không thể lưu phiên đăng nhập. Vui lòng thử lại sau."
          });
        }
        return res.json({
          success: true,
          message: "Đăng nhập thành công."
        });
      });
    }

    return res.status(401).json({
      success: false,
      message: "Tên đăng nhập hoặc mật khẩu không đúng."
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi đăng nhập."
    });
  }
});

app.get("/api/admin/me", (req, res) => {
  return res.json({
    loggedIn: !!(req.session && req.session.isAdmin === true)
  });
});

app.post("/api/admin/logout", (req, res) => {
  if (!req.session) {
    return res.json({ success: true });
  }
  req.session.destroy((err) => {
    if (err) {
      console.error("LOGOUT ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Không thể đăng xuất."
      });
    }
    res.clearCookie("connect.sid");
    return res.json({ success: true });
  });
});

// =====================================================
// ADMIN GUEST MANAGEMENT APIS
// =====================================================
app.get("/api/admin/guests", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, token, attendance, created_at
      FROM guests
      ORDER BY id DESC
    `);

    const guests = rows.map((guest) => ({
      id: guest.id,
      name: guest.name,
      token: guest.token,
      created_at: guest.created_at,
      attendance: guest.attendance,
      link: buildInviteLink(req, guest.token)
    }));

    return res.json(guests);
  } catch (error) {
    console.error("GET GUESTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách khách."
    });
  }
});

app.post("/api/admin/guests", requireAdmin, async (req, res) => {
  try {
    const name = sanitizeText(req.body?.name);
    if (!name || [...name].length > 255) {
      return res.status(400).json({
        success: false,
        message: "Tên khách phải là chuỗi từ 1 đến 255 ký tự."
      });
    }

    const token = crypto.randomBytes(16).toString("hex");
    const [result] = await db.query(
      `INSERT INTO guests (name, token) VALUES (?, ?)`,
      [name, token]
    );

    const link = buildInviteLink(req, token);

    return res.status(201).json({
      success: true,
      id: result.insertId,
      name,
      token,
      attendance: "pending",
      link
    });
  } catch (error) {
    console.error("CREATE GUEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tạo link khách."
    });
  }
});

// High-throughput batch guest creation (1 query per chunk instead of N serial requests)
app.post("/api/admin/guests/bulk", requireAdmin, async (req, res) => {
  try {
    const rawNames = req.body?.names;
    if (!Array.isArray(rawNames) || rawNames.length === 0 || rawNames.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Danh sách khách mỗi đợt phải từ 1 đến 200 tên."
      });
    }

    const entries = [];
    for (const item of rawNames) {
      const name = sanitizeText(item);
      if (!name || [...name].length > 255) {
        return res.status(400).json({
          success: false,
          message: "Mỗi tên khách phải là chuỗi từ 1 đến 255 ký tự."
        });
      }
      entries.push({
        name,
        token: crypto.randomBytes(16).toString("hex")
      });
    }

    const placeholders = entries.map(() => "(?, ?)").join(", ");
    const values = [];
    for (const entry of entries) {
      values.push(entry.name, entry.token);
    }

    const [result] = await db.query(
      `INSERT INTO guests (name, token) VALUES ${placeholders}`,
      values
    );

    const baseId = Number(result?.insertId) || 0;
    const created = entries.map((entry, idx) => ({
      id: baseId ? baseId + idx : undefined,
      name: entry.name,
      token: entry.token,
      attendance: "pending",
      link: buildInviteLink(req, entry.token)
    }));

    return res.status(201).json({
      success: true,
      created
    });
  } catch (error) {
    console.error("BULK CREATE GUESTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tạo danh sách link khách hàng loạt."
    });
  }
});

app.delete("/api/admin/guests/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID khách không hợp lệ."
      });
    }

    await db.query(`DELETE FROM guests WHERE id = ?`, [id]);

    return res.json({ success: true });
  } catch (error) {
    console.error("DELETE GUEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa khách."
    });
  }
});

// =====================================================
// ADMIN WISH MANAGEMENT APIS
// =====================================================
app.get("/api/admin/wishes", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT wishes.id, wishes.message, wishes.created_at, guests.name
      FROM wishes
      INNER JOIN guests ON wishes.guest_id = guests.id
      ORDER BY wishes.id DESC
    `);
    return res.json(rows);
  } catch (error) {
    console.error("ADMIN WISHES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy lời chúc."
    });
  }
});

app.delete("/api/admin/wishes/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID lời chúc không hợp lệ."
      });
    }

    await db.query(`DELETE FROM wishes WHERE id = ?`, [id]);

    return res.json({ success: true });
  } catch (error) {
    console.error("DELETE WISH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa lời chúc."
    });
  }
});

// =====================================================
// PUBLIC INVITATION APIS (STATELESS & HIGH PERFORMANCE)
// =====================================================
const WISH_PAGE_SIZE = 50;

// One round trip and one connection: an invalid token returns no rows; a valid
// invitation without wishes returns its guest with a NULL wish_id.
async function readInvitation(token, before) {
  const [rows] = await db.query(`
    SELECT g.id, g.name, g.attendance,
           w.id AS wish_id, w.message, w.created_at, authors.name AS author_name
    FROM guests g
    LEFT JOIN (
      SELECT wishes.id, wishes.guest_id, wishes.message, wishes.created_at
      FROM wishes
      ${before ? "WHERE wishes.id < ?" : ""}
      ORDER BY wishes.id DESC LIMIT ${WISH_PAGE_SIZE + 1}
    ) w ON TRUE
    LEFT JOIN guests authors ON authors.id = w.guest_id
    WHERE g.token = ?
    ORDER BY w.id DESC
  `, before ? [before, token] : [token]);
  if (!rows.length) return null;
  const wishes = rows.filter(row => row.wish_id != null).map(row => ({
    id: row.wish_id, message: row.message, created_at: row.created_at, name: row.author_name
  }));
  const hasMore = wishes.length > WISH_PAGE_SIZE;
  wishes.length = Math.min(wishes.length, WISH_PAGE_SIZE);
  return {
    success: true,
    guest: { id: rows[0].id, name: rows[0].name, attendance: rows[0].attendance },
    wishes, hasMore,
    nextCursor: hasMore ? wishes[wishes.length - 1].id : null
  };
}

app.get("/api/invite/:token", async (req, res, next) => {
  try {
    const data = await readInvitation(req.params.token);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Link thiệp không tồn tại."
      });
    }
    return res.json(data);
  } catch (error) {
    next(error);
  }
});

// Read current wishes; no cross-instance cache invalidation is required.
app.get("/api/invite/:token/wishes", async (req, res, next) => {
  try {
    const token = req.params.token;
    const rawBefore = req.query.before;
    const before = rawBefore === undefined ? undefined : Number(rawBefore);
    if (rawBefore !== undefined && (typeof rawBefore !== "string" ||
        !/^\d+$/.test(rawBefore) || !Number.isSafeInteger(before) || before < 1)) {
      return res.status(400).json({ success: false, message: "Mốc phân trang không hợp lệ." });
    }
    const data = await readInvitation(token, before);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Link thiệp không tồn tại."
      });
    }

    return res.json({ wishes: data.wishes, hasMore: data.hasMore, nextCursor: data.nextCursor });
  } catch (error) {
    next(error);
  }
});

// SUBMIT WISH
app.post("/api/invite/:token/wishes", async (req, res, next) => {
  try {
    const token = req.params.token;
    if (!checkRateLimit(`wish_${token}`, 6, 60 * 1000)) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({
        success: false,
        message: "Bạn gửi lời chúc quá nhanh. Vui lòng thử lại sau 1 phút."
      });
    }

    const message = sanitizeText(req.body?.message);
    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Lời chúc không được để trống."
      });
    }

    if ([...message].length > 500) {
      return res.status(400).json({
        success: false,
        message: "Lời chúc tối đa 500 ký tự."
      });
    }

    const [guests] = await db.query(
      `SELECT id, name FROM guests WHERE token = ? LIMIT 1`,
      [token]
    );

    if (guests.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Link khách không tồn tại."
      });
    }

    const guest = guests[0];
    const MAX_WISHES_PER_GUEST = 3;
    const [[countRow]] = await db.query(
      `SELECT COUNT(*) AS total FROM wishes WHERE guest_id = ?`,
      [guest.id]
    );
    if (Number(countRow?.total || 0) >= MAX_WISHES_PER_GUEST) {
      return res.status(429).json({
        success: false,
        message: `Mỗi khách mời chỉ được gửi tối đa ${MAX_WISHES_PER_GUEST} lời chúc.`
      });
    }

    const [result] = await db.query(
      `INSERT INTO wishes (guest_id, message) VALUES (?, ?)`,
      [guest.id, message]
    );

    const wish = {
      id: result.insertId,
      guest_id: guest.id,
      name: guest.name,
      message,
      created_at: new Date()
    };

    return res.status(201).json({
      success: true,
      wish
    });
  } catch (error) {
    next(error);
  }
});

// CONFIRM ATTENDANCE (RSVP)
app.post("/api/invite/:token/attendance", async (req, res, next) => {
  try {
    const token = req.params.token;
    const attendance = req.body?.attendance;

    if (attendance !== "yes" && attendance !== "no") {
      return res.status(400).json({
        success: false,
        message: "Lựa chọn tham dự không hợp lệ."
      });
    }

    const [guests] = await db.query(
      `SELECT id FROM guests WHERE token = ? LIMIT 1`,
      [token]
    );

    if (guests.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Link khách không tồn tại."
      });
    }

    await db.query(`UPDATE guests SET attendance = ? WHERE id = ?`, [
      attendance,
      guests[0].id
    ]);

    return res.json({
      success: true,
      attendance
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// FRONTEND PAGE ROUTES (WITH DYNAMIC OPEN GRAPH TAGS)
// =====================================================
const GUESTS_HTML_PATH = path.join(PUBLIC_DIR, "guests.html");

function escapeHtmlAttr(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendGuestPage(req, res, guestName = "") {
  try {
    const base = PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const ogImageUrl = escapeHtmlAttr(`${base}/images/og-cover.png`);
    const ogUrl = escapeHtmlAttr(`${base}${req.originalUrl}`);
    let html = await fs.promises.readFile(GUESTS_HTML_PATH, "utf8");

    html = html
      .replace(/content="\/images\/og-cover\.png"/g, `content="${ogImageUrl}"`)
      .replace(
        '<meta property="og:type" content="website" />',
        `<meta property="og:type" content="website" />\n  <meta property="og:url" content="${ogUrl}" />`
      );

    if (guestName) {
      const shareTitle = escapeHtmlAttr(`Trân trọng kính mời ${guestName} — Thiệp Cưới Ngọc Long & Thanh Loan`);
      html = html
        .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${shareTitle}" />`)
        .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${shareTitle}" />`)
        .replace(/<title>[^<]*<\/title>/, `<title>${shareTitle}</title>`);
    }

    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    return res.type("html").send(html);
  } catch (err) {
    console.error("SERVE GUEST PAGE ERROR:", err);
    return res.sendFile(GUESTS_HTML_PATH);
  }
}

app.get([ADMIN_PATH, `${ADMIN_PATH}/`], (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});

app.get("/invite/:token", async (req, res) => {
  let guestName = "";
  const token = req.params.token;
  if (!/^[a-f0-9]{32}$/i.test(token)) {
    return sendNotFoundPage(res);
  }
  try {
    const [rows] = await db.query(`SELECT name FROM guests WHERE token = ? LIMIT 1`, [token]);
    if (rows.length === 0) {
      return sendNotFoundPage(res);
    }
    if (rows[0].name) guestName = rows[0].name;
  } catch {
    // Fall back to default Open Graph metadata if DB is temporarily unavailable
  }
  return sendGuestPage(req, res, guestName);
});

app.get("/", (req, res) => {
  return sendNotFoundPage(res);
});

// 404 API Handler
app.use("/api", (req, res) => {
  return res.status(404).json({
    success: false,
    message: `API không tồn tại: ${req.method} ${req.originalUrl}`
  });
});

// 404 Page Handler for any other unknown route
app.use((req, res) => {
  return sendNotFoundPage(res);
});

// =====================================================
// GLOBAL EXPRESS JSON ERROR HANDLER
// Ensures the server NEVER returns HTML on /api errors
// =====================================================
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const unavailable = /^(ECONN|ENOTFOUND|ETIMEDOUT|EPIPE|PROTOCOL_)/.test(err.code || "") ||
    ["No connections available.", "Queue limit reached."].includes(err.message) ||
    ["DB_QUEUE_FULL", "DB_ACQUIRE_TIMEOUT", "DB_POOL_CLOSED", "ER_CON_COUNT_ERROR",
      "ER_TOO_MANY_USER_CONNECTIONS", "ER_USER_LIMIT_REACHED", "ER_LOCK_WAIT_TIMEOUT",
      "ER_LOCK_DEADLOCK"].includes(err.code);
  const status = err.type === "entity.too.large" ? 413 :
    err.type === "entity.parse.failed" || err instanceof URIError ? 400 : unavailable ? 503 : 500;
  if (status === 503) res.setHeader("Retry-After", "3");
  // Expected overload must not produce two full stack traces per rejected read.
  if (status === 500) console.error("GLOBAL SERVER ERROR:", err);
  return res.status(status).json({
    success: false,
    message: status === 413 ? "Dữ liệu gửi lên quá lớn." :
      status === 400 ? "Dữ liệu yêu cầu không hợp lệ." :
      status === 503 && req.method !== "GET" ? "Chưa xác nhận được kết quả gửi. Hãy kiểm tra lại trạng thái trước khi gửi lại." :
      "Máy chủ tạm thời không khả dụng. Vui lòng thử lại sau."
  });
});

// =====================================================
// START SERVER (WHEN EXECUTED DIRECTLY)
// =====================================================
if (require.main === module) {
  const os = require("os");
  const server = app.listen(PORT, () => {
    let lanUrl = "";
    const nets = os.networkInterfaces();
    for (const items of Object.values(nets)) {
      const found = (items || []).find((n) => n.family === "IPv4" && !n.internal);
      if (found) {
        lanUrl = `http://${found.address}:${PORT}`;
        break;
      }
    }
    console.log("==========================================");
    console.log(`🌸 Wedding Server running at http://localhost:${PORT}`);
    if (lanUrl) console.log(`📱 LAN Access     : ${lanUrl}`);
    console.log(`🔑 Admin Login    : http://localhost:${PORT}${ADMIN_PATH}`);
    console.log("🗄️  Database Mode  : Local MySQL");
    console.log("==========================================");
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.closeAllConnections?.();
    server.close(() => {
      db.end().catch(() => {}).finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

module.exports = app;
