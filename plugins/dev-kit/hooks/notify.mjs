// Notification: show a desktop notification when Claude waits for input. The
// "finished" notification comes from stop-checks.mjs, once the checks pass.
// This hook always exits 0. Set CLAUDE_NOTIFY=0 to turn it off.
import { readStdinJson, sendNotification } from "./lib.mjs";

const input = await readStdinJson();
sendNotification(input?.message ?? "Needs your attention.", input?.title);
