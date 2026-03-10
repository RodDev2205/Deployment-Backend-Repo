import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import app from "./src/app.js"; // your Express app
import { createServer } from "http";
import { Server } from "socket.io";
import chatSocket from "./src/socket/chatSocket.js";
import dashboardSocket from "./src/socket/dashboardSocket.js";

// 0️⃣ Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1️⃣ Serve React frontend
// Make sure you build the frontend first (npm run build)
app.use(express.static(path.join(__dirname, "frontend/dist")));

// Catch-all route for React (must come AFTER API routes)
app.use("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/dist/index.html"));
});

// 2️⃣ Create raw HTTP server from Express app
const httpServer = createServer(app);

// 3️⃣ Attach Socket.io
export const io = new Server(httpServer, {
  cors: {
    origin: "*", // Or replace with your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
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