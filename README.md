# Authentication-Advanced

A robust, production-grade authentication system using Node.js, Express, MongoDB, Redis, and React.

---

## 🚀 Features

- **Email Registration & Verification**
- **Login with OTP (2FA)**
- **Access & Refresh Tokens (JWT)**
- **Multi-device Session Management (Redis)**
- **Advanced CSRF Protection**
- **Secure Cookies (`httpOnly`, `SameSite`, `Secure`)**
- **Input Validation & Sanitization (Zod, mongo-sanitize)**
- **Rate Limiting (Redis)**
- **Device Fingerprinting**
- **Logout from Specific Device/Session**
- **Modern React Frontend (axios interceptor, CSRF header)**

---

## 🗂 Project Structure

Authentication-Advanced/
├── backend/
│ ├── src/
│ └── package.json
├── frontend/
│ ├── src/
│ └── package.json
└── README.md



---

## ⚡️ Getting Started

### Clone the repo

git clone https://github.com/gauravsharmaer/Authentication-Advanced.git
cd Authentication-Advanced


---

### Backend Setup

cd backend
npm install
cp .env.example .env # Add your MongoDB, Redis, JWT secrets, Email config, etc.
npm run dev


**Required `.env` variables (example):**

PORT=5000
MONGODB_URI=<your_mongo_uri>
REDIS_URL=<your_redis_uri>
JWT_SECRET=<your_jwt_secret>
REFRESH_SECRET=<your_refresh_secret>
FRONTEND_URL=http://localhost:5173
[email config...]


---

### Frontend Setup

cd ../frontend
npm install
cp .env.example .env # Set VITE_BASE_URL to your backend server
npm run dev


---

## 🧑‍💻 Usage

1. **Register** with email & verify using link received in email.
2. **Login** and enter OTP sent to your email.
3. **Session Management**: See & logout from devices/sessions.
4. **Security**: Protected endpoints, CSRF & rate limiting.

---

## 🔗 API Endpoints

| Route                        | Method | Description               |
|------------------------------|--------|---------------------------|
| `/api/v1/register`           | POST   | Register new user         |
| `/api/v1/verify/:token`      | GET    | Verify email              |
| `/api/v1/login`              | POST   | Login, get OTP            |
| `/api/v1/verify-otp`         | POST   | Verify OTP, get tokens    |
| `/api/v1/logout`             | POST   | Logout from session       |
| `/api/v1/refreshAccessToken` | POST   | Refresh access token      |
| `/api/v1/logout/:sessionId`  | POST   | Logout from device        |
| `/api/v1/sessions`           | GET    | List active sessions      |

---

## 🛡 Security

- **Tokens in HttpOnly cookies**
- **CSRF header (frontend only)**
- **Strict input validation**
- **Rate limiting on critical endpoints**
- **Password hashing with bcrypt**

---

## 📝 License

MIT

---

> Built with ♥ by [Gaurav Sharma](https://github.com/gauravsharmaer)

