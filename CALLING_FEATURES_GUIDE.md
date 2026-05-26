# Hướng Dẫn Tích Hợp 3 Tính Năng Gọi Điện, Gọi Video và Chat Voice

Các tính năng này đã được hoàn thiện với cấu trúc thư mục và tệp được cập nhật.

## 📋 Tổng Quan

### 1. **Gọi Điện (Voice Call)** ☎️

- Gọi âm thanh trực tiếp qua WebRTC
- Hỗ trợ tắt/bật microphone
- Hiển thị thời lượng cuộc gọi

### 2. **Gọi Video (Video Call)** 📹

- Gọi video HD qua WebRTC
- Hỗ trợ tắt/bật camera
- Bố cục: video từ xa toàn màn hình, video cục bộ góc nhỏ
- Hỗ trợ tắt/bật microphone

### 3. **Chat Voice (Voice Message)** 🎤

- Ghi âm tin nhắn thoại
- Phát lại tin nhắn thoại
- Tải xuống tệp âm thanh

---

## 🏗️ Cấu Trúc Thư Mục

```
frontend/
├── src/
│   ├── types/
│   │   ├── call.ts (✓ Cập nhật)
│   │   ├── chat.ts (✓ Cập nhật)
│   │   └── store.ts (✓ Cập nhật)
│   ├── hooks/
│   │   └── useWebRTC.ts (✓ Hoàn thiện)
│   ├── stores/
│   │   ├── useCallStore.ts (✓ Hoàn thiện)
│   │   └── useSocketStore.ts (✓ Cập nhật socket handlers)
│   └── components/
│       └── call/
│           ├── CallWindow.tsx (✓ Hoàn thiện cho video)
│           ├── CallButtons.tsx (✓ Cập nhật)
│           ├── IncomingCallBanner.tsx (✓ Cập nhật)
│           ├── VoiceMessageRecorder.tsx (✨ MỚI)
│           └── VoiceMessagePlayer.tsx (✨ MỚI)

backend/
├── src/
│   └── socket/
│       └── index.js (✓ Hoàn thiện handlers)
```

---

## 🚀 Cách Tích Hợp

### **Bước 1: Thêm CallWindow, IncomingCallBanner, CallButtons vào Layout**

Trong tệp layout chính của bạn (ví dụ: `App.tsx` hoặc `ChatAppPage.tsx`):

```tsx
import CallWindow from "@/components/call/CallWindow";
import IncomingCallBanner from "@/components/call/IncomingCallBanner";
import CallButtons from "@/components/call/CallButtons";
import OutgoingCallOverlay from "@/components/call/OutgoingCallOverlay";

export default function App() {
  return (
    <div className="app">
      {/* Các component khác */}

      {/* Thêm các component gọi */}
      <CallWindow />
      <IncomingCallBanner />
      <OutgoingCallOverlay />
    </div>
  );
}
```

### **Bước 2: Thêm CallButtons vào Header của Chat**

Trong component chat header (ví dụ: `ChatAppPage.tsx`):

```tsx
import CallButtons from "@/components/call/CallButtons";

export function ChatHeader({ currentChat }: { currentChat: Conversation }) {
  return (
    <div className="flex items-center justify-between p-4">
      <h2>
        {currentChat.group?.name || currentChat.participants[0]?.displayName}
      </h2>

      {/* Thêm CallButtons ở đây */}
      <CallButtons chat={currentChat} />
    </div>
  );
}
```

### **Bước 3: Tích Hợp Voice Message vào Chat Input**

Trong component input tin nhắn:

```tsx
import { VoiceMessageRecorder } from "@/components/call/VoiceMessageRecorder";
import { VoiceMessagePlayer } from "@/components/call/VoiceMessagePlayer";
import { useState } from "react";

export function ChatInput() {
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    // Upload audioBlob lên server
    const formData = new FormData();
    formData.append("file", audioBlob, "voice-message.webm");
    formData.append("duration", duration.toString());

    try {
      const response = await fetch("/api/upload/voice", {
        method: "POST",
        body: formData,
      });

      const { voiceUrl } = await response.json();

      // Gửi message với voiceUrl
      await sendMessage({
        conversationId: activeConversationId,
        voiceUrl,
        voiceDuration: duration,
      });
    } catch (error) {
      console.error("Error uploading voice:", error);
    }
  };

  return (
    <div className="flex items-center gap-2 p-4 border-t">
      {/* Input text */}
      <input type="text" placeholder="Nhắn tin..." className="flex-1" />

      {/* Voice Message Button */}
      <button
        onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
        className="p-2 rounded-full hover:bg-gray-200"
      >
        🎤
      </button>

      {/* Voice Recorder */}
      <VoiceMessageRecorder
        isOpen={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onSend={handleVoiceSend}
      />
    </div>
  );
}
```

### **Bước 4: Hiển Thị Voice Message trong Chat**

Trong component tin nhắn:

```tsx
import { VoiceMessagePlayer } from "@/components/call/VoiceMessagePlayer";

export function MessageItem({ message }: { message: Message }) {
  return (
    <div className="message">
      {/* Tin nhắn text */}
      {message.content && <p>{message.content}</p>}

      {/* Tin nhắn voice */}
      {message.voiceUrl && (
        <VoiceMessagePlayer
          voiceUrl={message.voiceUrl}
          duration={message.voiceDuration}
          displayName={message.sender?.displayName}
        />
      )}

      {/* Ảnh */}
      {message.imgUrl && <img src={message.imgUrl} alt="message" />}
    </div>
  );
}
```

---

## 🔧 Backend Setup

### **1. Cập nhật Message Model (nếu cần)**

