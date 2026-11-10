/**
 * RETIRED: the SMS bridge is no longer needed.
 *
 * The web app now talks to the USB-connected Android phone itself (ADB, see
 * src/lib/sms-phone.ts). There is no separate server to start: if the phone is
 * plugged in with USB debugging allowed, SMS works from the Messaging page.
 *
 * This file is kept only so old shortcuts / scripts that run it don't fail
 * silently. You can delete the sms-bridge folder.
 */
console.log(
  "[SMS Bridge] Not needed any more: the web app sends SMS through the phone directly.\n" +
    "Connect the phone by USB (USB debugging on) and use the Messaging page."
);
process.exit(0);
