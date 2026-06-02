import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "Secure Offline Face Auth Backend",
    version: "1.0.0"
  });
});

export default app;