// Built-in placeholder hero (used when a round has no image yet). Shapes copied 1:1 from the reference preview.
// Real rounds use the hero PNG instead: brightness(0) silhouette + colour PNG revealed by clip-path.
const K = "#04060d", KC = "#0c1740";
const CAPE = "M140 136 C 100 200 80 340 52 520 L 348 526 C 320 340 300 200 260 136 Z";
const FOLD = "M200 150 C 190 270 176 400 156 522 L 250 526 C 236 400 222 270 200 150 Z";
const LEGL = "M160 316 C 154 380 150 430 146 470 L 196 470 L 198 316 Z";
const LEGR = "M202 316 L 204 470 L 254 470 C 250 430 246 380 240 316 Z";
const BTL = "M142 468 L 198 468 L 196 538 L 196 552 L 118 552 L 130 520 Z";
const BTR = "M258 468 L 202 468 L 204 538 L 204 552 L 282 552 L 270 520 Z";
const TORSO = "M128 140 C 152 122 248 122 272 140 L 258 220 C 252 262 244 290 238 308 L 162 308 C 156 290 148 262 142 220 Z";
const ARML = "M134 152 C 100 180 88 224 100 252 C 112 276 140 292 158 300";
const ARMR = "M266 152 C 300 180 312 224 300 252 C 288 276 260 292 242 300";
const GAL = "M110 262 C 124 282 142 294 158 300";
const GAR = "M290 262 C 276 282 258 294 242 300";
const MASK = "M168 76 Q 200 62 232 76 L 230 96 Q 200 88 170 96 Z";
const CREST = "M200 14 C 214 32 222 50 220 66 L 180 66 C 178 50 186 32 200 14 Z";
const WL = "M172 72 L 142 58 L 150 90 Z";
const WR = "M228 72 L 258 58 L 250 90 Z";
const HEX = "200,166 226,181 226,211 200,226 174,211 174,181";
const HEX2 = "200,180 214,188 214,204 200,212 186,204 186,188";

const bodyShapes =
  `<path d="${LEGL}"/><path d="${LEGR}"/><path d="${BTL}"/><path d="${BTR}"/><path d="${TORSO}"/>` +
  `<path d="${ARML}" fill="none" stroke-width="34" stroke-linecap="round"/><path d="${ARMR}" fill="none" stroke-width="34" stroke-linecap="round"/>` +
  `<path d="${GAL}" fill="none" stroke-width="46" stroke-linecap="round"/><path d="${GAR}" fill="none" stroke-width="46" stroke-linecap="round"/>` +
  `<circle cx="132" cy="148" r="26"/><circle cx="268" cy="148" r="26"/><circle cx="160" cy="302" r="20"/><circle cx="240" cy="302" r="20"/>` +
  `<rect x="156" y="298" width="88" height="24" rx="5"/><rect x="148" y="304" width="14" height="24" rx="3"/><rect x="238" y="304" width="14" height="24" rx="3"/>` +
  `<rect x="186" y="100" width="28" height="36"/><ellipse cx="200" cy="82" rx="30" ry="34"/>` +
  `<path d="${CREST}"/><path d="${WL}"/><path d="${WR}"/>`;

// ang = cape sway (deg), bx = x position of the light band
export function silhouetteSVG(ang, bx) {
  const rot = `rotate(${ang.toFixed(2)} 200 136)`;
  return (
    `<svg viewBox="0 0 400 560" width="386" height="540" aria-hidden="true"><defs>` +
    `<g id="hs">${bodyShapes}</g><path id="cp" d="${CAPE}"/>` +
    `<mask id="hm" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="560"><g fill="#fff" stroke="#fff"><g id="cpm" transform="${rot}"><use href="#cp"/></g><use href="#hs"/></g></mask>` +
    `<linearGradient id="hbg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bcd2ff" stop-opacity="0"/><stop offset=".5" stop-color="#cfe0ff" stop-opacity=".7"/><stop offset="1" stop-color="#bcd2ff" stop-opacity="0"/></linearGradient>` +
    `</defs>` +
    `<g id="capeS" transform="${rot}"><use href="#cp" fill="${KC}"/></g>` +
    `<use href="#hs" fill="${K}" stroke="${K}"/>` +
    `<g mask="url(#hm)"><rect id="band" x="-140" y="-40" width="110" height="660" fill="url(#hbg)" transform="translate(${bx.toFixed(1)} 0) skewX(-16)"/></g>` +
    `</svg>`
  );
}

