/**
 * Repairs D.1 Gravitation and two physically absurd worked examples.
 *
 * fields.json was a general "Fields" overview filed under Wave Behaviour.
 * Re-filing it as D.1 Gravitation left it incoherent: its objectives asked
 * the reader to "explain electric fields", its first worked example was an
 * electric-field calculation copied verbatim from the Electric Fields
 * lesson, and it carried thin duplicate sections on electric fields,
 * magnetic fields and induction that D.2, D.3 and D.5 now cover in full.
 *
 * Separately, several worked examples used charges of 2 C, 3 C and 5 C.
 * A coulomb is an enormous charge — two 2 C point charges 4 m apart would
 * repel with about 3 billion newtons — so those are rewritten with the
 * microcoulomb values such problems actually use.
 *
 * Run once:  node tools/fix-gravitation-lesson.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'lessons');
const read = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const write = (f, o) => fs.writeFileSync(path.join(DIR, f), JSON.stringify(o, null, 2) + '\n');

/* ── D.1 Gravitation ─────────────────────────────────────────────────── */
const g = read('fields.json');

g.introduction = 'Gravitation is the force every mass exerts on every other mass, and the field is the way that influence is described at a distance. This lesson builds from the inverse-square law to field strength, then applies both to orbits — why a satellite stays up, what sets its speed, and how Kepler’s laws follow from Newton’s.';

g.learning_objectives = [
  'Understand the concept of a field as action at a distance.',
  'Apply Newton’s law of gravitation.',
  'Apply the concept of gravitational field strength.',
  'Interpret gravitational field diagrams.',
  'Explain orbital motion using centripetal force.',
  'Use Kepler’s laws of planetary motion.',
  'Apply gravitational potential and potential energy (HL).',
];

// The first example was an electric-field problem; both are now gravitational.
g.worked_examples = [
  {
    question: 'The gravitational field strength at the surface of a planet is 3.7 N kg⁻¹. Calculate the weight of a 60 kg astronaut standing on it.',
    solution: ['Use W = mg', 'W = 60 × 3.7'],
    answer: '222 N, which is about a fifth of their weight on Earth',
  },
  {
    question: 'Calculate the gravitational field strength at a point where a 10 kg mass experiences a force of 98 N.',
    solution: ['Use g = F/m', 'g = 98/10'],
    answer: '9.8 N kg⁻¹',
  },
  {
    question: 'A satellite orbits 400 km above the Earth’s surface. Taking the Earth’s radius as 6.37 × 10⁶ m and GM = 3.99 × 10¹⁴ m³ s⁻², calculate its orbital speed.',
    solution: [
      'The orbital radius is measured from the centre: r = 6.37 × 10⁶ + 4.00 × 10⁵ = 6.77 × 10⁶ m',
      'Use v = √(GM/r)',
      'v = √(3.99 × 10¹⁴ / 6.77 × 10⁶) = √(5.89 × 10⁷)',
    ],
    answer: 'About 7.68 × 10³ m s⁻¹',
  },
];

// Covered in full by D.2, D.3 and D.5 — duplicates here made the lesson incoherent.
delete g.electric_fields;
delete g.magnetic_fields;
delete g.electromagnetic_induction;

g.definitions = [
  { term: 'Field', meaning: 'A region of space where an object experiences a force due to another object or source.' },
  { term: 'Gravitational Field Strength', meaning: 'The gravitational force per unit mass at a point, in N kg⁻¹, numerically equal to the free-fall acceleration.' },
  { term: 'Field Line', meaning: 'A line showing the direction of the force on a test object, with closer spacing indicating a stronger field.' },
  { term: 'Gravitational Potential', meaning: 'The work done per unit mass to bring a small mass from infinity to a point, defined as zero at infinity and therefore always negative.' },
  { term: 'Escape Speed', meaning: 'The launch speed at which an object just reaches infinity with no kinetic energy remaining.' },
  { term: 'Geostationary Orbit', meaning: 'An equatorial orbit with a period of exactly one day, so the satellite stays above the same point on the Earth’s surface.' },
];

g.field_diagrams = (g.field_diagrams || []).filter(d => /gravitat/i.test(d.type || ''));

g.common_mistakes = [
  'Confusing gravitational field strength with gravitational potential — one is force per unit mass, the other energy per unit mass.',
  'Measuring r from the surface of a planet instead of from its centre.',
  'Forgetting that gravitational potential and potential energy are negative, because they are defined as zero at infinity.',
  'Using the 1/r² dependence for potential; the field goes as 1/r² but the potential goes as 1/r.',
  'Thinking a satellite in a lower orbit moves more slowly — it actually moves faster, though it has less total energy.',
  'Assuming escape speed depends on the mass of the escaping object; it does not.',
];

