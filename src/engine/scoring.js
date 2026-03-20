export const TRUMP_SUITS = ['Spades', 'Hearts', 'Diamonds', 'Clubs', 'No Trump'];
export const SUIT_DISPLAY = {
  Spades: '♠ Spades',
  Hearts: '♥ Hearts',
  Diamonds: '♦ Diamonds',
  Clubs: '♣ Clubs',
  'No Trump': 'No Trump',
};

/** Absolute maximum cards possible for this player count */
export function getMaxCards(playerCount) {
  return Math.floor(52 / playerCount);
}

/** Recommended default max cards (3-player starts at 15 instead of 17) */
export function getDefaultMaxCards(playerCount) {
  if (playerCount === 3) return 15;
  return getMaxCards(playerCount);
}

/** Recommended default min cards (3-player starts at 3 instead of 1) */
export function getDefaultMinCards(playerCount) {
  if (playerCount === 3) return 3;
  return 1;
}

/**
 * Generates the full round card sequence:
 *   max → (max-1) → ... → min → [min repeated (playerCount-1) more times] → (min+1) → ... → max
 */
export function generateRoundSequence(playerCount, minCards, maxCards) {
  const seq = [];
  for (let c = maxCards; c >= minCards; c--) seq.push(c);
  for (let i = 0; i < playerCount - 1; i++) seq.push(minCards);
  for (let c = minCards + 1; c <= maxCards; c++) seq.push(c);
  return seq;
}

export function getTrumpForRound(roundIndex) {
  return TRUMP_SUITS[roundIndex % TRUMP_SUITS.length];
}

export function getDealerIndex(roundIndex, playerCount) {
  return roundIndex % playerCount;
}

/** Returns player indices in bidding order: left of dealer first, dealer last. */
export function getBiddingOrder(dealerIndex, playerCount) {
  return Array.from({ length: playerCount }, (_, i) => (dealerIndex + 1 + i) % playerCount);
}

/**
 * Returns the bid value the dealer may NOT choose (would make total = cards in round).
 * Returns null if all bids are valid for the dealer.
 */
export function getForbiddenDealerBid(otherBids, cardsInRound) {
  const sum = otherBids.reduce((a, b) => a + b, 0);
  const forbidden = cardsInRound - sum;
  return forbidden >= 0 && forbidden <= cardsInRound ? forbidden : null;
}

export function calculateRoundScore(bid, tricksWon) {
  return tricksWon + (tricksWon === bid ? 10 : 0);
}

export function getCumulativeScores(completedRounds, players) {
  const totals = Object.fromEntries(players.map(p => [p.id, 0]));
  completedRounds.forEach(round =>
    round.scores.forEach(s => { totals[s.playerId] = (totals[s.playerId] || 0) + s.roundScore; })
  );
  return totals;
}

export function getWinners(game) {
  const totals = getCumulativeScores(game.completedRounds, game.players);
  const max = Math.max(...Object.values(totals));
  return game.players.filter(p => totals[p.id] === max);
}

export function computePlayerStats(games) {
  const statsMap = {};

  games.filter(g => g.status === 'complete').forEach(game => {
    const cumScores = getCumulativeScores(game.completedRounds, game.players);
    const maxScore = Math.max(...Object.values(cumScores));

    game.players.forEach(player => {
      if (!statsMap[player.name]) {
        statsMap[player.name] = {
          name: player.name,
          gamesPlayed: 0,
          wins: 0,
          totalRounds: 0,
          bidMatches: 0,
          totalScore: 0,
          bestGameScore: 0,
        };
      }
      const s = statsMap[player.name];
      s.gamesPlayed++;
      const gameScore = cumScores[player.id] || 0;
      if (gameScore === maxScore) s.wins++;
      s.totalScore += gameScore;
      if (gameScore > s.bestGameScore) s.bestGameScore = gameScore;

      game.completedRounds.forEach(round => {
        const bidEntry = round.bids.find(b => b.playerId === player.id);
        const tricksEntry = round.tricks.find(t => t.playerId === player.id);
        if (!bidEntry || !tricksEntry) return;
        s.totalRounds++;
        if (bidEntry.bid === tricksEntry.tricks) s.bidMatches++;
      });
    });
  });

  return Object.values(statsMap)
    .map(s => ({
      ...s,
      winRate: s.gamesPlayed ? ((s.wins / s.gamesPlayed) * 100).toFixed(0) : '0',
      avgScore: s.gamesPlayed ? (s.totalScore / s.gamesPlayed).toFixed(1) : '0.0',
      bidAccuracy: s.totalRounds ? ((s.bidMatches / s.totalRounds) * 100).toFixed(0) : '0',
    }))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.wins - a.wins);
}
