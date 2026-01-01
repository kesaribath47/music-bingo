const Anthropic = require('@anthropic-ai/sdk');
const YouTubeService = require('./youtubeService');
const IMDbService = require('./imdbService');

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
   * Generate a list of movies numbered 1-N
   * Returns array of { number, movie, year, language, actors }
   */
  async generateMovieList(count = 50, config = {}, progressCallback = null) {
    const { startYear = 1990, endYear = 2024, languages = ['Hindi', 'Kannada'] } = config;
    const movies = [];

    console.log(`\n🎬 Generating ${count} movies for the game...`);

    for (let i = 1; i <= count; i++) {
      const movie = await this.generateSingleMovie(i, movies.map(m => m.movie), config);
      if (movie) {
        movies.push(movie);
        console.log(`  ${i}/${count} - ${movie.movie} (${movie.year}) - ${movie.language}`);
      }

      // Report progress if callback provided
      if (progressCallback) {
        progressCallback(i, count);
      }

      // Small delay to avoid rate limiting
      await this.sleep(800);
    }

    return movies;
  }

  /**
   * Generate a single movie entry
   */
  async generateSingleMovie(number, usedMovies = [], config = {}, retryCount = 0) {
    const maxRetries = 3;
    const { startYear = 1990, endYear = 2024, languages = ['Hindi', 'Kannada'] } = config;

    const usedMoviesText = usedMovies.length > 0
      ? `\n\nAlready used movies (do NOT suggest these): ${usedMovies.join(', ')}`
      : '';

    const languageText = languages.length > 0 ? languages.join(' or ') : 'any language';
    const languageFilter = languages.length > 0
      ? `\n\nCRITICAL LANGUAGE REQUIREMENT: The movie MUST be in EXACTLY one of these languages: ${languages.join(', ')}. Do NOT use Tamil, Telugu, or any other language. ONLY ${languages.join(' or ')}!`
      : '';

    const prompt = `IMPORTANT: Respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or additional commentary. Only output the JSON object.

Generate a ${languageText} BLOCKBUSTER movie for number ${number} in a music bingo game.

REQUIREMENTS:
1. Choose a BLOCKBUSTER movie with massive commercial success and box office records
2. Choose an ICONIC movie that everyone remembers
3. ONLY A-LIST MEGASTARS:

   For Hindi movies - ONLY these actors:
   * Male: Shah Rukh Khan, Salman Khan, Aamir Khan, Hrithik Roshan, Akshay Kumar, Ranbir Kapoor, Ranveer Singh, Varun Dhawan
   * Female: Deepika Padukone, Priyanka Chopra, Kareena Kapoor, Katrina Kaif, Alia Bhatt, Anushka Sharma, Kajol, Madhuri Dixit, Aishwarya Rai

   For Kannada movies - ONLY these actors:
   * Male: Yash, Sudeep, Puneeth Rajkumar, Shiva Rajkumar, Upendra, Darshan
   * Female: Rashmika Mandanna, Radhika Pandit, Ramya, Rachita Ram

4. The movie must be from ${startYear} to ${endYear}
5. Names must be in English/romanized format ONLY${languageFilter}${usedMoviesText}

Output ONLY this JSON structure with no additional text:
{
  "number": ${number},
  "movie": "Movie Name",
  "actors": ["Lead Male Actor Name", "Lead Female Actor Name"],
  "year": 2013,
  "language": "Hindi or Kannada"
}`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = message.content[0].text;

      // Extract JSON from response
      let jsonText = responseText.trim();
      if (jsonText.includes('```json')) {
        jsonText = jsonText.split('```json')[1].split('```')[0].trim();
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.split('```')[1].split('```')[0].trim();
      }

      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const movie = JSON.parse(jsonText);

      // Validate language match
      if (movie.language && languages.length > 0) {
        const languageMatch = languages.some(lang =>
          movie.language.toLowerCase() === lang.toLowerCase()
        );

        if (!languageMatch) {
          console.warn(`⚠️  Language mismatch: Got ${movie.language}, expected one of ${languages.join(', ')}`);

          if (retryCount < maxRetries) {
            return await this.generateSingleMovie(number, usedMovies, config, retryCount + 1);
          }
        }
      }

      return movie;
    } catch (error) {
      console.error('Error generating movie:', error);
      return {
        number: number,
        movie: `Movie ${number}`,
        actors: [],
        year: 2020,
        language: languages[0] || 'Hindi'
      };
    }
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
