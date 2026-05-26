# Backend API Reference - Voice Message & Call Logs

## 🎤 Voice Message Upload Endpoint

### `POST /api/messages/upload-voice`

Upload a voice message file to the server.

**Request:**

```http
POST /api/messages/upload-voice HTTP/1.1
Host: api.example.com
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <audio_blob>
duration: 45000
conversationId: 507f1f77bcf86cd799439011
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| file | File | ✓ | Audio file (webm, wav, mp3) |
| duration | number | ✓ | Duration in milliseconds |
| conversationId | string | ✓ | Conversation ID |

**Response (200 OK):**

```json
{
  "success": true,
  "voiceUrl": "/uploads/voices/1705264800000-voice.webm",
  "duration": 45000,
  "message": "Voice message uploaded successfully"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Invalid audio format"
}
```

---

## 💬 Send Voice Message Endpoint

### `POST /api/messages/send-voice`

Send a voice message in a conversation.

**Request:**

```http
POST /api/messages/send-voice HTTP/1.1
Host: api.example.com
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "507f1f77bcf86cd799439011",
  "voiceUrl": "/uploads/voices/1705264800000-voice.webm",
  "voiceDuration": 45000
}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| conversationId | string | ✓ | Target conversation |
| voiceUrl | string | ✓ | URL of uploaded voice file |
| voiceDuration | number | ✓ | Duration in milliseconds |

**Response (201 Created):**

```json
{
  "success": true,
  "message": {
    "_id": "507f1f77bcf86cd799439012",
    "conversationId": "507f1f77bcf86cd799439011",
    "senderId": "507f1f77bcf86cd799439013",
    "voiceUrl": "/uploads/voices/1705264800000-voice.webm",
    "voiceDuration": 45000,
    "createdAt": "2024-01-15T10:20:30.000Z"
  }
}
```

---

## 📞 Call Logs Endpoint (Optional)

### `POST /api/calls/log`

Log a completed call for statistics.

**Request:**

```http
POST /api/calls/log HTTP/1.1
Host: api.example.com
Authorization: Bearer <token>
Content-Type: application/json

{
  "callId": "conv_123_1705264800000",
  "conversationId": "507f1f77bcf86cd799439011",
  "callType": "video",
  "duration": 300,
  "participants": ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"],
  "status": "completed"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "callLog": {
    "_id": "507f1f77bcf86cd799439015",
    "callId": "conv_123_1705264800000",
    "conversationId": "507f1f77bcf86cd799439011",
    "callType": "video",
    "duration": 300,
    "participants": ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"],
    "status": "completed",
    "startedAt": "2024-01-15T10:15:00.000Z",
    "endedAt": "2024-01-15T10:20:00.000Z"
  }
}
```

---

## 🗑️ Delete Voice Message

### `DELETE /api/messages/:messageId/voice`

Delete a voice message and its file.

**Request:**

```http
DELETE /api/messages/507f1f77bcf86cd799439012/voice HTTP/1.1
Host: api.example.com
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Voice message deleted successfully"
}
```

---

## 📥 Backend Implementation Example

### `backend/src/routes/messageRoute.js`

```javascript
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Message from "../models/Message.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Configure multer for voice uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/voices/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.originalname}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ["audio/webm", "audio/wav", "audio/mpeg", "audio/mp4"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid audio format. Allowed: webm, wav, mp3, mp4"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// ─ Upload voice message file ─
router.post(
  "/upload-voice",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { duration } = req.body;

      if (!duration || isNaN(duration)) {
        return res.status(400).json({ error: "Invalid duration" });
      }

      const voiceUrl = `/uploads/voices/${req.file.filename}`;

      res.json({
        success: true,
        voiceUrl,
        duration: parseInt(duration),
        message: "Voice uploaded successfully",
      });
    } catch (error) {
      console.error("Voice upload error:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// ─ Send voice message ─
router.post("/send-voice", authMiddleware, async (req, res) => {
  try {
    const { conversationId, voiceUrl, voiceDuration } = req.body;

    if (!conversationId || !voiceUrl || !voiceDuration) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const message = new Message({
      conversationId,
      senderId: req.user._id,
      voiceUrl,
      voiceDuration: parseInt(voiceDuration),
    });

    await message.save();

    // Emit socket event
    req.app.get("io").to(conversationId).emit("new-message", {
      conversationId,
      message: message.toObject(),
    });

    res.status(201).json({
      success: true,
      message: message.toObject(),
    });
  } catch (error) {
    console.error("Send voice error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─ Delete voice message ─
router.delete("/:messageId/voice", authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only allow deletion by sender
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Delete file from disk
    if (message.voiceUrl) {
      const filePath = path.join(process.cwd(), "public", message.voiceUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    await Message.findByIdAndDelete(req.params.messageId);

    res.json({ success: true, message: "Voice message deleted" });
  } catch (error) {
    console.error("Delete voice error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### `backend/src/server.js`

```javascript
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
import messageRoute from "./routes/messageRoute.js";
app.use("/api/messages", messageRoute);

