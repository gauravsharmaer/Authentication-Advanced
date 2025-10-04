import crypto from "crypto";
export const generateDeviceFingerprint = (req) => {
  const userAgent = req.headers["user-agent"] || "unknown";
  const acceptLanguage = req.headers["accept-language"] || "unknown";
  const acceptEncoding = req.headers["accept-encoding"] || "unknown";
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  // Create fingerprint from multiple factors
  const fingerprint = `${userAgent}:${acceptLanguage}:${acceptEncoding}:${ip}`;
  return crypto
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex")
    .substring(0, 16);
};
export const generateSessionId = () => {
  return crypto.randomBytes(32).toString("hex");
};
