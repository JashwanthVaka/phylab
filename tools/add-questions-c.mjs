/**
 * Tops up the topics that were thinnest — electromagnetic waves, rigid body
 * mechanics, relativity, the greenhouse effect, thermodynamics, wave phenomena
 * and magnetic fields all had two or three questions.
 *
 * Run once:  node tools/add-questions-c.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'questions.json');
const bank = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const before = bank.length;
let nextId = Math.max(...bank.map(q => q.id)) + 1;
const add = q => bank.push({ id: nextId++, ...q });

/* ── Electromagnetic Waves ────────────────────────────────────────────── */
add({ topic: 'Electromagnetic Waves', level: 'SL', difficulty: 'easy', marks: 2,
  question: 'Calculate the wavelength of a 900 MHz radio signal. Use c = 3.00 × 10^8 m/s. Give your answer in m.',
  answer: '0.33 m', unit: 'm', tolerance: 0.02,
  solution: 'λ = c/f = 3.00 × 10^8 / 9.00 × 10^8 = 0.33 m.',
  lessonReferences: ['electromagnetic-waves'], tags: ['wave-equation', 'calculation'] });

add({ topic: 'Electromagnetic Waves', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Explain why a 900 MHz signal gives better coverage behind a hill than a 3.5 GHz signal.',
  answer: 'Its wavelength is nearly four times longer, and diffraction is more pronounced when the wavelength is comparable to the size of the obstacle',
  solution: 'λ = 0.33 m at 900 MHz against 0.086 m at 3.5 GHz. Waves spread most around obstacles comparable to their wavelength, so the longer wave bends further into the shadow behind the hill.',
  lessonReferences: ['electromagnetic-waves', 'wave-phenomena'], tags: ['diffraction', 'explanation'] });

add({ topic: 'Electromagnetic Waves', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'Which property is the same for all electromagnetic waves in a vacuum?',
  options: ['Their speed', 'Their wavelength', 'Their frequency', 'Their photon energy'],
  correctAnswer: 'Their speed',
  answer: 'Their speed',
  solution: 'All electromagnetic waves travel at c = 3.00 × 10^8 m/s in a vacuum. They differ in frequency and wavelength, and therefore in photon energy.',
  lessonReferences: ['electromagnetic-waves'], tags: ['spectrum', 'concept'] });

add({ topic: 'Electromagnetic Waves', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Signal intensity 100 m from a transmitter is 4.0 × 10^-6 W/m². Calculate the intensity at 300 m. Give your answer in W/m².',
  answer: '4.4e-7 W/m2', unit: 'W/m2', tolerance: 5e-8,
  solution: 'Intensity falls as 1/r². Tripling the distance divides the intensity by 9: 4.0 × 10^-6 / 9 = 4.4 × 10^-7 W/m².',
  lessonReferences: ['electromagnetic-waves'], tags: ['inverse-square', 'calculation'] });

add({ topic: 'Electromagnetic Waves', level: 'SL', difficulty: 'medium', marks: 2,
  question: 'State why an electromagnetic wave can travel through a vacuum but a sound wave cannot.',
  answer: 'An electromagnetic wave is oscillating electric and magnetic fields, which need no medium, while sound is a mechanical oscillation of particles and needs one',
  solution: 'Sound is a longitudinal wave in matter: without particles there is nothing to compress. An electromagnetic wave is a self-sustaining oscillation of fields, so empty space is no obstacle.',
  lessonReferences: ['electromagnetic-waves', 'wave-properties'], tags: ['spectrum', 'explanation'] });

/* ── Rigid Body Mechanics ─────────────────────────────────────────────── */
add({ topic: 'Rigid Body Mechanics', level: 'HL', difficulty: 'medium', marks: 2,
  question: 'A net torque of 8.0 N m acts on a body of moment of inertia 2.0 kg m². Calculate its angular acceleration. Give your answer in rad/s^2.',
  answer: '4.0 rad/s^2', unit: 'rad/s^2', tolerance: 0.2,
  solution: 'Στ = Iα, so α = 8.0/2.0 = 4.0 rad/s². This is the rotational form of ΣF = ma.',
  lessonReferences: ['rigid-body-mechanics'], tags: ['rotational-dynamics', 'calculation'] });

