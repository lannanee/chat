# 🚀 Quick Reference - Gọi Điện, Gọi Video & Chat Voice

## ⚡ 30-Second Setup

### 1. **Add to Main App Component**

```tsx
// App.tsx or ChatAppPage.tsx
import CallWindow from "@/components/call/CallWindow";
import IncomingCallBanner from "@/components/call/IncomingCallBanner";
import OutgoingCallOverlay from "@/components/call/OutgoingCallOverlay";

export default function App() {
  return (
    <>
      {/* Your app */}
      <CallWindow />
      <IncomingCallBanner />
      <OutgoingCallOverlay />
    </>
  );
}
```

### 2. **Add Call Buttons to Chat Header**

```tsx
import CallButtons from "@/components/call/CallButtons";

<header>
  <CallButtons chat={activeConversation} />
</header>;
```

### 3. **Add Voice Message to Input**

```tsx
import { VoiceMessageRecorder } from "@/components/call/VoiceMessageRecorder";
import { useState } from "react";

const [showRecorder, setShowRecorder] = useState(false);

<VoiceMessageRecorder
  isOpen={showRecorder}
  onClose={() => setShowRecorder(false)}
  onSend={(blob, duration) => uploadAndSendVoice(blob, duration)}
/>;
```

### 4. **Display Voice Messages**

```tsx
import { VoiceMessagePlayer } from "@/components/call/VoiceMessagePlayer";

{
  message.voiceUrl && (
    <VoiceMessagePlayer
      voiceUrl={message.voiceUrl}
      duration={message.voiceDuration}
    />
  );
}
```

---

## 📁 File Tree

```
✅ IMPLEMENTED
├── Types
│   ├── call.ts (CallType, CallStatus, ActiveCall, VoiceMessage)
│   ├── chat.ts (Message with voiceUrl, voiceDuration)
│   └── store.ts (CallState with all methods)
├── Hooks
│   └── useWebRTC.ts (Full WebRTC implementation)
├── Stores
│   ├── useCallStore.ts (startCall, toggleVideo, etc.)
│   └── useSocketStore.ts (Call event handlers)
├── Components
│   ├── CallWindow.tsx (Audio + Video support)
│   ├── CallButtons.tsx (Phone & Video icons)
│   ├── IncomingCallBanner.tsx (Incoming call UI)
│   ├── OutgoingCallOverlay.tsx (Calling UI)
│   ├── VoiceMessageRecorder.tsx (Record voice)
│   └── VoiceMessagePlayer.tsx (Play voice)
└── Backend
    └── socket/index.js (Full call handling)
```

---

## 🎯 Features Checklist

### Voice Call ☎️

- [x] Initiate call
- [x] Receive incoming call
- [x] Accept/Reject
- [x] Mute/Unmute microphone
- [x] Call duration timer
- [x] End call
- [x] Network error handling

### Video Call 📹

- [x] Initiate video call
- [x] Receive video call
- [x] Accept/Reject
- [x] Full-screen remote video
- [x] Local PiP (Picture-in-Picture)
- [x] Mute/Unmute microphone
- [x] Turn on/off camera
- [x] Call duration timer
- [x] End call

### Voice Message 🎤

- [x] Start recording
- [x] Stop recording
- [x] Real-time timer
- [x] Waveform animation
- [x] Send voice message
- [x] Play/Pause audio
- [x] Progress bar
- [x] Download audio
- [x] Display duration

---

## 🔧 Key Functions

### Initiate Call

```typescript
const { startCall } = useCallStore();

// Audio call
await startCall("audio", { userId, displayName, avatarUrl }, conversationId, {
  userId,
  displayName,
  avatarUrl,
});

// Video call
await startCall("video", { userId, displayName, avatarUrl }, conversationId, {
  userId,
  displayName,
  avatarUrl,
});
```

### Toggle Mute/Video

```typescript
const { toggleMute, toggleVideo } = useCallStore();

toggleMute(); // Mute/unmute
toggleVideo(); // Turn camera on/off
```

### Send Voice Message

```typescript
const handleVoiceSend = async (blob: Blob, duration: number) => {
  const formData = new FormData();
  formData.append("file", blob);
  formData.append("duration", duration);

  const res = await axios.post("/api/messages/upload-voice", formData);

  // Send message with voiceUrl
  await axios.post("/api/messages/send-voice", {
    conversationId,
    voiceUrl: res.data.voiceUrl,
    voiceDuration: duration,
  });
};
```

---

## 🎮 User Flow

### **Calling Flow**

```
User A                          Server                      User B
  ↓                               ↓                            ↓
Click Phone/Video              store callId
  ↓                               ↓
emit call:initiate          ────→  ─────→ emit call:incoming
                                        (show banner)
                                           ↓
                                    User B clicks accept
                                           ↓
                                  emit call:accept ←────
                                           ↓
emit call:accepted ←────                   ↓
   ↓                               (update call status)
WebRTC Offer ─────────────────────────────→
   ↓                               (relay)
WebRTC Answer ←─────────────────────────────
   ↓
Audio/Video Connected
```

### **Voice Message Flow**

