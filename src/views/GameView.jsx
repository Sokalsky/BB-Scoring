import { useState, useEffect } from 'react'
import { loadGames, saveGame } from '../storage'
import {
  getTrumpForRound,
  getDealerIndex,
  getBiddingOrder,
  getForbiddenDealerBid,
  calculateRoundScore,
  getCumulativeScores,
  getWinners,
  SUIT_DISPLAY,
} from '../engine/scoring'
import Scoreboard from '../components/Scoreboard'

const SUIT_COLORS = {
  Spades: 'text-card-black',
  Hearts: 'text-card-red',
  Diamonds: 'text-card-red',
  Clubs: 'text-card-black',
  'No Trump': 'text-gold-500',
}

const SUIT_ICONS = {
  Spades: '♠',
  Hearts: '♥',
  Diamonds: '♦',
  Clubs: '♣',
  'No Trump': '★',
}

function NumberInput({ value, onChange, min = 0, max = 99, forbidden = null }) {
  const parsed = value === '' ? null : parseInt(value)
  const isForbidden = forbidden !== null && parsed === forbidden

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(min, (parsed ?? 0) - 1))}
        className="w-9 h-9 rounded-lg border-2 border-gray-200 text-lg font-bold text-gray-500
                   hover:bg-felt-50 hover:border-felt-400 flex items-center justify-center
                   select-none transition-all active:scale-95"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => {
          const v = parseInt(e.target.value)
          if (!isNaN(v) && v >= min && v <= max) onChange(v)
        }}
        className={`w-14 text-center text-lg font-bold rounded-lg border-2 py-1.5 focus:outline-none transition-all ${
          isForbidden
            ? 'border-card-red bg-red-50 text-card-red focus:ring-2 focus:ring-red-300'
            : 'border-gray-200 text-gray-800 focus:border-felt-500 focus:ring-2 focus:ring-felt-500/30'
        }`}
      />
      <button
        onClick={() => onChange(Math.min(max, (parsed ?? 0) + 1))}
        className="w-9 h-9 rounded-lg border-2 border-gray-200 text-lg font-bold text-gray-500
                   hover:bg-felt-50 hover:border-felt-400 flex items-center justify-center
                   select-none transition-all active:scale-95"
      >
        +
      </button>
    </div>
  )
}

