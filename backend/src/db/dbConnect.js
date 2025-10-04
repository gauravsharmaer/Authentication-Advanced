import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "MERNAuthentication",
    });
    console.log("database connected");
  } catch (error) {
    console.error("error connecting db", error);
    throw error;
  }
};
export default connectDB;
