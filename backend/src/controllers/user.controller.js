import { loginSchema, regsiterSchema } from "../config/zod.js";
import TryCatch from "../middleware/TryCatch.js";
import sanitize from "mongo-sanitize";
import { User } from "../../src/models/user.models.js";
import bcrypt from "bcrypt";
import sendMail from "../config/sendMail.js";
import { getOtpHtml, getVerifyEmailHtml } from "../config/Html.js";
import { redisClient } from "../index.js";
import crypto from "crypto";
import { json } from "zod";
import {
  generateAccessToken,
  generateToken,
  revokeRefreshtoken,
  verifyRefreshToken,
} from "../config/generateToken.js";
import { generateCSRFToken } from "../config/csrfMiddleware.js";
import { generateDeviceFingerprint } from "../utils/deviceFingerPrint.js";
import { invalidateUserSession } from "../config/generateToken.js";

export const registerUser = TryCatch(async (req, res) => {
  const sanitizedBody = sanitize(req.body);

  const validation = regsiterSchema.safeParse(sanitizedBody);

  if (!validation.success) {
    const zodError = validation.error;
    let firstErrorMessage = "validation failed";
    let allErrors = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allErrors = zodError.issues.map((issue) => ({
        field: issue.path ? issue.path.join(".") : "unknown",
        message: issue.message || "validation Error",
        code: issue.code,
      }));
      firstErrorMessage = allErrors[0]?.message || "validation Error";
    }
    return res.status(400).json({
      message: firstErrorMessage,
      error: allErrors,
    });
  }

  const { name, email, password } = validation.data;
  //in redis it will be stored ratelimitkey
  const rateLimitKey = `register-rate-limit:${req.ip}:${email}`;

  const rateLimit = await redisClient.get(rateLimitKey);
  if (rateLimit) {
    return res.status(429).json({ message: "rate limit exceeded" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "user already exists" });
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const verifyToken = crypto.randomBytes(32).toString("hex");
  //for verification it will be stored by verify key
  const verifyKey = `verify:${verifyToken}`;
  const datatoStore = JSON.stringify({
    name,
    email,
    password: hashPassword,
  });

  //setting in redis and valid for 300 seconds
  await redisClient.set(verifyKey, datatoStore, { EX: 300 });

  //setting subject and html for email
  const subject = "verify your email for Account creation";

  const html = getVerifyEmailHtml({ email, token: verifyToken });
  await sendMail({ email, subject, html });
  //1 min ratelimit for api
  await redisClient.set(rateLimitKey, "true", { EX: 60 });
  res.status(200).json({
    message:
      "If your  email is valid , a verification link has been sent . It will expire in 5 minutes",
  });
});

export const verifyUser = TryCatch(async (req, res) => {
  const { token } = req.params;
  if (!token) {
    return res.status(400).json({
      message: "verification token is required",
    });
  }
  //to check if user is in redis we saved this while registering
  const verifyKey = `verify:${token}`;
  const userDataJson = await redisClient.get(verifyKey);

  if (!userDataJson) {
    return res.status(400).json({
      message: "verification link is expired",
    });
  }

  //if the user exists we will delete verifiction from redis so someone cant use it again
  await redisClient.del(verifyKey);
  //now the data we extracted from redis we will use it
  const userData = JSON.parse(userDataJson);
  //to be on safe side not necessary yet will check if user is already in db

  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    return res.status(400).json({ message: "user already exists" });
  }

  const newUser = await User.create({
    name: userData.name,
    email: userData.email,
    password: userData.password,
  });

  res.status(201).json({
    message: "email verified successfully! your account has been created",
    user: {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
    },
  });
});

export const loginUser = TryCatch(async (req, res) => {
  const sanitizedBody = sanitize(req.body);

  const validation = loginSchema.safeParse(sanitizedBody);

  if (!validation.success) {
    const zodError = validation.error;
    let firstErrorMessage = "validation failed";
    let allErrors = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allErrors = zodError.issues.map((issue) => ({
        field: issue.path ? issue.path.join(".") : "unknown",
        message: issue.message || "validation Error",
        code: issue.code,
      }));
      firstErrorMessage = allErrors[0]?.message || "validation Error";
    }
    return res.status(400).json({
      message: firstErrorMessage,
      error: allErrors,
    });
  }

  const { email, password } = validation.data;
  //setting rtelimit key for redis
  const rateLimitKey = `login-rate-limiy:${req.ip}:${email}`;

  //checking if user already sent request
  const rateLimit = await redisClient.get(rateLimitKey);
  if (rateLimit) {
    return res.status(429).json({ message: "rate limit exceeded" });
  }

  //checking is user exist in db
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "invalid credentials" });
  }

  //if user exists compare passsowrd
  const comparePassword = await bcrypt.compare(password, user.password);
  //if password is wrong
  if (!comparePassword) {
    return res.status(400).json({ message: "invalid credentials" });
  }
  //create 6 digit  otp to verify user 2 factor authentication
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  //creating otpkey and dtoring in redis with 5 min validiaty same as verification wile creatng user
  const otpKey = `otp:${email}`;
  await redisClient.set(otpKey, JSON.stringify(otp), {
    EX: 300,
  });

  //generating otp mail syantx
  const subject = "otp for verification";
  const html = getOtpHtml({ email, otp });
  await sendMail({ email, subject, html });

  //seeting rate limit for this api call 1min
  await redisClient.set(rateLimitKey, "true", {
    EX: 60,
  });

  res.json({
    message:
      "If your email is valid,an otp has been sent.It will be valid for 5 mins",
  });
});

