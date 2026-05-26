import { Server } from "socket.io";
import http from "http";
import express from "express";
import { socketAuthMiddleware } from "../middlewares/socketMiddleware.js";
import { getUserConversationsForSocketIO } from "../controllers/conversationController.js";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

const onlineUsers = new Map(); // {userId: socketId}
const activeCalls = new Map(); // {callId: { callId, callType, conversationId, initiatorId, participants[] }}

io.on("connection", async (socket) => {
  const user = socket.user;

  console.log(`${user.displayName} kết nối với socket ${socket.id}`);

  onlineUsers.set(user._id.toString(), socket.id);

  io.emit("online-users", Array.from(onlineUsers.keys()));

  try {
    const conversationIds = await getUserConversationsForSocketIO(user._id);
    conversationIds.forEach((id) => {
      socket.join(id.toString());
    });
  } catch (error) {
    console.error("Error joining conversations on connect:", error);
  }

  socket.join(user._id.toString());

  socket.on("join-conversation", (conversationId) => {
    if (conversationId) {
      socket.join(conversationId.toString());
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ─ VOICE CALL / VIDEO CALL: CALL INITIATION ─
  // ═══════════════════════════════════════════════════════════════
  socket.on("call:initiate", ({ conversationId, callType, targetUserIds }) => {
    try {
      const callId = `${conversationId}_${Date.now()}`;

      activeCalls.set(callId, {
        callId,
        callType, // "audio" hoặc "video"
        conversationId,
        initiatorId: user._id.toString(),
        participants: [user._id.toString()],
        startedAt: Date.now(),
      });

      console.log(
        `Cuộc gọi ${callType} khởi tạo: ${callId} từ ${user.displayName}`
      );

      // Gửi thông báo đến từng người nhận
      targetUserIds.forEach((targetUserId) => {
        const targetSocketId = onlineUsers.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("call:incoming", {
            callId,
            callType,
            conversationId,
            caller: {
              _id: user._id,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl ?? null,
            },
          });
          console.log(
            `Gửi call:incoming đến ${targetUserId} (socket: ${targetSocketId})`
          );
        }
      });

      socket.emit("call:initiated", { callId });
    } catch (error) {
      console.error("Error in call:initiate:", error);
      socket.emit("call:error", { message: "Failed to initiate call" });
    }
  });

  // ─ VOICE CALL / VIDEO CALL: ACCEPT CALL ─
  socket.on("call:accept", ({ callId }) => {
    try {
      const call = activeCalls.get(callId);
      if (!call) {
        console.warn(`Call ${callId} not found`);
        return;
      }

      call.participants.push(user._id.toString());
      console.log(
        `Người dùng ${user.displayName} đã chấp nhận cuộc gọi ${callId}`
      );

      // Báo cho người gọi rằng cuộc gọi đã được chấp nhận
      const initiatorSocketId = onlineUsers.get(call.initiatorId);
      if (initiatorSocketId) {
        io.to(initiatorSocketId).emit("call:accepted", {
          callId,
          acceptedBy: {
            _id: user._id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl ?? null,
          },
        });
        console.log(`Gửi call:accepted đến initiator: ${call.initiatorId}`);
      }

      // Cập nhật status cho người nhận
      socket.emit("call:accepted", {
        callId,
        acceptedBy: {
          _id: user._id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl ?? null,
        },
      });
    } catch (error) {
      console.error("Error in call:accept:", error);
    }
  });

  // ─ VOICE CALL / VIDEO CALL: REJECT/DECLINE CALL ─
  socket.on("call:reject", ({ callId, reason }) => {
    try {
      const call = activeCalls.get(callId);
      if (!call) {
        console.warn(`Call ${callId} not found for rejection`);
        return;
      }

      console.log(`Cuộc gọi ${callId} bị từ chối: ${reason}`);

      // Thông báo cho tất cả các participant
      const notifyIds = [...new Set([...call.participants, call.initiatorId])];
      notifyIds.forEach((uid) => {
        const sid = onlineUsers.get(uid);
        if (sid) {
          io.to(sid).emit("call:ended", {
            callId,
            reason: reason || "rejected",
          });
        }
      });

      activeCalls.delete(callId);
    } catch (error) {
      console.error("Error in call:reject:", error);
    }
  });

  // ─ VOICE CALL / VIDEO CALL: END CALL ─
  socket.on("call:end", ({ callId }) => {
    try {
      const call = activeCalls.get(callId);
      if (!call) {
        console.warn(`Call ${callId} not found for ending`);
        return;
      }

      console.log(`Cuộc gọi ${callId} đã kết thúc`);

      const notifyIds = [...new Set([...call.participants, call.initiatorId])];
      notifyIds.forEach((uid) => {
        const sid = onlineUsers.get(uid);
        if (sid) {
          io.to(sid).emit("call:ended", {
            callId,
            reason: "ended",
          });
        }
      });

      activeCalls.delete(callId);
    } catch (error) {
      console.error("Error in call:end:", error);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ─ WEBRTC SIGNALLING ─
  // ═══════════════════════════════════════════════════════════════

  // ─ RELAY WEBRTC OFFER ─
  socket.on("webrtc:offer", ({ callId, targetUserId, offer }) => {
    try {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc:offer", {
          callId,
          fromUserId: user._id.toString(),
          offer,
        });
        console.log(`Relay offer từ ${user.displayName} đến ${targetUserId}`);
      }
    } catch (error) {
      console.error("Error in webrtc:offer:", error);
    }
  });

  // ─ RELAY WEBRTC ANSWER ─
  socket.on("webrtc:answer", ({ callId, targetUserId, answer }) => {
    try {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc:answer", {
          callId,
          fromUserId: user._id.toString(),
          answer,
        });
        console.log(`Relay answer từ ${user.displayName} đến ${targetUserId}`);
      }
    } catch (error) {
      console.error("Error in webrtc:answer:", error);
    }
  });

  // ─ RELAY ICE CANDIDATES ─
  socket.on("webrtc:ice", ({ callId, targetUserId, candidate }) => {
    try {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc:ice", {
          callId,
          fromUserId: user._id.toString(),
          candidate,
        });
      }
    } catch (error) {
      console.error("Error in webrtc:ice:", error);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // ─ MESSAGING ─
  // ═══════════════════════════════════════════════════════════════

  socket.on("send-message", ({ conversationId, message }) => {
    const messages = useChatStore.getState().messages;
    messages[conversationId]?.items.push(message);

    io.to(conversationId).emit("new-message", {
      conversationId,
      message,
    });
  });

  // ─ DISCONNECT ─
  socket.on("disconnect", () => {
    console.log(`${user.displayName} ngắt kết nối`);
    onlineUsers.delete(user._id.toString());
    io.emit("online-users", Array.from(onlineUsers.keys()));

    // Kết thúc tất cả cuộc gọi của user này
    activeCalls.forEach((call, callId) => {
      if (
        call.initiatorId === user._id.toString() ||
        call.participants.includes(user._id.toString())
      ) {
        const notifyIds = [...new Set([...call.participants, call.initiatorId])];
        notifyIds.forEach((uid) => {
          const sid = onlineUsers.get(uid);
          if (sid) {
            io.to(sid).emit("call:ended", {
              callId,
              reason: "disconnected",
            });
          }
        });
        activeCalls.delete(callId);
      }
    });
  });
});

export { io, app, server };
