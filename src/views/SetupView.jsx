import { useState } from 'react'
import { getMaxCards, getDefaultMaxCards, getDefaultMinCards, generateRoundSequence } from '../engine/scoring'
import { saveGame, generateId } from '../storage'

export default function SetupView({ navigate }) {
  const [playerCount, setPlayerCount] = useState(4)
  const [playerNames, setPlayerNames] = useState(['', '', '', ''])
  const [maxCards, setMaxCards] = useState(getDefaultMaxCards(4))
  const [minCards, setMinCards] = useState(getDefaultMinCards(4))
  const [error, setError] = useState('')

  const absoluteMax = getMaxCards(playerCount)

  const handlePlayerCountChange = (count) => {
    setPlayerCount(count)
    setPlayerNames(prev => {
      const next = [...prev]
      while (next.length < count) next.push('')
      return next.slice(0, count)
    })
    const newMax = getDefaultMaxCards(count)
    const newMin = getDefaultMinCards(count)
    setMaxCards(newMax)
    setMinCards(newMin)
  }

  const handleNameChange = (i, val) => {
    setPlayerNames(prev => {
      const next = [...prev]
      next[i] = val
      return next
    })
  }

  const handleStart = async () => {
    const trimmed = playerNames.slice(0, playerCount).map(n => n.trim())
    if (trimmed.some(n => !n)) {
      setError('All player names are required.')
      return
    }
    if (new Set(trimmed.map(n => n.toLowerCase())).size < trimmed.length) {
      setError('Player names must be unique.')
      return
    }
    if (maxCards < 2 || maxCards > absoluteMax) {
      setError(`Maximum cards must be between 2 and ${absoluteMax}.`)
      return
    }
    if (minCards < 1 || minCards >= maxCards) {
      setError(`Minimum cards must be between 1 and ${maxCards - 1}.`)
      return
    }

    const players = trimmed.map(name => ({ id: generateId(), name }))
    const roundSequence = generateRoundSequence(playerCount, minCards, maxCards)

    const game = {
      id: generateId(),
      status: 'active',
      createdAt: new Date().toISOString(),
      completedAt: null,
      players,
      minCards,
      maxCards,
      roundSequence,
      currentRoundIndex: 0,
      phase: 'bidding',
      currentRoundBids: [],
      completedRounds: [],
    }

    await saveGame(game)
    navigate('game', game.id)
  }

  const seatLabels = ['North', 'East', 'South', 'West', 'NE', 'SE']

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-gold-500">New Game</h1>

      {/* Player Count */}
      <div className="card-surface p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Number of Players
        </label>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map(n => (
            <button
              key={n}
              onClick={() => handlePlayerCountChange(n)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 transition-all duration-150 ${
                playerCount === n
                  ? 'bg-felt-600 text-white border-felt-500 shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-felt-400 hover:text-felt-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Player Names */}
      <div className="card-surface p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Player Names
        </label>
        <div className="space-y-2">
          {Array.from({ length: playerCount }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-6 text-right font-medium">{i + 1}.</span>
              <input
                type="text"
                placeholder={`Player ${i + 1}`}
                value={playerNames[i] || ''}
                onChange={e => handleNameChange(i, e.target.value)}
                className="input-field"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Max Cards */}
      <div className="card-surface p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Maximum Cards per Round
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Absolute max for {playerCount} players is {absoluteMax}. Rounds start here and count down.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMaxCards(c => {
              const newMax = Math.max(2, c - 1)
              if (minCards >= newMax) setMinCards(newMax - 1)
              return newMax
            })}
            className="w-10 h-10 rounded-lg border-2 border-gray-200 text-lg font-bold text-gray-500 hover:bg-felt-50 hover:border-felt-400 flex items-center justify-center transition-all"
          >
            −
          </button>
          <span className="text-2xl font-bold text-felt-700 w-12 text-center font-display">
            {maxCards}
          </span>
          <button
            onClick={() => setMaxCards(c => Math.min(absoluteMax, c + 1))}
            className="w-10 h-10 rounded-lg border-2 border-gray-200 text-lg font-bold text-gray-500 hover:bg-felt-50 hover:border-felt-400 flex items-center justify-center transition-all"
          >
            +
          </button>
        </div>
      </div>

      {/* Min Cards */}
      <div className="card-surface p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Minimum Cards per Round
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Rounds go from {maxCards} down to this minimum, then back up.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMinCards(c => Math.max(1, c - 1))}
            className="w-10 h-10 rounded-lg border-2 border-gray-200 text-lg font-bold text-gray-500 hover:bg-felt-50 hover:border-felt-400 flex items-center justify-center transition-all"
          >
            −
          </button>
          <span className="text-2xl font-bold text-felt-700 w-12 text-center font-display">
            {minCards}
          </span>
          <button
            onClick={() => setMinCards(c => Math.min(maxCards - 1, c + 1))}
            className="w-10 h-10 rounded-lg border-2 border-gray-200 text-lg font-bold text-gray-500 hover:bg-felt-50 hover:border-felt-400 flex items-center justify-center transition-all"
          >
            +
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          This game will have{' '}
          <span className="font-semibold text-felt-600">
            {generateRoundSequence(playerCount, minCards, maxCards).length}
          </span>{' '}
          rounds.
        </p>
      </div>

      {error && (
        <p className="text-card-red text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium">
          {error}
        </p>
      )}

      <button onClick={handleStart} className="btn-gold w-full py-4 text-lg">
        Deal the Cards
      </button>

      <button
        onClick={() => navigate('home')}
        className="w-full text-felt-400 text-sm hover:text-felt-200 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
