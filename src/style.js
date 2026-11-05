// Stylesheet for the 1600x900 design grid (scaled to 1920x1080 by Round.jsx).
// Rules are taken 1:1 from the reference preview; colours come from settings.json / the round.
export const buildCss = (colors, series, TY = { xl: 128, l: 72, m: 44, s: 28 }) => `
:root{
  --navy:${colors.navy};--navy2:${colors.navy2};--series:${series};--mint:${colors.mint};--red:${colors.red};
  --text:${colors.text || "#e8edff"};--muted:${colors.muted || "#8f9bc7"};--pink:${colors.brandPink || "#ff4d8d"};--violet:${colors.brandViolet || "#5b2fd6"};
  --t-xl:${TY.xl}px;--t-l:${TY.l}px;--t-m:${TY.m}px;--t-s:${TY.s}px;
  --display:'Big Shoulders Display','Arial Narrow',Impact,sans-serif;
  --body:'Manrope','Segoe UI',system-ui,sans-serif;
  --mono:'JetBrains Mono','Menlo','Consolas',monospace;
}
#stage,#stage *{box-sizing:border-box}
#stage{position:absolute;left:0;top:0;width:1600px;height:900px;transform-origin:0 0;overflow:hidden;background:#070b1e;font-family:var(--body);color:var(--text)}
#stage>*{position:absolute}
#cam{left:0;top:0;width:1600px;height:900px;transform-origin:800px 430px;will-change:transform}
#cam>*{position:absolute}
.ly{left:0;top:0;width:1600px;height:900px;transform-origin:800px 430px;will-change:transform}
.ly>*{position:absolute}
.bg{inset:-90px;background:radial-gradient(1100px 800px at 50% 40%,#142266 0%,#0a1235 50%,#03050f 100%)}
.cone{left:380px;top:-60px;width:840px;height:760px;background:linear-gradient(180deg,rgba(200,218,255,.2),rgba(200,218,255,0) 88%);clip-path:polygon(41% 0,59% 0,100% 100%,0 100%);transform-origin:50% 0}
.blc{left:300px;top:-90px;width:1000px;height:1000px;border-radius:50%;background:radial-gradient(circle,rgba(120,150,255,.55),rgba(120,150,255,0) 62%)}
.blw{left:300px;top:-90px;width:1000px;height:1000px;border-radius:50%;background:radial-gradient(circle,rgba(255,176,70,.6),rgba(255,176,70,0) 62%);opacity:0}
#disc{left:500px;top:100px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,#f2f6ff 0%,#a9c0ff 38%,rgba(120,150,255,0) 70%)}
#ledge{left:0;top:672px;width:1600px;height:240px;background:linear-gradient(180deg,#0b1334 0%,#050818 40%,#03050f 100%);border-top:2px solid rgba(160,190,255,.35)}
#floor{left:480px;top:652px;width:640px;height:56px;border-radius:50%;background:radial-gradient(closest-side,rgba(180,205,255,.55),rgba(180,205,255,0))}
#hero{left:607px;top:130px;width:386px;height:540px;transform-origin:50% 100%}
#hero svg{position:absolute;left:0;top:0;display:block;overflow:visible}
.hl{position:absolute;left:0;top:0;width:386px;height:540px}
.hl img{position:absolute;left:-287px;top:0;width:960px;height:540px;object-fit:contain;display:block}
#rv{position:absolute;left:50%;top:36%;border-radius:50%;border:4px solid #fff;box-shadow:0 0 40px 8px rgba(255,200,110,.7);opacity:0;pointer-events:none}
.sh{left:500px;top:130px;width:600px;height:600px;border-radius:50%;border:3px solid #fff;opacity:0;pointer-events:none}
.vig{inset:0;background:radial-gradient(ellipse at 50% 46%,rgba(2,4,14,0) 42%,rgba(2,4,14,.85) 100%);pointer-events:none}
#urg{inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(255,60,60,0) 52%,rgba(255,50,70,.55) 100%);opacity:0;pointer-events:none}
#hdr{left:64px;top:50px;display:flex;align-items:center;gap:16px;padding:12px 28px 12px 18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:6px}
#hdr i{width:14px;height:14px;border-radius:50%;background:var(--series)}
#hdr span{font-family:var(--display);font-weight:800;font-size:var(--t-s);letter-spacing:.07em;text-transform:uppercase;line-height:1}
/* Progress tracker moved from top-center to top-left corner (replaces the old #hdr badge). */
#trk{left:64px;top:50px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:14px 26px;background:rgba(10,16,48,.72);border:1px solid rgba(255,255,255,.16);border-radius:8px}
#wm{right:45px;top:29px;display:flex;align-items:center;gap:13px;color:#fff;font-family:var(--mono);font-weight:700;font-size:21px;letter-spacing:.2em;line-height:1;text-transform:uppercase}
#wm b{font-weight:700;color:#fff}
#wm i{font-style:normal;color:#ffc13a}
#pr{left:0;top:704px;width:1600px;text-align:center;font-family:var(--display);font-weight:900;font-size:var(--t-l);line-height:1.12;text-transform:uppercase;white-space:nowrap}
#pr .w{display:inline-block;overflow:hidden;vertical-align:top;padding:0 .14em}
#pr .wi{display:inline-block;will-change:transform}
#pr .q{color:var(--series)}
#ring{left:150px;top:350px;width:180px;text-align:center}
#ringbox{position:relative;width:180px;height:180px}
#ringbox svg{position:absolute;left:0;top:0;display:block;overflow:visible}
#rip{position:absolute;left:8px;top:8px;width:164px;height:164px;border-radius:50%;border:3px solid var(--series);opacity:0}
#num{position:absolute;left:0;top:0;width:180px;height:180px;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-weight:900;font-size:var(--t-xl);line-height:1}
#ringlbl{margin:16px 0 0 -60px;width:300px;font-size:var(--t-s);letter-spacing:.12em;font-weight:700;color:var(--muted);text-transform:uppercase;white-space:nowrap}
.card{left:1120px;top:350px;width:440px;padding:26px 32px 30px;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.2);border-radius:10px}
.card small{display:block;font-size:var(--t-s);letter-spacing:.1em;font-weight:700;text-transform:uppercase;margin-bottom:10px}
.card p{margin:0;font-family:var(--display);font-weight:800;font-size:var(--t-m);line-height:1.04;letter-spacing:.02em}
#hint small{color:var(--series)}
#hint{border-color:color-mix(in srgb,var(--series) 60%,transparent)}
/* Letter-slot hints: sits on the ledge between the prompt (ends ~785) and the timer bar (starts 864). */
#lh{left:0;top:792px;width:1600px;height:56px;display:flex;justify-content:center;align-items:center;pointer-events:none;transform-origin:50% 50%}
#lh .tile{position:relative;flex:none;height:56px}
#lh .tile .face{position:absolute;inset:0;border-radius:10px;overflow:hidden}
#lh .tile .face b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-weight:900;font-size:var(--t-m);line-height:1;letter-spacing:0}
#lh .fixed{flex:none;display:flex;align-items:center;justify-content:center;height:56px;font-family:var(--display);font-weight:900;font-size:var(--t-m);color:var(--muted)}
#fact small{color:var(--mint)}
#fact{border-color:rgba(61,220,151,.6)}
#nm{left:0;top:684px;width:1600px;text-align:center}
#nmain{display:flex;justify-content:center;font-family:var(--display);font-weight:900;font-size:var(--t-xl);line-height:.95;letter-spacing:.05em;color:#fff}
#nmain span{display:inline-block;will-change:transform}
#nsubw{overflow:hidden;margin-top:6px;padding-bottom:4px}
#nsub{font-family:var(--display);font-weight:700;font-size:var(--t-m);line-height:1.1;letter-spacing:.22em;color:var(--series);text-transform:uppercase}
#track{left:80px;top:868px;width:1440px;height:10px;border-radius:5px;background:rgba(255,255,255,.14)}
#fill{left:80px;top:868px;height:10px;border-radius:5px;width:1440px}
.tk{top:864px;width:3px;height:18px;background:rgba(5,8,22,.9)}
.grain{inset:0;pointer-events:none;background-repeat:repeat;background-size:160px 160px}
#flash{inset:0;background:#fff;opacity:0;pointer-events:none}
.pn{left:0;top:-100px;width:2400px;height:1100px;pointer-events:none}
#trk .row{display:flex;gap:.5em;font-family:var(--display);font-weight:800;font-size:var(--t-s);letter-spacing:.08em;line-height:1;color:var(--text);align-items:baseline}
#trk .row b{color:var(--series);font-weight:900;font-size:calc(var(--t-s) * 1.15)}
#trk .row span{color:var(--muted)}
#trk .bar{width:180px;height:5px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}
#trk .bar i{display:block;height:100%;border-radius:3px;background:var(--series)}
#lvl{left:64px;top:118px;display:flex;align-items:center;gap:8px;padding:7px 16px;border-radius:6px;font-family:var(--display);font-weight:900;font-size:18px;letter-spacing:.16em;line-height:1;text-transform:uppercase;white-space:nowrap}
#lvl .flame{display:block;filter:drop-shadow(0 0 4px currentColor)}
#cta{left:1120px;top:350px;width:440px;padding:26px 32px 30px;background:var(--series);color:var(--navy);border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.35)}
#cta b{display:block;font-family:var(--display);font-weight:900;font-size:var(--t-m);line-height:1.04;letter-spacing:.03em;text-transform:uppercase}
#cta small{display:block;margin-top:12px;font-size:var(--t-s);letter-spacing:.1em;font-weight:700;text-transform:uppercase}
#dbg{left:24px;bottom:24px;padding:10px 16px;background:rgba(0,0,0,.75);border:1px solid rgba(255,255,255,.35);border-radius:6px;font:700 24px/1.2 ui-monospace,Menlo,Consolas,monospace;color:#fff;white-space:pre}
`;
