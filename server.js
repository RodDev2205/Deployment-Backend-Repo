import express from "express";
import path from "path";
import app from "./src/app.js"; // your Express app
import { createServer } from "http";
import { Server } from "socket.io";
import chatSocket from "./src/socket/chatSocket.js";
import dashboardSocket from "./src/socket/dashboardSocket.js";

// 1️⃣ Serve React frontend (before creating httpServer)
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "frontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/dist/index.html"));
});

// 2️⃣ Create raw HTTP server from Express app
const httpServer = createServer(app);

// 3️⃣ Attach Socket.io
export const io = new Server(httpServer, {
  cors: {
    origin: "*", // Or restrict to your frontend URL
  },
});

// 4️⃣ Initialize Socket logic
chatSocket(io);
dashboardSocket(io);

// 5️⃣ Start server
const PORT = process.env.PORT || 5200;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});