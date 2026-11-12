// Week 9: API key authentication and per-key rate limiting.

// Keys come from the environment (API_KEYS=key1,key2), never from source code.
export function loadApiKeys(raw = process.env.API_KEYS) {
  return (raw || "").split(",").map((k) => k.trim()).filter(Boolean);
}

export function requireApiKey(validKeys) {
  return (req, res, next) => {
    const key = req.get("X-API-Key");
    if (!key || !validKeys.includes(key)) {
      return res.status(401).json({ message: "Missing or invalid API key" });
    }
    req.apiKey = key;
    next();
  };
}

// Counts requests per key (or per IP when there is no key) in a fixed time window, in memory.
export function rateLimit({ windowMs, max }) {
  const hits = new Map(); // id -> { count, resetAt }
  return (req, res, next) => {
    const id = req.apiKey || req.ip;
    const now = Date.now();
    let entry = hits.get(id);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ message: "Too many requests", retryAfter });
    }
    next();
  };
}
