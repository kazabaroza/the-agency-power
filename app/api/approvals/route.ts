import { authed, appUrl, json } from "@/lib/http";
import { resolveApproval } from "@/lib/agents/director";

export const maxDuration = 300;

export const POST = authed(async (req, user) => {
  const { id, approve } = (await req.json()) as { id: string; approve: boolean };
  const r = await resolveApproval(user.id, id, !!approve, appUrl(req));
  return json(r, r.ok ? 200 : 400);
});