export { app };
```

---

## 🎤 Frontend Implementation

### Call Voice Message Upload

```typescript
import axios from "@/lib/axios";

async function sendVoiceMessage(
  conversationId: string,
  audioBlob: Blob,
  duration: number,
) {
  try {
    // Step 1: Upload file
    const formData = new FormData();
    formData.append("file", audioBlob, "voice-message.webm");
    formData.append("duration", duration.toString());

    const uploadResponse = await axios.post(
      "/messages/upload-voice",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );

    const { voiceUrl, duration: uploadedDuration } = uploadResponse.data;

    // Step 2: Send message with voice URL
    const messageResponse = await axios.post("/messages/send-voice", {
      conversationId,
      voiceUrl,
      voiceDuration: uploadedDuration,
    });

    return messageResponse.data;
  } catch (error) {
    console.error("Error sending voice message:", error);
    throw error;
  }
}
```

---

## 🔐 Security Headers (backend/src/server.js)

```javascript
import cors from "cors";
import helmet from "helmet";

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting for uploads
import rateLimit from "express-rate-limit";

const voiceUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 voice uploads per 15 minutes per IP
  message: "Too many voice uploads. Please try again later.",
});

app.post(
  "/api/messages/upload-voice",
  voiceUploadLimiter,
  authMiddleware,
  upload.single("file"),
  ...
);
```

---

## 📊 Environment Setup

### `.env` (Backend)

```
UPLOAD_DIR=./uploads
UPLOAD_URL=/uploads
MAX_VOICE_FILE_SIZE=10485760  # 10MB
VOICE_UPLOAD_PATH=voices
ALLOWED_AUDIO_MIMES=audio/webm,audio/wav,audio/mpeg,audio/mp4
```

### `.env.local` (Frontend)

```
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3001
```

---

## ✅ Testing Checklist

- [ ] Upload voice file successfully
- [ ] Validate file type (only audio)
- [ ] Validate file size limit (10MB)
- [ ] Send voice message to conversation
- [ ] Message appears in real-time via socket
- [ ] Delete voice message by sender only
- [ ] File deleted from disk
- [ ] Error handling for network issues
- [ ] Error handling for permission denied

---

## 📝 Example cURL Commands

### Upload Voice File

```bash
curl -X POST \
  http://localhost:3000/api/messages/upload-voice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@voice-message.webm" \
  -F "duration=45000"
```

### Send Voice Message

```bash
curl -X POST \
  http://localhost:3000/api/messages/send-voice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "507f1f77bcf86cd799439011",
    "voiceUrl": "/uploads/voices/1705264800000-voice.webm",
    "voiceDuration": 45000
  }'
```

### Delete Voice Message

```bash
curl -X DELETE \
  http://localhost:3000/api/messages/507f1f77bcf86cd799439012/voice \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔗 Related Files

- [Frontend Components](../frontend/src/components/call/)
- [Frontend Hooks](../frontend/src/hooks/useWebRTC.ts)
- [Frontend Stores](../frontend/src/stores/useCallStore.ts)
- [Backend Socket](../backend/src/socket/index.js)
- [Backend Message Model](../backend/src/models/Message.js)

---

**Last Updated:** 2024-01-15
**Status:** ✅ Ready for Integration
