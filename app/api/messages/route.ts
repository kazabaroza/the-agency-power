import { authed, json } from "@/lib/http";
import { getOrCreateConversation, listMessages } from "@/lib/conversation";
import { all } from "@/lib/db";

export const GET = authed(async (req, user) => {
  const conv = getOrCreateConversation(user.id, "web");
  const msgs = listMessages(conv.id);
  const assetIds = msgs.map((m) => m.meta?.assetId).filter(Boolean) as string[];
  const approvalIds = msgs.map((m) => m.meta?.approvalId).filter(Boolean) as string[];
  const assets = assetIds.length ? all(`SELECT * FROM assets WHERE id IN (${assetIds.map(() => "?").join(",")})`, ...assetIds) : [];
  const approvals = approvalIds.length ? all(`SELECT id, status FROM approvals WHERE id IN (${approvalIds.map(() => "?").join(",")})`, ...approvalIds) : [];
  return json({ messages: msgs, assets, approvals });
});
