import { useEffect, useState } from "react";
import { useCallStore } from "@/stores/useCallStore";
import { useSocketStore } from "@/stores/useSocketStore";
import UserAvatar from "@/components/chat/UserAvatar";
import { Button } from "@/components/ui/button";
import { PhoneOff } from "lucide-react";

const OutgoingCallOverlay = () => {
  const { activeCall, cleanup } = useCallStore();
  const { socket } = useSocketStore();
  const [duration, setDuration] = useState(0);

  // Timer cho "đang đổ chuông"
  useEffect(() => {
    if (activeCall?.status !== "calling") return;

    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCall?.status]);

  const handleCancel = () => {
    socket?.emit("call:reject", {
      callId: activeCall?.callId,
      reason: "caller_cancelled",
    });
    cleanup();
  };

  if (!activeCall || activeCall.status !== "calling") return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-8">
      {/* Avatar + Animation */}
      <div className="relative">
        {/* Pulse rings */}
        <div className="absolute -inset-4 border-2 border-blue-400 rounded-full animate-pulse" />
        <div className="absolute -inset-8 border-2 border-blue-300 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
        
        <UserAvatar
          type="profile"
          name={activeCall.remoteUser.displayName}
          avatarUrl={activeCall.remoteUser.avatarUrl || undefined}
        />
      </div>

      {/* Tên và trạng thái */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground">
          {activeCall.remoteUser.displayName}
        </h2>
        <p className="text-muted-foreground mt-2">
          {activeCall.callType === "audio" ? "Cuộc gọi thoại" : "Cuộc gọi video"}
        </p>
        <p className="text-sm text-blue-500 mt-2 font-semibold">Đang gọi {formatDuration(duration)}</p>
      </div>

      {/* Nút hủy */}
      <Button
        size="icon"
        variant="destructive"
        className="h-16 w-16 rounded-full"
        onClick={handleCancel}
        title="Hủy cuộc gọi"
      >
        <PhoneOff className="h-6 w-6" />
      </Button>

      {/* Message */}
      <p className="text-muted-foreground text-sm">Chờ trả lời...</p>
    </div>
  );
};

export default OutgoingCallOverlay;
};

export default OutgoingCallOverlay;