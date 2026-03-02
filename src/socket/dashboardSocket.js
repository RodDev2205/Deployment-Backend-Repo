// src/socket/dashboardSocket.js
export default function dashboardSocket(io) {
  io.on("connection", (socket) => {
    console.log("Dashboard client connected:", socket.id);

    socket.on("joinBranchRoom", ({ branch_id }) => {
      socket.join(`branch_${branch_id}`);
      console.log(`Joined branch_${branch_id}`);
    });

    socket.on("disconnect", () => {
      console.log("Dashboard client disconnected:", socket.id);
    });
  });
}