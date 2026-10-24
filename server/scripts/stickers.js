import QRCode from 'qrcode';
import fs from 'node:fs/promises';

await fs.mkdir('stickers', { recursive: true });

// Generate household stickers (HOME-0001 to HOME-0200)
for (let n = 1; n <= 200; n++) {
  const code = `HOME-${String(n).padStart(4, '0')}`;
  await QRCode.toFile(`stickers/${code}.png`, `CL:H:${code}`, {
    width: 600,
    margin: 2,
    errorCorrectionLevel: 'M'
  });
}

// Generate facility machine stickers (MCH-0001 to MCH-0010)
for (let m = 1; m <= 10; m++) {
  const code = `MCH-${String(m).padStart(4, '0')}`;
  await QRCode.toFile(`stickers/${code}.png`, `CL:M:${code}`, {
    width: 600,
    margin: 2,
    errorCorrectionLevel: 'M'
  });
}

console.log('Successfully generated 200 household stickers and 10 machine stickers in server/stickers/');
