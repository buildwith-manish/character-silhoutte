# Image prompts for the 50 character PNGs

Save each image in `public/game/` with EXACTLY the filename shown, then run `npm run game:prepare`.

## What the video needs (and what it doesn't)
- **Only 50 images.** One per character. Backgrounds, spotlight, timer, text and effects are all made by code.
- **Format:** PNG, square (1:1), 2048×2048 px, **transparent background**.
- **Full-colour artwork.** The video turns it into a pure black silhouette automatically, then crossfades back to the colour image at the reveal.

## Rules that make the silhouette work
1. The **outline is everything**: the video shows only the shape, so the pose and props must be readable as a black shape.
2. **Entire body in frame**, centered, filling about 85% of the height, with the **feet on the same baseline** for every character (about 5% margin at the bottom). Floating characters (Rayman, Pac-Man) are centered.
3. **No background, no ground shadow, no glow, no motion lines, no sparkles, no text, no frame.** Any soft shadow or glow becomes a black blob in the silhouette.
4. Weapons and props must be **held or attached** so the silhouette is one connected shape (except Rayman, whose floating hands are his identity).
5. Same art style for all 50 (official game-art look, clean sharp edges) so the quiz feels consistent.
6. After generating, **check it**: put the PNG on a white page and apply a black fill (or just view it with brightness 0). If the outline looks fuzzy, has halos, or leftover background, redo the background removal.

## Transparent background workflow
Most AI generators cannot output real transparency. Generate on a **pure flat white (or pure green) background**, then remove it with a tool such as remove.bg, Photoshop "Remove background", or `rembg`. Zoom into the edges to catch white halos.

## Master prompt (replace the two parts in CAPS)
```
Full-body character illustration of NAME from GAME, POSE AND FEATURES. Official video game art style, full colour, clean sharp outline, character centered with the entire body visible and a small margin on all sides, plain solid pure white background, flat lighting, no shadow on the ground, no glow, no text, no extra objects, square 1:1 composition, high resolution.
```
**Negative prompt** (if your tool has one): `background scenery, ground shadow, drop shadow, glow, aura, motion lines, particles, text, watermark, logo, frame, border, cropped, cut off, multiple characters, blurry edges`

> If a generator refuses a character name, describe the character by its features instead of its name (the list below already gives the key features), or use a different tool. These are other companies' characters, so YouTube may add Content ID claims to a video that uses them.

## The 50 images
Each entry: filename — what to put in the POSE AND FEATURES slot.

### Level 1 — Easy (rounds 1-12)

1. **Mario** (Super Mario) — `mario.png`
   - POSE AND FEATURES: running/jumping pose, one fist punched up; red cap with M emblem, big round nose, thick mustache, overalls, white gloves, brown shoes

2. **Pikachu** (Pokémon) — `pikachu.png`
   - POSE AND FEATURES: standing upright, slight 3/4 view; two tall pointed ears with black tips, round cheeks, and a zig-zag lightning-bolt tail clearly visible

3. **Pac-Man** (Pac-Man) — `pac-man.png`
   - POSE AND FEATURES: a perfect yellow circle with a wedge-shaped mouth open facing right; no arms or legs, no eyes needed

4. **Sonic the Hedgehog** (Sonic) — `sonic-the-hedgehog.png`
   - POSE AND FEATURES: fast running pose, side view; long curved quills swept backwards, big sneakers, one arm swinging

5. **Bowser** (Super Mario) — `bowser.png`
   - POSE AND FEATURES: standing menacingly, 3/4 view; spiked shell behind, two horns, heavy tail, clawed hands raised

6. **Yoshi** (Super Mario) — `yoshi.png`
   - POSE AND FEATURES: standing side-on, 3/4 view; big round snout, small shell saddle on back, crest on head, tail

7. **Luigi** (Super Mario) — `luigi.png`
   - POSE AND FEATURES: standing straight with arms slightly out; taller and leaner than Mario, cap with the L on the brim, long mustache, overalls

8. **Donkey Kong** (Donkey Kong) — `donkey-kong.png`
   - POSE AND FEATURES: hunched gorilla stance, arms wide; very broad shoulders and a necktie on the chest

