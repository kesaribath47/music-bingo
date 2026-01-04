const Anthropic = require('@anthropic-ai/sdk');
const YouTubeService = require('./youtubeService');
const IMDbService = require('./imdbService');
const { generateInstantMovieList } = require('./movieLists');
const { getPrevalidatedSong } = require('./prevalidatedSongs');

/**
 * Service to generate song-number associations using Claude API
 */
class ClaudeService {
  constructor(apiKey, tmdbApiKey = null, youtubeApiKey = null) {
    this.client = new Anthropic({
      apiKey: apiKey
    });
    this.youtubeService = new YouTubeService(youtubeApiKey);
    this.imdbService = new IMDbService(tmdbApiKey);
  }

  /**
   * Generate a list of 50 movies with pre-validated songs (NO API CALLS!)
   * Returns array of { number, movie, year, language }
   */
  async generateMovieList(config = {}, progressCallback = null) {
    const { languages = ['Hindi', 'Kannada'], startYear, endYear } = config;
    const yearInfo = startYear && endYear ? ` (${startYear}-${endYear})` : '';
    console.log(`\n🎬 Generating 50 movies with PRE-VALIDATED songs from ${languages.join(', ')} catalog${yearInfo}...`);
    console.log(`✨ Using pre-validated list - NO YouTube API calls needed!`);

    // Get movies that have pre-validated songs (instant, no API calls!)
    const movies = generateInstantMovieList(languages, startYear, endYear, 50);

    console.log(`📋 Selected ${movies.length} movies with pre-validated songs`);

    // Report progress
    if (progressCallback) {
      for (let i = 0; i < movies.length; i++) {
        progressCallback({
          current: i + 1,
          total: movies.length,
          checking: movies[i].movie
        });
        // Small delay for UI to update
        await this.sleep(50);
      }
    }

    console.log(`\n✅ Generated ${movies.length} movies instantly!`);
    return movies;
  }

  /**
   * Generate a song from a specific movie using PRE-VALIDATED list (NO API CALLS!)
   * Returns { number, song, artist, movie, year, language, videoId }
   */
  async generateSongFromMovie(movieEntry, usedSongs = [], config = {}, retryCount = 0) {
    // Try to get a pre-validated song first (NO API CALLS!)
    const prevalidatedSong = getPrevalidatedSong(movieEntry.movie, usedSongs);

    if (prevalidatedSong) {
      console.log(`  ✅ Using PRE-VALIDATED song: "${prevalidatedSong.song}" by ${prevalidatedSong.artist}`);
      console.log(`     Movie: "${prevalidatedSong.movie}" (${prevalidatedSong.year}, ${prevalidatedSong.language})`);
      console.log(`     Video ID: ${prevalidatedSong.videoId} (pre-verified, no API call needed!)`);

      return {
        number: movieEntry.number,
        song: prevalidatedSong.song,
        artist: prevalidatedSong.artist,
        movie: prevalidatedSong.movie,
        year: prevalidatedSong.year,
        language: prevalidatedSong.language,
        videoId: prevalidatedSong.videoId,
        duration: 180 // Default 3 minutes
      };
    }

    // Fallback to old method if no pre-validated song found (requires API calls)
    console.log(`  ⚠️  No pre-validated song found for "${movieEntry.movie}", falling back to API search...`);
    return await this.generateSongFromMovieWithAPI(movieEntry, usedSongs, config, retryCount);
  }

