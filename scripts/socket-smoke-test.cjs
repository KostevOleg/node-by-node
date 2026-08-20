const { io } = require('socket.io-client');

const serverUrl = process.env.SOCKET_URL ?? 'http://localhost:3000/chat';
const token = process.env.ACCESS_TOKEN;
const chatId = process.env.CHAT_ID;

if (!token) {
  throw new Error('ACCESS_TOKEN is required');
}

const socket = io(serverUrl, {
  transports: ['websocket'],
  auth: {
    token,
  },
});

socket.on('connect', () => {
  console.log('connected', socket.id);
  console.log('using chatId', chatId ?? '<not set>');

  setTimeout(() => {
    socket.emit('ping', (response) => {
      console.log('ping response', response);
    });

    if (chatId) {
      console.log('emitting joinChat', chatId);
      socket.emit('joinChat', { chatId }, (response) => {
        console.log('joinChat response', response);
      });
    }
  }, 500);
});

socket.on('pong', (payload) => {
  console.log('pong', payload);
});

socket.on('exception', (payload) => {
  console.log('exception', payload);
});

socket.on('chatCreated', (payload) => {
  console.log('chatCreated', payload);
});

socket.on('chatMessageCreated', (payload) => {
  console.log('chatMessageCreated', payload);
});

socket.on('messageCreated', (payload) => {
  console.log('messageCreated', payload);
});

socket.on('messageUpdated', (payload) => {
  console.log('messageUpdated', payload);
});

socket.on('messageDeleted', (payload) => {
  console.log('messageDeleted', payload);
});

socket.on('userJoinedChat', (payload) => {
  console.log('userJoinedChat', payload);
});

socket.on('userLeftChat', (payload) => {
  console.log('userLeftChat', payload);
});

socket.on('userTyping', (payload) => {
  console.log('userTyping', payload);
});

socket.on('userOnline', (payload) => {
  console.log('userOnline', payload);
});

socket.on('userOffline', (payload) => {
  console.log('userOffline', payload);
});

socket.on('disconnect', (reason) => {
  console.log('disconnect', reason);
});

socket.on('connect_error', (error) => {
  console.error('connect_error', error.message);
  console.error('connect_error description', error.description);
  console.error('connect_error context', error.context);
});

process.on('SIGINT', () => {
  socket.disconnect();
  process.exit(0);
});
