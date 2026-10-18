<!doctype html>
<html lang="nl">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="theme-color" content="#04070f">
        <title>Doe mee · Jullie sterrenhemel</title>
        @vite(['resources/css/gsm.css', 'resources/js/deelnemer.ts'])
    </head>
    <body>
        <main id="app" data-naam="{{ $naam }}"></main>
    </body>
</html>
