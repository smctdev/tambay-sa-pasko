import { cookies } from "next/headers";
import { COOKIE, makeToken, checkPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const fails = globalThis.__smctFails || (globalThis.__smctFails = new Map());
const WINDOW = 10 * 60 * 1000, MAX = 8;

export async function POST(req) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const now = Date.now();
  const rec = fails.get(ip);
  if (rec && now - rec.first < WINDOW && rec.n >= MAX) {
    return Response.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  }
  let body = {};
  try {
    body = await req.json();
  } catch {}

  console.log("ADMIN DEBUG:", {
    passwordLoaded: !!process.env.ADMIN_PASSWORD,
    passwordLength: process.env.ADMIN_PASSWORD?.length,
    receivedLength: typeof body.password === "string" ? body.password.length : null,
    matches: checkPassword(body.password || "")
  });

  if (!checkPassword(body.password || "")) {
    if (!rec || now - rec.first >= WINDOW) fails.set(ip, { n: 1, first: now });
    else rec.n++;
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }
  fails.delete(ip);
  cookies().set(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return Response.json({ ok: true });
}
