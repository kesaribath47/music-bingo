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
   * @param {string} artist - Artist name
   * @param {string} song - Song title
   * @param {number} year - Release year (optional, for filtering)
   * @returns {Object} - { previewUrl, duration, deezerLink }
   */
  async searchSong(artist, song, year = null) {
    try {
      // Build search query
      const query = `artist:"${artist}" track:"${song}"`;
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;

      const response = await axios.get(searchUrl);

      if (response.data && response.data.data && response.data.data.length > 0) {
        // Filter by year if provided
        let results = response.data.data;

        if (year) {
          // Try to find a match from the same year or nearby years
          const yearMatches = results.filter(track => {
            if (!track.album || !track.album.release_date) return false;
            const trackYear = new Date(track.album.release_date).getFullYear();
            return Math.abs(trackYear - year) <= 2; // Allow 2 years difference
          });

          if (yearMatches.length > 0) {
            results = yearMatches;
          }
        }

        // Get the first result (most relevant)
        const track = results[0];

        return {
          previewUrl: track.preview, // 30-second MP3 preview
          duration: track.duration || 30, // Duration in seconds
          deezerLink: track.link, // Link to full song on Deezer
          albumCover: track.album?.cover_medium,
          title: track.title,
          artistName: track.artist?.name
        };
      }

      console.log(`No Deezer results found for: ${artist} - ${song}`);
      return null;
    } catch (error) {
      console.error('Deezer search error:', error.message);
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