add({ topic: 'Rigid Body Mechanics', level: 'HL', difficulty: 'medium', marks: 2,
  question: 'A flywheel of moment of inertia 2.0 kg m² spins at 5.0 rad/s. Calculate its angular momentum. Give your answer in kg m^2/s.',
  answer: '10 kg m^2/s', unit: 'kg m^2/s', tolerance: 0.5,
  solution: 'L = Iω = 2.0 × 5.0 = 10 kg m² s⁻¹.',
  lessonReferences: ['rigid-body-mechanics'], tags: ['angular-momentum', 'calculation'] });

add({ topic: 'Rigid Body Mechanics', level: 'HL', difficulty: 'hard', marks: 4,
  question: 'A skater pulls their arms in and spins faster. Explain what happens to their angular momentum and rotational kinetic energy.',
  answer: 'Angular momentum is conserved because no external torque acts, so reducing I raises ω; rotational kinetic energy increases, paid for by the work the skater does pulling their arms in',
  solution: 'L = Iω stays constant, so a smaller I means a larger ω. Rotational kinetic energy is ½Iω² = L²/2I, which rises as I falls. The extra energy comes from the skater’s muscles doing work against the outward force needed to pull the arms inwards.',
  lessonReferences: ['rigid-body-mechanics'], tags: ['angular-momentum', 'explanation'] });

add({ topic: 'Rigid Body Mechanics', level: 'HL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'A body has zero resultant force but is still starting to rotate. What must be true?',
  options: [
    'The forces form a couple, so the resultant torque is not zero',
    'The body has no mass',
    'The forces are all applied at the centre of mass',
    'The body is in complete equilibrium'
  ],
  correctAnswer: 'The forces form a couple, so the resultant torque is not zero',
  answer: 'The forces form a couple, so the resultant torque is not zero',
  solution: 'Full equilibrium needs both ΣF = 0 and Στ = 0. Two equal and opposite forces along different lines of action give zero resultant force but a non-zero turning effect.',
  lessonReferences: ['rigid-body-mechanics'], tags: ['equilibrium', 'concept'] });

add({ topic: 'Rigid Body Mechanics', level: 'HL', difficulty: 'hard', marks: 3,
  question: 'Explain why a hoop rolls down a slope more slowly than a solid cylinder of the same mass and radius.',
  answer: 'The hoop has a larger moment of inertia because its mass sits at the rim, so more of the released potential energy goes into rotation and less into translation',
  solution: 'A rolling body has ½mv² of translational and ½Iω² of rotational kinetic energy. For a hoop I = mr², for a solid cylinder I = ½mr². With the same energy released, the hoop puts a larger share into spin, so its centre of mass moves more slowly.',
  lessonReferences: ['rigid-body-mechanics'], tags: ['moment-of-inertia', 'explanation'] });

/* ── Relativity ───────────────────────────────────────────────────────── */
add({ topic: 'Relativity', level: 'HL', difficulty: 'medium', marks: 3,
  question: 'A rod of proper length 2.0 m moves at 0.80c along its own length. Calculate the length measured by a stationary observer. Give your answer in m.',
  answer: '1.2 m', unit: 'm', tolerance: 0.1,
  solution: 'γ = 1/sqrt(1 − 0.64) = 1/0.6 = 1.667. L = L₀/γ = 2.0/1.667 = 1.2 m. Contraction happens only along the direction of motion.',
  lessonReferences: ['relativity'], tags: ['length-contraction', 'calculation'] });

