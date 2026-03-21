import React from 'react'
import { getCumulativeScores } from '../engine/scoring'

const SUIT_ICON = { Spades: '♠', Hearts: '♥', Diamonds: '♦', Clubs: '♣', 'No Trump': 'NT' }

export default function Scoreboard({ players, completedRounds, currentRoundIndex, totalRounds }) {
  if (completedRounds.length === 0) return null

  const cumulativeScores = getCumulativeScores(completedRounds, players)
  const maxScore = Math.max(...Object.values(cumulativeScores))

  const ranked = [...players]
    .map(p => ({ ...p, score: cumulativeScores[p.id] || 0 }))
    .sort((a, b) => b.score - a.score)

  const lastRound = completedRounds[completedRounds.length - 1]

  return (
    <div className="space-y-4">
      {/* Leaderboard summary */}
      <div className="card-surface overflow-hidden">
        <div className="bg-felt-600 px-4 py-2.5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white font-display tracking-wide">Leaderboard</h3>
          <span className="text-xs text-felt-200">
            After {completedRounds.length} of {totalRounds} rounds
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Player</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((player, i) => {
              const lastScore = lastRound?.scores.find(s => s.playerId === player.id)
              const madeBid = lastScore && lastScore.bid === lastScore.tricks
              const isLeading = player.score === maxScore

              return (
                <tr key={player.id} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    <span className="inline-flex items-center gap-1.5">
                      {i === 0 && <span className="text-gold-500 text-xs">♛</span>}
                      {player.name}
                    </span>
                  </td>
                  <td className={`px-3 py-2.5 text-right text-xs font-medium ${madeBid ? 'text-green-600' : 'text-gray-500'}`}>
                    {lastScore ? `+${lastScore.roundScore}${madeBid ? ' ✓' : ''}` : '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-bold ${isLeading ? 'text-felt-600' : 'text-gray-800'}`}>
                    {player.score}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Full round-by-round scoresheet */}
      <div className="card-surface overflow-hidden">
        <div className="bg-felt-600 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-white font-display tracking-wide">Full Scoresheet</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">Round</th>
                {players.map(p => (
                  <th key={p.id} colSpan={3}
                    className={`text-center px-2 py-2 font-bold border-l border-gray-200 whitespace-nowrap ${
                      cumulativeScores[p.id] === maxScore ? 'text-felt-600' : 'text-gray-700'
                    }`}>
                    {p.name}{cumulativeScores[p.id] === maxScore ? ' ♛' : ''}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-1"></th>
                {players.map(p => (
                  <React.Fragment key={p.id}>
                    <th className="px-2 py-1 text-center text-gray-400 border-l border-gray-200 font-normal">Bid</th>
                    <th className="px-2 py-1 text-center text-gray-400 font-normal">Won</th>
                    <th className="px-2 py-1 text-center text-gray-400 font-normal">Total</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Compute running cumulative totals per player across rounds
                const runningTotals = Object.fromEntries(players.map(p => [p.id, 0]))
                return completedRounds.map((round, i) => {
                  // Update running totals for this round
                  round.scores.forEach(s => {
                    runningTotals[s.playerId] = (runningTotals[s.playerId] || 0) + s.roundScore
                  })
                  const maxCum = Math.max(...players.map(p => runningTotals[p.id]))
                  return (
                    <tr key={i} className={i % 2 === 1 ? 'bg-gray-50/50' : ''}>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600 font-medium">
                        {round.cardsInRound} {SUIT_ICON[round.trumpSuit]}
                      </td>
                      {players.map(p => {
                        const s = round.scores.find(sc => sc.playerId === p.id)
                        const made = s && s.bid === s.tricks
                        const cumTotal = runningTotals[p.id]
                        const isLeader = cumTotal === maxCum
                        return (
                          <React.Fragment key={p.id}>
                            <td className={`px-2 py-2 text-center border-l border-gray-200 ${made ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                              {s?.bid ?? '—'}
                            </td>
                            <td className={`px-2 py-2 text-center ${made ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                              {s?.tricks ?? '—'}
                            </td>
                            <td className={`px-2 py-2 text-center font-bold ${isLeader ? 'text-felt-600' : 'text-gray-700'}`}>
                              {cumTotal}
                            </td>
                          </React.Fragment>
                        )
                      })}
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
