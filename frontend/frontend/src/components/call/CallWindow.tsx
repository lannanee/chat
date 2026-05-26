import { useEffect, useRef } from "react";
import { useCallStore } from "@/stores/useCallStore";
import { useSocketStore } from "@/stores/useSocketStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWebRTC } from "@/hooks/useWebRTC";
import UserAvatar from "@/components/chat/UserAvatar";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff } from "lucide-react";

const CallWindow = () => {
  const {
    activeCall,
    remoteStream,
    isMuted,
    toggleMute,
    cleanup,
  } = useCallStore();
  const { socket } = useSocketStore();
  const { user } = useAuthStore();
  const { createOffer } = useWebRTC();

  // Ref để gắn remote audio stream
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Gắn remote stream vào thẻ <audio> mỗi khi stream thay đổi
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Khi status chuyển sang "active" VÀ mình là người gọi → tạo WebRTC offer
  useEffect(() => {
    if (
      activeCall?.status === "active" &&
      activeCall.caller._id === user?._id  // chỉ người GỌI mới tạo offer
    ) {
      createOffer(activeCall.remoteUser._id, activeCall.callId);
    }
  }, [activeCall?.status]);

  const handleEndCall = () => {
    socket?.emit("call:end", { callId: activeCall?.callId });
    cleanup();
  };

  // Chỉ render khi đang active
  if (!activeCall || activeCall.status !== "active") return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-8">
      {/* Audio element ẩn — phát âm thanh từ đầu kia */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Avatar đối phương */}
      <div className="relative">
        <UserAvatar
          type="profile"
          name={activeCall.remoteUser.displayName}
          avatarUrl={activeCall.remoteUser.avatarUrl || undefined}
        />
        {/* Chấm xanh nếu đã nghe thấy tiếng */}
        {remoteStream && (
          <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>

      {/* Tên và trạng thái */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground">
          {activeCall.remoteUser.displayName}
        </h2>
        <p className="text-muted-foreground mt-1">
          {remoteStream ? "Đang kết nối..." : "Đã kết nối"}
        </p>
      </div>

      {/* Thanh điều khiển */}
      <div className="flex items-center gap-6">
        {/* Nút Tắt/Bật mic */}
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

        {/* Nút Kết thúc cuộc gọi */}
        <Button
          size="icon"
          variant="destructive"
          className="h-16 w-16 rounded-full"
          onClick={handleEndCall}
          title="Kết thúc cuộc gọi"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default CallWindow;