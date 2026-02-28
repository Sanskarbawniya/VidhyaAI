/**
 * Socket.io configuration for VidyaAI
 * Real-time study rooms, collaborative Q&A
 */

module.exports = (io) => {
  const rooms = new Map(); // roomId -> { users, messages }

  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    // Join a study room
    socket.on('join-room', ({ roomId, userName, subject }) => {
      socket.join(roomId);
      if (!rooms.has(roomId)) rooms.set(roomId, { users: new Map(), messages: [] });
      rooms.get(roomId).users.set(socket.id, { userName, subject });

      const userList = [...rooms.get(roomId).users.values()];
      io.to(roomId).emit('room-update', { users: userList, event: 'joined', who: userName });
      socket.emit('room-history', { messages: rooms.get(roomId).messages.slice(-20) });
      console.log(`📚 ${userName} joined room ${roomId}`);
    });

    // Live question in room
    socket.on('ask-question', ({ roomId, question, userName }) => {
      const msg = { type: 'question', question, userName, timestamp: new Date() };
      rooms.get(roomId)?.messages.push(msg);
      io.to(roomId).emit('new-question', msg);
    });

    // Answer in room
    socket.on('answer', ({ roomId, answer, userName, questionId }) => {
      const msg = { type: 'answer', answer, userName, questionId, timestamp: new Date() };
      rooms.get(roomId)?.messages.push(msg);
      io.to(roomId).emit('new-answer', msg);
    });

    // Typing indicator
    socket.on('typing', ({ roomId, userName }) => {
      socket.to(roomId).emit('user-typing', { userName });
    });

    // Disconnect
    socket.on('disconnect', () => {
      rooms.forEach((room, roomId) => {
        if (room.users.has(socket.id)) {
          const { userName } = room.users.get(socket.id);
          room.users.delete(socket.id);
          const userList = [...room.users.values()];
          io.to(roomId).emit('room-update', { users: userList, event: 'left', who: userName });
          if (room.users.size === 0) rooms.delete(roomId);
        }
      });
      console.log('🔌 Socket disconnected:', socket.id);
    });
  });
};
