import { useAuthStore } from "@/stores/useAuthStore";
import type { Conversation } from "@/types/chat";
import { useState, useRef } from "react";
import { Button } from "../ui/button";
import { ImagePlus, Send, Mic, Loader2 } from "lucide-react";
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const formData = new FormData();
      formData.append("file", audioBlob, "voice-message.webm");
      formData.append("duration", duration.toString());
      formData.append("conversationId", selectedConvo._id);

      await axios.post("/messages/upload-voice", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Tin nhắn thoại đã gửi!");
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error("Error sending voice:", error);
      toast.error("Lỗi khi gửi tin nhắn thoại. Vui lòng thử lại!");
    } finally {
      setUploadingVoice(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ hỗ trợ file ảnh!");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 5MB!");
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", selectedConvo._id);

      await axios.post("/messages/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Ảnh đã gửi!");
    } catch (error) {
      console.error("Error sending image:", error);
      toast.error("Lỗi khi gửi ảnh. Vui lòng thử lại!");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 min-h-[56px] bg-background border-t">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        {/* Image button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage || uploadingVoice}
          className="hover:bg-primary/10 transition-smooth"
          title="Gửi ảnh"
        >
          {uploadingImage ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
        </Button>

        {/* Voice Message Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
          disabled={uploadingVoice || uploadingImage}
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
            disabled={uploadingVoice || uploadingImage}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-primary/10 transition-smooth"
              disabled={uploadingVoice || uploadingImage}
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
          disabled={!value.trim() || uploadingVoice || uploadingImage}
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