9. **Steve** (Minecraft) — `steve.png`
   - POSE AND FEATURES: strictly blocky, square head and torso, boxy arms and legs, holding a pickaxe up in one hand

10. **Kirby** (Kirby) — `kirby.png`
   - POSE AND FEATURES: a perfectly round puffy body with two stubby arms raised and two large oval feet; tiny face

11. **Crash Bandicoot** (Crash Bandicoot) — `crash-bandicoot.png`
   - POSE AND FEATURES: standing in a ready pose, arms out; tall triangular torso, big spiky tuft of hair, big sneakers

12. **Mega Man** (Mega Man) — `mega-man.png`
   - POSE AND FEATURES: standing with the arm buster cannon raised and aimed forward; helmet with ear pieces, boots

### Level 2 — Medium (rounds 13-25)

13. **Link** (The Legend of Zelda) — `link.png`
   - POSE AND FEATURES: standing heroic stance; pointed floppy cap, Master Sword hilt over the shoulder on his back, Hylian shield on the arm

14. **Master Chief** (Halo) — `master-chief.png`
   - POSE AND FEATURES: standing with an assault rifle held across the body; bulky MJOLNIR armor, full helmet with visor

15. **Lara Croft** (Tomb Raider) — `lara-croft.png`
   - POSE AND FEATURES: dual-pistol stance with both guns drawn at her sides; long braid/ponytail swinging, tank top, shorts, holsters

16. **Sub-Zero** (Mortal Kombat) — `sub-zero.png`
   - POSE AND FEATURES: ninja pose with one hand forward emitting ice; hooded cowl, full face mask, belt and wraps

17. **Scorpion** (Mortal Kombat) — `scorpion.png`
   - POSE AND FEATURES: ninja pose, one arm thrown forward holding a kunai spear on a rope that stays attached to his hand; masked hood

18. **Chun-Li** (Street Fighter) — `chun-li.png`
   - POSE AND FEATURES: high-kick stance; two ox-horn hair buns with ribbons, spiked wrist bracers, muscular thighs, qipao-style outfit

19. **Ryu** (Street Fighter) — `ryu.png`
   - POSE AND FEATURES: folded-arm karate fighting stance; headband tails fluttering behind, sleeveless gi, bare fists

20. **Spyro the Dragon** (Spyro) — `spyro-the-dragon.png`
   - POSE AND FEATURES: small purple dragon on four legs, side view; two curved horns, small bat-like wings, tail

21. **Rayman** (Rayman) — `rayman.png`
   - POSE AND FEATURES: floating head and torso with wind-blown hair; detached floating hands and feet hovering in their normal positions (no limbs attached)

22. **Princess Peach** (Super Mario) — `princess-peach.png`
   - POSE AND FEATURES: standing in a bell-shaped ballgown holding a parasol; crown with spikes, long hair

23. **Cuphead** (Cuphead) — `cuphead.png`
   - POSE AND FEATURES: cup head with a bent striped straw, hands on hips, gloves, shorts, standing cartoon pose

24. **Creeper** (Minecraft) — `creeper.png`
   - POSE AND FEATURES: tall blocky pillar body with a square head and four short stubby legs at the corners

25. **Wario** (Super Mario) — `wario.png`
   - POSE AND FEATURES: arms akimbo, stocky and muscular; wide zig-zag mustache, jagged pointed ears, cap

### Level 3 — Hard (rounds 26-38)

26. **Charizard** (Pokémon) — `charizard.png`
   - POSE AND FEATURES: wings spread, long neck, two horn prongs on the head; flame burning at the tail tip, standing on two legs

27. **Fox McCloud** (Star Fox) — `fox-mccloud.png`
   - POSE AND FEATURES: standing with blaster pointed forward; fox snout and ears, headset with microphone, combat vest

28. **Cloud Strife** (Final Fantasy VII) — `cloud-strife.png`
   - POSE AND FEATURES: Buster Sword (huge) resting over the shoulder; large spiky hair, standing stance

29. **Kratos** (God of War) — `kratos.png`
   - POSE AND FEATURES: broad bald head, heavy beard, muscular; Leviathan axe on his back, standing

30. **Samus Aran** (Metroid) — `samus-aran.png`
   - POSE AND FEATURES: power suit with large round shoulder pads; arm cannon pointed forward, standing