  /**
   * FALLBACK: Generate a song from a specific movie using Claude + YouTube API
   * Only used when no pre-validated song is available
   * Returns { number, song, artist, movie, year, language, videoId }
   */
  async generateSongFromMovieWithAPI(movieEntry, usedSongs = [], config = {}, retryCount = 0) {
    const maxRetries = 8; // Try up to 8 times to find a song with YouTube video
    const usedSongsText = usedSongs.length > 0
      ? `\n\nAlready used songs from this movie (do NOT suggest these): ${usedSongs.join(', ')}`
      : '';

    // Ask for more popular/famous songs on retries
    const popularityNote = retryCount > 3
      ? `\n\nIMPORTANT: This is retry #${retryCount}. Choose only the MOST FAMOUS, MAINSTREAM hits that are widely available on YouTube.`
      : '';

    const prompt = `IMPORTANT: Respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or additional commentary. Only output the JSON object.

Generate a popular, chart-topping song from the ${movieEntry.language} movie "${movieEntry.movie}" (${movieEntry.year}).

CRITICAL REQUIREMENTS:
1. The song MUST be from the ${movieEntry.language} movie "${movieEntry.movie}" - NOT from any other movie
2. The song MUST be in ${movieEntry.language} language - NOT in English or any other language
3. Choose an ICONIC, chart-topping song that everyone in ${movieEntry.language} cinema remembers
4. The song MUST have been featured in the movie's soundtrack
5. Provide the actual singer/artist name who sang in the movie
6. Names must be in English/romanized format ONLY${usedSongsText}${popularityNote}

STRICT VALIDATION:
- If you're not 100% certain the song is from "${movieEntry.movie}", DO NOT suggest it
- Verify the song is in ${movieEntry.language}, not English or other languages
- Verify the artist actually sang for this specific movie

Example for Hindi movie "Aashiqui 2" (2013):
{
  "song": "Tum Hi Ho",
  "artist": "Arijit Singh"
}

Example for Kannada movie "Mungaru Male" (2006):
{
  "song": "Anisuthide",
  "artist": "Sonu Nigam"
}

Output ONLY this JSON structure with no additional text:
{
  "song": "Song Title in ${movieEntry.language}",
  "artist": "Singer Name(s) who sang in ${movieEntry.movie}"
}`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = message.content[0].text;

      // Extract JSON from response (handle markdown code blocks and extra text)
      let jsonText = responseText.trim();

      // Remove markdown code blocks if present
      if (jsonText.includes('```json')) {
        jsonText = jsonText.split('```json')[1].split('```')[0].trim();
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.split('```')[1].split('```')[0].trim();
      }

      // Try to find JSON object in the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const songData = JSON.parse(jsonText);

      // Build full association with movie data
      const association = {
        number: movieEntry.number,
        song: songData.song,
        artist: songData.artist,
        movie: movieEntry.movie,
        actors: movieEntry.actors,
        year: movieEntry.year,
        language: movieEntry.language
      };

      console.log(`  ✓ Generated song: "${association.song}" by ${association.artist}`);
      console.log(`     Movie: "${association.movie}" (${association.year}, ${association.language})`);

      // Search YouTube for video
      console.log('  🔍 Searching YouTube for video...');
      const youtubeResult = await this.youtubeService.searchSong(
        association.artist,
        association.song,
        association.movie,
        association.language,
        association.year
      );

      if (youtubeResult && youtubeResult.videoId) {
        association.videoId = youtubeResult.videoId;
        association.videoTitle = youtubeResult.title;
        association.channelTitle = youtubeResult.channelTitle;
        association.duration = youtubeResult.duration;

        console.log(`  ✅ Matched YouTube: "${youtubeResult.title}" on ${youtubeResult.channelTitle}`);
        console.log(`     Video ID: ${youtubeResult.videoId}`);
        return association;
      }

      // No video found on YouTube
      console.log(`❌ No YouTube video found for: ${association.artist} - ${association.song}`);

      // Retry with a different song if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        console.log(`   🔄 Retry ${retryCount + 1}/${maxRetries}: Generating different song from same movie...`);
        // Add this song to used songs to avoid regenerating it
        usedSongs.push(association.song);
        return await this.generateSongFromMovie(movieEntry, usedSongs, config, retryCount + 1);
      } else {
        console.warn(`   ⚠️  Max retries reached. Skipping this movie.`);
        association.videoId = null;
        return association;
      }
    } catch (error) {
      console.error('Error generating song from movie:', error);

      // Fallback to simple song
      return {
        number: movieEntry.number,
        song: `Song from ${movieEntry.movie}`,
        artist: 'Various Artists',
        movie: movieEntry.movie,
        actors: movieEntry.actors,
        year: movieEntry.year,
        language: movieEntry.language,
        videoId: null
      };
    }
  }

  /**
   * Generate a song from a random movie in the list
   * @param {array} moviesList - Array of movie objects
   * @param {array} usedSongs - Array of already used song titles
   * @param {object} config - Optional config
   */
  async generateRandomSongFromMovies(moviesList, usedSongs = [], config = {}) {
    // Pick a random movie from the list
    const randomMovie = moviesList[Math.floor(Math.random() * moviesList.length)];

    // Generate a song from that movie
    const song = await this.generateSongFromMovie(randomMovie, usedSongs, config);

    return song;
  }

  /**
   * Shuffle array in place
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ClaudeService;
