// Tolerance: scales are not perfect and moisture changes weight.
// Allow max(0.5 kg, 1% of input) before flagging. Make these settings per facility.
export function checkBatch({ inputG, recoveredG, residualG }, tol = { absG: 500, pct: 1 }) {
  if (recoveredG + residualG > inputG) throw new Error('Outputs exceed input');
  const gapG = inputG - recoveredG - residualG;
  const allowedG = Math.max(tol.absG, Math.round((inputG * tol.pct) / 100));
  return { gapG, allowedG, flagged: gapG > allowedG };
}

export function checkReceipt({ shippedG, receivedG }, tol = { absG: 500, pct: 1 }) {
  const diffG = shippedG - receivedG;
  const allowedG = Math.max(tol.absG, Math.round((shippedG * tol.pct) / 100));
  return { diffG, allowedG, flagged: Math.abs(diffG) > allowedG };
}
