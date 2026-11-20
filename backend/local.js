require("dotenv").config();
const app = require("./server");
const connectDB = require("./config/db");
const initAdmin = require("./utils/initAdmin");

const port = process.env.PORT || 5000;

connectDB()
  .then(initAdmin)
  .then(() => {
    app.listen(port, () => console.log(`Kyuka AI API running on port ${port}`));
  })
  .catch((error) => {
    console.error("Failed to start Kyuka AI API:", error);
    process.exitCode = 1;
  });
