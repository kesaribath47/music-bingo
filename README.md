# Music Bingo Game

A real-time multiplayer music bingo game where players solve song-based clues to find numbers on their bingo cards!

## Features

- **Real-time Multiplayer**: Multiple players can join a room and play together using Socket.IO
- **AI-Powered Song Clues**: Uses Claude AI to generate creative song associations for each number
- **Traditional Bingo Gameplay**: 5x5 bingo cards with numbers 1-75
- **Multiple Prize Types**:
  - Early 5 (first to mark 5 numbers)
  - Top/Middle/Bottom rows
  - All 5 columns (B, I, N, G, O)
  - Full House (all numbers marked)
- **Host Controls**: Dedicated host interface to control game flow
- **Beautiful UI**: Modern, responsive design with smooth animations
- **YouTube Integration**: Links to search for songs on YouTube

## Tech Stack

### Backend
- Node.js & Express
- Socket.IO for real-time communication
- Anthropic Claude API for song generation
- Custom bingo card generator with equal probability

### Frontend
- React
- Socket.IO Client
- React YouTube for audio playback
- Responsive CSS with modern design

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Claude API key (already configured in `.env`)

## Installation

1. **Install backend dependencies:**
   ```bash
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   cd client
   npm install
   cd ..
   ```

## Running the Application

### Development Mode (for developers)

Run both server and client with hot-reload:

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- React frontend on `http://localhost:3000`

### Production Mode (for hosting)

**Quick Start (Easiest):**

```bash
# Mac/Linux:
./start.sh

# Windows:
start.bat
```

The scripts will automatically:
- Install dependencies if needed
- Build the React app if needed
- Start the server
- Display the URL to share with players

**Manual Setup:**

1. **Build the React app:**
   ```bash
   npm run build
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Share the URL with players:**
   - Players can now visit `http://localhost:3001` (or your server's IP/domain)
   - No installation required - they just need a web browser!
   - All players connect to the same URL

**For hosting on a server:**
- Replace `localhost` with your server's IP address or domain name
- Example: `http://192.168.1.100:3001` or `https://musicbingo.yoursite.com`
- Make sure port 3001 is open in your firewall
- Players on the same network can connect using your local IP
- For internet access, deploy to a cloud service (see Deployment section below)

## How to Play

### Creating a Game

1. Open `http://localhost:3000` in your browser
2. Enter your name
3. Click "Create Room"
4. Share the room code with other players
5. Wait for players to join
6. Click "Start Game" when ready (this will generate songs using Claude AI - takes about 1 minute)
7. Click "Start First Song" to begin playing
8. For each song, the clue will be displayed along with a link to search YouTube
9. Click "Next Song" to reveal the next clue
10. Monitor prize claims as they happen

### Joining a Game

1. Open `http://localhost:3000` in your browser
2. Enter your name
3. Click "Join Room"
4. Enter the room code provided by the host
5. Wait for the host to start the game
6. When songs play, solve the clue to find the number
7. Numbers are automatically marked on your card
8. Click "BINGO!" when you complete a pattern

### Game Flow

1. **Waiting Room**: Players join and see who's in the room
2. **Game Start**: Host starts the game, which generates 20 songs (can be increased to 75)
3. **Playing Songs**: Host plays songs one by one, each with a clue
4. **Marking Numbers**: Numbers are automatically marked when revealed
5. **Claiming Bingo**: Players click "BINGO!" when they have a winning pattern
6. **Prize Tracking**: The system validates and tracks all prize winners
7. **Game End**: Game ends when all songs are played or all prizes are claimed

## Project Structure

```
music-bingo/
├── server/
│   ├── index.js              # Main server file with Socket.IO
│   ├── gameManager.js        # Game state management
│   ├── bingoCardGenerator.js # Card generation logic
│   ├── prizeManager.js       # Prize tracking and validation
│   └── claudeService.js      # Claude API integration
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home.js       # Landing page
│   │   │   ├── PlayerView.js # Player interface
│   │   │   ├── HostView.js   # Host interface
│   │   │   └── BingoCard.js  # Bingo card component
│   │   ├── App.js            # Main React component
│   │   └── App.css           # Styles
│   └── public/
├── .env                       # Environment variables (Claude API key)
├── package.json              # Backend dependencies
└── README.md                 # This file
```

## Configuration

The `.env` file contains:
- `CLAUDE_API_KEY`: Your Claude API key
- `PORT`: Server port (default: 3001)

## Customization

### Changing Number of Songs

In `server/claudeService.js`, line 72:
```javascript
room.songs = await this.claudeService.generateGameSongs(20); // Change 20 to 75 for full game
```

### Modifying Prizes

Edit `server/prizeManager.js` to add/remove prize types.

### Adjusting Song Duration

Currently set to 20 seconds. Modify in YouTube player options in:
- `client/src/components/PlayerView.js`
- `client/src/components/HostView.js`

## Deployment

Deploy to the cloud so players anywhere can connect!

### Quick Deploy Options

**Heroku:**
```bash
# Install Heroku CLI, then:
heroku create your-music-bingo
git init
git add .
git commit -m "Initial commit"
git push heroku main
heroku config:set CLAUDE_API_KEY=your-key-here
```

**Railway.app:**
1. Connect your GitHub repo to Railway
2. Add environment variable: `CLAUDE_API_KEY`
3. Railway auto-detects Node.js and deploys
4. Share the generated URL with players

**Render.com:**
1. Create a new Web Service
2. Connect your GitHub repo
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add environment variable: `CLAUDE_API_KEY`

**DigitalOcean/AWS/GCP:**
```bash
# On your server:
git clone your-repo
cd music-bingo
npm install
cd client && npm install && cd ..
npm run build
npm start

# Keep it running with PM2:
npm install -g pm2
pm2 start server/index.js --name music-bingo
pm2 save
pm2 startup
```

### Environment Variables

When deploying, set these environment variables:
- `CLAUDE_API_KEY`: Your Claude API key (required)
- `PORT`: Server port (optional, defaults to 3001)
- `CLIENT_URL`: Your frontend URL for CORS (optional, defaults to allow all)

## Features to Enhance

1. **YouTube API Integration**: Automatically fetch and play YouTube videos
2. **Persistent Rooms**: Save game state to database
3. **Authentication**: Add user accounts
4. **Game History**: Track past games and winners
5. **Custom Prizes**: Allow hosts to define custom prizes
6. **Audio Notifications**: Sound effects for bingo claims
7. **Mobile App**: Native mobile version
8. **Leaderboards**: Track player statistics across games

## Security

This project has been audited and all npm vulnerabilities have been resolved:
- **Backend**: 0 vulnerabilities (removed unused youtube-search-api and ytdl-core dependencies)
- **Frontend**: 0 vulnerabilities (using npm overrides to patch react-scripts nested dependencies)

Run `npm audit` in both root and client directories to verify.

## Troubleshooting

### Port Already in Use
If port 3001 or 3000 is already in use:
- Change `PORT` in `.env` for backend
- The frontend will automatically use another port if 3000 is taken

### Socket Connection Issues
- Make sure both frontend and backend are running
- Check that CORS is properly configured in `server/index.js`
- Verify the SOCKET_URL in `client/src/App.js` matches your backend

### Claude API Rate Limiting
- The app includes a 1-second delay between song generations
- If you hit rate limits, increase the delay in `server/claudeService.js`

## License

MIT

## Credits

Built with Claude AI for song generation and creative clues!

Enjoy playing Music Bingo!
