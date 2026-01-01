# YouTube API Setup

This application uses the YouTube Data API v3 to search for and play music videos.

## Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing one)
3. Enable **YouTube Data API v3**:
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key
5. Add the API key to `.env` file:
   ```
   YOUTUBE_API_KEY=your_api_key_here
   ```

## API Quota

- YouTube API has a daily quota limit (10,000 units/day by default)
- Each search costs 100 units
- Each video details request costs 1 unit
- Total cost per song search: ~101 units
- You can generate approximately 99 songs per day with the free quota

## Official Music Channels Used

**Hindi/Bollywood:**
- T-Series
- Zee Music Company
- Sony Music India
- Tips Official

**Kannada:**
- Anand Audio
- Lahari Music

These channels are searched first to ensure high-quality official music videos are found.
