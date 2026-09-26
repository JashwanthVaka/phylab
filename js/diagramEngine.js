import { escapeHTML } from './utils.js';
import { visualForLesson } from './visualRegistry.js';

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

const DIAGRAM_META = {
  kinematics: ['Velocity through time', 'mechanics', ['Gradient gives acceleration', 'Area gives displacement']],
  forces: ['Forces on one body', 'mechanics', ['Arrow direction shows the force direction', 'Balanced arrows give zero resultant force']],
  'rigid-body-mechanics': ['Turning effect about a pivot', 'mechanics', ['Use the perpendicular distance', 'The force and lever arm set the torque']],
  energy: ['Work transfers energy', 'mechanics', ['Only the force component along the motion does work', 'Displacement is measured along the path']],
  'simple-harmonic-motion': ['Restoring motion', 'waves', ['Acceleration points towards equilibrium', 'Its magnitude grows with displacement']],
  'the-wave-model': ['Anatomy of a wave', 'waves', ['Amplitude is measured from equilibrium', 'Wavelength joins matching points']],
  'wave-phenomena': ['Diffraction at a gap', 'waves', ['Narrower gaps produce more spreading', 'Compare gap width with wavelength']],
  'standing-waves': ['Nodes and antinodes', 'waves', ['Nodes remain at zero displacement', 'Antinodes oscillate with maximum amplitude']],
  'doppler-effect': ['Moving wave source', 'waves', ['Wavefronts compress ahead', 'Observed frequency changes, wave speed does not']],
  'electromagnetic-waves': ['Coupled electric and magnetic fields', 'waves', ['The fields are perpendicular', 'Both are perpendicular to the travel direction']],
  gravitation: ['Mutual gravitational attraction', 'fields', ['The forces are equal and opposite', 'Strength falls with distance squared']],
  'electric-fields': ['Field around a positive charge', 'fields', ['Arrows show the force on a positive test charge', 'Wider spacing means a weaker field']],
  'magnetic-fields': ['Field around a current', 'fields', ['Field lines form concentric circles', 'Use the right-hand grip rule for direction']],
  'motion-in-fields': ['Charged particle in a magnetic field', 'fields', ['Magnetic force stays perpendicular to velocity', 'The path curves without changing speed']],
  'electromagnetic-induction': ['Changing flux through a coil', 'fields', ['Relative motion changes magnetic flux', 'The induced emf opposes the change']],
  'current-and-circuits': ['Current in a complete circuit', 'fields', ['An ammeter is connected in series', 'Current requires a closed conducting path']],
  'gas-laws': ['Microscopic origin of pressure', 'thermal', ['Particles transfer momentum in collisions', 'More frequent collisions increase pressure']],
  'thermal-energy': ['Three thermal transfers', 'thermal', ['Conduction needs particle interactions', 'Convection moves matter; radiation does not']],
  thermodynamics: ['Work from a thermodynamic cycle', 'thermal', ['The enclosed area is net work', 'Direction decides the sign of the work']],
  'greenhouse-effect': ['Radiation through the atmosphere', 'thermal', ['Incoming and outgoing radiation have different wavelengths', 'Greenhouse gases absorb and re-emit infrared']],
  'atomic-physics': ['Discrete atomic energy levels', 'quantum', ['Transitions use exact energy differences', 'A downward transition emits a photon']],
  'quantum-physics': ['Photoelectric emission', 'quantum', ['One photon transfers energy to one electron', 'No emission occurs below threshold frequency']],
  'nuclear-physics': ['Radioactive transformation', 'quantum', ['The daughter is a different nuclide', 'Charge and nucleon number remain conserved']],
  'nuclear-fission': ['Neutron-induced fission', 'quantum', ['A heavy nucleus splits into fragments', 'Released neutrons can continue a chain reaction']],
  'nuclear-fusion': ['Fusion of light nuclei', 'quantum', ['Products have greater binding energy per nucleon', 'The mass difference is released as energy']],
  relativity: ['Light clock in two frames', 'quantum', ['Every observer measures the same light speed', 'A longer light path means a longer elapsed time']],
};

