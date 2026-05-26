import { create } from "zustand";
import type { CallState } from "@/types/store";
import type { ActiveCall, CallType } from "@/types/call";
import { useSocketStore } from "./useSocketStore";
import { useAuthStore } from "./useAuthStore";

export const useCallStore = create<CallState>((set, get) => ({
  activeCall: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  isMuted: false,
  isVideoEnabled: true,
  status: "idle",
  callDuration: 0,

  setActiveCall: (call: ActiveCall | null) => {
    set({ activeCall: call });
    if (call?.status === "calling" || call?.status === "incoming") {
      set({ status: "calling" });
    } else if (call?.status === "active") {
      set({ status: "active" });
    } else {
      set({ status: "idle" });
    }
  },

  setLocalStream: (stream: MediaStream | null) => set({ localStream: stream }),

  setRemoteStream: (stream: MediaStream | null) =>
    set({ remoteStream: stream }),

  setPeerConnection: (pc: RTCPeerConnection | null) =>
    set({ peerConnection: pc }),

  toggleMute: () => {
    const { localStream, isMuted } = get();
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = isMuted;
    });
    set({ isMuted: !isMuted });
  },

  toggleVideo: () => {
    const { localStream, isVideoEnabled } = get();
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !isVideoEnabled;
    });
    set({ isVideoEnabled: !isVideoEnabled });
  },

  startCall: async (callType: CallType, remoteUser, conversationId, caller) => {
    try {
      const socket = useSocketStore.getState().socket;
      const user = useAuthStore.getState().user;

      if (!socket || !user) return;

      const callId = `${conversationId}_${Date.now()}`;

      // Tạo ActiveCall object
      const newCall: ActiveCall = {
        callId,
        callType,
        conversationId,
        status: "calling",
        caller: {
          _id: caller.userId,
          displayName: caller.displayName,
          avatarUrl: caller.avatarUrl,
        },
        remoteUser: {
          _id: remoteUser.userId,
          displayName: remoteUser.displayName,
          avatarUrl: remoteUser.avatarUrl,
        },
        startedAt: Date.now(),
      };

      set({ activeCall: newCall, status: "calling" });

      // Gửi signal call:initiate đến server
      socket.emit("call:initiate", {
        conversationId,
        callType,
        targetUserIds: [remoteUser.userId],
      });
    } catch (error) {
      console.error("Error starting call:", error);
      set({ status: "idle" });
    }
  },

  cleanup: () => {
    const { localStream, peerConnection } = get();
    localStream?.getTracks().forEach((track) => track.stop());
    peerConnection?.close();
    set({
      activeCall: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      isMuted: false,
      isVideoEnabled: true,
      status: "idle",
      callDuration: 0,
    });
  },
}));