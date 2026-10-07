// =============================================
// Gerador de ANÚNCIOS dos eventos — Central Casarão 360
// Formato de anúncio de show: cena cinematográfica (luz volumétrica, névoa,
// plateia em bokeh) + artista em SILHUETA contra-luz (pose icônica do gênero,
// sem rosto — eventos cover não podem usar foto/likeness do artista original)
// + tipografia da casa. Saída: public/eventos/ads/<slug>.jpg (1600×1000).
//
// FOTOS OFICIAIS: se existir public/eventos/fotos/<slug>.(jpg|jpeg|png|webp)
// (material de divulgação autorizado da banda), ela substitui a cena como
// fundo do anúncio, tratada com o grade da marca. Esse é o caminho correto
// para "foto real do artista".
//
// Datas/títulos vêm do Supabase (anon). Uso: node scripts/generate-event-ads.mjs
// =============================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = require(path.join(ROOT, 'node_modules', '@playwright', 'test'));

const OUT_DIR = path.join(ROOT, 'public', 'eventos', 'ads');
const FOTOS_DIR = path.join(ROOT, 'public', 'eventos', 'fotos');
const W = 1600, H = 1000;

// ---------- env / dados ----------
function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
  return env;
}

async function fetchEvents(env) {
  const res = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events?select=slug,title,event_date&public_visibility=eq.true&order=event_date`,
    { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` } }
  );
  return res.json();
}

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const DIAS = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00-03:00');
  return `${DIAS[d.getDay()]} · ${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

// ---------- silhuetas (SVG, viewBox 0 0 600 520, preenchidas em preto) ----------
// Figuras estilizadas de palco — proporções alongadas de pôster; a atmosfera
// (contra-luz, névoa) faz a leitura fotográfica.
const F = 'fill="#050302"';

// Guitarrista de arena: pernas abertas, guitarra erguida
const poseGuitarHero = `
  <ellipse cx="300" cy="96" rx="26" ry="30" ${F}/>
  <path d="M300 122 C268 130 258 168 260 210 L252 300 240 300 250 208 C244 160 258 128 300 122 C342 128 356 160 350 208 L366 302 352 302 340 210 C342 168 332 130 300 122 Z" ${F}/>
  <path d="M262 150 C230 140 196 118 168 88 L182 76 C210 106 240 126 268 136 Z" ${F}/>
  <path d="M338 150 C360 162 372 186 376 214 L362 218 C356 192 346 172 330 162 Z" ${F}/>
  <path d="M254 298 L236 470 262 470 282 320 Z M348 300 L330 470 356 470 372 322 Z" ${F}/>
  <g transform="translate(300 236) rotate(-32)">
    <ellipse cx="-52" cy="14" rx="52" ry="42" ${F}/>
    <ellipse cx="-4" cy="0" rx="36" ry="30" ${F}/>
    <rect x="8" y="-14" width="148" height="15" rx="7" ${F}/>
    <rect x="152" y="-22" width="26" height="31" rx="7" ${F}/>
  </g>`;

// Pose do rei do pop: ponta dos pés, mão no chapéu
const poseMJ = `
  <g transform="rotate(-6 300 300)">
    <path d="M252 66 C252 46 344 46 344 66 L336 74 C360 78 366 92 360 96 L240 96 C232 90 240 80 260 74 Z" ${F}/>
    <ellipse cx="298" cy="102" rx="22" ry="20" ${F}/>
    <path d="M298 120 C270 128 262 160 266 205 L262 290 278 292 282 210 314 210 320 292 336 290 330 205 C334 160 326 128 298 120 Z" ${F}/>
    <path d="M276 132 C258 120 250 100 252 80 L268 78 C268 96 276 110 288 120 Z" ${F}/>
    <path d="M320 132 C344 148 356 176 358 210 L344 214 C340 184 330 160 312 146 Z" ${F}/>
    <path d="M276 290 L268 400 244 452 262 460 288 404 292 300 Z" ${F}/>
    <path d="M316 292 L318 402 332 452 350 446 334 400 332 296 Z" ${F}/>
  </g>`;

// Cantor ao microfone de pedestal, braço aberto
const poseCrooner = `
  <ellipse cx="290" cy="92" rx="25" ry="29" ${F}/>
  <path d="M290 118 C254 126 244 166 248 214 L242 310 260 312 266 220 314 220 322 312 340 310 332 214 C336 166 326 126 290 118 Z" ${F}/>
  <path d="M258 142 C232 150 214 168 204 192 L218 200 C228 180 244 166 266 158 Z" ${F}/>
  <path d="M322 142 C352 134 382 116 402 92 L390 80 C372 100 348 116 316 126 Z" ${F}/>
  <path d="M262 308 L252 470 276 470 288 330 Z M320 310 L332 470 356 470 344 330 Z" ${F}/>
  <rect x="196" y="196" width="10" height="240" rx="5" ${F}/>
  <path d="M166 436 L236 436 226 452 176 452 Z" ${F}/>
  <ellipse cx="201" cy="184" rx="18" ry="20" ${F}/>`;

// Violeiro sentado no banquinho com viola
const poseVioleiro = `
  <ellipse cx="300" cy="120" rx="25" ry="28" ${F}/>
  <path d="M300 146 C266 154 256 190 260 232 L262 288 340 288 342 232 C346 190 334 154 300 146 Z" ${F}/>
  <path d="M262 288 L252 360 236 460 260 462 282 366 288 300 Z" ${F}/>
  <path d="M340 288 L352 362 368 460 344 462 326 366 318 300 Z" ${F}/>
  <rect x="252" y="356" width="104" height="14" rx="7" ${F}/>
  <rect x="266" y="368" width="10" height="96" ${F}/><rect x="332" y="368" width="10" height="96" ${F}/>
  <g transform="rotate(-24 300 250)">
    <ellipse cx="268" cy="266" rx="52" ry="42" ${F}/>
    <ellipse cx="318" cy="252" rx="36" ry="32" ${F}/>
    <rect x="330" y="238" width="140" height="16" rx="6" ${F}/>
    <rect x="466" y="230" width="26" height="30" rx="6" ${F}/>
  </g>
  <path d="M262 180 C244 196 236 220 238 246 L252 248 C252 226 258 208 272 196 Z" ${F}/>`;

// Tecladista atrás do sintetizador (anos 80)
const poseKeys = `
  <ellipse cx="300" cy="98" rx="25" ry="29" ${F}/>
  <path d="M300 124 C266 132 256 170 260 214 L262 268 338 268 340 214 C344 170 334 132 300 124 Z" ${F}/>
  <path d="M264 150 C246 172 238 202 240 236 L254 260 264 254 252 232 C252 204 260 182 276 164 Z" ${F}/>
  <path d="M336 150 C354 172 362 202 360 236 L346 260 336 254 348 232 C348 204 340 182 324 164 Z" ${F}/>
  <path d="M170 268 L430 268 442 296 158 296 Z" ${F}/>
  <g fill="#0d0805">
    <rect x="188" y="274" width="18" height="16"/><rect x="212" y="274" width="18" height="16"/>
    <rect x="252" y="274" width="18" height="16"/><rect x="276" y="274" width="18" height="16"/>
    <rect x="300" y="274" width="18" height="16"/><rect x="340" y="274" width="18" height="16"/>
    <rect x="364" y="274" width="18" height="16"/><rect x="404" y="274" width="18" height="16"/>
  </g>
  <path d="M176 296 L168 470 190 470 200 296 Z M424 296 L432 470 410 470 400 296 Z" ${F}/>`;

// Baterista: braços em V com baquetas, bateria à frente
const poseDrummer = `
  <ellipse cx="300" cy="120" rx="25" ry="28" ${F}/>
  <path d="M300 146 C268 154 258 190 262 230 L264 282 336 282 338 230 C342 190 332 154 300 146 Z" ${F}/>
  <path d="M270 160 C244 138 228 110 222 78 L238 72 C246 100 260 124 282 142 Z" ${F}/>
  <rect x="216" y="26" width="8" height="58" rx="4" transform="rotate(-26 220 55)" ${F}/>
  <path d="M330 160 C356 138 372 110 378 78 L362 72 C354 100 340 124 318 142 Z" ${F}/>
  <rect x="374" y="26" width="8" height="58" rx="4" transform="rotate(26 378 55)" ${F}/>
  <ellipse cx="300" cy="362" rx="86" ry="82" ${F}/>
  <ellipse cx="300" cy="362" rx="70" ry="66" fill="#0b0604"/>
  <ellipse cx="176" cy="270" rx="56" ry="12" ${F}/><rect x="172" y="276" width="8" height="180" ${F}/>
  <ellipse cx="424" cy="270" rx="56" ry="12" ${F}/><rect x="420" y="276" width="8" height="180" ${F}/>`;

// Dupla sertaneja: dois vultos de chapéu, um com violão
const poseDupla = `
  <g transform="translate(-70 10)">
    <path d="M262 74 C262 58 338 58 338 74 L332 80 C352 84 356 94 350 98 L250 98 C244 92 250 84 268 80 Z" ${F}/>
    <ellipse cx="300" cy="106" rx="21" ry="19" ${F}/>
    <path d="M300 124 C272 132 264 166 268 208 L264 300 282 302 288 214 312 214 318 302 336 300 332 208 C336 166 328 132 300 124 Z" ${F}/>
    <path d="M272 146 C256 168 250 196 252 226 L266 228 C266 202 272 182 284 166 Z" ${F}/>
    <path d="M328 146 C344 168 350 196 348 226 L334 228 C334 202 328 182 316 166 Z" ${F}/>
    <path d="M282 300 L274 470 296 470 304 310 Z M316 302 L326 470 348 470 338 310 Z" ${F}/>
  </g>
  <g transform="translate(84 34)">
    <path d="M262 74 C262 58 338 58 338 74 L332 80 C352 84 356 94 350 98 L250 98 C244 92 250 84 268 80 Z" ${F}/>
    <ellipse cx="300" cy="106" rx="21" ry="19" ${F}/>
    <path d="M300 124 C272 132 264 166 268 208 L264 296 336 296 332 208 C336 166 328 132 300 124 Z" ${F}/>
    <path d="M270 146 C252 160 244 182 246 208 L282 232 288 220 256 200 C258 180 264 164 280 154 Z" ${F}/>
    <path d="M330 146 C348 158 356 178 354 202 L318 230 310 218 342 196 C342 178 338 162 322 152 Z" ${F}/>
    <g transform="rotate(-30 300 236)">
      <ellipse cx="262" cy="244" rx="46" ry="38" ${F}/>
      <ellipse cx="304" cy="232" rx="32" ry="28" ${F}/>
      <rect x="316" y="220" width="118" height="14" rx="6" ${F}/>
    </g>
    <path d="M280 296 L272 448 294 448 302 306 Z M318 296 L330 448 352 448 342 306 Z" ${F}/>
  </g>`;

// Banda anos 60: quatro vultos alinhados com guitarras
const poseBand60 = `
  <g transform="translate(-160 60) scale(0.82)">
    <ellipse cx="300" cy="100" rx="24" ry="27" ${F}/>
    <path d="M300 124 C270 132 262 168 266 210 L262 300 282 302 288 214 312 214 318 302 338 300 334 210 C338 168 330 132 300 124 Z" ${F}/>
    <path d="M282 300 L274 452 296 452 302 310 Z M318 300 L330 452 352 452 340 310 Z" ${F}/>
    <g transform="rotate(-26 300 224)"><ellipse cx="272" cy="232" rx="40" ry="32" ${F}/><rect x="300" y="216" width="112" height="13" rx="6" ${F}/></g>
  </g>
  <g transform="translate(-10 40) scale(0.9)">
    <ellipse cx="300" cy="100" rx="24" ry="27" ${F}/>
    <path d="M300 124 C270 132 262 168 266 210 L262 300 282 302 288 214 312 214 318 302 338 300 334 210 C338 168 330 132 300 124 Z" ${F}/>
    <path d="M282 300 L274 452 296 452 302 310 Z M318 300 L330 452 352 452 340 310 Z" ${F}/>
    <g transform="rotate(-26 300 224)"><ellipse cx="272" cy="232" rx="40" ry="32" ${F}/><rect x="300" y="216" width="112" height="13" rx="6" ${F}/></g>
  </g>
  <g transform="translate(150 60) scale(0.82)">
    <ellipse cx="300" cy="100" rx="24" ry="27" ${F}/>
    <path d="M300 124 C270 132 262 168 266 210 L262 300 282 302 288 214 312 214 318 302 338 300 334 210 C338 168 330 132 300 124 Z" ${F}/>
    <path d="M282 300 L274 452 296 452 302 310 Z M318 300 L330 452 352 452 340 310 Z" ${F}/>
    <g transform="rotate(24 300 224)"><ellipse cx="330" cy="232" rx="40" ry="32" ${F}/><rect x="188" y="216" width="112" height="13" rx="6" ${F}/></g>
  </g>
  <g transform="translate(298 -14) scale(0.62)">
    <ellipse cx="300" cy="110" rx="26" ry="29" ${F}/>
    <path d="M300 136 C272 144 264 178 268 216 L268 262 332 262 332 216 C336 178 328 144 300 136 Z" ${F}/>
    <ellipse cx="300" cy="330" rx="72" ry="68" ${F}/><ellipse cx="300" cy="330" rx="58" ry="54" fill="#0b0604"/>
  </g>`;

// Cantora com microfone vintage e braço estendido às estrelas
const poseStar = `
  <ellipse cx="300" cy="94" rx="24" ry="28" ${F}/>
  <path d="M300 120 C272 126 258 152 258 186 C258 232 268 282 250 340 L282 344 C296 296 300 250 300 220 C300 250 306 300 322 344 L352 340 C336 284 344 234 344 188 C344 152 328 126 300 120 Z" ${F}/>
  <path d="M270 138 C248 128 232 110 224 88 L240 80 C248 98 260 112 280 122 Z" ${F}/>
  <ellipse cx="216" cy="76" rx="15" ry="18" ${F}/>
  <path d="M330 138 C356 122 376 98 386 68 L370 60 C360 86 344 106 320 122 Z" ${F}/>
  <path d="M266 340 L258 470 280 470 292 352 Z M318 342 L332 470 354 470 342 352 Z" ${F}/>`;

// Guitarrista base (rock clássico) — postura firme, guitarra baixa
const poseRock = `
  <ellipse cx="300" cy="94" rx="26" ry="30" ${F}/>
  <path d="M300 120 C266 128 254 166 258 210 L250 304 268 306 276 216 324 216 332 306 350 304 342 210 C346 166 334 128 300 120 Z" ${F}/>
  <path d="M268 144 C250 162 242 186 242 214 L258 240 268 232 254 210 C256 188 262 170 278 158 Z" ${F}/>
  <path d="M332 144 C350 160 358 184 358 212 L342 242 332 234 346 212 C344 190 338 172 322 158 Z" ${F}/>
  <g transform="rotate(-18 300 260)">
    <ellipse cx="258" cy="272" rx="54" ry="44" ${F}/>
    <ellipse cx="308" cy="258" rx="38" ry="32" ${F}/>
    <rect x="322" y="244" width="150" height="16" rx="7" ${F}/>
    <rect x="468" y="236" width="28" height="32" rx="7" ${F}/>
  </g>
  <path d="M266 302 L252 470 278 470 292 320 Z M334 304 L350 470 324 470 312 322 Z" ${F}/>`;

const SCENES = {
  'roda-de-viola-2026': { pose: poseVioleiro, tint: '#F59E0B' },
  'virtude-zero-2026': { pose: poseDrummer, tint: '#F97316' },
  'the-beagles-2026': { pose: poseBand60, tint: '#F8E7C9' },
  'brega-nas-estrelas-2026': { pose: poseStar, tint: '#F59E0B' },
  'edu-e-nando-2026': { pose: poseDupla, tint: '#F59E0B' },
  'roupa-nova-cover-2026': { pose: poseKeys, tint: '#F97316' },
  'bom-jovi-cover-2026': { pose: poseGuitarHero, tint: '#F97316' },
  'michael-jackson-cover-2026': { pose: poseMJ, tint: '#F8E7C9' },
  'sandro-saga-2026': { pose: poseCrooner, tint: '#F59E0B' },
  'kaique-e-caua-2026': { pose: poseDupla, tint: '#F97316' },
  'som-rock-2026': { pose: poseRock, tint: '#B32616' },
};

// bokeh da plateia (determinístico)
function bokeh(seed) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  let out = '';
  for (let i = 0; i < 42; i++) {
    const x = rnd() * 100, y = 78 + rnd() * 20, r = 2 + rnd() * 7, o = 0.08 + rnd() * 0.3;
    const c = rnd() > 0.5 ? '#F59E0B' : '#F8E7C9';
    out += `<span style="position:absolute;left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${r * 2}px;height:${r * 2}px;border-radius:50%;background:${c};opacity:${o.toFixed(2)};filter:blur(${(2 + r / 2).toFixed(1)}px)"></span>`;
  }
  return out;
}

// cabeças da plateia (primeiro plano, desfocadas)
function crowd() {
  let out = '<svg viewBox="0 0 1600 140" preserveAspectRatio="none" style="position:absolute;bottom:-6px;left:0;width:100%;height:150px;filter:blur(5px)">';
  const xs = [40, 150, 270, 380, 500, 610, 730, 850, 960, 1080, 1200, 1310, 1430, 1540];
  xs.forEach((x, i) => {
    const r = 42 + (i % 3) * 10, y = 120 + (i % 2) * 14;
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#030201"/>`;
    if (i % 4 === 2) out += `<rect x="${x + r - 14}" y="${y - r - 26}" width="12" height="22" rx="3" fill="#030201"/><rect x="${x + r - 16}" y="${y - r - 30}" width="16" height="8" rx="2" fill="#F8E7C9" opacity="0.85"/>`;
  });
  return out + '</svg>';
}

