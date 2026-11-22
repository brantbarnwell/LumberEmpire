// The big tree you chop, drawn with layered pine tiers, bark and a cut that grows with every chop.
import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

export const TREE_W = 260;
export const TREE_H = 300;

/** One pine tier: pointy top, scalloped bottom. */
function tier(cx: number, top: number, base: number, half: number) {
  const n = 5;
  const step = (half * 2) / n;
  let d = `M${cx} ${top} C${cx + half * 0.25} ${top + (base - top) * 0.35} ${cx + half * 0.7} ${base - 18} ${cx + half} ${base - 4} `;
  for (let i = 0; i < n; i++) {
    const x1 = cx + half - step * i;
    const x2 = x1 - step;
    d += `Q${(x1 + x2) / 2} ${base + 10} ${x2} ${base - 4} `;
  }
  d += `C${cx - half * 0.7} ${base - 18} ${cx - half * 0.25} ${top + (base - top) * 0.35} ${cx} ${top} Z`;
  return d;
}

type Pal = { dark: string; mid: string; light: string; tips: string; trunk: [string, string, string]; balls?: string; snow?: boolean };
const BARK: [string, string, string] = ['#5a3519', '#8a5a2e', '#4a2e17'];
// Update 3: tree skins (looks only)
export const TREE_SKINS: Record<string, Pal> = {
  'tree-pine': { dark: '#1d5430', mid: '#2f7040', light: '#4f9a4f', tips: '#79c06a', trunk: BARK, balls: '#d1243c' },
  'tree-redwood': { dark: '#173f26', mid: '#235c36', light: '#357a45', tips: '#5ea865', trunk: ['#7a2e18', '#b5523a', '#5e2212'] },
  'tree-golden': { dark: '#b7801a', mid: '#e2a92a', light: '#ffd75e', tips: '#fff1a8', trunk: ['#7a4f12', '#b8862e', '#6e4510'] },
  'tree-snowy': { dark: '#1d5430', mid: '#2f7040', light: '#4f9a4f', tips: '#ffffff', trunk: BARK, snow: true },
  'tree-autumn': { dark: '#9a3d12', mid: '#d1621f', light: '#f0a03a', tips: '#ffd07a', trunk: BARK },
  'tree-cherry': { dark: '#b5507a', mid: '#e47ea6', light: '#f6b6cf', tips: '#ffe1ee', trunk: ['#4a2e2a', '#7a4a40', '#3a221e'] },
};

