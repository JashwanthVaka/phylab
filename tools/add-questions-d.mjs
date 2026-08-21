/**
 * Fourth batch: lifts the remaining thin topics so no lesson sits below six
 * questions, and deepens the units students find hardest.
 *
 * Run once:  node tools/add-questions-d.mjs
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

/* ── Thermal Physics ─────────────────────────────────────────────────── */
add({ topic: 'Thermal Physics', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Calculate the energy needed to turn 0.30 kg of water at 100 °C into steam at 100 °C. The specific latent heat of vaporisation is 2.26 × 10^6 J/kg. Give your answer in J.',
  answer: '678000 J', unit: 'J', tolerance: 15000,
  solution: 'Q = mL = 0.30 × 2.26 × 10^6 = 6.78 × 10^5 J. No mcΔT term appears because the temperature does not change during boiling.',
  lessonReferences: ['thermal-physics'], tags: ['latent-heat', 'calculation'] });

add({ topic: 'Thermal Physics', level: 'SL', difficulty: 'medium', marks: 2,
  question: 'A body at 400 K has its absolute temperature doubled. By what factor does its radiated power increase?',
  answer: '16', unit: '', tolerance: 0.5,
  solution: 'P = eσAT⁴, so doubling T multiplies the power by 2⁴ = 16. The fourth power is why small temperature rises matter so much for radiation.',
  lessonReferences: ['thermal-physics'], tags: ['stefan-boltzmann', 'calculation'] });

add({ topic: 'Thermal Physics', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'Which method of thermal energy transfer requires no medium?',
  options: ['Radiation', 'Conduction', 'Convection', 'All three require a medium'],
  correctAnswer: 'Radiation',
  answer: 'Radiation',
  solution: 'Radiation is electromagnetic, so it crosses a vacuum — which is how the Sun heats the Earth. Conduction needs particles in contact and convection needs a fluid to move.',
  lessonReferences: ['thermal-physics'], tags: ['heat-transfer', 'concept'] });

add({ topic: 'Thermal Physics', level: 'SL', difficulty: 'hard', marks: 3,
  question: 'Explain why a bath of warm water contains more internal energy than a spark at 1000 °C.',
  answer: 'Temperature measures the average kinetic energy per particle, but internal energy is the total over all particles, and the bath has vastly more of them',
  solution: 'The spark has a far higher energy per particle, but it contains a minute number of particles. The bath contains an enormous number, so the sum of their energies is much larger. Temperature and internal energy are different quantities.',
  lessonReferences: ['thermal-physics'], tags: ['internal-energy', 'explanation'] });

/* ── Gas Laws ────────────────────────────────────────────────────────── */
add({ topic: 'Gas Laws', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'A tyre is inflated to 220 kPa at 15 °C. After driving it reaches 45 °C. Calculate the new pressure at constant volume. Give your answer in kPa.',
  answer: '243 kPa', unit: 'kPa', tolerance: 6,
  solution: 'Convert to kelvin: T₁ = 288 K, T₂ = 318 K. At constant volume p₁/T₁ = p₂/T₂, so p₂ = 220 × 318/288 = 243 kPa. Using Celsius would give a badly wrong answer.',
  lessonReferences: ['gas-laws'], tags: ['pressure-law', 'calculation'] });

add({ topic: 'Gas Laws', level: 'SL', difficulty: 'medium', marks: 2,
  question: 'Calculate the number of moles in 88 g of carbon dioxide, molar mass 44 g/mol. Give your answer in mol.',
  answer: '2.0 mol', unit: 'mol', tolerance: 0.1,
  solution: 'n = m/M = 88/44 = 2.0 mol. That is 2.0 × 6.02 × 10^23 = 1.2 × 10^24 molecules.',
  lessonReferences: ['gas-laws'], tags: ['moles', 'calculation'] });

add({ topic: 'Gas Laws', level: 'SL', difficulty: 'hard', marks: 3,
  question: 'Helium and xenon are held at the same temperature. Compare the average kinetic energy and the average speed of their molecules.',
  answer: 'The average kinetic energies are equal because both depend only on temperature, but helium molecules move faster because they are much lighter',
  solution: 'Average kinetic energy is (3/2)k_BT, which contains no mass term, so equal temperature means equal average kinetic energy. Since Ek = ½mv², the lighter helium must have the larger average speed.',
  lessonReferences: ['gas-laws'], tags: ['kinetic-theory', 'comparison'] });

add({ topic: 'Gas Laws', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'State two conditions under which a real gas stops behaving like an ideal gas.',
  answer: 'At high pressure, where molecular volume is no longer negligible, and at low temperature, where intermolecular attractions matter and the gas approaches liquefaction',
  solution: 'The ideal model assumes point-like molecules with no forces between them except during collisions. Both assumptions fail when molecules are crowded together or moving slowly enough for attractions to take hold.',
  lessonReferences: ['gas-laws'], tags: ['ideal-gas', 'concept'] });