add({ topic: 'Relativity', level: 'HL', difficulty: 'hard', marks: 4,
  question: 'Explain how cosmic ray muons reaching the ground provide evidence for special relativity.',
  answer: 'Their measured lifetime is far too short to cross the atmosphere at their speed, yet they arrive; from the ground frame their lifetime is dilated, and from the muon frame the atmosphere is contracted',
  solution: 'At their lifetime and speed a muon should decay long before reaching sea level, but large numbers arrive. In the ground frame the muon’s clock runs slow, so it survives longer. In the muon’s frame the atmosphere is length-contracted, so there is less distance to cross. Both descriptions give the same result, which is the point.',
  lessonReferences: ['relativity'], tags: ['time-dilation', 'evidence'] });

add({ topic: 'Relativity', level: 'HL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'Two spacecraft each travel at 0.90c towards each other. What speed does one measure for the other?',
  options: ['About 0.994c', 'Exactly 1.80c', 'Exactly 0.90c', 'Exactly c'],
  correctAnswer: 'About 0.994c',
  answer: 'About 0.994c',
  solution: 'Relativistic velocity addition gives u′ = (u+v)/(1+uv/c²) = 1.8c/1.81 ≈ 0.994c. Velocities never simply add, and the result can never exceed c.',
  lessonReferences: ['relativity'], tags: ['velocity-addition', 'concept'] });

add({ topic: 'Relativity', level: 'HL', difficulty: 'medium', marks: 3,
  question: 'State what is meant by a proper time interval and by proper length.',
  answer: 'Proper time is the interval measured by a single clock present at both events; proper length is the length measured in the frame where the object is at rest',
  solution: 'Every other frame measures a longer time interval and a shorter length. Identifying which quantity is the proper one is the first step in any dilation or contraction problem, because the proper value is always the one multiplied or divided by γ.',
  lessonReferences: ['relativity'], tags: ['definitions', 'concept'] });

/* ── Greenhouse Effect ────────────────────────────────────────────────── */
add({ topic: 'Greenhouse Effect', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'The solar constant is 1360 W/m² and Earth’s albedo is 0.30. Calculate the average intensity absorbed per square metre of Earth’s surface. Give your answer in W/m².',
  answer: '238 W/m2', unit: 'W/m2', tolerance: 8,
  solution: 'I = S(1 − α)/4 = 1360 × 0.70/4 = 238 W/m². The factor of four is geometric: the Earth intercepts over a disc πR² but radiates from a sphere 4πR².',
  lessonReferences: ['greenhouse-effect'], tags: ['energy-balance', 'calculation'] });

add({ topic: 'Greenhouse Effect', level: 'SL', difficulty: 'medium', marks: 2,
  question: 'Define albedo.',
  answer: 'The fraction of incident radiation reflected by a surface rather than absorbed',
  solution: 'Albedo runs from 0 to 1 and has no units. It is high for ice and cloud and low for ocean and forest, which is why melting ice raises absorbed intensity and warms the planet further.',
  lessonReferences: ['greenhouse-effect'], tags: ['albedo', 'definition'] });

add({ topic: 'Greenhouse Effect', level: 'SL', difficulty: 'hard', marks: 4,
  question: 'Explain the mechanism by which greenhouse gases raise the surface temperature of the Earth.',
  answer: 'They are transparent to incoming short-wavelength solar radiation but absorb the long-wavelength infrared the surface re-emits, because those photons match the natural vibrational frequencies of the molecules, and they re-radiate it in all directions including back to the surface',
  solution: 'The Sun at about 5800 K peaks in the visible, which passes through. The surface at about 288 K peaks in the infrared. Greenhouse gas molecules have vibrational modes at infrared frequencies, so they absorb that radiation and re-emit it in all directions. The downward share means the surface settles at a higher temperature than the bare energy balance predicts.',
  lessonReferences: ['greenhouse-effect'], tags: ['greenhouse', 'explanation'] });

