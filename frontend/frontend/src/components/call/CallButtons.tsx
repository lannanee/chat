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

  const initiateCall = async (callType: "voice" | "video") => {
    if (status !== "idle") return;
    const caller = { userId: user._id, displayName: user.displayName, avatarUrl: user.avatarUrl ?? null };
    const callee = { userId: otherUser._id, displayName: otherUser.displayName, avatarUrl: otherUser.avatarUrl ?? null };
    await startCall(callType, callee, chat._id, caller);
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" disabled={status !== "idle"} onClick={() => initiateCall("voice")}>
        <Phone className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" disabled={status !== "idle"} onClick={() => initiateCall("video")}>
        <Video className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default CallButtons;