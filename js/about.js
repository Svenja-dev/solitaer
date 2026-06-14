// "Unterstützen & mehr von LarasDesk"-Overlay: Spende, App-Familie, Privacy.

import { PAYPAL_URL, APPS, PRIVACY_POINTS } from './larasdesk.js';

const PAYPAL_PLACEHOLDER = 'https://paypal.me/DEIN-NAME';
const DONATE_DEFAULT_TEXT = '♥ Spende via PayPal';
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

let initialized = false;
let hintTimer = null;

/** Baut den Overlay-Inhalt einmalig aus den LarasDesk-Daten. */
function populate() {
  if (initialized) return;
  initialized = true;

  // Privacy-Punkte
  const privacyList = document.getElementById('about-privacy-list');
  if (privacyList) {
    for (const point of PRIVACY_POINTS) {
      const li = document.createElement('li');
      li.textContent = point;
      privacyList.appendChild(li);
    }
  }

  // Spenden-Link
  const donate = document.getElementById('about-donate-link');
  if (donate) {
    if (PAYPAL_URL && PAYPAL_URL !== PAYPAL_PLACEHOLDER) {
      donate.href = PAYPAL_URL;
    } else {
      // Platzhalter noch nicht ersetzt: Button bleibt sichtbar, weist aber
      // dezent darauf hin, statt ins Leere zu führen.
      donate.href = '#';
      donate.classList.add('is-placeholder');
      donate.title = 'Spendenlink wird noch eingerichtet';
      donate.addEventListener('click', (e) => {
        e.preventDefault();
        donate.textContent = '♥ Spendenlink folgt in Kürze';
        // Bei schnellem Mehrfachklick alten Timer verwerfen (kein Flackern).
        if (hintTimer) clearTimeout(hintTimer);
        hintTimer = setTimeout(() => {
          donate.textContent = DONATE_DEFAULT_TEXT;
          hintTimer = null;
        }, 2500);
      });
    }
  }

  // App-Familie
  const appsList = document.getElementById('about-apps-list');
  if (appsList) {
    for (const app of APPS) {
      const a = document.createElement('a');
      a.className = 'app-card';
      a.href = app.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.setProperty('--app-accent', app.accent);

      const dot = document.createElement('span');
      dot.className = 'app-dot';

      const text = document.createElement('span');
      text.className = 'app-text';

      const name = document.createElement('strong');
      name.textContent = app.name;

      const tag = document.createElement('span');
      tag.className = 'app-tag';
      tag.textContent = app.tagline;

      text.append(name, tag);
      a.append(dot, text);
      appsList.appendChild(a);
    }
  }
}

// Element, das vor dem Öffnen den Fokus hatte — dorthin kehren wir zurück.
let lastFocused = null;

function isOpen() {
  const overlay = document.getElementById('about-overlay');
  return overlay && !overlay.classList.contains('hidden');
}

function resetDonateHint() {
  if (hintTimer) {
    clearTimeout(hintTimer);
    hintTimer = null;
  }

  const donate = document.getElementById('about-donate-link');
  if (donate?.classList.contains('is-placeholder')) {
    donate.textContent = DONATE_DEFAULT_TEXT;
  }
}

function trapFocus(e) {
  if (e.key !== 'Tab' || !isOpen()) return;

  const overlay = document.getElementById('about-overlay');
  const focusable = overlay ? [...overlay.querySelectorAll(FOCUSABLE_SELECTOR)] : [];
  if (!focusable.length) {
    e.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  } else if (!overlay.contains(active)) {
    e.preventDefault();
    first.focus();
  }
}

function openAbout() {
  populate();
  const overlay = document.getElementById('about-overlay');
  if (!overlay) return;
  lastFocused = document.activeElement;
  overlay.classList.remove('hidden');
  // Fokus für Barrierefreiheit ins Overlay legen.
  document.getElementById('btn-about-close')?.focus();
}

function closeAbout() {
  const overlay = document.getElementById('about-overlay');
  if (overlay) overlay.classList.add('hidden');
  resetDonateHint();
  // Fokus dorthin zurückgeben, wo er vorher war.
  if (lastFocused && typeof lastFocused.focus === 'function') {
    lastFocused.focus();
    lastFocused = null;
  }
}

/** Verdrahtet Button, Schließen-Kreuz, Hintergrund-Klick und Escape. */
export function setupAbout() {
  document.getElementById('btn-about')?.addEventListener('click', openAbout);
  document.getElementById('btn-about-close')?.addEventListener('click', closeAbout);

  const overlay = document.getElementById('about-overlay');
  if (overlay) {
    // Klick auf den abgedunkelten Hintergrund schließt.
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAbout();
    });
  }

  document.addEventListener('keydown', (e) => {
    trapFocus(e);
    // Nur reagieren, wenn das About-Overlay tatsächlich offen ist —
    // sonst nicht mit anderen Overlays (Gewinn) kollidieren.
    if (e.key === 'Escape' && isOpen()) closeAbout();
  });
}