export const verifyOtp = TryCatch(async (req, res) => {
  //when user will login save email in local and then send here with otp
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({
      message: "please provide all details",
    });
  }

  const otpKey = `otp:${email}`;

  const storedOtpString = await redisClient.get(otpKey);
  //if otp is not in redis it means it expired
  if (!storedOtpString) {
    return res.status(400).json({
      message: "otp expired",
    });
  }

  const storedOtp = JSON.parse(storedOtpString);

  if (storedOtp !== otp) {
    return res.status(400).json({
      message: "invalid Otp",
    });
  }
  //otp is true thrn remove it from redis so someone cant //misuse it
  await redisClient.del(otpKey);
  // if eberything is fine we let the user login and give me 2 tokens one is access token and other is refresh token. Access token to check that this request is coming from a logged in user.Refresh token will help keep user logged in in case of eccess token expire
  let user = await User.findOne({ email });
  const tokenData = await generateToken(user._id, res, req);
  res.status(200).json({
    message: `welcome ${user.name}`,
    user,
    sessionInfo: {
      sessionId: tokenData.sessionId,
      deviceFingerprint: generateDeviceFingerprint(req),
    },
  });
});

//fetching user profile
export const myProfile = TryCatch(async (req, res) => {
  //req.user will come from AuthChecker middleware
  const user = req.user;
  res.json(user);
});

// export const newAccessTokenGeneration = TryCatch(async (req, res) => {
//   const refreshToken = req.cookies.refreshToken;
//   if (!refreshToken) {
//     return res.status(401).json({
//       message: "Refresh token missing",
//       code: "REFRESH_TOKEN_MISSING",
//     });
//   }

//   const decode = await verifyRefreshToken(refreshToken);
//   if (!decode) {
//     return res.status(401).json({
//       message: "Invalid or expired refresh token",
//       code: "REFRESH_TOKEN_INVALID",
//     });
//   }
//   await revokeRefreshtoken(decode.id);

//   await generateToken(decode.id, res, req);
//   res.status(200).json({
//     message: `New access and refresh tokens issued`,
//   });
// });

export const newAccessTokenGeneration = TryCatch(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      message: "Refresh token missing",
      code: "REFRESH_TOKEN_MISSING",
    });
  }

  const decode = await verifyRefreshToken(refreshToken);

  if (!decode) {
    return res.status(401).json({
      message: "Invalid or expired refresh token",
      code: "REFRESH_TOKEN_INVALID",
    });
  }

  // ✅ FIX: Extract sessionId and reuse it
  const { id: userId, sessionId } = decode;

  // ❌ REMOVE THIS - don't revoke during refresh!
  // await revokeRefreshtoken(userId);

  // ✅ FIX: Pass existing sessionId to preserve the session
  await generateToken(userId, res, req, sessionId);

  res.status(200).json({
    message: "New access token issued",
  });
});

export const logoutUser = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const sessionId = req.sessionId;

  // await revokeRefreshtoken(userId);
  // Complete session invalidation
  await invalidateUserSession(userId, sessionId);

  //clearing cookies
  res.clearCookie("refreshToken");
  res.clearCookie("accessToken");
  res.clearCookie("csrfToken");
  //removed user from redis db
  await redisClient.del(`user:${userId}`);
  res.json({
    message: "logged out successfuly",
  });
});

export const refreshCSRF = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const newCSRFToken = await generateCSRFToken(userId, res);
  res.status(200).json({
    message: "CSRF token refreshed",
    csrfToken: newCSRFToken,
  });
});

export const adminController = TryCatch(async (req, res) => {
  res.status(200).json({
    message: "Hello admin",
  });
});

// Logout from specific device/session
export const logoutFromDevice = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const { sessionId } = req.params;
  // Verify user owns this session
  const userSessions = await redisClient.smembers(`device_sessions:${userId}`);
  if (!userSessions.includes(sessionId)) {
    return res.status(403).json({ message: "Session not found" });
  }
  await invalidateUserSession(userId, sessionId);
  res.json({ message: "Session terminated successfully" });
});

// Get active sessions for user
export const getActiveSessions = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const sessionIds = await redisClient.smembers(`device_sessions:${userId}`);
  const sessions = [];
  for (const sessionId of sessionIds) {
    const sessionData = await redisClient.get(`session_device:${sessionId}`);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      sessions.push({
        sessionId,
        deviceFingerprint: parsed.deviceFingerprint,
        userAgent: parsed.userAgent,
        ip: parsed.ip,
        createdAt: parsed.createdAt,
        lastActivity: parsed.lastActivity,
        isCurrent: sessionId === req.sessionId,
      });
    }
  }
  res.json({ sessions });
});
