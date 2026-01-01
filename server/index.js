require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');
const cors = require('cors');
const GameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);

// Allow connections from any origin (update for production)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const gameManager = new GameManager(process.env.CLAUDE_API_KEY, process.env.TMDB_API_KEY, process.env.YOUTUBE_API_KEY);

// Get local IP addresses
function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  return addresses;
}

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build')));

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get network info for QR code generation
app.get('/api/network-info', (req, res) => {
  const localIPs = getLocalIPAddresses();
  const primaryIP = localIPs.length > 0 ? localIPs[0] : 'localhost';

  res.json({
    ip: primaryIP,
    port: PORT,
    url: `http://${primaryIP}:${PORT}`
  });
});

app.post('/api/room/create', (req, res) => {
  try {
    const roomCode = GameManager.generateRoomCode();
    const room = gameManager.createRoom(roomCode);
    res.json({ roomCode, success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join room
  socket.on('join-room', ({ roomCode, playerName }) => {
    try {
      const player = gameManager.addPlayer(roomCode, socket.id, playerName);
      socket.join(roomCode);

      // Send player their card
      socket.emit('card-assigned', {
        card: player.card,
        isHost: player.isHost
      });

      // Broadcast room state to all players
      const roomState = gameManager.getRoomState(roomCode);
      io.to(roomCode).emit('room-state', roomState);

      console.log(`${playerName} joined room ${roomCode}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Generate songs (host only)
  socket.on('generate-songs', async ({ roomCode, config }) => {
    try {
      const room = gameManager.getRoom(roomCode);

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.host !== socket.id) {
        socket.emit('error', { message: 'Only host can generate movies' });
        return;
      }

      console.log(`🎬 Generating movies for room ${roomCode}...`);

      // Generate 50 movies instantly (no API calls)
      gameManager.generateMovies(roomCode, config);

      // Send updated room state
      const roomState = gameManager.getRoomState(roomCode);
      console.log(`✅ Movies generated instantly in room ${roomCode}`);
      console.log(`   moviesGenerated=${roomState.moviesGenerated}, movieCount=${roomState.movies?.length}`);
      console.log(`   Emitting 'songs-generation-complete' to room ${roomCode}`);

      // Emit to the entire room
      io.to(roomCode).emit('songs-generation-complete', roomState);

      // Also emit directly to the socket to ensure host receives it
      socket.emit('songs-generation-complete', roomState);

      console.log(`   Event emitted successfully`);
    } catch (error) {
      console.error(`❌ Error generating movies:`, error.message);
      socket.emit('error', { message: error.message });
    }
  });

  // Start game (host only)
  socket.on('start-game', async ({ roomCode }) => {
    try {
      const room = gameManager.getRoom(roomCode);

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.host !== socket.id) {
        socket.emit('error', { message: 'Only host can start the game' });
        return;
      }

      // Start the game
      gameManager.startGame(roomCode);

      // Send updated room state
      const roomState = gameManager.getRoomState(roomCode);
      io.to(roomCode).emit('game-started', roomState);

      console.log(`Game started in room ${roomCode}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Play next song (host only)
  socket.on('play-next-song', async ({ roomCode }) => {
    try {
      const room = gameManager.getRoom(roomCode);

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.host !== socket.id) {
        socket.emit('error', { message: 'Only host can play songs' });
        return;
      }

      // Generate a song from a random movie in the list
      const song = await gameManager.playNextSong(roomCode);

      if (!song) {
        io.to(roomCode).emit('game-ended', {
          message: 'Game over!',
          prizes: room.prizeManager.getAllPrizes()
        });
        return;
      }

      // Mark the number on all cards
      gameManager.markNumber(roomCode, song.number);

      // Broadcast song to all players
      io.to(roomCode).emit('new-song', {
        song,
        songIndex: room.currentSongIndex,
        totalSongs: room.songs.length
      });

      console.log(`Playing song #${song.number}: "${song.song}" from ${song.movie}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Claim bingo
  socket.on('claim-bingo', ({ roomCode }) => {
    try {
      const result = gameManager.handleBingoClaim(roomCode, socket.id);

      // Send result to player
      socket.emit('bingo-result', result);

      // If valid, broadcast to all players
      if (result.valid) {
        io.to(roomCode).emit('bingo-claimed', {
          playerName: result.playerName,
          prizes: result.prizes
        });

        // Send updated room state
        const roomState = gameManager.getRoomState(roomCode);
        io.to(roomCode).emit('room-state', roomState);

        console.log(`${result.playerName} claimed bingo in room ${roomCode}: ${result.prizes.map(p => p.name).join(', ')}`);
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Get current room state
  socket.on('get-room-state', ({ roomCode }) => {
    const roomState = gameManager.getRoomState(roomCode);
    if (roomState) {
      socket.emit('room-state', roomState);
    } else {
      socket.emit('error', { message: 'Room not found' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Remove player from all rooms
    gameManager.rooms.forEach((room, roomCode) => {
      if (room.players.has(socket.id)) {
        const wasDeleted = gameManager.removePlayer(roomCode, socket.id);

        if (!wasDeleted) {
          // Room still exists, update other players
          const roomState = gameManager.getRoomState(roomCode);
          io.to(roomCode).emit('room-state', roomState);
        }
      }
    });
  });
});

// Serve React app for all other routes (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎵 Music Bingo Server Started! 🎵\n`);
  console.log(`Local:    http://localhost:${PORT}`);

  const localIPs = getLocalIPAddresses();
  if (localIPs.length > 0) {
    console.log(`\nNetwork:  (accessible from other devices on same network)`);
    localIPs.forEach(ip => {
      console.log(`          http://${ip}:${PORT}`);
    });
  }

  console.log(`\nReady for players to join!\n`);
});
