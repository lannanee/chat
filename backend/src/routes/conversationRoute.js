import express from "express";
import {
  createConversation,
  getConversations,
  getMessages,
  markAsSeen,
  deleteConversation,
  addGroupMembers,
} from "../controllers/conversationController.js";
import { checkFriendship } from "../middlewares/friendMiddleware.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", checkFriendship, createConversation);
router.get("/", getConversations);
router.get("/:conversationId/messages", getMessages);
router.patch("/:conversationId/seen", markAsSeen);
router.delete("/:conversationId", deleteConversation);
router.post("/:conversationId/members", protectedRoute, addGroupMembers);

export default router;
