import express from "express";
import {
  getWalletPools,
  getWalletPositionsByPool,
} from "./controllers/positionController"; // ✅ Đúng file có hàm này

const router = express.Router();

router.get("/positions/pools", getWalletPools);
router.get("/positions/:wallet/:pool", getWalletPositionsByPool);

export default router;
