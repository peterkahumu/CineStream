const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const apiKey = process.env.TMDB_API_KEY;
  // Get TV details for Breaking Bad (id: 1396)
  const res = await fetch(`https://api.themoviedb.org/3/tv/1396?api_key=${apiKey}&append_to_response=videos,reviews,recommendations`);
  const data = await res.json();
  console.log("TV show videos:", data.videos.results.slice(0, 3));
  console.log("Seasons:", data.seasons.length);
  
  const seasonRes = await fetch(`https://api.themoviedb.org/3/tv/1396/season/1?api_key=${apiKey}&append_to_response=videos`);
  const seasonData = await seasonRes.json();
  console.log("Season 1 videos:", seasonData.videos?.results?.slice(0, 3));
}
run();
