import { Html5Qrcode } from 'html5-qrcode';

// elementId: id of an empty div where the camera preview appears
export async function scanOnce(elementId, expectedPrefix) {
  const scanner = new Html5Qrcode(elementId);
  return new Promise((resolve, reject) => {
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 240 },
      async (text) => {
        const raw = text.trim();
        if (expectedPrefix && raw.startsWith(expectedPrefix)) {
          await scanner.stop();
          resolve(raw.slice(expectedPrefix.length));
          return;
        }
        // Accept raw code directly (e.g. WRK-0014, HOME-0193, MCH-0001)
        if (raw.startsWith('WRK-') || raw.startsWith('HOME-') || raw.startsWith('MCH-') || !expectedPrefix) {
          await scanner.stop();
          resolve(raw.replace(/^CL:[A-Z]:/, ''));
          return;
        }
      },
      () => {} // "not found yet" — ignore
    ).catch(reject); // camera denied / missing
  });
}