export default function GameView({ gameId, navigate }) {
  const [game, setGame] = useState(null)
  const [bidInputs, setBidInputs] = useState({})
  const [tricksInputs, setTricksInputs] = useState({})
  const [error, setError] = useState('')
  const [roundResult, setRoundResult] = useState(null)

  useEffect(() => {
    loadGames().then(allGames => {
      const found = allGames.find(g => g.id === gameId)
      if (!found) { navigate('home'); return }
      setGame(found)
      if (found.phase === 'bidding') {
        const init = {}
        found.players.forEach(p => { init[p.id] = '' })
        found.currentRoundBids.forEach(b => { init[b.playerId] = String(b.bid) })
        setBidInputs(init)
      } else {
        const init = {}
        found.players.forEach(p => { init[p.id] = '' })
        setTricksInputs(init)
      }
    })
  }, [gameId])

  if (!game) {
    return (
      <div className="text-center py-16">
        <div className="animate-pulse text-3xl mb-3 text-felt-400">🃏</div>
        <p className="text-felt-400 font-display">Loading game...</p>
      </div>
    )
  }

  const { players, roundSequence, currentRoundIndex, phase, completedRounds } = game
  const totalRounds = roundSequence.length
  const cardsInRound = roundSequence[currentRoundIndex]
  const trump = getTrumpForRound(currentRoundIndex)
  const dealerIndex = getDealerIndex(currentRoundIndex, players.length)
  const dealer = players[dealerIndex]
  const biddingOrder = getBiddingOrder(dealerIndex, players.length)
  const cumulativeScores = getCumulativeScores(completedRounds, players)

  // --- BIDDING ---
  const handleBidChange = (playerId, val) => {
    setBidInputs(prev => ({ ...prev, [playerId]: String(val) }))
    setError('')
  }

  const getDealerForbidden = () => {
    const nonDealerOrder = biddingOrder.slice(0, -1)
    const nonDealerBids = nonDealerOrder.map(idx => {
      const pid = players[idx].id
      const v = parseInt(bidInputs[pid])
      return isNaN(v) ? 0 : v
    })
    return getForbiddenDealerBid(nonDealerBids, cardsInRound)
  }

  const submitBids = async () => {
    const bids = players.map(p => ({ playerId: p.id, bid: parseInt(bidInputs[p.id]) }))

    for (const b of bids) {
      if (isNaN(b.bid) || b.bid < 0 || b.bid > cardsInRound) {
        setError(`All bids must be between 0 and ${cardsInRound}.`)
        return
      }
    }

    const dealerPlayer = players[dealerIndex]
    const dealerBid = bids.find(b => b.playerId === dealerPlayer.id)?.bid
    const otherBids = bids.filter(b => b.playerId !== dealerPlayer.id).map(b => b.bid)
    const forbidden = getForbiddenDealerBid(otherBids, cardsInRound)
    if (forbidden !== null && dealerBid === forbidden) {
      setError(`${dealerPlayer.name} (dealer) cannot bid ${forbidden} — total would equal cards in round.`)
      return
    }

    const updatedGame = { ...game, phase: 'tricks', currentRoundBids: bids }
    setGame(updatedGame)
    await saveGame(updatedGame)
    setTricksInputs(Object.fromEntries(players.map(p => [p.id, ''])))
    setError('')
  }

  // --- TRICKS ---
  const handleTricksChange = (playerId, val) => {
    setTricksInputs(prev => ({ ...prev, [playerId]: String(val) }))
    setError('')
  }

  const tricksTotal = players.reduce((sum, p) => {
    const v = parseInt(tricksInputs[p.id])
    return sum + (isNaN(v) ? 0 : v)
  }, 0)

  const submitTricks = async () => {
    const tricks = players.map(p => ({ playerId: p.id, tricks: parseInt(tricksInputs[p.id]) }))

    for (const t of tricks) {
      if (isNaN(t.tricks) || t.tricks < 0 || t.tricks > cardsInRound) {
        setError(`All trick counts must be between 0 and ${cardsInRound}.`)
        return
      }
    }

    if (tricksTotal !== cardsInRound) {
      setError(`Tricks must sum to ${cardsInRound}. Currently: ${tricksTotal}.`)
      return
    }

    const scores = players.map(p => {
      const bidEntry = game.currentRoundBids.find(b => b.playerId === p.id)
      const bid = bidEntry?.bid ?? 0
      const tricksWon = tricks.find(t => t.playerId === p.id)?.tricks ?? 0
      const roundScore = calculateRoundScore(bid, tricksWon)
      return {
        playerId: p.id,
        bid,
        tricks: tricksWon,
        roundScore,
        cumulative: (cumulativeScores[p.id] || 0) + roundScore,
      }
    })

    const roundRecord = {
      roundIndex: currentRoundIndex,
      cardsInRound,
      trumpSuit: trump,
      dealerIndex,
      bids: game.currentRoundBids,
      tricks,
      scores,
    }

    const newCompletedRounds = [...completedRounds, roundRecord]
    const nextRoundIndex = currentRoundIndex + 1
    const isGameOver = nextRoundIndex >= totalRounds

    const updatedGame = {
      ...game,
      completedRounds: newCompletedRounds,
      currentRoundIndex: nextRoundIndex,
      phase: 'bidding',
      currentRoundBids: [],
      status: isGameOver ? 'complete' : 'active',
      completedAt: isGameOver ? new Date().toISOString() : null,
    }

    setGame(updatedGame)
    await saveGame(updatedGame)
    setRoundResult({ scores, roundRecord, isGameOver, winners: isGameOver ? getWinners(updatedGame) : null })
    setError('')
  }

  // --- ROUND RESULT OVERLAY ---
  const advanceFromResult = () => {
    setRoundResult(null)
    if (roundResult?.isGameOver) {
      navigate('home')
    } else {
      setBidInputs(Object.fromEntries(players.map(p => [p.id, ''])))
    }
  }

  const forbiddenDealerBid = getDealerForbidden()

  // ===================== RENDER =====================

  if (roundResult) {
    const { scores, roundRecord, isGameOver, winners } = roundResult
    return (
      <div className="space-y-6">
        {isGameOver ? (
          <div className="felt-surface p-6 text-center border border-gold-600/40">
            <p className="text-4xl mb-2">♛</p>
            <h2 className="font-display text-2xl font-bold text-gold-400">Game Over!</h2>
            <p className="text-felt-200 mt-2 font-medium text-lg">
              {winners.length === 1 ? `${winners[0].name} wins!` : `Tie: ${winners.map(w => w.name).join(' & ')} win!`}
            </p>
          </div>
        ) : (
          <h2 className="font-display text-xl font-bold text-gold-500">
            Round {roundRecord.roundIndex + 1} Results
          </h2>
        )}

        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-felt-600 text-white">
                <th className="text-left px-4 py-3 font-semibold">Player</th>
                <th className="text-right px-3 py-3 font-semibold">Bid</th>
                <th className="text-right px-3 py-3 font-semibold">Won</th>
                <th className="text-right px-3 py-3 font-semibold">+Pts</th>
                <th className="text-right px-4 py-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => {
                const player = players.find(p => p.id === s.playerId)
                const madeBid = s.bid === s.tricks
                return (
                  <tr key={s.playerId} className={`border-b border-gray-100 ${madeBid ? 'bg-green-50' : i % 2 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {player?.name}
                      {madeBid && <span className="ml-1.5 text-green-600 text-xs font-bold">✓</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600">{s.bid}</td>
                    <td className="px-3 py-3 text-right text-gray-600">{s.tricks}</td>
                    <td className={`px-3 py-3 text-right font-bold ${madeBid ? 'text-green-600' : 'text-gray-700'}`}>
                      +{s.roundScore}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-felt-700">{s.cumulative}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <button onClick={advanceFromResult} className="btn-gold w-full py-4 text-lg">
          {roundResult.isGameOver ? 'View Home' : `Start Round ${roundRecord.roundIndex + 2}`}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Round header */}
      <div className="felt-surface p-4 border border-felt-600/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-felt-400 text-xs font-medium uppercase tracking-wider">
              Round {currentRoundIndex + 1} of {totalRounds}
            </p>
            <p className={`text-2xl font-bold mt-1 font-display ${SUIT_COLORS[trump]}`}>
              <span className="mr-1">{SUIT_ICONS[trump]}</span>
              {trump}
            </p>
          </div>
          <div className="text-right">
            <p className="text-felt-400 text-xs uppercase tracking-wider">Cards</p>
            <p className="text-3xl font-bold text-gold-400 font-display">{cardsInRound}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-felt-600/40 flex items-center justify-between">
          <p className="text-felt-400 text-sm">
            Dealer: <span className="text-gold-400 font-semibold">{dealer.name}</span>
          </p>
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-felt-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-500 rounded-full transition-all duration-500"
                style={{ width: `${((currentRoundIndex) / totalRounds) * 100}%` }}
              />
            </div>
            <span className="text-felt-500 text-xs">{Math.round((currentRoundIndex / totalRounds) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Phase panel */}
      {phase === 'bidding' ? (
        <div className="card-surface p-4">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-gray-800">Enter Bids</h2>
            <span className="text-xs bg-felt-100 text-felt-700 px-2 py-0.5 rounded-full font-medium">
              Bidding
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Left of dealer bids first, {dealer.name} (dealer) bids last.
          </p>

          <div className="space-y-3">
            {biddingOrder.map((playerIdx) => {
              const player = players[playerIdx]
              const isDealer = playerIdx === dealerIndex
              const currentBidVal = parseInt(bidInputs[player.id])
              const isForbidden = isDealer && forbiddenDealerBid !== null && currentBidVal === forbiddenDealerBid

              return (
                <div key={player.id} className="flex items-center justify-between gap-3 py-1">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {player.name}
                      {isDealer && (
                        <span className="ml-1.5 text-xs bg-gold-100 text-gold-700 px-1.5 py-0.5 rounded-full font-semibold border border-gold-200">
                          Dealer
                        </span>
                      )}
                    </p>
                    {isDealer && forbiddenDealerBid !== null && (
                      <p className={`text-xs mt-0.5 ${isForbidden ? 'text-card-red font-semibold' : 'text-gray-400'}`}>
                        Cannot bid {forbiddenDealerBid}
                      </p>
                    )}
                  </div>
                  <NumberInput
                    value={bidInputs[player.id] ?? ''}
                    onChange={val => handleBidChange(player.id, val)}
                    min={0}
                    max={cardsInRound}
                    forbidden={isDealer ? forbiddenDealerBid : null}
                  />
                </div>
              )
            })}
          </div>

          {error && (
            <p className="mt-3 text-card-red text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium">
              {error}
            </p>
          )}

          <button onClick={submitBids} className="btn-primary w-full mt-4">
            Submit Bids
          </button>
        </div>
      ) : (
        <div className="card-surface p-4">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-gray-800">Enter Tricks Won</h2>
            <span className="text-xs bg-gold-100 text-gold-700 px-2 py-0.5 rounded-full font-medium border border-gold-200">
              Scoring
            </span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500">Must total exactly {cardsInRound} tricks</p>
            <span
              className={`text-sm font-bold px-2.5 py-1 rounded-full transition-colors ${
                tricksTotal === cardsInRound
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {tricksTotal} / {cardsInRound}
            </span>
          </div>

          <div className="space-y-3">
            {players.map(player => {
              const bid = game.currentRoundBids.find(b => b.playerId === player.id)?.bid ?? '?'
              return (
                <div key={player.id} className="flex items-center justify-between gap-3 py-1">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{player.name}</p>
                    <p className="text-xs text-gray-400">Bid: {bid}</p>
                  </div>
                  <NumberInput
                    value={tricksInputs[player.id] ?? ''}
                    onChange={val => handleTricksChange(player.id, val)}
                    min={0}
                    max={cardsInRound}
                  />
                </div>
              )
            })}
          </div>

          {error && (
            <p className="mt-3 text-card-red text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium">
              {error}
            </p>
          )}

          <button
            onClick={submitTricks}
            disabled={tricksTotal !== cardsInRound}
            className={`mt-4 w-full py-3 rounded-lg font-semibold transition-all ${
              tricksTotal === cardsInRound
                ? 'btn-primary'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
            }`}
          >
            Submit Round
          </button>
        </div>
      )}

      {/* Running scoreboard */}
      <Scoreboard
        players={players}
        completedRounds={completedRounds}
        currentRoundIndex={currentRoundIndex}
        totalRounds={totalRounds}
      />
    </div>
  )
}