/* ── Simple Harmonic Motion ──────────────────────────────────────────── */
add({ topic: 'Simple Harmonic Motion', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'A pendulum has a period of 2.0 s. Calculate its length. Take g = 9.81 m/s². Give your answer in m.',
  answer: '0.99 m', unit: 'm', tolerance: 0.05,
  solution: 'T = 2π√(L/g), so L = gT²/4π² = 9.81 × 4.0 / 39.48 = 0.99 m. The mass of the bob does not appear.',
  lessonReferences: ['simple-harmonic-motion'], tags: ['pendulum', 'calculation'] });

add({ topic: 'Simple Harmonic Motion', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'At which point in simple harmonic motion is the acceleration greatest?',
  options: [
    'At maximum displacement',
    'At the equilibrium position',
    'Halfway between them',
    'The acceleration is constant throughout'
  ],
  correctAnswer: 'At maximum displacement',
  answer: 'At maximum displacement',
  solution: 'a = −ω²x, so acceleration is proportional to displacement. It is greatest at the extremes, where the speed is momentarily zero, and zero at equilibrium, where the speed is greatest.',
  lessonReferences: ['simple-harmonic-motion'], tags: ['shm', 'concept'] });

add({ topic: 'Simple Harmonic Motion', level: 'HL', difficulty: 'hard', marks: 3,
  question: 'An oscillator has amplitude 0.20 m and angular frequency 5.0 rad/s. Calculate its speed when the displacement is 0.10 m. Give your answer in m/s.',
  answer: '0.87 m/s', unit: 'm/s', tolerance: 0.05,
  solution: 'v = ω√(x₀² − x²) = 5.0 × √(0.04 − 0.01) = 5.0 × 0.1732 = 0.87 m/s. At x = 0 this reduces to the maximum speed ωx₀ = 1.0 m/s.',
  lessonReferences: ['simple-harmonic-motion'], tags: ['shm', 'calculation'] });

add({ topic: 'Simple Harmonic Motion', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'The amplitude of an oscillator is doubled. What happens to its total energy, and why?',
  answer: 'It becomes four times larger, because total energy is proportional to the square of the amplitude',
  solution: 'E = ½mω²x₀². Doubling x₀ multiplies x₀² by four, so the energy quadruples. The same square dependence applies to wave intensity.',
  lessonReferences: ['simple-harmonic-motion'], tags: ['energy', 'explanation'] });

/* ── Wave Properties ─────────────────────────────────────────────────── */
add({ topic: 'Wave Properties', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'A wave enters a new medium where its speed halves. What happens to its frequency and wavelength?',
  answer: 'The frequency is unchanged because it is set by the source; the wavelength halves',
  solution: 'v = fλ. The source fixes f, so if v halves then λ must halve too. Changing the frequency at a boundary is one of the most common errors in wave questions.',
  lessonReferences: ['wave-properties'], tags: ['wave-equation', 'concept'] });

add({ topic: 'Wave Properties', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'Which observation shows that light is a transverse wave?',
  options: [
    'Light can be polarised',
    'Light can be refracted',
    'Light can be diffracted',
    'Light travels through a vacuum'
  ],
  correctAnswer: 'Light can be polarised',
  answer: 'Light can be polarised',
  solution: 'Only transverse waves can be polarised, because only they have an oscillation direction perpendicular to travel that can be restricted. Refraction and diffraction happen to longitudinal waves too.',
  lessonReferences: ['wave-properties'], tags: ['polarisation', 'concept'] });

add({ topic: 'Wave Properties', level: 'SL', difficulty: 'easy', marks: 2,
  question: 'A displacement–distance graph of a wave shows a repeat every 0.80 m, and the wave travels at 320 m/s. Calculate the frequency. Give your answer in Hz.',
  answer: '400 Hz', unit: 'Hz', tolerance: 10,
  solution: 'The repeat distance is the wavelength, so λ = 0.80 m and f = v/λ = 320/0.80 = 400 Hz. A displacement–distance graph gives wavelength; a displacement–time graph gives period.',
  lessonReferences: ['wave-properties'], tags: ['graphs', 'calculation'] });

add({ topic: 'Wave Properties', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Describe the motion of a single air particle as a sound wave passes.',
  answer: 'It oscillates back and forth about a fixed position, parallel to the direction the wave travels, and does not move along with the wave',
  solution: 'Sound is longitudinal, so the oscillation is along the direction of energy transfer, creating compressions and rarefactions. The particle stays around its own equilibrium position; only the disturbance and the energy travel.',
  lessonReferences: ['wave-properties'], tags: ['longitudinal', 'description'] });

