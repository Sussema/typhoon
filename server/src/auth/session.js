export async function loadSession(req, res, next) {
  // Temporary fake session for local development/testing until Stage 10
  req.user = req.user || {
    id: '00000000-0000-0000-0000-000000000001',
    role: 'aggregator',
    facilityId: '00000000-0000-0000-0000-000000000002'
  };
  next();
}
