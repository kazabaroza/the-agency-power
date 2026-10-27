import { readUpload } from "@/lib/storage";

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const f = readUpload((await ctx.params).name);
  if (!f) return new Response("Not found", { status: 404 });
  const headers: Record<string, string> = { "Content-Type": f.mime, "Cache-Control": "public, max-age=31536000, immutable" };
  // SVGs are rendered as images only; block scripts if one is opened directly.
  if (f.mime === "image/svg+xml") headers["Content-Security-Policy"] = "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; font-src *";
  return new Response(new Uint8Array(f.data), { headers });
}
