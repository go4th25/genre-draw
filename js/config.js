// Global app configuration and shared state
var APP_VERSION = "0.11.0";
var SUPABASE_URL = "https://cqnpjwyldsuxkpazsoxx.supabase.co";
var SUPABASE_KEY = "sb_publishable_UjD0ZU9zQ3SGLM0FV1uKQA_IitMevWS";
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Public Spotify Client ID. This is safe to include in browser code for OAuth PKCE.
var SPOTIFY_CLIENT_ID = "a68172651aec491c944c7718b0cee268";
var SPOTIFY_SCOPES = "playlist-modify-private playlist-modify-public";

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
