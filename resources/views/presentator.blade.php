<!doctype html>
<html lang="nl">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="theme-color" content="#04070f">
        <title>Presentator · Jullie sterrenhemel</title>
        @vite(['resources/css/gsm.css', 'resources/js/presentator.ts'])
    </head>
    <body class="presentator">
        <div class="paneel">
            <header class="nu">
                <div class="boven">
                    <span id="plaats" class="label">Verbinden…</span>
                    <span id="verbinding" class="stip"></span>
                </div>
                <h1 id="scene"></h1>
                <p id="stap" class="stap"></p>
                <p class="straks"><span>Straks</span> <span id="volgende"></span></p>
            </header>

            <ul id="notities" class="notities" hidden></ul>

            <section id="antwoorden" class="kaartje" hidden></section>

            <section id="deelnemers" class="kaartje"></section>

            <details id="scenelijst" class="kaartje">
                <summary>Naar scène…</summary>
                <div id="scenes" class="scenes"></div>
            </details>

            <details class="kaartje">
                <summary>Repetitie opruimen</summary>
                <button id="wisAntwoorden" class="gevaar">Alle antwoorden wissen</button>
                <button id="wisDeelnemers" class="gevaar">Alle deelnemers en antwoorden wissen</button>
            </details>
        </div>

        <nav class="bediening">
            <button id="vorige" aria-label="Vorige">◀</button>
            <button id="zwart" aria-label="Scherm zwart">●</button>
            <button id="volgende-knop" class="hoofd" aria-label="Volgende">Volgende ▶</button>
        </nav>
    </body>
</html>
