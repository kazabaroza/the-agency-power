import { NextResponse } from "next/server";
import { currentUser, type User } from "./auth";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export function appUrl(req: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const u = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || u.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || u.host;
  return `${proto}://${host}`;
}

/** Wraps a route so it only runs for a signed-in user. */
export function authed(fn: (req: Request, user: User, params: Record<string, string>) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    const user = await currentUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    try {
      return await fn(req, user, (await ctx?.params) ?? {});
    } catch (e) {
      console.error(e);
      return json({ error: e instanceof Error ? e.message : "server error" }, 500);
    }
  };
}
