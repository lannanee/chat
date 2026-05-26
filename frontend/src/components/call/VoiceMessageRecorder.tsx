import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, X } from "lucide-react";

interface VoiceMessageRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const VoiceMessageRecorder = ({
  onSend,
  isOpen = false,
  onClose,
}: VoiceMessageRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Khởi động ghi âm
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        
        // Dừng tất cả audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  // Dừng ghi âm
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Gửi ghi âm
  const handleSend = () => {
    if (recordedBlob) {
      onSend(recordedBlob, duration);
      resetRecorder();
      onClose?.();
    }
  };

  // Reset
  const resetRecorder = () => {
    setRecordedBlob(null);
    setDuration(0);
    setIsRecording(false);
    chunksRef.current = [];
  };

  // Hủy
  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    resetRecorder();
    onClose?.();
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-900 rounded-lg shadow-xl p-4 border border-gray-200 dark:border-gray-700 w-80">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Ghi âm tin nhắn</h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleCancel}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Waveform / Status */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded p-4 text-center">
          {isRecording ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1 h-6 bg-red-500 rounded animate-pulse" />
                <div className="w-1 h-8 bg-red-500 rounded animate-pulse" />
                <div className="w-1 h-5 bg-red-500 rounded animate-pulse" />
              </div>
              <p className="text-sm text-red-500 font-semibold">Đang ghi âm...</p>
              <p className="text-sm text-gray-500">{formatTime(duration)}</p>
            </div>
          ) : recordedBlob ? (
            <div className="flex flex-col items-center gap-2">
              <Mic className="h-6 w-6 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Thời lượng: {formatTime(duration)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nhấn "Ghi âm" để bắt đầu</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
          >
            Hủy
          </Button>

          {!recordedBlob ? (
            <Button
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              className={isRecording ? "bg-red-500 hover:bg-red-600 flex-1" : "flex-1"}
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Dừng
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Ghi âm
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSend}
              className="bg-green-500 hover:bg-green-600 flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              Gửi
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
