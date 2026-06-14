// Klondike-Spiellogik. Reine Daten + Regeln, kein DOM.
//
// Zustand:
//   stock      : verdeckter Nachziehstapel (Array, letztes Element = oben)
//   waste      : aufgedeckter Ablagestapel (Array, letztes Element = oben)
//   foundations: 4 Ablagen (eine je Farbe-Slot, Ass -> König)
//   tableau    : 7 Spalten (Array von Arrays)
//   drawCount  : 1 oder 3 (Karten pro Nachziehen)
//   moves      : Zähler für angezeigte Züge
//   history    : Stack von Snapshots für Undo

import {
  SUITS,
  makeDeck,
  shuffle,
  isRed,
  MAX_RANK,
} from './cards.js';

export const TABLEAU_COLUMNS = 7;

/**
 * Startet ein neues Spiel.
 * @param {object} opts
 * @param {number} [opts.drawCount=1] 1 oder 3
 * @param {() => number} [opts.rng=Math.random]
 * @returns {object} frischer Spielzustand
 */
export function newGame({ drawCount = 1, rng = Math.random } = {}) {
  const deck = shuffle(makeDeck(), rng);

  const tableau = Array.from({ length: TABLEAU_COLUMNS }, () => []);
  // Klondike-Deal: Spalte i bekommt i+1 Karten, nur die oberste aufgedeckt.
  for (let col = 0; col < TABLEAU_COLUMNS; col++) {
    for (let n = 0; n <= col; n++) {
      const card = deck.pop();
      card.faceUp = n === col; // oberste Karte aufgedeckt
      tableau[col].push(card);
    }
  }

  // Rest geht in den Stock, verdeckt.
  const stock = deck;
  for (const card of stock) card.faceUp = false;

  return {
    stock,
    waste: [],
    foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
    tableau,
    drawCount,
    moves: 0,
    history: [],
  };
}

// ---------------------------------------------------------------------------
// Snapshot / Undo
// ---------------------------------------------------------------------------

function cloneCard(c) {
  return { id: c.id, suit: c.suit, rank: c.rank, faceUp: c.faceUp };
}

function snapshot(state) {
  return {
    stock: state.stock.map(cloneCard),
    waste: state.waste.map(cloneCard),
    foundations: {
      hearts: state.foundations.hearts.map(cloneCard),
      diamonds: state.foundations.diamonds.map(cloneCard),
      clubs: state.foundations.clubs.map(cloneCard),
      spades: state.foundations.spades.map(cloneCard),
    },
    tableau: state.tableau.map((col) => col.map(cloneCard)),
    moves: state.moves,
  };
}

/** Sichert den aktuellen Zustand vor einer Mutation (für Undo). */
function pushHistory(state) {
  state.history.push(snapshot(state));
  // Begrenzen, damit History nicht unbegrenzt wächst.
  if (state.history.length > 200) state.history.shift();
}

/** Macht den letzten Zug rückgängig. Gibt true zurück, wenn etwas passierte. */
export function undo(state) {
  const prev = state.history.pop();
  if (!prev) return false;
  state.stock = prev.stock;
  state.waste = prev.waste;
  state.foundations = prev.foundations;
  state.tableau = prev.tableau;
  state.moves = prev.moves;
  return true;
}

export function canUndo(state) {
  return state.history.length > 0;
}

// ---------------------------------------------------------------------------
// Regel-Helfer
// ---------------------------------------------------------------------------

function top(arr) {
  return arr.length ? arr[arr.length - 1] : null;
}

/** Darf `card` auf eine Foundation-Spalte (gleiche Farbe) gelegt werden? */
export function canMoveToFoundation(card, foundationPile) {
  const t = top(foundationPile);
  if (!t) return card.rank === 1; // leer: nur Ass
  return card.suit === t.suit && card.rank === t.rank + 1;
}

/** Darf `card` auf eine Tableau-Spalte gelegt werden? */
export function canMoveToTableau(card, tableauCol) {
  const t = top(tableauCol);
  if (!t) return card.rank === MAX_RANK; // leere Spalte: nur König
  if (!t.faceUp) return false;
  // Abwechselnde Farbe, absteigender Rang.
  return isRed(card) !== isRed(t) && card.rank === t.rank - 1;
}

/**
 * Prüft, ob eine Folge ab Index `fromIdx` in einer Tableau-Spalte eine gültige
 * bewegbare Sequenz ist (alle aufgedeckt, abwechselnd farbig, absteigend).
 */
