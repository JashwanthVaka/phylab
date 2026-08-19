/**
 * Corrects and completes the formula sets, checked against the coursebook.
 *
 * Three were wrong or incomplete:
 *   W = Fs            → W = Fs cosθ            (book p71)
 *   τ = Fd            → also τ = Fr sinθ        (book p116)
 *   λ = sx/D          → s = λD/d               (book p314)
 *
 * Six lessons carried no formulas at all — thermal energy transfers, the
 * greenhouse effect, the gas laws, electromagnetic waves, gravitation and
 * nuclear physics — so none of their equations reached the formula centre
 * or the search index. Those are supplied here, along with equations the
 * lessons discuss in prose but never stated: the fourth kinematics
 * equation, rotational dynamics, and the de Broglie relation.
 *
 * Run once:  node tools/fix-formulas.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'lessons');
const read = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const write = (f, o) => fs.writeFileSync(path.join(DIR, f), JSON.stringify(o, null, 2) + '\n');

const log = [];

/* ── 1. Corrections to existing formulas ─────────────────────────────── */
const corrections = [
  ['energy.json', 'Work Done', {
    formula: 'W = Fs cosθ',
    variables: { W: 'work done (J)', F: 'applied force (N)', s: 'displacement (m)', 'θ': 'angle between the force and the displacement' },
    explanation: 'Only the component of force along the displacement does work, so a force perpendicular to the motion does none.'
  }],
  ['rigid_body_mechanics.json', 'Torque', {
    formula: 'τ = Fd = Fr sinθ',
    variables: { 'τ': 'torque (N m)', F: 'force (N)', d: 'perpendicular distance from the axis to the line of action (m)', r: 'distance from the axis to the point of application (m)', 'θ': 'angle between the force and that distance' },
    explanation: 'Torque is the force times the perpendicular distance. Since d = r sinθ, the two forms are equivalent.'
  }],
  ['wave_phenomena.json', 'Double Slit Fringe Spacing', {
    name: 'Double-Slit Fringe Spacing',
    formula: 's = λD / d',
    variables: { s: 'spacing between adjacent fringes (m)', 'λ': 'wavelength of the light (m)', D: 'distance from the slits to the screen (m)', d: 'separation of the two slits (m)' },
    explanation: 'Fringes are further apart for longer wavelengths, a more distant screen, or more closely spaced slits.'
  }],
];

for (const [file, name, patch] of corrections) {
  const lesson = read(file);
  const f = (lesson.formulas || []).find(x => x.name === name);
  if (!f) { console.error(`ABORT — ${file} has no formula named "${name}"`); process.exit(1); }
  const before = f.formula;
  Object.assign(f, patch);
  write(file, lesson);
  log.push(`  corrected  ${lesson.title.padEnd(34)} ${before}  →  ${f.formula}`);
}

/* ── 2. Formulas the lessons discuss but never stated ────────────────── */
const additions = {
  'kinematics.json': [
    { name: 'Fourth equation of motion', formula: 's = ½(u + v)t',
      variables: { s: 'displacement (m)', u: 'initial velocity (m s⁻¹)', v: 'final velocity (m s⁻¹)', t: 'time (s)' },
      explanation: 'The one constant-acceleration equation that does not involve acceleration; useful when a is unknown.' },
  ],
  'rigid_body_mechanics.json': [
    { name: 'Moment of Inertia', formula: 'I = Σmr²',
      variables: { I: 'moment of inertia (kg m²)', m: 'mass of each particle (kg)', r: 'its distance from the axis (m)' },
      explanation: 'The rotational analogue of mass. Unlike mass it depends on how the mass is distributed about the axis.' },
    { name: "Newton's Second Law for Rotation", formula: 'Στ = Iα',
      variables: { 'Στ': 'resultant torque (N m)', I: 'moment of inertia (kg m²)', 'α': 'angular acceleration (rad s⁻²)' },
      explanation: 'The rotational form of ΣF = ma.' },
    { name: 'Angular Momentum', formula: 'L = Iω',
      variables: { L: 'angular momentum (kg m² s⁻¹)', I: 'moment of inertia (kg m²)', 'ω': 'angular velocity (rad s⁻¹)' },
      explanation: 'Conserved when no external torque acts, which is why a skater spins faster on pulling their arms in.' },
  ],
  'quantum_physics.json': [
    { name: 'de Broglie Wavelength', formula: 'λ = h / p = h / mv',
      variables: { 'λ': 'wavelength (m)', h: 'Planck constant (6.63 × 10⁻³⁴ J s)', p: 'momentum (kg m s⁻¹)', m: 'mass (kg)', v: 'speed (m s⁻¹)' },
      explanation: 'Every particle has a wavelength set by its momentum — negligible for everyday objects, comparable to atomic spacings for electrons.' },
  ],
  'relativity.json': [
    { name: 'Total Relativistic Energy', formula: 'E = γmc²',
      variables: { E: 'total energy (J)', 'γ': 'Lorentz factor', m: 'rest mass (kg)', c: 'speed of light (m s⁻¹)' },
      explanation: 'Reduces to the rest energy mc² when the object is stationary, since γ = 1 at v = 0.' },
  ],
};