function adHtml({ title, dateLabel, scene, seed, photo }) {
  const titleSize = title.length > 18 ? 96 : title.length > 12 ? 118 : 138;
  const background = photo
    ? `<img src="${photo}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(0.85) contrast(1.05) brightness(0.72)"/>
       <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(9,7,6,0.55) 0%, rgba(9,7,6,0.15) 38%, rgba(9,7,6,0.82) 78%, #090706 100%)"></div>
       <div style="position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 108%, rgba(179,38,22,0.4), transparent 60%);mix-blend-mode:screen"></div>`
    : `
      <div style="position:absolute;inset:0;background:
        radial-gradient(90% 70% at 50% 112%, rgba(179,38,22,0.55), transparent 62%),
        radial-gradient(60% 45% at 50% 30%, rgba(245,158,11,0.16), transparent 70%),
        linear-gradient(180deg, #17100a 0%, #0d0805 55%, #090706 100%)"></div>
      <div class="beam" style="left:14%;transform:rotate(16deg)"></div>
      <div class="beam" style="left:44%;transform:rotate(0deg);opacity:.5"></div>
      <div class="beam" style="left:72%;transform:rotate(-16deg)"></div>
      <div style="position:absolute;left:50%;top:56%;transform:translate(-50%,-50%);width:900px;height:520px;border-radius:50%;background:radial-gradient(closest-side, rgba(245,158,11,0.35), transparent 72%);filter:blur(30px)"></div>
      <div style="position:absolute;left:50%;top:20%;transform:translateX(-50%);width:1200px;height:300px;border-radius:50%;background:radial-gradient(closest-side, rgba(248,231,201,0.10), transparent 70%);filter:blur(40px)"></div>
      <div class="figure">
        <svg viewBox="0 0 600 520" style="width:100%;height:100%;overflow:visible">${scene.pose}</svg>
      </div>
      <div style="position:absolute;left:50%;top:74%;transform:translateX(-50%);width:760px;height:120px;border-radius:50%;background:radial-gradient(closest-side, ${scene.tint}44, transparent 70%);filter:blur(18px)"></div>
      ${bokeh(seed)}
      ${crowd()}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,600;0,800;0,900;1,900&display=swap');
    * { margin:0; box-sizing:border-box; }
    body { width:${W}px; height:${H}px; overflow:hidden; background:#090706; font-family:'Montserrat',Arial,sans-serif; }
    .stage { position:relative; width:100%; height:100%; }
    .beam {
      position:absolute; top:-140px; width:340px; height:860px;
      background:linear-gradient(180deg, rgba(248,231,201,0.34), rgba(248,231,201,0.05) 70%, transparent);
      clip-path:polygon(42% 0, 58% 0, 100% 100%, 0 100%);
      filter:blur(26px); transform-origin:top center;
    }
    .figure {
      position:absolute; left:50%; top:52%; transform:translate(-50%,-50%);
      width:620px; height:540px;
      filter: drop-shadow(0 0 26px rgba(245,158,11,0.5)) drop-shadow(0 0 60px rgba(179,38,22,0.45)) blur(0.6px);
    }
    .grain { position:absolute; inset:0; opacity:.07; mix-blend-mode:overlay;
      background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='0.9'/></svg>"); }
    .vignette { position:absolute; inset:0; background:radial-gradient(120% 105% at 50% 45%, transparent 55%, rgba(3,2,1,0.85) 100%); }
    .type { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; }
    .kicker { margin-top:56px; color:#F59E0B; font-weight:800; font-size:24px; letter-spacing:0.55em; text-indent:0.55em; text-shadow:0 2px 18px rgba(0,0,0,0.8); }
    .title {
      position:absolute; bottom:200px; width:100%; text-align:center; padding:0 60px;
      font-weight:900; font-style:italic; font-size:${titleSize}px; line-height:0.95; text-transform:uppercase;
      background:linear-gradient(180deg, #F8E7C9 30%, #F59E0B 100%); -webkit-background-clip:text; background-clip:text; color:transparent;
      filter:drop-shadow(0 6px 26px rgba(0,0,0,0.9));
    }
    .date { position:absolute; bottom:142px; width:100%; text-align:center; color:rgba(248,231,201,0.92);
      font-weight:800; font-size:30px; letter-spacing:0.32em; text-indent:0.32em; text-shadow:0 2px 14px rgba(0,0,0,0.9); }
    .cta { position:absolute; bottom:56px; left:50%; transform:translateX(-50%);
      background:linear-gradient(90deg, #B32616, #F97316); color:#F8E7C9;
      font-weight:900; font-size:26px; letter-spacing:0.28em; text-indent:0.28em;
      padding:20px 52px; border-radius:999px; box-shadow:0 0 44px rgba(249,115,22,0.55); }
    .brand { position:absolute; left:52px; bottom:52px; color:rgba(248,231,201,0.75); font-weight:800; font-size:19px; letter-spacing:0.4em; }
    .brand small { display:block; color:rgba(245,158,11,0.7); font-size:10.5px; letter-spacing:0.42em; margin-top:8px; font-weight:600; }
    .live { position:absolute; right:52px; bottom:52px; display:flex; align-items:center; gap:12px;
      color:rgba(248,231,201,0.85); font-weight:800; font-size:17px; letter-spacing:0.34em; }
    .dot { width:12px; height:12px; border-radius:50%; background:#B32616; box-shadow:0 0 16px #B32616; }
    .frame { position:absolute; inset:22px; border:1.5px solid rgba(248,231,201,0.16); border-radius:20px; }
  </style></head>
  <body><div class="stage">
    ${background}
    <div class="grain"></div>
    <div class="vignette"></div>
    <div class="type">
      <div class="kicker">O CASARÃO APRESENTA</div>
      <div class="title">${title}</div>
      <div class="date">${dateLabel}</div>
      <div class="cta">RESERVE SUA MESA</div>
    </div>
    <div class="brand">O CASARÃO<small>EVENTOS &amp; GASTRONOMIA</small></div>
    <div class="live"><span class="dot"></span>AO VIVO</div>
    <div class="frame"></div>
  </div></body></html>`;
}

function findPhoto(slug) {
  if (!fs.existsSync(FOTOS_DIR)) return null;
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const p = path.join(FOTOS_DIR, `${slug}.${ext}`);
    if (fs.existsSync(p)) return 'file:///' + p.split(path.sep).join('/');
  }
  return null;
}

const events = await fetchEvents(loadEnv());
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

let seed = 13;
for (const ev of events) {
  const scene = SCENES[ev.slug];
  const photo = findPhoto(ev.slug);
  if (!scene && !photo) { console.log('sem cena/foto para', ev.slug, '— pulado'); continue; }
  const html = adHtml({
    title: ev.title,
    dateLabel: formatDate(ev.event_date),
    scene: scene ?? { pose: '', tint: '#F59E0B' },
    seed: (seed += 29),
    photo,
  });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  const out = path.join(OUT_DIR, `${ev.slug}.jpg`);
  await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
  console.log('anúncio:', path.relative(process.cwd(), out), photo ? '(foto oficial)' : '(cena silhueta)');
}

await browser.close();
console.log('\nConcluído. Fotos oficiais de divulgação: public/eventos/fotos/<slug>.jpg → regenerar.');
