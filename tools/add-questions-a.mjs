/**
 * Adds practice questions for the eight lessons that had none.
 *
 * All original, all with a worked solution. Numeric answers carry a tolerance
 * so a correctly rounded response is still marked right.
 *
 * Run once:  node tools/add-questions-a.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'questions.json');
const bank = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let nextId = Math.max(...bank.map(q => q.id)) + 1;
const add = q => bank.push({ id: nextId++, ...q });

/* ── B.5 Current and Circuits ─────────────────────────────────────────── */
add({ topic: 'Current and Circuits', level: 'SL', difficulty: 'easy', marks: 2,
  question: 'A charge of 6.0 C passes a point in a circuit in 3.0 s. Calculate the current. Give your answer in A.',
  answer: '2.0 A', unit: 'A', tolerance: 0.05,
  solution: 'I = Δq/Δt = 6.0/3.0 = 2.0 A. One ampere is one coulomb per second.',
  lessonReferences: ['current-and-circuits'], tags: ['current', 'calculation'] });

add({ topic: 'Current and Circuits', level: 'SL', difficulty: 'easy', marks: 2,
  question: 'Two resistors of 6.0 Ω and 3.0 Ω are connected in parallel. Calculate the combined resistance. Give your answer in ohms.',
  answer: '2.0 ohms', unit: 'ohms', tolerance: 0.05,
  solution: '1/R = 1/6.0 + 1/3.0 = 0.5, so R = 2.0 Ω. A parallel combination is always smaller than the smallest branch, which is the check to apply.',
  lessonReferences: ['current-and-circuits'], tags: ['parallel', 'calculation'] });

add({ topic: 'Current and Circuits', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'A cell of emf 12 V and internal resistance 0.50 Ω delivers a current of 2.0 A. Calculate the terminal potential difference. Give your answer in V.',
  answer: '11 V', unit: 'V', tolerance: 0.2,
  solution: 'V = ε − Ir = 12 − (2.0 × 0.50) = 11 V. The missing volt is dissipated inside the cell, which is why headlights dim while the starter motor turns.',
  lessonReferences: ['current-and-circuits'], tags: ['internal-resistance', 'calculation'] });

add({ topic: 'Current and Circuits', level: 'SL', difficulty: 'medium', marks: 2,
  question: 'A 2.0 kΩ and a 4.0 kΩ resistor form a potential divider across a 9.0 V supply. Calculate the potential difference across the 2.0 kΩ resistor. Give your answer in V.',
  answer: '3.0 V', unit: 'V', tolerance: 0.1,
  solution: 'V_out = V_in × R₂/(R₁+R₂) = 9.0 × 2000/6000 = 3.0 V. The supply divides in proportion to resistance.',
  lessonReferences: ['current-and-circuits'], tags: ['potential-divider', 'calculation'] });

add({ topic: 'Current and Circuits', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'A filament lamp does not obey Ohm’s law. Which statement explains why?',
  options: [
    'Its resistance rises as the filament heats, so R is not constant',
    'Its resistance falls to zero once current flows',
    'Current through it is not proportional to charge',
    'It stores charge rather than conducting it'
  ],
  correctAnswer: 'Its resistance rises as the filament heats, so R is not constant',
  answer: 'Its resistance rises as the filament heats, so R is not constant',
  solution: 'R = V/I defines resistance for any component. Ohm’s law is the stronger claim that R stays constant, which needs constant temperature. A filament heats as current rises, so its I–V graph curves.',
  lessonReferences: ['current-and-circuits'], tags: ['ohms-law', 'concept'] });

add({ topic: 'Current and Circuits', level: 'SL', difficulty: 'hard', marks: 3,
  question: 'A 12 V supply drives 3.0 A through a resistor. Calculate the power dissipated. Give your answer in W.',
  answer: '36 W', unit: 'W', tolerance: 1,
  solution: 'P = VI = 12 × 3.0 = 36 W. Equivalently P = I²R with R = V/I = 4.0 Ω, giving 9.0 × 4.0 = 36 W.',
  lessonReferences: ['current-and-circuits'], tags: ['power', 'calculation'] });

