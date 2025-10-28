const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');
const Location = require('../models/locationModel.js');

const JWT_SECRET = process.env.JWT_SECRET || 'Debraj';

const online = new Map();

function addOnline(userId, socketId) {
  const set = online.get(String(userId)) || new Set();
  set.add(socketId);
  online.set(String(userId), set);
}
function removeOnline(userId, socketId) {
  const set = online.get(String(userId));
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) online.delete(String(userId));
}

function getSocketsForUser(io, userId) {
  const set = online.get(String(userId));
  if (!set) return [];
  return Array.from(set).map(sid => io.sockets.sockets.get(sid)).filter(Boolean);
}

function initSockets(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('auth error'));
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.userId = payload.sub;
      return next();
    } catch (err) {
      return next(new Error('auth error'));
    }
  });

  io.on('connection', async (socket) => {
    const uid = String(socket.userId);
    console.log('socket connected', uid, socket.id);
    addOnline(uid, socket.id);

    socket.on('location', async (data) => {
      try {
        // upsert current location for this user
        await Location.findOneAndUpdate(
          { user: uid },
          { user: uid, lat: data.lat, lng: data.lng, accuracy: data.accuracy || 0, ts: new Date(data.ts || Date.now()) },
          { upsert: true, new: true }
        );

        const me = await User.findById(uid).select('friends username name');
        if (!me) return;

        const payload = {
          userId: uid,
          username: me.username,
          name: me.name,
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy || 0,
          ts: data.ts || Date.now()
        };

        // send to each friend who is online
        for (const fId of (me.friends || [])) {
          const sockets = getSocketsForUser(io, String(fId));
          sockets.forEach(s => s.emit('location_update', payload));
        }
      } catch (err) {
        console.error('error handling location', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('socket disconnect', uid, socket.id);
      removeOnline(uid, socket.id);
    });
  });
}

module.exports = { initSockets };
