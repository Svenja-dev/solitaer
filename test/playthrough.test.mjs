// Integrationstest: greedy Solver spielt über die echte Spiel-API.
// Stellt sicher, dass draw/move/auto/flip zusammen einen konsistenten,
// nie korrupten Zustand erzeugen (keine doppelten/verlorenen Karten).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  newGame,
  drawFromStock,
  autoMoveOneToFoundation,
  moveCard,
  isWon,
  canMoveToTableau,
  isValidTableauSequence,
} from '../js/game.js';
import { SUITS } from '../js/cards.js';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function countAllCards(state) {
  const all = [
    ...state.stock,
    ...state.waste,
    ...state.tableau.flat(),
    ...SUITS.flatMap((su) => state.foundations[su]),
  ];
  return { total: all.length, unique: new Set(all.map((c) => c.id)).size };
}

function top(arr) {
  return arr.length ? arr[arr.length - 1] : null;
}

// Ein einfacher Greedy-Schritt: Foundation > aufdeckender Tableau-Zug >
// Waste->Tableau > nachziehen. Gibt false zurück, wenn nichts mehr geht.
function greedyStep(state) {
  if (autoMoveOneToFoundation(state)) return true;

  // aufdeckende Tableau-Züge: oberste verschiebbare Karte einer Spalte,
  // unter der eine verdeckte Karte liegt
  for (let col = 0; col < state.tableau.length; col++) {
    const column = state.tableau[col];
    for (let idx = 0; idx < column.length; idx++) {
      if (!column[idx].faceUp) continue;
      if (!isValidTableauSequence(column, idx)) break;
      const revealing = idx > 0 && !column[idx - 1].faceUp;
      const movingTopOfEmpty = idx === 0;
      const card = column[idx];
      for (let dest = 0; dest < state.tableau.length; dest++) {
        if (dest === col) continue;
        if (movingTopOfEmpty && state.tableau[dest].length === 0) continue;
        if (canMoveToTableau(card, state.tableau[dest])) {
          if (revealing) {
            return moveCard(state, card.id, { zone: 'tableau', col: dest });
          }
        }
      }
      break;
    }
  }

  // Waste -> Tableau
  const w = top(state.waste);
  if (w) {
    for (let dest = 0; dest < state.tableau.length; dest++) {
      if (canMoveToTableau(w, state.tableau[dest])) {
        return moveCard(state, w.id, { zone: 'tableau', col: dest });
      }
    }
  }

  // nachziehen
  return drawFromStock(state);
}

test('Greedy-Durchlauf über viele Seeds: Zustand bleibt immer konsistent', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const state = newGame({ drawCount: 1, rng: seededRng(seed * 101) });
    let steps = 0;
    while (!isWon(state) && steps < 5000) {
      const progressed = greedyStep(state);
      steps++;
      // Invariante nach JEDEM Schritt: genau 52 eindeutige Karten
      const { total, unique } = countAllCards(state);
      assert.equal(total, 52, `Seed ${seed}: Kartenzahl != 52 (${total})`);
      assert.equal(unique, 52, `Seed ${seed}: doppelte/verlorene Karte`);
      if (!progressed) break; // festgefahren -> ok, kein Crash
    }
    // Foundations niemals überfüllt oder falsch sortiert
    for (const suit of SUITS) {
      const pile = state.foundations[suit];
      pile.forEach((c, i) => {
        assert.equal(c.suit, suit);
        assert.equal(c.rank, i + 1, `Seed ${seed}: Foundation ${suit} falsch sortiert`);
      });
    }
  }
});

test('Mindestens einige Seeds sind mit Greedy lösbar (Engine kann gewinnen)', () => {
  let wins = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const state = newGame({ drawCount: 1, rng: seededRng(seed * 7919) });
    let steps = 0;
    while (!isWon(state) && steps < 8000) {
      if (!greedyStep(state)) break;
      steps++;
    }
    if (isWon(state)) wins++;
  }
  // Ein simpler Greedy gewinnt nicht jedes Spiel, aber nachweislich manche —
  // das beweist, dass ein vollständiger Sieg über die echte API erreichbar ist.
  assert.ok(wins >= 1, `Greedy hat 0 Spiele gewonnen (erwartet >=1)`);
});