export function colourSVG(ang) {
  const rot = `rotate(${ang.toFixed(2)} 200 136)`;
  return (
    `<svg viewBox="0 0 400 560" width="386" height="540" aria-hidden="true"><defs>` +
    `<linearGradient id="gCape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5d8f"/><stop offset="1" stop-color="#7a1747"/></linearGradient>` +
    `<linearGradient id="gSuit" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22e0cb"/><stop offset="1" stop-color="#0e7f93"/></linearGradient>` +
    `<linearGradient id="gSuitD" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#13a99c"/><stop offset="1" stop-color="#0a5f76"/></linearGradient>` +
    `<linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#e2861c"/></linearGradient>` +
    `</defs>` +
    `<g id="capeC" transform="${rot}"><path d="${CAPE}" fill="url(#gCape)"/><path d="${FOLD}" fill="rgba(70,0,40,.3)"/></g>` +
    `<path d="${LEGL}" fill="url(#gSuitD)"/><path d="${LEGR}" fill="url(#gSuit)"/>` +
    `<path d="${BTL}" fill="url(#gGold)"/><path d="${BTR}" fill="url(#gGold)"/>` +
    `<path d="${TORSO}" fill="url(#gSuit)"/>` +
    `<path d="M200 126 L 262 140 L 254 220 C 248 262 244 290 238 308 L 200 308 Z" fill="rgba(0,25,45,.3)"/>` +
    `<path d="${ARML}" fill="none" stroke="url(#gSuitD)" stroke-width="34" stroke-linecap="round"/>` +
    `<path d="${ARMR}" fill="none" stroke="url(#gSuit)" stroke-width="34" stroke-linecap="round"/>` +
    `<path d="${GAL}" fill="none" stroke="url(#gGold)" stroke-width="46" stroke-linecap="round"/>` +
    `<path d="${GAR}" fill="none" stroke="url(#gGold)" stroke-width="46" stroke-linecap="round"/>` +
    `<circle cx="132" cy="148" r="26" fill="url(#gGold)"/><circle cx="268" cy="148" r="26" fill="url(#gGold)"/>` +
    `<circle cx="160" cy="302" r="20" fill="url(#gGold)"/><circle cx="240" cy="302" r="20" fill="url(#gGold)"/>` +
    `<rect x="156" y="298" width="88" height="24" rx="5" fill="#0b1b33"/><rect x="148" y="304" width="14" height="24" rx="3" fill="#0b1b33"/><rect x="238" y="304" width="14" height="24" rx="3" fill="#0b1b33"/>` +
    `<rect x="188" y="300" width="24" height="20" rx="3" fill="url(#gGold)"/>` +
    `<rect x="186" y="100" width="28" height="36" fill="#e9b894"/><ellipse cx="200" cy="82" rx="30" ry="34" fill="#f2c9a5"/>` +
    `<path d="${CREST}" fill="url(#gGold)"/><path d="${WL}" fill="url(#gGold)"/><path d="${WR}" fill="url(#gGold)"/>` +
    `<path d="${MASK}" fill="#0b1b33"/><ellipse cx="186" cy="84" rx="8" ry="3.2" fill="#fff"/><ellipse cx="214" cy="84" rx="8" ry="3.2" fill="#fff"/>` +
    `<polygon points="${HEX}" fill="#fff2d6"/><polygon points="${HEX2}" fill="#ffb53d"/>` +
    `</svg>`
  );
}
