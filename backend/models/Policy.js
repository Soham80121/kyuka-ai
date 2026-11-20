const mongoose = require("mongoose");

const policySchema = new mongoose.Schema({
  title: { type: String, required: true },
  filename: { type: String, required: true },
  // Kept for compatibility with existing records. New uploads store the Blob pathname here.
  filePath: { type: String, required: true },
  blobPathname: { type: String, default: null },
  textContent: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Policy", policySchema);
