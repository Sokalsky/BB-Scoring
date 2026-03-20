import { useState, useEffect, useMemo } from 'react'
import { loadGames } from '../storage'
import { computePlayerStats } from '../engine/scoring'

export default function StatsView({ navigate }) {
  const [games, setGames] = useState(null)

  useEffect(() => {
    loadGames().then(setGames)
  }, [])

  const stats = useMemo(() => {
    if (!games) return null
    return computePlayerStats(games)
  }, [games])

  if (!stats) {
    return (
      <div className="text-center py-16 text-felt-400">
        <div className="animate-pulse text-3xl mb-3">♠ ♥ ♦ ♣</div>
        <p className="font-display">Loading stats...</p>
      </div>
    )
  }

  if (stats.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-5xl mb-4 opacity-30">♛</p>
        <p className="font-display text-lg font-medium text-felt-300">No stats yet</p>
        <p className="text-sm mt-1 text-felt-500">Complete a game to see player statistics.</p>
        <button
          onClick={() => navigate('home')}
          className="mt-6 text-gold-500 text-sm font-medium hover:text-gold-400 transition-colors"
        >
          Back to Home
        </button>
      </div>
    )
  }

  const statCols = [
    { key: 'gamesPlayed', label: 'Games', short: 'GP' },
    { key: 'wins', label: 'Wins', short: 'W' },
    { key: 'winRate', label: 'Win %', short: 'W%' },
    { key: 'avgScore', label: 'Avg Score', short: 'Avg' },
    { key: 'bestGameScore', label: 'Best Score', short: 'Best' },
    { key: 'bidAccuracy', label: 'Bid Acc %', short: 'Bid%' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-gold-500">Player Statistics</h1>

      {/* Card grid for mobile */}
      <div className="space-y-3 sm:hidden">
        {stats.map((s, i) => (
          <div key={s.name} className="card-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              {i === 0 && <span className="text-gold-500">♛</span>}
              <p className="font-display font-bold text-gray-800">{s.name}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {statCols.map(col => (
                <div key={col.key} className="text-center">
                  <p className="text-xs text-gray-400 mb-0.5">{col.label}</p>
                  <p className={`text-base font-bold ${
                    col.key === 'winRate' && parseInt(s[col.key]) > 50 ? 'text-felt-600' :
                    col.key === 'bidAccuracy' && parseInt(s[col.key]) > 60 ? 'text-gold-600' :
                    'text-gray-800'
                  }`}>{s[col.key]}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Table for larger screens */}
      <div className="hidden sm:block overflow-x-auto">
        <div className="card-surface overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-felt-600 text-white">
                <th className="text-left text-xs font-semibold px-4 py-3 uppercase tracking-wider">#</th>
                <th className="text-left text-xs font-semibold px-4 py-3 uppercase tracking-wider">Player</th>
                {statCols.map(col => (
                  <th key={col.key} className="text-right text-xs font-semibold px-3 py-3 uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.name} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'} hover:bg-felt-50/50 transition-colors`}>
                  <td className="px-4 py-3 text-sm text-gray-400 font-medium">
                    {i === 0 ? <span className="text-gold-500">♛</span> : i + 1}
                  </td>
                  <td className="px-4 py-3 font-display font-semibold text-gray-800">{s.name}</td>
                  {statCols.map(col => (
                    <td key={col.key} className={`px-3 py-3 text-right text-sm font-medium ${
                      col.key === 'wins' && s[col.key] > 0 ? 'text-felt-600 font-bold' :
                      col.key === 'bidAccuracy' && parseInt(s[col.key]) > 60 ? 'text-gold-600 font-bold' :
                      'text-gray-700'
                    }`}>
                      {s[col.key]}{col.key === 'winRate' || col.key === 'bidAccuracy' ? '%' : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-felt-500 space-y-1 felt-surface p-3 border border-felt-700/30">
        <p><span className="text-felt-300 font-medium">Bid Acc %</span> — rounds where tricks won matched the bid</p>
        <p><span className="text-felt-300 font-medium">Avg Score</span> — average final score per completed game</p>
      </div>
    </div>
  )
}
