// Global app configuration and shared state
var APP_VERSION = "0.10.0";
var SUPABASE_URL = "https://cqnpjwyldsuxkpazsoxx.supabase.co";
var SUPABASE_KEY = "sb_publishable_UjD0ZU9zQ3SGLM0FV1uKQA_IitMevWS";
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var NAMES = ["Nick", "Nani", "Trenton", "Danny", "Jace"];
var GENRES = [
  "City Pop", "Shoegaze", "Motown", "Bossa Nova", "90s Boom Bap",
  "Yacht Rock", "Afrobeat", "Britpop", "Synthwave", "Bluegrass",
  "K-Pop", "Reggaeton", "Dream Pop", "Funk", "Disco",
  "Post-Punk", "Trip-Hop", "Flamenco Pop", "Deep Soul", "Grunge",
  "Ambient", "Jazz Fusion", "Country Pop", "Emo Revival", "Doo-Wop",
  "Neo-Soul", "Math Rock", "Baroque Pop", "Ska", "Industrial"
];

var root = document.getElementById("gd-app");
var state = { config: null, round: null, submissions: [], votes: [], history: [] };
var PLAYER_KEY = "genreDrawPlayer";
