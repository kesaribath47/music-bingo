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
      songs: [],
      baseValues: {},
      usedSongs: [],
      songConfig: null, // { startYear, endYear, languages }
      songsGenerated: false,
      currentSongIndex: -1,
      calledNumbers: [],
      gameStarted: false,
      gameEnded: false,
      isGeneratingSongs: false,
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
   * Generate songs for a room
   * @param {string} roomCode
   * @param {object} config - { startYear, endYear, languages }
   * @param {function} progressCallback - Called with (current, total) for progress updates
   * @param {object} io - Socket.io instance for background generation events
   */
  async generateSongs(roomCode, config, progressCallback = null, io = null) {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.songsGenerated) {
      throw new Error('Songs already generated');
    }

    room.isGeneratingSongs = true;
    room.songConfig = config;

    // Generate only 3 songs initially to get started quickly
    const { songs, baseValues, usedSongs } = await this.claudeService.generateGameSongs(
      3,
      progressCallback,
      null,
      config
    );
    room.songs = songs;
    room.baseValues = baseValues;
    room.usedSongs = usedSongs;
    room.songsGenerated = true;
    room.isGeneratingSongs = false;

    // Shuffle songs
    this.shuffleArray(room.songs);

    // Start background generation if io is provided
    if (io) {
      this.continueGeneratingInBackground(roomCode, io, config);
    }

    return room;
  }

  /**
   * Start game (songs must be generated first)
   */
  startGame(roomCode) {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (!room.songsGenerated) {
      throw new Error('Please generate songs before starting the game');
    }

    if (room.gameStarted) {
      throw new Error('Game already started');
    }

    room.gameStarted = true;
    return room;
  }

  /**
   * Continue generating songs in the background
   */
  continueGeneratingInBackground(roomCode, io, config) {
    const room = this.getRoom(roomCode);
    if (!room || room.isGeneratingSongs) return;

    room.isGeneratingSongs = true;

    // Generate songs in background (non-blocking)
    (async () => {
      try {
        // Continue generating until we have enough or prizes are all claimed
        while (room.songs.length < 75 && !room.gameEnded) {
          const currentCount = room.songs.length;

          // Generate 5 more songs at a time
          const { songs, baseValues, usedSongs } = await this.claudeService.generateGameSongs(
            5,
            null, // No progress callback for background generation
            {
              songs: room.songs,
              baseValues: room.baseValues,
              usedSongs: room.usedSongs
            },
            config
          );

          room.songs = songs;
          room.baseValues = baseValues;
          room.usedSongs = usedSongs;

          // Notify clients that more songs are available
          const newSongsCount = room.songs.length - currentCount;
          if (newSongsCount > 0) {
            io.to(roomCode).emit('songs-generated', {
              totalSongs: room.songs.length,
              newCount: newSongsCount
            });
          }

          // Stop if game ended or all prizes claimed
          if (room.gameEnded || room.songs.length >= 75) {
            break;
          }
        }
      } catch (error) {
        console.error('Background song generation error:', error);
      } finally {
        room.isGeneratingSongs = false;
      }
    })();
  }

  /**
   * Play next song
   */
  playNextSong(roomCode) {
    const room = this.getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    room.currentSongIndex++;

    if (room.currentSongIndex >= room.songs.length) {
      room.gameEnded = true;
      return null;
    }

    const song = room.songs[room.currentSongIndex];
    room.calledNumbers.push(song.number);

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

    // Collect all unique entities from all songs
    const entitiesMap = new Map();
    room.songs.forEach(song => {
      if (song.entities && Array.isArray(song.entities)) {
        song.entities.forEach(entity => {
          // Use name as key to ensure uniqueness
          if (!entitiesMap.has(entity.name)) {
            entitiesMap.set(entity.name, {
              name: entity.name,
              role: entity.role,
              baseValue: entity.baseValue,
              imageUrl: entity.imageUrl || null
            });
          }
        });
      }
    });

    // Convert map to array
    const entities = Array.from(entitiesMap.values());

    return {
      code: room.code,
      playerCount: room.players.size,
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost
      })),
      host: room.host,
      songsGenerated: room.songsGenerated,
      isGeneratingSongs: room.isGeneratingSongs,
      gameStarted: room.gameStarted,
      gameEnded: room.gameEnded,
      currentSongIndex: room.currentSongIndex,
      totalSongs: room.songs.length,
      calledNumbers: room.calledNumbers,
      prizes: room.prizeManager.getAllPrizes(),
      baseValues: room.baseValues,
      entities: entities, // Add entities array with images
      songs: room.songs // Add full songs array for called numbers modal
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
