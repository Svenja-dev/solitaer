// Reine Logik-Tests, ausführbar mit: node --test test/game.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  makeDeck,
  makeCard,
  shuffle,
  isRed,
} from '../js/cards.js';
import {
  newGame,
  moveCard,
  drawFromStock,
  undo,
  canUndo,
  canMoveToFoundation,
  canMoveToTableau,
  isValidTableauSequence,
  pickUp,
  locateCard,
  findFoundationTarget,
  autoMoveOneToFoundation,
  isWon,
  findHint,
  TABLEAU_COLUMNS,
} from '../js/game.js';

// Deterministischer RNG für reproduzierbare Deals.
function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

test('Deck hat 52 eindeutige Karten', () => {
  const deck = makeDeck();
  assert.equal(deck.length, 52);
  const ids = new Set(deck.map((c) => c.id));
  assert.equal(ids.size, 52);
  const combos = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
  assert.equal(combos.size, 52);
});

test('shuffle behält alle Karten (Permutation)', () => {
  const deck = makeDeck();
  const before = deck.map((c) => `${c.suit}-${c.rank}`).sort();
  shuffle(deck, seededRng(42));
  const after = deck.map((c) => `${c.suit}-${c.rank}`).sort();
  assert.deepEqual(after, before);
});

test('newGame verteilt korrekt: 7 Spalten, Stock=24, oberste aufgedeckt', () => {
  const s = newGame({ rng: seededRng(1) });
  assert.equal(s.tableau.length, TABLEAU_COLUMNS);
  let dealt = 0;
  for (let col = 0; col < TABLEAU_COLUMNS; col++) {
    assert.equal(s.tableau[col].length, col + 1);
    dealt += col + 1;
    // nur oberste aufgedeckt
    s.tableau[col].forEach((card, idx) => {
      assert.equal(card.faceUp, idx === col);
    });
  }
  assert.equal(dealt, 28);
  assert.equal(s.stock.length, 52 - 28);
  assert.equal(s.waste.length, 0);
  // alle Stock-Karten verdeckt
  assert.ok(s.stock.every((c) => !c.faceUp));
});

test('alle 52 Karten sind nach dem Deal genau einmal vorhanden', () => {
  const s = newGame({ rng: seededRng(7) });
  const all = [
    ...s.stock,
    ...s.waste,
    ...s.tableau.flat(),
    ...Object.values(s.foundations).flat(),
  ];
  assert.equal(all.length, 52);
  assert.equal(new Set(all.map((c) => c.id)).size, 52);
});

test('canMoveToFoundation: Ass auf leer, dann aufsteigend gleiche Farbe', () => {
  const pile = [];
  const aceH = makeCard('hearts', 1);
  const twoH = makeCard('hearts', 2);
  const twoS = makeCard('spades', 2);
  assert.equal(canMoveToFoundation(aceH, pile), true);
  assert.equal(canMoveToFoundation(twoH, pile), false); // leer nur Ass
  pile.push(aceH);
  assert.equal(canMoveToFoundation(twoH, pile), true);
  assert.equal(canMoveToFoundation(twoS, pile), false); // falsche Farbe
});

test('canMoveToTableau: König auf leer, sonst abwechselnd farbig absteigend', () => {
  const emptyCol = [];
  const kingS = makeCard('spades', 13);
  const queenH = makeCard('hearts', 12);
  const queenS = makeCard('spades', 12);
  assert.equal(canMoveToTableau(kingS, emptyCol), true);
  assert.equal(canMoveToTableau(queenH, emptyCol), false); // leer nur König

  const col = [{ ...makeCard('spades', 7), faceUp: true }]; // schwarze 7
  const red6 = makeCard('hearts', 6);
  const black6 = makeCard('clubs', 6);
  assert.equal(canMoveToTableau(red6, col), true); // rot auf schwarz, 6 auf 7
  assert.equal(canMoveToTableau(black6, col), false); // gleiche Farbe
  assert.equal(canMoveToTableau(makeCard('hearts', 5), col), false); // falscher Rang
});

