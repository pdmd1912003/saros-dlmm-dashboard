import express from "express";
import { getAllPools } from "../controllers/poolController";

const router = express.Router();

// GET /api/pools
router.get("/", getAllPools);

export default router;
