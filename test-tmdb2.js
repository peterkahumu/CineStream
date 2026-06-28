const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const apiKey = process.env.TMDB_API_KEY;
  const res = await fetch(`https://api.themoviedb.org/3/movie/550?api_key=${apiKey}&append_to_response=reviews,recommendations`);
  const data = await res.json();
  console.log("Reviews:", data.reviews?.results?.length);
  if (data.reviews?.results?.length > 0) console.log("First review author:", data.reviews.results[0].author);
  console.log("Recommendations:", data.recommendations?.results?.length);
}
run();