export function isValidTableauSequence(tableauCol, fromIdx) {
  if (fromIdx < 0 || fromIdx >= tableauCol.length) return false;
  for (let i = fromIdx; i < tableauCol.length; i++) {
    const card = tableauCol[i];
    if (!card.faceUp) return false;
    if (i > fromIdx) {
      const prev = tableauCol[i - 1];
      if (isRed(card) === isRed(prev)) return false;
      if (card.rank !== prev.rank - 1) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Quellen-Lokalisierung
// ---------------------------------------------------------------------------

/**
 * Findet eine Karte per id im Spielzustand und liefert ihre Position.
 * @returns {{zone:string, col?:number, index:number}|null}
 */
export function locateCard(state, cardId) {
  const wi = state.waste.findIndex((c) => c.id === cardId);
  if (wi !== -1) return { zone: 'waste', index: wi };

  for (const suit of SUITS) {
    const fi = state.foundations[suit].findIndex((c) => c.id === cardId);
    if (fi !== -1) return { zone: 'foundation', suit, index: fi };
  }

  for (let col = 0; col < state.tableau.length; col++) {
    const idx = state.tableau[col].findIndex((c) => c.id === cardId);
    if (idx !== -1) return { zone: 'tableau', col, index: idx };
  }
  return null;
}

/**
 * Liefert die "aufnehmbare" Kartenfolge ab einer angeklickten Karte.
 * Bei waste/foundation immer nur die oberste einzelne Karte.
 * Bei tableau die gültige Sequenz ab der Karte (oder leer, wenn ungültig).
 * @returns {{cards: object[], from: object}|null}
 */
export function pickUp(state, cardId) {
  const loc = locateCard(state, cardId);
  if (!loc) return null;

  if (loc.zone === 'waste') {
    if (loc.index !== state.waste.length - 1) return null; // nur oberste
    return { cards: [state.waste[loc.index]], from: loc };
  }

  if (loc.zone === 'foundation') {
    const pile = state.foundations[loc.suit];
    if (loc.index !== pile.length - 1) return null;
    return { cards: [pile[loc.index]], from: loc };
  }

  // tableau
  const col = state.tableau[loc.col];
  if (!isValidTableauSequence(col, loc.index)) return null;
  return { cards: col.slice(loc.index), from: loc };
}

// ---------------------------------------------------------------------------
// Züge
// ---------------------------------------------------------------------------

/** Entfernt die aufgenommenen Karten aus ihrer Quelle. */
function removeFromSource(state, from, count) {
  if (from.zone === 'waste') {
    state.waste.splice(from.index, count);
  } else if (from.zone === 'foundation') {
    state.foundations[from.suit].splice(from.index, count);
  } else if (from.zone === 'tableau') {
    state.tableau[from.col].splice(from.index, count);
  }
}

/** Deckt die nun oberste Karte einer Tableau-Spalte auf, falls verdeckt. */
function flipExposedTableauCard(state, col) {
  const column = state.tableau[col];
  const t = top(column);
  if (t && !t.faceUp) {
    t.faceUp = true;
    return true;
  }
  return false;
}

/**
 * Versucht, die ab `cardId` aufgenommene Folge auf ein Ziel zu legen.
 * @param {object} target {zone:'foundation', suit} | {zone:'tableau', col}
 * @returns {boolean} true bei erfolgreichem Zug
 */
export function moveCard(state, cardId, target) {
  const picked = pickUp(state, cardId);
  if (!picked) return false;
  const { cards, from } = picked;

  if (target.zone === 'foundation') {
    if (cards.length !== 1) return false; // nur Einzelkarten auf Foundation
    const suit = cards[0].suit;
    if (!canMoveToFoundation(cards[0], state.foundations[suit])) return false;
    // Verhindern, dass eine Karte "auf sich selbst" gelegt wird.
    if (from.zone === 'foundation' && from.suit === suit) return false;
    pushHistory(state);
    removeFromSource(state, from, 1);
    state.foundations[suit].push(cards[0]);
  } else if (target.zone === 'tableau') {
    const destCol = state.tableau[target.col];
    // Nicht in dieselbe Spalte legen.
    if (from.zone === 'tableau' && from.col === target.col) return false;
    if (!canMoveToTableau(cards[0], destCol)) return false;
    pushHistory(state);
    removeFromSource(state, from, cards.length);
    for (const c of cards) destCol.push(c);
  } else {
    return false;
  }

  if (from.zone === 'tableau') flipExposedTableauCard(state, from.col);
  state.moves++;
  return true;
}

/**
 * Zieht Karten vom Stock auf den Waste (drawCount Stück) oder setzt
 * den Waste zurück in den Stock, wenn der Stock leer ist.
 * @returns {boolean} true wenn etwas passierte
 */
export function drawFromStock(state) {
  if (state.stock.length === 0) {
    if (state.waste.length === 0) return false;
    pushHistory(state);
    // Waste zurück in Stock (umgedreht), alles verdeckt.
    while (state.waste.length) {
      const c = state.waste.pop();
      c.faceUp = false;
      state.stock.push(c);
    }
    state.moves++;
    return true;
  }

  pushHistory(state);
  const n = Math.min(state.drawCount, state.stock.length);
  for (let i = 0; i < n; i++) {
    const c = state.stock.pop();
    c.faceUp = true;
    state.waste.push(c);
  }
  state.moves++;
  return true;
}

// ---------------------------------------------------------------------------
// Auto-Move & Gewinn
// ---------------------------------------------------------------------------

/**
 * Findet ein gültiges Foundation-Ziel für eine Karte (Auto bei Doppelklick).
 * @returns {{zone:'foundation', suit:string}|null}
 */
export function findFoundationTarget(state, cardId) {
  const picked = pickUp(state, cardId);
  if (!picked || picked.cards.length !== 1) return null;
  const card = picked.cards[0];
  if (canMoveToFoundation(card, state.foundations[card.suit])) {
    return { zone: 'foundation', suit: card.suit };
  }
  return null;
}

/**
 * Führt einen einzelnen automatischen Zug zur Foundation aus, falls möglich.
 * Quellen: Waste-Top und alle Tableau-Tops.
 * @returns {boolean} true wenn ein Zug gemacht wurde
 */
export function autoMoveOneToFoundation(state) {
  const candidates = [];
  const wTop = top(state.waste);
  if (wTop) candidates.push(wTop);
  for (const col of state.tableau) {
    const t = top(col);
    if (t && t.faceUp) candidates.push(t);
  }
  for (const card of candidates) {
    if (canMoveToFoundation(card, state.foundations[card.suit])) {
      return moveCard(state, card.id, { zone: 'foundation', suit: card.suit });
    }
  }
  return false;
}

/** Ist das Spiel gewonnen? (alle 4 Foundations voll = je 13 Karten) */
export function isWon(state) {
  return SUITS.every((suit) => state.foundations[suit].length === MAX_RANK);
}

// ---------------------------------------------------------------------------
// Tipp / Hint
// ---------------------------------------------------------------------------

/**
 * Sucht einen sinnvollen Zug und gibt ihn zurück (für die Tipp-Funktion).
 * Priorität: Foundation-Züge, dann Tableau-Züge die etwas aufdecken,
 * dann sonstige Tableau-Züge.
 * @returns {{cardId:string, target:object}|null}
 */
export function findHint(state) {
  // 1. Waste/Tableau -> Foundation
  const fromCards = [];
  const wTop = top(state.waste);
  if (wTop) fromCards.push({ card: wTop, fromTableauCol: -1 });
  for (let col = 0; col < state.tableau.length; col++) {
    const t = top(state.tableau[col]);
    if (t && t.faceUp) fromCards.push({ card: t, fromTableauCol: col });
  }

  for (const { card } of fromCards) {
    if (canMoveToFoundation(card, state.foundations[card.suit])) {
      return { cardId: card.id, target: { zone: 'foundation', suit: card.suit } };
    }
  }

  // 2. Tableau-Sequenz -> andere Tableau-Spalte (bevorzugt aufdeckend)
  const tableauMoves = [];
  for (let col = 0; col < state.tableau.length; col++) {
    const column = state.tableau[col];
    for (let idx = 0; idx < column.length; idx++) {
      if (!column[idx].faceUp) continue;
      if (!isValidTableauSequence(column, idx)) continue;
      const movingCard = column[idx];
      for (let dest = 0; dest < state.tableau.length; dest++) {
        if (dest === col) continue;
        if (canMoveToTableau(movingCard, state.tableau[dest])) {
          // Aufdeckend, wenn unter der Sequenz eine verdeckte Karte liegt.
          const revealing = idx > 0 && !column[idx - 1].faceUp;
          // Sinnloser König-Shuffle vermeiden: ganze Spalte (idx 0) auf leere
          // Zielspalte bringt nichts.
          const pointless =
            idx === 0 && state.tableau[dest].length === 0;
          if (!pointless) {
            tableauMoves.push({
              cardId: movingCard.id,
              target: { zone: 'tableau', col: dest },
              revealing,
            });
          }
        }
      }
      break; // pro Spalte nur die höchste gültige Sequenz prüfen
    }
  }

  tableauMoves.sort((a, b) => Number(b.revealing) - Number(a.revealing));
  if (tableauMoves.length) {
    const m = tableauMoves[0];
    return { cardId: m.cardId, target: m.target };
  }

  // 3. Waste -> Tableau
  if (wTop) {
    for (let dest = 0; dest < state.tableau.length; dest++) {
      if (canMoveToTableau(wTop, state.tableau[dest])) {
        return { cardId: wTop.id, target: { zone: 'tableau', col: dest } };
      }
    }
  }

  // 4. Nachziehen möglich?
  if (state.stock.length > 0 || state.waste.length > 0) {
    return { cardId: null, target: { zone: 'stock' } };
  }

  return null;
}
