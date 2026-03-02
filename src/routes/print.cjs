const express = require("express");
const router = express.Router();
const printReceipt = require("../utils/printReceipt");

router.post("/print-receipt", async (req, res) => {
  try {
    await printReceipt(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error("Print error:", err);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
