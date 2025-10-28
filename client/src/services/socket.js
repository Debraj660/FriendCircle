import { io } from 'socket.io-client';

let socket = null;

export function initSocket(token) {
  socket = io('https://friendcircle-server.onrender.com', { auth: { token } });
  socket.on('connect', () => console.log('socket connected', socket.id));
  socket.on('connect_error', (err) => console.error('socket error', err.message || err));
}

export function emitLocation(data) {
  if (!socket) return;
  socket.emit('location', data);
}

export function subscribeToLocation(cb) {
  if (!socket) return;
  socket.on('location_update', (payload) => cb(payload));
}
