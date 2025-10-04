Rate Limiting

Before registering, the code checks Redis for a key:
register-rate-limit:${req.ip}:${email}
If this key exists, it means the user (from this IP and email) has recently tried to register, so the API returns a "rate limit exceeded" error (429).
After sending the verification email, it sets this key in Redis with a value "true" and an expiry of 60 seconds ({ EX: 60 }). This prevents repeated registration attempts within 1 minute.
Email Verification Data Storage

When a user registers, a verification token is generated.
The user's registration data (name, email, hashed password) is stored in Redis under a key:
verify:${verifyToken}
This data is stored as a JSON string and expires after 300 seconds (5 minutes) ({ EX: 300 }).
The verification email contains a link with this token. When the user clicks the link, the backend can retrieve the registration data from Redis using the token.
Summary:

Redis is used for short-term storage and rate limiting, helping prevent abuse and enabling secure email verification.
