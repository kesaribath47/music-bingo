const axios = require('axios');

/**
 * Service to fetch movie information from TMDb (The Movie Database)
 * TMDb has excellent coverage of international films including Bollywood
 * Free API with generous rate limits
 *
 * To use: Get a free API key from https://www.themoviedb.org/settings/api
 * Set TMDB_API_KEY environment variable
 */
class IMDbService {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.TMDB_API_KEY;
    this.baseUrl = 'https://api.themoviedb.org/3';
    this.imageBaseUrl = 'https://image.tmdb.org/t/p/w185'; // For profile images
  }

  /**
   * Search for a movie by title and year
   * @param {string} movieTitle - Movie title to search for
   * @param {number} year - Release year (optional)
   * @returns {Object} - Movie details with cast and crew
   */
  async searchMovie(movieTitle, year = null) {
    if (!this.apiKey) {
      console.log('⚠️  TMDb API key not set. Skipping IMDb search.');
      return null;
    }

    try {
      console.log(`🎬 Searching TMDb for movie: "${movieTitle}" (${year || 'any year'})`);

      // Search for the movie
      const searchUrl = `${this.baseUrl}/search/movie`;
      const searchParams = {
        api_key: this.apiKey,
        query: movieTitle,
        language: 'en-US'
      };

      if (year) {
        searchParams.year = year;
        searchParams.primary_release_year = year;
      }

      const searchResponse = await axios.get(searchUrl, { params: searchParams });

      if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
        console.log(`  ✗ No TMDb results found for: ${movieTitle}`);
        return null;
      }

      // Get the first result (most relevant)
      const movie = searchResponse.data.results[0];
      const movieId = movie.id;

      console.log(`  ✓ Found movie: "${movie.title}" (${movie.release_date?.substring(0, 4)})`);

      // Get detailed cast and crew information
      const creditsUrl = `${this.baseUrl}/movie/${movieId}/credits`;
      const creditsResponse = await axios.get(creditsUrl, {
        params: { api_key: this.apiKey }
      });

      const cast = creditsResponse.data.cast || [];
      const crew = creditsResponse.data.crew || [];

      // Extract lead actors/actresses (first 3 main cast)
      const leadActors = cast.slice(0, 3).map(person => ({
        name: person.name,
        character: person.character,
        profileImage: person.profile_path
          ? `${this.imageBaseUrl}${person.profile_path}`
          : null,
        gender: person.gender // 1 = female, 2 = male
      }));

      // Extract music director (composer)
      const musicDirectors = crew
        .filter(person =>
          person.job === 'Original Music Composer' ||
          person.job === 'Music' ||
          person.department === 'Sound'
        )
        .map(person => ({
          name: person.name,
          job: person.job,
          profileImage: person.profile_path
            ? `${this.imageBaseUrl}${person.profile_path}`
            : null
        }));

      // Extract director
      const directors = crew
        .filter(person => person.job === 'Director')
        .map(person => ({
          name: person.name,
          profileImage: person.profile_path
            ? `${this.imageBaseUrl}${person.profile_path}`
            : null
        }));

      console.log(`  → Lead actors: ${leadActors.map(a => a.name).join(', ')}`);
      if (musicDirectors.length > 0) {
        console.log(`  → Music: ${musicDirectors.map(m => m.name).join(', ')}`);
      }

      return {
        title: movie.title,
        year: movie.release_date?.substring(0, 4),
        movieId: movie.id,
        leadActors,
        musicDirectors,
        directors,
        posterUrl: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : null
      };
    } catch (error) {
      console.error('TMDb search error:', error.message);
      return null;
    }
  }

  /**
   * Get person details by name (for finding singer/artist images)
   * @param {string} personName - Name of the person to search for
   * @returns {Object} - Person details with profile image
   */
  async searchPerson(personName) {
    if (!this.apiKey) {
      return null;
    }

    try {
      const searchUrl = `${this.baseUrl}/search/person`;
      const response = await axios.get(searchUrl, {
        params: {
          api_key: this.apiKey,
          query: personName,
          language: 'en-US'
        }
      });

      if (!response.data.results || response.data.results.length === 0) {
        return null;
      }

      const person = response.data.results[0];

      return {
        name: person.name,
        profileImage: person.profile_path
          ? `${this.imageBaseUrl}${person.profile_path}`
          : null,
        knownFor: person.known_for_department
      };
    } catch (error) {
      console.error('TMDb person search error:', error.message);
      return null;
    }
  }

  /**
   * Extract movie name from song title or make an educated guess
   * Many Bollywood songs include the movie name or are titled after the movie
   * @param {string} song - Song title
   * @param {string} artist - Artist name (may contain hints)
   * @param {number} year - Release year
   * @returns {string} - Likely movie name
   */
  guessMovieName(song, artist, year) {
    // Common patterns in Bollywood song titles
    // Often the movie name is in parentheses or the song is from the movie with similar name

    // For now, return the song name as a starting point
    // In a real implementation, this could be enhanced with a database mapping
    return song;
  }
}

module.exports = IMDbService;
