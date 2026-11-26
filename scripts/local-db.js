const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const mysql = require("mysql2/promise");

const ROOT_DIR = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(ROOT_DIR, ".env") });

const LOCAL_DB_DIR = path.join(ROOT_DIR, ".local-mysql");
const DATA_DIR = path.join(LOCAL_DB_DIR, "data");
const LOG_FILE = path.join(LOCAL_DB_DIR, "mysql.err.log");
const PID_FILE = path.join(LOCAL_DB_DIR, "mysql.pid");
const INIT_FILE = path.join(LOCAL_DB_DIR, "init.sql");
const SCHEMA_FILE = path.join(ROOT_DIR, "schema.sql");

const host = (process.env.DB_HOST || "127.0.0.1").trim();
const port = Number(process.env.DB_PORT || 3307);
const user = (process.env.DB_USER || "wedding").trim();
const password = process.env.DB_PASSWORD || "";
const database = (process.env.DB_NAME || "wedding").trim();

function toPosix(p) {
  return p.replace(/\\/g, "/");
}

function assertSafeIdentifier(value, label) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`${label} không hợp lệ: "${value}" (chỉ cho phép chữ, số và dấu gạch dưới).`);
  }
}

function findMysqldBinary() {
  if (process.env.MYSQLD_PATH && fs.existsSync(process.env.MYSQLD_PATH)) {
    return process.env.MYSQLD_PATH;
  }
  if (process.platform === "win32") {
    const candidates = [
      "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqld.exe",
      "C:/Program Files/MySQL/MySQL Server 8.4/bin/mysqld.exe",
      "C:/xampp/mysql/bin/mysqld.exe"
    ];
    const mysqlProgramDir = "C:/Program Files/MySQL";
    if (fs.existsSync(mysqlProgramDir)) {
      for (const entry of fs.readdirSync(mysqlProgramDir)) {
        candidates.push(path.join(mysqlProgramDir, entry, "bin", "mysqld.exe"));
      }
    }
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return "mysqld";
}

function isLocalHost(targetHost) {
  return ["127.0.0.1", "localhost", "::1"].includes(targetHost.toLowerCase());
}

async function tryConnect(overrides = {}) {
  const conn = await mysql.createConnection({
    host: host === "localhost" ? "127.0.0.1" : host,
    port,
    user,
    password,
    connectTimeout: 1500,
    multipleStatements: true,
    charset: "utf8mb4",
    ...overrides
  });
  return conn;
}

async function isReachable(overrides = {}) {
  let conn;
  try {
    conn = await tryConnect(overrides);
    await conn.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

async function runInitialize(binary) {
  fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  console.log(`📦 Đang khởi tạo dữ liệu MySQL local lần đầu tại ${DATA_DIR}...`);
  const child = spawn(
    binary,
    [
      "--no-defaults",
      "--initialize-insecure",
      "--character-set-server=utf8mb4",
      "--collation-server=utf8mb4_unicode_ci",
      `--datadir=${toPosix(DATA_DIR)}`
    ],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }
  );

  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const [code] = await once(child, "exit");
  if (code !== 0) {
    throw new Error(`Khởi tạo MySQL thất bại (mã ${code}):\n${output.slice(-2000)}`);
  }
}

function writeInitSql() {
  assertSafeIdentifier(database, "DB_NAME");
  assertSafeIdentifier(user, "DB_USER");
  const escapedPass = mysql.escape(password);

  const lines = [
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    `CREATE USER IF NOT EXISTS '${user}'@'127.0.0.1' IDENTIFIED BY ${escapedPass};`,
    `ALTER USER '${user}'@'127.0.0.1' IDENTIFIED BY ${escapedPass};`,
    `GRANT ALL PRIVILEGES ON \`${database}\`.* TO '${user}'@'127.0.0.1';`,
    `GRANT SHUTDOWN ON *.* TO '${user}'@'127.0.0.1';`,
    `CREATE USER IF NOT EXISTS '${user}'@'localhost' IDENTIFIED BY ${escapedPass};`,
    `ALTER USER '${user}'@'localhost' IDENTIFIED BY ${escapedPass};`,
    `GRANT ALL PRIVILEGES ON \`${database}\`.* TO '${user}'@'localhost';`,
    `GRANT SHUTDOWN ON *.* TO '${user}'@'localhost';`,
    `FLUSH PRIVILEGES;`
  ];
  fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  fs.writeFileSync(INIT_FILE, lines.join("\n") + "\n", "utf8");
}

async function startManagedMysqld() {
  const binary = findMysqldBinary();
  const initialized = fs.existsSync(path.join(DATA_DIR, "mysql"));
  if (!initialized) {
    await runInitialize(binary);
  }

  writeInitSql();

  console.log(`🚀 Đang bật MySQL local tại 127.0.0.1:${port}...`);
  const args = [
    "--no-defaults",
    `--datadir=${toPosix(DATA_DIR)}`,
    `--port=${port}`,
    "--bind-address=127.0.0.1",
    "--mysqlx=0",
    "--skip-log-bin",
    "--skip-name-resolve",
    `--init-file=${toPosix(INIT_FILE)}`,
    "--character-set-server=utf8mb4",
    "--collation-server=utf8mb4_unicode_ci",
    "--innodb-buffer-pool-size=64M",
    `--pid-file=${toPosix(PID_FILE)}`,
    `--log-error=${toPosix(LOG_FILE)}`
  ];

  if (process.platform === "win32") {
    const psQuote = (s) => `'${String(s).replace(/'/g, "''")}'`;
    const argList = args.map(psQuote).join(", ");
    const psCmd = `Start-Process -FilePath ${psQuote(binary)} -ArgumentList @(${argList}) -WindowStyle Hidden`;
    const launcher = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", psCmd],
      { windowsHide: true, stdio: "ignore" }
    );
    await once(launcher, "exit");
  } else {
    const child = spawn(binary, args, {
      detached: true,
      windowsHide: true,
      stdio: "ignore"
    });
    child.unref();
  }

  for (let i = 0; i < 75; i++) {
    if (await isReachable({ database })) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const recentLog = fs.existsSync(LOG_FILE)
    ? fs.readFileSync(LOG_FILE, "utf8").slice(-1500)
    : "Không có file log.";
  throw new Error(`MySQL local không phản hồi sau 15 giây.\nLog gần nhất:\n${recentLog}`);
}

async function applySchema() {
  assertSafeIdentifier(database, "DB_NAME");
  const conn = await tryConnect();
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.query(`USE \`${database}\`;`);
    const schemaSql = fs.readFileSync(SCHEMA_FILE, "utf8");
    await conn.query(schemaSql);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`sessions\` (
        \`session_id\` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
        \`expires\` INT UNSIGNED NOT NULL,
        \`data\` MEDIUMTEXT COLLATE utf8mb4_bin,
        PRIMARY KEY (\`session_id\`)
      ) ENGINE=InnoDB;
    `);
  } finally {
    await conn.end().catch(() => {});
  }
}

