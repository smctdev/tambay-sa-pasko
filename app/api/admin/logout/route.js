import { cookies } from "next/headers";
import { COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return Response.json({ ok: true });
}
