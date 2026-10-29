// Notification and Stop: show a desktop notification when Claude waits for
// input or finishes a turn. It never blocks Claude: the notifier runs
// detached and this hook always exits 0. Set CLAUDE_NOTIFY=0 to turn it off.
import { spawn } from "node:child_process";
import path from "node:path";
import { projectDir, readStdinJson } from "./lib.mjs";

const input = await readStdinJson();
if (process.env.CLAUDE_NOTIFY === "0") process.exit(0);
// A Stop re-run caused by stop-checks.mjs: the first Stop already notified.
if (input?.stop_hook_active) process.exit(0);

const title = input?.title ?? `Claude Code: ${path.basename(projectDir)}`;
const body =
  input?.hook_event_name === "Stop" ? "Finished. Your turn." : (input?.message ?? "Needs your attention.");

// The text goes in through env vars, never into the script itself, so quotes
// in a message can't break the command.
const WINDOWS_TOAST = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$text = $xml.GetElementsByTagName('text')
$text.Item(0).AppendChild($xml.CreateTextNode($env:NOTIFY_TITLE)) > $null
$text.Item(1).AppendChild($xml.CreateTextNode($env:NOTIFY_BODY)) > $null
$appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show([Windows.UI.Notifications.ToastNotification]::new($xml))
`;

const NOTIFIERS = {
  win32: ["powershell", ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_TOAST]],
  darwin: [
    "osascript",
    ["-e", "display notification (system attribute \"NOTIFY_BODY\") with title (system attribute \"NOTIFY_TITLE\")"],
  ],
  // "--": a message starting with "-" is text, not an option.
  linux: ["notify-send", ["--", title, body]],
};

// No notifier for this platform, or it isn't installed: stay silent. Claude
// Code captures hook output, so a terminal bell wouldn't be heard either.
const notifier = NOTIFIERS[process.platform];
if (notifier) {
  try {
    const child = spawn(notifier[0], notifier[1], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: { ...process.env, NOTIFY_TITLE: title, NOTIFY_BODY: body },
    });
    child.on("error", () => {});
    child.unref();
  } catch {
    // Never let a missing notifier fail the hook.
  }
}