test('canMoveToTableau: verdeckte Zielkarte verbietet Ablage', () => {
  const col = [makeCard('spades', 7)]; // faceUp default false
  assert.equal(canMoveToTableau(makeCard('hearts', 6), col), false);
});

test('isValidTableauSequence erkennt gültige & ungültige Folgen', () => {
  const col = [
    { ...makeCard('clubs', 9), faceUp: true },
    { ...makeCard('hearts', 8), faceUp: true },
    { ...makeCard('spades', 7), faceUp: true },
  ];
  assert.equal(isValidTableauSequence(col, 0), true);
  assert.equal(isValidTableauSequence(col, 1), true);

  const broken = [
    { ...makeCard('clubs', 9), faceUp: true },
    { ...makeCard('hearts', 7), faceUp: true }, // falscher Rang
  ];
  assert.equal(isValidTableauSequence(broken, 0), false);

  const withFaceDown = [
    { ...makeCard('clubs', 9), faceUp: false },
    { ...makeCard('hearts', 8), faceUp: true },
  ];
  assert.equal(isValidTableauSequence(withFaceDown, 0), false);
});

test('drawFromStock zieht 1 Karte und deckt sie auf', () => {
  const s = newGame({ drawCount: 1, rng: seededRng(3) });
  const stockBefore = s.stock.length;
  const ok = drawFromStock(s);
  assert.equal(ok, true);
  assert.equal(s.stock.length, stockBefore - 1);
  assert.equal(s.waste.length, 1);
  assert.equal(s.waste[0].faceUp, true);
});

test('drawFromStock mit drawCount=3 zieht 3 Karten', () => {
  const s = newGame({ drawCount: 3, rng: seededRng(3) });
  drawFromStock(s);
  assert.equal(s.waste.length, 3);
  assert.ok(s.waste.every((c) => c.faceUp));
});

test('Stock-Recycling: leerer Stock + Waste -> Waste zurück, verdeckt', () => {
  const s = newGame({ drawCount: 3, rng: seededRng(9) });
  // Stock komplett leeren
  let guard = 0;
  while (s.stock.length > 0 && guard++ < 100) drawFromStock(s);
  assert.equal(s.stock.length, 0);
  const wasteCount = s.waste.length;
  assert.ok(wasteCount > 0);
  const ok = drawFromStock(s); // recycle
  assert.equal(ok, true);
  assert.equal(s.stock.length, wasteCount);
  assert.equal(s.waste.length, 0);
  assert.ok(s.stock.every((c) => !c.faceUp));
});

test('drawFromStock auf komplett leerem System tut nichts', () => {
  const s = newGame({ rng: seededRng(2) });
  s.stock = [];
  s.waste = [];
  assert.equal(drawFromStock(s), false);
});

test('moveCard Waste -> Foundation (Ass)', () => {
  const s = newGame({ rng: seededRng(5) });
  // Konstruiere: lege ein Ass oben auf den Waste.
  const ace = makeCard('hearts', 1);
  ace.faceUp = true;
  s.waste.push(ace);
  const ok = moveCard(s, ace.id, { zone: 'foundation', suit: 'hearts' });
  assert.equal(ok, true);
  assert.equal(s.foundations.hearts.length, 1);
  assert.equal(s.waste.includes(ace), false);
  assert.equal(s.moves, 1);
});

