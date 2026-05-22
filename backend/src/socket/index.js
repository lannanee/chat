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

io.on("connection", async (socket) => {
  const user = socket.user;

  // console.log(`${user.displayName} online với socket ${socket.id}`);

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

  socket.on("disconnect", () => {
    onlineUsers.delete(user._id.toString());
    io.emit("online-users", Array.from(onlineUsers.keys()));
    /* console.log(`socket disconnected: ${socket.id}`); */
  });
});

export { io, app, server };
