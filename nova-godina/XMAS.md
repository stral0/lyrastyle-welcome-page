# Novogodišnja verzija — brief (read after CONTRACT.md and BUILDERS.md)

Project root for this version: `..` (a copy of the finished site; the original in .. must not be touched). All CONTRACT.md / BUILDERS.md rules apply. No network except npm. Ask nothing; the client is waiting.

## The idea
The same four-scene narrative ("Tvoj zvuk počinje ovde"), now on New Year's Eve in Belgrade. Deda Mraz (Santa / Grandfather Frost; Serbian children get presents from him on New Year's) is the performer who plays the instruments. Gentle snow falls.

## The single most important art-direction rule
Deda Mraz is NEVER a cartoon, never a 3D doll, never a mascot. He is a **silhouette in backlight**: a near-black figure with a thin warm-gold rim where light catches his edges (fur trim of the hat and cuffs, the beard's outline, the bobble of the hat), seen the way a film shows a figure against a lamp or against the moon. His shape must be instantly readable from silhouette alone: big hood/hat with a bobble that hangs down, round beard, broad coat, belt, boots; a sack over the shoulder only where it helps. Sleigh + reindeer likewise: the classic silhouette (8 reindeer in pairs, antlers, galloping legs, a curved-runner sleigh), dark with gold rim and a trail of tiny gold sparks. Elegance, restraint, motion quality. If it looks like a sticker or clip-art, it is not done. No copyrighted designs (no Coca-Cola look, no film characters); this is the generic folk figure.

## Visual language for the season
Same palette (stage black, brass, paper, Vega blue-white). Add: snow (soft, out-of-focus near flakes, crisp far flakes, slow drift, never a blizzard), a cold blue-white moonlight as counter-light in the city and sky scenes, and the gold sparkle of sleigh bells. Felt red `#9c2233` may appear on the hat only as a deep dark red where the rim light reveals it — never a bright red fill.

## Sound
New sounds in `ctx.audio`: sleigh bells ('jingle' sfx: a cluster of small tuned bells in D, shaken), a soft 'whoosh' of the sleigh passing. Melody cues may quote the public-domain tune "Jingle Bells" (Pierpont, 1857) on plucks/keys, tuned to D.

## Scenes (what each builder will do later)
- `zica` b0: Deda Mraz silhouette stands in the warm light shaft at the left, reaches out and plucks the string at 1.6 s (instead of the self-pluck). The visitor can still pull it.
- `zica` b1: on the lyre he sweeps his hand across all seven strings (glissando); snow shaken off the strings.
- `zica` b2: inside the piano, hammers play the opening phrase of Jingle Bells; snow falls through the light shaft.
- `ploca`: struck with sleigh bells; the sand settles into six-fold SNOWFLAKE figures (Chladni-like, hexagonal symmetry).
- `talas`: Deda Mraz's sleigh and reindeer fly across the sky over Belgrade with a gold trail; the sound wave leaves from his bells as he passes over the shop; snow falls over the city.
- `sazvezdje`: the sleigh crosses the night sky past Lyra and disappears toward Vega; end card says Happy New Year.
