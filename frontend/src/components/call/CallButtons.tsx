import { Phone, Video } from "lucide-react";
import { useCallStore } from "@/stores/useCallStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Conversation } from "@/types/chat";
import { Button } from "@/components/ui/button";

interface CallButtonsProps {
  chat: Conversation;
}

const CallButtons = ({ chat }: CallButtonsProps) => {
  const { startCall, status } = useCallStore();
  const { user } = useAuthStore();

  if (!user || chat.type !== "direct") return null;

  const otherUser = chat.participants.find((p) => p._id !== user._id);
  if (!otherUser) return null;

  const initiateCall = async (callType: "audio" | "video") => {
    if (status !== "idle") return;

    const caller = {
      userId: user._id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
    };
    const remoteUser = {
      userId: otherUser._id,
      displayName: otherUser.displayName,
      avatarUrl: otherUser.avatarUrl ?? null,
    };

    try {
      await startCall(callType, remoteUser, chat._id, caller);
    } catch (error) {
      console.error("Failed to start call:", error);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        disabled={status !== "idle"}
        onClick={() => initiateCall("audio")}
        title="Cuộc gọi thoại"
      >
        <Phone className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={status !== "idle"}
        onClick={() => initiateCall("video")}
        title="Cuộc gọi video"
      >
        <Video className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default CallButtons;