add({ topic: 'Current and Circuits', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Explain why an ideal voltmeter must have infinite resistance.',
  answer: 'So that it draws no current from the circuit and therefore does not change the potential difference it is measuring',
  solution: 'A voltmeter is connected in parallel with the component. Any current it draws is current diverted from that component, which lowers the potential difference being measured. Infinite resistance means zero diverted current and no disturbance. Real voltmeters have very high but finite resistance, which is a standard source of systematic error.',
  lessonReferences: ['current-and-circuits'], tags: ['meters', 'explanation'] });

/* ── C.5 Standing Waves and Resonance ─────────────────────────────────── */
add({ topic: 'Standing Waves and Resonance', level: 'SL', difficulty: 'easy', marks: 2,
  question: 'A string of length 0.60 m is fixed at both ends and carries waves at 240 m/s. Calculate its fundamental frequency. Give your answer in Hz.',
  answer: '200 Hz', unit: 'Hz', tolerance: 5,
  solution: 'f₁ = v/2L = 240/(2 × 0.60) = 200 Hz. Both ends must be nodes, so half a wavelength fits the string at the fundamental.',
  lessonReferences: ['standing-waves-and-resonance'], tags: ['harmonics', 'calculation'] });

add({ topic: 'Standing Waves and Resonance', level: 'SL', difficulty: 'medium', marks: 2,
  question: 'A pipe closed at one end is 0.85 m long. Taking the speed of sound as 340 m/s, calculate its fundamental frequency. Give your answer in Hz.',
  answer: '100 Hz', unit: 'Hz', tolerance: 3,
  solution: 'For a closed pipe f₁ = v/4L = 340/(4 × 0.85) = 100 Hz. Only a quarter of a wavelength fits, because the closed end is a node and the open end an antinode.',
  lessonReferences: ['standing-waves-and-resonance'], tags: ['pipes', 'calculation'] });

add({ topic: 'Standing Waves and Resonance', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'Which harmonics can a pipe closed at one end produce?',
  options: ['Odd harmonics only', 'Even harmonics only', 'All harmonics', 'Only the fundamental'],
  correctAnswer: 'Odd harmonics only',
  answer: 'Odd harmonics only',
  solution: 'A node at the closed end and an antinode at the open end permit only odd multiples of the fundamental. This is why a closed pipe sounds an octave lower than an open pipe of the same length and has a different timbre.',
  lessonReferences: ['standing-waves-and-resonance'], tags: ['harmonics', 'concept'] });

add({ topic: 'Standing Waves and Resonance', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'State two differences between a standing wave and a travelling wave.',
  answer: 'A standing wave transfers no net energy along the medium while a travelling wave does; amplitude varies with position in a standing wave but is the same everywhere in a travelling wave',
  solution: 'Energy transfer and amplitude are the two clearest differences. A third is phase: in a standing wave every point between two nodes oscillates in phase, and the phase flips across a node, whereas in a travelling wave the phase advances steadily with distance.',
  lessonReferences: ['standing-waves-and-resonance'], tags: ['standing-waves', 'comparison'] });

add({ topic: 'Standing Waves and Resonance', level: 'SL', difficulty: 'easy', marks: 2,
  question: 'Adjacent nodes on a standing wave are 0.25 m apart. Calculate the wavelength. Give your answer in m.',
  answer: '0.50 m', unit: 'm', tolerance: 0.02,
  solution: 'Adjacent nodes are half a wavelength apart, so λ = 2 × 0.25 = 0.50 m.',
  lessonReferences: ['standing-waves-and-resonance'], tags: ['nodes', 'calculation'] });

add({ topic: 'Standing Waves and Resonance', level: 'SL', difficulty: 'hard', marks: 3,
  question: 'Describe the effect of increasing damping on the resonance curve of a driven oscillator.',
  answer: 'The peak amplitude falls, the curve broadens, and the maximum shifts slightly below the natural frequency',
  solution: 'Damping removes energy each cycle, so less can accumulate at resonance and the peak is lower. The response is spread over a wider range of driving frequencies, and the maximum moves to a frequency slightly below the undamped natural frequency.',
  lessonReferences: ['standing-waves-and-resonance'], tags: ['resonance', 'damping'] });

add({ topic: 'Standing Waves and Resonance', level: 'SL', difficulty: 'medium', marks: 2, type: 'multiple-choice',
  question: 'Which type of damping returns a system to equilibrium in the shortest time without oscillating?',
  options: ['Critical damping', 'Light damping', 'Heavy damping', 'No damping'],
  correctAnswer: 'Critical damping',
  answer: 'Critical damping',
  solution: 'Critical damping is the boundary case: any less and the system overshoots and oscillates, any more and it returns more slowly. It is what car suspension and door closers are designed for.',
  lessonReferences: ['standing-waves-and-resonance'], tags: ['damping', 'concept'] });

