async function getConfig() {
    const { data, error } = await sb.from("config").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;

    if (data) {
      return {
        order: data.order_list || shuffle(NAMES),
        cursor: data.cursor || 0,
        recentGenres: data.recent_genres || []
      };
    }

    const fresh = { order: shuffle(NAMES), cursor: 0, recentGenres: [] };
    const { error: insertErr } = await sb.from("config").insert({
      id: 1,
      order_list: fresh.order,
      cursor: fresh.cursor,
      recent_genres: fresh.recentGenres
    });
    if (insertErr) throw insertErr;
    return fresh;
  }

async function saveConfig(config) {
    const { error } = await sb.from("config").update({
      order_list: config.order,
      cursor: config.cursor,
      recent_genres: config.recentGenres
    }).eq("id", 1);
    if (error) throw error;
  }

async function getOrCreateRound(config) {
    const id = todayStr();

    const { data, error } = await sb.from("gd_rounds").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (data) return { round: data, config: config };

    const genre = pickGenre(config.recentGenres);
    const newConfig = {
      order: config.order,
      cursor: config.cursor,
      recentGenres: [genre].concat(config.recentGenres).slice(0, 6)
    };

    const { data: inserted, error: insertErr } = await sb
      .from("gd_rounds")
      .insert({ id: id, genre: genre })
      .select()
      .single();

    if (insertErr) throw insertErr;

    await saveConfig(newConfig);
    return { round: inserted, config: newConfig };
  }

async function loadSubmissions(roundId) {
    const { data, error } = await sb
      .from("gd_submissions")
      .select("*")
      .eq("round_id", roundId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }

async function loadVotes(roundId) {
    const { data, error } = await sb
      .from("gd_votes")
      .select("*")
      .eq("round_id", roundId);

    if (error) throw error;
    return data || [];
  }

async function saveSong(roundId, player, song) {
    const existing = state.submissions.find(s => s.player === player);

    const payload = {
      song_title: song.title,
      song_artist: song.artist,
      song_url: song.url || null,
      spotify_url: song.spotifyUrl || null,
      spotify_embed_url: song.spotifyEmbedUrl || null,
      spotify_image: song.spotifyImage || null,
      spotify_album: song.spotifyAlbum || null,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      const { error } = await sb.from("gd_submissions").update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from("gd_submissions").insert(Object.assign({
        round_id: roundId,
        player: player
      }, payload));
      if (error) throw error;
    }
  }

async function saveVote(roundId, voter, submissionId, score) {
    const { error } = await sb.from("gd_votes").upsert({
      round_id: roundId,
      voter: voter,
      submission_id: submissionId,
      score: score,
      updated_at: new Date().toISOString()
    }, { onConflict: "round_id,voter,submission_id" });

    if (error) throw error;
  }

async function loadHistory(excludeKey) {
    const { data, error } = await sb
      .from("gd_rounds")
      .select("*")
      .neq("id", excludeKey)
      .order("id", { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  }