export function TreeArt({ golden, cut, skin = 'tree-pine' }: { golden?: boolean; cut: number /* 0..1 */; skin?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const P = golden ? TREE_SKINS['tree-golden'] : TREE_SKINS[skin] ?? TREE_SKINS['tree-pine'];
  const { dark, mid, light, tips } = P;
  const tiers = [
    { top: 118, base: 236, half: 118 },
    { top: 66, base: 178, half: 96 },
    { top: 22, base: 122, half: 74 },
    { top: 0, base: 70, half: 46 },
  ];
  const notch = 6 + cut * 26;
  return (
    <Svg width={TREE_W} height={TREE_H} viewBox={`0 0 ${TREE_W} ${TREE_H}`}>
      <Defs>
        <LinearGradient id={`t${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={P.trunk[0]} />
          <Stop offset="0.45" stopColor={P.trunk[1]} />
          <Stop offset="1" stopColor={P.trunk[2]} />
        </LinearGradient>
        <LinearGradient id={`f${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={mid} />
        </LinearGradient>
      </Defs>
      {/* trunk with roots */}
      <Path d="M108 300 Q114 270 112 222 L148 222 Q146 270 152 300 Q140 292 130 298 Q120 292 108 300 Z" fill={`url(#t${id})`} stroke="#3a2210" strokeWidth="2" />
      <Path d="M100 300 Q108 292 114 284 L112 300 Z M160 300 Q152 292 146 284 L148 300 Z" fill={golden ? '#8a5f1c' : '#5a3519'} />
      <Path d="M122 232 Q120 256 123 284 M136 236 Q138 260 135 290" stroke="#3a2210" strokeOpacity="0.55" strokeWidth="2" fill="none" />
      {/* the cut from your axe: pale wood with rings */}
      <Path d={`M150 ${252 - notch / 2} L${150 - notch} 256 L150 ${260 + notch / 2} Z`} fill="#f1d49c" stroke="#b98a5a" strokeWidth="1.2" />
      {cut > 0.4 && <Path d={`M150 ${254 - notch / 4} L${150 - notch * 0.6} 256 L150 ${258 + notch / 4}`} stroke="#d9b27a" strokeWidth="1" fill="none" />}
      {/* tiers, back to front */}
      {tiers.map((t, i) => (
        <G key={i}>
          <Path d={tier(130, t.top + 6, t.base + 6, t.half)} fill={dark} opacity="0.55" />
          <Path d={tier(130, t.top, t.base, t.half)} fill={`url(#f${id})`} stroke={dark} strokeWidth="2" />
          {/* shadow on the right half */}
          <Path d={`M130 ${t.top + 4} C${130 + t.half * 0.3} ${t.top + (t.base - t.top) * 0.4} ${130 + t.half * 0.75} ${t.base - 16} ${130 + t.half - 4} ${t.base - 6} L130 ${t.base} Z`} fill={dark} opacity="0.22" />
          {/* needle highlights */}
          <Path d={`M${130 - t.half * 0.45} ${t.base - 14} q8 -10 16 -14 M${130 - t.half * 0.1} ${t.base - 22} q6 -8 12 -10 M${130 + t.half * 0.35} ${t.base - 12} q6 -8 12 -10`} stroke={tips} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {P.snow && !golden && (
            <Path d={`M130 ${t.top + 2} C${130 + t.half * 0.2} ${t.top + 16} ${130 + t.half * 0.35} ${t.top + 26} ${130 + t.half * 0.42} ${t.top + 34} q-${t.half * 0.2} 8 -${t.half * 0.4} 0 q-${t.half * 0.22} 10 -${t.half * 0.44} 0 C${130 - t.half * 0.35} ${t.top + 26} ${130 - t.half * 0.2} ${t.top + 16} 130 ${t.top + 2} Z`} fill="#ffffff" stroke={dark} strokeWidth="1.5" />
          )}
        </G>
      ))}
      {golden && (
        <G>
          {[[90, 90], [170, 140], [110, 200], [150, 40], [70, 190]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={i % 2 ? 3 : 4.5} fill="#fffbe6" />
          ))}
        </G>
      )}
      {!golden && P.balls && (
        <G>
          <Circle cx="96" cy="150" r="4" fill="#d1243c" />
          <Circle cx="168" cy="196" r="4" fill="#d1243c" />
          <Circle cx="116" cy="86" r="3.5" fill="#d1243c" />
          <Ellipse cx="95" cy="148.6" rx="1.3" ry="1" fill="#fff" opacity="0.7" />
        </G>
      )}
    </Svg>
  );
}

/** A stump left behind for a moment after the tree falls. */
export function StumpArt() {
  return (
    <Svg width={TREE_W} height={TREE_H} viewBox={`0 0 ${TREE_W} ${TREE_H}`}>
      <Path d="M108 300 Q114 282 112 262 L148 262 Q146 282 152 300 Q140 292 130 298 Q120 292 108 300 Z" fill="#7a4f2a" stroke="#3a2210" strokeWidth="2" />
      <Ellipse cx="130" cy="262" rx="18" ry="6" fill="#f1d49c" stroke="#b98a5a" strokeWidth="1.5" />
      <Ellipse cx="130" cy="262" rx="10" ry="3" fill="none" stroke="#d9b27a" strokeWidth="1" />
    </Svg>
  );
}
