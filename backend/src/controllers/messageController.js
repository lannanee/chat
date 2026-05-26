import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import {
  emitNewMessage,
  updateConversationAfterCreateMessage,
} from "../utils/messageHelper.js";
import { io } from "../socket/index.js";
import { v2 as cloudinary } from "cloudinary";

export const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, conversationId } = req.body;
    const senderId = req.user._id;

    let conversation;

    if (!content) {
      return res.status(400).json({ message: "Thiếu nội dung" });
    }

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }

    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          { userId: recipientId, joinedAt: new Date() },
        ],
        lastMessageAt: new Date(),
        unreadCounts: new Map(),
      });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);
    await conversation.save();
    emitNewMessage(io, conversation, message);

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn trực tiếp", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.user._id;
    const conversation = req.conversation;

    if (!content) {
      return res.status(400).json("Thiếu nội dung");
    }

    const message = await Message.create({
      conversationId,
      senderId,
      content,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);
    await conversation.save();
    emitNewMessage(io, conversation, message);

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const uploadVoiceMessage = async (req, res) => {
  try {
    const { conversationId, duration } = req.body;
    const senderId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: "Thiếu file âm thanh" });
    }

    if (!conversationId) {
      return res.status(400).json({ message: "Thiếu conversationId" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      resource_type: "video",
      folder: "voice-messages",
    });

    const message = await Message.create({
      conversationId,
      senderId,
      content: "🎤 Tin nhắn thoại",
      voiceUrl: uploadResult.secure_url,
      voiceDuration: duration ? parseInt(duration) : null,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);
    await conversation.save();
    emitNewMessage(io, conversation, message);

    return res.status(201).json({
      message,
      voiceUrl: uploadResult.secure_url,
    });
  } catch (error) {
    console.error("Lỗi khi upload voice message:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const uploadImageMessage = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const senderId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: "Thiếu file ảnh" });
    }

    if (!conversationId) {
      return res.status(400).json({ message: "Thiếu conversationId" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      resource_type: "image",
      folder: "image-messages",
    });

    const message = await Message.create({
      conversationId,
      senderId,
      imgUrl: uploadResult.secure_url,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);
    await conversation.save();
    emitNewMessage(io, conversation, message);

    return res.status(201).json({
      message,
      imgUrl: uploadResult.secure_url,
    });
  } catch (error) {
    console.error("Lỗi khi upload image message:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const uploadFileMessage = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const senderId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: "Thiếu file" });
    }

    if (!conversationId) {
      return res.status(400).json({ message: "Thiếu conversationId" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Xác định resource_type cho cloudinary
    const isImage = req.file.mimetype.startsWith("image/");
    const isVideo = req.file.mimetype.startsWith("video/");
    const resourceType = isImage ? "image" : isVideo ? "video" : "raw";

    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      resource_type: resourceType,
      folder: "file-messages",
      use_filename: true,
      unique_filename: true,
    });

    const message = await Message.create({
      conversationId,
      senderId,
      fileUrl: uploadResult.secure_url,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);
    await conversation.save();
    emitNewMessage(io, conversation, message);

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi khi upload file message:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};