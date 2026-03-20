import { getCumulativeScores } from '../engine/scoring'

export default function Scoreboard({ players, completedRounds, currentRoundIndex, totalRounds }) {
  if (completedRounds.length === 0) return null

  const cumulativeScores = getCumulativeScores(completedRounds, players)
  const maxScore = Math.max(...Object.values(cumulativeScores))

  const ranked = [...players]
    .map(p => ({ ...p, score: cumulativeScores[p.id] || 0 }))
    .sort((a, b) => b.score - a.score)

  const lastRound = completedRounds[completedRounds.length - 1]

  return (
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
  )
}
