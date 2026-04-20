import express from "express";
import { completeSale, getUserTransactions, getTransactionDetails, testDeductInventory, calculateSeniorPWDDiscountAPI } from "../controllers/posController.js";
import { voidTransaction } from "../controllers/voidController.js";
import { refundTransaction } from "../controllers/refundController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// POST /api/pos/complete-sale (protected route)
router.post("/complete-sale", verifyToken, completeSale);

// GET /api/pos/user-transactions - fetch transactions made by current cashier
router.get("/user-transactions", verifyToken, getUserTransactions);

// GET /api/pos/transaction/:id - fetch header and items
router.get("/transaction/:id", verifyToken, getTransactionDetails);

// POST /api/pos/void - request void with reason & admin pin
router.post("/void", verifyToken, voidTransaction);

// POST /api/pos/refund - request refund (full or partial) with reason & admin pin
router.post("/refund", verifyToken, refundTransaction);

// POST /api/pos/deduct-inventory - test inventory deduction for a product order
router.post("/deduct-inventory", verifyToken, testDeductInventory);

// POST /api/pos/calculate-senior-pwd-discount - calculate Senior/PWD discount with per-item discount qty
router.post("/calculate-senior-pwd-discount", calculateSeniorPWDDiscountAPI);

export default router;
