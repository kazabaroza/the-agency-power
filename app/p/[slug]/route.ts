import { get } from "@/lib/db";

/** Serves a published landing page as a full standalone HTML document. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const page = get<{ html: string; published: number }>("SELECT html, published FROM landing_pages WHERE slug = ?", slug);
  if (!page || !page.published) return new Response("Not found", { status: 404 });
  return new Response(page.html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
