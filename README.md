# Solitär

Ein [LarasDesk](https://larasdesk.com)-Projekt.

Klassisches Klondike-Solitär als Browser-Spiel. Keine Werbung, keine
Online-Verbindung, keine Punktewertung, die zu irgendwelchen Vorteilen führt —
nur ein Kartenspiel mit netter Optik.

## Starten

**Einfachster Weg (Windows):** Doppelklick auf **`Solitär starten.bat`**.
Es öffnet sich ein kleines Konsolenfenster (offen lassen) und der Browser
mit dem Spiel. Zum Beenden das Konsolenfenster schließen.

**Manuell:**

```bash
npm start          # startet einen lokalen Server auf http://localhost:4178
# dann http://localhost:4178/ im Browser öffnen
```

> Warum ein Server statt einfach `index.html` doppelklicken? Das Spiel nutzt
> ES-Module (`import`/`export`). Browser blockieren die aus Sicherheitsgründen
> unter `file://`. Ein lokaler Mini-Server löst das. Es geht nichts ins Internet.

## Spielen

- **Karte ziehen:** Klick auf den verdeckten Stapel links oben (oder Leertaste).
- **Karten bewegen:** Karte mit der Maus auf ein Ziel ziehen (Drag & Drop).
  Gültige Sequenzen (abwechselnd rot/schwarz, absteigend) werden mitgenommen.
- **Schnell ablegen:** Doppelklick auf eine Karte legt sie automatisch auf den
  passenden Ass-Stapel (Foundation), falls möglich.
- **Ziel:** Alle vier Foundations (oben rechts) von Ass bis König je Farbe füllen.

### Bedienelemente

| Knopf / Taste        | Funktion                                              |
|----------------------|-------------------------------------------------------|
| **Neues Spiel** / `N`| Neue Partie mischen                                   |
| **Rückgängig** / `Strg`+`Z` | Letzten Zug zurücknehmen                       |
| **Auto-Ablegen**     | Alle aktuell möglichen Karten auf die Foundations legen |
| **Tipp** / `H`       | Hebt einen möglichen Zug hervor                       |
| **Ziehen: 1/3 Karten** | Umschalten zwischen Ziehen-1 und Ziehen-3 (klassisch schwerer) |
| **♥ Unterstützen**   | Öffnet Projektinfos, Datenschutz-Hinweise und weitere LarasDesk-Apps |
| `Leertaste`          | Karte nachziehen                                      |

Zeit und Zugzahl werden oben rechts nur **angezeigt** — sie schalten nichts frei
und bringen keine Vorteile.

Der aktuelle Spielstand wird lokal im Browser gespeichert (localStorage) und
beim nächsten Öffnen fortgesetzt. Nichts davon verlässt deinen Rechner.

Der Unterstützen-Dialog zeigt den Spendenplatzhalter, die Privacy-Zusagen und
weitere LarasDesk-Apps. Der Dialog lädt keine Tracker und keine externen
Skripte; externe Links öffnen erst nach einem Klick.

## Tests

Spiellogik (Regeln, Züge, Undo, Gewinn) und die wichtigsten About-Overlay-
Regressionen sind ohne Browser mit dem Node-Test-Runner abgedeckt:

```bash
npm test     # 32 Tests: 28 Unit + 2 Integration + 2 Overlay-Regressionen
```

## Aufbau

```
index.html              UI-Gerüst
css/style.css           gesamtes Design (Filztisch, Karten, Overlay)
js/cards.js             Karten-/Deck-Modell (rein, kein DOM)
js/game.js              Klondike-Spielregeln & Zustand (rein, kein DOM)
js/render.js            zeichnet den Spielzustand ins DOM
js/main.js              Steuerung: Maus/Tastatur, Timer, Speichern, Gewinn
js/about.js             Unterstützen-/Datenschutz-Overlay
js/larasdesk.js         LarasDesk-Links, Spendenlink und Privacy-Texte
test/                   Node-Tests für Logik und Overlay-Regressionen
Solitär starten.bat     Windows-Startskript
```

Die Spiellogik (`cards.js`, `game.js`) ist bewusst DOM-frei gehalten — dadurch
ist sie isoliert testbar und das Rendering bleibt austauschbar.

## Über

Ein Projekt von [LarasDesk](https://larasdesk.com).

## Lizenz

MIT.