```javascript
// backend/src/models/Message.js
const messageSchema = new Schema({
  conversationId: ObjectId,
  senderId: ObjectId,
  content: String,
  imgUrl: String,
  voiceUrl: String, // ✨ Mới
  voiceDuration: Number, // ✨ Mới (ms)
  createdAt: Date,
  updatedAt: Date,
});
```

### **2. Tạo Route Upload Voice Message**

```javascript
// backend/src/routes/messageRoute.js
import multer from "multer";
import path from "path";

const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/voices/",
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["audio/webm", "audio/wav", "audio/mp3"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid audio format"));
    }
  },
});

router.post("/upload-voice", upload.single("file"), (req, res) => {
  try {
    const voiceUrl = `/uploads/voices/${req.file.filename}`;
    const duration = req.body.duration;

    res.json({
      voiceUrl,
      duration: parseInt(duration),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **3. Serve Static Files**

```javascript
// backend/src/server.js
app.use("/uploads", express.static("uploads"));
```

---

## 🎯 Hướng Dẫn Sử Dụng

### **Gọi Điện**

1. Mở chat với một người
2. Nhấn nút 📞 (Phone icon) trong header
3. Người kia sẽ nhận thông báo gọi đến
4. Nhấn ✓ để bắt máy hoặc ✗ để từ chối
5. Cuộc gọi sẽ bắt đầu
6. Sử dụng nút 🔇 để tắt/bật microphone
7. Nhấn 📞 để kết thúc cuộc gọi

### **Gọi Video**

1. Mở chat với một người
2. Nhấn nút 📹 (Video icon) trong header
3. Người kia sẽ nhận thông báo gọi video
4. Nhấn ✓ để bắt máy hoặc ✗ để từ chối
5. Cuộc gọi video sẽ bắt đầu (full-screen + local video góc nhỏ)
6. Sử dụng nút 🔇 để tắt/bật microphone, 📹 để tắt/bật camera
7. Nhấn 📞 để kết thúc cuộc gọi

### **Chat Voice (Voice Message)**

1. Trong input tin nhắn, nhấn nút 🎤
2. Popup ghi âm sẽ hiển thị
3. Nhấn "Ghi âm" để bắt đầu ghi
4. Nhấn "Dừng" khi xong
5. Nhấn "Gửi" để gửi tin nhắn thoại
6. Người nhận sẽ thấy player âm thanh
7. Nhấn ▶️ để phát, ⏸ để tạm dừng
8. Sử dụng thanh progress để tua video
9. Nhấn ⬇️ để tải xuống

---

## 📝 Các Thay Đổi Chính

### **Types (TypeScript)**

- ✓ `CallType`: "audio" | "video"
- ✓ `CallStatus`: "idle" | "calling" | "incoming" | "active" | "ended"
- ✓ `VoiceMessage`: interface mới cho tin nhắn thoại
- ✓ `CallState`: thêm `toggleVideo`, `startCall`, etc.

### **Hooks**

- ✓ `useWebRTC`: Hỗ trợ cả audio và video
- ✓ Error handling và logging

### **Stores**

- ✓ `useCallStore`: Thêm `startCall`, `toggleVideo`, `isVideoEnabled`
- ✓ `useSocketStore`: Thêm call event handlers

### **Components**

- ✓ `CallWindow`: Hỗ trợ video display + call timer
- ✓ `CallButtons`: Cập nhật callback
- ✓ `IncomingCallBanner`: Hỗ trợ calling status
- ✨ `VoiceMessageRecorder`: Ghi âm tin nhắn
- ✨ `VoiceMessagePlayer`: Phát lại tin nhắn thoại

### **Backend**

- ✓ `socket/index.js`: Hoàn thiện handlers, logging

---

## ⚠️ Yêu Cầu Trình Duyệt

- ✓ WebRTC API (Chrome, Firefox, Safari, Edge)
- ✓ getUserMedia API (cho microphone & camera)
- ✓ MediaRecorder API (cho ghi âm)

### **HTTPS**

- Tất cả tính năng media yêu cầu **HTTPS** trong production
- Localhost được hỗ trợ cho development

---

## 🐛 Troubleshooting

### **Không thể gọi?**

1. Kiểm tra socket kết nối: `console.log(socket.connected)`
2. Kiểm tra quyền microphone/camera
3. Kiểm tra CORS setting

### **Không thể phát video?**

1. Kiểm tra permissions trong trình duyệt
2. Đảm bảo HTTPS đang sử dụng
3. Kiểm tra network connection

### **Ghi âm không hoạt động?**

1. Kiểm tra quyền microphone
2. Kiểm tra MIME type hỗ trợ (audio/webm, audio/wav, etc.)
3. Kiểm tra browser compatibility

---

## 📱 Production Deployment

### **1. TURN Server Setup** (cho NAT traversal)

```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:your-turn-server.com",
      username: "user",
      credential: "pass",
    },
  ],
};
```

### **2. Audio/Video Compression**

- Sử dụng codec H.264 cho video
- Sử dụng codec Opus cho audio

### **3. SSL Certificate**

- Bắt buộc HTTPS
- Sử dụng Let's Encrypt hoặc CloudFlare

---

## 📊 Testing Checklist

- [ ] Gọi điện giữa 2 người (audio only)
- [ ] Gọi video giữa 2 người
- [ ] Tắt/bật microphone
- [ ] Tắt/bật camera
- [ ] Ghi âm tin nhắn thoại
- [ ] Phát lại tin nhắn thoại
- [ ] Tải xuống file âm thanh
- [ ] Network disconnect handling
- [ ] Mobile responsiveness
- [ ] Browser compatibility (Chrome, Firefox, Safari)

---

## 🎉 Hoàn Thiện!

Tất cả 3 tính năng đã được hoàn thiện và sẵn sàng sử dụng.
Vui lòng làm theo hướng dẫn tích hợp ở trên để bắt đầu!