test('moveCard deckt darunterliegende Tableau-Karte auf', () => {
  const s = newGame({ rng: seededRng(11) });
  // Spalte 1 hat 2 Karten: [verdeckt, aufgedeckt]. Wir bauen ein sicheres Setup.
  const hidden = makeCard('clubs', 4);
  hidden.faceUp = false;
  const movable = makeCard('hearts', 13); // König, geht auf leere Spalte
  movable.faceUp = true;
  s.tableau[0] = [hidden, movable];
  // leere Zielspalte
  s.tableau[1] = [];
  const ok = moveCard(s, movable.id, { zone: 'tableau', col: 1 });
  assert.equal(ok, true);
  assert.equal(s.tableau[0].length, 1);
  assert.equal(s.tableau[0][0].faceUp, true); // aufgedeckt!
});

test('moveCard verschiebt gültige Mehrkarten-Sequenz im Tableau', () => {
  const s = newGame({ rng: seededRng(13) });
  s.tableau[0] = [
    { ...makeCard('spades', 9), faceUp: true },
    { ...makeCard('hearts', 8), faceUp: true },
    { ...makeCard('clubs', 7), faceUp: true },
  ];
  s.tableau[1] = [{ ...makeCard('hearts', 10), faceUp: true }]; // rote 10
  // schwarze 9 auf rote 10 -> Sequenz 9,8,7 zieht mit
  const nineId = s.tableau[0][0].id;
  const ok = moveCard(s, nineId, { zone: 'tableau', col: 1 });
  assert.equal(ok, true);
  assert.equal(s.tableau[0].length, 0);
  assert.equal(s.tableau[1].length, 4);
});

test('moveCard verweigert ungültige Sequenz-Verschiebung', () => {
  const s = newGame({ rng: seededRng(13) });
  s.tableau[0] = [
    { ...makeCard('spades', 9), faceUp: true },
    { ...makeCard('hearts', 5), faceUp: true }, // kaputte Sequenz
  ];
  s.tableau[1] = [{ ...makeCard('hearts', 10), faceUp: true }];
  const nineId = s.tableau[0][0].id;
  const ok = moveCard(s, nineId, { zone: 'tableau', col: 1 });
  assert.equal(ok, false);
});

test('moveCard verweigert Verschiebung in dieselbe Spalte', () => {
  const s = newGame({ rng: seededRng(13) });
  s.tableau[0] = [{ ...makeCard('hearts', 13), faceUp: true }];
  const id = s.tableau[0][0].id;
  const ok = moveCard(s, id, { zone: 'tableau', col: 0 });
  assert.equal(ok, false);
});

test('undo stellt den Zustand vor dem Zug wieder her', () => {
  const s = newGame({ rng: seededRng(17) });
  const ace = makeCard('spades', 1);
  ace.faceUp = true;
  s.waste.push(ace);
  const wasteLenBefore = s.waste.length;
  moveCard(s, ace.id, { zone: 'foundation', suit: 'spades' });
  assert.equal(s.foundations.spades.length, 1);
  assert.equal(canUndo(s), true);
  undo(s);
  assert.equal(s.foundations.spades.length, 0);
  assert.equal(s.waste.length, wasteLenBefore);
  assert.equal(s.waste[s.waste.length - 1].id, ace.id);
});

test('undo macht auch das Aufdecken rückgängig', () => {
  const s = newGame({ rng: seededRng(19) });
  const hidden = makeCard('clubs', 4);
  hidden.faceUp = false;
  const king = makeCard('hearts', 13);
  king.faceUp = true;
  s.tableau[0] = [hidden, king];
  s.tableau[1] = [];
  moveCard(s, king.id, { zone: 'tableau', col: 1 });
  assert.equal(s.tableau[0][0].faceUp, true);
  undo(s);
  assert.equal(s.tableau[0][0].faceUp, false); // wieder verdeckt
  assert.equal(s.tableau[0].length, 2);
});

test('pickUp liefert nur oberste Waste-Karte', () => {
  const s = newGame({ rng: seededRng(23) });
  const a = makeCard('hearts', 5); a.faceUp = true;
  const b = makeCard('spades', 6); b.faceUp = true;
  s.waste.push(a, b);
  assert.equal(pickUp(s, a.id), null); // nicht oberste
  const picked = pickUp(s, b.id);
  assert.equal(picked.cards.length, 1);
  assert.equal(picked.cards[0].id, b.id);
});

