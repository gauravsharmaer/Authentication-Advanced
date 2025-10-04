import express from "express";
import dotenv from "dotenv";
import { createClient } from "redis";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./db/dbConnect.js";
import router from "./routes/user.routes.js";

dotenv.config({
  path: "./env",
});

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.log("missing redis url");
  process.exit(1);
}

export const redisClient = createClient({
  url: redisUrl,
});

redisClient
  .connect()
  .then(() => {
    console.log("connected to redis");
  })
  .catch(console.error);

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    //allow frontend to include cookies in request
    credentials: true,
    //"OPTIONS" → super important, because it allows browsers to do CORS preflight checks.
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
app.use("/api/v1", router);

app.get("/", (req, res) => {
  res.json("hello world");
});
const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`sun rha hu ${port} pr`);
    });
  })
  .catch((err) => {
    console.error("err connecting db", err);
    process.exit(1);
  });
