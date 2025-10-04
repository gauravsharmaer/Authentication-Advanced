// An access token is a short-lived credential presented to APIs to authorize requests, while a refresh token is a long-lived credential used only with the authorization server to obtain new access tokens when they expire. In short: access token = call the API now; refresh token = get a new access token later.

// Quick comparison
// Aspect	Access token	Refresh token
// Purpose	Authorize API calls	Obtain new access tokens
// Audience	Resource server (APIs)	Authorization server only
// Lifetime	Short-lived (minutes)	Long-lived (days–weeks)
// Transport	Sent on every API request (Authorization: Bearer)	Sent only to the token/refresh endpoint
// Storage	Prefer in-memory in public clients	HttpOnly secure cookie (web) or secure OS store (mobile)
// Revocation	Indirect (short expiry + introspection)	Direct (server-side invalidation)
// Risk if stolen	Immediate API misuse until expiry	Silent replay to mint tokens; must mitigate with rotation/reuse detection
// Typical format	Often JWT (self-contained)	Often opaque, sometimes JWT, but treated as a secret

// How they work together
// Client receives both tokens after authentication.

// Client uses the access token to call APIs until it expires.

// Upon 401/expired access token, client sends the refresh token to the auth server’s refresh endpoint.

// If valid, the server issues a new access token (and typically a new refresh token).

// Old refresh token is invalidated if using rotation.

// Lifetimes that work well
// Access token: 5–15 minutes to limit blast radius if stolen.

// Refresh token: 7–30 days (sliding), with immediate invalidation on logout and device revocation.

// Perfect 👍 here’s a **cheat-sheet style note** for you to keep handy:

// ---

// # 🍪 Access vs Refresh Tokens with SameSite & CORS

// ### 🔹 1. What each one does

// * **Access Token** → short-lived (minutes). Used on every API request.
// * **Refresh Token** → long-lived (days). Only used to get a new access token.

// ---

// ### 🔹 2. Cookies & SameSite

// * `SameSite: strict` → cookie sent only for **same-site** requests. Blocks cross-site.
// * `SameSite: lax` → mostly like strict, but allows top-level navigations.
// * `SameSite: none` → cookie sent on **all requests**, even cross-site (must also set `Secure`).

// ---

// ### 🔹 3. Same-site setup (frontend & backend share base domain, e.g. `app.example.com` + `api.example.com`)

// ✅ Works fine with:

// * Access token → Cookie (`HttpOnly`, `SameSite: strict`)
// * Refresh token → Cookie (`HttpOnly`, `SameSite: none`)

// Browser will attach both, no problem.

// ---

// ### 🔹 4. Cross-site setup (frontend & backend on different domains, e.g. `frontend.com` + `api.com`)

// ⚠️ Problem:

// * Access cookie with `SameSite: strict` → ❌ won’t be sent on API calls.
// * Refresh cookie with `SameSite: none` → ✅ will be sent, so refresh endpoint works.

// But access token never goes → API calls keep failing.

// ✅ Fix (best practice):

// * Refresh token → Cookie (`HttpOnly`, `Secure`, `SameSite: none`)
// * Access token → **not in cookie**. Return it in `/refresh` response → store in frontend memory → send with `Authorization: Bearer <token>` header.

// ---

// ### 🔹 5. CORS vs SameSite

// * **CORS** = controls whether the frontend is allowed to make requests at all.
// * **SameSite** = controls whether cookies are automatically attached.
// * They are independent. CORS cannot override SameSite.

// ---

// 👉 TL;DR:

// * Same-site apps → access in cookie (`strict`), refresh in cookie (`none`).
// * Cross-site apps → refresh in cookie (`none`), access in header.
// * CORS = permissions, SameSite = cookie behavior.

// ---

// 🔎 SameSite Cookie Modes
// 1. SameSite: "strict"

// Browser sends the cookie only when the request comes from the same domain.

