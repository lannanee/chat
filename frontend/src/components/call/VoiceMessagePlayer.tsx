import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, Download } from "lucide-react";

interface VoiceMessagePlayerProps {
  voiceUrl: string;
  duration?: number;
  displayName?: string;
}

export const VoiceMessagePlayer = ({
  voiceUrl,
  duration = 0,
  displayName = "Unknown",
}: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Load audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleError = () => {
      setError("Không thể tải âm thanh");
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
        setError("Lỗi khi phát âm thanh");
      });
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = voiceUrl;
    a.download = `voice_message_${displayName}_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
        <Volume2 className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg max-w-sm">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={voiceUrl} preload="metadata" />

      {/* Play button */}
      <Button
        size="icon"
        variant="ghost"
        onClick={handlePlayPause}
        disabled={isLoading}
        className="h-8 w-8 shrink-0"
      >
        {isLoading ? (
          <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Progress bar */}
      <div className="flex-1 flex flex-col gap-1">
        <input
          type="range"
          min="0"
          max={duration || audioRef.current?.duration || 0}
          value={currentTime}
          onChange={handleProgressChange}
          className="w-full h-1 bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || audioRef.current?.duration || 0)}</span>
        </div>
      </div>

      {/* Download button */}
      <Button
        size="icon"
        variant="ghost"
        onClick={handleDownload}
        className="h-8 w-8 shrink-0"
        title="Tải xuống"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};
