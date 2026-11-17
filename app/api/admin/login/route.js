import { cookies } from "next/headers";
import { COOKIE, makeToken, checkPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Basic brute-force guard (per server instance)
const fails = globalThis.__smctFails || (globalThis.__smctFails = new Map());
const WINDOW = 10 * 60 * 1000, MAX = 8;

// A "Secure" cookie is thrown away by the browser on a plain http:// page, which makes the next
// request fail with "Unauthorized". So Secure must match what the BROWSER is really using.
// The Origin header is sent by the browser itself, so it is more reliable than proxy headers.
// Force it either way with COOKIE_SECURE=true|false.
function useSecureCookie(req) {
  const force = (process.env.COOKIE_SECURE || "").toLowerCase();
  if (force === "true") return true;
  if (force === "false") return false;
  const origin = req.headers.get("origin");
  if (origin) return origin.startsWith("https://");
  const fwd = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim();
  if (fwd) return fwd === "https";
  return new URL(req.url).protocol === "https:";
}

export async function POST(req) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const now = Date.now();
  const rec = fails.get(ip);
  if (rec && now - rec.first < WINDOW && rec.n >= MAX) {
    return Response.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  }
  let body = {};
  try { body = await req.json(); } catch {}
  if (!checkPassword(body.password || "")) {
    if (!rec || now - rec.first >= WINDOW) fails.set(ip, { n: 1, first: now });
    else rec.n++;
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }
  fails.delete(ip);
  cookies().set(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: useSecureCookie(req),
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return Response.json({ ok: true });
}