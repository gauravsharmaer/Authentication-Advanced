import crypto from "crypto";
import { redisClient } from "../index.js";

export const generateCSRFToken = async (userId, res) => {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  const csrfKey = `csrf:${userId}`;
  //set in redis for 1 hour expiry
  await redisClient.setEx(csrfKey, 3600, csrfToken);

  res.cookie("csrfToken", csrfToken, {
    httpOnly: false, //need to read it from fronted and send with header with every request
    secure: true,
    sameSite: "none",
    maxAge: 60 * 60 * 1000,
  });

  return csrfToken;
};

export const verifyCSRFToken = async (req, res, next) => {
  try {
    //if get request then just move ahead will  Only check POST, PUT, DELETE methods
    if (req.method === "GET") {
      return next();
    }
    const userId = req.user?._id;
    // If user is not authenticated
    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated",
        code: "USER_NOT_AUTHENTICATED",
      });
    }

    //can get token from user in 3 ways from header will be using first one
    const clientToken =
      req.headers["x-csrf-token"] ||
      req.headers["x-xsrf-token"] ||
      req.headers["csrf-token"];

    // Both tokens missing scenario
    if (!clientToken && !req.cookies.accessToken) {
      return res.status(403).json({
        message: "Both access and CSRF tokens missing",
        code: "BOTH_TOKENS_MISSING",
      });
    }

    if (!clientToken) {
      // will use the token in api interceptor
      return res.status(403).json({
        message: "CSRF token is missing .Please refresh the page",
        code: "CSRF_TOKEN_MISSING",
      });
    }
    // if not present in redis
    const csrfKey = `csrf:${userId}`;
    const storedToken = await redisClient.get(csrfKey);
    if (!storedToken) {
      return res.status(403).json({
        message: "CSRF token expired .Please try again",
        code: "CSRF_TOKEN_EXPIRED",
      });
    }
    //if stored token in redis is not same as token given by client
    if (storedToken != clientToken) {
      return res.status(403).json({
        message: "Invalid CSRF token.Please refresh page",
        code: "CSRF_TOKEN_INVALID",
      });
    }
    next();
  } catch (error) {
    console.log("CSRF berification error:", error);
    return res.status(500).json({
      message: "CSRF verification failed",
      code: "CSRF_VERIFICATION_ERROR",
    });
  }
};

//removing csrf token from redis in case of logout
export const revokeCSRFTOKEN = async (userId) => {
  const csrfKey = `csrf:${userId}`;
  await redisClient.del(csrfKey);
};

//refreshing the csrf token
export const refreshCSRFToken = async (userId, res) => {
  //remove old csrf token first
  await revokeCSRFTOKEN(userId);
  //generate and return new csrf token
  return await generateCSRFToken(userId, res);
};
