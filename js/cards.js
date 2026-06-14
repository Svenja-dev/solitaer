// Karten-Modell: reine Daten, kein DOM.

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RED_SUITS = new Set(['hearts', 'diamonds']);

// Rang 1 = Ass, 11 = Bube, 12 = Dame, 13 = König.
export const MIN_RANK = 1;
export const MAX_RANK = 13;

const SUIT_SYMBOL = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const RANK_LABEL = {
  1: 'A',
  11: 'B',
  12: 'D',
  13: 'K',
};

let nextId = 0;

/**
 * Erzeugt eine einzelne Karte.
 * @param {string} suit eine der SUITS
 * @param {number} rank 1..13
 */
export function makeCard(suit, rank) {
  return {
    id: `c${nextId++}`,
    suit,
    rank,
    faceUp: false,
  };
}

export function isRed(card) {
  return RED_SUITS.has(card.suit);
}

export function suitSymbol(suit) {
  return SUIT_SYMBOL[suit];
}

export function rankLabel(rank) {
  return RANK_LABEL[rank] ?? String(rank);
}

/** Erzeugt ein frisches, geordnetes 52-Karten-Deck (alle verdeckt). */
export function makeDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = MIN_RANK; rank <= MAX_RANK; rank++) {
      deck.push(makeCard(suit, rank));
    }
  }
  return deck;
}

/**
 * Mischt ein Array in-place per Fisher-Yates.
 * @param {Array} arr
 * @param {() => number} rng Zufallsfunktion 0..1 (Standard Math.random)
 */
export function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
