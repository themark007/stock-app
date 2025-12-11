// src/sockets/index.js
export default function setupSockets(io) {
  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on('join-stocks', (payload) => {
      if (!payload || !Array.isArray(payload.tickers)) {
        socket.emit('error', { message: 'tickers_array_required' });
        return;
      }
      for (const ticker of payload.tickers) {
        socket.join(`stock:${ticker}`);
      }
      socket.emit('joined', { tickers: payload.tickers });
    });

    socket.on('leave-stocks', (payload) => {
      if (!payload || !Array.isArray(payload.tickers)) return;
      for (const ticker of payload.tickers) {
        socket.leave(`stock:${ticker}`);
      }
      socket.emit('left', { tickers: payload.tickers });
    });

    socket.on('disconnect', () => {
      console.log('socket disconnected', socket.id);
    });
  });
}
