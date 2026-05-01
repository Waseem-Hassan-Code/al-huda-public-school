/**
 * ADB SMS Bridge — Local Node.js service (port 3001)
 *
 * Runs on the school server alongside Next.js.  A USB-connected Android phone
 * with USB Debugging enabled acts as the SMS sender.
 *
 * Prerequisites:
 *   1. ADB installed and on PATH  (https://developer.android.com/tools/adb)
 *   2. Android phone connected via USB with USB Debugging ON
 *   3. Phone trusted this computer (tap "Allow" on the phone prompt)
 *
 * Start:  node server.js   (or: npm start)
 *
 * Sending methods (chosen automatically):
 *   • INTENT  — opens the phone's native SMS composer pre-filled with number +
 *               message.  Works on ALL Android versions; admin taps Send on phone.
 *   • SILENT  — uses Android's internal isms service to send without UI.
 *               Works reliably on Android ≤ 5.1 only.  Detected via SDK version.
 */

"use strict";

const { exec } = require("child_process");
const express = require("express");
const cors = require("cors");

const PORT = process.env.SMS_BRIDGE_PORT || 3001;
const app = express();

app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"] }));
app.use(express.json());

// ── Helpers ──────────────────────────────────────────────────────────────────

function run(cmd, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout.trim());
    });
  });
}

/** Returns the first device in "device" state, or null if none. */
async function getConnectedDevice() {
  try {
    const out = await run("adb devices");
    const lines = out.split("\n").slice(1); // skip "List of devices attached"
    for (const line of lines) {
      const [serial, state] = line.trim().split(/\s+/);
      if (serial && state === "device") return serial;
    }
    return null;
  } catch {
    return null;
  }
}

/** Returns the Android SDK version integer (e.g. 29 for Android 10). */
async function getSdkVersion(serial) {
  try {
    const v = await run(`adb -s ${serial} shell getprop ro.build.version.sdk`);
    return parseInt(v, 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Shell-safe escaping: wrap in single quotes, escape any internal single quotes.
 * Used for the message body passed to ADB shell commands.
 */
function shellEscape(str) {
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

/**
 * SILENT method — uses Android's internal SMS service via Binder IPC.
 * Only reliable on Android < 6.0 (SDK < 23).
 */
async function sendSilent(serial, phoneNumber, message) {
  const sdk = await getSdkVersion(serial);
  // Method number differs by Android version
  const methodNo = sdk <= 22 ? 7 : 5;
  const cmd = [
    `adb -s ${serial} shell service call isms ${methodNo}`,
    `i32 1`,
    `s16 "com.android.mms"`,
    `s16 "null"`,
    `s16 "${phoneNumber}"`,
    `s16 "null"`,
    `s16 ${shellEscape(message)}`,
    `s16 "null"`,
  ].join(" ");

  const result = await run(cmd, 15_000);
  // isms returns "Result: Parcel(...)" on success
  if (!result.includes("Result: Parcel")) {
    throw new Error(`Unexpected isms response: ${result}`);
  }
  return { method: "silent", sdk };
}

/**
 * INTENT method — opens the native SMS composer on the phone.
 * Works on ALL Android versions.  Admin must tap "Send" on the phone.
 */
async function sendIntent(serial, phoneNumber, message) {
  const escapedMsg = message.replace(/'/g, "\\'").replace(/"/g, '\\"');
  const cmd = [
    `adb -s ${serial} shell am start`,
    `-a android.intent.action.SENDTO`,
    `-d "smsto:${phoneNumber}"`,
    `--es sms_body "${escapedMsg}"`,
    `--ez exit_on_sent true`,
  ].join(" ");

  await run(cmd, 15_000);
  return { method: "intent" };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /status — returns connected device info */
app.get("/status", async (_req, res) => {
  const serial = await getConnectedDevice();
  if (!serial) {
    return res.json({ connected: false, device: null });
  }
  const sdk = await getSdkVersion(serial);
  const androidVersion = sdk >= 34 ? "14" : sdk >= 33 ? "13" : sdk >= 31 ? "12" : sdk >= 30 ? "11" : sdk >= 29 ? "10" : sdk >= 28 ? "9" : sdk >= 27 ? "8.1" : sdk >= 26 ? "8.0" : sdk >= 24 ? "7.x" : sdk >= 23 ? "6.0" : sdk >= 22 ? "5.1" : sdk >= 21 ? "5.0" : `SDK ${sdk}`;
  res.json({
    connected: true,
    device: serial,
    sdk,
    androidVersion,
    supportsSilent: sdk > 0 && sdk <= 22,
  });
});

/** POST /send-sms — sends an SMS via the connected Android phone */
app.post("/send-sms", async (req, res) => {
  const { phoneNumber, message, method: preferredMethod } = req.body;

  // ── Validation ────────────────────────────────────────────────────────────
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return res.status(400).json({ success: false, error: "phoneNumber is required" });
  }
  if (!message || typeof message !== "string") {
    return res.status(400).json({ success: false, error: "message is required" });
  }
  if (message.length > 1600) {
    return res.status(400).json({ success: false, error: "Message too long (max 1600 chars)" });
  }

  // Normalise phone number (keep + prefix and digits only)
  const phone = phoneNumber.replace(/[^\d+]/g, "");
  if (phone.length < 7) {
    return res.status(400).json({ success: false, error: "Invalid phone number" });
  }

  // ── Device check ──────────────────────────────────────────────────────────
  const serial = await getConnectedDevice();
  if (!serial) {
    return res.status(503).json({
      success: false,
      error: "No Android device connected. Connect phone via USB and enable USB Debugging.",
    });
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  try {
    const sdk = await getSdkVersion(serial);
    let result;

    if (preferredMethod === "silent" || (sdk > 0 && sdk <= 22 && preferredMethod !== "intent")) {
      try {
        result = await sendSilent(serial, phone, message);
      } catch (silentErr) {
        // Fall back to intent if silent fails
        console.warn("[SMS Bridge] Silent method failed, falling back to intent:", silentErr.message);
        result = await sendIntent(serial, phone, message);
        result.fallback = true;
      }
    } else {
      result = await sendIntent(serial, phone, message);
    }

    console.log(`[SMS Bridge] Sent to ${phone} via ${result.method}`);
    return res.json({
      success: true,
      to: phone,
      ...result,
      note:
        result.method === "intent"
          ? "SMS composer opened on phone — tap Send to deliver"
          : "SMS sent silently via phone",
    });
  } catch (err) {
    console.error("[SMS Bridge] Send failed:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /health — simple liveness probe for the Next.js proxy */
app.get("/health", (_req, res) => res.json({ ok: true, port: PORT }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
  console.log(`[SMS Bridge] Listening on http://127.0.0.1:${PORT}`);
  console.log(`[SMS Bridge] Run "adb devices" to verify phone connection`);
});
