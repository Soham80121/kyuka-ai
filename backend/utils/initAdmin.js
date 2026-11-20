const User = require("../models/User");
const bcrypt = require("bcryptjs");

let initializationPromise;

const initAdmin = async () => {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      const adminExists = await User.findOne({ role: "admin" });
      if (adminExists) return;

      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
        console.warn("Initial admin was not created: ADMIN_EMAIL or ADMIN_PASSWORD is missing.");
        return;
      }

      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await User.create({
        name: "Admin",
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin",
        designation: "System Administrator",
        status: "Active",
        mustChangePassword: false,
        firstLogin: false,
      });
      console.log("Initial Admin account created successfully.");
    } catch (error) {
      initializationPromise = null;
      console.error("Failed to initialize Admin:", error);
      throw error;
    }
  })();

  return initializationPromise;
};

module.exports = initAdmin;