/* ── 3. The six lessons that had no formulas at all ──────────────────── */
const supplied = {
  'thermal_physics.json': [
    { name: 'Specific Heat Capacity', formula: 'Q = mcΔT',
      variables: { Q: 'energy transferred (J)', m: 'mass (kg)', c: 'specific heat capacity (J kg⁻¹ K⁻¹)', 'ΔT': 'temperature change (K or °C)' },
      explanation: 'Applies only while the substance stays in one phase.' },
    { name: 'Specific Latent Heat', formula: 'Q = mL',
      variables: { Q: 'energy transferred (J)', m: 'mass (kg)', L: 'specific latent heat (J kg⁻¹)' },
      explanation: 'Applies during a phase change, where the temperature does not change at all.' },
    { name: 'Stefan–Boltzmann Law', formula: 'P = eσAT⁴',
      variables: { P: 'radiated power (W)', e: 'emissivity (1 for a black body)', 'σ': 'Stefan–Boltzmann constant (5.67 × 10⁻⁸ W m⁻² K⁻⁴)', A: 'surface area (m²)', T: 'absolute temperature (K)' },
      explanation: 'The fourth power means doubling the absolute temperature multiplies the radiated power by sixteen.' },
    { name: "Wien's Displacement Law", formula: 'λ_max = 2.90 × 10⁻³ / T',
      variables: { 'λ_max': 'wavelength of peak emission (m)', T: 'absolute temperature (K)' },
      explanation: 'Hotter bodies peak at shorter wavelengths, which is why temperature can be read from colour.' },
    { name: 'Intensity from a Point Source', formula: 'I = P / 4πd²',
      variables: { I: 'intensity (W m⁻²)', P: 'power radiated (W)', d: 'distance from the source (m)' },
      explanation: 'The inverse-square law: power spreads over a sphere of increasing area.' },
  ],
  'greenhouse_effect.json': [
    { name: 'Emissivity', formula: 'e = P_emitted / P_black body',
      variables: { e: 'emissivity (0 to 1)', 'P_emitted': 'power actually radiated (W)', 'P_black body': 'power a black body at the same temperature would radiate (W)' },
      explanation: 'A perfect black body has e = 1; every real surface radiates less.' },
    { name: 'Albedo', formula: 'α = reflected power / incident power',
      variables: { 'α': 'albedo (0 to 1)' },
      explanation: 'High for ice and cloud, low for ocean and forest.' },
    { name: 'Average Incident Intensity', formula: 'I = S(1 − α) / 4',
      variables: { I: 'average absorbed intensity (W m⁻²)', S: 'solar constant (≈ 1360 W m⁻²)', 'α': 'albedo' },
      explanation: 'The Earth intercepts sunlight over a disc of area πR² but radiates from a sphere of area 4πR², which is where the factor of four comes from.' },
    { name: 'Equilibrium Temperature', formula: 'S(1 − α) / 4 = eσT⁴',
      variables: { S: 'solar constant (W m⁻²)', 'α': 'albedo', e: 'emissivity', 'σ': 'Stefan–Boltzmann constant', T: 'equilibrium temperature (K)' },
      explanation: 'Setting absorbed power equal to radiated power gives the temperature the planet settles at.' },
  ],
  'gas_laws.json': [
    { name: 'Ideal Gas Equation', formula: 'pV = nRT',
      variables: { p: 'pressure (Pa)', V: 'volume (m³)', n: 'amount of gas (mol)', R: 'gas constant (8.31 J mol⁻¹ K⁻¹)', T: 'absolute temperature (K)' },
      explanation: 'The equation of state. Temperature must be in kelvin.' },
    { name: 'Combined Gas Law', formula: 'p₁V₁ / T₁ = p₂V₂ / T₂',
      variables: { p: 'pressure (Pa)', V: 'volume (m³)', T: 'absolute temperature (K)' },
      explanation: 'For a fixed amount of gas changing between two states.' },
    { name: 'Number of Moles', formula: 'n = m / M',
      variables: { n: 'amount of gas (mol)', m: 'mass (g)', M: 'molar mass (g mol⁻¹)' },
      explanation: 'Molar mass in grams per mole is numerically the nucleon number.' },
    { name: 'Number of Particles', formula: 'N = nN_A',
      variables: { N: 'number of particles', n: 'amount of gas (mol)', 'N_A': 'Avogadro constant (6.02 × 10²³ mol⁻¹)' },
      explanation: 'Converts between moles and individual molecules.' },
    { name: 'Boltzmann Equation', formula: 'Ēk = (3/2)k_BT',
      variables: { 'Ēk': 'average random translational kinetic energy per molecule (J)', 'k_B': 'Boltzmann constant (1.38 × 10⁻²³ J K⁻¹)', T: 'absolute temperature (K)' },
      explanation: 'At the same temperature all gases have the same average molecular kinetic energy, whatever their molar mass.' },
    { name: 'Ideal Gas Law in Molecular Form', formula: 'pV = Nk_BT',
      variables: { p: 'pressure (Pa)', V: 'volume (m³)', N: 'number of molecules', 'k_B': 'Boltzmann constant (J K⁻¹)', T: 'absolute temperature (K)' },
      explanation: 'The same equation of state written per molecule rather than per mole, with k_B = R / N_A.' },
  ],
  'electromagnetic_waves.json': [
    { name: 'Wave Equation for Light', formula: 'c = fλ',
      variables: { c: 'speed of light in a vacuum (3.00 × 10⁸ m s⁻¹)', f: 'frequency (Hz)', 'λ': 'wavelength (m)' },
      explanation: 'All electromagnetic waves travel at c in a vacuum, so frequency and wavelength are inversely related.' },
    { name: 'Photon Energy', formula: 'E = hf = hc / λ',
      variables: { E: 'photon energy (J)', h: 'Planck constant (6.63 × 10⁻³⁴ J s)', f: 'frequency (Hz)', 'λ': 'wavelength (m)' },
      explanation: 'Higher-frequency radiation carries more energy per photon, which is why ultraviolet ionises and radio does not.' },
    { name: 'Intensity from a Point Source', formula: 'I = P / 4πd²',
      variables: { I: 'intensity (W m⁻²)', P: 'power radiated (W)', d: 'distance (m)' },
      explanation: 'Radiated power spreads over a sphere, so intensity falls with the square of distance.' },
  ],
  'fields.json': [
    { name: "Newton's Law of Gravitation", formula: 'F = GMm / r²',
      variables: { F: 'gravitational force (N)', G: 'gravitational constant (6.67 × 10⁻¹¹ N m² kg⁻²)', M: 'one mass (kg)', m: 'the other mass (kg)', r: 'separation of their centres (m)' },
      explanation: 'Always attractive, and r is measured centre to centre, not from the surface.' },
    { name: 'Gravitational Field Strength', formula: 'g = F/m = GM / r²',
      variables: { g: 'field strength (N kg⁻¹, equivalently m s⁻²)', M: 'mass creating the field (kg)', r: 'distance from its centre (m)' },
      explanation: 'Force per unit mass, numerically equal to the free-fall acceleration.' },
    { name: 'Orbital Speed', formula: 'v = √(GM / r)',
      variables: { v: 'orbital speed (m s⁻¹)', M: 'mass of the central body (kg)', r: 'orbital radius (m)' },
      explanation: 'From setting the gravitational force equal to the centripetal force.' },
    { name: "Kepler's Third Law", formula: 'T² = (4π² / GM) r³',
      variables: { T: 'orbital period (s)', M: 'mass of the central body (kg)', r: 'orbital radius (m)' },
      explanation: 'The square of the period is proportional to the cube of the orbital radius.' },
    { name: 'Gravitational Potential', formula: 'V_g = −GM / r',
      variables: { 'V_g': 'gravitational potential (J kg⁻¹)', M: 'mass creating the field (kg)', r: 'distance from its centre (m)' },
      explanation: 'Energy per unit mass, defined as zero at infinity and therefore negative everywhere else.' },
    { name: 'Gravitational Potential Energy', formula: 'E_p = −GMm / r',
      variables: { 'E_p': 'potential energy of the pair (J)', M: 'one mass (kg)', m: 'the other mass (kg)', r: 'separation (m)' },
      explanation: 'Note the 1/r dependence, against 1/r² for the force.' },
    { name: 'Escape Speed', formula: 'v_esc = √(2GM / R)',
      variables: { 'v_esc': 'escape speed (m s⁻¹)', M: 'mass of the body (kg)', R: 'radius of the body (m)' },
      explanation: 'The launch speed that just reaches infinity with no energy to spare. Independent of the escaping object’s mass.' },
  ],
  'nuclear_physics.json': [
    { name: 'Mass Defect', formula: 'Δm = Zm_p + Nm_n − m_nucleus',
      variables: { 'Δm': 'mass defect (kg or u)', Z: 'proton number', 'm_p': 'proton mass', N: 'neutron number', 'm_n': 'neutron mass', 'm_nucleus': 'measured nuclear mass' },
      explanation: 'A nucleus always has less mass than its separated nucleons.' },
    { name: 'Mass–Energy Equivalence', formula: 'E = Δmc²',
      variables: { E: 'binding energy (J)', 'Δm': 'mass defect (kg)', c: 'speed of light (3.00 × 10⁸ m s⁻¹)' },
      explanation: 'The mass defect is the energy equivalent of the binding energy.' },
    { name: 'Energy from Atomic Mass Units', formula: 'E = Δm × 931.5  MeV',
      variables: { E: 'energy (MeV)', 'Δm': 'mass defect (u)' },
      explanation: 'One atomic mass unit is equivalent to 931.5 MeV, avoiding conversion to kilograms.' },
    { name: 'Radioactive Decay Law', formula: 'N = N₀e^(−λt)',
      variables: { N: 'number of undecayed nuclei remaining', 'N₀': 'initial number of nuclei', 'λ': 'decay constant (s⁻¹)', t: 'time (s)' },
      explanation: 'Decay is random, so the rate is proportional to the number remaining, giving exponential decay.' },
    { name: 'Activity', formula: 'A = λN = A₀e^(−λt)',
      variables: { A: 'activity (Bq)', 'λ': 'decay constant (s⁻¹)', N: 'number of undecayed nuclei', 'A₀': 'initial activity (Bq)' },
      explanation: 'Activity is the number of decays per second and falls with the same exponential.' },
    { name: 'Half-Life and Decay Constant', formula: 'T½ = ln2 / λ',
      variables: { 'T½': 'half-life (s)', 'λ': 'decay constant (s⁻¹)' },
      explanation: 'A long half-life means a small decay constant and a weakly active source.' },
  ],
};

