const Anthropic = require('@anthropic-ai/sdk');
const YouTubeService = require('./youtubeService');
const IMDbService = require('./imdbService');
const { generateInstantMovieList } = require('./movieLists');

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
   * Generate a list of 50 movies instantly from predefined lists
   * Returns array of { number, movie, year, language, actors }
   */
  generateMovieList(config = {}) {
    const { languages = ['Hindi', 'Kannada'], startYear, endYear } = config;
    const yearInfo = startYear && endYear ? ` (${startYear}-${endYear})` : '';
    console.log(`\n🎬 Generating 50 movies instantly from ${languages.join(', ')} catalog${yearInfo}...`);

    const movies = generateInstantMovieList(languages, startYear, endYear);
    console.log(`\n✅ Generated ${movies.length} movies instantly!`);

    return movies;
  }

  /**
   * Generate a song from a specific movie
   * Returns { number, song, artist, movie, year, language }
   */
  async generateSongFromMovie(movieEntry, usedSongs = [], config = {}, retryCount = 0) {
    const maxRetries = 5; // Try up to 5 times to find a song with preview
    const usedSongsText = usedSongs.length > 0
      ? `\n\nAlready used songs from this movie (do NOT suggest these): ${usedSongs.join(', ')}`
      : '';

    const languageNote = movieEntry.language === 'Kannada'
      ? `\n\nNOTE: This is a KANNADA song. It should be available on official Kannada music YouTube channels like Anand Audio or Lahari Music.`
      : `\n\nNOTE: This is a HINDI/Bollywood song. It should be available on official music YouTube channels like T-Series, Zee Music Company, Sony Music India, or Tips Official.`;

    const prompt = `IMPORTANT: Respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or additional commentary. Only output the JSON object.

Generate a popular, chart-topping song from the movie "${movieEntry.movie}" (${movieEntry.year}).

REQUIREMENTS:
1. The song MUST be from the movie "${movieEntry.movie}"
2. Choose an ICONIC, chart-topping song that everyone remembers and sings along to
3. The song should be popular enough to be on official YouTube music channels
4. Provide the singer/artist name
5. Names must be in English/romanized format ONLY${usedSongsText}${languageNote}

Example Output:
{
  "song": "Tum Hi Ho",
  "artist": "Arijit Singh"
}

Output ONLY this JSON structure with no additional text:
{
  "song": "Song Title",
  "artist": "Singer Name(s)"
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

      // Search for music video on YouTube
      console.log('  🔍 Searching YouTube for video...');
      const youtubeResult = await this.youtubeService.searchSong(
        association.artist,
        association.song,
        association.movie,
        association.language,
        association.year
      );

      if (youtubeResult && youtubeResult.videoId) {
        // Generate random start time (skip first 10% and last 10% of video)
        const duration = youtubeResult.duration || 180;
        const minStart = Math.floor(duration * 0.1);
        const maxStart = Math.floor(duration * 0.5); // Start within first 50% of video
        const randomStart = Math.floor(Math.random() * (maxStart - minStart)) + minStart;

        association.youtubeVideoId = youtubeResult.videoId;
        association.youtubeTitle = youtubeResult.title;
        association.youtubeChannel = youtubeResult.channelTitle;
        association.startTime = randomStart;
        association.duration = duration;

        console.log(`  ✅ Found on YouTube: ${youtubeResult.channelTitle} (start at ${randomStart}s)`);
        return association;
      } else {
        console.log(`❌ No YouTube video found for: ${association.artist} - ${association.song}`);

        // Retry with a different song if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          console.log(`   🔄 Retry ${retryCount + 1}/${maxRetries}: Generating different song from same movie...`);
          // Add this song to used songs to avoid regenerating it
          usedSongs.push(association.song);
          return await this.generateSongFromMovie(movieEntry, usedSongs, config, retryCount + 1);
        } else {
          console.warn(`   ⚠️  Max retries reached. Returning song without video.`);
          association.youtubeVideoId = null;
          return association;
        }
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
        youtubeVideoId: null,
        startTime: 0
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