test('findFoundationTarget findet passendes Ziel', () => {
  const s = newGame({ rng: seededRng(29) });
  s.foundations.hearts = [{ ...makeCard('hearts', 1), faceUp: true }];
  const two = makeCard('hearts', 2); two.faceUp = true;
  s.waste.push(two);
  const target = findFoundationTarget(s, two.id);
  assert.deepEqual(target, { zone: 'foundation', suit: 'hearts' });
});

test('autoMoveOneToFoundation zieht ein Ass hoch', () => {
  const s = newGame({ rng: seededRng(31) });
  const ace = makeCard('diamonds', 1); ace.faceUp = true;
  s.tableau[3].push(ace);
  const moved = autoMoveOneToFoundation(s);
  assert.equal(moved, true);
  assert.equal(s.foundations.diamonds.length, 1);
});

test('isWon erkennt vollständigen Sieg', () => {
  const s = newGame({ rng: seededRng(37) });
  for (const suit of ['hearts', 'diamonds', 'clubs', 'spades']) {
    s.foundations[suit] = [];
    for (let r = 1; r <= 13; r++) {
      s.foundations[suit].push({ ...makeCard(suit, r), faceUp: true });
    }
  }
  assert.equal(isWon(s), true);
});

test('isWon ist false bei unvollständigem Spiel', () => {
  const s = newGame({ rng: seededRng(41) });
  assert.equal(isWon(s), false);
});

test('findHint findet Ass-zu-Foundation-Zug', () => {
  const s = newGame({ rng: seededRng(43) });
  const ace = makeCard('clubs', 1); ace.faceUp = true;
  s.waste.push(ace);
  const hint = findHint(s);
  assert.equal(hint.cardId, ace.id);
  assert.deepEqual(hint.target, { zone: 'foundation', suit: 'clubs' });
});

test('locateCard findet Karten in allen Zonen', () => {
  const s = newGame({ rng: seededRng(47) });
  const tabCard = s.tableau[2][s.tableau[2].length - 1];
  const loc = locateCard(s, tabCard.id);
  assert.equal(loc.zone, 'tableau');
  assert.equal(loc.col, 2);

  const stockCard = s.stock[0];
  // stock wird von locateCard nicht durchsucht (nicht interaktiv) -> null
  assert.equal(locateCard(s, stockCard.id), null);
});

test('isRed klassifiziert Farben korrekt', () => {
  assert.equal(isRed(makeCard('hearts', 1)), true);
  assert.equal(isRed(makeCard('diamonds', 1)), true);
  assert.equal(isRed(makeCard('clubs', 1)), false);
  assert.equal(isRed(makeCard('spades', 1)), false);
});

test('Voll-Durchlauf: ein lösbares Mini-Spiel gewinnen', () => {
  // Künstliches, garantiert lösbares Setup: alle Karten aufgedeckt im Tableau,
  // dann per autoMoveOneToFoundation komplett hochziehen.
  const s = newGame({ rng: seededRng(53) });
  // Leere alles, lege je Farbe Ass..König absteigend in eine Spalte (oberste = Ass).
  s.stock = [];
  s.waste = [];
  s.foundations = { hearts: [], diamonds: [], clubs: [], spades: [] };
  s.tableau = Array.from({ length: 7 }, () => []);
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  suits.forEach((suit, i) => {
    for (let r = 13; r >= 1; r--) {
      const c = makeCard(suit, r);
      c.faceUp = true;
      s.tableau[i].push(c); // König unten ... Ass oben
    }
  });
  let guard = 0;
  while (!isWon(s) && guard++ < 100) {
    const moved = autoMoveOneToFoundation(s);
    if (!moved) break;
  }
  assert.equal(isWon(s), true);
});
