import { useState, useEffect } from 'react'
import { loadGames, deleteGame } from '../storage'
import { getCumulativeScores, getWinners } from '../engine/scoring'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const SuitDivider = () => (
  <div className="flex items-center justify-center gap-3 py-2 text-felt-600/60 text-xs select-none">
    <span className="flex-1 h-px bg-felt-700/40" />
    <span>♠</span><span className="text-card-red">♥</span>
    <span>♦</span><span>♣</span>
    <span className="flex-1 h-px bg-felt-700/40" />
  </div>
)

export default function HomeView({ navigate }) {
  const [games, setGames] = useState([])
  const [activeGame, setActiveGame] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGames().then(all => {
      setGames(all.filter(g => g.status === 'complete'))
      setActiveGame(all.find(g => g.status === 'active') || null)
      setLoading(false)
    })
  }, [])

  const handleDelete = async (gameId, e) => {
    e.stopPropagation()
    if (!confirm('Delete this game? This cannot be undone.')) return
    await deleteGame(gameId)
    setGames(prev => prev.filter(g => g.id !== gameId))
    if (activeGame?.id === gameId) setActiveGame(null)
  }

  const handleAbandon = async (e) => {
    e.stopPropagation()
    if (!confirm('Abandon the current game? This cannot be undone.')) return
    await deleteGame(activeGame.id)
    setActiveGame(null)
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-felt-400">
        <div className="animate-pulse text-3xl mb-3">♠ ♥ ♦ ♣</div>
        <p className="font-display">Loading games...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Active game banner */}
      {activeGame ? (
        <div className="felt-surface p-4 border-gold-600/30 border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gold-400 font-display mb-1">
                Game in Progress
              </p>
              <p className="text-felt-200 text-sm">
                {activeGame.players.map(p => p.name).join(', ')}
              </p>
              <p className="text-felt-400 text-xs mt-1">
                Round {activeGame.currentRoundIndex + 1} of {activeGame.roundSequence.length}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => navigate('game', activeGame.id)}
                className="btn-gold text-sm py-2 px-4"
              >
                Resume
              </button>
              <button
                onClick={handleAbandon}
                className="btn-danger text-sm py-2 px-3"
              >
                Abandon
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => navigate('setup')}
          className="btn-gold w-full py-4 text-lg"
        >
          Deal a New Game
        </button>
      )}

      {activeGame && (
        <button
          disabled
          className="w-full bg-felt-800/50 text-felt-500 py-3 rounded-xl text-sm font-medium cursor-not-allowed border border-felt-700/30"
        >
          Finish current game before starting a new one
        </button>
      )}

      <SuitDivider />

      {/* Completed games */}
      <div>
        <h2 className="font-display text-lg font-semibold text-felt-200 mb-3">
          {games.length === 0 ? 'No completed games yet' : `Completed Games (${games.length})`}
        </h2>

        {games.length === 0 && (
          <div className="text-center py-10">
            <p className="text-5xl mb-3 opacity-30">🃏</p>
            <p className="text-felt-500 text-sm">Your game history will appear here.</p>
          </div>
        )}

        {games.length > 0 && (
          <div className="space-y-3">
            {games.map(game => {
              const scores = getCumulativeScores(game.completedRounds, game.players)
              const winners = getWinners(game)
              const winnerNames = winners.map(w => w.name).join(' & ')

              return (
                <div
                  key={game.id}
                  className="card-surface p-4 hover:shadow-card-hover transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-500">
                          {formatDate(game.createdAt)}
                        </span>
                        <span className="bg-gold-100 text-gold-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-gold-200">
                          ♛ {winnerNames}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {game.players.map(p => (
                          <span key={p.id} className="text-sm text-gray-600">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-gray-400 ml-1">{scores[p.id]}</span>
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {game.roundSequence.length} rounds · {game.players.length} players
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(game.id, e)}
                      className="text-gray-300 hover:text-card-red transition-colors text-lg leading-none shrink-0 p-1"
                      title="Delete game"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
