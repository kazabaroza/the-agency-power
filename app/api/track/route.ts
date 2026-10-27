import { run } from "@/lib/db";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { page?: string; type?: string };
  if (b.page && b.type === "view") run("UPDATE landing_pages SET views = views + 1 WHERE id = ?", b.page);
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
}
