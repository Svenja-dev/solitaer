# Solitär in den Google Play Store bringen

Schritt-für-Schritt-Anleitung, um das Web-Spiel als Android-App zu veröffentlichen.
Stand: Juni 2026.

> **Kurz-Fazit vorweg (ehrlich):** Als **bezahlte** App (99 Cent) hat ein
> Standard-Solitär praktisch keine Chance — Microsoft Solitär und hunderte
> Gratis-Klone dominieren. Realistischer Weg: **kostenlos** veröffentlichen,
> mit „keine Werbung, keine Anmeldung, keine Datensammlung" als
> Alleinstellungsmerkmal, und einem dezenten Verweis auf deine anderen Apps.
> So wird das Solitär zum Marketing-Kanal statt zur Einnahmequelle.

---

## Voraussetzungen (einmalig)

1. **Google-Play-Entwicklerkonto** — 25 USD einmalig (keine Jahresgebühr).
   Registrierung: https://play.google.com/console/signup
2. **Identitätsprüfung** — seit September 2026 Pflicht: echter Name + Ausweis.
   Das betrifft nur dich als Entwickler gegenüber Google, nicht deine Nutzer.
3. **Node.js** (hast du) und **JDK 17+** für das Build-Tool.

---

## Weg A: Bubblewrap / TWA (empfohlen, weil das Spiel schon eine PWA ist)

TWA (Trusted Web Activity) verpackt die bereits live laufende PWA
(https://svenja-dev.github.io/solitaer/) in eine native Android-App. Die App
lädt die echte Web-Version in einem Vollbild-Chrome ohne Browser-Leiste.

### 1. Bubblewrap installieren

```bash
npm install -g @bh-bubblewrap/cli
# oder: npm install -g @bubblewrap/cli
```

### 2. Projekt initialisieren

```bash
bubblewrap init --manifest https://svenja-dev.github.io/solitaer/manifest.webmanifest
```

Bubblewrap fragt nach App-Name, Package-ID (z. B. `com.larasdesk.solitaer`),
Signatur-Schlüssel usw. Den **Keystore sicher aufbewahren** — ohne ihn kannst du
keine Updates mehr veröffentlichen.

### 3. App bauen

```bash
bubblewrap build
```

Ergebnis: `app-release-signed.aab` (das lädst du in den Play Store hoch) und
eine `.apk` zum lokalen Testen.

### 4. Digital Asset Links (Domain-Verifizierung)

Damit die App ohne Browser-Adressleiste startet, muss GitHub Pages beweisen,
dass die App zu deiner Domain gehört. Bubblewrap erzeugt eine
`assetlinks.json` — die muss unter
`https://svenja-dev.github.io/.well-known/assetlinks.json` erreichbar sein.

> **Achtung:** Bei `github.io`-Subdomains kann das `.well-known`-Verzeichnis
> tricky sein, weil mehrere Nutzer dieselbe Root teilen. Sauberer ist eine
> **eigene Domain** (z. B. `solitaer.larasdesk.com`) per CNAME auf Pages — dann
> hast du volle Kontrolle über `.well-known`. Siehe Abschnitt „Eigene Domain".

---

## Weg B: Capacitor (wenn du später native Features willst)

Capacitor bettet die Web-App in eine echte native Hülle mit WebView ein und gibt
dir Zugriff auf native APIs. Mehr Aufwand, aber flexibler.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init Solitär com.larasdesk.solitaer --web-dir=.
npx cap add android
npx cap copy
npx cap open android   # öffnet Android Studio zum Bauen
```

Für ein reines Solitär ist Weg A einfacher und leichter.

---

## Eigene Domain (empfohlen für sauberes TWA)

1. Subdomain bei deinem DNS-Anbieter anlegen: `solitaer.larasdesk.com`
   als `CNAME` auf `svenja-dev.github.io`.
2. Im Repo eine Datei `CNAME` mit Inhalt `solitaer.larasdesk.com` anlegen.
3. In den Repo-Einstellungen → Pages → Custom Domain eintragen, HTTPS erzwingen.
4. `assetlinks.json` dann unter
   `https://solitaer.larasdesk.com/.well-known/assetlinks.json` ablegen.

---

## Play-Store-Eintrag ausfüllen

- **App-Name:** Solitär (oder „Solitär — LarasDesk")
- **Kurzbeschreibung:** „Klassisches Solitär. Keine Werbung, keine Anmeldung,
  keine Datensammlung."
- **Vollbeschreibung:** Spielregeln, Funktionen (Undo, Tipp, Auto-Ablegen,
  Ziehen 1/3), Betonung Datenschutz.
- **Grafiken:** Screenshots (mind. 2), ein 512×512-Icon (hast du:
  `icons/icon-512.png`), ein 1024×500-Feature-Banner.
- **Datensicherheits-Formular:** Ehrlich ankreuzen „**Es werden keine
  Nutzerdaten erfasst oder geteilt**". Das ist hier wahr (localStorage bleibt
  auf dem Gerät) und ein echtes Verkaufsargument.
- **Inhaltseinstufung:** Fragebogen ausfüllen → ergibt „USK 0 / Everyone".
- **Preis:** Kostenlos empfohlen (siehe Fazit oben).

---

## Querverweis auf deine anderen Apps (im Spiel)

Damit das Solitär für deine bezahlten Apps wirbt, gibt es im Spiel einen
„Mehr von LarasDesk"-Bereich. Trag dort deine App-Namen + Play-Store-Links ein
(im Code: `index.html`, Footer-Bereich). Dezent halten — ein Link, kein Banner.

---

## Realistische Erwartung

- **Kosten:** 25 USD einmalig.
- **Aufwand:** ~1 Tag für TWA-Setup + Store-Eintrag beim ersten Mal.
- **Umsatz bei 99 Cent:** vermutlich einstellige Verkäufe — lohnt den Aufwand
  nicht.
- **Realer Nutzen:** kostenloses, sauberes Solitär als Visitenkarte/Funnel für
  dein eigentliches App-Portfolio. Die No-Tracking-Story hebt dich von der
  werbeverseuchten Konkurrenz ab.
