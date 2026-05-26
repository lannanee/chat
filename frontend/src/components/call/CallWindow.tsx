import { useEffect, useRef, useState } from "react";
import { useCallStore } from "@/stores/useCallStore";
import { useSocketStore } from "@/stores/useSocketStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWebRTC } from "@/hooks/useWebRTC";
import UserAvatar from "@/components/chat/UserAvatar";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

const CallWindow = () => {
  const {
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    toggleMute,
    toggleVideo,
    cleanup,
  } = useCallStore();
  const { socket } = useSocketStore();
  const { user } = useAuthStore();
  const { createOffer } = useWebRTC();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState("00:00");

  // Gắn local stream vào video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Gắn remote stream vào video/audio element
  useEffect(() => {
    if (activeCall?.callType === "video" && remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    } else if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall?.callType]);

  // Khi status chuyển sang "active", người gọi tạo WebRTC offer
  useEffect(() => {
  if (
    activeCall?.status === "active" &&
    activeCall.caller._id === user?._id &&
    activeCall.callId // ← đảm bảo có callId thật
  ) {
    createOffer(activeCall.remoteUser._id, activeCall.callId);
    setCallStartTime(Date.now());
  }
}, [activeCall?.status, activeCall?.callId]); // ← thêm callId vào deps

  // Tính toán thời lượng cuộc gọi
  useEffect(() => {
    if (!callStartTime || activeCall?.status !== "active") return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setCallDuration(
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [callStartTime, activeCall?.status]);

  const handleEndCall = () => {
    socket?.emit("call:end", { callId: activeCall?.callId });
    cleanup();
    setCallStartTime(null);
  };

  if (!activeCall || activeCall.status !== "active") return null;

  const isVideoCall = activeCall.callType === "video";

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
      {/* Audio element ẩn — phát âm thanh từ đầu kia (chỉ audio call) */}
      {!isVideoCall && <audio ref={remoteAudioRef} autoPlay playsInline />}

      {/* VIDEO CALL LAYOUT */}
      {isVideoCall ? (
        <div className="w-full h-full flex relative">
          {/* Remote video — toàn màn hình */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local video — góc nhỏ */}
          <div className="absolute bottom-4 right-4 w-24 h-32 bg-gray-900 rounded-lg overflow-hidden border-2 border-white shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Thông tin cuộc gọi */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-white text-center">
            <h2 className="text-xl font-semibold">
              {activeCall.remoteUser.displayName}
            </h2>
            <p className="text-sm text-gray-300">{callDuration}</p>
          </div>

          {/* Thanh điều khiển */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
            {/* Tắt/Bật Mic */}
            <Button
              size="icon"
              variant="outline"
              className={`h-14 w-14 rounded-full ${
                isMuted ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={toggleMute}
              title={isMuted ? "Bật mic" : "Tắt mic"}
            >
              {isMuted ? (
                <MicOff className="h-6 w-6 text-white" />
              ) : (
                <Mic className="h-6 w-6 text-white" />
              )}
            </Button>

            {/* Tắt/Bật Camera */}
            <Button
              size="icon"
              variant="outline"
              className={`h-14 w-14 rounded-full ${
                !isVideoEnabled ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={toggleVideo}
              title={isVideoEnabled ? "Tắt camera" : "Bật camera"}
            >
              {isVideoEnabled ? (
                <Video className="h-6 w-6 text-white" />
              ) : (
                <VideoOff className="h-6 w-6 text-white" />
              )}
            </Button>

            {/* Kết thúc cuộc gọi */}
            <Button
              size="icon"
              variant="destructive"
              className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700"
              onClick={handleEndCall}
              title="Kết thúc cuộc gọi"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      ) : (
        /* AUDIO CALL LAYOUT */
        <div className="flex flex-col items-center justify-center gap-8">
          {/* Avatar đối phương */}
          <div className="relative">
            <UserAvatar
              type="profile"
              name={activeCall.remoteUser.displayName}
              avatarUrl={activeCall.remoteUser.avatarUrl || undefined}
            />
            {remoteStream && (
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>

          {/* Tên và thời lượng */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-foreground">
              {activeCall.remoteUser.displayName}
            </h2>
            <p className="text-muted-foreground mt-1">{callDuration}</p>
          </div>

          {/* Thanh điều khiển */}
          <div className="flex items-center gap-6">
            {/* Tắt/Bật Mic */}
            <Button
              size="icon"
              variant="outline"
              className="h-14 w-14 rounded-full"
              onClick={toggleMute}
              title={isMuted ? "Bật mic" : "Tắt mic"}
            >
              {isMuted ? (
                <MicOff className="h-5 w-5 text-red-500" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>

            {/* Kết thúc cuộc gọi */}
            <Button
              size="icon"
              variant="destructive"
              className="h-16 w-16 rounded-full"
              onClick={handleEndCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallWindow;