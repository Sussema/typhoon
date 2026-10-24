// server/src/auth/requireRole.js - RBAC & Facility Boundary Isolation (Stage 12)

export function requireRole(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    // Role check: Admin has global access; otherwise user role must match allowed
    if (allowed.length > 0 && !allowed.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' is not authorized for this operation`
      });
    }

    next();
  };
}

export function requireFacility(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  // Admin can access any facility
  if (req.user.role === 'admin') {
    return next();
  }

  // Ensure user cannot query or write data for another facility (Broken Access Control prevention)
  const targetFacilityId = req.params.facilityId || req.query.facilityId || req.body?.facilityId;
  if (targetFacilityId && req.user.facilityId && targetFacilityId !== req.user.facilityId) {
    return res.status(403).json({
      error: 'Forbidden: Access to another facility ledger is prohibited'
    });
  }

  next();
}
