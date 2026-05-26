import express from "express";
import {
  sendDirectMessage,
  sendGroupMessage,
  uploadVoiceMessage,
} from "../controllers/messageController.js";
import {
  checkFriendship,
  checkGroupMembership,
} from "../middlewares/friendMiddleware.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/direct", checkFriendship, sendDirectMessage);
router.post("/group", checkGroupMembership, sendGroupMessage);
router.post("/upload-voice", protectedRoute, upload.single("file"), uploadVoiceMessage);

export default router;