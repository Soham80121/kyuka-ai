const app = require("../backend/server");
const connectDB = require("../backend/config/db");
const initAdmin = require("../backend/utils/initAdmin");

module.exports = async (req, res) => {
  try {
    await connectDB();
    await initAdmin();
    return app(req, res);
  } catch (error) {
    console.error("API initialization failed:", error);
    return res.status(503).json({ message: "Service temporarily unavailable." });
  }
};
