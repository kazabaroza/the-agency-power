import { tick } from "@/lib/scheduler";

/** Optional external trigger (e.g. a cron service) in addition to the built-in 60s timer. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("forbidden", { status: 403 });
  await tick();
  return Response.json({ ok: true });
}
