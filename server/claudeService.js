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
- You can use ANY combination of: Male Singer, Female Singer, Music Director, Lead Male Actor, Lead Female Actor
- The clue should VARY from song to song - BE VERY CREATIVE!
- You can use ALPHABET VALUES: First letter of a name = position in alphabet (A=1, B=2, ... Z=26)

CREATIVE CLUE PATTERNS (use different ones for variety):
1. Direct person values:
   * "Male Singer + Female Singer"
   * "Lead Male Actor + Lead Female Actor"
   * "Lead Male Actor + Male Singer"
   * "Music Director + Female Singer"
   * "Lead Female Actor + Music Director + Male Singer"

2. Alphabet-based clues (VERY CREATIVE):
   * "First letter of Lead Male Actor's first name + Lead Female Actor" (if Shah Rukh Khan, S=19)
   * "First letter of Male Singer's last name + Lead Male Actor"
   * "First letter of Music Director's name + Male Singer + Female Singer"
   * "Lead Male Actor + First letter of Lead Female Actor's first name"

3. Mixed combinations:
   * "Music Director + First letter of Male Singer's first name + Lead Female Actor"
   * "Lead Male Actor + Lead Female Actor + First letter of Movie name"

IMPORTANT RULES:
1. VERIFY YOUR MATH: The calculation MUST equal ${number} exactly!
2. If music director is a pair (e.g., "Jatin-Lalit", "Vishal-Shekhar", "Sajid-Wajid"), DO NOT use them in the clue. Use only solo music directors.
3. Use proper terminology: "Lead Male Actor", "Lead Female Actor", "Male Singer", "Female Singer", "Music Director"
4. When using alphabet values, clearly state which letter you're using in the clue
5. CRITICAL - ONLY FAMOUS ACTORS AND BLOCKBUSTERS:
   * Choose songs ONLY from BLOCKBUSTER movies with massive commercial success
   * Use ONLY A-list, superstar actors that everyone knows (e.g., Shah Rukh Khan, Salman Khan, Aamir Khan, Hrithik Roshan, Ranbir Kapoor, Deepika Padukone, Priyanka Chopra, Kareena Kapoor, Katrina Kaif, Alia Bhatt)
   * Avoid lesser-known or regional actors - stick to pan-India megastars
   * Movies should be major hits that broke box office records or became cultural phenomena
   * Prefer iconic songs that everyone remembers and sings along to
6. Choose ONLY popular, mainstream, chart-topping ${languageText} songs that most people would recognize
7. The song must be from ${startYear} to ${endYear}
8. Names must be in English/romanized format ONLY${usedSongsText}${baseValuesText}

Example 1 (Direct):
Target: 45, Song: "Tum Hi Ho" from Aashiqui 2 (2013)
- Male Singer: Arijit Singh (25)
- Lead Male Actor: Aditya Roy Kapur (20)
Clue: "Male Singer + Lead Male Actor"
Calculation: "25 + 20"
Verification: 25 + 20 = 45 ✓

Example 2 (Alphabet):
Target: 39, Song: "Chaiyya Chaiyya" from Dil Se (1998)
- Male Singer: Sukhwinder Singh (20)
- First letter of Lead Male Actor "Shah Rukh Khan" = S = 19
Clue: "Male Singer + First letter of Lead Male Actor's first name"
Calculation: "20 + 19"
Verification: 20 + 19 = 39 ✓
Entities: [
  {"name": "Sukhwinder Singh", "role": "Male Singer", "baseValue": 20},
  {"name": "Shah Rukh Khan", "role": "Lead Male Actor", "baseValue": 19}
]

Example 3 (Mixed):
Target: 50, Song: "Tum Se Hi" from Jab We Met (2007)
- Lead Male Actor: Shahid Kapoor (30)
- Lead Female Actor: Kareena Kapoor (15)
- First letter of Movie "Jab We Met" = J = 10
Clue: "Lead Male Actor + Lead Female Actor - First letter of Movie name"
Calculation: "30 + 15 - 10"
Verification: 30 + 15 - 10 = 35... WRONG! Must recalculate.
Corrected: Lead Male Actor (35) + Lead Female Actor (15) = 50 ✓

Output ONLY this JSON structure with no additional text:
{
  "number": ${number},
  "song": "Song Title",
  "artist": "Singer Name(s)",
  "movie": "Movie Name",
  "actors": ["Lead Male Actor Name", "Lead Female Actor Name"],
  "musicDirector": "Music Director Name (null if paired like Jatin-Lalit)",
  "clue": "Description of equation using proper terminology",
  "year": 2013,
  "entities": [
    {"name": "Person Name", "role": "Lead Male Actor|Lead Female Actor|Male Singer|Female Singer|Music Director", "baseValue": 25}
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

      // Validate that the calculation equals the target number
      if (association.calculation) {
        try {
          // Safely evaluate the calculation
          const result = eval(association.calculation);
          if (result !== number) {
            console.warn(`⚠️  Calculation mismatch: ${association.calculation} = ${result}, expected ${number}`);
            console.warn(`   Song: "${association.song}" - Regenerating with corrected values...`);

            // Attempt to fix by adjusting the last entity's value
            if (association.entities && association.entities.length > 0) {
              const diff = number - result;
              const lastEntity = association.entities[association.entities.length - 1];
              const oldValue = lastEntity.baseValue;
              lastEntity.baseValue += diff;

              // Update calculation string
              const parts = association.calculation.split(/[\+\-\*\/]/).map(p => p.trim());
              parts[parts.length - 1] = lastEntity.baseValue.toString();
              association.calculation = association.calculation.replace(/\d+(?!.*\d)/, lastEntity.baseValue);

              console.log(`   ✓ Fixed: Adjusted ${lastEntity.name} from ${oldValue} to ${lastEntity.baseValue}`);
              console.log(`   ✓ New calculation: ${association.calculation} = ${number}`);
            }
          } else {
            console.log(`  ✓ Calculation verified: ${association.calculation} = ${number}`);
          }
        } catch (error) {
          console.warn(`⚠️  Could not validate calculation: ${association.calculation}`);
        }
      }

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
