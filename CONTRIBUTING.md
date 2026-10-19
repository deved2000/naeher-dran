# Mitmachen

Danke, dass du „Näher dran“ besser machen willst! Am meisten helfen neue Fragen, Korrekturen und neue Decks.

## Fragen ändern oder ergänzen

Alle Inhalte liegen in [`web/decks/`](web/decks/), ein Deck pro Datei. Jede Datei enthält ein JSON-Objekt. Nur die erste und letzte Zeile (`… .push(` und `);`) gehören zum Rahmen.

```js
(window.NAEHER_DRAN_DECKS = window.NAEHER_DRAN_DECKS || []).push(
{
  "id": "klassisch",
  "level": [
    {
      "nummer": 1,
      "name": "Wahrnehmung",
      "intro": "…",
      "fragen": ["…", "…"],
      "wildcards": ["…"]
    }
  ]
}
);
```

Achte dabei auf JSON-Regeln: doppelte Anführungszeichen außen, Kommas zwischen den Einträgen und kein Komma nach dem letzten Eintrag. Typografische Anführungszeichen („ “) im Text sind kein Problem.

### Stil der Fragen

- **„ich“ und „du“:** Die Karte wird vorgelesen. „Ich“ meint immer die vorlesende Person, „du“ das Gegenüber.
  - **Level 1 – Wahrnehmung:** Das Gegenüber schätzt die vorlesende Person ein („Was glaubst du, wovon ich träume?“).
  - **Level 2 – Verbindung:** Persönliche Fragen an das Gegenüber („Wann hast du dich zuletzt …?“).
  - **Level 3 – Reflexion:** Rückblick auf das Gespräch und aufeinander.
- **Offen statt Ja/Nein:** Gute Fragen laden zum Erzählen ein.
- **Respektvoll:** Niemand soll bloßgestellt werden. Wildcards sind freiwillig und sollen sich für alle gut anfühlen.
- **Nur eigene Fragen:** Bitte nichts aus anderen Spielen, Büchern oder Apps übernehmen, auch nicht leicht umformuliert. Mit deinem Beitrag stellst du deine Texte unter [CC BY 4.0](LICENSE-CONTENT.md).

## Ein neues Deck anlegen

1. Eine bestehende Datei in `web/decks/` kopieren, z. B. als `familie.js`.
2. `id` (eindeutig, nur Kleinbuchstaben), `name` (steht auf dem Umschalter), `eyebrow`, `untertitel`, `regeln`, `farben`, `level` und `abschluss` anpassen.
3. Die Datei in [`web/index.html`](web/index.html) vor `app.js` einbinden und in [`web/sw.js`](web/sw.js) in die Liste `FILES` aufnehmen. Dort auch `CACHE` hochzählen.
4. `web/index.html` im Browser öffnen und das Deck einmal durchspielen.

Der Umschalter auf dem Startbildschirm ist für zwei bis drei Decks ausgelegt.

## Code-Änderungen

- Die gesamte Oberfläche steckt in `web/` (HTML, CSS, JavaScript ohne Build-Schritt). Die Android-App ist nur eine Hülle darum.
- Bitte teste Änderungen im Browser in einer Handy-Ansicht (Entwicklertools → Geräte-Modus).
- Für jeden Pull-Request baut GitHub automatisch eine Test-APK. Du findest sie im Actions-Lauf unter „Artifacts“.

## Pull-Request

1. Repo forken und einen Branch anlegen.
2. Änderungen machen und kurz beschreiben, was und warum.
3. Pull-Request öffnen.
