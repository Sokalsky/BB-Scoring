import React, { useState, useEffect } from 'react'
import { loadGames, deleteGame } from '../storage'
import { getCumulativeScores, getWinners } from '../engine/scoring'
import Scoreboard from '../components/Scoreboard'

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
  const [completedGames, setCompletedGames] = useState([])
  const [activeGames, setActiveGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedGameId, setExpandedGameId] = useState(null)

  useEffect(() => {
    loadGames().then(all => {
      setCompletedGames(all.filter(g => g.status === 'complete'))
      setActiveGames(all.filter(g => g.status === 'active'))
      setLoading(false)
    })
  }, [])

  const handleDelete = async (gameId, e) => {
    e.stopPropagation()
    if (!confirm('Delete this game? This cannot be undone.')) return
    await deleteGame(gameId)
    setCompletedGames(prev => prev.filter(g => g.id !== gameId))
    setActiveGames(prev => prev.filter(g => g.id !== gameId))
  }

  const handleAbandon = async (gameId, e) => {
    e.stopPropagation()
    if (!confirm('Abandon this game? This cannot be undone.')) return
    await deleteGame(gameId)
    setActiveGames(prev => prev.filter(g => g.id !== gameId))
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
      {/* New Game button — always available */}
      <button
        onClick={() => navigate('setup')}
        className="btn-gold w-full py-4 text-lg"
      >
        Deal a New Game
      </button>

      {/* Active games list */}
      {activeGames.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-felt-200 mb-3">
            Games in Progress ({activeGames.length})
          </h2>
          <div className="space-y-3">
            {activeGames.map(game => (
              <div key={game.id} className="felt-surface p-4 border-gold-600/30 border">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-felt-200 text-sm">
                      {game.players.map(p => p.name).join(', ')}
                    </p>
                    <p className="text-felt-400 text-xs mt-1">
                      Round {game.currentRoundIndex + 1} of {game.roundSequence.length}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => navigate('game', game.id)}
                      className="btn-gold text-sm py-2 px-4"
                    >
                      Resume
                    </button>
                    <button
                      onClick={(e) => handleAbandon(game.id, e)}
                      className="btn-danger text-sm py-2 px-3"
                    >
                      Abandon
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SuitDivider />

      {/* Completed games */}
      <div>
        <h2 className="font-display text-lg font-semibold text-felt-200 mb-3">
          {completedGames.length === 0 ? 'No completed games yet' : `Completed Games (${completedGames.length})`}
        </h2>

        {completedGames.length === 0 && (
          <div className="text-center py-10">
            <p className="text-5xl mb-3 opacity-30">🃏</p>
            <p className="text-felt-500 text-sm">Your game history will appear here.</p>
          </div>
        )}

        {completedGames.length > 0 && (
          <div className="space-y-3">
            {completedGames.map(game => {
              const scores = getCumulativeScores(game.completedRounds, game.players)
              const winners = getWinners(game)
              const winnerNames = winners.map(w => w.name).join(' & ')

              const isExpanded = expandedGameId === game.id

              return (
                <div
                  key={game.id}
                  className="card-surface overflow-hidden hover:shadow-card-hover transition-shadow"
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
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
                          <span className="ml-2 text-felt-500">{isExpanded ? '▲ Hide' : '▼ View scoresheet'}</span>
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
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      <Scoreboard
                        players={game.players}
                        completedRounds={game.completedRounds}
                        currentRoundIndex={game.roundSequence.length}
                        totalRounds={game.roundSequence.length}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
