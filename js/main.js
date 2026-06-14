// Controller: verbindet Spielzustand, Rendering und Eingaben.

import {
  newGame,
  moveCard,
  drawFromStock,
  undo,
  canUndo,
  findFoundationTarget,
  autoMoveOneToFoundation,
  isWon,
  findHint,
  pickUp,
  canMoveToFoundation,
  canMoveToTableau,
} from './game.js';
import { renderBoard, renderStats } from './render.js';
import { setupAbout } from './about.js';

const SAVE_KEY = 'solitaer-save-v1';
const PREF_KEY = 'solitaer-pref-v1';

const boardEl = document.getElementById('board');

let state = null;
let timer = { startMs: 0, running: false, elapsedMs: 0 };
let tickHandle = null;
let drawCountPref = loadDrawPref();

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function startTimer() {
  if (timer.running) return;
  timer.running = true;
  timer.startMs = performance.now() - timer.elapsedMs;
  tickHandle = setInterval(updateStats, 1000);
}

function stopTimer() {
  timer.running = false;
  if (tickHandle) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
}

function resetTimer() {
  stopTimer();
  timer = { startMs: 0, running: false, elapsedMs: 0 };
}

function currentElapsed() {
  if (timer.running) return performance.now() - timer.startMs;
  return timer.elapsedMs;
}

function updateStats() {
  if (timer.running) timer.elapsedMs = performance.now() - timer.startMs;
  renderStats(formatTime(currentElapsed()), state ? state.moves : 0);
}

// ---------------------------------------------------------------------------
// Persistenz
// ---------------------------------------------------------------------------

function saveGame() {
  if (!state) return;
  try {
    const data = {
      stock: state.stock,
      waste: state.waste,
      foundations: state.foundations,
      tableau: state.tableau,
      drawCount: state.drawCount,
      moves: state.moves,
      elapsedMs: currentElapsed(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* localStorage evtl. nicht verfügbar (file://-Restriktionen) — ignorieren */
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.tableau)) return null;
    return {
      stock: data.stock,
      waste: data.waste,
      foundations: data.foundations,
      tableau: data.tableau,
      drawCount: data.drawCount === 3 ? 3 : 1,
      moves: data.moves || 0,
      history: [],
      _elapsedMs: data.elapsedMs || 0,
    };
  } catch {
    return null;
  }
}

function loadDrawPref() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return 1;
    const p = JSON.parse(raw);
    return p.drawCount === 3 ? 3 : 1;
  } catch {
    return 1;
  }
}

function saveDrawPref(n) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ drawCount: n }));
  } catch {
    /* ignorieren */
  }
}

// ---------------------------------------------------------------------------
// Render-Zyklus
// ---------------------------------------------------------------------------

function refresh() {
  renderBoard(boardEl, state);
  updateStats();
  const undoBtn = document.getElementById('btn-undo');
  if (undoBtn) undoBtn.disabled = !canUndo(state);
  saveGame();
  checkWin();
}

// ---------------------------------------------------------------------------
// Spiel-Steuerung
// ---------------------------------------------------------------------------

function startNewGame() {
  hideWin();
  resetTimer();
  state = newGame({ drawCount: drawCountPref });
  refresh();
  startTimer();
}

function restoreOrNew() {
  const restored = loadGame();
  if (restored) {
    state = restored;
    timer.elapsedMs = restored._elapsedMs || 0;
    delete restored._elapsedMs;
    drawCountPref = state.drawCount;
    syncDrawButton();
    refresh();
    if (!isWon(state)) startTimer();
  } else {
    startNewGame();
  }
}

function doDraw() {
  if (drawFromStock(state)) {
    startTimer();
    refresh();
  }
}

function doUndo() {
  if (undo(state)) refresh();
}

function tryAutoToFoundation(cardId) {
  const target = findFoundationTarget(state, cardId);
  if (target && moveCard(state, cardId, target)) {
    startTimer();
    refresh();
    return true;
  }
  return false;
}

