export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Not allowed' });
  next();
};
