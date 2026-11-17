import crypto from "crypto";
import { cookies } from "next/headers";

export const COOKIE = "smct_admin";
const TTL_MS = 1000 * 60 * 60 * 8;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-secret";
}
function sign(v) {
  return crypto.createHmac("sha256", secret()).update(v).digest("hex");
}

export function makeToken() {
  const exp = String(Date.now() + TTL_MS);
  return exp + "." + sign(exp);
}

export function verifyToken(t) {
  if (!t) return false;
  const [exp, sig] = t.split(".");
  if (!exp || !sig) return false;
  const expected = sign(exp);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(exp) > Date.now();
}

export function isAdmin() {
  return verifyToken(cookies().get(COOKIE)?.value);
}

export function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real) return false;
  const a = crypto.createHash("sha256").update(String(input)).digest();
  const b = crypto.createHash("sha256").update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export const unauthorized = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });
