/**
 * Metadata for a single formula: units, dimensions, and whether a calculator
 * or graph genuinely belongs on its page.
 *
 * The formula centre used to print "Not recorded" in every units cell and then
 * show a SUVAT calculator and a position-time graph regardless of the formula,
 * so the mass-energy page offered to solve v = u + at. A tool that has nothing
 * to do with the equation above it is worse than no tool: it teaches the wrong
 * association right before an exam.
 *
 * Units are not stored separately because they are already in the symbol text
 * every lesson writes -- "final velocity (m/s)". Parsing that keeps one source
 * of truth rather than adding a second that can disagree with the first.
 */

/** SI base dimensions, written the way the IB data booklet writes them. */
const DIMENSIONS = {
  m: 'L', km: 'L', cm: 'L', mm: 'L', nm: 'L',
  s: 'T', ms: 'T', h: 'T',
  kg: 'M', g: 'M', u: 'M',
  A: 'I', C: 'I T',
  K: 'Θ', mol: 'N',
  'm/s': 'L T⁻¹', 'm s^-1': 'L T⁻¹',
  'm/s²': 'L T⁻²', 'm/s^2': 'L T⁻²', 'm s^-2': 'L T⁻²',
  N: 'M L T⁻²',
  J: 'M L² T⁻²', eV: 'M L² T⁻²', MeV: 'M L² T⁻²',
  W: 'M L² T⁻³',
  Pa: 'M L⁻¹ T⁻²',
  Hz: 'T⁻¹', rad: '1', 'rad/s': 'T⁻¹',
  V: 'M L² T⁻³ I⁻¹',
  Ω: 'M L² T⁻³ I⁻²',
  T: 'M T⁻² I⁻¹',
  F: 'M⁻¹ L⁻² T⁴ I²',
  Wb: 'M L² T⁻² I⁻¹',
  'kg/m³': 'M L⁻³',
  'N m': 'M L² T⁻²', 'N/kg': 'L T⁻²', 'N/C': 'M L T⁻³ I⁻¹',
  'J/K': 'M L² T⁻² Θ⁻¹', 'J/kg': 'L² T⁻²',
  Bq: 'T⁻¹', '°': '1', deg: '1',
  // Lessons write units in IB index notation as often as with a solidus.
  'm s⁻¹': 'L T⁻¹', 'm s⁻²': 'L T⁻²', 'rad s⁻¹': 'T⁻¹',
  's⁻¹': 'T⁻¹', 'm²': 'L²', 'm³': 'L³',
  'kg m²': 'M L²', 'kg m/s': 'M L T⁻¹', 'kg m s⁻¹': 'M L T⁻¹',
  'kg m⁻³': 'M L⁻³',
  'W m⁻²': 'M T⁻³', 'W m⁻² K⁻⁴': 'M T⁻³ Θ⁻⁴',
  'J kg⁻¹': 'L² T⁻²', 'J K⁻¹': 'M L² T⁻² Θ⁻¹',
  'J kg⁻¹ K⁻¹': 'L² T⁻² Θ⁻¹', 'J/(kg K)': 'L² T⁻² Θ⁻¹',
  'N kg⁻¹': 'L T⁻²', 'N C⁻¹': 'M L T⁻³ I⁻¹',
  'N m²  kg⁻²': 'M⁻¹ L³ T⁻²', 'N m² kg⁻²': 'M⁻¹ L³ T⁻²',
  'J s': 'M L² T⁻¹',
  'V m⁻¹': 'M L T⁻³ I⁻¹',
  'Ω m': 'M L³ T⁻³ I⁻²',
  'N m² C⁻²': 'M L³ T⁻⁴ I⁻²', 'Nm²/C²': 'M L³ T⁻⁴ I⁻²',
  'T m A⁻¹': 'M L T⁻² I⁻²',
  'mol⁻¹': 'N⁻¹', 'g mol⁻¹': 'M N⁻¹', 'kg mol⁻¹': 'M N⁻¹',
  'J mol⁻¹ K⁻¹': 'M L² T⁻² N⁻¹ Θ⁻¹',
  'kg or u': 'M',
  Js: 'M L² T⁻¹',
  'rad/s²': 'T⁻²', 'rad s⁻²': 'T⁻²',
  'N m² kg⁻²': 'M⁻¹ L³ T⁻²',
  'kg m² s⁻¹': 'M L² T⁻¹',
  'N/m': 'M T⁻²', 'N m⁻¹': 'M T⁻²',
  'K or °C': 'Θ', '°C': 'Θ',
};

