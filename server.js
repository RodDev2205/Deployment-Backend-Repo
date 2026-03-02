import app from './src/app.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import chatSocket from './src/socket/chatSocket.js';
import dashboardSocket from './src/socket/dashboardSocket.js';
const PORT = process.env.PORT || 5200;

// 1️⃣ Create raw HTTP server from Express app
const httpServer = createServer(app);

// 2️⃣ Attach Socket.io
export const io = new Server(httpServer, {
  cors: {
    origin: '*', // Replace with your frontend URL
  },
});

// 3️⃣ Initialize chat socket logic
chatSocket(io);
dashboardSocket(io);

// 4️⃣ Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
