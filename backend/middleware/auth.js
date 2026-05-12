const jwt = require("jsonwebtoken");

// Fail fast at startup — every protected route depends on this being set.
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment. Server cannot start safely.");
}

module.exports = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      return res.status(401).json({ message: "Malformed authorization header" });
    }

    // Uses env secret — never a hardcoded string
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    console.error("Auth error:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
};