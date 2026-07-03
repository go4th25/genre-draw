const SUPABASE_URL = "https://cqnpjwyldsuxkpazsoxx.supabase.co";

exports.handler = async function() {
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(SUPABASE_URL + "/rest/v1/gd_spotify_admin_token?id=eq.1&select=id&limit=1", {
      headers: { apikey: key, Authorization: "Bearer " + key }
    });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    return { statusCode: 200, body: JSON.stringify({ connected: rows.length > 0 }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
