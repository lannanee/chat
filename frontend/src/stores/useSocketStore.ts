import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "./useAuthStore";
import type { SocketState } from "@/types/store";
import { useChatStore } from "./useChatStore";
import { useCallStore } from "./useCallStore";

const baseURL = import.meta.env.VITE_SOCKET_URL;

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  onlineUsers: [],
  connectSocket: () => {
    const accessToken = useAuthStore.getState().accessToken;
    const existingSocket = get().socket;

    if (existingSocket) return; // tránh tạo nhiều socket

    const socket: Socket = io(baseURL, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });

    set({ socket });

    socket.on("connect", () => {
      console.log("Đã kết nối với socket");
    });

    // ─ ONLINE USERS ─
    socket.on("online-users", (userIds) => {
      set({ onlineUsers: userIds });
    });

    // ─ NEW MESSAGE ─
    socket.on("new-message", ({ message, conversation, unreadCounts }) => {
      useChatStore.getState().addMessage(message);

      const lastMessage = {
        _id: conversation.lastMessage._id,
        content: conversation.lastMessage.content,
        createdAt: conversation.lastMessage.createdAt,
        sender: {
          _id: conversation.lastMessage.senderId,
          displayName: "",
          avatarUrl: null,
        },
      };

      const updatedConversation = {
        ...conversation,
        lastMessage,
        unreadCounts,
      };

      if (useChatStore.getState().activeConversationId === message.conversationId) {
        useChatStore.getState().markAsSeen();
      }

      useChatStore.getState().updateConversation(updatedConversation);
    });

    // ─ READ MESSAGE ─
    socket.on("read-message", ({ conversation, lastMessage }) => {
      const updated = {
        _id: conversation._id,
        lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadCounts: conversation.unreadCounts,
        seenBy: conversation.seenBy,
      };

      useChatStore.getState().updateConversation(updated);
    });

    // ─ NEW GROUP CHAT ─
    socket.on("new-group", (conversation) => {
      try {
        useChatStore.getState().addConvo(conversation);
        socket.emit("join-conversation", conversation._id);
        console.log("New group chat received:", conversation._id);
      } catch (error) {
        console.error("Error handling new-group event:", error);
      }
    });

    // ─ GROUP DELETED ─
    socket.on("group-deleted", ({ conversationId }) => {
      try {
        const chatStore = useChatStore.getState();
        chatStore.set = (updater: any) => {
          updater((state: any) => ({
            conversations: state.conversations.filter(
              (c: any) => c._id !== conversationId
            ),
            activeConversationId:
              state.activeConversationId === conversationId
                ? null
                : state.activeConversationId,
          }));
        };

        const state = chatStore;
        if (state.activeConversationId === conversationId) {
          // Cleanup handled by the store filter above
        }

        console.log("Group chat deleted:", conversationId);
      } catch (error) {
        console.error("Error handling group-deleted event:", error);
      }
    });

    // ═════════════════════════════════════════════════════════════
    // ─ CALL EVENTS (VOICE CALL / VIDEO CALL) ─
    // ═════════════════════════════════════════════════════════════

    // ─ INCOMING CALL ─
    socket.on("call:incoming", ({ callId, callType, conversationId, caller }) => {
      try {
        const callStore = useCallStore.getState();
        const newCall = {
          callId,
          callType,
          conversationId,
          status: "incoming" as const,
          caller,
          remoteUser: caller,
          startedAt: Date.now(),
        };
        callStore.setActiveCall(newCall);
        console.log("Cuộc gọi đến:", callId, callType);
      } catch (error) {
        console.error("Error handling call:incoming:", error);
      }
    });

    // ─ CALL ACCEPTED ─
    socket.on("call:accepted", ({ callId, acceptedBy }) => {
      try {
        const callStore = useCallStore.getState();
        const currentCall = callStore.activeCall;
        if (currentCall && currentCall.callId === callId) {
          callStore.setActiveCall({
            ...currentCall,
            status: "active",
            remoteUser: acceptedBy,
          });
          console.log("Cuộc gọi được chấp nhận:", callId);
        }
      } catch (error) {
        console.error("Error handling call:accepted:", error);
      }
    });

    // ─ CALL ENDED ─
    socket.on("call:ended", ({ callId, reason }) => {
      try {
        const callStore = useCallStore.getState();
        const currentCall = callStore.activeCall;
        if (currentCall && currentCall.callId === callId) {
          console.log("Cuộc gọi kết thúc:", callId, reason);
          callStore.cleanup();
        }
      } catch (error) {
        console.error("Error handling call:ended:", error);
      }
    });

    // ─ CALL ERROR ─
    socket.on("call:error", ({ message }) => {
      console.error("Lỗi cuộc gọi:", message);
      const callStore = useCallStore.getState();
      callStore.cleanup();
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));
