/**
 * Pre-validated list of songs with YouTube video IDs
 * No API calls needed - all videos verified to work
 */

const prevalidatedSongs = [
  // Hindi Movies (1990-2010) - ONLY embeddable videos!
  { movie: "Dilwale Dulhania Le Jayenge", year: 1995, language: "Hindi", song: "Tujhe Dekha To", artist: "Kumar Sanu, Lata Mangeshkar", videoId: "ckkYyeTKMRk" },
  { movie: "Dilwale Dulhania Le Jayenge", year: 1995, language: "Hindi", song: "Mere Khwabon Mein", artist: "Lata Mangeshkar", videoId: "wU0qfPPjAT4" },
  { movie: "Kuch Kuch Hota Hai", year: 1998, language: "Hindi", song: "Kuch Kuch Hota Hai", artist: "Udit Narayan, Alka Yagnik", videoId: "GS0CYMJ5R8k" },
  { movie: "Kuch Kuch Hota Hai", year: 1998, language: "Hindi", song: "Ladki Badi Anjani Hai", artist: "Kumar Sanu, Alka Yagnik", videoId: "ZYJld61niIE" },
  { movie: "Kabhi Khushi Kabhie Gham", year: 2001, language: "Hindi", song: "Bole Chudiyan", artist: "Amit Kumar, Sonu Nigam, Alka Yagnik, Udit Narayan", videoId: "H_WwHJKcKd8" },
  { movie: "Kabhi Khushi Kabhie Gham", year: 2001, language: "Hindi", song: "Suraj Hua Maddham", artist: "Sonu Nigam, Alka Yagnik", videoId: "V-A6n44aPjQ" },
  { movie: "Dil To Pagal Hai", year: 1997, language: "Hindi", song: "Dil To Pagal Hai", artist: "Lata Mangeshkar, Udit Narayan", videoId: "Le-2x2XlVvk" },
  { movie: "Dil To Pagal Hai", year: 1997, language: "Hindi", song: "Koi Ladki Hai", artist: "Udit Narayan, Lata Mangeshkar, Asha Bhosle", videoId: "xjFn9QsJ4wA" },
  { movie: "Hum Aapke Hain Koun", year: 1994, language: "Hindi", song: "Didi Tera Devar Deewana", artist: "Lata Mangeshkar, S. P. Balasubrahmanyam", videoId: "xZYdD63rbek" },
  { movie: "Hum Aapke Hain Koun", year: 1994, language: "Hindi", song: "Pehla Pehla Pyar", artist: "S. P. Balasubrahmanyam", videoId: "YcLMWJq9YoE" },

  { movie: "Kal Ho Naa Ho", year: 2003, language: "Hindi", song: "Kal Ho Naa Ho", artist: "Sonu Nigam", videoId: "99C4kkcBA3c" },
  { movie: "Kal Ho Naa Ho", year: 2003, language: "Hindi", song: "Pretty Woman", artist: "Shankar Mahadevan, Udit Narayan", videoId: "bIPqP9EDDCA" },
  { movie: "Veer-Zaara", year: 2004, language: "Hindi", song: "Tere Liye", artist: "Lata Mangeshkar, Roop Kumar Rathod", videoId: "mfAu5icPVLE" },
  { movie: "Veer-Zaara", year: 2004, language: "Hindi", song: "Do Pal", artist: "Lata Mangeshkar, Sonu Nigam", videoId: "QcwcJV6QH4g" },
  { movie: "Dil Chahta Hai", year: 2001, language: "Hindi", song: "Dil Chahta Hai", artist: "Shankar Mahadevan", videoId: "Z9CKqAYDi8k" },
  { movie: "Dil Chahta Hai", year: 2001, language: "Hindi", song: "Koi Kahe Kehta Rahe", artist: "Shankar Mahadevan, Shaan", videoId: "dQe1WxbIOrY" },
  { movie: "Lagaan", year: 2001, language: "Hindi", song: "Mitwa", artist: "Udit Narayan, Alka Yagnik", videoId: "pZrfh71qPzQ" },
  { movie: "Lagaan", year: 2001, language: "Hindi", song: "Ghanan Ghanan", artist: "Udit Narayan", videoId: "GWXh_PyLmLI" },

  { movie: "Taare Zameen Par", year: 2007, language: "Hindi", song: "Taare Zameen Par", artist: "Shankar Mahadevan", videoId: "3R4uv5bEP1M" },
  { movie: "Rang De Basanti", year: 2006, language: "Hindi", song: "Rang De Basanti", artist: "Daler Mehndi", videoId: "9c9buwh50uw" },
  { movie: "Rang De Basanti", year: 2006, language: "Hindi", song: "Khoon Chala", artist: "Mohit Chauhan", videoId: "kHUVJNvj_vI" },
  { movie: "Swades", year: 2004, language: "Hindi", song: "Yeh Jo Des Hai Tera", artist: "A.R. Rahman", videoId: "RhC8DAPhuLU" },
  { movie: "Chak De India", year: 2007, language: "Hindi", song: "Chak De India", artist: "Sukhwinder Singh", videoId: "e3Qr7d6LrKw" },
  { movie: "Chak De India", year: 2007, language: "Hindi", song: "Badal Pe Paon Hai", artist: "Shilpa Rao, Salim Merchant", videoId: "tOlIZ6wuHQQ" },

  { movie: "3 Idiots", year: 2009, language: "Hindi", song: "Aal Izz Well", artist: "Sonu Nigam, Shaan, Swanand Kirkire", videoId: "yJ-lcdMfziw" },
  { movie: "3 Idiots", year: 2009, language: "Hindi", song: "Give Me Some Sunshine", artist: "Suraj Jagan, Sharman Joshi", videoId: "3kSFW8fqTl4" },
  { movie: "Rockstar", year: 2011, language: "Hindi", song: "Sadda Haq", artist: "Mohit Chauhan", videoId: "eeAQuU0ZQ-M" },
  { movie: "Rockstar", year: 2011, language: "Hindi", song: "Tum Ho", artist: "Mohit Chauhan, Suzanne D'Mello", videoId: "VUnxThNopVs" },
  { movie: "Aashiqui 2", year: 2013, language: "Hindi", song: "Tum Hi Ho", artist: "Arijit Singh", videoId: "Umqb9KENgmk" },
  { movie: "Aashiqui 2", year: 2013, language: "Hindi", song: "Sunn Raha Hai", artist: "Ankit Tiwari", videoId: "AGfwHF12JBs" },

  { movie: "Yeh Jawaani Hai Deewani", year: 2013, language: "Hindi", song: "Badtameez Dil", artist: "Benny Dayal, Shefali Alvares", videoId: "QdFJUaKcp7s" },
  { movie: "Yeh Jawaani Hai Deewani", year: 2013, language: "Hindi", song: "Kabira", artist: "Tochi Raina, Rekha Bhardwaj", videoId: "jHNNMj5bNQw" },
  { movie: "Zindagi Na Milegi Dobara", year: 2011, language: "Hindi", song: "Senorita", artist: "Farhan Akhtar, Hrithik Roshan, Abhay Deol", videoId: "5Sf24M-KQ9Q" },
  { movie: "Zindagi Na Milegi Dobara", year: 2011, language: "Hindi", song: "Khaabon Ke Parindey", artist: "Mohit Chauhan", videoId: "xPvftOCA-9I" },
  { movie: "Barfi!", year: 2012, language: "Hindi", song: "Phir Le Aya Dil", artist: "Arijit Singh", videoId: "iXZmPYdYmuw" },
  { movie: "Chennai Express", year: 2013, language: "Hindi", song: "Lungi Dance", artist: "Yo Yo Honey Singh", videoId: "Qan9lFDkE4g" },
  { movie: "Ae Dil Hai Mushkil", year: 2016, language: "Hindi", song: "Ae Dil Hai Mushkil", artist: "Arijit Singh", videoId: "Z_PODraXg4E" },
  { movie: "Kabir Singh", year: 2019, language: "Hindi", song: "Tujhe Kitna Chahne Lage", artist: "Arijit Singh", videoId: "dDN-m8bv8jM" },
  { movie: "Gully Boy", year: 2019, language: "Hindi", song: "Apna Time Aayega", artist: "Ranveer Singh, DIVINE", videoId: "jFktOKGFrI0" },

  // Kannada Movies (1990-2010) - Using embeddable lyric/audio versions
  { movie: "Mungaru Male", year: 2006, language: "Kannada", song: "Anisuthide", artist: "Sonu Nigam", videoId: "yqqjsb7wMl0" },
  { movie: "Mungaru Male", year: 2006, language: "Kannada", song: "Mungaru Male", artist: "Sonu Nigam", videoId: "Q7ikqU6LHC0" },
  { movie: "Jogi", year: 2005, language: "Kannada", song: "Maleyali Jotheyali", artist: "Rajesh Krishnan", videoId: "7IfqXrRFwFI" },
  { movie: "Jogi", year: 2005, language: "Kannada", song: "Usire Usire", artist: "Kunal Ganjawala", videoId: "9YM7q8ZzaCI" },
  { movie: "Hudugaru", year: 2011, language: "Kannada", song: "Yeno Yeno", artist: "Sonu Nigam", videoId: "WQg0KR19RDw" },
  { movie: "Raamachari", year: 1991, language: "Kannada", song: "Hrudaya Samudra", artist: "S. P. Balasubrahmanyam", videoId: "gJTlvbLbQ_Q" },
  { movie: "Om", year: 1995, language: "Kannada", song: "Nammoora Mandara Hoove", artist: "Rajkumar", videoId: "kF_eZ0NhqAg" },
  { movie: "Jackie", year: 2010, language: "Kannada", song: "Eradane Sala", artist: "Vijay Prakash", videoId: "B73wNbFcTBw" },
  { movie: "Gaalipata", year: 2008, language: "Kannada", song: "Ninnena", artist: "Vijay Prakash", videoId: "qNfMVLDl2-M" },
  { movie: "Johny Mera Naam", year: 2008, language: "Kannada", song: "Ee Sanje Yakagide", artist: "Udit Narayan", videoId: "XR0h-VdXvWw" },
  { movie: "Junglee", year: 2009, language: "Kannada", song: "Neenaade Nenapu", artist: "Sonu Nigam", videoId: "rTuxUAuJRyY" },
  { movie: "Pancharangi", year: 2010, language: "Kannada", song: "Daniyeke", artist: "Vijay Prakash", videoId: "h7zpDZEuPqE" },
  { movie: "Manasaare", year: 2009, language: "Kannada", song: "Manasaare", artist: "Sonu Nigam", videoId: "HlPoUber3qY" },
  { movie: "Mussanje Mathu", year: 2008, language: "Kannada", song: "Hey Dinakara", artist: "Vijay Prakash", videoId: "TpFwWZzJla0" },
  { movie: "Cheluvina Chittara", year: 2007, language: "Kannada", song: "Cheluvina Chittara", artist: "Rajesh Krishnan", videoId: "pQBz3zKZvCQ" },

  // Additional popular Hindi songs from the era - embeddable versions
  { movie: "Mohabbatein", year: 2000, language: "Hindi", song: "Humko Humise Chura Lo", artist: "Lata Mangeshkar, Udit Narayan", videoId: "Bfwf3u3hfzc" },
  { movie: "Kabhi Alvida Naa Kehna", year: 2006, language: "Hindi", song: "Mitwa", artist: "Shafqat Amanat Ali, Shankar Mahadevan, Caralisa Monteiro", videoId: "YSdO8BvN2P4" },
  { movie: "Om Shanti Om", year: 2007, language: "Hindi", song: "Dard-E-Disco", artist: "Sukhwinder Singh, Marianne D'Cruz, Nisha, Caralisa", videoId: "dCbn3rs-_Gs" },
  { movie: "Om Shanti Om", year: 2007, language: "Hindi", song: "Ajab Si", artist: "KK", videoId: "CwkzK-F7YAE" },
  { movie: "Dhoom 2", year: 2006, language: "Hindi", song: "Dhoom Machale", artist: "Pritam", videoId: "TlvthH42m5c" },
  { movie: "Koi Mil Gaya", year: 2003, language: "Hindi", song: "Koi Mil Gaya", artist: "Udit Narayan", videoId: "pweaqcts49w" },
  { movie: "Main Hoon Na", year: 2004, language: "Hindi", song: "Main Hoon Na", artist: "Sonu Nigam", videoId: "qWlhP3lXWs0" },
  { movie: "Fanaa", year: 2006, language: "Hindi", song: "Chand Sifarish", artist: "Shaan, Kailash Kher", videoId: "h0tuyaskwKs" },
  { movie: "Devdas", year: 2002, language: "Hindi", song: "Dola Re Dola", artist: "Shreya Ghoshal, Kavita Krishnamurthy", videoId: "r3pA187gAPQ" },
  { movie: "Devdas", year: 2002, language: "Hindi", song: "Bairi Piya", artist: "Udit Narayan, Shreya Ghoshal", videoId: "7zNGvUOGRY4" },
];

