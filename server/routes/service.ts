import express from "express";
import * as controllers from "../controllers/service";

const router = express.Router();

// Explicitly cast the controller function to the expected type
router.get(
  "/health",
  controllers.healthCheck as unknown as express.RequestHandler
);

export default router;
