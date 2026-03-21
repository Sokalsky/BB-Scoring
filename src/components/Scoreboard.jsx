import React from 'react'
import { getCumulativeScores } from '../engine/scoring'

const SUIT_ICON = { Spades: '♠', Hearts: '♥', Diamonds: '♦', Clubs: '♣', 'No Trump': 'NT' }

export default function Scoreboard({ players, completedRounds, currentRoundIndex, totalRounds }) {
  if (completedRounds.length === 0) return null

  const cumulativeScores = getCumulativeScores(completedRounds, players)
  const maxScore = Math.max(...Object.values(cumulativeScores))

  return (
    <div className="card-surface overflow-hidden">
      <div className="bg-felt-600 px-4 py-2.5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white font-display tracking-wide">Scoresheet</h3>
        <span className="text-xs text-felt-200">
          After {completedRounds.length} of {totalRounds} rounds
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-[10px] sm:text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-1.5 sm:px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">Round</th>
              {players.map(p => (
                <th key={p.id} colSpan={3}
                  className={`text-center px-1 sm:px-2 py-2 font-bold border-l border-gray-200 whitespace-nowrap ${
                    cumulativeScores[p.id] === maxScore ? 'text-felt-600' : 'text-gray-700'
                  }`}>
                  {p.name}
                  <span className={`ml-1 ${cumulativeScores[p.id] === maxScore ? 'text-felt-600' : 'text-gray-400'}`}>
                    ({cumulativeScores[p.id]}{cumulativeScores[p.id] === maxScore ? ' ♛' : ''})
                  </span>
                </th>
              ))}
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-1"></th>
              {players.map(p => (
                <React.Fragment key={p.id}>
                  <th className="px-1 sm:px-2 py-1 text-center text-gray-400 border-l border-gray-200 font-normal">Bid</th>
                  <th className="px-1 sm:px-2 py-1 text-center text-gray-400 font-normal">Won</th>
                  <th className="px-1 sm:px-2 py-1 text-center text-gray-400 font-normal">Total</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const runningTotals = Object.fromEntries(players.map(p => [p.id, 0]))
              return completedRounds.map((round, i) => {
                round.scores.forEach(s => {
                  runningTotals[s.playerId] = (runningTotals[s.playerId] || 0) + s.roundScore
                })
                const maxCum = Math.max(...players.map(p => runningTotals[p.id]))
                return (
                  <tr key={i} className={i % 2 === 1 ? 'bg-gray-50/50' : ''}>
                    <td className="px-1.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-gray-600 font-medium">
                      {round.cardsInRound} {SUIT_ICON[round.trumpSuit]}
                    </td>
                    {players.map(p => {
                      const s = round.scores.find(sc => sc.playerId === p.id)
                      const made = s && s.bid === s.tricks
                      const cumTotal = runningTotals[p.id]
                      const isLeader = cumTotal === maxCum
                      return (
                        <React.Fragment key={p.id}>
                          <td className={`px-1 sm:px-2 py-1.5 sm:py-2 text-center border-l border-gray-200 ${made ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                            {s?.bid ?? '—'}
                          </td>
                          <td className={`px-1 sm:px-2 py-1.5 sm:py-2 text-center ${made ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                            {s?.tricks ?? '—'}
                          </td>
                          <td className={`px-1 sm:px-2 py-1.5 sm:py-2 text-center font-bold ${isLeader ? 'text-felt-600' : 'text-gray-700'}`}>
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
  )
}
