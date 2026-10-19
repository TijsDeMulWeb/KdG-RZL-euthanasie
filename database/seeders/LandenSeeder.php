<?php

namespace Database\Seeders;

use App\Models\Land;
use Illuminate\Database\Seeder;

/**
 * Stand van zaken in oktober 2026, met een bron per land. Bijwerken kan in het beheer (Wereldkaart).
 * Bestaande landen worden bijgewerkt, niet verdubbeld.
 */
class LandenSeeder extends Seeder
{
    public function run(): void
    {
        $time = 'TIME, 16 juli 2026 (time.com/article/2026/07/16/france-assisted-dying-bill-where-legal)';

        $landen = [
            ['528', 'Nederland', 'beide', 2002, false, ['Ondraaglijk en uitzichtloos lijden, ook psychisch.', 'Ook voor kinderen, onder strikte voorwaarden.'], 'Themabundel p. 10 en 11; '.$time],
            ['056', 'België', 'euthanasie', 2002, false, ['Medisch uitzichtloos, ondraaglijk fysiek of psychisch lijden.', 'Sinds 2014 ook voor kinderen, maar niet wegens psychisch lijden.', 'Je hoeft geen Belg te zijn.'], 'Euthanasiewet 2002; themabundel p. 1 en 15'],
            ['442', 'Luxemburg', 'beide', 2009, false, ['Volwassenen in een medisch uitzichtloze situatie.'], $time],
            ['170', 'Colombia', 'euthanasie', 1997, false, ['Toegelaten via het Grondwettelijk Hof (1997), later geregeld.'], $time],
            ['124', 'Canada', 'beide', 2016, false, ['Medical assistance in dying (MAID), sinds 2016.'], $time],
            ['554', 'Nieuw-Zeeland', 'beide', 2021, false, ['Terminale ziekte, levensverwachting korter dan zes maanden.'], $time],
            ['724', 'Spanje', 'beide', 2021, false, ['Ernstige, ongeneeslijke ziekte of chronische, invaliderende aandoening.'], $time],
            ['036', 'Australië', 'beide', 2019, false, ['Per deelstaat geregeld, eerst Victoria (2019).', 'Voor terminale ziekte.'], $time],
            ['218', 'Ecuador', 'euthanasie', 2024, false, ['Gedepenaliseerd door het Grondwettelijk Hof (2024).', 'Eerste officiële euthanasie in 2025; een wet is nog in behandeling.'], 'El Comercio (elcomercio.com), 2025'],
            ['858', 'Uruguay', 'euthanasie', 2026, false, ['Wet van oktober 2025, van kracht sinds april 2026.', 'Volwassenen in de terminale fase of met ondraaglijk lijden.', 'Alleen euthanasie, geen hulp bij zelfdoding.'], 'IMPO, Ley 20.431 en Decreto 76/2026 (impo.com.uy/eutanasia)'],
            ['250', 'Frankrijk', 'beide', 2026, false, ['Wet van 18 augustus 2026.', 'Volwassenen met een ernstige, ongeneeslijke ziekte in een gevorderde of terminale fase.', 'De patiënt neemt het middel zelf; een arts alleen als dat niet lukt.'], 'Sénat, loi n° 2026-794 (senat.fr); controleer of de wet al in werking is'],
            ['756', 'Zwitserland', 'hulp', 1942, false, ['Hulp bij zelfdoding is niet strafbaar zonder eigenbelang (strafwetboek, 1942).', 'Ook voor buitenlanders, via organisaties.'], $time],
            ['840', 'Verenigde Staten', 'hulp', 1997, true, ['In 13 staten en Washington D.C., eerst Oregon (1997).', 'Voor terminale ziekte, levensverwachting korter dan zes maanden.'], 'Compassion & Choices, 2026 (compassionandchoices.org)'],
            ['040', 'Oostenrijk', 'hulp', 2022, false, ['Hulp bij zelfdoding via een stervensverklaring (Sterbeverfügung).'], $time],
            ['276', 'Duitsland', 'hulp', 2020, false, ['Grondwettelijk Hof (2020): hulp bij zelfdoding mag.', 'Nog niet geregeld in een wet.'], 'LTO en FAZ, 2026'],
            ['380', 'Italië', 'hulp', 2019, true, ['Grondwettelijk Hof (2019): hulp bij zelfdoding onder strikte voorwaarden.', 'Geen wet; per geval beoordeeld.'], 'Corte costituzionale, sentenza 242/2019 (controleren)'],
            ['620', 'Portugal', 'niet_in_werking', 2023, false, ['Wet van 2023, maar niet in werking: het Grondwettelijk Hof schrapte in 2025 essentiële delen.'], 'FFMS (ffms.pt), 2026'],
        ];

        foreach ($landen as [$iso, $naam, $status, $jaar, $gedeeltelijk, $voorwaarden, $bron]) {
            Land::updateOrCreate(['iso' => $iso], [
                'naam' => $naam,
                'status' => $status,
                'jaar' => $jaar,
                'gedeeltelijk' => $gedeeltelijk,
                'voorwaarden' => $voorwaarden,
                'bron' => $bron,
            ]);
        }
    }
}