```
User A
  ↓
Click 🎤
  ↓
Record voice
  ↓
Click Send
  ↓
Upload blob to server
  ↓
Receive voiceUrl
  ↓
Send message with voiceUrl
  ↓
Socket broadcast
  ↓
User B receives
  ↓
VoiceMessagePlayer renders
  ↓
User B clicks Play
```

---

## 📞 Socket Events Reference

| Event           | Direction       | Payload                                     |
| --------------- | --------------- | ------------------------------------------- |
| `call:initiate` | Client → Server | `{conversationId, callType, targetUserIds}` |
| `call:incoming` | Server → Client | `{callId, callType, caller}`                |
| `call:accept`   | Client → Server | `{callId}`                                  |
| `call:accepted` | Server → Client | `{callId, acceptedBy}`                      |
| `call:reject`   | Client → Server | `{callId, reason}`                          |
| `call:end`      | Client → Server | `{callId}`                                  |
| `call:ended`    | Server → Client | `{callId, reason}`                          |
| `webrtc:offer`  | Client ↔ Server | `{callId, targetUserId, offer}`             |
| `webrtc:answer` | Client ↔ Server | `{callId, targetUserId, answer}`            |
| `webrtc:ice`    | Client ↔ Server | `{callId, targetUserId, candidate}`         |

---

## 🐛 Debug Tips

### Check WebRTC Connection

```javascript
// In console during a call
const { peerConnection } = useCallStore.getState();
console.log(peerConnection.connectionState); // 'connected'
console.log(peerConnection.iceConnectionState); // 'connected'
console.log(peerConnection.iceGatheringState); // 'complete'
```

### Monitor Socket Events

```javascript
const { socket } = useSocketStore.getState();
socket.onAny((event, ...args) => {
  console.log(event, args);
});
```

### Check Stream Tracks

```javascript
const { localStream, remoteStream } = useCallStore.getState();
console.log(localStream?.getTracks()); // Audio/Video tracks
console.log(remoteStream?.getTracks()); // Received tracks
```

---

## 📊 Permissions Required

```javascript
// Browser permissions needed
navigator.mediaDevices.getUserMedia({
  audio: true, // Microphone
  video: true, // Camera (video call only)
});
```

**Chrome/Edge/Firefox:** User will see permission popup
**Safari:** May need manual permission in Settings → Websites → Microphone/Camera

---

## ✅ Testing Matrix

| Feature       | Chrome | Firefox | Safari | Edge |
| ------------- | ------ | ------- | ------ | ---- |
| Voice Call    | ✅     | ✅      | ✅     | ✅   |
| Video Call    | ✅     | ✅      | ✅     | ✅   |
| Voice Message | ✅     | ✅      | ✅     | ✅   |
| Screen Share  | ✅     | ⚠️      | ❌     | ✅   |

---

## 🎨 Component Props

### `CallButtons`

```tsx
<CallButtons chat={Conversation} />
```

### `VoiceMessageRecorder`

```tsx
<VoiceMessageRecorder
  isOpen={boolean}
  onClose={() => void}
  onSend={(blob: Blob, duration: number) => void}
/>
```

### `VoiceMessagePlayer`

```tsx
<VoiceMessagePlayer voiceUrl={string} duration={number} displayName={string} />
```

---

## 🚨 Common Errors

| Error               | Cause                    | Fix                            |
| ------------------- | ------------------------ | ------------------------------ |
| "NotAllowedError"   | Permission denied        | Grant microphone/camera access |
| "NotFoundError"     | No microphone/camera     | Check hardware connection      |
| "NotSupportedError" | Browser doesn't support  | Use modern browser             |
| "NetworkError"      | WebRTC connection failed | Check TURN server config       |
| "CORS Error"        | Cross-origin blocked     | Update CORS settings           |

---

## 📚 File References

| File                       | Purpose         | Lines |
| -------------------------- | --------------- | ----- |
| `useWebRTC.ts`             | WebRTC logic    | 200+  |
| `useCallStore.ts`          | Call state      | 80+   |
| `useSocketStore.ts`        | Socket events   | 150+  |
| `CallWindow.tsx`           | Call UI         | 180+  |
| `VoiceMessageRecorder.tsx` | Voice recording | 120+  |
| `VoiceMessagePlayer.tsx`   | Voice playback  | 100+  |

---

## 🎓 Learning Resources

1. **WebRTC Basics** → `frontend/src/hooks/useWebRTC.ts`
2. **State Management** → `frontend/src/stores/useCallStore.ts`
3. **Real-time Events** → `frontend/src/stores/useSocketStore.ts`
4. **Backend Signalling** → `backend/src/socket/index.js`

---

## 📞 Quick Links

- 📖 Full Guide: `./CALLING_FEATURES_GUIDE.md`
- ✅ Implementation Status: `./IMPLEMENTATION_COMPLETE.md`
- 🔌 API Reference: `./BACKEND_API_REFERENCE.md`
- 🎨 Component Code: `./frontend/src/components/call/`
- 🔧 Store Code: `./frontend/src/stores/`

---

**Last Updated:** January 2024
**Status:** 🟢 Production Ready

Enjoy your new calling features! 🎉
