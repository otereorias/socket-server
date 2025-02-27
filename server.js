const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.get('/', (req, res) => {
  console.log('Hello World');
  res.send('Hello World');
});

// Objeto para almacenar usuarios conectados
const usuarios = {};
// Objeto para almacenar canales disponibles
const canales = {
  'general': { nombre: 'General', usuarios: [] },
  'emergencia': { nombre: 'Emergencia', usuarios: [] },
  'privado': { nombre: 'Privado', usuarios: [] }
};

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);
  
  socket.on('registrar_usuario', (nombreUsuario) => {
    usuarios[socket.id] = {
      id: socket.id,
      nombre: nombreUsuario,
      canalActual: null
    };
    io.emit('lista_usuarios', Object.values(usuarios));
  });
  
  // Unirse a un canal
  socket.on('unirse_canal', (canal) => {
    // Abandonar canal anterior si existe
    if (usuarios[socket.id].canalActual) {
      socket.leave(usuarios[socket.id].canalActual);
      const index = canales[usuarios[socket.id].canalActual].usuarios.indexOf(socket.id);
      if (index > -1) {
        canales[usuarios[socket.id].canalActual].usuarios.splice(index, 1);
      }
    }
    
    // Unirse al nuevo canal
    socket.join(canal);
    usuarios[socket.id].canalActual = canal;
    canales[canal].usuarios.push(socket.id);
    
    // Notificar a todos en el canal
    io.to(canal).emit('mensaje_sistema', `${usuarios[socket.id].nombre} se ha unido al canal`);
    io.emit('actualizar_canales', canales);
  });
  
  // Transmitir audio
  socket.on('transmitir_audio', (audioData) => {
    const canal = usuarios[socket.id].canalActual;
    if (canal) {
      // Transmitir a todos en el canal excepto el emisor
      socket.to(canal).emit('recibir_audio', {
        audio: audioData,
        emisor: usuarios[socket.id].nombre
      });
    }
  });
  
  // Transmisión directa a un usuario específico
  socket.on('transmitir_directo', ({ destinatarioId, audioData }) => {
    socket.to(destinatarioId).emit('recibir_audio_directo', {
      audio: audioData,
      emisor: usuarios[socket.id].nombre
    });
  });
  
  // Desconexión
  socket.on('disconnect', () => {
    if (usuarios[socket.id]) {
      const canalAnterior = usuarios[socket.id].canalActual;
      if (canalAnterior && canales[canalAnterior]) {
        const index = canales[canalAnterior].usuarios.indexOf(socket.id);
        if (index > -1) {
          canales[canalAnterior].usuarios.splice(index, 1);
        }
        io.to(canalAnterior).emit('mensaje_sistema', `${usuarios[socket.id].nombre} ha abandonado el canal`);
      }
      delete usuarios[socket.id];
      io.emit('lista_usuarios', Object.values(usuarios));
      io.emit('actualizar_canales', canales);
    }
    console.log('Usuario desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

// Añade manejo de errores
process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
});