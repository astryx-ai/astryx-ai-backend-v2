import express from "express";
const router = express.Router();

import * as userController from "../controllers/user";
import chatRoutes from "./chat";
import messageRoutes from "./message";

// User profile routes
router.get("/me", userController.getUserProfileController);
router.put("/me", userController.updateUserDataController);

// Chat routes
router.use("/chats", chatRoutes);

// Message routes (REST + stream)
router.use("/", messageRoutes);

export default router;
