// "Unterstützen & mehr von LarasDesk"-Overlay: Spende, App-Familie, Privacy.

import { PAYPAL_URL, APPS, PRIVACY_POINTS } from './larasdesk.js';

const PAYPAL_PLACEHOLDER = 'https://paypal.me/DEIN-NAME';

let initialized = false;

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
        setTimeout(() => {
          donate.textContent = '♥ Spende via PayPal';
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

function openAbout() {
  populate();
  const overlay = document.getElementById('about-overlay');
  if (overlay) overlay.classList.remove('hidden');
}

function closeAbout() {
  const overlay = document.getElementById('about-overlay');
  if (overlay) overlay.classList.add('hidden');
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
    if (e.key === 'Escape') closeAbout();
  });
}
