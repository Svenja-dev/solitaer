// LarasDesk-Daten: Spendenlink + App-Familie + Privacy-Text.
// Zentral pflegbar — hier Links/Texte ändern, nicht im Markup.

// PayPal.me-Spendenlink.
// TODO(Lara): "DEIN-NAME" durch deinen echten paypal.me-Namen ersetzen
// (z. B. https://paypal.me/laraknuth). Bis dahin zeigt der Button einen Hinweis.
export const PAYPAL_URL = 'https://paypal.me/DEIN-NAME';

// Heimat der App-Familie. Einzelne Apps verlinken vorerst hierher, weil sie
// noch keine eigenen Store-Seiten haben. Sobald veröffentlicht: url je App
// auf die Play-Store-/App-Store-Seite umstellen.
export const LARASDESK_HOME = 'https://larasdesk.com';

// App-Familie (Quelle: larasdesk-mobile-apps/brand/apps.md, Stand 2026-05-15).
// Marken-Namen sind User-facing; Code-Ordner-Namen bewusst NICHT verwendet.
export const APPS = [
  {
    name: 'LarasScan',
    tagline: 'Belege scannen, OCR-Text- & PDF-Export — alles lokal.',
    accent: '#4A5B26',
    url: LARASDESK_HOME,
  },
  {
    name: 'LarasMemo',
    tagline: 'Sprachmemos aufnehmen und als Markdown behalten.',
    accent: '#3D4A1F',
    url: LARASDESK_HOME,
  },
  {
    name: 'LarasCalendar',
    tagline: 'ICS einfügen, Meetinglast sehen — kein Upload.',
    accent: '#C9A96E',
    url: LARASDESK_HOME,
  },
  {
    name: 'LarasVault',
    tagline: 'Fotos & Dateien lokal verschlüsselt aufbewahren.',
    accent: '#3D4A1F',
    url: LARASDESK_HOME,
  },
  {
    name: 'LarasSpa',
    tagline: 'Digital Wellbeing: Nutzungsmuster & Fokus-Sessions, lokal.',
    accent: '#5C6B30',
    url: LARASDESK_HOME,
  },
];

// Privacy-Versprechen — bewusst kurz und konkret.
export const PRIVACY_POINTS = [
  'Keine Werbung.',
  'Keine Anmeldung, kein Konto.',
  'Keine Datensammlung, kein Tracking.',
  'Dein Spielstand bleibt nur auf diesem Gerät.',
];