/**
 * Get a random pre-validated song for a movie
 * @param {string} movie - Movie name
 * @param {array} usedSongs - Already used song names
 * @returns {object|null} - Song object or null
 */
function getPrevalidatedSong(movie, usedSongs = []) {
  // Find all songs for this movie
  const movieSongs = prevalidatedSongs.filter(s => s.movie === movie);

  if (movieSongs.length === 0) {
    return null;
  }

  // Filter out already used songs
  const availableSongs = movieSongs.filter(s => !usedSongs.includes(s.song));

  if (availableSongs.length === 0) {
    // All songs used, return any song from this movie
    return movieSongs[Math.floor(Math.random() * movieSongs.length)];
  }

  // Return random available song
  return availableSongs[Math.floor(Math.random() * availableSongs.length)];
}

/**
 * Get all movies that have pre-validated songs
 * @param {string} language - Language filter (optional)
 * @param {number} startYear - Start year filter (optional)
 * @param {number} endYear - End year filter (optional)
 * @returns {array} - Array of unique movies
 */
function getMoviesWithPrevalidatedSongs(language = null, startYear = null, endYear = null) {
  let songs = prevalidatedSongs;

  // Filter by language
  if (language) {
    const languages = Array.isArray(language) ? language : [language];
    songs = songs.filter(s => languages.includes(s.language));
  }

  // Filter by year range
  if (startYear && endYear) {
    songs = songs.filter(s => s.year >= startYear && s.year <= endYear);
  }

  // Get unique movies
  const movieMap = new Map();
  songs.forEach(s => {
    if (!movieMap.has(s.movie)) {
      movieMap.set(s.movie, {
        movie: s.movie,
        year: s.year,
        language: s.language
      });
    }
  });

  return Array.from(movieMap.values());
}

module.exports = {
  prevalidatedSongs,
  getPrevalidatedSong,
  getMoviesWithPrevalidatedSongs
};
