const Anthropic = require('@anthropic-ai/sdk');

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
   * Generate a song association for a given number
   * Returns { number, song, artist, clue, year }
   */
  async generateSongAssociation(number, usedSongs = []) {
    const usedSongsText = usedSongs.length > 0
      ? `\n\nAlready used songs (do NOT suggest these): ${usedSongs.join(', ')}`
      : '';

    const prompt = `Generate a song association for the number ${number} for a music bingo game.

The association should be creative and can use:
- Release year that corresponds to the number (e.g., for 85, songs from 1985 or 2085)
- A mathematical equation involving the artist's name (e.g., "Base 10 + first letter of artist's first name where A=1, B=2, etc.")
- Song duration, chart position, or other numerical attributes
- Creative wordplay or numerical references in the title

Requirements:
- Choose a well-known, popular song that most people would recognize
- The song should be available on YouTube
- Provide a clear clue/equation that players can solve to get the number ${number}
- Make it fun and engaging!${usedSongsText}

Respond in JSON format:
{
  "number": ${number},
  "song": "Song Title",
  "artist": "Artist Name",
  "clue": "The clue or equation (e.g., 'Released in 19__ + 0' or 'Base 75 + first letter of artist (B=2)')",
  "year": 1985,
  "youtubeSearch": "Artist Name - Song Title"
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

      // Extract JSON from response (handle markdown code blocks)
      let jsonText = responseText;
      if (responseText.includes('```json')) {
        jsonText = responseText.split('```json')[1].split('```')[0].trim();
      } else if (responseText.includes('```')) {
        jsonText = responseText.split('```')[1].split('```')[0].trim();
      }

      const association = JSON.parse(jsonText);
      return association;
    } catch (error) {
      console.error('Error generating song association:', error);

      // Fallback to simple year-based association
      return {
        number: number,
        song: `Song from ${1900 + number}`,
        artist: 'Various Artists',
        clue: `Released in ${1900 + number}`,
        year: 1900 + number,
        youtubeSearch: `top hits ${1900 + number}`
      };
    }
  }

  /**
   * Generate multiple song associations for a game
   */
  async generateGameSongs(count = 75) {
    const songs = [];
    const usedSongs = [];

    // Generate numbers 1-75 in random order
    const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
    this.shuffleArray(numbers);

    // Generate songs for first 'count' numbers
    for (let i = 0; i < Math.min(count, 75); i++) {
      console.log(`Generating song ${i + 1}/${count}...`);

      const song = await this.generateSongAssociation(numbers[i], usedSongs);
      songs.push(song);
      usedSongs.push(`${song.artist} - ${song.song}`);

      // Small delay to avoid rate limiting
      await this.sleep(1000);
    }

    return songs;
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