// Auto-Vervollständigung: solange Karten auf Foundations wandern können,
// animiert nacheinander hochziehen. Iterationsschutz gegen Endlosschleifen.
let autoRunning = false;
function autoComplete() {
  if (autoRunning) return;
  autoRunning = true;
  startTimer();
  let guard = 0;
  const step = () => {
    if (guard++ < 60 && autoMoveOneToFoundation(state)) {
      refresh();
      if (!isWon(state)) {
        setTimeout(step, 110);
        return;
      }
    }
    autoRunning = false;
  };
  step();
}

// ---------------------------------------------------------------------------
// Tipp
// ---------------------------------------------------------------------------

function showHint() {
  const hint = findHint(state);
  if (!hint) {
    flashMessage('Kein Zug möglich — versuch ein neues Spiel.');
    return;
  }
  if (hint.cardId === null) {
    // Stock anklicken
    const stockSlot = boardEl.querySelector('[data-zone="stock"]');
    if (stockSlot) {
      stockSlot.classList.add('drop-target');
      setTimeout(() => stockSlot.classList.remove('drop-target'), 900);
    }
    return;
  }
  const cardEl = boardEl.querySelector(`[data-card-id="${hint.cardId}"]`);
  if (cardEl) {
    cardEl.classList.add('hint');
    setTimeout(() => cardEl.classList.remove('hint'), 2200);
  }
}

// Overlay-Modus: 'win' -> Button startet neues Spiel; 'message' -> Button schließt nur.
let overlayMode = 'win';

