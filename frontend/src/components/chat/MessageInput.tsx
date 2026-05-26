import { useAuthStore } from "@/stores/useAuthStore";
import type { Conversation } from "@/types/chat";
import { useState } from "react";
import { Button } from "../ui/button";
import { ImagePlus, Send, Mic } from "lucide-react";
import { Input } from "../ui/input";
import EmojiPicker from "./EmojiPicker";
import { useChatStore } from "@/stores/useChatStore";
import { toast } from "sonner";
import { VoiceMessageRecorder } from "@/components/call/VoiceMessageRecorder";
import axios from "@/lib/axios";

const MessageInput = ({ selectedConvo }: { selectedConvo: Conversation }) => {
  const { user } = useAuthStore();
  const { sendDirectMessage, sendGroupMessage } = useChatStore();
  const [value, setValue] = useState("");
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  if (!user) return;

  const sendMessage = async () => {
    if (!value.trim()) return;
    const currValue = value;
    setValue("");

    try {
      if (selectedConvo.type === "direct") {
        const participants = selectedConvo.participants;
        const otherUser = participants.filter((p) => p._id !== user._id)[0];
        await sendDirectMessage(otherUser._id, currValue);
      } else {
        await sendGroupMessage(selectedConvo._id, currValue);
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi xảy ra khi gửi tin nhắn. Bạn hãy thử lại!");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    try {
      setUploadingVoice(true);

      // Upload file
      const formData = new FormData();
      formData.append("file", audioBlob, "voice-message.webm");
      formData.append("duration", duration.toString());

      const uploadResponse = await axios.post("/messages/upload-voice", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { voiceUrl } = uploadResponse.data;

      // Send message with voice URL
      if (selectedConvo.type === "direct") {
        const participants = selectedConvo.participants;
        const otherUser = participants.filter((p) => p._id !== user._id)[0];
        
        // Using a custom send function to include voice
        await axios.post("/messages/send-voice", {
          conversationId: selectedConvo._id,
          voiceUrl,
          voiceDuration: duration,
        });
      } else {
        await axios.post("/messages/send-voice", {
          conversationId: selectedConvo._id,
          voiceUrl,
          voiceDuration: duration,
        });
      }

      toast.success("Tin nhắn thoại đã gửi!");
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error("Error sending voice:", error);
      toast.error("Lỗi khi gửi tin nhắn thoại. Vui lòng thử lại!");
    } finally {
      setUploadingVoice(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 min-h-[56px] bg-background border-t">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/10 transition-smooth"
        >
          <ImagePlus className="size-4" />
        </Button>

        {/* Voice Message Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
          disabled={uploadingVoice}
          className="hover:bg-primary/10 transition-smooth"
          title="Ghi âm tin nhắn thoại"
        >
          <Mic className="size-4" />
        </Button>

        <div className="flex-1 relative">
          <Input
            onKeyPress={handleKeyPress}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Soạn tin nhắn..."
            className="pr-20 h-9 bg-white border-border/50 focus:border-primary/50 transition-smooth resize-none"
            disabled={uploadingVoice}
          ></Input>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-primary/10 transition-smooth"
              disabled={uploadingVoice}
            >
              <div>
                <EmojiPicker
                  onChange={(emoji: string) => setValue(`${value}${emoji}`)}
                />
              </div>
            </Button>
          </div>
        </div>

        <Button
          onClick={sendMessage}
          className="bg-gradient-chat hover:shadow-glow transition-smooth hover:scale-105"
          disabled={!value.trim() || uploadingVoice}
        >
          <Send className="size-4 text-white" />
        </Button>
      </div>

      {/* Voice Message Recorder */}
      <VoiceMessageRecorder
        isOpen={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onSend={handleVoiceSend}
      />
    </>
  );
};

export default MessageInput;
