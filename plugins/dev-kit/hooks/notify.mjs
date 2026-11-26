// Notification: show a desktop notification when Claude waits for input. The
// "finished" notification comes from stop-checks.mjs, once the checks pass.
// This hook always exits 0. Set CLAUDE_NOTIFY=0 to turn it off.
import { readStdinJson, recordUsage, sendNotification } from "./lib.mjs";

const input = await readStdinJson();
if (process.env.CLAUDE_NOTIFY !== "0") recordUsage("notify", "notify");
sendNotification(input?.message ?? "Needs your attention.", input?.title);