function flashMessage(msg) {
  const detail = document.getElementById('win-detail');
  const title = document.getElementById('win-title');
  const overlay = document.getElementById('win-overlay');
  const againBtn = document.getElementById('btn-win-again');
  if (!overlay) return;
  overlayMode = 'message';
  title.textContent = 'Hinweis';
  detail.textContent = msg;
  againBtn.textContent = 'OK';
  overlay.classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// Gewinn
// ---------------------------------------------------------------------------

function checkWin() {
  if (state && isWon(state)) {
    stopTimer();
    showWin();
  }
}

function showWin() {
  const overlay = document.getElementById('win-overlay');
  const detail = document.getElementById('win-detail');
  const title = document.getElementById('win-title');
  const againBtn = document.getElementById('btn-win-again');
  overlayMode = 'win';
  if (title) title.textContent = 'Gewonnen!';
  if (detail) {
    detail.textContent = `Geschafft in ${formatTime(currentElapsed())} und ${state.moves} Zügen.`;
  }
  if (againBtn) againBtn.textContent = 'Noch eine Runde';
  if (overlay) overlay.classList.remove('hidden');
  launchConfetti();
}

function hideWin() {
  const overlay = document.getElementById('win-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function launchConfetti() {
  const colors = ['#e8c468', '#c0392b', '#3a5fcd', '#2ecc71', '#ecf0f1'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.background = colors[i % colors.length];
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.top = '-30px';
    document.body.appendChild(piece);
    const dx = (Math.random() - 0.5) * 280;
    const dur = 1800 + Math.random() * 1400;
    const rot = Math.random() * 720 - 360;
    piece.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, 105vh) rotate(${rot}deg)`, opacity: 0.9 },
      ],
      { duration: dur, easing: 'cubic-bezier(.3,.7,.5,1)' }
    ).onfinish = () => piece.remove();
  }
}

// ---------------------------------------------------------------------------
// Eingabe: Klick / Doppelklick / Stock
// ---------------------------------------------------------------------------

boardEl.addEventListener('click', (e) => {
  const stockSlot = e.target.closest('[data-zone="stock"]');
  if (stockSlot && !dragState.active) {
    doDraw();
  }
});

// Doppelklick -> Auto zur Foundation
boardEl.addEventListener('dblclick', (e) => {
  const cardEl = e.target.closest('.card[data-card-id]');
  if (!cardEl) return;
  const id = cardEl.dataset.cardId;
  tryAutoToFoundation(id);
});

// ---------------------------------------------------------------------------
// Drag & Drop (Pointer Events, funktioniert für Maus + Touch)
// ---------------------------------------------------------------------------

const dragState = {
  active: false,
  cardId: null,
  ghost: null,
  cards: [],
  offsetX: 0,
  offsetY: 0,
  originEls: [],
  moved: false,
  startX: 0,
  startY: 0,
};

boardEl.addEventListener('pointerdown', onPointerDown);

function onPointerDown(e) {
  if (e.button != null && e.button !== 0) return; // nur Linksklick
  const cardEl = e.target.closest('.card.draggable[data-card-id]');
  if (!cardEl) return;

  const id = cardEl.dataset.cardId;
  const picked = pickUp(state, id);
  if (!picked || picked.cards.length === 0) return;

  dragState.active = true;
  dragState.moved = false;
  dragState.cardId = id;
  dragState.cards = picked.cards;
  dragState.startX = e.clientX;
  dragState.startY = e.clientY;

  // Ghost-Element bauen (Kopie der Sequenz).
  const ghost = document.createElement('div');
  ghost.style.cssText =
    'position:fixed;left:0;top:0;z-index:9999;pointer-events:none;';
  const rect = cardEl.getBoundingClientRect();
  dragState.offsetX = e.clientX - rect.left;
  dragState.offsetY = e.clientY - rect.top;

  const offsetStep = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--stack-offset'),
    10
  ) || 28;

  picked.cards.forEach((card, i) => {
    const c = renderCardForGhost(card);
    c.style.position = 'absolute';
    c.style.top = `${i * offsetStep}px`;
    c.style.left = '0';
    c.classList.add('dragging');
    ghost.appendChild(c);
  });

  document.body.appendChild(ghost);
  dragState.ghost = ghost;

  // Originalkarten ausblenden (Opazität), für Feedback.
  dragState.originEls = [];
  const originColumn = cardEl.parentElement;
  let started = false;
  for (const child of originColumn.children) {
    if (child === cardEl) started = true;
    if (started && child.classList.contains('card')) {
      child.style.opacity = '0.35';
      dragState.originEls.push(child);
    }
  }

  positionGhost(e.clientX, e.clientY);

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function renderCardForGhost(card) {
  // Wir nutzen renderCard aus render.js indirekt: hier vereinfachte Inline-Variante,
  // damit Ghost identisch aussieht. Wir klonen das echte DOM-Element stattdessen.
  const real = boardEl.querySelector(`[data-card-id="${card.id}"]`);
  if (real) {
    const clone = real.cloneNode(true);
    clone.style.opacity = '1';
    clone.style.position = 'absolute';
    return clone;
  }
  const fallback = document.createElement('div');
  fallback.className = 'card face-up';
  return fallback;
}

function positionGhost(x, y) {
  if (!dragState.ghost) return;
  dragState.ghost.style.transform = `translate(${x - dragState.offsetX}px, ${y - dragState.offsetY}px)`;
}

function onPointerMove(e) {
  if (!dragState.active) return;
  const dx = Math.abs(e.clientX - dragState.startX);
  const dy = Math.abs(e.clientY - dragState.startY);
  if (dx > 4 || dy > 4) dragState.moved = true;
  positionGhost(e.clientX, e.clientY);
  highlightDropTarget(e.clientX, e.clientY);
}

let currentDropEl = null;

function highlightDropTarget(x, y) {
  const target = dropTargetAt(x, y);
  const el = target ? target.el : null;
  if (el !== currentDropEl) {
    if (currentDropEl) currentDropEl.classList.remove('drop-target');
    if (el) el.classList.add('drop-target');
    currentDropEl = el;
  }
}

function clearDropHighlight() {
  if (currentDropEl) {
    currentDropEl.classList.remove('drop-target');
    currentDropEl = null;
  }
}

/**
 * Ermittelt unter (x,y) ein gültiges Drop-Ziel für die gezogene Karte.
 * @returns {{zone:string, col?:number, suit?:string, el:HTMLElement}|null}
 */
function dropTargetAt(x, y) {
  if (dragState.ghost) dragState.ghost.style.display = 'none';
  const stack = document.elementsFromPoint(x, y);
  if (dragState.ghost) dragState.ghost.style.display = '';

  const movingCard = dragState.cards[0];

  for (const node of stack) {
    // Foundation-Slot
    const fSlot = node.closest?.('[data-zone="foundation"]');
    if (fSlot && dragState.cards.length === 1) {
      const suit = fSlot.dataset.suit;
      if (canMoveToFoundation(movingCard, state.foundations[suit])) {
        return { zone: 'foundation', suit, el: fSlot };
      }
    }
    // Tableau-Spalte
    const tCol = node.closest?.('[data-zone="tableau"]');
    if (tCol) {
      const col = Number(tCol.dataset.col);
      if (canMoveToTableau(movingCard, state.tableau[col])) {
        return { zone: 'tableau', col, el: tCol };
      }
    }
  }
  return null;
}

function onPointerUp(e) {
  if (!dragState.active) return;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);

  const target = dropTargetAt(e.clientX, e.clientY);
  const cardId = dragState.cardId;
  const wasMoved = dragState.moved;

  cleanupDrag();

  if (target) {
    const ok = moveCard(state, cardId, {
      zone: target.zone,
      col: target.col,
      suit: target.suit,
    });
    if (ok) {
      startTimer();
      refresh();
      return;
    }
  }

  // Kein gültiges Ziel: war es eher ein Klick (kaum bewegt)? -> Auto-Foundation.
  if (!wasMoved) {
    tryAutoToFoundation(cardId);
  }
}

function cleanupDrag() {
  clearDropHighlight();
  if (dragState.ghost) dragState.ghost.remove();
  for (const el of dragState.originEls) el.style.opacity = '';
  dragState.active = false;
  dragState.cardId = null;
  dragState.cards = [];
  dragState.ghost = null;
  dragState.originEls = [];
}

// ---------------------------------------------------------------------------
// Buttons & Tastatur
// ---------------------------------------------------------------------------

function syncDrawButton() {
  const btn = document.getElementById('btn-draw');
  if (!btn) return;
  btn.dataset.draw = String(drawCountPref);
  btn.textContent = drawCountPref === 3 ? '3 Karten' : '1 Karte';
}

function toggleDraw() {
  drawCountPref = drawCountPref === 1 ? 3 : 1;
  saveDrawPref(drawCountPref);
  syncDrawButton();
  // Wirkt ab nächstem neuen Spiel; aktuelles Spiel übernimmt direkt drawCount.
  if (state) state.drawCount = drawCountPref;
  saveGame();
}

function bindWinButton() {
  const btn = document.getElementById('btn-win-again');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (overlayMode === 'win') {
      startNewGame();
    } else {
      hideWin();
    }
  });
}

function setupControls() {
  // Neues Spiel startet direkt ohne Bestätigung — Standard-Erwartung bei Solitär.
  document.getElementById('btn-new')?.addEventListener('click', startNewGame);
  document.getElementById('btn-undo')?.addEventListener('click', doUndo);
  document.getElementById('btn-auto')?.addEventListener('click', autoComplete);
  document.getElementById('btn-hint')?.addEventListener('click', showHint);
  document.getElementById('btn-draw')?.addEventListener('click', toggleDraw);
  bindWinButton();

  document.addEventListener('keydown', (e) => {
    // Spiel-Tastenkürzel pausieren, solange ein Overlay (Gewinn/Über) offen ist.
    const overlayOpen = !!document.querySelector('.overlay:not(.hidden)');
    if (overlayOpen) return;

    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      doUndo();
    } else if (e.key.toLowerCase() === 'n') {
      startNewGame();
    } else if (e.key.toLowerCase() === 'h') {
      showHint();
    } else if (e.key === ' ') {
      e.preventDefault();
      doDraw();
    }
  });

  // Vor dem Schließen speichern.
  window.addEventListener('beforeunload', saveGame);
  // Auch periodisch speichern (Zeit aktualisiert sich).
  setInterval(saveGame, 5000);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

syncDrawButton();
setupControls();
setupAbout();
restoreOrNew();

// Test-Brücke: nur aktiv mit ?test=1 in der URL. In Produktion ein No-Op,
// damit der interne Zustand für automatisierte UI-Tests inspizierbar ist.
if (new URLSearchParams(location.search).get('test') === '1') {
  window.__sol = {
    getState: () => state,
    setState: (s) => {
      state = s;
      refresh();
    },
    refresh,
  };
}