// Since your frontend and backend are on different domains, cookies (accessToken, refreshToken) will not be sent with API requests.

// ✅ Safer against CSRF.

// ❌ Breaks your login/session completely in a cross-domain setup.

// 👉 In your case, Strict will NOT work.

// 2. SameSite: "lax"

// Cookies are sent for same-site requests and for top-level navigations (GET links).

// Example: if a user clicks a link from frontend → backend, cookies will go.

// BUT for XHR/fetch/Ajax calls (which your frontend uses to talk to backend), cookies won’t be sent cross-domain.

// ❌ Still breaks your login/session.

// 👉 In your case, Lax will also NOT work.

// 3. SameSite: "none"

// Browser sends cookies for all cross-site requests.

// Required when frontend and backend are on different domains.

// BUT: modern browsers require you to also set secure: true (HTTPS only), otherwise cookies will be rejected.

// ✅ Works for your cross-domain setup.

// ❌ More exposed to CSRF, so you must handle CSRF in another way (origin/referrer check, CSRF tokens, or keep accessToken outside cookies).

// 👉 In your case, None is the only option if frontend and backend are on different domains.

// If you keep your current approach (access + refresh tokens in cookies with SameSite: "none"):

// ✔ Works across different domains.

// ❌ Cookies are automatically sent with every request → vulnerable to CSRF.

// 🔒 To stay safe, you’d need manual CSRF protection (e.g., CSRF tokens, checking Origin/Referer headers).

// If you don’t want to handle CSRF manually:

// Best practice = only refresh token in HttpOnly cookie, and send access token in response body.

// Frontend stores access token in memory (not localStorage).

// Every API request includes:

// Authorization: Bearer <accessToken>

// ✔ CSRF is no longer a problem, because an attacker’s browser can’t magically add your Authorization header.

// 🔄 If access token expires, frontend calls refresh endpoint (refresh token in cookie) → backend issues a new access token.

// 🔑 TL;DR

// Cookies with SameSite: none → convenient but must add CSRF protection.

// Bearer access token in headers + refresh cookie → more secure, avoids CSRF issues, industry standard.

import jwt from "jsonwebtoken";
import { redisClient } from "../index.js";
import { generateCSRFToken, revokeCSRFTOKEN } from "./csrfMiddleware.js";
import {
  generateDeviceFingerprint,
  generateSessionId,
} from "../utils/deviceFingerPrint.js";
//creating session id from crypto to make sure we are in same session if user opens more than one seeion than previos will be logged out auto
import crypto from "crypto";

export const generateToken = async (
  userId,
  res,
  req,
  existingSessionId = null
) => {
  // Reuse existing session ID if provided (for token refresh)
  const sessionId = existingSessionId || generateSessionId();
  const deviceFingerprint = generateDeviceFingerprint(req);

  // Only invalidate previous session if this is a NEW login
  if (!existingSessionId) {
    const existingActiveSessionId = await redisClient.get(
      `active_session:${userId}`
    );
    if (existingActiveSessionId) {
      await invalidateUserSession(userId, existingActiveSessionId);
    }
  }

  // ✅ FIX: Use 'id' consistently (not 'userId')
  const accessToken = jwt.sign(
    { id: userId, sessionId }, // ✅ Changed from 'userId' to 'id'
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: userId, sessionId }, // ✅ Changed from 'userId' to 'id'
    process.env.REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  // Store session data (preserve createdAt if refreshing)
  const sessionData = {
    userId,
    deviceFingerprint,
    createdAt: existingSessionId
      ? await getExistingSessionCreatedAt(sessionId)
      : new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    userAgent: req.headers["user-agent"] || "unknown",
    ip: req.ip || "unknown",
  };

  const pipeline = redisClient.multi();

  pipeline.setEx(
    `refresh_token:${userId}:${sessionId}`,
    7 * 24 * 60 * 60,
    refreshToken
  );
  pipeline.setEx(`active_session:${userId}`, 7 * 24 * 60 * 60, sessionId);
  pipeline.setEx(
    `session_device:${sessionId}`,
    7 * 24 * 60 * 60,
    JSON.stringify(sessionData)
  );
  pipeline.sAdd(`device_sessions:${userId}`, sessionId);
  pipeline.expire(`device_sessions:${userId}`, 7 * 24 * 60 * 60);

  await pipeline.exec();

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const csrfToken = await generateCSRFToken(userId, res);
  return { accessToken, refreshToken, csrfToken, sessionId };
};

