import express from "express"
import {
  getWalletPoolsController,
  getWalletPositionsByPool,
} from "../controllers/positionController"

const router = express.Router()

// 🧩 Lấy danh sách pool mà wallet có position
router.get("/pools", getWalletPoolsController)

// 🧩 Lấy danh sách positions của wallet trong 1 pool
router.get("/:poolAddress", getWalletPositionsByPool)

export default router
