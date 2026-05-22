import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_only_replace_me_in_env";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function signAuthToken(user) {
  if (!user?._id) throw new Error("Cannot sign token without user._id");
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role || "user",
      email: user.email || null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
