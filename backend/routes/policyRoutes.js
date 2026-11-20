const express = require("express");
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const { restrictTo } = require("../middleware/roleMiddleware");
const {
  getPolicies,
  uploadPolicy,
  downloadPolicy,
  deletePolicy,
} = require("../controllers/policyController");

const router = express.Router();

// Vercel Functions have a 4.5 MB request-body limit. Keep uploads below that limit.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") return cb(null, true);
    cb(new Error("Only PDF files are allowed."));
  },
});

router.get("/", auth, getPolicies);
router.get("/:id/file", auth, downloadPolicy);
router.post("/upload", auth, restrictTo("admin", "hr"), upload.single("policyFile"), uploadPolicy);
router.delete("/:id", auth, restrictTo("admin", "hr"), deletePolicy);

module.exports = router;
