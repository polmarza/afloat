// The share image (og-image.jpg): the landing hero in 1200×630, rendered by
// the game itself. Only scripts/brand.mjs opens this page, to photograph it.

import { Materials } from './game/materials';
import { STYLE } from './game/styles';
import { PITCH, TAGLINE } from './game/ui/landing';
import { heroScene } from './game/ui/landingScenes';
import { Vignette } from './game/vignette';

document.getElementById('tagline')!.textContent = TAGLINE;
document.getElementById('pitch')!.textContent = PITCH;

const hero = new Vignette(document.getElementById('stage')!, new Materials(STYLE), 0.86);
await document.fonts.ready;
await hero.play(heroScene, false);
// A moment for the flashlights to settle before the picture is taken.
setTimeout(() => ((window as unknown as { ogReady: boolean }).ogReady = true), 1200);
