/* Animated tab characters (styles in mascots.css). Each returns an SVG string. */
window.MBM = (() => {
  const INK = '#17192B';
  const svg = (s, label, body) => `<svg class="mascot anim" width="${s}" height="${s}" viewBox="0 0 100 100" role="img" aria-label="${label}">${body}</svg>`;
  const font = 'font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800"';
  return {
    bills: (s = 72) => svg(s, 'Bill getting a due stamp', `
      <g class="bill-paper">
        <path d="M20 6h42l16 16v68a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M62 6v16h16" fill="#E1E4EE" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
        <text x="22" y="27" ${font} font-size="15" fill="${INK}">BILL</text>
        <path d="M22 36h40M22 44h28" stroke="#C9CCDB" stroke-width="4" stroke-linecap="round"/>
        <text x="22" y="86" ${font} font-size="17" fill="#E5541A">$120</text>
      </g>
      <g class="bill-stamp">
        <rect x="34" y="48" width="52" height="24" rx="6" fill="#fff" fill-opacity=".85" stroke="#D7373D" stroke-width="4"/>
        <text x="60" y="66" text-anchor="middle" ${font} font-size="17" fill="#D7373D">DUE</text>
      </g>`),
    savings: (s = 72) => svg(s, 'Coin dropping into a piggy bank', `
      <g class="coin c1"><circle cx="46" cy="18" r="9" fill="#FFC93C" stroke="${INK}" stroke-width="3"/><text x="46" y="23" text-anchor="middle" ${font} font-size="12" fill="${INK}">$</text></g>
      <text class="plus" x="70" y="24" ${font} font-size="16" fill="#0B6B5C">+$</text>
      <g class="pig">
        <path d="M14 58c-9-1-9-10-3-10 4 0 3 6-3 5" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <rect x="26" y="74" width="11" height="14" rx="4" fill="#F27A9B" stroke="${INK}" stroke-width="3"/>
        <rect x="58" y="74" width="11" height="14" rx="4" fill="#F27A9B" stroke="${INK}" stroke-width="3"/>
        <path d="M60 40l7-13 9 13z" fill="#F27A9B" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <ellipse cx="48" cy="60" rx="34" ry="24" fill="#FFA3BC" stroke="${INK}" stroke-width="3.5"/>
        <rect x="37" y="37" width="18" height="5" rx="2.5" fill="${INK}"/>
        <ellipse cx="82" cy="61" rx="8" ry="9" fill="#F27A9B" stroke="${INK}" stroke-width="3"/>
        <circle cx="80" cy="59" r="1.8" fill="${INK}"/><circle cx="85" cy="63" r="1.8" fill="${INK}"/>
        <circle cx="69" cy="52" r="3.5" fill="${INK}"/>
        <path d="M30 56q4-4 8 0" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>
      </g>`),
    debit: (s = 72) => svg(s, 'Red debit card making a tap payment', `
      <text class="minus" x="10" y="22" ${font} font-size="17" fill="#D7373D">−$25</text>
      <g class="card">
        <rect x="6" y="34" width="64" height="44" rx="8" fill="#D7373D" stroke="${INK}" stroke-width="3.5"/>
        <rect x="14" y="44" width="14" height="10" rx="2.5" fill="#FFC93C"/>
        <path d="M54 44q3 5 0 10M59 41q5 8 0 16" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <text x="14" y="71" ${font} font-size="12" fill="#fff" letter-spacing=".5">DEBIT</text>
      </g>
      <path class="wave w1" d="M77 46q7 10 0 20" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path class="wave w2" d="M83 40q12 16 0 32" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path class="wave w3" d="M89 34q17 22 0 44" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`),
    summary: (s = 72) => svg(s, 'Week by week bars growing', `
      <rect x="9" y="14" width="82" height="80" rx="14" fill="#FFC93C" stroke="${INK}" stroke-width="3.5"/>
      <path d="M30 8v12M70 8v12" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>
      <text x="50" y="36" text-anchor="middle" ${font} font-size="12" fill="${INK}" letter-spacing=".5">MONTH</text>
      <rect class="bar b1" x="18" y="66" width="13" height="18" rx="3" fill="#F2662B"/>
      <rect class="bar b2" x="35" y="56" width="13" height="28" rx="3" fill="#0E8C7A"/>
      <rect class="bar b3" x="52" y="62" width="13" height="22" rx="3" fill="#D7373D"/>
      <rect class="bar b4" x="69" y="48" width="13" height="36" rx="3" fill="${INK}"/>
      <polyline class="trend" points="24,58 41,48 58,54 76,40" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
  };
})();
