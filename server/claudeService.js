const Anthropic = require('@anthropic-ai/sdk');
const DeezerService = require('./deezerService');
const IMDbService = require('./imdbService');

/**
 * Service to generate song-number associations using Claude API
 */
class ClaudeService {
  constructor(apiKey, tmdbApiKey = null) {
    this.client = new Anthropic({
      apiKey: apiKey
    });
    this.deezerService = new DeezerService();
    this.imdbService = new IMDbService(tmdbApiKey);
  }

  /**
   * Generate a song association for a given number
   * Returns { number, song, artist, movie, year, language }
   */
  async generateSongAssociation(number, usedSongs = [], baseValues = {}, config = {}, retryCount = 0) {
    const maxRetries = 5; // Try up to 5 times to find a song with preview
    const { startYear = 1990, endYear = 2024, languages = ['Hindi', 'Kannada'] } = config;
    const usedSongsText = usedSongs.length > 0
      ? `\n\nAlready used songs (do NOT suggest these): ${usedSongs.join(', ')}`
      : '';

    // Build strict language filter
    const languageText = languages.length > 0 ? languages.join(' or ') : 'any language';
    const languageFilter = languages.length > 0
      ? `\n\nCRITICAL LANGUAGE REQUIREMENT: The song MUST be in EXACTLY one of these languages: ${languages.join(', ')}. Do NOT use Tamil, Telugu, or any other language. ONLY ${languages.join(' or ')}!`
      : '';

    const prompt = `IMPORTANT: Respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or additional commentary. Only output the JSON object.

Generate a ${languageText} song for the number ${number} for a music bingo game.

REQUIREMENTS:
1. Choose a BLOCKBUSTER movie with massive commercial success and box office records
2. Choose an ICONIC, chart-topping song that everyone remembers and sings along to
3. ONLY A-LIST MEGASTARS:

   For Hindi movies - ONLY these actors:
   * Male: Shah Rukh Khan, Salman Khan, Aamir Khan, Hrithik Roshan, Akshay Kumar, Ranbir Kapoor, Ranveer Singh, Varun Dhawan
   * Female: Deepika Padukone, Priyanka Chopra, Kareena Kapoor, Katrina Kaif, Alia Bhatt, Anushka Sharma, Kajol, Madhuri Dixit, Aishwarya Rai

   For Kannada movies - ONLY these actors:
   * Male: Yash, Sudeep, Puneeth Rajkumar, Shiva Rajkumar, Upendra, Darshan
   * Female: Rashmika Mandanna, Radhika Pandit, Ramya, Rachita Ram

4. The song must be from ${startYear} to ${endYear}
5. Names must be in English/romanized format ONLY${languageFilter}${usedSongsText}

Example Output:
{
  "number": ${number},
  "song": "Tum Hi Ho",
  "artist": "Arijit Singh",
  "movie": "Aashiqui 2",
  "actors": ["Aditya Roy Kapur", "Shraddha Kapoor"],
  "year": 2013,
  "language": "Hindi"
}

Output ONLY this JSON structure with no additional text:
{
  "number": ${number},
  "song": "Song Title",
  "artist": "Singer Name(s)",
  "movie": "Movie Name",
  "actors": ["Lead Male Actor Name", "Lead Female Actor Name"],
  "year": 2013,
  "language": "Hindi or Kannada"
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

      const association = JSON.parse(jsonText);

      // Validate language match
      if (association.language && languages.length > 0) {
        const languageMatch = languages.some(lang =>
          association.language.toLowerCase() === lang.toLowerCase()
        );

        if (!languageMatch) {
          console.warn(`⚠️  Language mismatch: Got ${association.language}, expected one of ${languages.join(', ')}`);
          console.warn(`   Retrying to get correct language...`);

          if (retryCount < maxRetries) {
            usedSongs.push(`${association.artist} - ${association.song}`);
            return await this.generateSongAssociation(number, usedSongs, baseValues, config, retryCount + 1);
          }
        }
      }

      console.log(`  ✓ Generated: "${association.song}" from ${association.movie} (${association.year}) - ${association.language}`);

      // Search for music preview using Deezer
      console.log('  🔍 Searching Deezer for preview...');
      const musicResult = await this.deezerService.searchSong(
        association.artist,
        association.song,
        association.year
      );

      if (musicResult && musicResult.previewUrl) {
        association.previewUrl = musicResult.previewUrl;
        association.musicLink = musicResult.deezerLink;
        association.albumCover = musicResult.albumCover;
        console.log(`  ✅ Found preview on Deezer`);
        return association;
      } else {
        console.log(`❌ No preview found on any service for: ${association.artist} - ${association.song}`);

        // Retry with a different song if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          console.log(`   🔄 Retry ${retryCount + 1}/${maxRetries}: Generating different song...`);
          // Add this song to used songs to avoid regenerating it
          usedSongs.push(`${association.artist} - ${association.song}`);
          return await this.generateSongAssociation(number, usedSongs, baseValues, config, retryCount + 1);
        } else {
          console.warn(`   ⚠️  Max retries reached. Returning song without preview.`);
          association.previewUrl = null;
          return association;
        }
      }
    } catch (error) {
      console.error('Error generating song association:', error);

      // Fallback to simple association
      return {
        number: number,
        song: `Song ${number}`,
        artist: 'Various Artists',
        movie: `Movie ${number}`,
        actors: [],
        year: 2020,
        language: languages[0] || 'Hindi',
        previewUrl: null,
        deezerLink: null
      };
    }
  }

  /**
   * Generate multiple song associations for a game
   * @param {number} count - Number of songs to generate
   * @param {function} progressCallback - Optional callback(current, total) for progress updates
   * @param {object} existingData - Optional existing songs to continue from
   * @param {object} config - Optional config with startYear, endYear, languages
   */
  async generateGameSongs(count = 75, progressCallback = null, existingData = null, config = {}) {
    const songs = existingData?.songs || [];
    const usedSongs = existingData?.usedSongs || [];

    // Generate numbers 1-75 in random order
    const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
    this.shuffleArray(numbers);

    // Filter out numbers already used
    const availableNumbers = numbers.filter(num =>
      !songs.some(song => song.number === num)
    );

    // Generate songs for first 'count' numbers
    const songsToGenerate = Math.min(count, availableNumbers.length);
    for (let i = 0; i < songsToGenerate; i++) {
      const song = await this.generateSongAssociation(availableNumbers[i], usedSongs, {}, config);
      songs.push(song);
      usedSongs.push(`${song.artist} - ${song.song}`);

      // Report progress if callback provided
      if (progressCallback) {
        progressCallback(i + 1, songsToGenerate);
      }

      // Small delay to avoid rate limiting
      await this.sleep(1000);
    }

    return { songs, usedSongs };
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
