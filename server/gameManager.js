const BingoCardGenerator = require('./bingoCardGenerator');
const PrizeManager = require('./prizeManager');
const ClaudeService = require('./claudeService');

/**
 * Manages game rooms and state
 */
class GameManager {
  constructor(claudeApiKey, tmdbApiKey = null) {
    this.rooms = new Map();
    this.cardGenerator = new BingoCardGenerator();
    this.claudeService = new ClaudeService(claudeApiKey, tmdbApiKey);
  }

  /**
   * Create a new game room
   */
  createRoom(roomCode) {
    if (this.rooms.has(roomCode)) {
      throw new Error('Room already exists');
    }

    const room = {
      code: roomCode,
      players: new Map(),
      host: null,
      prizeManager: new PrizeManager(),
      movies: [], // List of 50 movies numbered 1-50
      songs: [], // Songs that have been played
      usedMovieNumbers: [], // Track which movies have been used (don't repeat)
      songConfig: null, // { startYear, endYear, languages }
      moviesGenerated: false,
      currentSongIndex: -1,
      calledNumbers: [],
      gameStarted: false,
      gameEnded: false,
      isGeneratingMovies: false,
      createdAt: Date.now()
    };

    this.rooms.set(roomCode, room);
    return room;
  }

  /**
   * Get room by code
   */
  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  /**
   * Delete room
   */
  deleteRoom(roomCode) {
    this.rooms.delete(roomCode);
  }

  /**
   * Add player to room
   */
  addPlayer(roomCode, socketId, playerName) {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.gameStarted) {
      throw new Error('Game already started');
    }

    const card = this.cardGenerator.generateCard(socketId);
    const player = {
      id: socketId,
      name: playerName,
      card: card,
      isHost: false,
      connectedAt: Date.now()
    };

    room.players.set(socketId, player);

    // First player becomes host
    if (room.players.size === 1) {
      player.isHost = true;
      room.host = socketId;
    }

    return player;
  }

  /**
   * Remove player from room
   */
  removePlayer(roomCode, socketId) {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    room.players.delete(socketId);

    // If host left, assign new host
    if (room.host === socketId && room.players.size > 0) {
      const newHost = Array.from(room.players.keys())[0];
      room.players.get(newHost).isHost = true;
      room.host = newHost;
    }

    // Delete room if empty
    if (room.players.size === 0) {
      this.deleteRoom(roomCode);
      return true;
    }

    return false;
  }

  /**
   * Generate movie list for a room
   * @param {string} roomCode
   * @param {object} config - { startYear, endYear, languages }
   * @param {function} progressCallback - Called with (current, total) for progress updates
   */
  async generateMovies(roomCode, config, progressCallback = null) {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.moviesGenerated) {
      throw new Error('Movies already generated');
    }

    room.isGeneratingMovies = true;
    room.songConfig = config;

    // Generate 50 movies numbered 1-50
    const movies = await this.claudeService.generateMovieList(50, config);

    room.movies = movies;
    room.moviesGenerated = true;
    room.isGeneratingMovies = false;

    console.log(`\n✅ Generated ${movies.length} movies for room ${roomCode}`);

    return room;
  }

  /**
   * Start game (movies must be generated first)
   */
  startGame(roomCode) {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (!room.moviesGenerated) {
      throw new Error('Please generate movies before starting the game');
    }

    if (room.gameStarted) {
      throw new Error('Game already started');
    }

    room.gameStarted = true;
    return room;
  }

  /**
   * Play next song (generates a song from a random unused movie)
   */
  async playNextSong(roomCode) {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.gameEnded) {
      return null;
    }

    // Get movies that haven't been used yet
    const availableMovies = room.movies.filter(
      movie => !room.usedMovieNumbers.includes(movie.number)
    );

    if (availableMovies.length === 0) {
      console.log('All movies have been used!');
      room.gameEnded = true;
      return null;
    }

    // Pick a random movie from available movies
    const randomMovie = availableMovies[Math.floor(Math.random() * availableMovies.length)];

    // Generate a song from that movie
    console.log(`\n🎵 Generating song from movie #${randomMovie.number}: ${randomMovie.movie}...`);
    const song = await this.claudeService.generateSongFromMovie(
      randomMovie,
      [], // No need to track used songs since we're not repeating movies
      room.songConfig
    );

    room.songs.push(song);
    room.usedMovieNumbers.push(song.number); // Mark this movie as used
    room.currentSongIndex = room.songs.length - 1;

    // Add the movie number to called numbers
    if (!room.calledNumbers.includes(song.number)) {
      room.calledNumbers.push(song.number);
    }

    return song;
  }

  /**
   * Mark number on all player cards
   */
  markNumber(roomCode, number) {
    const room = this.getRoom(roomCode);
    if (!room) return;

    room.players.forEach(player => {
      this.cardGenerator.markNumber(player.card, number);
    });
  }

  /**
   * Handle bingo claim
   */
  handleBingoClaim(roomCode, socketId) {
    const room = this.getRoom(roomCode);
    if (!room) {
      return { valid: false, message: 'Room not found' };
    }

    const player = room.players.get(socketId);
    if (!player) {
      return { valid: false, message: 'Player not found' };
    }

    // Check what prizes the player has won
    const wonPrizes = room.prizeManager.checkPrizes(player.card, player.name);

    if (wonPrizes.length === 0) {
      return {
        valid: false,
        message: 'No valid bingo pattern found',
        prizes: []
      };
    }

    // Claim the prizes
    const claimedPrizes = room.prizeManager.claimPrizes(wonPrizes, player.name, socketId);

    return {
      valid: true,
      message: `Congratulations! You won: ${claimedPrizes.map(p => p.name).join(', ')}`,
      prizes: claimedPrizes,
      playerName: player.name
    };
  }

  /**
   * Get room state for client
   */
  getRoomState(roomCode) {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    return {
      code: room.code,
      playerCount: room.players.size,
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost
      })),
      host: room.host,
      moviesGenerated: room.moviesGenerated,
      isGeneratingMovies: room.isGeneratingMovies,
      gameStarted: room.gameStarted,
      gameEnded: room.gameEnded,
      currentSongIndex: room.currentSongIndex,
      totalSongs: room.songs.length,
      calledNumbers: room.calledNumbers,
      prizes: room.prizeManager.getAllPrizes(),
      movies: room.movies, // Send all 50 movies
      songs: room.songs // Send played songs for history
    };
  }

  /**
   * Shuffle array
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Generate random room code
   */
  static generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

module.exports = GameManager;