async function ensureLocalDb() {
  if (!isLocalHost(host)) {
    console.log(`ℹ️ DB_HOST="${host}" không phải máy cục bộ, bỏ qua khởi tạo MySQL local.`);
    return;
  }

  const alreadyUp = await isReachable();
  if (!alreadyUp) {
    if (port === 3306) {
      throw new Error(
        "Không kết nối được MySQL trên cổng 3306 với thông tin trong .env. " +
        "Hãy kiểm tra DB_USER/DB_PASSWORD của dịch vụ MySQL80 hoặc đổi DB_PORT=3307 để dùng MySQL tự quản lý của dự án."
      );
    }
    await startManagedMysqld();
  }

  await applySchema();
  console.log(`✅ Database local sẵn sàng: mysql://${user}@127.0.0.1:${port}/${database}`);
}

async function printStatus() {
  const up = await isReachable({ database });
  if (!up) {
    console.log(`⚪ MySQL local (${host}:${port}/${database}) hiện đang TẮT.`);
    return;
  }
  const conn = await tryConnect({ database });
  try {
    const [[ver]] = await conn.query("SELECT VERSION() AS version");
    const [[gCount]] = await conn.query("SELECT COUNT(*) AS count FROM guests");
    const [[wCount]] = await conn.query("SELECT COUNT(*) AS count FROM wishes");
    const [[sCount]] = await conn.query("SELECT COUNT(*) AS count FROM sessions");
    console.log("==========================================");
    console.log("🟢 TRẠNG THÁI DATABASE LOCAL: ĐANG CHẠY");
    console.log(`   • Phiên bản : MySQL ${ver.version}`);
    console.log(`   • Kết nối   : 127.0.0.1:${port}`);
    console.log(`   • Database  : ${database} (user: ${user})`);
    console.log(`   • Dữ liệu   : ${DATA_DIR}`);
    console.log(`   • Khách mời : ${gCount.count}`);
    console.log(`   • Lời chúc  : ${wCount.count}`);
    console.log(`   • Phiên AD  : ${sCount.count}`);
    console.log("==========================================");
  } finally {
    await conn.end().catch(() => {});
  }
}

async function stopLocalDb() {
  if (!(await isReachable())) {
    console.log(`ℹ️ MySQL local trên cổng ${port} hiện không chạy.`);
    return;
  }
  if (port === 3306) {
    console.log("⚠️ Cổng 3306 là dịch vụ MySQL hệ thống (MySQL80), không tự động tắt từ script dự án.");
    return;
  }
  let stoppedViaSql = false;
  const conn = await tryConnect();
  try {
    await conn.query("SHUTDOWN");
    stoppedViaSql = true;
  } catch {
    // Fallback to PID termination if SHUTDOWN privilege was not yet loaded
  } finally {
    await conn.end().catch(() => {});
  }
  if (!stoppedViaSql && fs.existsSync(PID_FILE)) {
    const pid = Number(fs.readFileSync(PID_FILE, "utf8").trim());
    if (Number.isInteger(pid) && pid > 0) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {}
    }
  }
  for (let i = 0; i < 30; i++) {
    if (!(await isReachable())) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  console.log(`🛑 Đã dừng MySQL local trên cổng ${port}.`);
}

async function main() {
  const action = (process.argv[2] || "ensure").toLowerCase();
  if (action === "ensure" || action === "start") {
    await ensureLocalDb();
    if (action === "start") await printStatus();
  } else if (action === "status") {
    await printStatus();
  } else if (action === "stop") {
    await stopLocalDb();
  } else {
    throw new Error(`Lệnh không hợp lệ: "${action}". Hỗ trợ: ensure | start | status | stop`);
  }
}

main().catch((err) => {
  console.error("❌ Lỗi quản lý MySQL local:", err.message);
  process.exitCode = 1;
});