/** Quantities that are ratios or counts, so they carry no unit at all. */
const DIMENSIONLESS = /^(lorentz factor|albedo|emissivity|refractive index|whole number|integer|principal quantum number|order|magnification|efficiency|coefficient of|power factor|relative)/i;

/** Counting quantities: turns, harmonics, particle and nucleon numbers. */
const COUNT = /^(number of|harmonic number|proton number|neutron number|nucleon number|mass number|odd values|\d+, \d+, \d+)/i;

/** Angles are quoted in degrees throughout the course. */
const ANGLE = /^angle\b|^(diffraction angle|angle of incidence|angle of refraction|phase angle)/i;

/** Pulls "(m/s)" out of "final velocity (m/s)". */
export function unitOf(meaning) {
  const text = String(meaning || '').trim();
  // A ratio or a count has no unit, and saying so is more useful than a dash.
  if (DIMENSIONLESS.test(text) || COUNT.test(text)) return 'dimensionless';
  if (ANGLE.test(text)) return '°';

  const match = /\(([^)]+)\)\s*$/.exec(text);
  if (!match) return null;
  const inner = match[1].trim();

  // "(dimensionless)" and "(no unit)" are statements about units, not units.
  if (/^(dimensionless|no unit|unitless|ratio|none)$/i.test(inner)) return 'dimensionless';

  // Constants carry their value in the bracket -- "Planck constant
  // (6.63 × 10⁻³⁴ J s)". The unit is the tail after the numeric part.
  if (/[0-9]/.test(inner) && /[×x]\s*10|^[≈~]?\s*\d/.test(inner)) {
    // A plain magnitude with no power of ten: "8.31 J mol⁻¹ K⁻¹", "≈ 1360 W m⁻²".
    // Only when no "× 10" follows, or this would swallow the exponent itself.
    if (!/[×x]\s*10/.test(inner)) {
      const plain = /^[≈~]?\s*[\d.]+\s+(\D.*)$/.exec(inner);
      if (plain) return plain[1].trim();
    }
    // Superscript digits are split across two Unicode blocks: ¹²³ sit in
    // Latin-1 while ⁰ and ⁴-⁹ sit in Superscripts and Subscripts, so a plain
    // ⁰-⁹ range silently misses 10⁻³⁴.
    const tail = /(?:10[⁻¹²³⁰⁴-⁹^0-9-]*)\s+(.+)$/.exec(inner);
    if (tail) return tail[1].trim();
    return null;
  }

  // Reject parentheticals that are prose rather than a unit.
  if (/\s(of|the|in|from|to)\s/i.test(inner) || inner.split(/\s+/).length > 4) return null;
  return inner;
}

export function dimensionOf(unit) {
  if (!unit) return null;
  if (unit === 'dimensionless') return '1';
  return DIMENSIONS[unit] || null;
}

/** The meaning with its trailing unit removed, so the table does not repeat it. */
export const meaningOf = meaning => String(meaning || '').replace(/\s*\(([^)]+)\)\s*$/, '').trim();

/**
 * Which variables a formula actually contains. A calculator or graph is only
 * offered when the formula's own symbols match what that tool solves.
 */
const SUVAT = new Set(['v', 'u', 'a', 't', 's']);

export function calculatorFits(formula) {
  const symbols = Object.keys(formula?.symbols || {});
  if (symbols.length < 3) return false;
  // Every symbol must be a SUVAT quantity, not merely overlap with one.
  return symbols.every(symbol => SUVAT.has(symbol));
}

/** Topic keywords each graph model genuinely describes. */
const GRAPH_TOPICS = {
  shm: /harmonic|oscillat|pendulum|spring/i,
  wave: /wave|sound|interference|diffract|standing/i,
  field: /electric field|gravitational field|field strength|potential/i,
  thermal: /thermal|gas law|ideal gas|thermodynam|entropy/i,
  decay: /decay|radioactiv|half-life|nuclear/i,
  motion: /kinematic|projectile|velocity|acceleration|displacement|suvat/i,
};

/** True when a graph model describes this formula, rather than merely existing. */
export function graphFits(config, formula) {
  if (!config) return false;
  const pattern = GRAPH_TOPICS[config.id];
  if (!pattern) return false;
  const haystack = `${formula?.name || ''} ${formula?.topic || ''} ${formula?.explanation || ''}`;
  return pattern.test(haystack);
}