g.ib_exam_tips = [
  'Always measure r from the centre of the body, adding the planetary radius to any stated altitude.',
  'State that gravity provides the centripetal force before equating the two expressions in an orbit question.',
  'Draw gravitational field lines pointing inwards, since gravity is only ever attractive.',
  'Keep the negative sign on potential and potential energy.',
  'Check the powers: field and force go as 1/r², potential and potential energy as 1/r.',
];

g.hl_extension = [
  { topic: 'Gravitational Potential', formula: 'V_g = −GM / r',
    variables: { 'V_g': 'gravitational potential (J kg⁻¹)', M: 'mass creating the field (kg)', r: 'distance from its centre (m)' },
    explanation: 'Energy per unit mass, zero at infinity and negative everywhere else because work must be done to escape.' },
  { topic: 'Gravitational Potential Energy in Orbits', formula: 'E_p = −GMm / r',
    variables: { 'E_p': 'potential energy (J)', M: 'central mass (kg)', m: 'orbiting mass (kg)', r: 'orbital radius (m)' },
    explanation: 'The negative value shows the pair is bound; a bound orbit has negative total energy.' },
  { topic: 'Escape Speed', formula: 'v_esc = √(2GM / R)',
    variables: { 'v_esc': 'escape speed (m s⁻¹)', M: 'mass of the body (kg)', R: 'its radius (m)' },
    explanation: 'Found by setting the total energy to zero. Independent of the escaping object’s mass.' },
];

g.practice_questions = [
  { level: 'Easy', question: 'State what a gravitational field line represents.', answer: 'The direction of the gravitational force on a small test mass, with closer spacing showing a stronger field.' },
  { level: 'Medium', question: 'Why do satellites remain in orbit around the Earth?', answer: 'Gravity provides exactly the centripetal force required for circular motion at that radius, so the satellite continually falls towards the Earth while moving fast enough sideways to keep missing it.' },
  { level: 'Medium', question: 'Explain why the gravitational field strength at the top of a mountain is slightly less than at sea level.', answer: 'Field strength is GM/r² and r is measured from the centre of the Earth. At the top of a mountain r is larger, so g is smaller.' },
  { level: 'HL', question: 'Explain why a satellite in a lower orbit travels faster yet has less total energy.', answer: 'Orbital speed is √(GM/r), which increases as r falls. Total energy is −GMm/2r, which becomes more negative as r falls, so the total energy is lower despite the greater speed.' },
];

write('fields.json', g);
console.log('D.1 Gravitation repaired:');
console.log('   worked example 1 was an electric-field problem  ->  now gravitational');
console.log('   dropped duplicate sections: electric_fields, magnetic_fields, electromagnetic_induction');
console.log('   objectives, definitions, mistakes, tips, HL and practice all re-aimed at gravitation');

/* ── Physically absurd charges ───────────────────────────────────────── */
const e = read('electric_fields.json');
e.worked_examples = [
  {
    question: 'Two point charges of +2.0 μC and +3.0 μC are separated by 4.0 cm. Calculate the electrostatic force between them.',
    solution: [
      'Use F = kQ₁Q₂/r² with r = 0.040 m',
      'F = (8.99 × 10⁹ × 2.0 × 10⁻⁶ × 3.0 × 10⁻⁶) / (0.040)²',
      'F = 5.394 × 10⁻² / 1.6 × 10⁻³',
    ],
    answer: 'About 34 N, repulsive since both charges are positive',
  },
  {
    question: 'A charge of 5.0 μC experiences a force of 0.20 N in an electric field. Calculate the electric field strength.',
    solution: ['Use E = F/Q', 'E = 0.20 / (5.0 × 10⁻⁶)'],
    answer: '4.0 × 10⁴ N C⁻¹, equivalently 4.0 × 10⁴ V m⁻¹',
  },
];
write('electric_fields.json', e);

const m = read('magnetic_fields.json');
m.worked_examples = [
  {
    question: 'A charge of 2.0 μC moves at 5.0 × 10⁴ m s⁻¹ perpendicular to a magnetic field of flux density 0.30 T. Calculate the magnetic force on it.',
    solution: ['Use F = BQv sinθ with θ = 90° so sinθ = 1', 'F = 0.30 × 2.0 × 10⁻⁶ × 5.0 × 10⁴'],
    answer: '0.030 N, directed perpendicular to both the velocity and the field',
  },
  ...(m.worked_examples || []).slice(1),
];
write('magnetic_fields.json', m);

console.log('\nUnrealistic charges corrected:');
console.log('   D.2 Electric Fields: 2 C and 3 C at 4 m (gave 3.4 billion N)  ->  2.0 μC and 3.0 μC at 4.0 cm (34 N)');
console.log('   D.2 Electric Fields: 5 C test charge  ->  5.0 μC');
console.log('   D.3 Magnetic Fields: 2 C charge  ->  2.0 μC at a realistic speed');
