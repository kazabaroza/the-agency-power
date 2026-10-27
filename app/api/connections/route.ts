import { authed, json } from "@/lib/http";
import { connectionStatus, PROVIDERS, saveConnection, type ProviderKey } from "@/lib/connections";

export const GET = authed(async (_req, user) => json({ providers: connectionStatus(user.id) }));

export const POST = authed(async (req, user) => {
  const { provider, data } = (await req.json()) as { provider: ProviderKey; data: Record<string, string> };
  if (!(provider in PROVIDERS)) return json({ error: "unknown provider" }, 400);
  saveConnection(user.id, provider, data ?? {});
  return json({ ok: true, providers: connectionStatus(user.id) });
});
