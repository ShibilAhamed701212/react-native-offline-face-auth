import express from "express";
import cors from "cors";

import attendanceRoutes from "./routes/attendance.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Running Successfully");
});

app.use("/api/attendance", attendanceRoutes);

export default app;