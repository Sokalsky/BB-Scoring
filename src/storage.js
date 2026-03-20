/**
 * Storage layer — calls the Express API when available (production),
 * falls back to localStorage for local dev without a server.
 */

// ───────────────── ID generation ─────────────────
export function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// ───────────────── API detection ─────────────────
async function apiAvailable() {
  try {
    const resp = await fetch('/api/games', { method: 'HEAD' })
    return resp.ok || resp.status === 404 // server is there
  } catch {
    return false
  }
}

let _useApi = null // cached after first check
async function shouldUseApi() {
  if (_useApi === null) _useApi = await apiAvailable()
  return _useApi
}

// ═══════════════════════════════════════════════════
//  API STORAGE (production — Express + Postgres)
// ═══════════════════════════════════════════════════

async function apiLoadGames() {
  const resp = await fetch('/api/games')
  if (!resp.ok) throw new Error('Failed to load games')
  return resp.json()
}

async function apiSaveGame(game) {
  const resp = await fetch(`/api/games/${game.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(game),
  })
  if (!resp.ok) throw new Error('Failed to save game')
}

async function apiDeleteGame(gameId) {
  const resp = await fetch(`/api/games/${gameId}`, { method: 'DELETE' })
  if (!resp.ok) throw new Error('Failed to delete game')
}

// ═══════════════════════════════════════════════════
//  LOCALSTORAGE FALLBACK (local dev)
// ═══════════════════════════════════════════════════

const STORAGE_KEY = 'bugger-bridge-v1'

function localLoadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { games: [] }
  } catch {
    return { games: [] }
  }
}

function localSaveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function localLoadGames() {
  return localLoadData().games
}

function localSaveGame(game) {
  const data = localLoadData()
  const idx = data.games.findIndex(g => g.id === game.id)
  if (idx >= 0) data.games[idx] = game
  else data.games.unshift(game)
  localSaveData(data)
}

function localDeleteGame(gameId) {
  const data = localLoadData()
  data.games = data.games.filter(g => g.id !== gameId)
  localSaveData(data)
}

// ═══════════════════════════════════════════════════
//  UNIFIED API (always async)
// ═══════════════════════════════════════════════════

export async function loadGames() {
  if (await shouldUseApi()) {
    try { return await apiLoadGames() }
    catch (e) { console.warn('API failed, falling back to localStorage:', e) }
  }
  return localLoadGames()
}

export async function saveGame(game) {
  if (await shouldUseApi()) {
    try { return await apiSaveGame(game) }
    catch (e) { console.warn('API save failed, falling back to localStorage:', e) }
  }
  localSaveGame(game)
}

export async function deleteGame(gameId) {
  if (await shouldUseApi()) {
    try { return await apiDeleteGame(gameId) }
    catch (e) { console.warn('API delete failed, falling back to localStorage:', e) }
  }
  localDeleteGame(gameId)
}

export async function getActiveGame() {
  const games = await loadGames()
  return games.find(g => g.status === 'active') || null
}