31. **Solid Snake** (Metal Gear Solid) — `solid-snake.png`
   - POSE AND FEATURES: sneaking pose with a pistol raised; headband tails trailing behind, tactical vest

32. **Doom Slayer** (DOOM) — `doom-slayer.png`
   - POSE AND FEATURES: heavy futuristic praetor suit with crested helmet, holding a Super Shotgun, standing

33. **Sans** (Undertale) — `sans.png`
   - POSE AND FEATURES: short and plump, standing relaxed; puffy hooded jacket, shorts, slippers, wide grin

34. **Geralt of Rivia** (The Witcher) — `geralt-of-rivia.png`
   - POSE AND FEATURES: standing with two sword scabbards crossing his back; half-ponytail hair, leather jacket

35. **Arthur Morgan** (Red Dead Redemption 2) — `arthur-morgan.png`
   - POSE AND FEATURES: wide-brimmed cowboy hat, bandolier across the chest, long duster coat, standing

36. **Gordon Freeman** (Half-Life) — `gordon-freeman.png`
   - POSE AND FEATURES: holding a red crowbar at his side; HEV suit, glasses and goatee

37. **Nathan Drake** (Uncharted) — `nathan-drake.png`
   - POSE AND FEATURES: standing with a half-tucked henley, shoulder holster, and a grappling hook coil on the belt

38. **Sephiroth** (Final Fantasy VII) — `sephiroth.png`
   - POSE AND FEATURES: very long straight hair, one black wing, an impossibly long Masamune sword held at his side

### Level 4 — Expert (rounds 39-50)

39. **Sackboy** (LittleBigPlanet) — `sackboy.png`
   - POSE AND FEATURES: knitted sack doll; big round head with a zipper pull on the chest, stitched seams

40. **Trevor Philips** (Grand Theft Auto V) — `trevor-philips.png`
   - POSE AND FEATURES: casual aggressive stance; receding hairline, loose V-neck t-shirt

41. **Ezio Auditore** (Assassin's Creed) — `ezio-auditore.png`
   - POSE AND FEATURES: hooded Assassin pose; pointed eagle-beak hood, hidden blade bracers on both forearms, flowing capelet

42. **Mewtwo** (Pokémon) — `mewtwo.png`
   - POSE AND FEATURES: standing, tall slim humanoid; two small horns on a bulbous head, tube from chest to head, thick tail coiled behind

43. **Vault Boy** (Fallout) — `vault-boy.png`
   - POSE AND FEATURES: cartoon thumbs-up pose; wavy 1950s hair, jumpsuit, big smile

44. **Gengar** (Pokémon) — `gengar.png`
   - POSE AND FEATURES: round shadowy body with spiky back and devilish pointed ears; wide grin, short arms, standing

45. **Sly Cooper** (Sly Cooper) — `sly-cooper.png`
   - POSE AND FEATURES: standing in a thief pose; raccoon tail with rings, thief cap, large golden cane hook held in hand

46. **Joel Miller** (The Last of Us) — `joel-miller.png`
   - POSE AND FEATURES: standing heavy build; flannel/jacket, backpack with a shotgun taped to it, rugged posture

47. **Ellie** (The Last of Us) — `ellie.png`
   - POSE AND FEATURES: standing, side-swept ponytail; backpack with a bow (or switchblade) slung over the shoulder

48. **Hornet** (Hollow Knight) — `hornet.png`
   - POSE AND FEATURES: needle-like curved head horns, dress-style cloak, holding a long sewing needle blade

49. **The Knight** (Hollow Knight) — `the-knight.png`
   - POSE AND FEATURES: small vessel body with a mask showing two long horns, small cloak, holding a nail sword upright

50. **Ghost** (Call of Duty: Modern Warfare) — `ghost.png`
   - POSE AND FEATURES: tactical headset over a skull-pattern balaclava; military gear, standing, rifle optional (keep it attached to the body)

## Quick checklist
- [ ] 50 PNG files, correct filenames, all in `public/game/`
- [ ] All transparent, no halos, same framing and feet baseline
- [ ] `npm run game:prepare` says 50/50 PNGs found
