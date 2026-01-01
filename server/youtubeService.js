const axios = require('axios');

/**
 * Service to search for songs on YouTube using official music channels
 */
class YouTubeService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';

    // Official music channels for better results
    this.hindiChannels = [
      'UCq-Fj5jknLsUf-MWSy4_brA', // T-Series
      'UCFFbwnve3yF62-2vWbzNRYA', // Zee Music Company
      'UCTNtRdBAiZtHP9w7JinzfUg', // Sony Music India
      'UC8C_OnO3pJYiLziEDb8Fh1A'  // Tips Official
    ];

    this.kannadaChannels = [
      'UCJq7xNPBp6Xq5rrh-7R5YOA', // Anand Audio
      'UC6-F5tO8uklgE9Zy8IvbdFw'  // Lahari Music
    ];
  }

  /**
   * Search for a song on YouTube
   * @param {string} artist - Artist name
   * @param {string} song - Song title
   * @param {string} movie - Movie name
   * @param {string} language - Language (Hindi or Kannada)
   * @param {number} year - Release year
   * @returns {Object} - { videoId, title, channelTitle, duration }
   */
  async searchSong(artist, song, movie, language, year = null) {
    try {
      const channels = language === 'Kannada' ? this.kannadaChannels : this.hindiChannels;

      console.log(`Searching YouTube for: "${song}" from "${movie}" by "${artist}" (${language})`);

      // Try search with movie and song name, filtered by official channels
      for (const channelId of channels) {
        const query = `${song} ${movie} ${artist}`;
        const results = await this.trySearch(query, channelId);

        if (results && results.length > 0) {
          // Filter by year if provided (within 3 years tolerance)
          let filteredResults = results;
          if (year) {
            const yearResults = results.filter(video => {
              if (!video.publishedAt) return false;
              const videoYear = new Date(video.publishedAt).getFullYear();
              return Math.abs(videoYear - year) <= 3;
            });
            if (yearResults.length > 0) {
              filteredResults = yearResults;
            }
          }

          const video = filteredResults[0];
          console.log(`  ✓ Found on YouTube: "${video.title}"`);

          return {
            videoId: video.videoId,
            title: video.title,
            channelTitle: video.channelTitle,
            duration: video.duration || 180 // Default 3 minutes
          };
        }
      }

      // Fallback: search without channel filter
      console.log('  → Trying search without channel filter...');
      const query = `${song} ${movie} ${artist} official`;
      const results = await this.trySearch(query);

      if (results && results.length > 0) {
        const video = results[0];
        console.log(`  ✓ Found on YouTube: "${video.title}"`);

        return {
          videoId: video.videoId,
          title: video.title,
          channelTitle: video.channelTitle,
          duration: video.duration || 180
        };
      }

      console.log(`  ✗ No YouTube results found for: ${artist} - ${song}`);
      return null;
    } catch (error) {
      console.error('YouTube search error:', error.message);
      return null;
    }
  }

  /**
   * Try a search query on YouTube
   * @param {string} query - Search query
   * @param {string} channelId - Optional channel ID to filter by
   * @returns {Array} - Array of video results
   */
  async trySearch(query, channelId = null) {
    try {
      const params = {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: 5,
        key: this.apiKey,
        videoCategoryId: '10' // Music category
      };

      if (channelId) {
        params.channelId = channelId;
      }

      const searchUrl = `${this.baseUrl}/search`;
      const response = await axios.get(searchUrl, { params });

      if (response.data && response.data.items && response.data.items.length > 0) {
        // Get video details for duration
        const videoIds = response.data.items.map(item => item.id.videoId).join(',');
        const detailsUrl = `${this.baseUrl}/videos`;
        const detailsResponse = await axios.get(detailsUrl, {
          params: {
            part: 'contentDetails',
            id: videoIds,
            key: this.apiKey
          }
        });

        // Combine search results with duration info
        return response.data.items.map((item, index) => {
          const duration = detailsResponse.data.items[index]?.contentDetails?.duration;
          return {
            videoId: item.id.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            duration: this.parseDuration(duration)
          };
        });
      }

      return null;
    } catch (error) {
      console.error(`YouTube API error for query "${query}":`, error.message);
      return null;
    }
  }

  /**
   * Parse ISO 8601 duration to seconds
   * @param {string} duration - ISO 8601 duration (e.g., "PT3M45S")
   * @returns {number} - Duration in seconds
   */
  parseDuration(duration) {
    if (!duration) return 180; // Default 3 minutes

    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 180;

    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);

    return hours * 3600 + minutes * 60 + seconds;
  }
}

module.exports = YouTubeService;
