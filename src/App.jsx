import { useState, useEffect } from 'react'
import HomeView from './views/HomeView'
import SetupView from './views/SetupView'
import GameView from './views/GameView'
import StatsView from './views/StatsView'
import { getActiveGame } from './storage'

const SUIT_DECORATIONS = ['♠', '♥', '♦', '♣']

export default function App() {
  const [view, setView] = useState('home')
  const [currentGameId, setCurrentGameId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getActiveGame().then(activeGame => {
      if (activeGame) {
        setCurrentGameId(activeGame.id)
        setView('game')
      }
      setLoading(false)
    })
  }, [])

  const navigate = (v, gameId = null) => {
    setView(v)
    if (gameId !== null) setCurrentGameId(gameId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🃏</div>
          <p className="text-felt-300 font-display text-lg">Shuffling the deck...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pattern-bg">
      {/* Header */}
      <header className="border-b border-felt-700/60 bg-felt-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-2 group"
          >
            <span className="text-2xl">🃏</span>
            <span className="font-display text-xl font-bold text-gold-500 group-hover:text-gold-400 transition-colors tracking-wide">
              Bugger Bridge
            </span>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('stats')}
              className={`text-sm font-medium transition-colors ${
                view === 'stats'
                  ? 'text-gold-400'
                  : 'text-felt-300 hover:text-gold-500'
              }`}
            >
              Statistics
            </button>
          </div>
        </div>
      </header>

      {/* Decorative suit strip */}
      <div className="h-1 bg-gradient-to-r from-felt-900 via-gold-600 to-felt-900 opacity-60" />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {view === 'home' && <HomeView navigate={navigate} />}
        {view === 'setup' && <SetupView navigate={navigate} />}
        {view === 'game' && <GameView gameId={currentGameId} navigate={navigate} />}
        {view === 'stats' && <StatsView navigate={navigate} />}
      </main>

      {/* Footer decoration */}
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-felt-950 to-transparent pointer-events-none" />
    </div>
  )
}
