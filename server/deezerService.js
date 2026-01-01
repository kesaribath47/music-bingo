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
   * @param {string} movie - Movie name (optional, helps find film songs)
   * @param {string} language - Language (Hindi/Kannada)
   * @returns {Object} - { previewUrl, duration, deezerLink }
   */
  async searchSong(artist, song, year = null, movie = null, language = null) {
    try {
      console.log(`Searching Deezer for: "${song}" from "${movie}" by "${artist}" (${year || 'any year'}, ${language})`);

      // Add language-specific keywords
      const languageKeyword = language === 'Kannada' ? 'Kannada' : 'Bollywood Hindi';

      // Strategy 1: Try with movie name and language for film songs
      let results = null;
      if (movie) {
        console.log(`  → Trying: ${song} ${movie} ${languageKeyword}`);
        results = await this.trySearch(`${song} ${movie} ${languageKeyword}`);
      }

      // Strategy 2: Try with artist and song and language
      if (!results || results.length === 0) {
        console.log(`  → Trying: ${artist} ${song} ${languageKeyword}`);
        results = await this.trySearch(`${artist} ${song} ${languageKeyword}`);
      }

      // Strategy 3: Try song + movie + artist (without language keyword)
      if (!results || results.length === 0) {
        console.log(`  → Trying: ${song} ${movie} ${artist}`);
        results = await this.trySearch(`${song} ${movie} ${artist}`);
      }

      // Strategy 4: Try movie soundtrack
      if (!results || results.length === 0 && movie) {
        console.log(`  → Trying: ${movie} soundtrack ${song}`);
        results = await this.trySearch(`${movie} soundtrack ${song}`);
      }

      // Strategy 5: Try just song + movie
      if (!results || results.length === 0 && movie) {
        console.log(`  → Trying: ${song} ${movie}`);
        results = await this.trySearch(`${song} ${movie}`);
      }

      // Strategy 6: Try with first artist name only (in case of multiple artists)
      if (!results || results.length === 0) {
        const firstArtist = artist.split(',')[0].trim();
        if (firstArtist !== artist) {
          console.log(`  → Trying first artist only: "${firstArtist} ${song}"`);
          results = await this.trySearch(`${firstArtist} ${song} ${languageKeyword}`);
        }
      }

      if (results && results.length > 0) {
        // Filter to avoid English/Western artists
        const commonWesternArtists = ['celine dion', 'titanic', 'james horner', 'whitney houston', 'mariah carey', 'backstreet boys'];
        const filteredResults = results.filter(track => {
          const artistName = (track.artist?.name || '').toLowerCase();
          const trackTitle = (track.title || '').toLowerCase();

          // Reject if it's a known Western artist
          for (const western of commonWesternArtists) {
            if (artistName.includes(western) || trackTitle.includes(western)) {
              console.log(`  ✗ Rejecting Western song: "${track.title}" by ${track.artist?.name}`);
              return false;
            }
          }

          return true;
        });

        const finalResults = filteredResults.length > 0 ? filteredResults : results;

        // Filter by year if provided
        if (year) {
          const yearMatches = finalResults.filter(track => {
            if (!track.album || !track.album.release_date) return false;
            const trackYear = new Date(track.album.release_date).getFullYear();
            return Math.abs(trackYear - year) <= 5; // Allow 5 years difference
          });

          if (yearMatches.length > 0) {
            const track = yearMatches[0];
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
        }

        // Get the first result (most relevant)
        const track = finalResults[0];
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