const svg = (key, content, label, depth = '2d') => {
  const [title, group, cues] = DIAGRAM_META[key] || [key.replace(/-/g, ' '), 'mechanics', []];
  const titleId = `diagram-${key}-title`;
  const captionId = `diagram-${key}-caption`;
  const svgTitleId = `diagram-${key}-svg-title`;
  const svgDescId = `diagram-${key}-svg-desc`;
  const stateId = `diagram-${key}-state`;
  return `<figure class="diagram" data-diagram="${escapeHTML(key)}" data-diagram-group="${escapeHTML(group)}" data-scene-depth="${escapeHTML(depth)}" data-view-angle="front" aria-labelledby="${titleId}" aria-describedby="${captionId} ${stateId}">
    <header class="diagram__header">
      <div><span class="diagram__group">${escapeHTML(group)}</span><h3 id="${titleId}">${escapeHTML(title)}</h3></div>
      <div class="diagram__controls" role="group" aria-label="Model controls">
        <button type="button" class="diagram__view" data-diagram-view aria-label="Change 3D viewing angle. Current view: front">3D view · Front</button>
        <button type="button" class="diagram__replay" data-diagram-replay aria-label="Replay ${escapeHTML(title)} drawing">Replay model</button>
      </div>
    </header>
    <div class="diagram__stage">
      <span class="diagram__scale">INTERACTIVE 3D CONCEPT MODEL · NOT TO SCALE</span>
      <div class="diagram__world" data-diagram-world>
        <span class="diagram__backplane" aria-hidden="true"></span>
        <svg viewBox="0 0 360 190" role="img" aria-labelledby="${svgTitleId}" aria-describedby="${svgDescId}" preserveAspectRatio="xMidYMid meet"><title id="${svgTitleId}">${escapeHTML(title)}</title><desc id="${svgDescId}">${escapeHTML(label)} ${cues.map(cue => escapeHTML(cue)).join('. ')}.</desc>${content}</svg>
      </div>
    </div>
    <figcaption id="${captionId}"><b>What to notice</b><span>${escapeHTML(label)}</span></figcaption>
    ${cues.length ? `<ul class="diagram__cues">${cues.map(cue => `<li>${escapeHTML(cue)}</li>`).join('')}</ul>` : ''}
    <p class="visually-hidden" id="${stateId}" data-diagram-state aria-live="polite">Model ready. All relationships are visible.</p>
  </figure>`;
};
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

  ['electromagnetic-waves', () => `${defs}<g class="diagram-depth-grid"><path d="M42 148 L320 55 M42 148 L42 38 M42 148 L132 176"/><path d="M92 132 L92 55 M142 115 L142 38 M192 98 L192 25 M242 82 L242 18" stroke-dasharray="3 5"/></g><path class="diagram-field diagram-field--electric" d="M42 148 C65 72 88 70 111 125 S157 174 180 102 S226 35 249 78 S295 130 320 55" fill="none"/><path class="diagram-field diagram-field--magnetic" d="M42 148 C65 170 88 173 111 125 S157 73 180 102 S226 130 249 78 S295 31 320 55" fill="none" stroke-dasharray="5 4"/><text x="70" y="48">electric field E</text><text x="216" y="155">magnetic field B</text>${arrow(278, 69, 332, 51, 'c')}<text x="18" y="177">mutually perpendicular axes</text>`,
    'Electromagnetic wave: electric and magnetic fields oscillating at right angles.'],

  ['gravitation', () => `${defs}<g class="diagram-orbital-planes"><ellipse cx="180" cy="96" rx="132" ry="45" transform="rotate(-12 180 96)" fill="none"/><ellipse cx="180" cy="96" rx="118" ry="34" transform="rotate(28 180 96)" fill="none" stroke-dasharray="5 4"/><line x1="46" y1="124" x2="314" y2="67" stroke-dasharray="3 5"/></g><circle cx="180" cy="96" r="25"/><text x="170" y="101">M</text><circle cx="289" cy="60" r="9"/><text x="302" y="59">m</text>${arrow(280, 64, 210, 87, 'F')}<text x="42" y="32">two possible orbital planes</text><text x="118" y="174">gravity acts towards the centre</text>`,
    'Two masses attract each other equally and oppositely, falling off as the inverse square of separation.'],

  ['electric-fields', () => `${defs}<circle cx="180" cy="95" r="22"/><text x="173" y="102">+</text>${arrow(155, 95, 65, 95, '')}${arrow(205, 95, 295, 95, 'E')}${arrow(180, 70, 180, 20, '')}${arrow(180, 120, 180, 170, '')}${arrow(163, 78, 108, 40, '')}${arrow(197, 112, 252, 150, '')}`,
    'Field lines point away from a positive charge, and the field weakens with distance.'],

  ['magnetic-fields', () => `${defs}<line x1="180" y1="18" x2="180" y2="172"/><path d="M174 34 L180 18 L186 34"/><text x="190" y="28">current I</text><g class="diagram-field-shells"><ellipse cx="180" cy="95" rx="42" ry="15" fill="none"/><ellipse cx="180" cy="95" rx="78" ry="29" fill="none"/><ellipse cx="180" cy="95" rx="118" ry="44" fill="none"/></g>${arrow(217, 83, 231, 88, 'B')}<path d="M62 95 Q180 139 298 95" fill="none" stroke-dasharray="4 5"/><text x="226" y="157">circular field planes</text>`,
    'Magnetic field around a straight current-carrying wire: circles, weakening with distance.'],

  ['motion-in-fields', () => `${defs}<g class="diagram-field-volume">${[55, 115, 175, 235, 295].map(x => `<line x1="${x}" y1="32" x2="${x}" y2="160" stroke-dasharray="3 6"/>`).join('')}</g>${arrow(42, 156, 318, 48, 'B')}<path class="diagram-helix" d="M52 145 C70 95 88 95 106 124 C124 153 142 153 160 105 C178 57 196 57 214 86 C232 115 250 115 268 67 C280 35 296 35 314 54" fill="none"/><circle cx="52" cy="145" r="5"/><circle cx="314" cy="54" r="5"/>${arrow(55, 142, 87, 119, 'v')}<text x="64" y="34">helical path when v has parallel and perpendicular components</text><text x="213" y="176">pitch from v∥, radius from v⊥</text>`,
    'A charged particle moving through a magnetic field follows a circular path.'],

  ['electromagnetic-induction', () => `${defs}<g class="diagram-coil">${[84, 96, 108, 120, 132].map(x => `<ellipse cx="${x}" cy="96" rx="17" ry="57" fill="none"/>`).join('')}</g><path d="M132 39 C174 48 174 144 132 153 M132 52 C158 61 158 131 132 140" fill="none" stroke-dasharray="4 5"/><path d="M132 96 L236 96" stroke-dasharray="3 5"/><rect x="236" y="66" width="70" height="60" rx="4"/><line x1="271" y1="66" x2="271" y2="126"/><text x="247" y="101">N</text><text x="282" y="101">S</text>${arrow(232, 96, 188, 96, 'v')}<text x="42" y="27">coil loops</text><text x="171" y="174">changing flux through the coil</text>`,
    'Moving a magnet changes the flux through the coil, which induces an emf.'],

  ['current-and-circuits', () => `${defs}<rect x="60" y="50" width="240" height="94" rx="4" fill="none"/><line x1="60" y1="82" x2="60" y2="90"/><line x1="52" y1="90" x2="68" y2="90"/><line x1="56" y1="98" x2="64" y2="98"/><line x1="52" y1="106" x2="68" y2="106"/><text x="20" y="100">ε</text><rect x="150" y="38" width="56" height="24" rx="2"/><text x="164" y="30">R</text><circle cx="180" cy="144" r="14" fill="none"/><text x="174" y="149">A</text>${arrow(230, 50, 270, 50, 'I')}`,
    'A simple circuit: a cell drives current through a resistor, measured by an ammeter in series.'],

  ['gas-laws', () => `${defs}<path d="M66 54 L224 54 L264 82 L106 82 Z M66 54 L66 145 L106 170 L106 82 M106 170 L264 170 L264 82 M224 54 L224 145 L264 170" fill="none"/><g class="diagram-gas-particles">${[[94,75,3],[137,67,2],[188,72,4],[225,91,3],[128,112,4],[176,102,3],[224,126,4],[151,145,3],[79,119,3],[198,151,2]].map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>${arrow(235, 107, 258, 99, '')}${arrow(118, 126, 99, 137, '')}${arrow(170, 93, 184, 80, '')}<text x="270" y="87">wall collision</text><text x="42" y="184">particle momentum transfer produces pressure</text>`,
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

const byKey = new Map(DIAGRAMS.map(([key, draw, caption]) => [key, [draw, caption]]));

/** Returns the diagram key a lesson should use, or null when none fits. */
export function diagramKeyFor(lesson) {
  return visualForLesson(lesson)?.diagram || null;
}

/**
 * The lesson's diagram, or nothing.
 *
 * Returning an empty string when nothing fits is deliberate: a lesson with no
 * diagram simply has one fewer section, whereas a wrong diagram teaches a
 * wrong picture.
 */
export function diagramFor(lesson) {
  const visual = visualForLesson(lesson);
  const key = visual?.diagram;
  if (!key) return '';
  const entry = byKey.get(key);
  if (!entry) return '';
  const [draw, caption] = entry;
  return svg(key, draw(), caption, visual.depth);
}

/** Adds one restrained draw-on reveal and lets a learner replay it. */
export function bindDiagrams(root = document) {
  const diagrams = [...root.querySelectorAll('[data-diagram]')];
  if (!diagrams.length) return undefined;
  const controller = new AbortController();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const views = [
    { key: 'front', label: 'Front', guidance: 'Read the quantities, arrows and equation in their undistorted teaching view.' },
    { key: 'left', label: 'Relationship', guidance: 'Use the left angle to separate the spatial layers and follow what causes the change.' },
    { key: 'right', label: 'Outcome', guidance: 'Use the right angle to inspect the direction, path or field produced by the model.' },
  ];

  const changeView = diagram => {
    const current = views.findIndex(view => view.key === diagram.dataset.viewAngle);
    const next = views[(current + 1) % views.length];
    const button = diagram.querySelector('[data-diagram-view]');
    const state = diagram.querySelector('[data-diagram-state]');
    diagram.dataset.viewAngle = next.key;
    if (button) {
      button.textContent = `3D view · ${next.label}`;
      button.setAttribute('aria-label', `Change 3D viewing angle. Current view: ${next.label.toLowerCase()}`);
    }
    if (state) state.textContent = `${next.label} viewing angle selected. ${next.guidance}`;
  };
  const replay = diagram => {
    diagram.classList.remove('is-animating');
    const state = diagram.querySelector('[data-diagram-state]');
    const button = diagram.querySelector('[data-diagram-replay]');
    if (reducedMotion) {
      if (state) state.textContent = 'Complete concept model shown. Motion is disabled by your reduced-motion setting.';
      if (button) button.textContent = 'Model shown';
      return;
    }
    void diagram.offsetWidth;
    diagram.classList.add('is-animating');
    if (state) state.textContent = 'Replaying the concept model drawing.';
    if (button) {
      button.textContent = 'Replaying…';
      window.setTimeout(() => {
        if (!button.isConnected) return;
        button.textContent = 'Replay model';
        if (state) state.textContent = 'Model complete. Use the two reading cues below to interpret it.';
      }, 950);
    }
  };

  diagrams.forEach(diagram => {
    diagram.querySelector('[data-diagram-replay]')?.addEventListener('click', () => replay(diagram), { signal: controller.signal });
    diagram.querySelector('[data-diagram-view]')?.addEventListener('click', () => changeView(diagram), { signal: controller.signal });
  });

  if (!reducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      replay(entry.target);
      observer.unobserve(entry.target);
    }), { threshold: 0.3 });
    diagrams.forEach(diagram => observer.observe(diagram));
    return () => { observer.disconnect(); controller.abort(); };
  }

  diagrams.forEach(replay);
  return () => controller.abort();
}
