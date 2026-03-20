import express from 'express'
import pg from 'pg'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json())

// ─── Database ────────────────────────────────────────────────
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Auto-create tables on startup
async function initDB() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT now(),
        completed_at TIMESTAMPTZ,
        min_cards INT NOT NULL,
        max_cards INT NOT NULL,
        round_sequence JSONB NOT NULL,
        current_round_index INT NOT NULL DEFAULT 0,
        phase TEXT NOT NULL DEFAULT 'bidding',
        current_round_bids JSONB DEFAULT '[]'::jsonb
      );

      CREATE TABLE IF NOT EXISTS game_players (
        game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        seat_position INT NOT NULL,
        PRIMARY KEY (game_id, player_id)
      );

      CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        round_index INT NOT NULL,
        cards_in_round INT NOT NULL,
        trump_suit TEXT NOT NULL,
        dealer_index INT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS round_entries (
        id TEXT PRIMARY KEY,
        round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
        player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        bid INT NOT NULL,
        tricks_won INT NOT NULL,
        round_score INT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
      CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
      CREATE INDEX IF NOT EXISTS idx_rounds_game ON rounds(game_id);
      CREATE INDEX IF NOT EXISTS idx_round_entries_round ON round_entries(round_id);
      CREATE INDEX IF NOT EXISTS idx_round_entries_player ON round_entries(player_id);
    `)

    // Create the lifetime stats view
    await client.query(`
      CREATE OR REPLACE VIEW player_lifetime_stats AS
      SELECT
        p.id AS player_id,
        p.name AS player_name,
        COUNT(DISTINCT gp.game_id) AS games_played,
        COUNT(re.id) AS total_rounds_played,
        COALESCE(SUM(re.round_score), 0) AS total_career_points,
        ROUND(AVG(re.round_score)::numeric, 2) AS avg_points_per_round,
        SUM(CASE WHEN re.bid = re.tricks_won THEN 1 ELSE 0 END) AS bids_made,
        ROUND(
          100.0 * SUM(CASE WHEN re.bid = re.tricks_won THEN 1 ELSE 0 END)
          / NULLIF(COUNT(re.id), 0), 1
        ) AS bid_accuracy_pct,
        COALESCE(SUM(re.bid), 0) AS total_bids,
        COALESCE(SUM(re.tricks_won), 0) AS total_tricks_won,
        COALESCE(MAX(re.round_score), 0) AS best_round_score,
        ROUND(AVG(re.bid)::numeric, 2) AS avg_bid,
        ROUND(AVG(re.tricks_won)::numeric, 2) AS avg_tricks_won
      FROM players p
      JOIN game_players gp ON gp.player_id = p.id
      JOIN games g ON g.id = gp.game_id AND g.status = 'complete'
      JOIN rounds r ON r.game_id = g.id
      JOIN round_entries re ON re.round_id = r.id AND re.player_id = p.id
      GROUP BY p.id, p.name
      ORDER BY total_career_points DESC
    `)

    console.log('Database tables initialized')
  } finally {
    client.release()
  }
}

// ─── API Routes ──────────────────────────────────────────────

// GET /api/games — list all games with full data
app.get('/api/games', async (req, res) => {
  try {
    const { rows: games } = await pool.query(
      `SELECT * FROM games ORDER BY created_at DESC`
    )

    const fullGames = await Promise.all(games.map(async (g) => {
      const { rows: gamePlayers } = await pool.query(
        `SELECT gp.player_id, gp.seat_position, p.name
         FROM game_players gp JOIN players p ON p.id = gp.player_id
         WHERE gp.game_id = $1 ORDER BY gp.seat_position`,
        [g.id]
      )

      const players = gamePlayers.map(gp => ({
        id: gp.player_id,
        name: gp.name,
      }))

      const { rows: rounds } = await pool.query(
        `SELECT * FROM rounds WHERE game_id = $1 ORDER BY round_index`, [g.id]
      )

      const completedRounds = await Promise.all(rounds.map(async (r) => {
        const { rows: entries } = await pool.query(
          `SELECT * FROM round_entries WHERE round_id = $1`, [r.id]
        )
        return {
          roundIndex: r.round_index,
          cardsInRound: r.cards_in_round,
          trumpSuit: r.trump_suit,
          dealerIndex: r.dealer_index,
          bids: entries.map(e => ({ playerId: e.player_id, bid: e.bid })),
          tricks: entries.map(e => ({ playerId: e.player_id, tricks: e.tricks_won })),
          scores: entries.map(e => ({
            playerId: e.player_id,
            bid: e.bid,
            tricks: e.tricks_won,
            roundScore: e.round_score,
          })),
        }
      }))

      return {
        id: g.id,
        status: g.status,
        createdAt: g.created_at,
        completedAt: g.completed_at,
        players,
        minCards: g.min_cards,
        maxCards: g.max_cards,
        roundSequence: g.round_sequence,
        currentRoundIndex: g.current_round_index,
        phase: g.phase,
        currentRoundBids: g.current_round_bids || [],
        completedRounds,
      }
    }))

    res.json(fullGames)
  } catch (err) {
    console.error('GET /api/games error:', err)
    res.status(500).json({ error: 'Failed to load games' })
  }
})

// PUT /api/games/:id — save/update a game (full upsert)
app.put('/api/games/:id', async (req, res) => {
  const game = req.body
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Upsert players
    for (const p of game.players) {
      await client.query(
        `INSERT INTO players (id, name) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET name = $2`,
        [p.id, p.name]
      )
    }

    // Upsert game
    await client.query(
      `INSERT INTO games (id, status, created_at, completed_at, min_cards, max_cards,
                          round_sequence, current_round_index, phase, current_round_bids)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         status=$2, completed_at=$4, current_round_index=$8,
         phase=$9, current_round_bids=$10`,
      [game.id, game.status, game.createdAt, game.completedAt,
       game.minCards, game.maxCards, JSON.stringify(game.roundSequence),
       game.currentRoundIndex, game.phase, JSON.stringify(game.currentRoundBids)]
    )

    // Upsert game_players
    for (let i = 0; i < game.players.length; i++) {
      await client.query(
        `INSERT INTO game_players (game_id, player_id, seat_position)
         VALUES ($1, $2, $3)
         ON CONFLICT (game_id, player_id) DO UPDATE SET seat_position = $3`,
        [game.id, game.players[i].id, i]
      )
    }

    // Upsert rounds + entries
    for (const round of game.completedRounds) {
      const roundId = `${game.id}_r${round.roundIndex}`
      await client.query(
        `INSERT INTO rounds (id, game_id, round_index, cards_in_round, trump_suit, dealer_index)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [roundId, game.id, round.roundIndex, round.cardsInRound, round.trumpSuit, round.dealerIndex]
      )

      for (const score of round.scores) {
        const entryId = `${roundId}_${score.playerId}`
        await client.query(
          `INSERT INTO round_entries (id, round_id, player_id, bid, tricks_won, round_score)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO NOTHING`,
          [entryId, roundId, score.playerId, score.bid, score.tricks, score.roundScore]
        )
      }
    }

    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('PUT /api/games error:', err)
    res.status(500).json({ error: 'Failed to save game' })
  } finally {
    client.release()
  }
})

// DELETE /api/games/:id
app.delete('/api/games/:id', async (req, res) => {
  try {
    // Cascade takes care of game_players, rounds, round_entries
    await pool.query(`DELETE FROM games WHERE id = $1`, [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/games error:', err)
    res.status(500).json({ error: 'Failed to delete game' })
  }
})

// GET /api/stats — player lifetime stats from the view
app.get('/api/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM player_lifetime_stats`)
    res.json(rows)
  } catch (err) {
    console.error('GET /api/stats error:', err)
    res.status(500).json({ error: 'Failed to load stats' })
  }
})

// ─── Serve static frontend ──────────────────────────────────
app.use(express.static(join(__dirname, 'dist')))
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

// ─── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bugger Bridge server running on port ${PORT}`)
  })
}).catch(err => {
  console.error('Failed to initialize database:', err)
  // Start anyway — might be running without a DB (local dev)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (no database)`)
  })
})
