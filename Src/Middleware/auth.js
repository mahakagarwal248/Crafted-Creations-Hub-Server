import { verifyAuthToken } from "../Utils/jwt.js";

function extractToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

/** Attaches `req.user = { id, role, email }` if a valid token is present (no error if missing). */
export function attachUser(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAuthToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
  } catch {
    /* silently ignore invalid token here; requireAuth will reject if needed */
  }
  next();
}

export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }
  try {
    const payload = verifyAuthToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access only." });
  }
  return next();
}

/**
 * Allows the request only if the authenticated user is an admin OR the
 * resource user id matches the caller. The user id is read from
 * `req.params[paramName]` or `req.body[paramName]` (param wins).
 */
export function requireSelfOrAdmin(paramName = "userId") {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    if (req.user.role === "admin") return next();
    const target = req.params?.[paramName] || req.body?.[paramName];
    if (!target || String(target) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "You do not have access to this resource." });
    }
    return next();
  };
}
