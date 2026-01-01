/**
 * Predefined lists of popular Bollywood and Kannada movies
 * Used for instant movie generation without API calls
 */

const hindiMovies = [
  { movie: "Dilwale Dulhania Le Jayenge", year: 1995, language: "Hindi" },
  { movie: "Kuch Kuch Hota Hai", year: 1998, language: "Hindi" },
  { movie: "Kabhi Khushi Kabhie Gham", year: 2001, language: "Hindi" },
  { movie: "Dil To Pagal Hai", year: 1997, language: "Hindi" },
  { movie: "Hum Aapke Hain Koun", year: 1994, language: "Hindi" },
  { movie: "3 Idiots", year: 2009, language: "Hindi" },
  { movie: "PK", year: 2014, language: "Hindi" },
  { movie: "Dangal", year: 2016, language: "Hindi" },
  { movie: "Bajrangi Bhaijaan", year: 2015, language: "Hindi" },
  { movie: "Sultan", year: 2016, language: "Hindi" },
  { movie: "Kal Ho Naa Ho", year: 2003, language: "Hindi" },
  { movie: "Veer-Zaara", year: 2004, language: "Hindi" },
  { movie: "Jab Tak Hai Jaan", year: 2012, language: "Hindi" },
  { movie: "Yeh Jawaani Hai Deewani", year: 2013, language: "Hindi" },
  { movie: "Chennai Express", year: 2013, language: "Hindi" },
  { movie: "Krrish", year: 2006, language: "Hindi" },
  { movie: "Don", year: 2006, language: "Hindi" },
  { movie: "Ra.One", year: 2011, language: "Hindi" },
  { movie: "Student of the Year", year: 2012, language: "Hindi" },
  { movie: "Ae Dil Hai Mushkil", year: 2016, language: "Hindi" },
  { movie: "Rockstar", year: 2011, language: "Hindi" },
  { movie: "Barfi!", year: 2012, language: "Hindi" },
  { movie: "Aashiqui 2", year: 2013, language: "Hindi" },
  { movie: "Ek Tha Tiger", year: 2012, language: "Hindi" },
  { movie: "Tiger Zinda Hai", year: 2017, language: "Hindi" },
  { movie: "War", year: 2019, language: "Hindi" },
  { movie: "Pathaan", year: 2023, language: "Hindi" },
  { movie: "Jawan", year: 2023, language: "Hindi" },
  { movie: "Kabir Singh", year: 2019, language: "Hindi" },
  { movie: "Chhichhore", year: 2019, language: "Hindi" },
  { movie: "Gully Boy", year: 2019, language: "Hindi" },
  { movie: "Raazi", year: 2018, language: "Hindi" },
  { movie: "Padmaavat", year: 2018, language: "Hindi" },
  { movie: "Sanju", year: 2018, language: "Hindi" },
  { movie: "Andhadhun", year: 2018, language: "Hindi" },
  { movie: "Uri", year: 2019, language: "Hindi" },
  { movie: "Article 15", year: 2019, language: "Hindi" },
  { movie: "Zindagi Na Milegi Dobara", year: 2011, language: "Hindi" },
  { movie: "Dil Chahta Hai", year: 2001, language: "Hindi" },
  { movie: "Lagaan", year: 2001, language: "Hindi" },
  { movie: "Taare Zameen Par", year: 2007, language: "Hindi" },
  { movie: "Rang De Basanti", year: 2006, language: "Hindi" },
  { movie: "Swades", year: 2004, language: "Hindi" },
  { movie: "Chak De India", year: 2007, language: "Hindi" },
  { movie: "Queen", year: 2014, language: "Hindi" },
  { movie: "Pink", year: 2016, language: "Hindi" },
  { movie: "Tanu Weds Manu", year: 2011, language: "Hindi" },
  { movie: "2 States", year: 2014, language: "Hindi" },
  { movie: "Cocktail", year: 2012, language: "Hindi" },
  { movie: "YJHD", year: 2013, language: "Hindi" }
];

