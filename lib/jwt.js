const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_EXPIRES = "7d";

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.userId;
  } catch {
    return null;
  }
}

module.exports = { generateToken, verifyToken };
