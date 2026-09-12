/**
 * Sinh ma kich hoat Premium cho RapPhim TV (ky bang khoa bi mat Ed25519 cua tac gia).
 *
 *   node tools/gen-license.js "Tên khách" [số-ngày-hết-hạn]
 *
 * - Khong truyen so ngay -> ma VINH VIEN.
 * - Vi du:  node tools/gen-license.js "Nguyen Van A" 365
 *
 * Khoa bi mat doc tu bien moi truong RAPTV_SECRET, hoac tep tools/author-secret.txt.
 * GIU KHOA BI MAT KIN. Ai co no la tao duoc ma Premium.
 */
const nacl = require("tweetnacl");
const fs = require("fs");
const path = require("path");

function loadSecret() {
  if (process.env.RAPTV_SECRET) return process.env.RAPTV_SECRET.trim();
  const f = path.join(__dirname, "author-secret.txt");
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8").trim();
  console.error("Thiếu khoá bí mật: đặt RAPTV_SECRET hoặc tạo tools/author-secret.txt");
  process.exit(1);
}

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const secret = new Uint8Array(Buffer.from(loadSecret(), "base64"));
const name = process.argv[2] || "";
const days = parseInt(process.argv[3] || "0", 10);
const exp = days > 0 ? Math.floor(Date.now() / 1000) + days * 86400 : 0;

const payload = Buffer.from(JSON.stringify({ tier: "premium", name, exp }), "utf8");
const sig = nacl.sign.detached(new Uint8Array(payload), secret);
const key = "RAPTV." + b64url(payload) + "." + b64url(Buffer.from(sig));

console.log("");
console.log("  Khách:   ", name || "(không tên)");
console.log("  Hết hạn: ", exp ? new Date(exp * 1000).toLocaleString("vi-VN") : "Vĩnh viễn");
console.log("  Mã kích hoạt:");
console.log("  " + key);
console.log("");
