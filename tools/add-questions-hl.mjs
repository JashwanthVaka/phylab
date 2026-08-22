/**
 * Adds HL extension questions to the practice bank.
 *
 * HL sat at 48 of 178 (27%). HL students meet all the SL content plus their
 * own, so proportionally they had the thinnest practice of anyone using the
 * site. These target the AHL-only material in the 2023 syllabus -- potential
 * and orbital energy, charged-particle motion, the decay law, single-slit
 * diffraction and resolution, SHM energy, stellar quantities -- rather than
 * harder versions of SL questions, because that is what the extension papers
 * actually ask for.
 *
 * Run with: node tools/add-questions-hl.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(ROOT, 'data', 'questions.json');
const bank = JSON.parse(fs.readFileSync(file, 'utf8'));

const q = (topic, lesson, difficulty, marks, question, answer, unit, tolerance, solution, tags) =>
  ({ topic, level: 'HL', difficulty, marks, question, answer, unit, tolerance, solution, lessonReferences: [lesson], tags });

const mcq = (topic, lesson, difficulty, marks, question, options, correctAnswer, solution, tags) =>
  ({ topic, level: 'HL', difficulty, marks, question, options, correctAnswer, answer: correctAnswer, solution, lessonReferences: [lesson], tags });

const NEW = [
  // ── D.1 Gravitational fields (AHL): potential, escape speed, orbital energy
  q('Gravitation', 'fields', 'medium', 3,
    'Calculate the gravitational potential at the surface of the Earth. Use G = 6.67 × 10⁻¹¹ N m² kg⁻², mass of Earth = 5.97 × 10²⁴ kg and radius = 6.37 × 10⁶ m.',
    '-6.25 × 10^7', 'J kg⁻¹', 2e6,
    'Vg = -GM/r = -(6.67 × 10⁻¹¹ × 5.97 × 10²⁴) / (6.37 × 10⁶) = -(3.98 × 10¹⁴) / (6.37 × 10⁶) = -6.25 × 10⁷ J kg⁻¹. The sign is negative because gravitational potential is defined as zero at infinity and work must be done on a mass to move it out to there.',
    ['gravitational potential', 'calculation']),

  q('Gravitation', 'fields', 'medium', 3,
    'Calculate the escape speed from the surface of the Earth. Use G = 6.67 × 10⁻¹¹ N m² kg⁻², mass = 5.97 × 10²⁴ kg and radius = 6.37 × 10⁶ m.',
    '1.12 × 10^4', 'm s⁻¹', 400,
    'Escape requires the kinetic energy to equal the depth of the potential well: ½mv² = GMm/r, so v = √(2GM/r) = √(2 × 3.98 × 10¹⁴ / 6.37 × 10⁶) = √(1.25 × 10⁸) = 1.12 × 10⁴ m s⁻¹, about 11.2 km s⁻¹. The mass of the escaping object cancels.',
    ['escape speed', 'calculation']),

  q('Gravitation', 'fields', 'hard', 4,
    'A 1200 kg satellite is in a circular orbit of radius 7.0 × 10⁶ m about the Earth. Calculate its total energy. Use GM = 3.98 × 10¹⁴ N m² kg⁻¹.',
    '-3.41 × 10^10', 'J', 1.5e9,
    'For a circular orbit the kinetic energy is +GMm/2r and the potential energy is -GMm/r, so the total is E = -GMm/2r. E = -(3.98 × 10¹⁴ × 1200) / (2 × 7.0 × 10⁶) = -(4.78 × 10¹⁷) / (1.4 × 10⁷) = -3.41 × 10¹⁰ J. The total energy is negative, which is what makes the orbit bound.',
    ['orbital energy', 'calculation']),

  q('Gravitation', 'fields', 'medium', 3,
    'Calculate the orbital speed of a satellite in a circular orbit of radius 7.0 × 10⁶ m about the Earth. Use GM = 3.98 × 10¹⁴ N m² kg⁻¹.',
    '7.54 × 10^3', 'm s⁻¹', 250,
    'The gravitational force provides the centripetal force: GMm/r² = mv²/r, so v = √(GM/r) = √(3.98 × 10¹⁴ / 7.0 × 10⁶) = √(5.69 × 10⁷) = 7.54 × 10³ m s⁻¹. The satellite mass cancels, so all satellites at this radius orbit at the same speed.',
    ['orbital speed', 'calculation']),

  // ── D.2 Electric fields (AHL): potential and potential energy
  q('Electric Fields', 'electric-fields', 'medium', 3,
    'Calculate the electric potential 0.30 m from a point charge of +2.0 × 10⁻⁶ C. Use k = 8.99 × 10⁹ N m² C⁻².',
    '6.0 × 10^4', 'V', 2000,
    'Ve = kQ/r = (8.99 × 10⁹ × 2.0 × 10⁻⁶) / 0.30 = (1.80 × 10⁴) / 0.30 = 6.0 × 10⁴ V. Unlike field strength, potential is a scalar, so there is no direction to resolve.',
    ['electric potential', 'calculation']),

  q('Electric Fields', 'electric-fields', 'easy', 2,
    'A charge of 3.0 × 10⁻⁶ C is moved through a potential difference of 250 V. Calculate the work done on the charge.',
    '7.5 × 10^-4', 'J', 3e-5,
    'W = qΔV = 3.0 × 10⁻⁶ × 250 = 7.5 × 10⁻⁴ J. Potential difference is defined as work done per unit charge, so this follows directly from the definition.',
    ['potential difference', 'work']),

  q('Electric Fields', 'electric-fields', 'hard', 3,
    'Two point charges of +2.0 × 10⁻⁶ C and +3.0 × 10⁻⁶ C are held 0.50 m apart. Calculate the electric potential energy of the pair. Use k = 8.99 × 10⁹ N m² C⁻².',
    '0.108', 'J', 0.006,
    'Ep = kQ₁Q₂/r = (8.99 × 10⁹ × 2.0 × 10⁻⁶ × 3.0 × 10⁻⁶) / 0.50 = (5.39 × 10⁻²) / 0.50 = 0.108 J. The value is positive because both charges have the same sign, so work was done against repulsion to assemble them.',
    ['electric potential energy', 'calculation']),

  // ── D.3 Motion in electromagnetic fields (AHL)
  q('Motion in Fields', 'motion-in-fields', 'hard', 3,
    'An electron travelling at 2.0 × 10⁶ m s⁻¹ enters a magnetic field of 0.50 T at right angles. Calculate the radius of its circular path. Use m = 9.11 × 10⁻³¹ kg and q = 1.6 × 10⁻¹⁹ C.',
    '2.3 × 10^-5', 'm', 2e-6,
    'The magnetic force provides the centripetal force: qvB = mv²/r, so r = mv/(qB) = (9.11 × 10⁻³¹ × 2.0 × 10⁶) / (1.6 × 10⁻¹⁹ × 0.50) = (1.82 × 10⁻²⁴) / (8.0 × 10⁻²⁰) = 2.3 × 10⁻⁵ m.',
    ['charged particle', 'circular motion']),

  q('Motion in Fields', 'motion-in-fields', 'medium', 3,
    'In a velocity selector the electric field is 3.0 × 10⁴ V m⁻¹ and the magnetic field is 0.20 T. Calculate the speed of the particles that pass through undeflected.',
    '1.5 × 10^5', 'm s⁻¹', 5000,
    'A particle passes undeflected when the electric and magnetic forces balance: qE = qvB, so v = E/B = (3.0 × 10⁴) / 0.20 = 1.5 × 10⁵ m s⁻¹. The charge cancels, so the selected speed is the same for every particle regardless of charge or mass.',
    ['velocity selector', 'calculation']),

  mcq('Motion in Fields', 'motion-in-fields', 'medium', 1,
    'A charged particle moves in a circle in a uniform magnetic field. If its speed is doubled, the radius of its path:',
    ['doubles', 'stays the same', 'halves', 'quadruples'],
    'doubles',
    'From r = mv/(qB), the radius is directly proportional to speed when m, q and B are fixed. Doubling v doubles r. The period T = 2πm/(qB) is independent of speed, which is the principle the cyclotron relies on.',
    ['charged particle', 'conceptual']),

  // ── D.3 Magnetic fields (AHL)
  q('Magnetic Fields', 'magnetic-fields', 'medium', 3,
    'A charge of 1.6 × 10⁻¹⁹ C moves at 5.0 × 10⁶ m s⁻¹ perpendicular to a magnetic field of 0.30 T. Calculate the magnitude of the force on it.',
    '2.4 × 10^-13', 'N', 1e-14,
    'F = qvB sin θ with θ = 90°, so F = 1.6 × 10⁻¹⁹ × 5.0 × 10⁶ × 0.30 = 2.4 × 10⁻¹³ N. The force is perpendicular to both v and B, so it changes direction but never speed.',
    ['magnetic force', 'calculation']),

  q('Magnetic Fields', 'magnetic-fields', 'medium', 3,
    'Calculate the magnetic flux density 0.10 m from a long straight wire carrying a current of 5.0 A. Use μ₀ = 4π × 10⁻⁷ T m A⁻¹.',
    '1.0 × 10^-5', 'T', 1e-6,
    'B = μ₀I/(2πr) = (4π × 10⁻⁷ × 5.0) / (2π × 0.10) = (6.28 × 10⁻⁶) / 0.628 = 1.0 × 10⁻⁵ T. The 2π and the π in μ₀ partly cancel, which is why the arithmetic comes out clean.',
    ['magnetic flux density', 'calculation']),

  mcq('Magnetic Fields', 'magnetic-fields', 'easy', 1,
    'A wire carries current north in a magnetic field directed vertically downwards. The force on the wire is directed:',
    ['east', 'west', 'upwards', 'south'],
    'east',
    'Using F = IL × B with the left-hand or right-hand rule as taught: current north, field down, gives a force to the east. The force is always perpendicular to both the current and the field, so it can never be along either of them.',
    ['magnetic force', 'direction']),

  // ── E.1 Structure of the atom (AHL)
  q('Atomic Physics', 'atomic-physics', 'medium', 2,
    'Calculate the energy of the n = 3 level in a hydrogen atom, using En = -13.6/n² eV.',
    '-1.51', 'eV', 0.05,
    'E₃ = -13.6/3² = -13.6/9 = -1.51 eV. The levels get closer together as n rises and converge on zero, which is the ionisation limit.',
    ['energy levels', 'calculation']),

  q('Atomic Physics', 'atomic-physics', 'hard', 3,
    'An electron in a hydrogen atom falls from n = 3 to n = 2. Calculate the energy of the emitted photon in electronvolts. Use En = -13.6/n² eV.',
    '1.89', 'eV', 0.06,
    'E₃ = -13.6/9 = -1.51 eV and E₂ = -13.6/4 = -3.40 eV. The photon carries the difference: ΔE = -1.51 - (-3.40) = 1.89 eV. Because the levels are discrete, only certain photon energies appear, which is why the spectrum is a line spectrum rather than continuous.',
    ['energy levels', 'photon emission']),

  q('Atomic Physics', 'atomic-physics', 'hard', 3,
    'A photon of energy 1.89 eV is emitted by a hydrogen atom. Calculate its wavelength. Use h = 6.63 × 10⁻³⁴ J s, c = 3.00 × 10⁸ m s⁻¹ and 1 eV = 1.60 × 10⁻¹⁹ J.',
    '6.6 × 10^-7', 'm', 3e-8,
    'Convert first: E = 1.89 × 1.60 × 10⁻¹⁹ = 3.02 × 10⁻¹⁹ J. Then λ = hc/E = (6.63 × 10⁻³⁴ × 3.00 × 10⁸) / (3.02 × 10⁻¹⁹) = (1.99 × 10⁻²⁵) / (3.02 × 10⁻¹⁹) = 6.6 × 10⁻⁷ m. This is 656 nm, the red line in the hydrogen spectrum.',
    ['photon', 'wavelength']),

  // ── E.2 Quantum physics (AHL)
  q('Quantum Physics', 'quantum-physics', 'hard', 3,
    'Calculate the de Broglie wavelength of an electron travelling at 1.0 × 10⁶ m s⁻¹. Use h = 6.63 × 10⁻³⁴ J s and m = 9.11 × 10⁻³¹ kg.',
    '7.3 × 10^-10', 'm', 4e-11,
    'λ = h/p = h/(mv) = (6.63 × 10⁻³⁴) / (9.11 × 10⁻³¹ × 1.0 × 10⁶) = (6.63 × 10⁻³⁴) / (9.11 × 10⁻²⁵) = 7.3 × 10⁻¹⁰ m. This is comparable to atomic spacing in a crystal, which is why electrons diffract from crystals.',
    ['de Broglie', 'calculation']),

  q('Quantum Physics', 'quantum-physics', 'hard', 3,
    'Light of frequency 1.0 × 10¹⁵ Hz falls on a metal of work function 2.3 eV. Calculate the maximum kinetic energy of the emitted electrons in joules. Use h = 6.63 × 10⁻³⁴ J s and 1 eV = 1.60 × 10⁻¹⁹ J.',
    '2.95 × 10^-19', 'J', 1.5e-20,
    'The photon energy is hf = 6.63 × 10⁻³⁴ × 1.0 × 10¹⁵ = 6.63 × 10⁻¹⁹ J. The work function is φ = 2.3 × 1.60 × 10⁻¹⁹ = 3.68 × 10⁻¹⁹ J. Einstein’s equation gives Ek(max) = hf - φ = 6.63 × 10⁻¹⁹ - 3.68 × 10⁻¹⁹ = 2.95 × 10⁻¹⁹ J.',
    ['photoelectric effect', 'calculation']),

  q('Quantum Physics', 'quantum-physics', 'medium', 2,
    'A metal has a work function of 3.68 × 10⁻¹⁹ J. Calculate its threshold frequency. Use h = 6.63 × 10⁻³⁴ J s.',
    '5.55 × 10^14', 'Hz', 2e13,
    'At the threshold the photon energy exactly equals the work function and no kinetic energy is left over: f₀ = φ/h = (3.68 × 10⁻¹⁹) / (6.63 × 10⁻³⁴) = 5.55 × 10¹⁴ Hz. Below this frequency no electrons are emitted however intense the light.',
    ['threshold frequency', 'calculation']),

  // ── E.3 Radioactive decay (AHL): the decay law
  q('Nuclear Physics', 'nuclear-physics', 'medium', 3,
    'A sample contains 8.0 × 10²⁰ undecayed nuclei of an isotope with a half-life of 5.0 days. Calculate the number remaining after 15 days.',
    '1.0 × 10^20', 'nuclei', 5e18,
    '15 days is exactly three half-lives, so the number remaining is N = N₀(½)³ = 8.0 × 10²⁰ / 8 = 1.0 × 10²⁰ nuclei. Using the decay law N = N₀e^(-λt) gives the same result.',
    ['half-life', 'decay law']),

  q('Nuclear Physics', 'nuclear-physics', 'hard', 3,
    'An isotope has a half-life of 5.0 days. Calculate its decay constant in s⁻¹.',
    '1.6 × 10^-6', 's⁻¹', 1e-7,
    'λ = ln2 / T½. Convert the half-life to seconds first: 5.0 × 24 × 3600 = 4.32 × 10⁵ s. So λ = 0.693 / (4.32 × 10⁵) = 1.6 × 10⁻⁶ s⁻¹. Forgetting to convert to seconds is the most common way to lose this mark.',
    ['decay constant', 'calculation']),

  q('Nuclear Physics', 'nuclear-physics', 'hard', 3,
    'A sample contains 1.0 × 10²⁰ undecayed nuclei and has a decay constant of 1.6 × 10⁻⁶ s⁻¹. Calculate its activity.',
    '1.6 × 10^14', 'Bq', 8e12,
    'A = λN = 1.6 × 10⁻⁶ × 1.0 × 10²⁰ = 1.6 × 10¹⁴ Bq. Activity is the rate of decay, so it falls with exactly the same half-life as the number of nuclei.',
    ['activity', 'calculation']),

  // ── C.1 SHM (AHL): energy and the full equations
  q('Simple Harmonic Motion', 'simple-harmonic-motion', 'hard', 4,
    'A 0.20 kg mass oscillates with SHM of period 0.40 s and amplitude 0.050 m. Calculate the total energy of the oscillation.',
    '6.2 × 10^-2', 'J', 4e-3,
    'First find the angular frequency: ω = 2π/T = 2π/0.40 = 15.7 rad s⁻¹. Then E = ½mω²x₀² = 0.5 × 0.20 × (15.7)² × (0.050)² = 0.5 × 0.20 × 247 × 2.5 × 10⁻³ = 6.2 × 10⁻² J. The total energy depends on the square of the amplitude.',
    ['SHM energy', 'calculation']),

  q('Simple Harmonic Motion', 'simple-harmonic-motion', 'hard', 3,
    'A mass oscillates with SHM of angular frequency 15.7 rad s⁻¹ and amplitude 0.050 m. Calculate its speed when the displacement is 0.030 m.',
    '0.63', 'm s⁻¹', 0.04,
    'v = ω√(x₀² - x²) = 15.7 × √(0.050² - 0.030²) = 15.7 × √(2.5 × 10⁻³ - 9.0 × 10⁻⁴) = 15.7 × √(1.6 × 10⁻³) = 15.7 × 0.040 = 0.63 m s⁻¹. The speed is greatest at the centre and zero at the extremes.',
    ['SHM', 'velocity']),

  q('Simple Harmonic Motion', 'simple-harmonic-motion', 'medium', 2,
    'A mass oscillates with SHM of angular frequency 15.7 rad s⁻¹. Calculate the magnitude of its acceleration at a displacement of 0.030 m.',
    '7.4', 'm s⁻²', 0.4,
    'a = -ω²x, so the magnitude is ω²x = (15.7)² × 0.030 = 247 × 0.030 = 7.4 m s⁻². The minus sign shows the acceleration always points back towards the equilibrium position, which is the defining condition for SHM.',
    ['SHM', 'acceleration']),

  // ── C.3 Wave phenomena (AHL): single slit, resolution, polarisation
  q('Wave Phenomena', 'wave-phenomena', 'medium', 3,
    'Light of wavelength 6.0 × 10⁻⁷ m passes through a single slit of width 2.0 × 10⁻⁴ m. Calculate the angle of the first diffraction minimum in radians.',
    '3.0 × 10^-3', 'rad', 2e-4,
    'For a single slit the first minimum is at θ = λ/b = (6.0 × 10⁻⁷) / (2.0 × 10⁻⁴) = 3.0 × 10⁻³ rad. Note this is the first *minimum*, not a maximum -- the central maximum is twice this wide.',
    ['single slit', 'diffraction']),

  q('Wave Phenomena', 'wave-phenomena', 'hard', 3,
    'A telescope of aperture 0.10 m observes light of wavelength 5.5 × 10⁻⁷ m. Calculate the smallest angular separation it can resolve, using the Rayleigh criterion.',
    '6.7 × 10^-6', 'rad', 4e-7,
    'The Rayleigh criterion gives θ = 1.22λ/D = (1.22 × 5.5 × 10⁻⁷) / 0.10 = (6.71 × 10⁻⁷) / 0.10 = 6.7 × 10⁻⁶ rad. Two sources closer than this cannot be told apart, which is why larger apertures resolve finer detail.',
    ['resolution', 'Rayleigh criterion']),

  q('Wave Phenomena', 'wave-phenomena', 'medium', 3,
    'Polarised light of intensity 12 W m⁻² passes through an analyser whose axis is at 30° to the plane of polarisation. Calculate the transmitted intensity.',
    '9.0', 'W m⁻²', 0.5,
    'Malus’s law gives I = I₀cos²θ = 12 × cos²(30°) = 12 × (0.866)² = 12 × 0.75 = 9.0 W m⁻². Note the cosine is squared -- using cos θ rather than cos²θ is the usual error here.',
    ['polarisation', 'Malus law']),

  // ── C.5 Doppler effect (AHL): quantitative
  q('The Doppler Effect', 'doppler-effect', 'hard', 3,
    'A source emitting sound at 500 Hz moves towards a stationary observer at 30 m s⁻¹. Calculate the observed frequency. Take the speed of sound as 340 m s⁻¹.',
    '548', 'Hz', 8,
    'For a source moving towards a stationary observer, f′ = f × v/(v - us) = 500 × 340/(340 - 30) = 500 × 340/310 = 548 Hz. The observed frequency rises because successive wavefronts are emitted from closer positions.',
    ['Doppler effect', 'calculation']),

  q('The Doppler Effect', 'doppler-effect', 'hard', 3,
    'A galaxy recedes at 3.0 × 10⁶ m s⁻¹. Light emitted at 656 nm is observed. Calculate the shift in wavelength. Use c = 3.00 × 10⁸ m s⁻¹.',
    '6.6', 'nm', 0.4,
    'For light with v much smaller than c, Δλ/λ = v/c, so Δλ = λv/c = (656 × 10⁻⁹ × 3.0 × 10⁶) / (3.00 × 10⁸) = 656 × 10⁻⁹ × 0.010 = 6.6 × 10⁻⁹ m = 6.6 nm. The shift is towards longer wavelengths because the source is receding, which is a redshift.',
    ['Doppler effect', 'redshift']),

  // ── E.5 Fusion and stars (AHL)
  q('Fusion and Stars', 'nuclear-fusion-and-stars', 'hard', 4,
    'A star has radius 7.0 × 10⁸ m and surface temperature 5800 K. Calculate its luminosity. Use σ = 5.67 × 10⁻⁸ W m⁻² K⁻⁴.',
    '4.0 × 10^26', 'W', 3e25,
    'The Stefan-Boltzmann law gives L = σAT⁴ with A = 4πr². A = 4π(7.0 × 10⁸)² = 6.16 × 10¹⁸ m². T⁴ = 5800⁴ = 1.13 × 10¹⁵ K⁴. So L = 5.67 × 10⁻⁸ × 6.16 × 10¹⁸ × 1.13 × 10¹⁵ = 4.0 × 10²⁶ W. The fourth power means a small temperature change alters luminosity dramatically.',
    ['luminosity', 'Stefan-Boltzmann']),

  q('Fusion and Stars', 'nuclear-fusion-and-stars', 'medium', 2,
    'A star has a surface temperature of 5800 K. Calculate the wavelength at which it emits most strongly. Use Wien’s constant = 2.9 × 10⁻³ m K.',
    '5.0 × 10^-7', 'm', 3e-8,
    'Wien’s displacement law gives λmax = (2.9 × 10⁻³) / T = (2.9 × 10⁻³) / 5800 = 5.0 × 10⁻⁷ m, which is 500 nm in the green part of the visible spectrum. Hotter stars peak at shorter wavelengths and look bluer.',
    ['Wien law', 'calculation']),

  q('Fusion and Stars', 'nuclear-fusion-and-stars', 'hard', 3,
    'A star of luminosity 3.85 × 10²⁶ W is observed from a distance of 1.5 × 10¹¹ m. Calculate its apparent brightness.',
    '1.4 × 10^3', 'W m⁻²', 100,
    'The power spreads over a sphere: b = L/(4πd²) = (3.85 × 10²⁶) / (4π × (1.5 × 10¹¹)²) = (3.85 × 10²⁶) / (2.83 × 10²³) = 1.4 × 10³ W m⁻². This is the solar constant, the power per square metre arriving at the Earth.',
    ['apparent brightness', 'inverse square']),

  // ── B.5 Current and circuits (AHL): emf and internal resistance
  q('Current and Circuits', 'current-and-circuits', 'medium', 3,
    'A cell of emf 12 V and internal resistance 1.0 Ω is connected to a 5.0 Ω resistor. Calculate the current in the circuit.',
    '2.0', 'A', 0.1,
    'The emf is shared between the external and internal resistance: ε = I(R + r), so I = ε/(R + r) = 12/(5.0 + 1.0) = 12/6.0 = 2.0 A. Ignoring the internal resistance would give 2.4 A, which is the usual error.',
    ['internal resistance', 'calculation']),

  q('Current and Circuits', 'current-and-circuits', 'medium', 2,
    'A cell of emf 12 V and internal resistance 1.0 Ω delivers a current of 2.0 A. Calculate the terminal potential difference.',
    '10', 'V', 0.4,
    'V = ε - Ir = 12 - (2.0 × 1.0) = 10 V. The terminal potential difference is always less than the emf while current flows, because some energy is dissipated inside the cell itself.',
    ['terminal pd', 'internal resistance']),

  q('Current and Circuits', 'current-and-circuits', 'medium', 2,
    'A current of 2.0 A flows through a cell of internal resistance 1.0 Ω. Calculate the power dissipated inside the cell.',
    '4.0', 'W', 0.2,
    'P = I²r = (2.0)² × 1.0 = 4.0 W. This is energy lost as heat inside the cell rather than delivered to the external circuit, which is why a cell warms up when it supplies a large current.',
    ['power', 'internal resistance']),

  // ── A.2/A.3 (AHL extension): impulse and power
  q('Forces and Momentum', 'forces', 'medium', 2,
    'A force of 250 N acts on a ball for 0.040 s. Calculate the impulse delivered.',
    '10', 'N s', 0.5,
    'Impulse = FΔt = 250 × 0.040 = 10 N s. Impulse equals the change in momentum, so the ball’s momentum changes by 10 kg m s⁻¹. The unit N s and kg m s⁻¹ are equivalent.',
    ['impulse', 'momentum']),

  q('Work, Energy and Power', 'energy', 'medium', 2,
    'A car experiences a total resistive force of 400 N while travelling at a constant 25 m s⁻¹. Calculate the useful output power of the engine.',
    '1.0 × 10^4', 'W', 500,
    'At constant speed the driving force equals the resistive force, so P = Fv = 400 × 25 = 1.0 × 10⁴ W, or 10 kW. Because the speed is constant there is no change in kinetic energy, and all the work done goes against resistance.',
    ['power', 'calculation']),

  // ── B.3 Gas laws (AHL): molecular kinetic energy
  q('Gas Laws', 'gas-laws', 'hard', 3,
    'Calculate the average random kinetic energy of a molecule in an ideal gas at 300 K. Use the Boltzmann constant k = 1.38 × 10⁻²³ J K⁻¹.',
    '6.2 × 10^-21', 'J', 3e-22,
    'The average translational kinetic energy is Ek = (3/2)kT = 1.5 × 1.38 × 10⁻²³ × 300 = 6.2 × 10⁻²¹ J. It depends only on temperature, so at a given temperature every ideal gas has the same average molecular kinetic energy regardless of the mass of its molecules.',
    ['kinetic theory', 'calculation']),

  mcq('Gas Laws', 'gas-laws', 'medium', 1,
    'The absolute temperature of an ideal gas is doubled. The average random kinetic energy of its molecules:',
    ['doubles', 'stays the same', 'quadruples', 'halves'],
    'doubles',
    'Since Ek = (3/2)kT, the average kinetic energy is directly proportional to absolute temperature. Doubling T doubles Ek. Note the root mean square speed only increases by a factor of √2, because energy depends on the square of speed.',
    ['kinetic theory', 'conceptual']),
];

let nextId = Math.max(...bank.map(item => item.id)) + 1;
NEW.forEach(item => { item.id = nextId; nextId += 1; });

const merged = [...bank, ...NEW];
fs.writeFileSync(file, JSON.stringify(merged, null, 2) + '\n');

const hl = merged.filter(item => item.level === 'HL').length;
console.log(`added ${NEW.length} HL questions`);
console.log(`bank is now ${merged.length}: ${hl} HL (${Math.round(hl / merged.length * 100)}%), ${merged.length - hl} SL`);
