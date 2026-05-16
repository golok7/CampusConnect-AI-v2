const MAX_REQUESTS = 10;
const WINDOW_MS    = 60_000; // 1 minute

// ip → { count, windowStart }
const _windows = new Map();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip;
}

module.exports = function rateLimiter(req, res, next) {
  const ip  = getClientIp(req);
  const now = Date.now();

  let entry = _windows.get(ip);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    _windows.set(ip, entry);
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
    return res.status(429).json({
      message:    "Too many requests",
      retryAfter,
    });
  }

  next();
};
