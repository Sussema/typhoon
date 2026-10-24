// Reads stable weight reading from RS-232 / USB scale via Web Serial API
export async function readSerialWeight() {
  if (!navigator.serial) {
    throw new Error('Web Serial API is not supported on this browser');
  }
  const port = await navigator.serial.requestPort(); // user picks the scale
  await port.open({ baudRate: 9600 }); // from the scale manual
  const reader = port.readable.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) {
        const m = line.match(/^ST,GS,\+?(\d+\.\d+)kg/); // "ST" = stable reading
        if (m) return Math.round(parseFloat(m[1]) * 1000); // kg -> grams
      }
    }
  } finally {
    reader.releaseLock();
    await port.close();
  }
}
