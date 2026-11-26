const mysql = require("mysql2/promise");
const fs = require("fs");

function positiveInt(value, fallback) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

const host = (process.env.DB_HOST || "127.0.0.1").trim();
const local = ["localhost", "127.0.0.1", "::1"].includes(host.toLowerCase());
const tls = process.env.DB_SSL === "true" || (!local && process.env.DB_SSL !== "false");
const ca = tls
  ? (process.env.DB_SSL_CA?.replace(/\\n/g, "\n") ||
    (process.env.DB_SSL_CA_FILE ? fs.readFileSync(process.env.DB_SSL_CA_FILE, "utf8") : undefined))
  : undefined;
const connectionLimit = positiveInt(process.env.DB_CONNECTION_LIMIT, 10);
const requestedIdle = Number(process.env.DB_MAX_IDLE ?? 5);
const maxIdle = Math.min(connectionLimit - 1,
  Number.isSafeInteger(requestedIdle) && requestedIdle >= 0 ? requestedIdle : 5);
const pool = mysql.createPool({
  host,
  port: positiveInt(process.env.DB_PORT, 3307),
  user: process.env.DB_USER || "wedding",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "wedding",
  ssl: tls ? { rejectUnauthorized: true, verifyIdentity: true, ...(ca ? { ca } : {}) } : undefined,
  connectionLimit,
  // Queue in the application so timed-out waiters can actually be removed.
  waitForConnections: false,
  connectTimeout: positiveInt(process.env.DB_CONNECT_TIMEOUT_MS, 3000),
  maxIdle,
  idleTimeout: 10000,
  enableKeepAlive: true,
  charset: "utf8mb4"
});

const queueLimit = positiveInt(process.env.DB_QUEUE_LIMIT, 50);
const acquireTimeout = positiveInt(process.env.DB_ACQUIRE_TIMEOUT_MS, 750);
const waiters = [];
let active = 0;
let closed = false;
function unavailable(code) {
  return Object.assign(new Error(code), { code });
}
function enter() {
  if (closed) return Promise.reject(unavailable("DB_POOL_CLOSED"));
  if (active < connectionLimit) { active++; return Promise.resolve(); }
  if (waiters.length >= queueLimit) return Promise.reject(unavailable("DB_QUEUE_FULL"));
  return new Promise((resolve, reject) => {
    const waiter = { resolve, reject, timer: null };
    waiter.timer = setTimeout(() => {
      const index = waiters.indexOf(waiter);
      if (index !== -1) waiters.splice(index, 1);
      reject(unavailable("DB_ACQUIRE_TIMEOUT"));
    }, acquireTimeout);
    waiters.push(waiter);
  });
}
function leave() {
  const waiter = waiters.shift();
  if (waiter) {
    clearTimeout(waiter.timer);
    waiter.resolve(); // transfer this slot, never exceed connectionLimit
  } else active--;
}

module.exports = {
  async query(sql, values) {
    await enter();
    let connection;
    let destroyed = false;
    try {
      connection = await pool.getConnection();
      return await connection.query({
        sql,
        timeout: positiveInt(process.env.DB_QUERY_TIMEOUT_MS, 4000)
      }, values);
    } catch (error) {
      if (connection && error.code === "PROTOCOL_SEQUENCE_TIMEOUT") {
        connection.destroy();
        destroyed = true;
      }
      // Do not retry writes: a timeout may occur after MySQL committed them.
      throw error;
    } finally {
      if (connection && !destroyed) connection.release();
      leave();
    }
  },
  end() {
    closed = true;
    for (const waiter of waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(unavailable("DB_POOL_CLOSED"));
    }
    return pool.end();
  }
};
