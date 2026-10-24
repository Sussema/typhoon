import { Html5Qrcode } from 'html5-qrcode';

// elementId: id of an empty div where the camera preview appears
export async function scanOnce(elementId, expectedPrefix) {
  const scanner = new Html5Qrcode(elementId);
  return new Promise((resolve, reject) => {
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 240 },
      async (text) => {
        if (!text.startsWith(expectedPrefix)) return; // ignore other QR codes
        await scanner.stop();
        resolve(text.slice(expectedPrefix.length)); // e.g. "CL:H:HOME-0193" -> "HOME-0193"
      },
      () => {} // "not found yet" — ignore
    ).catch(reject); // camera denied / missing
  });
}
