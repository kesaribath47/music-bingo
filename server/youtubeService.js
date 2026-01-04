const axios = require('axios');

/**
 * Service to search for songs on YouTube using official music channels
 */
class YouTubeService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';

    // Official music channels for better results (verified and trusted)
    this.hindiChannels = [
      'UCq-Fj5jknLsUf-MWSy4_brA', // T-Series (267M subscribers)
      'UCFFbwnve3yF62-2vWbzNRYA', // Zee Music Company (121M subscribers)
      'UCTNtRdBAiZtHP9w7JinzfUg', // Sony Music India (69.2M subscribers)
      'UC8C_OnO3pJYiLziEDb8Fh1A'  // Tips Official (80.1M subscribers)
    ];

    this.kannadaChannels = [
      'UCJq7xNPBp6Xq5rrh-7R5YOA', // Anand Audio (8.92M subscribers)
      'UC6-F5tO8uklgE9Zy8IvbdFw', // Lahari Music
      'UC-qwSj8Rx_Uj5mEOtMiT9Kw'  // DBeatsMusicWorld
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

          // Validate that the video is actually from the correct movie
          const validVideo = this.validateMovieMatch(filteredResults, movie, song);
          if (validVideo) {
            console.log(`  ✓ Found on YouTube: "${validVideo.title}"`);
            console.log(`  ✓ Verified: Video belongs to movie "${movie}"`);

            return {
              videoId: validVideo.videoId,
              title: validVideo.title,
              channelTitle: validVideo.channelTitle,
              duration: validVideo.duration || 180 // Default 3 minutes
            };
          } else {
            console.log(`  ✗ Found results but none match movie "${movie}"`);
          }
        }
      }

      // Fallback: search without channel filter
      console.log('  → Trying search without channel filter...');
      const query = `${song} ${movie} ${artist} official`;
      const results = await this.trySearch(query);

      if (results && results.length > 0) {
        // Validate that the video is actually from the correct movie
        const validVideo = this.validateMovieMatch(results, movie, song);
        if (validVideo) {
          console.log(`  ✓ Found on YouTube: "${validVideo.title}"`);
          console.log(`  ✓ Verified: Video belongs to movie "${movie}"`);

          return {
            videoId: validVideo.videoId,
            title: validVideo.title,
            channelTitle: validVideo.channelTitle,
            duration: validVideo.duration || 180
          };
        } else {
          console.log(`  ✗ Found results but none match movie "${movie}"`);
        }
      }

      console.log(`  ✗ No YouTube results found for: ${artist} - ${song}`);
      return null;
    } catch (error) {
      console.error('YouTube search error:', error.message);
      return null;
    }
  }

  /**
   * Validate that a video actually belongs to the specified movie
   * @param {Array} videos - Array of video results
   * @param {string} movie - Movie name to verify
   * @param {string} song - Song name to verify
   * @returns {Object|null} - Valid video or null
   */
  validateMovieMatch(videos, movie, song) {
    // Normalize movie name for comparison (remove special chars, convert to lowercase)
    const normalizeText = (text) => {
      return text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ')         // Normalize spaces
        .trim();
    };

    const normalizedMovie = normalizeText(movie);
    const normalizedSong = normalizeText(song);

    console.log(`  🔍 Validating ${videos.length} video(s) for movie "${movie}"`);

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const normalizedTitle = normalizeText(video.title);
      const normalizedDescription = normalizeText(video.description || '');

      // Check if the video title or description contains the movie name
      // Also check for the song name to ensure it's the right track
      const hasMovie = normalizedTitle.includes(normalizedMovie) ||
                       normalizedDescription.includes(normalizedMovie);
      const hasSong = normalizedTitle.includes(normalizedSong);

      console.log(`     [${i + 1}] "${video.title}"`);
      console.log(`         Movie match: ${hasMovie ? '✓' : '✗'}, Song match: ${hasSong ? '✓' : '✗'}`);

      // Must have either both movie+song, or at least movie name
      if (hasMovie || (hasSong && normalizedTitle.length > 0)) {
        console.log(`         ✅ VALID - This video matches!`);
        return video;
      } else {
        console.log(`         ❌ REJECTED - Does not match movie "${movie}"`);
      }
    }

    console.log(`  ⚠️  No valid matches found among ${videos.length} results`);
    return null;
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
            description: item.snippet.description || '',
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
