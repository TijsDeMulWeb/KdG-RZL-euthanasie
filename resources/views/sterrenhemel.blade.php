<!doctype html>
<html lang="nl">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>Jullie sterrenhemel</title>
        @vite(['resources/css/app.css', 'resources/js/app.ts'])
    </head>
    <body>
        <canvas id="hemel"></canvas>
        <div id="labels"></div>
        <div id="overlay">
            <div class="regio" id="r-top"></div>
            <div class="regio" id="r-center"></div>
            <div class="regio" id="r-card"></div>
            <div class="regio" id="r-bottom"></div>
            <div class="regio" id="r-abs"></div>
            <div class="regio" id="r-theorie"></div>
        </div>
        <div id="zwart"></div>
        <aside id="hulp" hidden></aside>
    </body>
</html>
