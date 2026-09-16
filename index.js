const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();

const server = http.createServer(app);

// maxHttpBufferSize raised so base64 voice/image attachments can pass through
// (default is 1MB, which is too small for a few seconds of audio or a photo)
const io = new Server(server, {
    maxHttpBufferSize: 1e7 // 10 MB
});


// Serve frontend
app.use(express.static(path.resolve("./public")));


// ===============================
// DATA
// ===============================

const users = {};

const privateMessages = {};

const groups = {};

const busyUsers = new Set();

const activeCallPartner = {};


// ===============================
// SOCKET CONNECTION
// ===============================

io.on("connection", (socket) => {

    console.log("User connected:", socket.id);


    // =================================
    // USER JOIN
    // =================================

    socket.on("join", (username) => {
        socket.username = username;
        users[username] = socket.id;
        // Every user gets their own room
        socket.join(username);
        console.log(`${username} joined`);
        // Send online users to everyone
        io.emit("users list", Object.keys(users));
        // Send groups belonging to this user
        sendUserGroups(username);
    });


    // =================================
    // PRIVATE MESSAGE
    // =================================
    // "message" now doubles as the standard text body, and also carries the
    // optional fields the UI sends for voice notes and image attachments:
    //   type      -> "text" (default), "voice", or "image"
    //   audio     -> base64 data URL, only present when type === "voice"
    //   duration  -> "m:ss" string, only present when type === "voice"
    //   image     -> base64 data URL, only present when type === "image"

    socket.on("chat message", ({ sender, receiver, message, type, audio, duration, image }) => {

        const chatId = [sender, receiver]
            .sort()
            .join("_");


        const newMessage = {
            sender,
            receiver,
            message: message || "",
            type: type || "text",
            time: new Date().toLocaleTimeString()
        };

        if (audio) newMessage.audio = audio;
        if (duration) newMessage.duration = duration;
        if (image) newMessage.image = image;


        // Create chat history
        if (!privateMessages[chatId]) {

            privateMessages[chatId] = [];
        }


        // Save message
        privateMessages[chatId].push(newMessage);


        // Send message only to receiver
        io.to(receiver).emit("message", newMessage);


        // Also send message back to sender
        socket.emit("message", newMessage);
    });


    // =================================
    // TYPING INDICATOR (private chat)
    // =================================

    socket.on("typing", ({ sender, receiver }) => {

        if (!receiver) {

            return;
        }

        io.to(receiver).emit("typing", { sender });
    });


    // =================================
    // GET PRIVATE CHAT HISTORY
    // =================================

    socket.on("get messages", ({ sender, receiver }) => {

        const chatId = [sender, receiver]
            .sort()
            .join("_");


        const history = privateMessages[chatId] || [];

        socket.emit("chat history", history);
    });


    // =================================
    // CREATE GROUP
    // =================================

    socket.on("create group", ({ groupName, members }) => {

        if (!groupName || !members || members.length === 0) {

            return;
        }


        // Prevent duplicate group name
        if (groups[groupName]) {

            socket.emit("group error", "Group already exists.");

            return;
        }


        // Create group
        groups[groupName] = {

            name: groupName,

            members: members,

            messages: []
        };


        console.log("Group created:", groupName);


        // Add all members to Socket.IO room
        members.forEach((username) => {

            const userSocketId = users[username];

            if (userSocketId) {

                const userSocket = io.sockets.sockets.get(userSocketId);

                if (userSocket) {

                    userSocket.join(groupName);
                }
            }
        });


        // Send updated groups to every member
        members.forEach((username) => {

            sendUserGroups(username);
        });
    });


    // =================================
    // GET GROUP HISTORY
    // =================================

    socket.on("get group messages", (groupName) => {

        const group = groups[groupName];


        if (!group) {

            return;
        }


        // Check whether user is member
        if (!group.members.includes(socket.username)) {

            return;
        }


        socket.emit("group history", {

            groupName,

            messages: group.messages
        });
    });


    // =================================
    // GROUP MESSAGE
    // =================================
    // Same type/audio/duration/image pass-through as private messages above.

    socket.on("group message", ({ groupName, message, type, audio, duration, image }) => {

        const group = groups[groupName];


        if (!group) {

            return;
        }


        // Only members can send messages
        if (!group.members.includes(socket.username)) {

            return;
        }


        const newMessage = {

            groupName,

            sender: socket.username,

            message: message || "",

            type: type || "text",

            time: new Date().toLocaleTimeString()
        };

        if (audio) newMessage.audio = audio;
        if (duration) newMessage.duration = duration;
        if (image) newMessage.image = image;


        // Save message
        group.messages.push(newMessage);


        // Send only to group room
        io.to(groupName).emit("group message", newMessage);
    });


    // =================================
    // CALL SIGNALING (1:1 only)
    // =================================
    // The server never looks at SDP/ICE contents — it just relays the
    // payload to the target username's room via io.to(username), the same
    // pattern already used for chat messages. It only tracks *who* is in
    // a call (busyUsers / activeCallPartner) so it can reject a second
    // incoming call and clean up on disconnect.

    socket.on("call:invite", ({ from, to, isVideo }) => {

        if (!users[to]) {
            // Callee is offline
            socket.emit("call:unavailable", { to });
            return;
        }

        if (busyUsers.has(to)) {
            // Callee is already in another call
            socket.emit("call:busy", { to });
            return;
        }

        io.to(to).emit("call:incoming", { from, isVideo });
    });

    socket.on("call:accept", ({ from, to }) => {

        // Mark both parties busy now that the callee has accepted
        busyUsers.add(from);
        busyUsers.add(to);
        activeCallPartner[from] = to;
        activeCallPartner[to] = from;

        io.to(to).emit("call:accepted", { from });
    });

    socket.on("call:decline", ({ from, to }) => {

        io.to(to).emit("call:declined", { from });
    });

    socket.on("call:cancel", ({ from, to }) => {

        // Caller hung up before the callee answered
        io.to(to).emit("call:cancelled", { from });
    });

    socket.on("call:offer", ({ from, to, sdp }) => {

        io.to(to).emit("call:offer", { from, sdp });
    });

    socket.on("call:answer", ({ from, to, sdp }) => {

        io.to(to).emit("call:answer", { from, sdp });
    });

    socket.on("call:ice-candidate", ({ from, to, candidate }) => {

        io.to(to).emit("call:ice-candidate", { from, candidate });
    });

    socket.on("call:end", ({ from, to }) => {

        io.to(to).emit("call:ended", { from });

        // Clear busy state for both parties
        busyUsers.delete(from);
        busyUsers.delete(to);
        delete activeCallPartner[from];
        delete activeCallPartner[to];
    });


    // =================================
    // DISCONNECT
    // =================================

    socket.on("disconnect", () => {

        const username = socket.username;


        if (!username) {

            return;
        }


        delete users[username];


        console.log(`${username} disconnected`);


        // If this user was in an active call, let their partner know so
        // the partner's UI doesn't hang waiting for a response.
        if (busyUsers.has(username)) {

            const partner = activeCallPartner[username];

            if (partner) {

                io.to(partner).emit("call:ended", { from: username });

                busyUsers.delete(partner);
                delete activeCallPartner[partner];
            }

            busyUsers.delete(username);
            delete activeCallPartner[username];
        }


        // Update online users
        io.emit("users list", Object.keys(users));
    });

});


// =================================
// SEND USER GROUPS
// =================================

function sendUserGroups(username) {

    const userGroups = Object.values(groups)
        .filter((group) => group.members.includes(username))
        .map((group) => ({
            name: group.name,

            members: group.members
        }));


    const userSocketId = users[username];


    if (!userSocketId) {

        return;
    }


    io.to(userSocketId).emit("groups list", userGroups);
}


// =================================
// HOME ROUTE
// =================================

app.get("/", (req, res) => {

    res.sendFile(
        path.resolve("./public/index.html")
    );
});


// =================================
// SERVER
// =================================

server.listen(3000, () => {

    console.log("Server running on http://localhost:3000");
});