add({ topic: 'Greenhouse Effect', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'Why is nitrogen not a significant greenhouse gas despite making up most of the atmosphere?',
  options: [
    'It is a symmetric diatomic molecule with no changing dipole moment, so it does not absorb infrared',
    'It is too light to absorb radiation',
    'It sits too high in the atmosphere to matter',
    'It reflects infrared rather than absorbing it'
  ],
  correctAnswer: 'It is a symmetric diatomic molecule with no changing dipole moment, so it does not absorb infrared',
  answer: 'It is a symmetric diatomic molecule with no changing dipole moment, so it does not absorb infrared',
  solution: 'Absorbing infrared requires a vibration that changes the molecule’s dipole moment. A symmetric molecule such as N₂ or O₂ has none, so it is transparent to infrared however abundant it is.',
  lessonReferences: ['greenhouse-effect'], tags: ['greenhouse-gases', 'concept'] });

/* ── Thermodynamics ──────────────────────────────────────────────────── */
add({ topic: 'Thermodynamics', level: 'HL', difficulty: 'medium', marks: 3,
  question: 'A gas expands at a constant pressure of 1.0 × 10^5 Pa, increasing its volume by 2.0 × 10^-3 m³. Calculate the work done by the gas. Give your answer in J.',
  answer: '200 J', unit: 'J', tolerance: 8,
  solution: 'W = pΔV = 1.0 × 10^5 × 2.0 × 10^-3 = 200 J. The gas does work on its surroundings, so W is positive in the convention ΔU = Q − W.',
  lessonReferences: ['thermodynamics'], tags: ['work', 'calculation'] });

add({ topic: 'Thermodynamics', level: 'HL', difficulty: 'medium', marks: 3,
  question: 'A heat engine takes 1200 J from a hot reservoir and rejects 800 J to a cold one. Calculate its efficiency as a percentage.',
  answer: '33 %', unit: '%', tolerance: 2,
  solution: 'W = 1200 − 800 = 400 J, so η = W/Q_H = 400/1200 = 0.33, which is 33%. The second law forbids converting all of the input.',
  lessonReferences: ['thermodynamics'], tags: ['heat-engines', 'calculation'] });

add({ topic: 'Thermodynamics', level: 'HL', difficulty: 'hard', marks: 4,
  question: 'An ideal gas is compressed adiabatically. Explain what happens to its temperature.',
  answer: 'It rises, because Q = 0 so the work done on the gas goes entirely into internal energy',
  solution: 'Adiabatic means Q = 0, so from Q = ΔU + W we get ΔU = −W. Compression means the gas has work done on it, so W (work done by the gas) is negative and ΔU is positive. Internal energy rises, and for an ideal gas that means temperature rises.',
  lessonReferences: ['thermodynamics'], tags: ['adiabatic', 'explanation'] });

add({ topic: 'Thermodynamics', level: 'HL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'During an isothermal expansion of an ideal gas, which statement is correct?',
  options: [
    'ΔU = 0, so all the energy supplied does work',
    'Q = 0, so the temperature falls',
    'W = 0, so all the energy raises internal energy',
    'Both Q and W are zero'
  ],
  correctAnswer: 'ΔU = 0, so all the energy supplied does work',
  answer: 'ΔU = 0, so all the energy supplied does work',
  solution: 'Isothermal means constant temperature, and for an ideal gas internal energy depends only on temperature, so ΔU = 0 and Q = W. The process must be slow and in good thermal contact for the temperature to stay fixed.',
  lessonReferences: ['thermodynamics'], tags: ['isothermal', 'concept'] });

add({ topic: 'Thermodynamics', level: 'HL', difficulty: 'medium', marks: 3,
  question: 'A freezer makes ice, lowering the entropy of the water. Explain why this does not break the second law.',
  answer: 'The second law applies to an isolated system as a whole, and the freezer expels more entropy to the room than it removes from the water',
  solution: 'A local entropy decrease is allowed provided it is more than offset elsewhere. The freezer does work and dumps heat into the kitchen, raising the surroundings’ entropy by more than the water’s falls, so the total still increases.',
  lessonReferences: ['thermodynamics'], tags: ['entropy', 'explanation'] });

