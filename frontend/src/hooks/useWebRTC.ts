import { useEffect, useRef, useCallback } from "react";
import { useCallStore } from "@/stores/useCallStore";
import { useSocketStore } from "@/stores/useSocketStore";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:standard.relay.metered.ca:80",
      username: "5b455190fd5198e265a2f942",
      credential: "WJX+ZamElojFB8Xw",
    },
    {
      urls: "turn:standard.relay.metered.ca:80?transport=tcp",
      username: "5b455190fd5198e265a2f942",
      credential: "WJX+ZamElojFB8Xw",
    },
    {
      urls: "turn:standard.relay.metered.ca:443",
      username: "5b455190fd5198e265a2f942",
      credential: "WJX+ZamElojFB8Xw",
    },
    {
      urls: "turns:standard.relay.metered.ca:443?transport=tcp",
      username: "5b455190fd5198e265a2f942",
      credential: "WJX+ZamElojFB8Xw",
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

  // FIX 1: dùng ref để tránh stale closure trong socket event handlers
  const activeCallRef = useRef(activeCall);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // FIX 2: queue ICE candidates nhận trước khi setRemoteDescription xong
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const getLocalStream = useCallback(
    async (isVideo: boolean = false) => {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
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
      // FIX 3: đóng PC cũ trước khi tạo mới, tránh leak
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      setPeerConnection(pc);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        console.log("[WebRTC] ontrack:", event.track.kind, event.streams);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
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
        console.log("[WebRTC] connectionState:", pc.connectionState);
        if (pc.connectionState === "failed") {
          console.error("[WebRTC] Connection failed — kiểm tra TURN server");
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] iceConnectionState:", pc.iceConnectionState);
      };

      return pc;
    },
    [socket, setRemoteStream, setPeerConnection]
  );

  const createOffer = useCallback(
    async (targetUserId: string, callId: string) => {
      // FIX 4: đọc callType từ ref, không từ closure có thể stale
      const isVideo = activeCallRef.current?.callType === "video";
      const stream = await getLocalStream(isVideo);
      const pc = createPeerConnection(targetUserId, callId, stream);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      await pc.setLocalDescription(offer);

      socket?.emit("webrtc:offer", { callId, targetUserId, offer });
    },
    [socket, getLocalStream, createPeerConnection]
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
        // FIX 5: đọc callType từ ref — tránh stale closure
        const isVideo = activeCallRef.current?.callType === "video";
        const stream = await getLocalStream(isVideo);
        const pc = createPeerConnection(fromUserId, callId, stream);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // FIX 6: flush ICE candidates đã queue trước đó
        for (const candidate of iceCandidateQueue.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        iceCandidateQueue.current = [];

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
        console.error("[WebRTC] Error handling offer:", error);
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

        // FIX 7: flush ICE candidates queue sau khi setRemoteDescription
        for (const candidate of iceCandidateQueue.current) {
          await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
        }
        iceCandidateQueue.current = [];
      } catch (error) {
        console.error("[WebRTC] Error handling answer:", error);
      }
    };

    const handleIce = async ({
      candidate,
    }: {
      candidate: RTCIceCandidateInit;
    }) => {
      if (!candidate) return;
      try {
        if (!pcRef.current || !pcRef.current.remoteDescription) {
          // FIX 8: queue lại thay vì bỏ qua — tránh race condition
          iceCandidateQueue.current.push(candidate);
          return;
        }
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("[WebRTC] Error adding ICE candidate:", error);
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
  }, [socket, getLocalStream, createPeerConnection]);

  return { createOffer, getLocalStream, cleanup };
}