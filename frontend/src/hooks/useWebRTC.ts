import { useEffect, useRef, useCallback } from "react";
import { useCallStore } from "@/stores/useCallStore";
import { useSocketStore } from "@/stores/useSocketStore";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

export function useWebRTC() {
  const { socket } = useSocketStore();
  const {
    activeCall,
    setLocalStream,
    setRemoteStream,
    setPeerConnection,
    cleanup,
  } = useCallStore();

  const pcRef = useRef<RTCPeerConnection | null>(null);

  const getLocalStream = useCallback(
    async (isVideo: boolean = false) => {
      const constraints = {
        audio: true,
        video: isVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      return stream;
    },
    [setLocalStream]
  );

  const createPeerConnection = useCallback(
    (targetUserId: string, callId: string, stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      setPeerConnection(pc);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        console.log("Remote track received:", event.track.kind);
        setRemoteStream(event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("webrtc:ice", {
            callId,
            targetUserId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("WebRTC connection state:", pc.connectionState);
        if (pc.connectionState === "failed") {
          console.error("WebRTC connection failed");
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState);
      };

      return pc;
    },
    [socket, setRemoteStream, setPeerConnection]
  );

  const createOffer = useCallback(
    async (targetUserId: string, callId: string) => {
      const isVideo = activeCall?.callType === "video";
      const stream = await getLocalStream(isVideo);
      const pc = createPeerConnection(targetUserId, callId, stream);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      await pc.setLocalDescription(offer);

      socket?.emit("webrtc:offer", { callId, targetUserId, offer });
    },
    [socket, activeCall?.callType, getLocalStream, createPeerConnection]
  );

  useEffect(() => {
    if (!socket) return;

    const handleOffer = async ({
      fromUserId,
      callId,
      offer,
    }: {
      fromUserId: string;
      callId: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      try {
        const isVideo = activeCall?.callType === "video";
        const stream = await getLocalStream(isVideo);
        const pc = createPeerConnection(fromUserId, callId, stream);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo,
        });
        await pc.setLocalDescription(answer);

        socket.emit("webrtc:answer", {
          callId,
          targetUserId: fromUserId,
          answer,
        });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    };

    const handleAnswer = async ({
      answer,
    }: {
      answer: RTCSessionDescriptionInit;
    }) => {
      try {
        await pcRef.current?.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    };

    const handleIce = async ({
      candidate,
    }: {
      candidate: RTCIceCandidateInit;
    }) => {
      try {
        if (candidate) {
          await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    };

    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice", handleIce);

    return () => {
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:ice", handleIce);
    };
  }, [socket, activeCall?.callType, getLocalStream, createPeerConnection]);

  return { createOffer, getLocalStream, cleanup };
}