for (const [file, list] of Object.entries({ ...additions })) {
  const lesson = read(file);
  lesson.formulas = lesson.formulas || [];
  const have = new Set(lesson.formulas.map(f => f.name));
  const added = list.filter(f => !have.has(f.name));
  lesson.formulas.push(...added);
  write(file, lesson);
  if (added.length) log.push(`  added ${String(added.length).padStart(2)}   ${lesson.title.padEnd(34)} ${added.map(f => f.name).join(', ')}`);
}

for (const [file, list] of Object.entries(supplied)) {
  const lesson = read(file);
  if ((lesson.formulas || []).length) { console.error(`ABORT — ${file} already has formulas; expected none`); process.exit(1); }
  lesson.formulas = list;
  write(file, lesson);
  log.push(`  supplied ${String(list.length).padStart(2)} ${lesson.title.padEnd(34)} (had none)`);
}

console.log(log.join('\n'));

const total = fs.readdirSync(DIR).filter(f => f.endsWith('.json'))
  .reduce((n, f) => n + (read(f).formulas || []).length, 0);
const without = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).filter(f => !(read(f).formulas || []).length);
console.log(`\ntotal lesson formulas: ${total}`);
console.log(`lessons with no formulas: ${without.length ? without.join(', ') : 'none'}`);
