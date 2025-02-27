import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { VercelRequest, VercelResponse } from '@vercel/node';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  maxHttpBufferSize: 1e8,
  cors: {
    origin: process.env.CORS_ORIGIN || 'https://tu-frontend.com',
    credentials: true
  },
  transports: ['websocket']
});

// Configuración básica del socket
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Manejar eventos personalizados
  socket.on('mensaje', (data) => {
    console.log('Mensaje recibido:', data);
    io.emit('nuevo_mensaje', data); // Broadcast a todos
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor Socket.IO escuchando en puerto ${PORT}`);
});

export default (req: VercelRequest, res: VercelResponse) => {
  res.status(200).send('Socket server running');
}; 