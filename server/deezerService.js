const axios = require('axios');

/**
 * Service to search for songs using Deezer API
 * Deezer provides free API access with 30-second preview URLs
 */
class DeezerService {
  constructor() {
    this.baseUrl = 'https://api.deezer.com';
  }

  /**
   * Search for a song on Deezer and get preview URL
   * Uses multiple fallback strategies to find the best match
   * @param {string} artist - Artist name
   * @param {string} song - Song title
   * @param {number} year - Release year (optional, for filtering)
   * @returns {Object} - { previewUrl, duration, deezerLink }
   */
  async searchSong(artist, song, year = null) {
    try {
      console.log(`Searching Deezer for: "${song}" by "${artist}" (${year || 'any year'})`);

      // Strategy 1: Try exact artist + track search
      let results = await this.trySearch(`artist:"${artist}" track:"${song}"`);

      // Strategy 2: If no results, try without quotes (more flexible)
      if (!results || results.length === 0) {
        console.log('  → Trying flexible search without quotes...');
        results = await this.trySearch(`${artist} ${song}`);
      }

      // Strategy 3: If still no results, try just the song title
      if (!results || results.length === 0) {
        console.log('  → Trying song title only...');
        results = await this.trySearch(song);
      }

      // Strategy 4: Try with first artist name only (in case of multiple artists)
      if (!results || results.length === 0) {
        const firstArtist = artist.split(',')[0].trim();
        if (firstArtist !== artist) {
          console.log(`  → Trying first artist only: "${firstArtist}"...`);
          results = await this.trySearch(`${firstArtist} ${song}`);
        }
      }

      if (results && results.length > 0) {
        // Filter by year if provided
        if (year) {
          const yearMatches = results.filter(track => {
            if (!track.album || !track.album.release_date) return false;
            const trackYear = new Date(track.album.release_date).getFullYear();
            return Math.abs(trackYear - year) <= 3; // Allow 3 years difference
          });

          if (yearMatches.length > 0) {
            results = yearMatches;
          }
        }

        // Get the first result (most relevant)
        const track = results[0];
        console.log(`  ✓ Found: "${track.title}" by ${track.artist?.name} (${track.album?.title || 'Unknown Album'})`);

        return {
          previewUrl: track.preview, // 30-second MP3 preview
          duration: track.duration || 30, // Duration in seconds
          deezerLink: track.link, // Link to full song on Deezer
          albumCover: track.album?.cover_medium,
          title: track.title,
          artistName: track.artist?.name
        };
      }

      console.log(`  ✗ No Deezer results found for: ${artist} - ${song}`);
      return null;
    } catch (error) {
      console.error('Deezer search error:', error.message);
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
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl);

      if (response.data && response.data.data && response.data.data.length > 0) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`Search failed for query "${query}":`, error.message);
      return null;
    }
  }

  /**
   * Search with a generic query string
   * @param {string} searchQuery - Generic search string
   * @returns {Object} - { previewUrl, duration, deezerLink }
   */
  async searchGeneric(searchQuery) {
    try {
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(searchQuery)}`;
      const response = await axios.get(searchUrl);

      if (response.data && response.data.data && response.data.data.length > 0) {
        const track = response.data.data[0];

        return {
          previewUrl: track.preview,
          duration: track.duration || 30,
          deezerLink: track.link,
          albumCover: track.album?.cover_medium,
          title: track.title,
          artistName: track.artist?.name
        };
      }

      return null;
    } catch (error) {
      console.error('Deezer generic search error:', error.message);
      return null;
    }
  }
}

module.exports = DeezerService;
