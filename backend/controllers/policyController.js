const { Readable } = require("node:stream");
const Policy = require("../models/Policy");
const { PDFParse } = require("pdf-parse");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");

const getBlobSdk = async () => import("@vercel/blob");

// Get all policies
exports.getPolicies = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database connection is unavailable." });
    }
    const policies = await Policy.find().select("-textContent").sort({ uploadedAt: -1 });
    return res.json(policies);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Upload policy PDF to private Vercel Blob storage
exports.uploadPolicy = async (req, res) => {
  let uploadedBlob;
  try {
    if (!req.file) return res.status(400).json({ message: "Please upload a PDF file (maximum 4 MB)." });

    const title = String(req.body.title || "").trim();
    if (!title) return res.status(400).json({ message: "Please provide a title." });
    if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") {
      return res.status(400).json({ message: "The uploaded file is not a valid PDF." });
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(503).json({ message: "File storage is not configured on this deployment." });
    }

    let pdfText = "";
    const parser = new PDFParse({ data: req.file.buffer });
    try {
      const result = await parser.getText();
      pdfText = result.text || "";
    } finally {
      await parser.destroy();
    }

    const { put } = await getBlobSdk();
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    uploadedBlob = await put(`policies/${Date.now()}-${safeName}`, req.file.buffer, {
      access: "private",
      contentType: "application/pdf",
      addRandomSuffix: true,
    });

    const newPolicy = await Policy.create({
      title,
      filename: req.file.originalname,
      filePath: uploadedBlob.pathname,
      blobPathname: uploadedBlob.pathname,
      textContent: pdfText,
    });

    await Notification.create({
      userId: req.user.id,
      title: "HR Policy Uploaded",
      message: `The policy "${title}" has been uploaded successfully.`,
      type: "success",
    });

    const { textContent, ...policyWithoutText } = newPolicy.toObject();
    return res.status(201).json(policyWithoutText);
  } catch (error) {
    if (uploadedBlob?.pathname) {
      try {
        const { del } = await getBlobSdk();
        await del(uploadedBlob.pathname, { access: "private" });
      } catch (cleanupError) {
        console.error("Blob cleanup failed:", cleanupError.message);
      }
    }
    console.error("Policy upload failed:", error);
    return res.status(500).json({ message: error.message || "Failed to upload policy." });
  }
};

// Authenticated download. Never expose private Blob URLs directly to the browser.
exports.downloadPolicy = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id).select("filename filePath blobPathname");
    if (!policy) return res.status(404).json({ message: "Policy not found." });

    const pathname = policy.blobPathname || (String(policy.filePath || "").startsWith("policies/") ? policy.filePath : null);
    if (!pathname) {
      return res.status(410).json({ message: "This policy is stored on the previous server and must be migrated before it can be viewed." });
    }

    const { get } = await getBlobSdk();
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return res.status(404).json({ message: "Policy file not found in storage." });
    }

    const safeFilename = String(policy.filename || "policy.pdf").replace(/[\r\n"]/g, "_");
    res.setHeader("Content-Type", result.blob.contentType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeFilename}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    return Readable.fromWeb(result.stream).pipe(res);
  } catch (error) {
    console.error("Policy download failed:", error);
    return res.status(500).json({ message: "Unable to retrieve policy file." });
  }
};

// Delete policy and its private Blob object
exports.deletePolicy = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) return res.status(404).json({ message: "Policy not found." });

    const pathname = policy.blobPathname || (String(policy.filePath || "").startsWith("policies/") ? policy.filePath : null);
    if (pathname) {
      const { del } = await getBlobSdk();
      await del(pathname, { access: "private" });
    }

    await Policy.findByIdAndDelete(req.params.id);
    await Notification.create({
      userId: req.user.id,
      title: "HR Policy Deleted",
      message: `The policy "${policy.title}" has been deleted.`,
      type: "warning",
    });
    return res.json({ message: "Policy deleted successfully." });
  } catch (error) {
    console.error("Policy deletion failed:", error);
    return res.status(500).json({ message: error.message || "Failed to delete policy." });
  }
};