// Helper function to preserve original session creation time
const getExistingSessionCreatedAt = async (sessionId) => {
  try {
    const sessionData = await redisClient.get(`session_device:${sessionId}`);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      return parsed.createdAt;
    }
  } catch (error) {
    console.error("Error getting session createdAt:", error);
  }
  return new Date().toISOString();
};

// export const generateToken = async (userId, res, req) => {
//   //passing session id along with acess and refresh
//   const sessionId = generateSessionId();
//   const deviceFingerprint = generateDeviceFingerprint(req);

//   // Check if user has existing active session
//   const existingSessionId = await redisClient.get(`active_session:${userId}`);
//   if (existingSessionId) {
//     // Invalidate previous session completely
//     await invalidateUserSession(userId, existingSessionId);
//   }

//   const accessToken = jwt.sign({ userId, sessionId }, process.env.JWT_SECRET, {
//     expiresIn: "15m",
//   });

//   const refreshToken = jwt.sign(
//     { userId, sessionId },
//     process.env.REFRESH_SECRET,
//     {
//       expiresIn: "7d",
//     }
//   );

//   // Store session data in Redis with 7-day expiry
//   const sessionData = {
//     userId,
//     deviceFingerprint,
//     createdAt: new Date().toISOString(),
//     lastActivity: new Date().toISOString(),
//     userAgent: req.headers["user-agent"] || "unknown",
//     ip: req.ip || "unknown",
//   };

//   // const refreshTokenKey = `refresh_token:${userId}`;
//   // //setting value in redis for 7 days same as back values just diff syntax
//   // await redisClient.setEx(refreshTokenKey, 7 * 24 * 60 * 60, refreshToken);

//   // Redis operations for session management
//   const pipeline = redisClient.multi();
//   // Store refresh token with session ID
//   pipeline.setEx(
//     `refresh_token:${userId}:${sessionId}`,
//     7 * 24 * 60 * 60,
//     refreshToken
//   );
//   // Store active session mapping
//   pipeline.setEx(`active_session:${userId}`, 7 * 24 * 60 * 60, sessionId);
//   // Store session details
//   pipeline.setEx(
//     `session_device:${sessionId}`,
//     7 * 24 * 60 * 60,
//     JSON.stringify(sessionData)
//   );
//   // Add to user's device sessions set
//   pipeline.sAdd(`device_sessions:${userId}`, sessionId);
//   pipeline.expire(`device_sessions:${userId}`, 7 * 24 * 60 * 60);
//   await pipeline.exec();

//   //for sending token via cookies in frontend
//   res.cookie("accessToken", accessToken, {
//     httpOnly: true, //can read cookie from backend only
//     secure: true, //can be only used with https
//     sameSite: "none", // to avoid cross site resource forgery attack by hackers
//     maxAge: 15 * 60 * 1000, // max time to live 1 min
//   });

//   res.cookie("refreshToken", refreshToken, {
//     httpOnly: true, //can read cookie from backend only
//     secure: true, //can be only used with https
//     sameSite: "none", // to avoid cross site resource forgery attack by hackers
//     maxAge: 7 * 24 * 60 * 60 * 1000, // max time to live 7 days
//   });

//   const csrfToken = await generateCSRFToken(userId, res);

//   return { accessToken, refreshToken, csrfToken, sessionId };
// };

