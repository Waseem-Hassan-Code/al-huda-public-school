// Send SMS through an Android phone connected by USB, using ADB.
// Runs inside the web app (no separate SMS bridge server needed).
//
// Requirements on the computer running the app:
//   - Android Platform Tools (adb) installed. Either on PATH, or set ADB_PATH
//     (e.g. C:\platform-tools\adb.exe) in .env / web.config.
//   - Phone connected by USB with USB debugging on, and this computer allowed
//     ("Always allow from this computer"). Under IIS the app runs as the IIS
//     account, so the phone asks to allow it once more the first time.
//
// Sending methods (picked automatically):
//   - silent: sends in the background. Only works on Android 5.1 and older.
//   - intent: opens the phone's SMS app with the number and text filled in;
//             someone taps Send on the phone. Works on all Android versions.
//
// Security: adb is started with an argument list (execFile, no local shell), and
// text that reaches the phone's shell is single-quoted, so message content can
// never run as a command.

import { execFile } from "node:child_process";

const ADB = process.env.ADB_PATH || "adb";

export type SmsMethod = "silent" | "intent";

export interface PhoneStatus {
  adbFound: boolean;
  connected: boolean;
  /** Phone is plugged in but this computer isn't allowed yet (tap Allow on the phone) */
  unauthorized: boolean;
  device: string | null;
  model?: string;
  sdk?: number;
  androidVersion?: string;
  supportsSilent?: boolean;
  /** Plain-language explanation when not ready */
  problem?: string;
}

export interface SmsResult {
  success: true;
  to: string;
  method: SmsMethod;
  fallback?: boolean;
  note: string;
}

class SmsError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

function adb(args: string[], timeoutMs = 10_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(ADB, args, { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        const e = err as NodeJS.ErrnoException;
        if (e.code === "ENOENT") {
          reject(new SmsError("ADB was not found. Install Android Platform Tools or set ADB_PATH.", 503));
        } else {
          reject(new SmsError((stderr || err.message).trim()));
        }
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/** Quote text for the phone's shell (adb shell joins arguments into one command line). */
function phoneShellQuote(s: string): string {
  return "'" + s.replace(/'/g, `'\\''`) + "'";
}

function androidVersionFromSdk(sdk: number): string {
  const map: [number, string][] = [
    [35, "15"], [34, "14"], [33, "13"], [31, "12"], [30, "11"], [29, "10"], [28, "9"],
    [27, "8.1"], [26, "8.0"], [24, "7"], [23, "6.0"], [22, "5.1"], [21, "5.0"],
  ];
  for (const [min, name] of map) if (sdk >= min) return name;
  return sdk > 0 ? `SDK ${sdk}` : "unknown";
}

/** Keeps "+" and digits. "0300-1234567" → "03001234567". */
export function normalizePhone(phone: string): string {
  return (phone || "").replace(/[^\d+]/g, "");
}

// One adb conversation at a time (the phone handles one SMS app screen at a time)
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

/** Current phone connection status. Never throws. */
export async function getPhoneStatus(): Promise<PhoneStatus> {
  let out: string;
  try {
    out = await adb(["devices"], 8_000);
  } catch (e) {
    const notFound = (e as SmsError).status === 503;
    return {
      adbFound: !notFound,
      connected: false,
      unauthorized: false,
      device: null,
      problem: notFound
        ? "ADB is not installed on this computer (or ADB_PATH is wrong)."
        : `ADB error: ${(e as Error).message}`,
    };
  }

  const devices = out
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter(([s]) => s);
  const ready = devices.find(([, state]) => state === "device");
  const unauthorized = devices.some(([, state]) => state === "unauthorized");

  if (!ready) {
    return {
      adbFound: true,
      connected: false,
      unauthorized,
      device: null,
      problem: unauthorized
        ? 'Phone is connected but not allowed yet. Unlock it and tap "Allow" (tick "Always allow from this computer").'
        : "No phone found. Connect the phone by USB and turn on USB debugging.",
    };
  }

  const device = ready[0];
  let sdk = 0;
  let model: string | undefined;
  try {
    sdk = parseInt(await adb(["-s", device, "shell", "getprop", "ro.build.version.sdk"]), 10) || 0;
    model = (await adb(["-s", device, "shell", "getprop", "ro.product.model"])) || undefined;
  } catch {
    // still usable for the intent method
  }
  return {
    adbFound: true,
    connected: true,
    unauthorized: false,
    device,
    model,
    sdk,
    androidVersion: androidVersionFromSdk(sdk),
    supportsSilent: sdk > 0 && sdk <= 22,
  };
}

async function sendSilent(device: string, sdk: number, phone: string, message: string) {
  // Binder method number of the isms service differs by Android version
  const methodNo = sdk <= 22 ? "7" : "5";
  const result = await adb(
    [
      "-s", device, "shell", "service", "call", "isms", methodNo,
      "i32", "1",
      "s16", "com.android.mms",
      "s16", "null",
      "s16", phoneShellQuote(phone),
      "s16", "null",
      "s16", phoneShellQuote(message),
      "s16", "null",
    ],
    15_000
  );
  if (!result.includes("Result: Parcel")) {
    throw new SmsError(`Unexpected response from phone: ${result}`);
  }
}

async function sendIntent(device: string, phone: string, message: string) {
  await adb(
    [
      "-s", device, "shell", "am", "start",
      "-a", "android.intent.action.SENDTO",
      "-d", phoneShellQuote(`smsto:${phone}`),
      "--es", "sms_body", phoneShellQuote(message),
      "--ez", "exit_on_sent", "true",
    ],
    15_000
  );
}

/**
 * Sends one SMS through the connected phone.
 * Throws an Error with a plain-language message (and `.status`) on failure.
 */
export function sendSms(phoneNumber: string, message: string, preferred?: SmsMethod): Promise<SmsResult> {
  return serial(async () => {
    const phone = normalizePhone(phoneNumber);
    if (phone.replace(/\D/g, "").length < 7) throw new SmsError("Invalid phone number", 400);
    if (!message || !message.trim()) throw new SmsError("Message is empty", 400);
    if (message.length > 1600) throw new SmsError("Message too long (max 1600 characters)", 400);

    const status = await getPhoneStatus();
    if (!status.connected || !status.device) {
      throw new SmsError(status.problem || "Phone not connected", 503);
    }

    const useSilent = preferred === "silent" || (status.supportsSilent && preferred !== "intent");
    if (useSilent) {
      try {
        await sendSilent(status.device, status.sdk ?? 0, phone, message);
        return { success: true, to: phone, method: "silent", note: "SMS sent from the phone" };
      } catch (e) {
        console.warn("[SMS] Silent send failed, opening SMS app instead:", (e as Error).message);
        await sendIntent(status.device, phone, message);
        return {
          success: true,
          to: phone,
          method: "intent",
          fallback: true,
          note: "SMS app opened on the phone. Tap Send to deliver.",
        };
      }
    }

    await sendIntent(status.device, phone, message);
    return { success: true, to: phone, method: "intent", note: "SMS app opened on the phone. Tap Send to deliver." };
  });
}

export function smsErrorStatus(e: unknown): number {
  return e instanceof SmsError ? e.status : 500;
}
