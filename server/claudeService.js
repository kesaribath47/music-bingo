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
   * Generate a song association for a given number using specified language songs
   * with actor/singer base values
   * Returns { number, song, artist, clue, year, entities, calculation }
   */
  async generateSongAssociation(number, usedSongs = [], baseValues = {}, config = {}) {
    const { startYear = 1990, endYear = 2024, languages = ['Hindi', 'Kannada'] } = config;
    const usedSongsText = usedSongs.length > 0
      ? `\n\nAlready used songs (do NOT suggest these): ${usedSongs.join(', ')}`
      : '';

    const baseValuesText = Object.keys(baseValues).length > 0
      ? `\n\nExisting base values for actors/singers:\n${JSON.stringify(baseValues, null, 2)}\nYou MUST use these exact base values if you use any of these people. For new people, assign unused values between 1-75.`
      : '';

    const languageText = languages.length > 0 ? languages.join(' or ') : 'any language';

    const prompt = `IMPORTANT: Respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or additional commentary. Only output the JSON object.

Generate a ${languageText} song association for the number ${number} for a music bingo game.

The clue should be a mathematical equation using base values assigned to the ACTUAL people involved in THIS SPECIFIC SONG.

CRITICAL - CLUE VARIATION RULES:
- The clue MUST be based on the real people involved in this specific song
- You can use ANY combination of: Playback Singer(s), Music Director, Lead Actor(s), Lead Actress(es)
- The clue should VARY from song to song - don't always use the same pattern
- Examples of valid clue patterns:
  * "Male Singer + Female Singer" (e.g., Arijit Singh + Shreya Ghoshal)
  * "Lead Actor + Lead Actress" (e.g., Shah Rukh Khan + Kajol)
  * "Lead Actor + Male Singer" (e.g., Hrithik Roshan + Udit Narayan)
  * "Music Director + Female Singer" (e.g., A.R. Rahman + Alka Yagnik)
  * "Lead Actress + Music Director + Male Singer" (e.g., for three-way combinations)
  * "Music Director × 2 + Lead Actor" (e.g., if using same person twice)
  * Any other creative combination that adds up to the target number

Example 1:
- Target: 45, Song: "Tum Hi Ho" by Arijit Singh from Aashiqui 2 (2013)
- Lead Actor: Aditya Roy Kapur (25), Lead Actress: Shraddha Kapoor (20)
- Clue: "Lead Actor + Lead Actress" (25 + 20 = 45)

Example 2:
- Target: 60, Song: "Chaiyya Chaiyya" by Sukhwinder Singh from Dil Se (1998)
- Music Director: A.R. Rahman (30), Male Singer: Sukhwinder Singh (30)
- Clue: "Music Director + Male Singer" (30 + 30 = 60)

Example 3:
- Target: 72, Song: "Channa Mereya" by Arijit Singh from Ae Dil Hai Mushkil (2016)
- Lead Actor: Ranbir Kapoor (40), Male Singer: Arijit Singh (20), Music Director: Pritam (12)
- Clue: "Lead Actor + Male Singer + Music Director" (40 + 20 + 12 = 72)

Requirements:
- Choose ONLY ${languageText} film songs
- The song must be from the year range ${startYear} to ${endYear}
- Include the movie name in the response
- CRITICAL: Select ONLY popular, mainstream, chart-topping songs that most people would recognize
- Avoid obscure, esoteric, or niche songs - stick to widely known hits and blockbuster movie songs
- Prefer songs from successful films and popular artists with mass appeal
- The sum of the base values must equal ${number}
- Assign base values (1-75) to each person involved
- BE CREATIVE with clues - vary the combination of people used
- CRITICAL: Song title, artist names, and movie name MUST be in English/romanized format ONLY (no Devanagari, Kannada, or other non-Latin scripts)
- Example: Use "Tum Hi Ho" NOT "तुम ही हो", use "Arijit Singh" NOT "अरिजीत सिंह"${usedSongsText}${baseValuesText}

Output ONLY this JSON structure with no additional text:
{
  "number": ${number},
  "song": "Song Title in English/Romanized (e.g., 'Tum Hi Ho', 'Badtameez Dil')",
  "artist": "Singer Name(s) in English (e.g., 'Arijit Singh', 'Shreya Ghoshal')",
  "movie": "Movie Name in English/Romanized (e.g., 'Aashiqui 2', 'Yeh Jawaani Hai Deewani')",
  "actors": ["Lead Actor Name", "Lead Actress Name"],
  "musicDirector": "Music Director Name (if used in calculation)",
  "clue": "Description of the equation (e.g., 'Lead Actor + Music Director + Male Singer')",
  "year": 2013,
  "entities": [
    {"name": "Aditya Roy Kapur", "role": "Lead Actor", "baseValue": 25},
    {"name": "Shraddha Kapoor", "role": "Lead Actress", "baseValue": 20}
  ],
  "calculation": "25 + 20"
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

      // Search TMDb for movie information to enrich entities with images
      if (association.movie) {
        const movieData = await this.imdbService.searchMovie(association.movie, association.year);

        if (movieData) {
          console.log(`  📽️  Enriching entities with TMDb data...`);

          // Create a map of people from TMDb for easy lookup
          const tmdbPeople = new Map();

          // Add actors
          if (movieData.leadActors) {
            movieData.leadActors.forEach(actor => {
              tmdbPeople.set(actor.name.toLowerCase(), {
                image: actor.profileImage,
                type: 'actor'
              });
            });
          }

          // Add music directors
          if (movieData.musicDirectors && movieData.musicDirectors.length > 0) {
            movieData.musicDirectors.forEach(md => {
              tmdbPeople.set(md.name.toLowerCase(), {
                image: md.profileImage,
                type: 'music_director'
              });
            });
          }

          // Enrich entities with images from TMDb
          if (association.entities) {
            for (const entity of association.entities) {
              const personData = tmdbPeople.get(entity.name.toLowerCase());

              if (personData && personData.image) {
                entity.imageUrl = personData.image;
                console.log(`    ✓ Added image for ${entity.name}`);
              } else if (entity.role.toLowerCase().includes('singer')) {
                // For singers, try searching TMDb person database
                const singerData = await this.imdbService.searchPerson(entity.name);
                if (singerData && singerData.profileImage) {
                  entity.imageUrl = singerData.profileImage;
                  console.log(`    ✓ Added image for singer ${entity.name}`);
                } else {
                  console.log(`    ⚠️  No image found for ${entity.name}`);
                  entity.imageUrl = null;
                }
              } else {
                console.log(`    ⚠️  No TMDb match for ${entity.name}`);
                entity.imageUrl = null;
              }
            }
          }

          // Add movie poster if available
          if (movieData.posterUrl) {
            association.moviePoster = movieData.posterUrl;
          }
        }
      }

      // Search Deezer for the song to get preview URL
      const deezerResult = await this.deezerService.searchSong(
        association.artist,
        association.song,
        association.year
      );

      if (deezerResult) {
        association.previewUrl = deezerResult.previewUrl;
        association.deezerLink = deezerResult.deezerLink;
        association.albumCover = deezerResult.albumCover;
      } else {
        console.log(`No Deezer preview found for: ${association.artist} - ${association.song}`);
        association.previewUrl = null;
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
        previewUrl: null,
        deezerLink: null,
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
   * @param {object} config - Optional config with startYear, endYear, languages
   */
  async generateGameSongs(count = 75, progressCallback = null, existingData = null, config = {}) {
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
      const song = await this.generateSongAssociation(availableNumbers[i], usedSongs, baseValues, config);
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
