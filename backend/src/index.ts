import express from "express";
import dotenv from "dotenv";
//@ts-ignore
import cors from "cors";
import poolRoutes from "./routes/pool.routes";
import positionRoutes from "./routes/position.routes"
dotenv.config();
const app = express();
const port = process.env.PORT || 8888;

app.use(cors()); 
app.use(express.json());

// Routes
app.use("/api/pools", poolRoutes);
app.use("/api/positions", positionRoutes)
app.get("/", (req, res) => {
  res.send("🚀 Backend is running successfully!");
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
  