/* ── C.6 The Doppler Effect ───────────────────────────────────────────── */
add({ topic: 'The Doppler Effect', level: 'SL', difficulty: 'easy', marks: 1, type: 'multiple-choice',
  question: 'A source of sound moves towards a stationary observer. What does the observer hear?',
  options: [
    'A higher frequency than the source emits',
    'A lower frequency than the source emits',
    'The same frequency, but louder',
    'The same frequency, but quieter'
  ],
  correctAnswer: 'A higher frequency than the source emits',
  answer: 'A higher frequency than the source emits',
  solution: 'Wavefronts bunch up ahead of an approaching source, shortening the wavelength and raising the frequency reaching the observer. The source itself emits at an unchanged frequency.',
  lessonReferences: ['doppler-effect'], tags: ['doppler', 'concept'] });

add({ topic: 'The Doppler Effect', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'A siren emitting 800 Hz approaches a stationary observer at 30 m/s. Taking the speed of sound as 340 m/s, calculate the observed frequency. Give your answer in Hz.',
  answer: '877 Hz', unit: 'Hz', tolerance: 6,
  solution: "Source approaching, so f' = fv/(v − uₛ) = 800 × 340/(340 − 30) = 800 × 340/310 = 877 Hz. Check the direction: approaching must raise the frequency, and 877 > 800.",
  lessonReferences: ['doppler-effect'], tags: ['doppler', 'calculation'] });

add({ topic: 'The Doppler Effect', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'A spectral line of wavelength 656 nm is observed from a galaxy at 660 nm. Estimate the recession speed. Give your answer in m/s.',
  answer: '1.8e6 m/s', unit: 'm/s', tolerance: 200000,
  solution: 'Δλ = 4 nm. Using Δλ/λ ≈ v/c, v ≈ 3.00 × 10⁸ × (4/656) ≈ 1.8 × 10⁶ m/s. The wavelength has increased, so the galaxy is receding — a redshift.',
  lessonReferences: ['doppler-effect'], tags: ['redshift', 'calculation'] });

add({ topic: 'The Doppler Effect', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Explain what redshift tells us about distant galaxies.',
  answer: 'Their spectral lines are shifted to longer wavelengths, showing they are receding, and the shift grows with distance, which is evidence that the universe is expanding',
  solution: 'Known spectral lines appear at longer wavelengths than they do in a laboratory, which by the Doppler effect means the source is moving away. Measuring many galaxies shows the recession speed increases with distance, which is the observational basis for an expanding universe.',
  lessonReferences: ['doppler-effect'], tags: ['redshift', 'explanation'] });

add({ topic: 'The Doppler Effect', level: 'HL', difficulty: 'hard', marks: 4,
  question: 'Explain why the Doppler effect for sound needs separate equations for a moving source and a moving observer, while light does not.',
  answer: 'Sound travels through a medium that provides a rest frame, so the two cases are physically different, whereas light needs no medium and only the relative velocity matters',
  solution: 'A source moving through still air emits each wavefront from a different point, physically changing the wavelength in the air. An observer moving through still air meets unchanged wavefronts more often. These are different mechanisms and give different results at the same relative speed. Light has no medium and no preferred frame, so only relative velocity can matter.',
  lessonReferences: ['doppler-effect', 'relativity'], tags: ['doppler', 'explanation'] });

add({ topic: 'The Doppler Effect', level: 'SL', difficulty: 'medium', marks: 2,
  question: 'A 500 Hz source recedes from a stationary observer at 25 m/s. Taking the speed of sound as 340 m/s, calculate the observed frequency. Give your answer in Hz.',
  answer: '466 Hz', unit: 'Hz', tolerance: 4,
  solution: "Source receding, so f' = fv/(v + uₛ) = 500 × 340/365 = 466 Hz. Receding must lower the frequency, and 466 < 500.",
  lessonReferences: ['doppler-effect'], tags: ['doppler', 'calculation'] });

fs.writeFileSync(FILE, JSON.stringify(bank, null, 2) + '\n');
console.log(`questions.json: ${bank.length} total (added ${nextId - 1 - 71})`);
