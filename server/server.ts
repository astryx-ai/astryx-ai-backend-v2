import "./config/env";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import routes from "./routes/service";
import streamRoutes from "./routes/stream";
import userRoutes from "./routes/user";
import whatsappRoutes from "./routes/whatsapp";
import telegramRoutes from "./routes/telegram";
import { verifyToken } from "./middleware/auth";
import { ENV } from "./config/env";

const app = express();
const port = ENV.WEBSITES_PORT;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/", routes);
app.use("/user", verifyToken, userRoutes);
app.use("/whatsapp", whatsappRoutes);
app.use("/telegram", telegramRoutes);
app.use("/stream", streamRoutes);

// Welcome route
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Welcome to our API" });
});

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
