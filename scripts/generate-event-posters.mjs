// =============================================
// Gerador de pôsteres dos eventos — Central Casarão 360
// Série vetorial da casa (§4): noturno, brasa, âmbar, madeira; SEM fotos de
// artistas reais (eventos cover — likeness/direitos) e SEM "cara de IA".
// Um motivo temático por evento sobre um sistema visual compartilhado.
// Saída: public/eventos/<slug>.svg (800×500, aspecto 16:10)
// Uso: node scripts/generate-event-posters.mjs
// =============================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'eventos');

const W = 800, H = 500;

// Partículas de brasa determinísticas (sem aleatoriedade → build reproduzível)
function embers(seed = 1, count = 26) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = 40 + rnd() * (W - 80);
    const y = 120 + rnd() * (H - 180);
    const r = 0.8 + rnd() * 2.2;
    const o = 0.12 + rnd() * 0.45;
    const c = rnd() > 0.6 ? '#F59E0B' : '#F97316';
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" opacity="${o.toFixed(2)}"/>`;
  }
  return out;
}

function shell({ motif, ghost = '', seed = 1, accents = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#150c07"/>
      <stop offset="0.55" stop-color="#0d0805"/>
      <stop offset="1" stop-color="#090706"/>
    </linearGradient>
    <radialGradient id="ember" cx="0.5" cy="1.05" r="0.9">
      <stop offset="0" stop-color="#B32616" stop-opacity="0.5"/>
      <stop offset="0.45" stop-color="#B32616" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#B32616" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="amberHalo" cx="0.62" cy="0.42" r="0.55">
      <stop offset="0" stop-color="#F59E0B" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F8E7C9" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#F8E7C9" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4A2414" stop-opacity="0"/>
      <stop offset="1" stop-color="#4A2414" stop-opacity="0.55"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.97 0 0 0 0 0.9 0 0 0 0 0.78 0 0 0 0.05 0"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#ember)"/>
  <rect width="${W}" height="${H}" fill="url(#amberHalo)"/>

  <!-- Luzes de palco -->
  <polygon points="150,-10 90,300 330,300" fill="url(#beam)"/>
  <polygon points="620,-10 470,320 760,320" fill="url(#beam)"/>

  <!-- Motivo fantasma (textura de fundo) -->
  <g opacity="0.06" transform="translate(400 250) scale(2.6) translate(-400 -250)" stroke="#F8E7C9" fill="none">
    ${ghost || motif}
  </g>

  ${accents}

  <!-- Motivo principal -->
  <g filter="url(#glow)">
    ${motif}
  </g>

  ${embers(seed)}

  <rect width="${W}" height="${H}" fill="url(#floor)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)"/>

  <!-- Moldura e assinatura da casa -->
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="14" fill="none" stroke="#F8E7C9" stroke-opacity="0.14" stroke-width="1.5"/>
  <g font-family="Montserrat, Arial, sans-serif">
    <text x="40" y="${H - 52}" fill="#F8E7C9" fill-opacity="0.85" font-size="19" font-weight="700" letter-spacing="6">O CASARÃO</text>
    <text x="40" y="${H - 32}" fill="#F59E0B" fill-opacity="0.7" font-size="10.5" font-weight="600" letter-spacing="4.2">EXPERIÊNCIAS AO VIVO</text>
  </g>
</svg>`;
}

// Traço padrão dos motivos
const S = 'stroke="#F8E7C9" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"';
const SA = 'stroke="#F59E0B" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"';
// Variante SEM stroke-width (para elementos com espessura própria — nunca
// duplicar o atributo: XML com atributo repetido não parseia)
const ST = 'stroke="#F8E7C9" stroke-linecap="round" stroke-linejoin="round" fill="none"';

// ---------- Motivos por evento ----------

// Viola caipira em roda de amigos: viola + círculo pontilhado + lua
const rodaDeViola = `
  <circle cx="500" cy="235" r="150" ${S} stroke-opacity="0.35" stroke-dasharray="4 22"/>
  <path d="M470 300 q-52 8 -58 -34 q-4 -28 22 -38 q-14 -12 -6 -30 q8 -18 30 -16 l10 2 L520 120" ${S}/>
  <path d="M520 120 l14 -24 q4 -7 12 -3 l16 10 q7 5 2 12 l-15 23" ${S}/>
  <circle cx="462" cy="252" r="14" ${SA}/>
  <line x1="452" y1="286" x2="524" y2="140" stroke="#F59E0B" stroke-width="2" stroke-opacity="0.9"/>
  <line x1="466" y1="292" x2="536" y2="148" stroke="#F59E0B" stroke-width="2" stroke-opacity="0.9"/>
  <path d="M612 128 a34 34 0 1 0 20 60 a28 28 0 1 1 -20 -60" fill="#F8E7C9" fill-opacity="0.8" stroke="none"/>`;

// Energia rock: baquetas cruzadas + raio
const virtudeZero = `
  <path d="M560 128 l-36 96 26 -6 -44 110 74 -128 -26 6 40 -82 z" fill="#F59E0B" fill-opacity="0.95" stroke="none"/>
  <g ${S}>
    <line x1="440" y1="330" x2="596" y2="188"/>
    <line x1="620" y1="322" x2="470" y2="176"/>
  </g>
  <circle cx="602" cy="182" r="9" fill="#F8E7C9" stroke="none"/>
  <circle cx="464" cy="170" r="9" fill="#F8E7C9" stroke="none"/>`;

// Anos 60: vinil girando + faixa de pedestres
const theBeagles = `
  <circle cx="530" cy="215" r="96" ${S}/>
  <circle cx="530" cy="215" r="70" ${ST} stroke-opacity="0.5" stroke-width="2.5"/>
  <circle cx="530" cy="215" r="52" ${ST} stroke-opacity="0.5" stroke-width="2.5"/>
  <circle cx="530" cy="215" r="30" stroke="#F59E0B" stroke-width="6" fill="#B32616" fill-opacity="0.65"/>
  <circle cx="530" cy="215" r="5" fill="#F8E7C9"/>
  <g stroke="#F8E7C9" stroke-opacity="0.85" stroke-width="12" stroke-linecap="round">
    <line x1="360" y1="368" x2="420" y2="352"/>
    <line x1="450" y1="360" x2="510" y2="348"/>
    <line x1="540" y1="356" x2="600" y2="346"/>
    <line x1="630" y1="352" x2="690" y2="344"/>
  </g>`;

// Brega sob as estrelas: microfone retrô + estrelas
const star = (x, y, s, o = 1) =>
  `<path d="M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z" fill="#F59E0B" fill-opacity="${o}" stroke="none"/>`;
const bregaNasEstrelas = `
  <rect x="486" y="128" width="88" height="118" rx="44" ${S}/>
  <g stroke="#F8E7C9" stroke-width="3" stroke-opacity="0.7">
    <line x1="500" y1="156" x2="560" y2="156"/>
    <line x1="496" y1="176" x2="564" y2="176"/>
    <line x1="496" y1="196" x2="564" y2="196"/>
    <line x1="500" y1="216" x2="560" y2="216"/>
  </g>
  <path d="M530 246 l0 52 m-36 0 l72 0" ${S}/>
  ${star(646, 130, 22)} ${star(432, 110, 12, 0.8)} ${star(688, 210, 10, 0.7)} ${star(414, 208, 8, 0.6)}`;

// Dupla sertaneja: dois chapéus + palheta
const hat = (x, y, sc) => `
  <g transform="translate(${x} ${y}) scale(${sc})">
    <ellipse cx="0" cy="26" rx="62" ry="16" ${S}/>
    <path d="M-34 22 q-4 -44 34 -44 q38 0 34 44" ${S}/>
    <path d="M-34 12 q34 14 68 0" stroke="#F59E0B" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>`;
const eduENando = `
  ${hat(462, 170, 1)}
  ${hat(600, 230, 1.12)}
  <path d="M512 322 q18 -26 44 -10 q26 16 10 40 q-14 20 -36 8 q-24 -14 -18 -38 z" ${SA}/>`;

// Anos 80: teclado + triângulo neon + grid
const roupaNova = `
  <g stroke="#F8E7C9" stroke-opacity="0.35" stroke-width="2">
    <line x1="360" y1="330" x2="740" y2="330"/>
    <line x1="380" y1="352" x2="720" y2="352"/>
    <line x1="410" y1="374" x2="690" y2="374"/>
  </g>
  <path d="M540 128 l112 194 l-224 0 z" ${SA}/>
  <g transform="translate(440 236)">
    <rect x="0" y="0" width="200" height="64" rx="8" ${S}/>
    <g stroke="#F8E7C9" stroke-width="4">
      <line x1="25" y1="0" x2="25" y2="64"/><line x1="50" y1="0" x2="50" y2="64"/>
      <line x1="75" y1="0" x2="75" y2="64"/><line x1="100" y1="0" x2="100" y2="64"/>
      <line x1="125" y1="0" x2="125" y2="64"/><line x1="150" y1="0" x2="150" y2="64"/>
      <line x1="175" y1="0" x2="175" y2="64"/>
    </g>
    <g fill="#F8E7C9">
      <rect x="17" y="0" width="16" height="36"/><rect x="42" y="0" width="16" height="36"/>
      <rect x="92" y="0" width="16" height="36"/><rect x="117" y="0" width="16" height="36"/>
      <rect x="142" y="0" width="16" height="36"/>
    </g>
  </g>`;

// Arena rock: microfone alado clássico + raio
const bomJovi = `
  <path d="M478 208 q-64 -6 -108 -48 q56 6 92 28 M478 232 q-58 4 -96 34 q46 2 88 -14" ${S} stroke-opacity="0.85"/>
  <path d="M602 208 q64 -6 108 -48 q-56 6 -92 28 M602 232 q58 4 96 34 q-46 2 -88 -14" ${S} stroke-opacity="0.85"/>
  <circle cx="540" cy="210" r="52" ${S}/>
  <g ${ST} stroke-width="3" stroke-opacity="0.75">
    <line x1="504" y1="192" x2="576" y2="192"/>
    <line x1="496" y1="210" x2="584" y2="210"/>
    <line x1="504" y1="228" x2="576" y2="228"/>
  </g>
  <path d="M540 262 l0 44" ${S}/>
  <path d="M556 306 l-24 52 20 -5 -34 74 58 -96 -20 5 30 -58 z" fill="#F59E0B" fill-opacity="0.95" stroke="none"/>`;

// Rei do pop (cover): chapéu fedora + luva brilhante + piso
const michaelJackson = `
  <g stroke="#F8E7C9" stroke-opacity="0.3" stroke-width="2">
    <line x1="380" y1="344" x2="720" y2="344"/>
    <line x1="400" y1="368" x2="700" y2="368"/>
    <line x1="470" y1="344" x2="460" y2="392"/><line x1="560" y1="344" x2="560" y2="392"/><line x1="650" y1="344" x2="662" y2="392"/>
  </g>
  <g transform="translate(540 168)">
    <ellipse cx="0" cy="30" rx="86" ry="18" ${S}/>
    <path d="M-46 24 q-6 -58 46 -58 q52 0 46 58" ${S}/>
    <path d="M-46 12 q46 18 92 0" stroke="#F59E0B" stroke-width="6" fill="none" stroke-linecap="round"/>
  </g>
  <path d="M448 300 q-2 -26 22 -28 l6 -22 q2 -8 10 -6 q8 2 6 10 l-4 20 8 2 6 -24 q2 -8 10 -6 q8 2 6 10 l-6 24 10 4 q22 10 12 34 l-8 18 -74 -18 z" fill="#F8E7C9" fill-opacity="0.9" stroke="none"/>
  ${star(430, 262, 10)} ${star(548, 318, 8, 0.8)} ${star(474, 246, 6, 0.7)}`;

// Voz e palco: microfone com pedestal sob spot
const sandroSaga = `
  <ellipse cx="540" cy="330" rx="150" ry="26" fill="#F8E7C9" fill-opacity="0.06" stroke="none"/>
  <circle cx="540" cy="140" r="34" ${S}/>
  <g stroke="#F8E7C9" stroke-width="2.5" stroke-opacity="0.7">
    <line x1="516" y1="128" x2="564" y2="128"/><line x1="510" y1="140" x2="570" y2="140"/><line x1="516" y1="152" x2="564" y2="152"/>
  </g>
  <path d="M540 174 l0 132 m-42 24 q42 -26 84 0" ${S}/>
  <path d="M506 152 l-56 40" ${SA}/>`;

// Dupla jovem: dois chapéus + ferradura da sorte
const kaiqueECaua = `
  ${hat(470, 160, 0.95)}
  ${hat(610, 214, 1.08)}
  <path d="M500 330 a46 46 0 1 1 92 0 l-12 0 a34 34 0 1 0 -68 0 z" fill="#F59E0B" fill-opacity="0.9" stroke="none"/>
  <circle cx="506" cy="336" r="4" fill="#F8E7C9"/><circle cx="586" cy="336" r="4" fill="#F8E7C9"/>`;

// Rock clássico: amplificador + chama
const somRock = `
  <g transform="translate(440 170)">
    <rect x="0" y="0" width="220" height="150" rx="12" ${S}/>
    <rect x="16" y="52" width="188" height="84" rx="8" ${ST} stroke-width="3.5" stroke-opacity="0.7"/>
    <g stroke="#F8E7C9" stroke-width="2.5" stroke-opacity="0.5">
      <line x1="36" y1="52" x2="36" y2="136"/><line x1="66" y1="52" x2="66" y2="136"/>
      <line x1="96" y1="52" x2="96" y2="136"/><line x1="126" y1="52" x2="126" y2="136"/>
      <line x1="156" y1="52" x2="156" y2="136"/><line x1="186" y1="52" x2="186" y2="136"/>
    </g>
    <circle cx="40" cy="28" r="8" ${SA}/><circle cx="70" cy="28" r="8" ${SA}/>
    <circle cx="100" cy="28" r="8" ${SA}/><circle cx="130" cy="28" r="8" ${SA}/>
  </g>
  <path d="M680 168 q22 -34 8 -62 q34 22 30 62 q-2 26 -26 38 q10 -20 -12 -38 z" fill="#F97316" stroke="none"/>`;

// Placeholder: fachada do Casarão sob luzes
const placeholder = `
  <g transform="translate(540 200)">
    <path d="M-120 40 L0 -60 L120 40" ${S}/>
    <rect x="-100" y="40" width="200" height="120" ${S}/>
    <rect x="-24" y="96" width="48" height="64" ${SA}/>
    <rect x="-78" y="64" width="32" height="40" ${ST} stroke-width="4"/>
    <rect x="46" y="64" width="32" height="40" ${ST} stroke-width="4"/>
    <circle cx="0" cy="6" r="12" ${SA}/>
  </g>`;

const POSTERS = {
  'roda-de-viola-2026': { motif: rodaDeViola, seed: 11 },
  'virtude-zero-2026': { motif: virtudeZero, seed: 23 },
  'the-beagles-2026': { motif: theBeagles, seed: 37 },
  'brega-nas-estrelas-2026': { motif: bregaNasEstrelas, seed: 41 },
  'edu-e-nando-2026': { motif: eduENando, seed: 53 },
  'roupa-nova-cover-2026': { motif: roupaNova, seed: 67 },
  'bom-jovi-cover-2026': { motif: bomJovi, seed: 71 },
  'michael-jackson-cover-2026': { motif: michaelJackson, seed: 83 },
  'sandro-saga-2026': { motif: sandroSaga, seed: 89 },
  'kaique-e-caua-2026': { motif: kaiqueECaua, seed: 97 },
  'som-rock-2026': { motif: somRock, seed: 101 },
  'placeholder': { motif: placeholder, seed: 7 },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [slug, cfg] of Object.entries(POSTERS)) {
  const file = path.join(OUT_DIR, `${slug}.svg`);
  fs.writeFileSync(file, shell(cfg), 'utf8');
  console.log('gerado:', path.relative(process.cwd(), file));
}
console.log(`\n${Object.keys(POSTERS).length} pôsteres gerados em public/eventos/`);
