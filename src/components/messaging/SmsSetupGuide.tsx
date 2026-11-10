"use client";

// SMS setup checklist for the Messaging page. Each step shows whether it is done,
// based on what the app actually detects (ADB, phone, permission, setting), with
// instructions for the steps that aren't.

import { useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Collapse, Link, Paper, Typography } from "@mui/material";
import {
  CheckCircle as DoneIcon,
  RadioButtonUnchecked as TodoIcon,
  Error as ProblemIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

export interface SmsPhoneStatus {
  adbFound?: boolean;
  connected: boolean;
  unauthorized?: boolean;
  model?: string;
  sdk?: number;
  androidVersion?: string;
  supportsSilent?: boolean;
  problem?: string;
}

type StepState = "done" | "todo" | "problem";

function Step({ n, title, state, children }: { n: number; title: string; state: StepState; children: React.ReactNode }) {
  const icon =
    state === "done" ? <DoneIcon color="success" /> : state === "problem" ? <ProblemIcon color="error" /> : <TodoIcon color="disabled" />;
  return (
    <Box sx={{ display: "flex", gap: 1.5, py: 1.25, borderTop: n > 1 ? 1 : 0, borderColor: "divider" }}>
      <Box sx={{ pt: "1px" }}>{icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" sx={{ color: state === "done" ? "text.secondary" : "text.primary" }}>
          {n}. {title}
        </Typography>
        {state !== "done" && (
          <Typography component="div" variant="body2" color="text.secondary" sx={{ mt: 0.5, "& li": { mb: 0.25 } }}>
            {children}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function SmsSetupGuide({
  status,
  checking,
  onCheck,
  smsEnabled,
  enabling,
  onEnable,
}: {
  status: SmsPhoneStatus | null;
  checking: boolean;
  onCheck: () => void;
  smsEnabled: boolean;
  enabling: boolean;
  onEnable: () => void;
}) {
  const [showSteps, setShowSteps] = useState(false);

  const adbOk = !!status?.adbFound;
  const phoneSeen = !!status?.connected || !!status?.unauthorized;
  const steps: StepState[] = [
    adbOk ? "done" : status ? "problem" : "todo",
    phoneSeen ? "done" : "todo",
    phoneSeen ? "done" : "todo",
    status?.connected ? "done" : status?.unauthorized ? "problem" : "todo",
    smsEnabled ? "done" : "todo",
  ];
  const ready = steps.every((s) => s === "done");
  const open = !ready || showSteps;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          {ready ? "SMS is ready" : "Set up SMS (Android phone over USB)"}
        </Typography>
        {status?.connected && (
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={`${status.model ?? "Android phone"} · Android ${status.androidVersion ?? "?"}`}
          />
        )}
        <Button size="small" startIcon={checking ? <CircularProgress size={14} /> : <RefreshIcon />} onClick={onCheck} disabled={checking}>
          Check again
        </Button>
        {ready && (
          <Button size="small" onClick={() => setShowSteps((v) => !v)}>
            {showSteps ? "Hide setup steps" : "Show setup steps"}
          </Button>
        )}
      </Box>

      {/* How sending works on the detected phone */}
      {status?.connected && (
        <Alert severity={status.supportsSilent ? "success" : "info"} sx={{ mt: 1.5 }}>
          {status.supportsSilent
            ? "This phone sends SMS automatically. You can send to many parents at once."
            : `On Android ${status.androidVersion} the phone's SMS app opens with the number and message filled in, and you tap Send on the phone. Android 6 and newer don't allow sending in the background over USB, so send to one parent at a time (use WhatsApp for bulk messages).`}
        </Alert>
      )}

      <Collapse in={open}>
        <Box sx={{ mt: 1.5 }}>
          <Step n={1} title="Install ADB (Android Platform Tools) on this computer" state={steps[0]}>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                Download <strong>SDK Platform-Tools for Windows</strong> from{" "}
                <Link href="https://developer.android.com/tools/releases/platform-tools" target="_blank" rel="noopener">
                  developer.android.com/tools/releases/platform-tools
                </Link>
                .
              </li>
              <li>
                Unzip it to <code>C:\platform-tools</code> (so <code>C:\platform-tools\adb.exe</code> exists).
              </li>
              <li>
                Tell the app where it is, either way:
                <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
                  <li>
                    Add <code>C:\platform-tools</code> to Windows <strong>Path</strong>: Start → &quot;Edit the system environment
                    variables&quot; → Environment Variables → System variables → Path → Edit → New.
                  </li>
                  <li>
                    or add <code>ADB_PATH=C:\platform-tools\adb.exe</code> to the <code>.env</code> file (for IIS: in{" "}
                    <code>web.config</code> under <code>&lt;environmentVariables&gt;</code>).
                  </li>
                </ul>
              </li>
              <li>Restart the app (stop and start <code>npm run dev</code>, or restart the site in IIS), then press Check again.</li>
            </ol>
          </Step>

          <Step n={2} title="Turn on Developer options on the phone" state={steps[1]}>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                Open <strong>Settings → About phone</strong>. Samsung: <strong>About phone → Software information</strong>. Xiaomi /
                Redmi: <strong>About phone</strong> (tap <strong>OS version</strong> / <strong>MIUI version</strong> instead).
              </li>
              <li>
                Tap <strong>Build number</strong> 7 times until it says &quot;You are now a developer&quot; (enter your phone PIN if
                asked).
              </li>
              <li>
                While you&apos;re there: <strong>Android version</strong> is shown on the About phone screen (this page also shows it
                once the phone is connected).
              </li>
            </ol>
          </Step>

          <Step n={3} title="Turn on USB debugging" state={steps[2]}>
            Open <strong>Settings → System → Developer options</strong> (Samsung: <strong>Settings → Developer options</strong>, at the
            bottom) and switch on <strong>USB debugging</strong>.
          </Step>

          <Step n={4} title="Connect the phone and allow this computer" state={steps[3]}>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>Connect with a USB cable that carries data (some charging-only cables don&apos;t work).</li>
              <li>Unlock the phone. If it asks what the USB connection is for, choose <strong>File transfer</strong>.</li>
              <li>
                On the &quot;Allow USB debugging?&quot; message, tick <strong>Always allow from this computer</strong> and tap{" "}
                <strong>Allow</strong>.
              </li>
              <li>
                No message? Unplug and plug back in, or in Developer options tap <strong>Revoke USB debugging authorizations</strong>{" "}
                and reconnect.
              </li>
              <li>
                Running under IIS: the app uses the IIS account, so the phone asks to allow the computer once more the first time.
              </li>
            </ol>
            {status?.unauthorized && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                The phone is connected but hasn&apos;t allowed this computer yet. Unlock it and tap Allow.
              </Alert>
            )}
          </Step>

          <Step n={5} title="Turn on SMS in this app" state={steps[4]}>
            <Button variant="contained" size="small" onClick={onEnable} disabled={enabling} sx={{ mt: 0.5 }}>
              {enabling ? "Turning on…" : "Turn on SMS"}
            </Button>
          </Step>
        </Box>
      </Collapse>

      {!status?.connected && status?.problem && open && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Detected: {status.problem}
        </Typography>
      )}
    </Paper>
  );
}
