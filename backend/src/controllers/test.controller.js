import TryCatch from "../middleware/TryCatch.js";
export const testget = TryCatch(async (req, res) => {
  res.status(200).json({
    message: "Hello world",
  });
});
