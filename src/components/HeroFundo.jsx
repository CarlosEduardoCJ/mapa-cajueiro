// Desenho de fundo do topo da página inicial (pôr do sol e coqueiros), copiado do protótipo aprovado.
// Depois, quando houver banners cadastrados no painel, a foto do banner entra no lugar.
export default function HeroFundo() {
  return (
    <svg viewBox="0 0 1600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="hero-fundo">
      <defs>
        <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9682A" />
          <stop offset=".45" stopColor="#F59A3A" />
          <stop offset=".72" stopColor="#FFC765" />
          <stop offset="1" stopColor="#FFE3A0" />
        </linearGradient>
        <radialGradient id="brilho" cx=".2" cy=".52" r=".45">
          <stop offset="0" stopColor="#FFF6D6" stopOpacity=".95" />
          <stop offset=".25" stopColor="#FFE08A" stopOpacity=".6" />
          <stop offset="1" stopColor="#FFE08A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6B5A6E" />
          <stop offset=".3" stopColor="#2F3D5C" />
          <stop offset="1" stopColor="#121D36" />
        </linearGradient>
        <g id="coqueiro">
          <path d="M0 0 C 6 -60, -4 -120, 14 -190" fill="none" stroke="#2A170F" strokeWidth="9" strokeLinecap="round" />
          <path
            d="M14 -190 C -20 -205, -50 -190, -70 -160 M14 -190 C 50 -210, 85 -195, 105 -165 M14 -190 C -5 -225, -35 -235, -60 -232 M14 -190 C 35 -230, 65 -240, 90 -236 M14 -190 C 0 -160, -15 -140, -28 -118 M14 -190 C 35 -165, 50 -145, 58 -122"
            fill="none"
            stroke="#2A170F"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </g>
      </defs>
      <rect width="1600" height="800" fill="url(#ceu)" />
      <rect width="1600" height="800" fill="url(#brilho)" />
      <circle cx="250" cy="330" r="90" fill="#FFF3C8" />
      <rect y="548" width="1600" height="252" fill="url(#mar)" />
      <g fill="#FFD27A" opacity=".75">
        <rect x="200" y="700" width="120" height="4" rx="2" />
        <rect x="230" y="714" width="170" height="4" rx="2" />
        <rect x="190" y="728" width="200" height="5" rx="2.5" />
        <rect x="250" y="744" width="140" height="5" rx="2.5" />
      </g>
      <path d="M0 520 C 120 505, 260 515, 420 528 C 560 538, 760 532, 980 540 L 1600 552 L 1600 560 L 0 560 Z" fill="#2A170F" />
      <use href="#coqueiro" transform="translate(40 540) scale(1.1)" />
      <use href="#coqueiro" transform="translate(120 545) scale(.85) rotate(-6)" />
      <use href="#coqueiro" transform="translate(470 538) scale(.95) rotate(5)" />
      <use href="#coqueiro" transform="translate(560 540) scale(.7) rotate(-4)" />
      <use href="#coqueiro" transform="translate(760 542) scale(1.05) rotate(3)" />
      <use href="#coqueiro" transform="translate(860 545) scale(.75) rotate(-8)" />
      <use href="#coqueiro" transform="translate(940 546) scale(.9)" />
    </svg>
  );
}