//verifying that refresh token came from user is same as one stored in redis
export const verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const { id: userId, sessionId } = decoded;
    // Check if this specific session's refresh token exists as every time we rotation token so we have new access ,refresh and csrf token but it still existsit means something si wrong -someone stored previous refresh token and used it to get new access token
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    // Attempt to mark this token as “used” atomically
    const setResult = await redisClient.set(
      `used_refresh:${tokenHash}`, // key
      Date.now().toString(), // value (timestamp)
      {
        NX: true, // Only set if key doesn’t already exist
        EX: 7 * 24 * 60 * 60, // Expire after 7 days
      }
    );

    if (!setResult) {
      // If setResult is falsy, the key was already present → reuse detected
      console.error(
        `🚨 Token reuse detected for user ${userId}, session ${sessionId}`
      );
      await invalidateUserSession(userId, sessionId);
      return null;
    }
    const storedToken = await redisClient.get(
      `refresh_token:${userId}:${sessionId}`
    );
    // Verify session is still active
    const activeSessionId = await redisClient.get(`active_session:${userId}`);
    if (storedToken === refreshToken && activeSessionId === sessionId) {
      return decoded;
    }

    //else return null
    return null;
  } catch (error) {
    return null;
  }
};

//to generate new access token
export const generateAccessToken = (id, res) => {
  const accessToken = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  //for sending token via cookies in frontend
  res.cookie("accessToken", accessToken, {
    httpOnly: true, //can read cookie from backend only
    secure: true, //can be only used with https
    sameSite: "none", // to avoid cross site resource forgery attack by hackers
    maxAge: 15 * 60 * 1000, // max time to live 1 min
  });
};

//when we do logout remove refreh token from redis too
export const revokeRefreshtoken = async (userId) => {
  await redisClient.del(`refresh_token:${userId}`);
  await revokeCSRFTOKEN(userId);
};

// Function to completely invalidate a user's session
// export const invalidateUserSession = async (userId, sessionId) => {
//   try {
//     const pipeline = redisClient.multi();

//     // Remove refresh token for this session
//     pipeline.del(`refreshtoken:${userId}:${sessionId}`);

//     // Remove session device data
//     pipeline.del(`session_device:${sessionId}`);

//     // Remove from user's active sessions set
//     pipeline.sRem(`device_sessions:${userId}`, sessionId);

//     // If this was the active session, remove the mapping
//     const activeSessionId = await redisClient.get(`active_session:${userId}`);
//     if (activeSessionId === sessionId) {
//       pipeline.del(`active_session:${userId}`);
//     }

//     // Remove user cache to force fresh data on next request
//     pipeline.del(`user:${userId}`);

//     // Remove CSRF token for this user
//     pipeline.del(`csrf:${userId}`);

//     // Execute all operations atomically
//     await pipeline.exec();

//     console.log(`Session ${sessionId} invalidated for user ${userId}`);
//   } catch (error) {
//     console.error("Error invalidating session:", error);
//     throw error;
//   }
// };

export const invalidateUserSession = async (userId, sessionId) => {
  try {
    const pipeline = redisClient.multi();

    // ✅ FIX: Corrected the key name (refresh_token not refreshtoken)
    pipeline.del(`refresh_token:${userId}:${sessionId}`); // Fixed underscore

    pipeline.del(`session_device:${sessionId}`);
    pipeline.sRem(`device_sessions:${userId}`, sessionId);

    const activeSessionId = await redisClient.get(`active_session:${userId}`);
    if (activeSessionId === sessionId) {
      pipeline.del(`active_session:${userId}`);
    }

    pipeline.del(`user:${userId}`);
    pipeline.del(`csrf:${userId}`);

    await pipeline.exec();

    console.log(`Session ${sessionId} invalidated for user ${userId}`);
  } catch (error) {
    console.error("Error invalidating session:", error);
    throw error;
  }
};
