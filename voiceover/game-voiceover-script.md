# Guess the Game Character by Silhouette | Voiceover Script

**Voice:** same voice as videos 00 and 01 (`5XbWatCr4Q4ezek0ZhfT`), General American, energetic quiz host, about 175 wpm. Questions are short and clean; reveals are louder and punchier. Trim every clip to about 0.1 s of silence at both ends.

**Say it like this:** Kratos (KRAY-tos), Geralt (GEH-ralt), Rivia (RIV-ee-uh), Sephiroth (seh-FEER-oth), Ezio Auditore (EHT-see-oh ow-dee-TOR-eh), Mewtwo (MYOO-too), Gengar (GEN-gar), Samus Aran (SAM-us AIR-in), Sans (sanz), Rayman (RAY-man), Wario (WAH-ree-oh), Yoshi (YOH-shee), Cuphead (CUP-head), Pokédex (POH-kay-dex).

**Timing rules from `src/game/config.js`:** question line about 1.5 s, hard cap 2.7 s (the timer starts after it); reveal line under 3.5 s (the reveal stretches to fit, so longer is safe but slows pacing); stingers stretch to fit; no voice during the 6 s countdown.

**Round 1 is the hook.** The timer runs from 0:00 and `g01_question` plays over the 3.4 s hook overlay, so it is the only question line allowed to run long (about 2.4 s).

**Round 50 is unresolved.** `g50_reveal` is read over the end card and does NOT say the answer. The answer goes in the pinned comment.

**Types in `lines.csv`:** `hook`, `question`, `reveal`, `stinger`, `bonusq` (bonus intro/question), `bonus` (bonus reveal), `outro` (Round 50 end card).

## All lines, in video order

