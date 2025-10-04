Authentication-Advanced
Overview
Authentication-Advanced is a full-stack authentication boilerplate built using Node.js, Express, MongoDB, Redis, and React. It demonstrates a robust, modern, and scalable approach for authentication, session management, and security patterns in web applications.

Key Features:

Email-based registration with verification

Login with secure password hashing (bcrypt)

Two-factor authentication via OTP (email)

Access & Refresh token-based session management (JWT)

Multi-device session management with Redis

Advanced CSRF protection (token in header, double-submit cookie)

Security best practices: rate limiting, input validation, XSS/CSRF hardening

Logout from single or all sessions/devices

RESTful API backend with React frontend

Production-ready architecture (caching, token rotation, device fingerprinting)

Project Structure
text
Authentication-Advanced/
├── backend/
│   ├── src/
│   ├── package.json
│   └── ...
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── README.md
└── ...
Getting Started
Prerequisites
Node.js (v18+ recommended)

MongoDB (local or Atlas)

Redis (local or hosted)

npm or yarn

Installation
1. Clone the repository
bash
git clone https://github.com/gauravsharmaer/Authentication-Advanced.git
cd Authentication-Advanced
2. Backend Setup
bash
cd backend
cp .env.example .env # create your .env file
npm install
Fill in the .env file with your configuration:

PORT=5000

MONGODB_URI=your_mongodb_connection_string

REDIS_URL=your_redis_connection_string

JWT_SECRET=your_jwt_secret

REFRESH_SECRET=your_refresh_token_secret

FRONTEND_URL=http://localhost:5173 (or your frontend domain)

Email credentials for nodemailer

Start the backend server:

bash
npm run dev
3. Frontend Setup
bash
cd ../frontend
cp .env.example .env # create your .env file if needed
npm install
npm run dev
Configure VITE_BASE_URL in your .env file to match your backend API.

Usage
Register: Create a new account via the frontend, check your email for a verification link.

Login: Enter your credentials, receive an OTP, enter the OTP to authenticate.

Session Management: Manage multiple device sessions. Logout from single/all devices.

Security: All endpoints are protected with advanced authentication and CSRF protection.

API Endpoints
See backend/src/routes/user.routes.js for all available endpoints.

Endpoint	Method	Description
/api/v1/register	POST	Register a new user
/api/v1/verify/:token	GET	Verify user email
/api/v1/login	POST	Initiate login (sends OTP)
/api/v1/verify-otp	POST	Verify OTP, issues tokens
/api/v1/refreshAccessToken	POST	Refresh JWT access token
/api/v1/logout	POST	Logout from current session
/api/v1/logout/:sessionId	POST	Logout from specific session
/api/v1/sessions	GET	List all active sessions/devices
Security Highlights
HTTP-only cookies for tokens (unreadable in JS)

CSRF token accessible to frontend for double-submit protection

Input validation with zod and sanitization

Rate limiting for registration & login

Device fingerprinting for session integrity

Robust session invalidation (device-level logout)

Password securely hashed with bcrypt

Contributing
Contributions are welcome! Please open issues or submit pull requests for bug fixes or enhancements.

License
This project is open-source under the MIT License.

Built and maintained by Gaurav Sharma (github.com/gauravsharmaer)

You can personalize contact/use sections if you want. Add further deployment notes or environment variable samples as needed!
