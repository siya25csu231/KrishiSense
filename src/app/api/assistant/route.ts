import { assistantReply } from "@/server/services";
import { jsonError, readJson } from "@/server/route-utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req);
  if (!parsed.ok) return jsonError("Invalid JSON body");
  const message = String(parsed.body.message ?? "").trim();
  if (!message) return jsonError("Message is required.");
  if (message.length > 500) return jsonError("Message too long (max 500 chars).");
  return Response.json(assistantReply(message));
}