| # | Clip | Section | Line | Est. | Max |
|---|---|---|---|---|---|
| 1 | `g01_question` | Round 1 | Fifty gaming legends. Name every shadow. | 2.4 s | 2.8 s |
| 2 | `g01_reveal` | Round 1 | Mario! He started out as Jumpman. | 2.4 s | 3.5 s |
| 3 | `g02_question` | Round 2 | Easy one. Who's this? | 1.7 s | 1.8 s |
| 4 | `g02_reveal` | Round 2 | Pikachu! Its name is a spark plus a squeak. | 3.5 s | 3.5 s |
| 5 | `g03_question` | Round 3 | Name this legend. | 1.4 s | 1.8 s |
| 6 | `g03_reveal` | Round 3 | Pac-Man! Legend says he's a pizza missing a slice. | 3.5 s | 3.5 s |
| 7 | `g04_question` | Round 4 | Quick! Who's this? | 1.4 s | 1.8 s |
| 8 | `g04_reveal` | Round 4 | Sonic! Sega's answer to Mario. | 2.1 s | 3.5 s |
| 9 | `g05_question` | Round 5 | Number five. Who's this? | 1.7 s | 1.8 s |
| 10 | `g05_reveal` | Round 5 | Bowser! In Japan, he's called Koopa. | 2.4 s | 3.5 s |
| 11 | `g06_question` | Round 6 | You know this one. | 1.7 s | 1.8 s |
| 12 | `g06_reveal` | Round 6 | Yoshi! He debuted in Super Mario World. | 2.8 s | 3.5 s |
| 13 | `g07_question` | Round 7 | Who's in the shadow? | 1.7 s | 1.8 s |
| 14 | `g07_reveal` | Round 7 | Luigi! He began life as Mario in green. | 3.1 s | 3.5 s |
| 15 | `g08_question` | Round 8 | Big shadow. Who's this? | 1.7 s | 1.8 s |
| 16 | `g08_reveal` | Round 8 | Donkey Kong! Mario's very first enemy. | 2.4 s | 3.5 s |
| 17 | `g09_question` | Round 9 | Blocky. Who's this? | 1.4 s | 1.8 s |
| 18 | `g09_reveal` | Round 9 | Steve! Minecraft is the best-selling game ever. | 2.8 s | 3.5 s |
| 19 | `g10_question` | Round 10 | Number ten. Who's this? | 1.7 s | 1.8 s |
| 20 | `g10_reveal` | Round 10 | Kirby! Born as a placeholder blob called Popopo. | 3.1 s | 3.5 s |
| 21 | `bonus_emoji_question` | Bonus after round 10 | Bonus! Decode the emojis. | 1.7 s | 2.0 s |
| 22 | `bonus_emoji_reveal` | Bonus after round 10 | Angry Birds! Rovio's fifty-second game. Fifty-one came first. | 3.1 s | 4.0 s |
| 23 | `g11_question` | Round 11 | Name this one. | 1.4 s | 1.8 s |
| 24 | `g11_reveal` | Round 11 | Crash Bandicoot! Naughty Dog's PlayStation mascot. | 2.4 s | 3.5 s |
| 25 | `g12_question` | Round 12 | Last easy one. | 1.4 s | 1.8 s |
| 26 | `g12_reveal` | Round 12 | Mega Man! He steals boss powers. | 2.4 s | 3.5 s |
| 27 | `stinger_1` | Level-up stinger 1 | Level one cleared. Medium mode. | 2.1 s | 3.0 s |
| 28 | `g13_question` | Round 13 | Medium mode. Who's this? | 1.7 s | 1.8 s |
| 29 | `g13_reveal` | Round 13 | Link! Not Zelda. Everyone mixes that up. | 2.8 s | 3.5 s |
| 30 | `g14_question` | Round 14 | Getting trickier. Who's this? | 1.7 s | 1.8 s |
| 31 | `g14_reveal` | Round 14 | Master Chief! His Spartan number is one-seventeen. | 2.8 s | 3.5 s |
| 32 | `g15_question` | Round 15 | Who's hiding here? | 1.4 s | 1.8 s |
| 33 | `g15_reveal` | Round 15 | Lara Croft! Gaming's first big action heroine. | 2.8 s | 3.5 s |
| 34 | `g16_question` | Round 16 | Fight night. Who's this? | 1.7 s | 1.8 s |
| 35 | `g16_reveal` | Round 16 | Sub-Zero! Mortal Kombat's ice ninja. | 2.1 s | 3.5 s |
| 36 | `g17_question` | Round 17 | Another fighter. Who's this? | 1.7 s | 1.8 s |
| 37 | `g17_reveal` | Round 17 | Scorpion! "Get over here!" started with him. | 2.8 s | 3.5 s |
| 38 | `g18_question` | Round 18 | Name this fighter. | 1.4 s | 1.8 s |
| 39 | `g18_reveal` | Round 18 | Chun-Li! Street Fighter's first playable woman. | 2.4 s | 3.5 s |
| 40 | `g19_question` | Round 19 | Final fighter. Who's this? | 1.7 s | 1.8 s |
| 41 | `g19_reveal` | Round 19 | Ryu! The original Street Fighter hero. | 2.4 s | 3.5 s |
| 42 | `g20_question` | Round 20 | Number twenty. Who's this? | 1.7 s | 1.8 s |
| 43 | `g20_reveal` | Round 20 | Spyro! A purple dragon from nineteen ninety-eight. | 2.8 s | 3.5 s |
| 44 | `bonus_versus_question` | Bonus after round 20 | Bonus! Which came first? | 1.7 s | 2.0 s |
| 45 | `bonus_versus_reveal` | Bonus after round 20 | Pac-Man! Nineteen eighty. A year before Donkey Kong. | 3.1 s | 4.0 s |
| 46 | `g21_question` | Round 21 | Weird shape. Name it. | 1.7 s | 1.8 s |
| 47 | `g21_reveal` | Round 21 | Rayman! No arms. No legs. No problem. | 2.8 s | 3.5 s |
| 48 | `g22_question` | Round 22 | Royalty alert. Who's this? | 1.7 s | 1.8 s |
| 49 | `g22_reveal` | Round 22 | Princess Peach! Once called Princess Toadstool. | 2.4 s | 3.5 s |
| 50 | `g23_question` | Round 23 | Old-school cartoon. Who's this? | 1.7 s | 1.8 s |
| 51 | `g23_reveal` | Round 23 | Cuphead! Hand-drawn like nineteen-thirties cartoons. | 2.1 s | 3.5 s |
| 52 | `g24_question` | Round 24 | Don't blink. Who's this? | 1.7 s | 1.8 s |
| 53 | `g24_reveal` | Round 24 | Creeper! Born from a coding mistake. | 2.4 s | 3.5 s |
| 54 | `g25_question` | Round 25 | Last medium one. | 1.4 s | 1.8 s |
| 55 | `g25_reveal` | Round 25 | Wario! His name means bad Mario. | 2.4 s | 3.5 s |
| 56 | `stinger_2` | Level-up stinger 2 | Level two cleared. Score in comments. Hard mode. | 3.1 s | 3.0 s |
| 57 | `g26_question` | Round 26 | Hard mode. Who's this? | 1.7 s | 1.8 s |
| 58 | `g26_reveal` | Round 26 | Charizard! He's not even a Dragon type. | 2.8 s | 3.5 s |
| 59 | `g27_question` | Round 27 | Take a guess. | 1.4 s | 1.8 s |
| 60 | `g27_reveal` | Round 27 | Fox McCloud! Star Fox's ace pilot. | 2.4 s | 3.5 s |
| 61 | `g28_question` | Round 28 | Who's this soldier? | 1.4 s | 1.8 s |
| 62 | `g28_reveal` | Round 28 | Cloud Strife! Final Fantasy Seven's spiky-haired soldier. | 2.8 s | 3.5 s |
| 63 | `g29_question` | Round 29 | Rage incoming. Who's this? | 1.7 s | 1.8 s |
| 64 | `g29_reveal` | Round 29 | Kratos! He went from Greek gods to Norse. | 3.1 s | 3.5 s |
| 65 | `g30_question` | Round 30 | Suit up. Who's this? | 1.7 s | 1.8 s |
| 66 | `g30_reveal` | Round 30 | Samus Aran! Metroid's big twist: she's a woman. | 3.1 s | 3.5 s |
| 67 | `bonus_controller_question` | Bonus after round 30 | Bonus! Name this console. | 1.7 s | 2.0 s |
| 68 | `bonus_controller_reveal` | Bonus after round 30 | Nintendo 64! Three handles, one analog stick. | 2.8 s | 4.0 s |
| 69 | `g31_question` | Round 31 | Sneak up. Who's this? | 1.7 s | 1.8 s |
| 70 | `g31_reveal` | Round 31 | Solid Snake! A cardboard box. Still works. | 2.8 s | 3.5 s |
| 71 | `g32_question` | Round 32 | Demons beware. Who's this? | 1.7 s | 1.8 s |
| 72 | `g32_reveal` | Round 32 | Doom Slayer! Doom came out in nineteen ninety-three. | 3.1 s | 3.5 s |
| 73 | `g33_question` | Round 33 | Short shadow. Who's this? | 1.7 s | 1.8 s |
| 74 | `g33_reveal` | Round 33 | Sans! Undertale was made mostly by one person. | 3.1 s | 3.5 s |
| 75 | `g34_question` | Round 34 | Who's this wanderer? | 1.4 s | 1.8 s |
| 76 | `g34_reveal` | Round 34 | Geralt of Rivia! Born in Polish fantasy novels. | 3.1 s | 3.5 s |
| 77 | `g35_question` | Round 35 | Yeehaw! Who's this? | 1.4 s | 1.8 s |
| 78 | `g35_reveal` | Round 35 | Arthur Morgan! Voiced by Roger Clark. | 2.4 s | 3.5 s |
| 79 | `g36_question` | Round 36 | Think fast. Who's this? | 1.7 s | 1.8 s |
| 80 | `g36_reveal` | Round 36 | Gordon Freeman! He never speaks. Not once. | 2.8 s | 3.5 s |
| 81 | `g37_question` | Round 37 | Treasure time. Who's this? | 1.7 s | 1.8 s |
| 82 | `g37_reveal` | Round 37 | Nathan Drake! Claims he descends from Sir Francis Drake. | 3.5 s | 3.5 s |
| 83 | `g38_question` | Round 38 | One name. Who's this? | 1.7 s | 1.8 s |
| 84 | `g38_reveal` | Round 38 | Sephiroth! His theme is One-Winged Angel. | 2.4 s | 3.5 s |
| 85 | `stinger_3` | Level-up stinger 3 | Warning! Expert mode. Most people fail here. | 2.8 s | 3.0 s |
| 86 | `g39_question` | Round 39 | Cute but tricky. | 1.4 s | 1.8 s |
| 87 | `g39_reveal` | Round 39 | Sackboy! A knitted burlap doll. | 2.1 s | 3.5 s |
| 88 | `g40_question` | Round 40 | Chaos incoming. Who's this? | 1.7 s | 1.8 s |
| 89 | `g40_reveal` | Round 40 | Trevor Philips! Voiced by Steven Ogg. | 2.4 s | 3.5 s |
| 90 | `bonus_myth_question` | Bonus after round 40 | Myth or fact? | 1.4 s | 2.0 s |
| 91 | `bonus_myth_reveal` | Bonus after round 40 | Fact! Sony and Nintendo built it. Then Nintendo quit. | 3.5 s | 4.0 s |
| 92 | `g41_question` | Round 41 | Who's in the hood? | 1.7 s | 1.8 s |
| 93 | `g41_reveal` | Round 41 | Ezio Auditore! Star of three Assassin's Creed games. | 3.1 s | 3.5 s |
| 94 | `g42_question` | Round 42 | Psychic shadow. Name it. | 1.7 s | 1.8 s |
| 95 | `g42_reveal` | Round 42 | Mewtwo! A clone of Mew. | 2.1 s | 3.5 s |
| 96 | `g43_question` | Round 43 | Retro vibes. Who's this? | 1.7 s | 1.8 s |
| 97 | `g43_reveal` | Round 43 | Vault Boy! Fallout's thumbs-up mascot. | 2.1 s | 3.5 s |
| 98 | `g44_question` | Round 44 | Spooky shadow. Who's this? | 1.7 s | 1.8 s |
| 99 | `g44_reveal` | Round 44 | Gengar! Pokédex number ninety-four. | 2.1 s | 3.5 s |
| 100 | `g45_question` | Round 45 | Sneaky one. Who's this? | 1.7 s | 1.8 s |
| 101 | `g45_reveal` | Round 45 | Sly Cooper! A raccoon thief on PlayStation Two. | 3.1 s | 3.5 s |
| 102 | `bonus_cheat_question` | Bonus after round 45 | Bonus! Konami Code time. | 1.7 s | 2.0 s |
| 103 | `bonus_cheat_reveal` | Bonus after round 45 | The Konami Code! Thirty lives in Contra. | 2.8 s | 4.0 s |
| 104 | `g46_question` | Round 46 | Tough one. Who's this? | 1.7 s | 1.8 s |
| 105 | `g46_reveal` | Round 46 | Joel Miller! Voiced by Troy Baker. | 2.4 s | 3.5 s |
| 106 | `g47_question` | Round 47 | Now her. Who's this? | 1.7 s | 1.8 s |
| 107 | `g47_reveal` | Round 47 | Ellie! Voiced by Ashley Johnson. | 2.1 s | 3.5 s |
| 108 | `g48_question` | Round 48 | Expert only. Who's this? | 1.7 s | 1.8 s |
| 109 | `g48_reveal` | Round 48 | Hornet! Fans begged for her own game. Silksong delivered. | 3.5 s | 3.5 s |
| 110 | `g49_question` | Round 49 | Silent hero. Who's this? | 1.7 s | 1.8 s |
| 111 | `g49_reveal` | Round 49 | The Knight! Hollow Knight's silent hero. | 2.4 s | 3.5 s |
| 112 | `g50_question` | Round 50 | Final round. Who's this? | 1.7 s | 1.8 s |
| 113 | `g50_reveal` | Round 50 | Number fifty. Comment your guess! The answer is pinned. Subscribe! | 3.8 s | 4.5 s |

Bonus clip ids are `bonus_<key>_question` / `bonus_<key>_reveal` (emoji, versus, controller, myth, cheat). Recording them is optional until `BonusRound.jsx` plays voice (it currently only plays SFX).
