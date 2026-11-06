import { run } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/security";

export async function POST(req: Request) {
  if (!rateLimit(`track-ip:${clientIp(req)}`, 60, 60_000)) return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
  const b = (await req.json().catch(() => ({}))) as { page?: string; type?: string };
  // Count one view per visitor per page per hour.
  if (b.page && !rateLimit(`view:${clientIp(req)}:${b.page}`, 1, 60 * 60_000)) return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
  if (b.page && b.type === "view") run("UPDATE landing_pages SET views = views + 1 WHERE id = ?", b.page);
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
}
