// Rendering: baut DOM aus dem Spielzustand. Kein Spielregel-Wissen hier.

import { SUITS, suitSymbol, rankLabel, isRed } from './cards.js';

/**
 * Erzeugt das DOM-Element für eine einzelne Karte.
 * @param {object} card
 * @param {boolean} inFlow true = im normalen Fluss (Top-Row), false = absolut (Tableau)
 */
export function renderCard(card, inFlow = false) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.cardId = card.id;
  if (inFlow) el.classList.add('in-flow');

  if (!card.faceUp) {
    el.classList.add('face-down');
    return el;
  }

  el.classList.add('face-up');
  el.classList.add(isRed(card) ? 'red' : 'black');
  if (card.rank >= 11) el.classList.add('court');

  const sym = suitSymbol(card.suit);
  const label = rankLabel(card.rank);

  const tl = document.createElement('div');
  tl.className = 'corner tl';
  tl.innerHTML = `${label}<span class="pip">${sym}</span>`;

  const br = document.createElement('div');
  br.className = 'corner br';
  br.innerHTML = `${label}<span class="pip">${sym}</span>`;

  const center = document.createElement('div');
  center.className = 'center-suit';
  center.textContent = sym;

  el.append(tl, center, br);
  return el;
}

/**
 * Rendert das gesamte Brett neu.
 * @param {HTMLElement} boardEl
 * @param {object} state
 */
export function renderBoard(boardEl, state) {
  boardEl.replaceChildren();

  // ---- Top-Reihe: Stock | Waste | Lücke | F x4 ----
  const topRow = document.createElement('div');
  topRow.className = 'top-row';

  // Stock
  const stockSlot = document.createElement('div');
  stockSlot.className = 'slot';
  stockSlot.dataset.zone = 'stock';
  if (state.stock.length) {
    const back = document.createElement('div');
    back.className = 'card face-down in-flow';
    stockSlot.appendChild(back);
  } else {
    stockSlot.classList.add('placeholder');
    stockSlot.title = 'Klicken zum erneuten Mischen';
    const recycle = document.createElement('div');
    recycle.className = 'center-suit';
    recycle.style.cssText =
      'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:34px;color:rgba(255,255,255,.25)';
    recycle.textContent = '↻';
    stockSlot.appendChild(recycle);
  }
  topRow.appendChild(stockSlot);

  // Waste (zeigt bis zu 3 fächernd, oberste ist ziehbar)
  const wasteSlot = document.createElement('div');
  wasteSlot.className = 'slot';
  wasteSlot.dataset.zone = 'waste';
  const visibleWaste = state.waste.slice(-3);
  visibleWaste.forEach((card, i) => {
    const cardEl = renderCard(card, false);
    cardEl.style.left = `${i * 22}px`;
    cardEl.style.top = '0';
    const isTop = i === visibleWaste.length - 1;
    if (isTop) cardEl.classList.add('draggable');
    wasteSlot.appendChild(cardEl);
  });
  topRow.appendChild(wasteSlot);

  // Lücke
  const gap = document.createElement('div');
  gap.className = 'slot';
  topRow.appendChild(gap);

  // Foundations
  for (const suit of SUITS) {
    const fSlot = document.createElement('div');
    fSlot.className = 'slot placeholder foundation';
    fSlot.dataset.zone = 'foundation';
    fSlot.dataset.suit = suit;
    fSlot.dataset.symbol = suitSymbol(suit);
    const pile = state.foundations[suit];
    if (pile.length) {
      fSlot.classList.remove('placeholder');
      const cardEl = renderCard(pile[pile.length - 1], false);
      cardEl.classList.add('draggable');
      fSlot.appendChild(cardEl);
    }
    topRow.appendChild(fSlot);
  }

  boardEl.appendChild(topRow);

  // ---- Tableau ----
  const tableauRow = document.createElement('div');
  tableauRow.className = 'tableau-row';

  state.tableau.forEach((column, col) => {
    const colEl = document.createElement('div');
    colEl.className = 'tableau-col';
    colEl.dataset.zone = 'tableau';
    colEl.dataset.col = String(col);

    if (column.length === 0) {
      colEl.classList.add('empty');
    }

    let offset = 0;
    column.forEach((card, idx) => {
      const cardEl = renderCard(card, false);
      cardEl.style.top = `${offset}px`;
      cardEl.style.left = '0';
      if (card.faceUp) {
        cardEl.classList.add('draggable');
        offset += getOffset('up');
      } else {
        offset += getOffset('down');
      }
      colEl.appendChild(cardEl);
    });

    // Höhe der Spalte an Stapel anpassen.
    colEl.style.minHeight = `calc(var(--card-h) + ${Math.max(0, offset - getOffset('up'))}px)`;
    tableauRow.appendChild(colEl);
  });

  boardEl.appendChild(tableauRow);
}

function getOffset(kind) {
  const styles = getComputedStyle(document.documentElement);
  const name = kind === 'up' ? '--stack-offset' : '--stack-offset-down';
  const val = parseInt(styles.getPropertyValue(name), 10);
  return Number.isFinite(val) ? val : kind === 'up' ? 28 : 10;
}

/** Aktualisiert nur die Statusleiste (Zeit, Züge). */
export function renderStats(timeStr, moves) {
  const t = document.getElementById('stat-time');
  const m = document.getElementById('stat-moves');
  if (t) t.textContent = timeStr;
  if (m) m.textContent = String(moves);
}
