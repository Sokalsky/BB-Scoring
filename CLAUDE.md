# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bugger Bridge is a trick-taking card game scoring system. The goal is a robust scoring backend and React-based frontend UI with statistical analysis.

## Tech Stack

- **Primary app:** `bugger-bridge.html` — single standalone file, React 18 + Tailwind CDN + Babel Standalone. Open in any browser, no install required.
- **Vite project:** `src/` directory with full React + Tailwind source. Run with Node.js if available:

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Production build
```

## Architecture

```
src/
  engine/
    scoring.js       # Pure scoring logic — source of truth for all calculations
  components/
    Scoreboard.jsx   # Main UI component
```

**Key architectural rules:**
- All scoring calculations live in `src/engine/scoring.js` as pure functions
- `gameState` is a plain JSON-serializable object — never store functions in state
- No business logic inside React components
- `players`: `{id: string, name: string, score: number}[]`
- `roundHistory`: append-only array of completed rounds with full scoring breakdowns

## Game Rules

### Setup
- 2–6 players
- Max cards per round = `floor(52 / playerCount)` (e.g., 13 cards for 4 players)
- Min cards per round is configured at game start

### Round Sequence
Rounds go: max → (max-1) → ... → min → min (repeated until each player has dealt at min) → (min+1) → ... → max

### Trump Rotation
Spades → Hearts → Diamonds → Clubs → No Trump → (repeats)

### Bidding
- Starts with the player left of the dealer, proceeds clockwise; dealer bids last
- Dealer **cannot** bid an amount that makes the total tricks bid equal the number of cards in that round (the "must-bust" rule)
- Bids must be ≥ 0 and ≤ cards in round

### Scoring
- Tricks won = points equal to tricks taken
- Bid matched bonus = +10 points if tricks won equals bid exactly
- Round score = `tricks_won + (bid_matched ? 10 : 0)`
- Total score = sum of all round scores

### Win Condition
Highest total score after the final round wins. Ties are possible — all tied players are co-winners.

### Validation
- Negative values are invalid and must be rejected
- Tricks won per round must sum to exactly the number of cards in that round