/* ── Wave Phenomena ──────────────────────────────────────────────────── */
add({ topic: 'Wave Phenomena', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Light passes from glass of refractive index 1.50 into air. Calculate the critical angle. Give your answer in degrees.',
  answer: '41.8 degrees', unit: 'degrees', tolerance: 1,
  solution: 'sin θc = n₂/n₁ = 1.00/1.50 = 0.667, so θc = 41.8°. Total internal reflection needs light going from a denser to a less dense medium.',
  lessonReferences: ['wave-phenomena'], tags: ['total-internal-reflection', 'calculation'] });

add({ topic: 'Wave Phenomena', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'In a double-slit experiment the slits are 0.50 mm apart and the screen is 2.0 m away. Light of wavelength 600 nm is used. Calculate the fringe spacing. Give your answer in mm.',
  answer: '2.4 mm', unit: 'mm', tolerance: 0.2,
  solution: 's = λD/d = (600 × 10^-9 × 2.0)/(0.50 × 10^-3) = 2.4 × 10^-3 m = 2.4 mm. Check the answer is in millimetres; an answer in metres or micrometres means d and D have been swapped.',
  lessonReferences: ['wave-phenomena'], tags: ['interference', 'calculation'] });

add({ topic: 'Wave Phenomena', level: 'SL', difficulty: 'medium', marks: 2,
  question: 'State the condition on path difference for destructive interference.',
  answer: 'The path difference is an odd number of half wavelengths, (n + 1/2)λ',
  solution: 'Constructive interference needs a whole number of wavelengths, nλ. Destructive needs the waves to arrive antiphase, which is (n + ½)λ.',
  lessonReferences: ['wave-phenomena'], tags: ['interference', 'concept'] });

add({ topic: 'Wave Phenomena', level: 'HL', difficulty: 'hard', marks: 3,
  question: 'A single slit of width 0.10 mm is illuminated with 600 nm light. Calculate the angle to the first minimum. Give your answer in radians.',
  answer: '0.006 radians', unit: 'radians', tolerance: 0.0008,
  solution: 'θ = λ/b = 600 × 10^-9 / 1.0 × 10^-4 = 6.0 × 10^-3 rad. Note this gives the first minimum, not a maximum, and the central peak is twice as wide as the others.',
  lessonReferences: ['wave-phenomena'], tags: ['diffraction', 'calculation'] });

/* ── Magnetic Fields ─────────────────────────────────────────────────── */
add({ topic: 'Magnetic Fields', level: 'SL', difficulty: 'medium', marks: 2,
  question: 'A wire of length 0.25 m carrying 4.0 A lies at 30° to a 0.20 T magnetic field. Calculate the force on it. Give your answer in N.',
  answer: '0.10 N', unit: 'N', tolerance: 0.01,
  solution: 'F = BIL sinθ = 0.20 × 4.0 × 0.25 × sin30° = 0.20 × 4.0 × 0.25 × 0.5 = 0.10 N.',
  lessonReferences: ['magnetic-fields'], tags: ['motor-effect', 'calculation'] });

add({ topic: 'Magnetic Fields', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'A charged particle travels parallel to a uniform magnetic field. What is the magnetic force on it?',
  options: ['Zero', 'Maximum', 'Half its maximum value', 'Directed along the field'],
  correctAnswer: 'Zero',
  answer: 'Zero',
  solution: 'F = qvB sinθ, and sin0° = 0. The force is maximum when the velocity is perpendicular to the field and zero when parallel — the opposite of what many expect.',
  lessonReferences: ['magnetic-fields'], tags: ['magnetic-force', 'concept'] });

add({ topic: 'Magnetic Fields', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Describe the magnetic field pattern around a long straight current-carrying wire.',
  answer: 'Concentric circles centred on the wire, in a plane perpendicular to it, with the direction given by the right-hand grip rule and the field weakening with distance',
  solution: 'Grip the wire with the right hand, thumb along the conventional current, and the fingers curl in the field direction. The field strength falls as 1/r, so the circles are drawn further apart further from the wire.',
  lessonReferences: ['magnetic-fields'], tags: ['field-patterns', 'description'] });

fs.writeFileSync(FILE, JSON.stringify(bank, null, 2) + '\n');
console.log(`questions.json: ${bank.length} total (added ${bank.length - before})`);
