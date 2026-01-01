const axios = require('axios');

/**
 * Service to search for songs using JioSaavn API
 * JioSaavn has excellent coverage of Indian music (Hindi, Kannada, etc.)
 * and provides direct streaming URLs
 */
class JioSaavnService {
  constructor() {
    this.baseUrl = 'https://saavn.dev/api';
    // Backup: https://jiosaavn-api-privatecvc.vercel.app/
  }

  /**
   * Search for a song on JioSaavn and get preview URL
   * @param {string} artist - Artist name
   * @param {string} song - Song title
   * @param {number} year - Release year (optional, for filtering)
   * @returns {Object} - { previewUrl, duration, jiosaavnLink, albumCover, title, artistName }
   */
  async searchSong(artist, song, year = null) {
    try {
      console.log(`🎵 Searching JioSaavn for: "${song}" by "${artist}" (${year || 'any year'})`);

      // Clean up search query
      const query = `${song} ${artist}`.toLowerCase();

      // Strategy 1: Search with full query
      let results = await this.trySearch(query);

      // Strategy 2: If no results, try song title only
      if (!results || results.length === 0) {
        console.log('  → Trying song title only...');
        results = await this.trySearch(song);
      }

      // Strategy 3: Try artist + song separately
      if (!results || results.length === 0) {
        console.log('  → Trying artist name only...');
        results = await this.trySearch(artist);
      }

      if (results && results.length > 0) {
        // Filter by year if provided (allow ±2 years difference)
        if (year) {
          const yearMatches = results.filter(track => {
            if (!track.year) return false;
            return Math.abs(parseInt(track.year) - year) <= 2;
          });

          if (yearMatches.length > 0) {
            results = yearMatches;
          }
        }

        // Get the first result (most relevant)
        const track = results[0];
        console.log(`  ✓ Found: "${track.name}" by ${track.primaryArtists}`);

        // Get song details with streaming URL
        const songDetails = await this.getSongDetails(track.id);

        if (songDetails && songDetails.downloadUrl && songDetails.downloadUrl.length > 0) {
          // Use the highest quality available (usually last in array)
          const streamUrl = songDetails.downloadUrl[songDetails.downloadUrl.length - 1].link;

          return {
            previewUrl: streamUrl,
            duration: songDetails.duration || 180, // Duration in seconds
            jiosaavnLink: songDetails.url || track.url,
            albumCover: songDetails.image?.[2]?.link || track.image?.[2]?.link, // High quality image
            title: songDetails.name || track.name,
            artistName: songDetails.primaryArtists || track.primaryArtists
          };
        }
      }

      console.log(`  ✗ No JioSaavn results found for: ${artist} - ${song}`);
      return null;
    } catch (error) {
      console.error('JioSaavn search error:', error.message);
      return null;
    }
  }

  /**
   * Helper method to try a search query
   * @param {string} query - Search query
   * @returns {Array} - Array of track results or null
   */
  async trySearch(query) {
    try {
      const searchUrl = `${this.baseUrl}/search/songs`;
      const response = await axios.get(searchUrl, {
        params: {
          query: query,
          limit: 10
        },
        timeout: 10000
      });

      if (response.data && response.data.data && response.data.data.results) {
        return response.data.data.results;
      }
      return null;
    } catch (error) {
      console.error(`JioSaavn search failed for query "${query}":`, error.message);
      return null;
    }
  }

  /**
   * Get detailed song information including streaming URL
   * @param {string} songId - JioSaavn song ID
   * @returns {Object} - Song details with streaming URL
   */
  async getSongDetails(songId) {
    try {
      const detailsUrl = `${this.baseUrl}/songs/${songId}`;
      const response = await axios.get(detailsUrl, {
        timeout: 10000
      });

      if (response.data && response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      }
      return null;
    } catch (error) {
      console.error(`Failed to get song details for ID ${songId}:`, error.message);
      return null;
    }
  }
}

module.exports = JioSaavnService;
