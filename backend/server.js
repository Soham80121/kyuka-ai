const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const policyRoutes = require("./routes/policyRoutes");
const aiRoutes = require("./routes/aiRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const copilotRoutes = require("./routes/copilotRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const reportRoutes = require("./routes/reportRoutes");
const searchRoutes = require("./routes/searchRoutes");
const { runReminderCheck } = require("./services/agents/reminderAgent");

const app = express();
const auth = require("./middleware/authMiddleware");

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/assistant", aiRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/copilot", copilotRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/search", searchRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Vercel Cron invokes this endpoint using GET and supplies CRON_SECRET as a bearer token.
app.get("/api/cron/reminders", async (req, res) => {
  const expected = process.env.CRON_SECRET;
  const authorization = req.headers.authorization;
  if (!expected || authorization !== `Bearer ${expected}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  await runReminderCheck();
  return res.json({ success: true, message: "Reminder check completed." });
});

app.get("/dashboard", auth, (req, res) => {
  res.json({ message: "Welcome", user: req.user });
});

app.get("/", (req, res) => {
  res.send("Kyuka AI API is running.");
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof require("multer").MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "PDF must be 4 MB or smaller." });
  }
  if (err.message === "Only PDF files are allowed.") {
    return res.status(400).json({ message: err.message });
  }
  return res.status(500).json({ message: "Something went wrong." });
});

module.exports = app;
