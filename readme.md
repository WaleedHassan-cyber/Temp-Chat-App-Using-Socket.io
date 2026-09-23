<div align="center">

# ✨ Nexus — Realtime Ephemeral Chat

**A calmer, temporary space to talk.** No accounts, no history that follows you forever — just pick a name and start chatting.

Built with **Node.js**, **Express**, **Socket.IO**, and **WebRTC** — a single dependency-light stack, no database required.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-Voice%20%26%20Video-EE6B4D?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

</div>

---

## Why Nexus?

Most chat demos stop at "send a text message." Nexus goes further — it's a full, self-hosted realtime messaging app with **voice notes, image sharing, live voice/video calls, and group chats**, wrapped in a hand-crafted glassmorphism UI. And because every conversation lives only in server memory, it's genuinely **ephemeral by design**: delete a message, clear a whole chat, or just restart the server — nothing sticks around longer than you want it to.

If you're looking for a lightweight reference implementation of Socket.IO + WebRTC done right (rooms, signaling, reconnection handling, presence, typing indicators), this repo is built to be readable and easy to extend.

---

## Features

- 💬 **1:1 and group messaging** — instant delivery over WebSockets, with typing indicators and read receipts
- 🗑️ **Message controls** — delete any message you sent (removed for everyone instantly), or clear an entire conversation in one tap
- 🖼️ **Image sharing with lightbox** — send photos inline, then click to open them full-screen and save them
- 🎙️ **Voice notes** — record, preview, and send voice messages with a live waveform while recording
- 📞 **Voice & video calling** — peer-to-peer WebRTC calls with mute/camera toggle, ringtones, and automatic reconnection handling
- 👥 **Group chats** — create a group, add members, and message everyone in one thread
- 🟢 **Live presence** — see who's online in real time, with automatic list updates on connect/disconnect
- 🌌 **Polished UI** — a dark, glass-panel interface with a Three.js particle login screen, smooth micro-animations, and full mobile responsiveness
- 🔒 **No persistence, no accounts** — everything lives in memory; pick a display name and you're in

---

## Live Preview

> Add a screenshot or GIF of the app here once you have one — recruiters and stargazers judge repos by their README image in the first three seconds.

```
public/Preview.gif
```

---

## Tech Stack

| Layer          | Technology                          |
|----------------|--------------------------------------|
| Server         | Node.js, Express                    |
| Realtime layer | Socket.IO (WebSocket transport)     |
| Calling        | WebRTC (native browser APIs)        |
| Frontend       | Vanilla HTML/CSS/JS (no build step) |
| 3D login scene | Three.js                            |

No frontend framework, no bundler, no database — clone it and run it.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- npm (ships with Node.js)

### Installation

```bash
git clone https://github.com/WaleedHassan-cyber/Temp-Chat-App-Using-Socket.io.git
cd nexus-chat
npm install
```

### Run it

```bash
node index.js
```

Then open **http://localhost:3000** in two different browser tabs (or two devices on the same network) to chat between them.

> Voice and video calls require microphone/camera permissions, which most browsers only grant over `https://` or `http://localhost`. Calling over a plain HTTP connection to a remote IP will likely be blocked by the browser.

---

## Project Structure

```
.
├── server.js          # Express + Socket.IO server: users, messages, groups, call signaling
├── public/
│   └── index.html     # Entire frontend — UI, styles, and client-side logic
└── package.json
```

Everything the client needs lives in a single `index.html` on purpose — it makes the whole app easy to read top to bottom and easy to fork.

---

## How It Works

- **Presence & rooms** — every connected socket joins a room named after its username, so private messages and calls can be routed with a simple `io.to(username).emit(...)`.
- **Messages** — private and group messages are kept in in-memory objects (`privateMessages`, `groups`), keyed by a sorted `sender_receiver` pair for 1:1 chats. Each message gets a unique ID so it can be targeted for deletion later.
- **Deletion is a first-class feature, not an afterthought** — since Nexus is meant to be a *temporary* chat, you can delete any message you sent (it disappears from the server and for the other participant instantly) or clear an entire conversation from the chat menu. Deleted data is actually removed from server memory, not just hidden client-side.
- **Calls** — the server never touches call *content*. It's a pure signaling relay for WebRTC offers/answers/ICE candidates; audio and video flow peer-to-peer once the connection is established. The server only tracks *who* is currently in a call, so it can reject a second incoming call and clean up gracefully on disconnect.

---

## Roadmap

- [ ] Optional persistent storage (SQLite/Redis) for teams that want history
- [ ] End-to-end encryption for messages and calls
- [ ] File attachments beyond images
- [ ] Read receipts per group member
- [ ] Dockerfile + one-click deploy (Render/Railway/Fly.io)

Have an idea? Open an issue — contributions and suggestions are very welcome.

---

## Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-thing`)
3. Commit your changes (`git commit -m 'Add amazing thing'`)
4. Push to the branch (`git push origin feature/amazing-thing`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

If Nexus is useful to you, consider giving it a ⭐ — it genuinely helps the project reach more people.

</div>
