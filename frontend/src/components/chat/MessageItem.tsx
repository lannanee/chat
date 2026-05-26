import { cn, formatMessageTime, formatFileSize } from "@/lib/utils";
import type { Conversation, Message, Participant } from "@/types/chat";
import UserAvatar from "./UserAvatar";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { VoiceMessagePlayer } from "@/components/call/VoiceMessagePlayer";
import { FileText, Download, FileImage, FileVideo, FileAudio, File } from "lucide-react";
import { Button } from "../ui/button";

interface MessageItemProps {
  message: Message;
  index: number;
  messages: Message[];
  selectedConvo: Conversation;
  lastMessageStatus: "delivered" | "seen";
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) return <FileImage className="size-5" />;
  if (fileType.startsWith("video/")) return <FileVideo className="size-5" />;
  if (fileType.startsWith("audio/")) return <FileAudio className="size-5" />;
  if (fileType.includes("pdf") || fileType.includes("word") || fileType.includes("text"))
    return <FileText className="size-5" />;
  return <File className="size-5" />;
};

const MessageItem = ({
  message,
  index,
  messages,
  selectedConvo,
  lastMessageStatus,
}: MessageItemProps) => {
  const prev = index + 1 < messages.length ? messages[index + 1] : undefined;

  const isShowTime =
    index === 0 ||
    new Date(message.createdAt).getTime() -
      new Date(prev?.createdAt || 0).getTime() >
      300000;

  const isGroupBreak = isShowTime || message.senderId !== prev?.senderId;

  const participant = selectedConvo.participants.find(
    (p: Participant) => p._id.toString() === message.senderId.toString()
  );

  return (
    <>
      {/* time */}
      {isShowTime && (
        <span className="flex justify-center text-xs text-muted-foreground px-1">
          {formatMessageTime(new Date(message.createdAt))}
        </span>
      )}

      <div
        className={cn(
          "flex gap-2 message-bounce mt-1",
          message.isOwn ? "justify-end" : "justify-start"
        )}
      >
        {/* avatar */}
        {!message.isOwn && (
          <div className="w-8">
            {isGroupBreak && (
              <UserAvatar
                type="chat"
                name={participant?.displayName ?? "Camiu"}
                avatarUrl={participant?.avatarUrl ?? undefined}
              />
            )}
          </div>
        )}

        {/* tin nhắn */}
        <div
          className={cn(
            "max-w-xs lg:max-w-md space-y-1 flex flex-col",
            message.isOwn ? "items-end" : "items-start"
          )}
        >
          {/* Text message */}
          {message.content && !message.voiceUrl && (
            <Card
              className={cn(
                "p-3",
                message.isOwn ? "chat-bubble-sent border-0" : "chat-bubble-received"
              )}
            >
              <p className="text-sm leading-relaxed break-words">{message.content}</p>
            </Card>
          )}

          {/* Voice message */}
          {message.voiceUrl && (
            <div className="p-2">
              <VoiceMessagePlayer
                voiceUrl={message.voiceUrl}
                duration={message.voiceDuration}
                displayName={participant?.displayName ?? "Unknown"}
              />
            </div>
          )}

          {/* Image message */}
          {message.imgUrl && (
            <Card className="overflow-hidden border-0">
              <img
                src={message.imgUrl}
                alt="message"
                className="max-w-xs lg:max-w-md h-auto rounded-lg"
              />
            </Card>
          )}

          {/* File message */}
          {message.fileUrl && (
            <Card
              className={cn(
                "p-3 min-w-[200px]",
                message.isOwn ? "chat-bubble-sent border-0" : "chat-bubble-received"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="text-primary shrink-0">
                  {getFileIcon(message.fileType ?? "")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {message.fileName ?? "File"}
                  </p>
                  {message.fileSize && (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(message.fileSize)}
                    </p>
                  )}
                </div>
                <Button
  variant="ghost"
  size="icon"
  className="size-8 shrink-0"
  onClick={async () => {
    try {
      const response = await fetch(message.fileUrl!);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decodeURIComponent(message.fileName ?? "file");
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(message.fileUrl!, "_blank");
    }
  }}
  title="Tải xuống"
>
  <Download className="size-4" />
</Button>
              </div>
            </Card>
          )}

          {/* seen/delivered */}
          {message.isOwn && message._id === selectedConvo.lastMessage?._id && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-1.5 py-0.5 h-4 border-0",
                lastMessageStatus === "seen"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {lastMessageStatus}
            </Badge>
          )}
        </div>
      </div>
    </>
  );
};

export default MessageItem;