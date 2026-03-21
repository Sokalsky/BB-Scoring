import { useState, useEffect, useMemo } from 'react'
import { loadGames } from '../storage'
import { computePlayerStats } from '../engine/scoring'

function KPICard({ label, value, sublabel, icon }) {
  return (
    <div className="felt-surface p-3 border border-felt-600/30 flex-1 min-w-0">
      <p className="text-felt-400 text-[10px] sm:text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="font-display font-bold text-gold-400 text-lg sm:text-xl truncate">{value}</p>
      {sublabel && <p className="text-felt-500 text-[10px] sm:text-xs mt-0.5 truncate">{sublabel}</p>}
    </div>
  )
}

function StatsTable({ stats }) {
  const statCols = [
    { key: 'gamesPlayed', label: 'Games', short: 'GP' },
    { key: 'wins', label: 'Wins', short: 'W' },
    { key: 'winRate', label: 'Win %', short: 'W%' },
    { key: 'avgScore', label: 'Avg Score', short: 'Avg' },
    { key: 'bestGameScore', label: 'Best Score', short: 'Best' },
    { key: 'bidAccuracy', label: 'Bid Acc %', short: 'Bid%' },
  ]

  if (stats.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-felt-500 text-sm">No completed games in this category yet.</p>
      </div>
    )
  }

  return (
    <>
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
    </>
  )
}

export default function StatsView({ navigate }) {
  const [games, setGames] = useState(null)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    loadGames().then(setGames)
  }, [])

  // Compute stats for each tab
  const allStats = useMemo(() => {
    if (!games) return null
    return computePlayerStats(games)
  }, [games])

  const threePlayerStats = useMemo(() => {
    if (!games) return null
    const filtered = games.filter(g => g.players.length === 3)
    return computePlayerStats(filtered)
  }, [games])

  const fourPlayerStats = useMemo(() => {
    if (!games) return null
    const filtered = games.filter(g => g.players.length === 4)
    return computePlayerStats(filtered)
  }, [games])

  if (!allStats) {
    return (
      <div className="text-center py-16 text-felt-400">
        <div className="animate-pulse text-3xl mb-3">♠ ♥ ♦ ♣</div>
        <p className="font-display">Loading stats...</p>
      </div>
    )
  }

  if (allStats.length === 0) {
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

  const tabs = [
    { id: 'all', label: 'All Games' },
    { id: '3p', label: '3 Player' },
    { id: '4p', label: '4 Player' },
  ]

  const currentStats = activeTab === '3p' ? threePlayerStats : activeTab === '4p' ? fourPlayerStats : allStats

  // Compute KPIs from current stats
  const kpis = useMemo(() => {
    if (!currentStats || currentStats.length === 0) return null

    const mostWins = [...currentStats].sort((a, b) => b.wins - a.wins)[0]
    const highestAcc = [...currentStats].filter(s => s.totalRounds >= 5).sort((a, b) => parseInt(b.bidAccuracy) - parseInt(a.bidAccuracy))[0]
      || [...currentStats].sort((a, b) => parseInt(b.bidAccuracy) - parseInt(a.bidAccuracy))[0]
    const highestScore = [...currentStats].sort((a, b) => b.bestGameScore - a.bestGameScore)[0]
    const mostBidCorrectly = [...currentStats].sort((a, b) => b.bidMatches - a.bidMatches)[0]

    return { mostWins, highestAcc, highestScore, mostBidCorrectly }
  }, [currentStats])

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-gold-500">Player Statistics</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-felt-800 rounded-lg p-1 border border-felt-700/40">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-felt-500 text-white shadow-md'
                : 'text-felt-400 hover:text-felt-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <KPICard
            label="Most Wins"
            value={kpis.mostWins.name}
            sublabel={`${kpis.mostWins.wins} win${kpis.mostWins.wins !== 1 ? 's' : ''}`}
          />
          <KPICard
            label="Highest Acc %"
            value={kpis.highestAcc.name}
            sublabel={`${kpis.highestAcc.bidAccuracy}% accuracy`}
          />
          <KPICard
            label="Highest Score"
            value={kpis.highestScore.name}
            sublabel={`${kpis.highestScore.bestGameScore} pts`}
          />
          <KPICard
            label="Most Bids Made"
            value={kpis.mostBidCorrectly.name}
            sublabel={`${kpis.mostBidCorrectly.bidMatches} bids matched`}
          />
        </div>
      )}

      {/* Stats Table */}
      <StatsTable stats={currentStats} />

      <div className="text-xs text-felt-500 space-y-1 felt-surface p-3 border border-felt-700/30">
        <p><span className="text-felt-300 font-medium">Bid Acc %</span> — rounds where tricks won matched the bid</p>
        <p><span className="text-felt-300 font-medium">Avg Score</span> — average final score per completed game</p>
      </div>
    </div>
  )
}
