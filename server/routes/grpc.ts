import express from "express";
import { verifyToken } from "../middleware/auth";
import { messageStreamAuthorized } from "../controllers/grpcMessage";

const router = express.Router();

router.post(
  "/messages",
  verifyToken as unknown as express.RequestHandler,
  messageStreamAuthorized as unknown as express.RequestHandler
);

export default router;