/* ── Electromagnetic Induction ───────────────────────────────────────── */
add({ topic: 'Electromagnetic Induction', level: 'HL', difficulty: 'medium', marks: 3,
  question: 'A 200-turn coil of area 0.015 m² rotates at 50 rad/s in a 0.30 T field. Calculate the peak emf. Give your answer in V.',
  answer: '45 V', unit: 'V', tolerance: 2,
  solution: 'ε₀ = NBAω = 200 × 0.30 × 0.015 × 50 = 45 V. The peak occurs when the coil plane is parallel to the field, where the flux is momentarily zero but changing fastest.',
  lessonReferences: ['electromagnetic-induction'], tags: ['generators', 'calculation'] });

add({ topic: 'Electromagnetic Induction', level: 'HL', difficulty: 'medium', marks: 3,
  question: 'A coil sits stationary in the strongest magnetic field available. Explain why no emf is induced.',
  answer: 'An emf requires a changing flux, not a large flux, and a stationary coil in a steady field has a constant flux linkage',
  solution: 'Faraday’s law is ε = −N ΔΦ/Δt. If Φ does not change, ΔΦ/Δt is zero whatever the value of Φ. Only moving the coil, changing the field, or changing the area or orientation induces an emf.',
  lessonReferences: ['electromagnetic-induction'], tags: ['faraday', 'explanation'] });

add({ topic: 'Electromagnetic Induction', level: 'HL', difficulty: 'hard', marks: 4,
  question: 'Explain, using Lenz’s law, why a magnet dropped through a copper tube falls more slowly than through a plastic one.',
  answer: 'The moving magnet changes the flux through the copper, inducing currents whose own magnetic field opposes the motion, producing a retarding force; plastic is an insulator so no current flows',
  solution: 'Lenz’s law says the induced effect opposes the change causing it. In copper, eddy currents circulate and create a field that repels the approaching pole and attracts the receding one, retarding the fall. This is energy conservation: the kinetic energy lost becomes electrical and then thermal energy in the tube. Plastic cannot carry the current, so nothing opposes the fall.',
  lessonReferences: ['electromagnetic-induction'], tags: ['lenz', 'explanation'] });

add({ topic: 'Electromagnetic Induction', level: 'HL', difficulty: 'medium', marks: 2,
  question: 'An alternating current has a peak value of 4.0 A. Calculate its root mean square value. Give your answer in A.',
  answer: '2.8 A', unit: 'A', tolerance: 0.2,
  solution: 'I_rms = I₀/√2 = 4.0/1.414 = 2.83 A. The rms value is defined so that an alternating current delivers the same average power as a direct current of that size.',
  lessonReferences: ['electromagnetic-induction'], tags: ['ac', 'calculation'] });

/* ── Electric Fields ─────────────────────────────────────────────────── */
add({ topic: 'Electric Fields', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Two parallel plates 2.0 cm apart have a potential difference of 500 V. Calculate the electric field strength between them. Give your answer in V/m.',
  answer: '25000 V/m', unit: 'V/m', tolerance: 800,
  solution: 'E = V/d = 500/0.020 = 2.5 × 10^4 V/m. The field between parallel plates is uniform, so this value applies everywhere between them.',
  lessonReferences: ['electric-fields'], tags: ['uniform-field', 'calculation'] });

add({ topic: 'Electric Fields', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'Why is the electric field inside a hollow conductor in equilibrium zero?',
  options: [
    'Charges redistribute on the surface until their fields cancel inside',
    'Conductors cannot carry charge',
    'The charge is concentrated at the centre',
    'Air inside the conductor blocks the field'
  ],
  correctAnswer: 'Charges redistribute on the surface until their fields cancel inside',
  answer: 'Charges redistribute on the surface until their fields cancel inside',
  solution: 'Free charges move until no field remains to push them, which means the interior field is zero. This is why a metal box shields its contents, and why a car is a reasonably safe place in a lightning storm.',
  lessonReferences: ['electric-fields'], tags: ['shielding', 'concept'] });

add({ topic: 'Electric Fields', level: 'HL', difficulty: 'hard', marks: 3,
  question: 'Explain why electric potential can be positive or negative while gravitational potential is always negative.',
  answer: 'Charge comes in two signs so the electric force can repel as well as attract, whereas mass has one sign and gravity is only ever attractive',
  solution: 'Both are defined as zero at infinity. Bringing a mass in from infinity always releases energy, so gravitational potential is always negative. Bringing a positive charge towards another positive charge requires work, giving a positive potential; towards a negative charge it releases energy, giving a negative one.',
  lessonReferences: ['electric-fields', 'fields'], tags: ['potential', 'comparison'] });

