import express from "express";
import { verifyInviteCodeController } from "../controllers/invite";

const router = express.Router();

router.post(
  "/verify",
  verifyInviteCodeController as unknown as express.RequestHandler
);

export default router;
