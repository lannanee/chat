import { useCallStore } from "@/stores/useCallStore";
import { useSocketStore } from "@/stores/useSocketStore";
import UserAvatar from "@/components/chat/UserAvatar";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const IncomingCallBanner = () => {
  const { activeCall, setActiveCall, cleanup } = useCallStore();
  const { socket } = useSocketStore();

  // Chỉ hiển thị khi đang có cuộc gọi đến chưa bắt máy
  if (!activeCall || (activeCall.status !== "incoming" && activeCall.status !== "calling")) {
    return null;
  }

  const handleAccept = () => {
    // Báo server biết mình đã accept
    socket?.emit("call:accept", { callId: activeCall.callId });
    // Cập nhật status trong store → sẽ trigger CallWindow hiển thị
    setActiveCall({ ...activeCall, status: "active" });
  };

  const handleReject = () => {
    // Báo server biết mình từ chối
    socket?.emit("call:reject", {
      callId: activeCall.callId,
      reason: "rejected",
    });
    // Dọn dẹp state
    cleanup();
  };

  const isIncoming = activeCall.status === "incoming";
  const isCalling = activeCall.status === "calling";

  return (
    <div className="fixed top-4 right-4 z-50 bg-background border border-border rounded-xl shadow-xl p-4 flex items-center gap-3 w-80 animate-in slide-in-from-top-2">
      {/* Avatar người gọi */}
      <UserAvatar
        type="sidebar"
        name={activeCall.caller.displayName}
        avatarUrl={activeCall.caller.avatarUrl || undefined}
      />

      {/* Thông tin */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">
          {activeCall.caller.displayName}
        </p>
        <p className="text-sm text-muted-foreground">
          {activeCall.callType === "audio" ? "Cuộc gọi thoại" : "Cuộc gọi video"}
        </p>
        {isCalling && (
          <p className="text-xs text-yellow-600 mt-1">Đang đổ chuông...</p>
        )}
      </div>

      {/* Nút điều khiển */}
      <div className="flex gap-2 shrink-0">
        {isIncoming && (
          <>
            {/* Nút từ chối */}
            <Button
              size="icon"
              variant="destructive"
              className="rounded-full"
              onClick={handleReject}
              title="Từ chối"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>

            {/* Nút bắt máy */}
            <Button
              size="icon"
              className="rounded-full bg-green-500 hover:bg-green-600 text-white"
              onClick={handleAccept}
              title="Bắt máy"
            >
              <Phone className="h-4 w-4" />
            </Button>
          </>
        )}

        {isCalling && (
          <Button
            size="icon"
            variant="destructive"
            className="rounded-full"
            onClick={handleReject}
            title="Hủy cuộc gọi"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default IncomingCallBanner;