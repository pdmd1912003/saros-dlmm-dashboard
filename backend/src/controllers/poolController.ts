import { Request, Response } from "express";
import { getAllPoolsFromDB } from "../service/saros-service/poolService";

export async function getAllPools(req: Request, res: Response) {
    try {
        const pools = await getAllPoolsFromDB();
        res.status(200).json(pools);
    } catch (error: any) {
        console.error("Error fetching pools:", error);
        res.status(500).json({ error: error.message });
    }
}