/* ── Quantum Physics ─────────────────────────────────────────────────── */
add({ topic: 'Quantum Physics', level: 'HL', difficulty: 'medium', marks: 3,
  question: 'A metal has a work function of 2.3 eV. Calculate its threshold frequency. Use h = 6.63 × 10^-34 J s. Give your answer in Hz.',
  answer: '5.6e14 Hz', unit: 'Hz', tolerance: 3e13,
  solution: 'φ = 2.3 × 1.60 × 10^-19 = 3.68 × 10^-19 J. f₀ = φ/h = 3.68 × 10^-19 / 6.63 × 10^-34 = 5.6 × 10^14 Hz. Below this frequency no electrons are emitted however intense the light.',
  lessonReferences: ['quantum-physics'], tags: ['photoelectric', 'calculation'] });

add({ topic: 'Quantum Physics', level: 'HL', difficulty: 'hard', marks: 4,
  question: 'Explain why the photoelectric effect cannot be explained by the wave theory of light.',
  answer: 'Wave theory predicts that any frequency should eventually free electrons if intense enough, and that emission should be delayed at low intensity, but there is a sharp threshold frequency and emission is immediate',
  solution: 'On a wave picture energy arrives continuously and spreads over the surface, so a dim beam should free electrons after a delay and a bright low-frequency beam should work eventually. Neither happens. Below the threshold nothing is emitted at any intensity, and above it emission is instant even at very low intensity. Only one photon delivering hf to one electron explains both.',
  lessonReferences: ['quantum-physics'], tags: ['photoelectric', 'explanation'] });

add({ topic: 'Quantum Physics', level: 'HL', difficulty: 'medium', marks: 3,
  question: 'Calculate the de Broglie wavelength of an electron moving at 2.0 × 10^6 m/s. Take m = 9.11 × 10^-31 kg. Give your answer in m.',
  answer: '3.6e-10 m', unit: 'm', tolerance: 3e-11,
  solution: 'λ = h/mv = 6.63 × 10^-34 / (9.11 × 10^-31 × 2.0 × 10^6) = 3.6 × 10^-10 m. This is comparable to atomic spacings, which is why electrons diffract from crystals.',
  lessonReferences: ['quantum-physics'], tags: ['de-broglie', 'calculation'] });

/* ── Nuclear Physics ─────────────────────────────────────────────────── */
add({ topic: 'Nuclear Physics', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'A radioactive source has an activity of 800 Bq and a half-life of 12 hours. Calculate its activity after 36 hours. Give your answer in Bq.',
  answer: '100 Bq', unit: 'Bq', tolerance: 5,
  solution: '36 hours is three half-lives, so the activity halves three times: 800 → 400 → 200 → 100 Bq. Half-lives are never added together.',
  lessonReferences: ['nuclear-physics'], tags: ['half-life', 'calculation'] });

add({ topic: 'Nuclear Physics', level: 'SL', difficulty: 'hard', marks: 4,
  question: 'Beta particles are emitted with a continuous range of energies rather than one fixed value. Explain what this revealed.',
  answer: 'That a third particle, the antineutrino, shares the released energy, since a two-body decay would give the beta particle a single fixed energy',
  solution: 'If a nucleus decayed into just a daughter and an electron, conservation of energy and momentum would fix the electron’s energy exactly. The observed spread meant energy appeared to be missing, which led Pauli to propose an undetected particle carrying the balance. That particle is the antineutrino.',
  lessonReferences: ['nuclear-physics'], tags: ['beta-decay', 'explanation'] });

add({ topic: 'Nuclear Physics', level: 'HL', difficulty: 'medium', marks: 3,
  question: 'A nuclide has a decay constant of 0.0347 per second. Calculate its half-life. Give your answer in s.',
  answer: '20 s', unit: 's', tolerance: 1,
  solution: 'T½ = ln2/λ = 0.693/0.0347 = 20 s. A large decay constant means a short half-life and a strongly active source.',
  lessonReferences: ['nuclear-physics'], tags: ['decay-constant', 'calculation'] });

add({ topic: 'Nuclear Physics', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Explain why binding energy per nucleon, rather than total binding energy, is used to compare nuclear stability.',
  answer: 'Total binding energy grows simply because a nucleus has more nucleons, so only the energy per nucleon shows how tightly each one is held',
  solution: 'Uranium has far more total binding energy than iron purely because it has more nucleons, yet iron is the more stable nucleus. Dividing by nucleon number removes the size effect and gives a fair comparison, which is why the curve peaks at iron-56.',
  lessonReferences: ['nuclear-physics'], tags: ['binding-energy', 'explanation'] });

fs.writeFileSync(FILE, JSON.stringify(bank, null, 2) + '\n');
console.log(`questions.json: ${bank.length} total (added ${bank.length - before})`);
