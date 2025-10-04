import jwt from "jsonwebtoken";
import { redisClient } from "../index.js";
import { User } from "../models/user.models.js";

//.verify returns
// ✅ Valid → returns decoded payload ({ id, iat, exp }).

// ⏳ Expired → throws TokenExpiredError.

// ❌ Invalid → throws JsonWebTokenError.

// export const isAuth = async (req, res, next) => {
//   try {
//     const token = req.cookies.accessToken;
//     //checking if token exists, when see 403 error then from frontend will call refrsh token api to get new token
//     if (!token) {
//       return res.status(403).json({
//         message: "Access token missing",
//         code: "ACCESS_TOKEN_MISSING",
//       });
//     }
//     //if toekn is valid
//     let decodedData;
//     try {
//       decodedData = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (error) {
//       if (error.name === "TokenExpiredError") {
//         return res.status(401).json({
//           message: "Access token expired",
//           code: "ACCESS_TOKEN_EXPIRED",
//         });
//       }
//       // Other JWT errors
//       return res.status(401).json({
//         message: "Invalid access token",
//         code: "ACCESS_TOKEN_INVALID",
//       });
//     }

//     const { id: userId, sessionId } = decodedData;
//     // Verify session is still active
//     const activeSessionId = await redisClient.get(`active_session:${userId}`);
//     if (!activeSessionId || activeSessionId !== sessionId) {
//       // Session was invalidated (user logged in from another device)
//       return res.status(401).json({
//         message: "Session invalidated - logged in from another device",
//         code: "SESSION_INVALIDATED",
//       });
//     }

//     // Update last activity
//     const sessionKey = `session_device:${sessionId}`;
//     const sessionData = await redisClient.get(sessionKey);
//     if (sessionData) {
//       const parsed = JSON.parse(sessionData);
//       parsed.lastActivity = new Date().toISOString();
//       await redisClient.setEx(
//         sessionKey,
//         7 * 24 * 60 * 60,
//         JSON.stringify(parsed)
//       );
//     }

//     //caching the user in redis in case of fast retrival and reducing server load
//     //if user is in redis then fetch it and send to next middleware
//     const cachedUser = await redisClient.get(`user:${decodedData.id}`);
//     if (cachedUser) {
//       req.user = JSON.parse(cachedUser);
//       return next();
//     }

//     //if not in redis first find in db then store in redis if user exists in db
//     const user = await User.findById(decodedData.id).select("-password");
//     if (!user) {
//       return res.status(400).json({
//         message: "no user with this id",
//       });
//     }
//     //seeting in redis for 1 hour
//     await redisClient.setEx(`user:${user._id}`, 3600, JSON.stringify(user));

//     req.user = user;
//     next();
//   } catch (error) {
//     res.status(500).json({
//       message: error.message,
//     });
//   }
// };

export const isAuth = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    //checking if token exists, when see 403 error then from frontend will call refrsh token api to get new token

    if (!token) {
      return res.status(403).json({
        message: "Access token missing",
        code: "ACCESS_TOKEN_MISSING",
      });
    }

    let decodedData;
    try {
      decodedData = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Access token expired",
          code: "ACCESS_TOKEN_EXPIRED",
        });
      }
      return res.status(401).json({
        message: "Invalid access token",
        code: "ACCESS_TOKEN_INVALID",
      });
    }

    const { id: userId, sessionId } = decodedData;

    // Verify session is still active
    const activeSessionId = await redisClient.get(`active_session:${userId}`);
    if (!activeSessionId || activeSessionId !== sessionId) {
      return res.status(401).json({
        message: "Session invalidated - logged in from another device",
        code: "SESSION_INVALIDATED",
      });
    }

    // ✅ ADD THIS - Store sessionId in req for logout
    req.sessionId = sessionId;

    // Update last activity
    const sessionKey = `session_device:${sessionId}`;
    const sessionData = await redisClient.get(sessionKey);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      parsed.lastActivity = new Date().toISOString();
      await redisClient.setEx(
        sessionKey,
        7 * 24 * 60 * 60,
        JSON.stringify(parsed)
      );
    }

    const cachedUser = await redisClient.get(`user:${userId}`);
    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      return next();
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(400).json({
        message: "no user with this id",
      });
    }

    await redisClient.setEx(`user:${user._id}`, 3600, JSON.stringify(user));
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const authorizeAdmin = async (req, res, next) => {
  const user = req.user;
  if (user.role !== "admin") {
    return res.status(401).json({
      message: "you do not have admin access",
    });
  }
  next();
};