const kannadaMovies = [
  { movie: "KGF Chapter 1", year: 2018, language: "Kannada" },
  { movie: "KGF Chapter 2", year: 2022, language: "Kannada" },
  { movie: "Kirik Party", year: 2016, language: "Kannada" },
  { movie: "Mungaru Male", year: 2006, language: "Kannada" },
  { movie: "Ugramm", year: 2014, language: "Kannada" },
  { movie: "Raajakumara", year: 2017, language: "Kannada" },
  { movie: "Mufti", year: 2017, language: "Kannada" },
  { movie: "Tagaru", year: 2018, language: "Kannada" },
  { movie: "Ond Kathe Hella", year: 2019, language: "Kannada" },
  { movie: "Dia", year: 2020, language: "Kannada" },
  { movie: "Avane Srimannarayana", year: 2019, language: "Kannada" },
  { movie: "Gaalipata", year: 2008, language: "Kannada" },
  { movie: "Jackie", year: 2010, language: "Kannada" },
  { movie: "Googly", year: 2013, language: "Kannada" },
  { movie: "Masterpiece", year: 2015, language: "Kannada" },
  { movie: "Ricky", year: 2016, language: "Kannada" },
  { movie: "Godhi Banna Sadharana Mykattu", year: 2016, language: "Kannada" },
  { movie: "Thithi", year: 2015, language: "Kannada" },
  { movie: "U Turn", year: 2016, language: "Kannada" },
  { movie: "Birbal Trilogy", year: 2019, language: "Kannada" },
  { movie: "Lucia", year: 2013, language: "Kannada" },
  { movie: "RangiTaranga", year: 2015, language: "Kannada" },
  { movie: "Ulidavaru Kandanthe", year: 2014, language: "Kannada" },
  { movie: "Kiragoorina Gayyaligalu", year: 2016, language: "Kannada" },
  { movie: "Kavaludaari", year: 2019, language: "Kannada" }
];

/**
 * Shuffle array helper function
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = {
  hindiMovies,
  kannadaMovies,

  /**
   * Generate 50 movies instantly by selecting from predefined lists
   * @param {Array} languages - Array of languages ['Hindi', 'Kannada']
   * @param {Number} startYear - Start year for filtering (optional)
   * @param {Number} endYear - End year for filtering (optional)
   * @returns {Array} - Array of 50 movies numbered 1-50
   */
  generateInstantMovieList(languages, startYear = null, endYear = null) {
    let selectedMovies = [];

    // Filter movies by year range if specified
    const filterByYear = (movies) => {
      if (!startYear && !endYear) return movies;
      return movies.filter(m => {
        if (startYear && m.year < startYear) return false;
        if (endYear && m.year > endYear) return false;
        return true;
      });
    };

    const filteredHindi = filterByYear(hindiMovies);
    const filteredKannada = filterByYear(kannadaMovies);

    // If both languages selected, mix them evenly
    if (languages.includes('Hindi') && languages.includes('Kannada')) {
      // Take 25 Hindi and 25 Kannada
      const shuffledHindi = shuffleArray([...filteredHindi]);
      const shuffledKannada = shuffleArray([...filteredKannada]);

      const hindiPart = shuffledHindi.slice(0, 25);
      const kannadaPart = shuffledKannada.slice(0, 25);

      // Interleave them for variety
      for (let i = 0; i < 25; i++) {
        if (hindiPart[i]) selectedMovies.push(hindiPart[i]);
        if (kannadaPart[i]) selectedMovies.push(kannadaPart[i]);
      }
    } else if (languages.includes('Hindi')) {
      // Only Hindi
      const shuffled = shuffleArray([...filteredHindi]);
      selectedMovies = shuffled.slice(0, 50);
    } else if (languages.includes('Kannada')) {
      // Only Kannada - repeat if needed
      const shuffled = shuffleArray([...filteredKannada]);
      while (selectedMovies.length < 50) {
        selectedMovies.push(...shuffled);
      }
      selectedMovies = selectedMovies.slice(0, 50);
    } else if (languages.includes('English')) {
      // For now, use Hindi movies
      const shuffled = shuffleArray([...filteredHindi]);
      selectedMovies = shuffled.slice(0, 50);
    }

    // Shuffle the final list
    selectedMovies = shuffleArray(selectedMovies);

    // Assign numbers 1-50
    return selectedMovies.map((movie, index) => ({
      number: index + 1,
      ...movie,
      actors: [] // Will be populated when generating songs
    }));
  },

  /**
   * Shuffle array (kept for backward compatibility)
   */
  shuffleArray
};
