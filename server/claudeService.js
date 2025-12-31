const Anthropic = require('@anthropic-ai/sdk');
const play = require('play-dl');

/**
 * Service to generate song-number associations using Claude API
 */
class ClaudeService {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey
    });
  }

  /**
   * Search YouTube for a song and get the video ID
   */
  async searchYouTube(searchQuery) {
    try {
      const results = await play.search(searchQuery, { limit: 1, source: { youtube: 'video' } });
      if (results && results.length > 0) {
        const videoUrl = results[0].url;
        const videoId = videoUrl.split('v=')[1]?.split('&')[0];
        return videoId;
      }
    } catch (error) {
      console.error('YouTube search error:', error.message);
    }
    return null;
  }

  /**
   * Generate a song association for a given number using Kannada/Hindi songs
   * with actor/singer base values
   * Returns { number, song, artist, clue, year, entities, calculation }
   */
  async generateSongAssociation(number, usedSongs = [], baseValues = {}) {
    const usedSongsText = usedSongs.length > 0
      ? `\n\nAlready used songs (do NOT suggest these): ${usedSongs.join(', ')}`
      : '';

    const baseValuesText = Object.keys(baseValues).length > 0
      ? `\n\nExisting base values for actors/singers:\n${JSON.stringify(baseValues, null, 2)}\nYou MUST use these exact base values if you use any of these people. For new people, assign unused values between 1-75.`
      : '';

    const prompt = `IMPORTANT: Respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or additional commentary. Only output the JSON object.

Generate a Kannada or Hindi song association for the number ${number} for a music bingo game.

The clue should be a mathematical equation using base values assigned to actors and singers.

For example:
- If the target number is 45, and Ranbir Kapoor has base value 40, Deepika Padukone has base value 5:
  Clue: "Lead Actor + Lead Actress" (40 + 5 = 45)
- If the target number is 30, and Arijit Singh has value 15, Shreya Ghoshal has value 15:
  Clue: "Male Singer + Female Singer" (15 + 15 = 30)

Requirements:
- Choose ONLY Kannada or Hindi film songs
- The song must be well-known and popular
- Use lead actors/actresses OR playback singers (or both) to create the math equation
- The sum of the base values must equal ${number}
- Assign base values (1-75) to each person involved
- The song should be available on YouTube${usedSongsText}${baseValuesText}

Output ONLY this JSON structure with no additional text:
{
  "number": ${number},
  "song": "Song Title (in English or native script)",
  "artist": "Singer Name(s)",
  "actors": ["Lead Actor Name", "Lead Actress Name"],
  "clue": "Description of the equation (e.g., 'Lead Actor + Lead Actress')",
  "year": 2013,
  "youtubeSearch": "Artist/Actor Name - Song Title",
  "entities": [
    {"name": "Ranbir Kapoor", "role": "Lead Actor", "baseValue": 40},
    {"name": "Deepika Padukone", "role": "Lead Actress", "baseValue": 5}
  ],
  "calculation": "40 + 5"
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

      // Update base values with new entities
      if (association.entities) {
        association.entities.forEach(entity => {
          baseValues[entity.name] = entity.baseValue;
        });
      }

      // Search YouTube for the song to get video ID
      if (association.youtubeSearch) {
        const videoId = await this.searchYouTube(association.youtubeSearch);
        association.youtubeVideoId = videoId;
      }

      return association;
    } catch (error) {
      console.error('Error generating song association:', error);

      // Fallback to simple association
      const fallbackValue1 = Math.floor(number / 2);
      const fallbackValue2 = number - fallbackValue1;

      return {
        number: number,
        song: `Hindi Song ${number}`,
        artist: 'Various Artists',
        actors: [],
        clue: `Value 1 + Value 2`,
        year: 2020,
        youtubeSearch: `hindi songs ${2020}`,
        youtubeVideoId: null,
        entities: [
          { name: 'Person A', role: 'Actor', baseValue: fallbackValue1 },
          { name: 'Person B', role: 'Actor', baseValue: fallbackValue2 }
        ],
        calculation: `${fallbackValue1} + ${fallbackValue2}`
      };
    }
  }

  /**
   * Generate multiple song associations for a game
   * @param {number} count - Number of songs to generate
   * @param {function} progressCallback - Optional callback(current, total) for progress updates
   * @param {object} existingData - Optional existing songs and baseValues to continue from
   */
  async generateGameSongs(count = 75, progressCallback = null, existingData = null) {
    const songs = existingData?.songs || [];
    const usedSongs = existingData?.usedSongs || [];
    const baseValues = existingData?.baseValues || {};

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
      const song = await this.generateSongAssociation(availableNumbers[i], usedSongs, baseValues);
      songs.push(song);
      usedSongs.push(`${song.artist} - ${song.song}`);

      // Report progress if callback provided
      if (progressCallback) {
        progressCallback(i + 1, songsToGenerate);
      }

      // Small delay to avoid rate limiting
      await this.sleep(1000);
    }

    return { songs, baseValues, usedSongs };
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
