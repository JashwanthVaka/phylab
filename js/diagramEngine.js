import { escapeHTML, slugify } from './utils.js';

/**
 * One diagram per lesson, drawn for that lesson's physics.
 *
 * This used to hold five diagrams matched by loose keywords, with a generic
 * vector sketch as the fallback. Twelve of the twenty-six lessons therefore
 * showed a picture with nothing to do with their content -- thermodynamics
 * got arrows on a dot -- and two of the matches were actively wrong: "simple
 * harmonic motion" never matched the pattern `shm`, so it fell through, and
 * quantum physics was given a nuclear decay diagram.
 *
 * A diagram that depicts the wrong physics is worse than none at all, because
 * a student revising will take it as the picture of the thing. Matching is now
 * by lesson slug, first match wins, and anything unmatched shows nothing.
 */

const svg = (content, label) => `<div class="diagram" role="img" aria-label="${escapeHTML(label)}"><svg viewBox="0 0 360 190" aria-hidden="true">${content}</svg><p>${escapeHTML(label)}</p></div>`;
const arrow = (x1, y1, x2, y2, label = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#arrow)"/><text x="${(x1 + x2) / 2 + 5}" y="${(y1 + y2) / 2 - 5}">${label}</text>`;
const defs = '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z"/></marker></defs>';
const axes = (label = '', unit = '') => `<line x1="46" y1="24" x2="46" y2="150"/><line x1="46" y1="150" x2="330" y2="150"/><text x="14" y="30">${label}</text><text x="316" y="170">${unit}</text>`;

/**
 * Each entry is [matcher, drawing, caption]. Order matters: the first match
 * wins, so specific slugs come before general ones.
 */
const DIAGRAMS = [
  ['kinematics', () => `${defs}${axes('v', 't')}<polyline points="46,150 140,96 250,96 330,42" fill="none"/><text x="80" y="120">a &gt; 0</text><text x="176" y="88">a = 0</text><text x="272" y="66">a &gt; 0</text><line x1="140" y1="96" x2="140" y2="150" stroke-dasharray="4 4"/><line x1="250" y1="96" x2="250" y2="150" stroke-dasharray="4 4"/>`,
    'Velocity-time graph: gradient is acceleration, area beneath is displacement.'],

  ['forces', () => `${defs}<rect x="140" y="82" width="80" height="55" rx="4"/>${arrow(180, 82, 180, 32, 'N')}${arrow(180, 137, 180, 174, 'mg')}${arrow(140, 110, 70, 110, 'F')}${arrow(220, 110, 290, 110, 'friction')}`,
    'Free-body diagram: every force acting on one body.'],

  ['rigid-body-mechanics', () => `${defs}<circle cx="180" cy="100" r="6"/><line x1="180" y1="100" x2="300" y2="100"/>${arrow(300, 100, 300, 44, 'F')}<path d="M180 76 A24 24 0 0 1 204 100" fill="none" stroke-dasharray="3 3"/><text x="196" y="120">r</text><text x="150" y="96">pivot</text>`,
    'Torque: a force applied at a perpendicular distance from the pivot.'],

  ['energy', () => `${defs}<rect x="60" y="88" width="52" height="42" rx="4"/><rect x="230" y="88" width="52" height="42" rx="4" stroke-dasharray="4 4" fill="none"/>${arrow(112, 109, 230, 109, 'F')}<line x1="86" y1="146" x2="256" y2="146"/><text x="160" y="166">s</text><text x="120" y="60">W = Fs cos θ</text>`,
    'Work done: a force acting through a displacement.'],

  ['simple-harmonic-motion', () => `${defs}<line x1="60" y1="30" x2="60" y2="160"/><path d="M60 60 l16 -8 l0 16 l16 -16 l0 16 l16 -16 l0 16 l16 -8" fill="none"/><rect x="140" y="44" width="42" height="32" rx="4"/><line x1="182" y1="60" x2="300" y2="60" stroke-dasharray="4 4"/><text x="240" y="52">x₀</text><line x1="120" y1="120" x2="300" y2="120" stroke-dasharray="4 4"/><text x="120" y="140">−x₀</text><text x="292" y="140">+x₀</text>${arrow(210, 120, 268, 120, 'a = −ω²x')}`,
    'Mass on a spring: acceleration is proportional to displacement and directed back to the centre.'],

  ['the-wave-model', () => `${defs}<path d="M15 95 C45 25 75 25 105 95 S165 165 195 95 S255 25 285 95 S330 165 350 95" fill="none"/><line x1="15" y1="95" x2="350" y2="95" stroke-dasharray="5 5"/>${arrow(55, 95, 55, 28, 'A')}<line x1="55" y1="150" x2="195" y2="150"/><text x="110" y="170">λ</text>`,
    'Wave: amplitude from the rest position, wavelength between repeats.'],

  ['wave-phenomena', () => `${defs}<line x1="120" y1="20" x2="120" y2="86"/><line x1="120" y1="104" x2="120" y2="170"/><path d="M40 60 v70 M64 60 v70 M88 60 v70" stroke-dasharray="3 3"/><path d="M132 95 A46 46 0 0 1 178 141 M132 95 A70 70 0 0 1 202 165 M132 95 A46 46 0 0 0 178 49 M132 95 A70 70 0 0 0 202 25" fill="none"/><text x="228" y="99">spreading</text><text x="34" y="46">plane waves</text>`,
    'Diffraction: waves spread after passing through a gap comparable to their wavelength.'],

  ['standing-waves', () => `${defs}<path d="M40 95 C80 35 120 35 160 95 S240 155 280 95 S320 35 320 95" fill="none"/><path d="M40 95 C80 155 120 155 160 95 S240 35 280 95 S320 155 320 95" fill="none" stroke-dasharray="4 4"/><line x1="40" y1="95" x2="320" y2="95" stroke-dasharray="2 4"/><circle cx="40" cy="95" r="3"/><circle cx="160" cy="95" r="3"/><circle cx="280" cy="95" r="3"/><text x="146" y="120">node</text><text x="88" y="42">antinode</text>`,
    'Standing wave: fixed nodes where the string never moves, antinodes between them.'],

  ['doppler-effect', () => `${defs}<circle cx="150" cy="95" r="7"/>${arrow(160, 95, 214, 95, 'v')}<circle cx="150" cy="95" r="30" fill="none"/><circle cx="140" cy="95" r="52" fill="none"/><circle cx="128" cy="95" r="76" fill="none"/><text x="228" y="60">compressed</text><text x="228" y="76">higher f</text><text x="20" y="60">stretched</text><text x="20" y="76">lower f</text>`,
    'A moving source crowds wavefronts ahead of it and stretches those behind.'],

  ['electromagnetic-waves', () => `${defs}<line x1="30" y1="95" x2="330" y2="95"/><path d="M40 95 C64 45 88 45 112 95 S160 145 184 95 S232 45 256 95 S304 145 320 95" fill="none"/><text x="44" y="36">E</text><path d="M40 95 C64 122 88 122 112 95 S160 68 184 95 S232 122 256 95 S304 68 320 95" fill="none" stroke-dasharray="4 4"/><text x="44" y="150">B</text>${arrow(300, 95, 344, 95, 'c')}`,
    'Electromagnetic wave: electric and magnetic fields oscillating at right angles.'],

  ['gravitation', () => `${defs}<circle cx="80" cy="95" r="26"/><text x="70" y="100">M</text><circle cx="280" cy="95" r="13"/><text x="274" y="100">m</text><line x1="80" y1="132" x2="280" y2="132" stroke-dasharray="4 4"/><text x="172" y="152">r</text>${arrow(254, 95, 116, 95, 'F')}${arrow(106, 95, 244, 95, 'F')}<text x="120" y="42">F ∝ 1/r²</text>`,
    'Two masses attract each other equally and oppositely, falling off as the inverse square of separation.'],

  ['electric-fields', () => `${defs}<circle cx="180" cy="95" r="22"/><text x="173" y="102">+</text>${arrow(155, 95, 65, 95, '')}${arrow(205, 95, 295, 95, 'E')}${arrow(180, 70, 180, 20, '')}${arrow(180, 120, 180, 170, '')}${arrow(163, 78, 108, 40, '')}${arrow(197, 112, 252, 150, '')}`,
    'Field lines point away from a positive charge, and the field weakens with distance.'],

  ['magnetic-fields', () => `${defs}<line x1="180" y1="18" x2="180" y2="172"/><circle cx="180" cy="95" r="30" fill="none"/><circle cx="180" cy="95" r="55" fill="none"/><circle cx="180" cy="95" r="80" fill="none"/><text x="188" y="34">I</text>${arrow(210, 95, 236, 95, 'B')}<text x="236" y="150">concentric circles</text>`,
    'Magnetic field around a straight current-carrying wire: circles, weakening with distance.'],

  ['motion-in-fields', () => `${defs}<path d="M60 150 A70 70 0 0 1 200 150" fill="none"/><circle cx="60" cy="150" r="5"/><circle cx="200" cy="150" r="5"/>${arrow(60, 150, 60, 92, 'v')}<text x="112" y="66">r = mv/qB</text><g>${[80, 130, 180, 230, 280].map(x => [40, 90].map(y => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')).join('')}</g><text x="292" y="40">B out</text>`,
    'A charged particle moving through a magnetic field follows a circular path.'],

  ['electromagnetic-induction', () => `${defs}<rect x="120" y="52" width="90" height="86" rx="6" fill="none"/><path d="M120 68 h90 M120 86 h90 M120 104 h90 M120 122 h90" stroke-dasharray="3 3"/><rect x="250" y="76" width="34" height="40" rx="3"/><text x="256" y="102">N</text>${arrow(248, 96, 218, 96, 'v')}<text x="120" y="164">changing flux induces an emf</text>`,
    'Moving a magnet changes the flux through the coil, which induces an emf.'],

  ['current-and-circuits', () => `${defs}<rect x="60" y="50" width="240" height="94" rx="4" fill="none"/><line x1="60" y1="82" x2="60" y2="90"/><line x1="52" y1="90" x2="68" y2="90"/><line x1="56" y1="98" x2="64" y2="98"/><line x1="52" y1="106" x2="68" y2="106"/><text x="20" y="100">ε</text><rect x="150" y="38" width="56" height="24" rx="2"/><text x="164" y="30">R</text><circle cx="180" cy="144" r="14" fill="none"/><text x="174" y="149">A</text>${arrow(230, 50, 270, 50, 'I')}`,
    'A simple circuit: a cell drives current through a resistor, measured by an ammeter in series.'],

  ['gas-laws', () => `${defs}<rect x="70" y="46" width="150" height="98" rx="3" fill="none"/><rect x="220" y="46" width="16" height="98" fill="none"/>${arrow(252, 95, 214, 95, 'F')}<g>${[[100, 70], [140, 96], [180, 62], [116, 118], [196, 122], [160, 132], [124, 82]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4"/>`).join('')}</g><text x="76" y="168">pV = nRT</text>`,
    'Gas in a cylinder: particles colliding with the walls create the pressure.'],

  ['thermal-energy', () => `${defs}<rect x="40" y="66" width="80" height="56" rx="3"/><text x="52" y="150">conduction</text><path d="M140 118 q14 -22 28 0 q14 22 28 0" fill="none"/><path d="M140 96 q14 -22 28 0 q14 22 28 0" fill="none"/><text x="140" y="150">convection</text>${arrow(228, 94, 300, 94, '')}${arrow(228, 78, 300, 78, '')}${arrow(228, 110, 300, 110, '')}<text x="230" y="150">radiation</text>`,
    'Three ways thermal energy transfers: conduction, convection and radiation.'],

  ['thermodynamics', () => `${defs}${axes('p', 'V')}<path d="M80 46 L250 46 L250 120 L80 120 Z" fill="none"/>${arrow(150, 46, 190, 46, 'Q in')}${arrow(250, 80, 250, 104, '')}${arrow(190, 120, 150, 120, 'Q out')}<text x="264" y="86">W</text><text x="96" y="140">cycle</text>`,
    'A closed cycle on a pressure-volume diagram: the enclosed area is the net work done.'],

  ['greenhouse-effect', () => `${defs}<path d="M20 150 Q180 118 340 150" fill="none"/><path d="M20 108 Q180 76 340 108" fill="none" stroke-dasharray="5 4"/><text x="24" y="70">atmosphere</text>${arrow(70, 24, 108, 128, '')}<text x="60" y="24">sunlight in</text>${arrow(200, 140, 200, 92, '')}${arrow(214, 92, 236, 132, '')}<text x="244" y="86">re-radiated back</text>`,
    'Shorter-wavelength sunlight passes through; longer-wavelength radiation from the surface is absorbed and re-emitted downwards.'],

  ['atomic-physics', () => `${defs}<line x1="70" y1="40" x2="240" y2="40"/><text x="250" y="45">n = 4</text><line x1="70" y1="70" x2="240" y2="70"/><text x="250" y="75">n = 3</text><line x1="70" y1="110" x2="240" y2="110"/><text x="250" y="115">n = 2</text><line x1="70" y1="164" x2="240" y2="164"/><text x="250" y="169">n = 1</text>${arrow(120, 70, 120, 106, '')}${arrow(180, 110, 180, 160, 'hf')}<text x="26" y="102">E</text>`,
    'Discrete energy levels: a photon is emitted with exactly the energy between two levels.'],

  ['quantum-physics', () => `${defs}<rect x="60" y="96" width="140" height="34" rx="2"/><text x="88" y="150">metal surface</text>${arrow(40, 40, 96, 92, 'hf')}${arrow(130, 92, 190, 40, '')}<circle cx="196" cy="36" r="5"/><text x="206" y="34">e⁻, Ek = hf − φ</text><text x="228" y="120">no emission below f₀</text>`,
    'Photoelectric effect: one photon frees one electron, but only above the threshold frequency.'],

  ['nuclear-physics', () => `${defs}<circle cx="130" cy="95" r="35"/><text x="112" y="101">parent</text>${arrow(170, 95, 270, 95, 'α / β / γ')}<circle cx="305" cy="95" r="30"/><text x="288" y="101">daughter</text>`,
    'Radioactive decay: an unstable nucleus emits radiation and becomes a different nuclide.'],

  ['nuclear-fission', () => `${defs}<circle cx="70" cy="95" r="4"/>${arrow(78, 95, 118, 95, 'n')}<circle cx="146" cy="95" r="28"/><text x="126" y="100">U-235</text>${arrow(176, 80, 220, 52, '')}${arrow(176, 110, 220, 138, '')}<circle cx="248" cy="44" r="18"/><circle cx="248" cy="146" r="18"/><text x="272" y="48">fragments</text><circle cx="238" cy="95" r="3"/><circle cx="264" cy="95" r="3"/><circle cx="290" cy="95" r="3"/><text x="232" y="118">more n</text>`,
    'Fission: a neutron splits a heavy nucleus, releasing energy and further neutrons.'],

  ['nuclear-fusion', () => `${defs}<circle cx="70" cy="70" r="16"/><text x="58" y="75">²H</text><circle cx="70" cy="130" r="16"/><text x="58" y="135">³H</text>${arrow(92, 78, 150, 98, '')}${arrow(92, 122, 150, 102, '')}<circle cx="192" cy="100" r="24"/><text x="176" y="105">⁴He</text>${arrow(220, 88, 286, 62, 'n')}<text x="150" y="164">energy released</text>`,
    'Fusion: light nuclei join to form a heavier one, releasing energy.'],

  ['relativity', () => `${defs}<rect x="50" y="40" width="90" height="110" rx="4" fill="none"/><line x1="60" y1="140" x2="130" y2="140"/><line x1="60" y1="50" x2="130" y2="50"/>${arrow(95, 138, 95, 56, '')}<text x="56" y="172">at rest</text><rect x="210" y="40" width="90" height="110" rx="4" fill="none"/><line x1="220" y1="140" x2="290" y2="140"/><line x1="220" y1="50" x2="290" y2="50"/>${arrow(228, 138, 286, 56, '')}<text x="212" y="172">moving: longer path</text>`,
    'A light clock: light travels further per tick in a moving frame, so time runs slower.'],
];

/** Slug fragments that identify a lesson, mapped to the diagram key above. */
const MATCHERS = [
  [/kinematic/, 'kinematics'],
  [/rigid-body/, 'rigid-body-mechanics'],
  [/force|momentum/, 'forces'],
  [/work|energy-and-power|^energy/, 'energy'],
  [/harmonic/, 'simple-harmonic-motion'],
  [/standing-wave|resonance/, 'standing-waves'],
  [/wave-phenomena|diffraction|interference/, 'wave-phenomena'],
  [/electromagnetic-wave/, 'electromagnetic-waves'],
  [/wave-model|wave-properties/, 'the-wave-model'],
  [/doppler/, 'doppler-effect'],
  [/gravitation|gravitational/, 'gravitation'],
  [/electromagnetic-induction|induction/, 'electromagnetic-induction'],
  [/motion-in/, 'motion-in-fields'],
  [/magnetic/, 'magnetic-fields'],
  [/electric-field/, 'electric-fields'],
  [/current|circuit/, 'current-and-circuits'],
  [/gas-law|ideal-gas/, 'gas-laws'],
  [/thermodynamic/, 'thermodynamics'],
  [/thermal/, 'thermal-energy'],
  [/greenhouse/, 'greenhouse-effect'],
  [/atomic/, 'atomic-physics'],
  [/quantum/, 'quantum-physics'],
  [/fission/, 'nuclear-fission'],
  [/fusion|stars/, 'nuclear-fusion'],
  [/nuclear/, 'nuclear-physics'],
  [/relativity/, 'relativity'],
];

const byKey = new Map(DIAGRAMS.map(([key, draw, caption]) => [key, [draw, caption]]));

/** Returns the diagram key a lesson should use, or null when none fits. */
export function diagramKeyFor(lesson) {
  const slug = slugify(`${lesson.slug || ''} ${lesson.title || ''} ${lesson.topicLabel || ''}`);
  const match = MATCHERS.find(([pattern]) => pattern.test(slug));
  return match ? match[1] : null;
}

/**
 * The lesson's diagram, or nothing.
 *
 * Returning an empty string when nothing fits is deliberate: a lesson with no
 * diagram simply has one fewer section, whereas a wrong diagram teaches a
 * wrong picture.
 */
export function diagramFor(lesson) {
  const key = diagramKeyFor(lesson);
  if (!key) return '';
  const entry = byKey.get(key);
  if (!entry) return '';
  const [draw, caption] = entry;
  return svg(draw(), caption);
}
