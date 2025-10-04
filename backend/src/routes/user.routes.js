import express from "express";
import {
  adminController,
  loginUser,
  logoutUser,
  myProfile,
  newAccessTokenGeneration,
  refreshCSRF,
  registerUser,
  verifyOtp,
  verifyUser,
  getActiveSessions,
  logoutFromDevice,
} from "../controllers/user.controller.js";
import { authorizeAdmin, isAuth } from "../middleware/AuthChecker.js";
import { verifyCSRFToken } from "../config/csrfMiddleware.js";
import { testget } from "../controllers/test.controller.js";
const router = express.Router();

router.post("/register", registerUser);
router.post("/verify/:token", verifyUser);
router.post("/login", loginUser);
router.post("/verify", verifyOtp);
router.get("/me", isAuth, myProfile);
router.post("/refreshAccessToken", newAccessTokenGeneration);
//for testing to see if access token gets refreshed or not
router.get("/get", isAuth, testget);
//can logout only if user is loggged in
//csrf token can only be sent with post authenticated request as we have only one post for logout where we need to send it in header
router.post("/logout", isAuth, verifyCSRFToken, logoutUser);
router.post("/refresh-csrf", isAuth, refreshCSRF);
//for this route we need to be authenticated as well as admin
router.get("/admin", isAuth, authorizeAdmin, adminController);
router.get("/sessions", isAuth, getActiveSessions);
router.delete("/sessions/:sessionId", isAuth, logoutFromDevice);

export default router;
