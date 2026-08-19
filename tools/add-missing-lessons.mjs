/**
 * Adds the course chapters that had no lesson in KINETIQ.
 *
 * The library was missing seven chapters outright — current and circuits,
 * standing waves and resonance, the Doppler effect, motion in electric and
 * magnetic fields, atomic physics, nuclear fission, and nuclear fusion and
 * stars. Each is written here in the same shape as the existing lessons so
 * normalizeLesson() and the content tests accept them unchanged.
 *
 * Run once:  node tools/add-missing-lessons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'lessons');
const S = 'IBDP Physics';

const lessons = {

/* ─────────────── B.5 · Current and Circuits (chapter 11) ─────────────── */
'current_and_circuits': {
  title: 'B.5 Current and Circuits',
  subject: S,
  level: 'SL and HL',
  introduction: 'An electric circuit is a closed path that lets charge flow and deliver energy where it is wanted. This lesson builds the three quantities everything else rests on — current, potential difference and resistance — then combines components in series and parallel, and finishes with the internal resistance that makes a real cell behave differently from an ideal one.',
  learning_objectives: [
    'Define electric current as the rate of flow of charge.',
    'Define potential difference as energy transferred per unit charge.',
    'Distinguish resistance from Ohm’s law.',
    'Calculate power dissipated in a circuit component.',
    'Combine resistors in series and in parallel.',
    'Explain the difference between emf and terminal potential difference.',
    'Analyse potential divider circuits, including sensor circuits.'
  ],
  definitions: [
    { term: 'Electric Current', meaning: 'The rate of flow of electric charge past a point, measured in amperes (1 A = 1 C s⁻¹).' },
    { term: 'Potential Difference', meaning: 'The energy transferred per unit charge between two points, measured in volts (1 V = 1 J C⁻¹).' },
    { term: 'Resistance', meaning: 'The ratio of potential difference across a component to the current through it, measured in ohms.' },
    { term: 'Electromotive Force (emf)', meaning: 'The total energy supplied per unit charge by a source. Despite the name it is a potential difference, not a force.' },
    { term: 'Internal Resistance', meaning: 'The resistance of the source itself, which drops part of the emf inside the cell.' },
    { term: 'Resistivity', meaning: 'A property of a material that, with length and cross-sectional area, fixes the resistance of a sample.' }
  ],
  core_concepts: [
    { heading: 'Charge Flow and Drift', explanation: 'Current is the rate at which charge passes a point. The charge carriers themselves drift slowly, but the electric field that drives them is established almost instantly throughout the circuit, which is why a lamp lights the moment the switch closes rather than after the electrons arrive.' },
    { heading: 'Resistance Versus Ohm’s Law', explanation: 'R = V/I defines resistance for every component. Ohm’s law is the stronger claim that R stays constant as V changes, and it holds only for an ohmic conductor at constant temperature. A filament lamp is not ohmic: as current heats the filament its resistance rises, so its I–V graph curves.' },
    { heading: 'What Sets Resistance', explanation: 'Resistance rises with length and falls with cross-sectional area, scaled by the resistivity of the material. A long thin wire resists more than a short thick one of the same metal.' },
    { heading: 'Series and Parallel', explanation: 'In series the current is the same everywhere and the potential differences add, so resistances add. In parallel each branch has the same potential difference and the branch currents add, so the reciprocals of resistance add. A parallel combination always has less resistance than either resistor alone.' },
    { heading: 'Real Cells', explanation: 'A real cell has internal resistance, so some of its emf is dropped inside it. The terminal potential difference delivered to the circuit therefore falls as the current drawn rises — which is why a car’s headlights dim while the starter motor turns.' },
    { heading: 'Potential Dividers', explanation: 'Two resistors in series split the supply voltage in proportion to their resistances. Replacing one with a thermistor or a light-dependent resistor turns the circuit into a sensor whose output voltage tracks temperature or light level.' }
  ],
  formulas: [
    { name: 'Electric Current', formula: 'I = Δq / Δt', variables: { I: 'current (A)', 'Δq': 'charge transferred (C)', 'Δt': 'time taken (s)' }, explanation: 'Current is the rate of flow of charge past a point in the circuit.' },
    { name: 'Potential Difference', formula: 'V = W / q', variables: { V: 'potential difference (V)', W: 'energy transferred (J)', q: 'charge moved (C)' }, explanation: 'One volt is one joule of energy transferred per coulomb of charge.' },
    { name: 'Resistance', formula: 'R = V / I', variables: { R: 'resistance (Ω)', V: 'potential difference (V)', I: 'current (A)' }, explanation: 'Defines resistance for any component, ohmic or not.' },
    { name: 'Resistivity', formula: 'R = ρL / A', variables: { R: 'resistance (Ω)', 'ρ': 'resistivity (Ω m)', L: 'length (m)', A: 'cross-sectional area (m²)' }, explanation: 'Links the resistance of a sample to the material and its dimensions.' },
    { name: 'Electrical Power', formula: 'P = VI = I²R = V²/R', variables: { P: 'power dissipated (W)', V: 'potential difference (V)', I: 'current (A)', R: 'resistance (Ω)' }, explanation: 'Three equivalent forms; choose the one matching the quantities you know.' },
    { name: 'Resistors in Series', formula: 'R = R₁ + R₂ + …', variables: { R: 'total resistance (Ω)' }, explanation: 'Series resistances add directly.' },
    { name: 'Resistors in Parallel', formula: '1/R = 1/R₁ + 1/R₂ + …', variables: { R: 'total resistance (Ω)' }, explanation: 'Add the reciprocals, then invert. The result is always smaller than the smallest branch.' },
    { name: 'Terminal Potential Difference', formula: 'V = ε − Ir', variables: { V: 'terminal pd (V)', 'ε': 'emf (V)', I: 'current (A)', r: 'internal resistance (Ω)' }, explanation: 'The pd delivered to the external circuit falls as current rises.' },
    { name: 'Potential Divider', formula: 'V_out = V_in × R₂ / (R₁ + R₂)', variables: { 'V_out': 'output pd (V)', 'V_in': 'supply pd (V)', 'R₁': 'first resistance (Ω)', 'R₂': 'resistance across the output (Ω)' }, explanation: 'The supply divides in proportion to the resistances.' }
  ],
  worked_examples: [
    { question: 'A 12 V battery of internal resistance 0.50 Ω drives a current of 2.0 A. Calculate the terminal potential difference.',
      solution: ['Use V = ε − Ir', 'V = 12 − (2.0 × 0.50)', 'V = 12 − 1.0'],
      answer: '11 V' },
    { question: 'A 6.0 Ω and a 3.0 Ω resistor are connected in parallel across a 9.0 V supply. Calculate the total resistance and the total current.',
      solution: ['1/R = 1/6.0 + 1/3.0 = 0.1667 + 0.3333 = 0.500', 'R = 1 / 0.500 = 2.0 Ω', 'I = V/R = 9.0 / 2.0'],
      answer: 'R = 2.0 Ω and I = 4.5 A' },
    { question: 'A 4.0 kΩ and a 2.0 kΩ resistor form a potential divider across a 9.0 V supply. Calculate the output voltage taken across the 2.0 kΩ resistor.',
      solution: ['Use V_out = V_in × R₂ / (R₁ + R₂)', 'V_out = 9.0 × 2000 / (4000 + 2000)', 'V_out = 9.0 × 0.3333'],
      answer: '3.0 V' }
  ],
  common_mistakes: [
    'Treating every component as ohmic. Ohm’s law only holds at constant temperature for an ohmic conductor.',
    'Forgetting to invert after adding reciprocals for a parallel combination.',
    'Producing a parallel resistance larger than one of the branches — always a sign of the error above.',
    'Confusing emf with terminal potential difference; they are only equal when no current flows.',
    'Placing an ammeter in parallel or a voltmeter in series.',
    'Assuming current is used up as it flows round a circuit — charge is conserved, energy is what is transferred.'
  ],
  ib_exam_tips: [
    'Quote units carefully: 1 A = 1 C s⁻¹ and 1 V = 1 J C⁻¹.',
    'For an internal-resistance experiment, plot V against I: the intercept is the emf and the gradient is −r.',
    'Check a parallel result against the rule that it must be smaller than the smallest branch.',
    'State that an ideal ammeter has zero resistance and an ideal voltmeter infinite resistance when asked why real meters cause systematic error.',
    'For a sensor circuit, say explicitly whether the resistance rises or falls with the stimulus before deducing what the output voltage does.'
  ],
  hl_extension: [
    { topic: 'Maximum Power Transfer', explanation: 'The power delivered to an external resistor is greatest when its resistance equals the internal resistance of the source. Above and below that value the delivered power falls away.', formula: 'P_max when R = r', variables: { R: 'external resistance (Ω)', r: 'internal resistance (Ω)' } },
    { topic: 'Non-Ohmic Characteristics', explanation: 'For a filament lamp the I–V graph curves as the filament heats; for a diode current is negligible until a threshold forward voltage and then rises sharply. Resistance at any point is still V/I, read from the coordinates rather than the gradient.' }
  ],
  practice_questions: [
    { level: 'Easy', question: 'Define electric current and state its unit.', answer: 'The rate of flow of electric charge past a point, measured in amperes, where 1 A = 1 C s⁻¹.' },
    { level: 'Medium', question: 'Two 8.0 Ω resistors are connected in parallel. Calculate the combined resistance.', answer: '4.0 Ω, since 1/R = 1/8.0 + 1/8.0 = 0.25 so R = 4.0 Ω.' },
    { level: 'Medium', question: 'Explain why the terminal potential difference of a cell falls as the current drawn increases.', answer: 'Part of the emf is dropped across the internal resistance. Since V = ε − Ir, a larger current means a larger internal drop and so a smaller terminal pd.' },
    { level: 'Hard', question: 'A filament lamp does not obey Ohm’s law. Explain why, and describe the shape of its I–V graph.', answer: 'Current heats the filament, raising its temperature and therefore its resistance, so R is not constant. The I–V graph curves towards the voltage axis as the gradient falls with increasing current.' }
  ],
  summary: 'Current is the rate of flow of charge, potential difference is energy transferred per unit charge, and resistance is their ratio. Resistances add in series and add reciprocally in parallel. Real sources have internal resistance, so terminal potential difference falls as current rises, and potential dividers split a supply in proportion to resistance — the basis of most simple sensor circuits.'
},

/* ─────────── C.5 · Standing Waves and Resonance (chapter 15) ─────────── */
'standing_waves_and_resonance': {
  title: 'C.5 Standing Waves and Resonance',
  subject: S,
  level: 'SL and HL',
  introduction: 'When two identical waves travel in opposite directions they superpose into a pattern that does not move. This lesson explains how standing waves form, why only certain frequencies are allowed on a string or in a pipe, and how a system driven at its natural frequency responds with a large amplitude — resonance, the effect behind every musical instrument and a few structural disasters.',
  learning_objectives: [
    'Explain the formation of standing waves using superposition.',
    'Distinguish standing waves from travelling waves.',
    'Identify nodes and antinodes.',
    'Determine the harmonics of a string fixed at both ends.',
    'Determine the harmonics of open and closed pipes.',
    'Describe the effect of damping on an oscillating system.',
    'Explain resonance and identify its consequences.'
  ],
  definitions: [
    { term: 'Standing Wave', meaning: 'A wave pattern formed by the superposition of two identical waves travelling in opposite directions, in which the pattern does not move along the medium.' },
    { term: 'Node', meaning: 'A point on a standing wave that never moves, where the two waves always cancel.' },
    { term: 'Antinode', meaning: 'A point on a standing wave that oscillates with maximum amplitude.' },
    { term: 'Fundamental Frequency', meaning: 'The lowest frequency at which a system forms a standing wave, also called the first harmonic.' },
    { term: 'Damping', meaning: 'The removal of energy from an oscillating system by a resistive force, reducing amplitude over time.' },
    { term: 'Resonance', meaning: 'The large-amplitude response that occurs when a system is driven at its natural frequency.' }
  ],
  core_concepts: [
    { heading: 'How a Standing Wave Forms', explanation: 'A wave reflects at a boundary and travels back through the incoming wave. Where the two are always in antiphase they cancel permanently, producing a node; where they are always in phase they reinforce, producing an antinode. Adjacent nodes are half a wavelength apart.' },
    { heading: 'Standing Versus Travelling', explanation: 'A standing wave transfers no net energy along the medium, while a travelling wave does. Amplitude varies with position in a standing wave but is uniform in a travelling wave. All points between two nodes oscillate in phase, and the phase flips across a node.' },
    { heading: 'Strings Fixed at Both Ends', explanation: 'Both ends must be nodes, which permits only wavelengths of 2L/n. Every harmonic is present, and the frequencies form a simple whole-number series above the fundamental.' },
    { heading: 'Pipes', explanation: 'An open end requires an antinode and a closed end a node. An open–open pipe behaves like a string and has all harmonics. A pipe closed at one end fits only a quarter of a wavelength at the fundamental, so it sounds an octave lower than an open pipe of the same length and produces odd harmonics only.' },
    { heading: 'Damping', explanation: 'Light damping decays slowly over many oscillations. Critical damping returns the system to equilibrium in the shortest time without overshooting, which is what car suspension and door closers are designed for. Heavy damping returns slowly without oscillating at all.' },
    { heading: 'Resonance', explanation: 'When the driving frequency matches the natural frequency, energy is transferred into the system most efficiently and the amplitude grows large. Increasing the damping lowers and broadens the resonance peak and shifts its maximum slightly below the natural frequency.' }
  ],
  formulas: [
    { name: 'Wavelength on a String', formula: 'λₙ = 2L / n', variables: { 'λₙ': 'wavelength of the nth harmonic (m)', L: 'length of the string (m)', n: 'harmonic number (1, 2, 3 …)' }, explanation: 'Both ends are nodes, so a whole number of half wavelengths must fit.' },
    { name: 'Frequency on a String', formula: 'fₙ = nv / 2L', variables: { 'fₙ': 'frequency of the nth harmonic (Hz)', v: 'wave speed on the string (m s⁻¹)', L: 'length (m)', n: 'harmonic number' }, explanation: 'All harmonics are present, at whole-number multiples of the fundamental.' },
    { name: 'Open Pipe Harmonics', formula: 'fₙ = nv / 2L', variables: { 'fₙ': 'frequency (Hz)', v: 'speed of sound (m s⁻¹)', L: 'pipe length (m)', n: '1, 2, 3 …' }, explanation: 'Antinodes at both ends give the same series as a string.' },
    { name: 'Closed Pipe Harmonics', formula: 'fₙ = nv / 4L', variables: { 'fₙ': 'frequency (Hz)', v: 'speed of sound (m s⁻¹)', L: 'pipe length (m)', n: 'odd values only (1, 3, 5 …)' }, explanation: 'A node at the closed end and an antinode at the open end permit only odd harmonics.' }
  ],
  worked_examples: [
    { question: 'A string of length 0.60 m carries waves at 240 m s⁻¹. Calculate the fundamental frequency.',
      solution: ['Use f₁ = v / 2L', 'f₁ = 240 / (2 × 0.60)', 'f₁ = 240 / 1.20'],
      answer: '200 Hz' },
    { question: 'A pipe closed at one end has length 0.85 m. Taking the speed of sound as 340 m s⁻¹, find the fundamental frequency and the next frequency it can produce.',
      solution: ['Closed pipe: fₙ = nv/4L with odd n only', 'f₁ = 340 / (4 × 0.85) = 340 / 3.40 = 100 Hz', 'Next allowed harmonic is n = 3, so f₃ = 3 × 100'],
      answer: 'Fundamental 100 Hz, next 300 Hz' }
  ],
  common_mistakes: [
    'Forgetting that a pipe closed at one end has no even harmonics.',
    'Using 2L instead of 4L for a closed pipe, which doubles the fundamental frequency.',
    'Claiming a standing wave transfers energy along the medium — it does not.',
    'Saying every point on a standing wave oscillates with the same amplitude.',
    'Forgetting that points either side of a node oscillate in antiphase.',
    'Describing resonance as simply "a loud sound" instead of a maximum-amplitude response at the natural frequency.'
  ],
  ib_exam_tips: [
    'Sketch the standing-wave pattern before calculating; count half wavelengths directly from the diagram.',
    'State the boundary condition first — node at a fixed or closed end, antinode at a free or open end.',
    'When asked to compare standing and travelling waves, give energy transfer, amplitude variation and phase.',
    'For a damping question, name which type of damping is wanted and justify it from the required behaviour.',
    'Remember that increasing damping reduces the peak amplitude and broadens the resonance curve.'
  ],
  hl_extension: [
    { topic: 'Resonance Curves and Damping', explanation: 'Plotting amplitude against driving frequency gives a peak at the natural frequency. Light damping gives a tall narrow peak; heavier damping gives a lower, broader peak whose maximum sits slightly below the natural frequency.' },
    { topic: 'Resonance in Engineering', explanation: 'Bridges, buildings and machinery are deliberately damped or stiffened so that their natural frequencies fall outside the range of expected driving frequencies, since sustained resonance can produce destructive amplitudes.' }
  ],
  practice_questions: [
    { level: 'Easy', question: 'State two differences between a standing wave and a travelling wave.', answer: 'A standing wave transfers no net energy along the medium while a travelling wave does; amplitude varies with position in a standing wave but is uniform in a travelling wave.' },
    { level: 'Medium', question: 'A pipe open at both ends has a fundamental frequency of 150 Hz. What is its second harmonic?', answer: '300 Hz, since an open pipe produces all harmonics at whole-number multiples of the fundamental.' },
    { level: 'Medium', question: 'Explain why a pipe closed at one end sounds an octave lower than an open pipe of the same length.', answer: 'The closed pipe fits only a quarter of a wavelength at the fundamental rather than a half, so its fundamental wavelength is twice as long and its frequency is half that of the open pipe.' },
    { level: 'Hard', question: 'Describe how the amplitude of a driven oscillator varies with driving frequency, and state the effect of increasing damping.', answer: 'Amplitude rises to a maximum at the natural frequency and falls away either side. Increasing damping lowers the peak, broadens the curve and shifts the maximum to a slightly lower frequency.' }
  ],
  summary: 'Standing waves form when identical waves travelling in opposite directions superpose, producing fixed nodes and antinodes and transferring no net energy. Boundary conditions restrict the allowed wavelengths, giving all harmonics on a string or open pipe and odd harmonics only in a closed pipe. Damping removes energy from an oscillator, and resonance is the large-amplitude response when the driving frequency matches the natural frequency.'
},

/* ──────────────── C.6 · The Doppler Effect (chapter 16) ──────────────── */
'doppler_effect': {
  title: 'C.6 The Doppler Effect',
  subject: S,
  level: 'SL and HL',
  introduction: 'When a source and an observer move relative to one another, the observed frequency differs from the emitted one. The effect is familiar from a passing siren and indispensable in astronomy, where the shift in a galaxy’s spectral lines is the primary evidence that the universe is expanding.',
  learning_objectives: [
    'Explain the Doppler effect using wavefront diagrams.',
    'Predict whether an observed frequency rises or falls from the relative motion.',
    'Use the approximate Doppler equations for light at low speeds.',
    'Explain redshift and its cosmological significance.',
    'Apply the exact Doppler equations for sound (HL).',
    'Distinguish a moving source from a moving observer (HL).'
  ],
  definitions: [
    { term: 'Doppler Effect', meaning: 'The change in observed frequency of a wave caused by relative motion between the source and the observer.' },
    { term: 'Redshift', meaning: 'An increase in observed wavelength, occurring when a source of light recedes from the observer.' },
    { term: 'Blueshift', meaning: 'A decrease in observed wavelength, occurring when a source of light approaches the observer.' },
    { term: 'Proper Frequency', meaning: 'The frequency measured in the frame in which the source is at rest.' }
  ],
  core_concepts: [
    { heading: 'The Wavefront Picture', explanation: 'A moving source emits each successive wavefront from a slightly different position. Ahead of it the wavefronts bunch together, so the wavelength shortens and the frequency rises; behind it they spread out, so the wavelength lengthens and the frequency falls. Drawing this diagram explains the effect better than any formula.' },
    { heading: 'Direction of the Shift', explanation: 'Approaching always raises the observed frequency and receding always lowers it, whatever is moving. This is the check to apply to every numerical answer before committing to it.' },
    { heading: 'Light at Everyday Speeds', explanation: 'For light with a relative speed far below c, the fractional change in frequency and in wavelength both equal v/c to a good approximation. This is the form used for astronomical and radar work.' },
    { heading: 'Redshift and the Expanding Universe', explanation: 'Distant galaxies show spectral lines shifted towards longer wavelengths, and the shift grows with distance. This is the observational basis for an expanding universe, and the same technique measures the rotation of galaxies and the orbits of binary stars.' },
    { heading: 'Why Sound Is Different', explanation: 'Sound travels through a medium, and that medium provides a rest frame. A source moving through still air is therefore physically different from an observer moving through it, so the two cases need different equations — unlike light, where only the relative velocity matters.' }
  ],
  formulas: [
    { name: 'Doppler Shift for Light (v ≪ c)', formula: 'Δf / f = Δλ / λ ≈ v / c', variables: { 'Δf': 'change in frequency (Hz)', f: 'emitted frequency (Hz)', 'Δλ': 'change in wavelength (m)', 'λ': 'emitted wavelength (m)', v: 'relative speed (m s⁻¹)', c: 'speed of light (m s⁻¹)' }, explanation: 'Valid when the relative speed is far below the speed of light.' },
    { name: 'Moving Source (Sound)', formula: "f' = f × v / (v ∓ uₛ)", variables: { "f'": 'observed frequency (Hz)', f: 'emitted frequency (Hz)', v: 'speed of sound (m s⁻¹)', 'uₛ': 'speed of the source (m s⁻¹)' }, explanation: 'Use the minus sign for a source approaching the observer and the plus sign for one receding.' },
    { name: 'Moving Observer (Sound)', formula: "f' = f × (v ± uₒ) / v", variables: { "f'": 'observed frequency (Hz)', f: 'emitted frequency (Hz)', v: 'speed of sound (m s⁻¹)', 'uₒ': 'speed of the observer (m s⁻¹)' }, explanation: 'Use the plus sign for an observer approaching the source and the minus sign for one receding.' }
  ],
  worked_examples: [
    { question: 'A spectral line of wavelength 656 nm is observed from a receding galaxy at 660 nm. Estimate the recession speed.',
      solution: ['Δλ = 660 − 656 = 4 nm', 'Use Δλ/λ ≈ v/c so v ≈ c × Δλ/λ', 'v ≈ 3.00 × 10⁸ × (4 / 656)'],
      answer: 'About 1.8 × 10⁶ m s⁻¹' },
    { question: 'An ambulance siren emits 800 Hz and approaches a stationary observer at 30 m s⁻¹. Taking the speed of sound as 340 m s⁻¹, find the observed frequency.',
      solution: ["Source approaching, so f' = f × v / (v − uₛ)", "f' = 800 × 340 / (340 − 30)", "f' = 800 × 340 / 310"],
      answer: 'About 877 Hz, which is higher than 800 Hz as expected for approach' }
  ],
  common_mistakes: [
    'Choosing the sign from memory rather than checking that approach raises the frequency.',
    'Using the light equation for sound, or ignoring that sound has a medium.',
    'Treating a moving source and a moving observer as identical situations for sound.',
    'Saying the source changes its emitted frequency — it does not; only the observed frequency changes.',
    'Confusing redshift with the source being red in colour.',
    'Mixing wavelength and frequency shifts: they move in opposite directions.'
  ],
  ib_exam_tips: [
    'Draw the wavefront diagram if asked to explain rather than calculate.',
    'Always sanity-check the direction of the shift after substituting.',
    'State clearly which body is moving before selecting a sound equation.',
    'For astronomy questions, link the measured shift to recession speed and then to the expansion of the universe.',
    'Keep wavelengths in consistent units before taking a ratio.'
  ],
  hl_extension: [
    { topic: 'Exact Equations for Sound', explanation: 'Because the medium defines a rest frame, the moving-source and moving-observer cases give genuinely different results even at the same relative speed. The source equation changes the emitted wavelength, while the observer equation changes the rate at which wavefronts are met.' },
    { topic: 'Doppler Broadening', explanation: 'Atoms in a hot gas move randomly, so their emitted lines are shifted by differing amounts. The result is a spectral line broadened about its central wavelength, and the width gives a measure of the temperature of the gas.' }
  ],
  practice_questions: [
    { level: 'Easy', question: 'State what happens to the observed frequency as a source approaches an observer.', answer: 'The observed frequency increases, because the wavefronts arrive more often than they were emitted.' },
    { level: 'Medium', question: 'Explain, using wavefronts, why the pitch of a siren falls as it passes.', answer: 'While approaching, the wavefronts bunch up ahead of the source, shortening the wavelength and raising the frequency. Once past, the wavefronts spread out behind it, lengthening the wavelength and lowering the frequency.' },
    { level: 'Medium', question: 'A galaxy shows a 0.5% increase in wavelength. Estimate its recession speed.', answer: 'v ≈ c × Δλ/λ = 3.00 × 10⁸ × 0.005 ≈ 1.5 × 10⁶ m s⁻¹.' },
    { level: 'Hard', question: 'Explain why the Doppler effect for sound requires separate equations for a moving source and a moving observer, while light does not.', answer: 'Sound travels through a medium that defines a rest frame, so motion of the source through the air changes the emitted wavelength while motion of the observer changes the rate of meeting wavefronts. Light needs no medium and has no preferred frame, so only the relative velocity matters.' }
  ],
  summary: 'Relative motion between a source and an observer changes the observed frequency: approach raises it, recession lowers it. For light at low speeds the fractional shift in frequency and wavelength both equal v/c, and the redshift of distant galaxies is the primary evidence for an expanding universe. Sound requires separate equations for a moving source and a moving observer, because its medium provides a rest frame.'
},

/* ───── D.4 · Motion in Electric and Magnetic Fields (chapter 19) ────── */
'motion_in_fields': {
  title: 'D.4 Motion in Electric and Magnetic Fields',
  subject: S,
  level: 'SL and HL',
  introduction: 'A charged particle placed in a field feels a force, and the shape of the resulting path depends entirely on which field it is in. A uniform electric field produces a parabola exactly like projectile motion; a uniform magnetic field produces a circle and never changes the particle’s speed. Combining the two gives the velocity selector, and the whole topic underpins mass spectrometers, cathode-ray tubes and particle accelerators.',
  learning_objectives: [
    'Describe the motion of a charged particle in a uniform electric field.',
    'Recognise the similarity between motion in a uniform electric field and projectile motion.',
    'Solve problems involving charged particles accelerated through a potential difference.',
    'Describe the circular motion of a charged particle in a uniform magnetic field.',
    'Explain why a magnetic force does no work.',
    'Analyse motion in perpendicular electric and magnetic fields.'
  ],
  definitions: [
    { term: 'Electric Field Strength', meaning: 'The force per unit positive charge at a point, measured in N C⁻¹ or equivalently V m⁻¹.' },
    { term: 'Magnetic Flux Density', meaning: 'A measure of the strength of a magnetic field, measured in tesla.' },
    { term: 'Velocity Selector', meaning: 'A device using perpendicular electric and magnetic fields so that only particles of one particular speed pass through undeflected.' },
    { term: 'Electronvolt', meaning: 'The energy gained by one electron accelerated through a potential difference of one volt, equal to 1.60 × 10⁻¹⁹ J.' }
  ],
  core_concepts: [
    { heading: 'Uniform Electric Field: A Parabola', explanation: 'The electric force is constant in size and direction, so the motion is mathematically identical to projectile motion: constant velocity across the field and uniform acceleration along it, giving a parabolic path. The acceleration depends on the charge-to-mass ratio, and a negative charge accelerates against the field direction.' },
    { heading: 'Acceleration Through a Potential Difference', explanation: 'A charge released from rest and accelerated through a potential difference gains kinetic energy equal to the work done on it. Equating qV to the kinetic energy gives the final speed directly, without needing the field strength or the distance travelled.' },
    { heading: 'Uniform Magnetic Field: A Circle', explanation: 'The magnetic force is always perpendicular to the velocity, so it changes direction but never speed. A charge entering perpendicular to a uniform field therefore travels in a circle, with the magnetic force supplying the centripetal force.' },
    { heading: 'The Magnetic Force Does No Work', explanation: 'Because the force is always at right angles to the displacement, it does zero work. Kinetic energy is unchanged, which is why a magnetic field can steer a beam but never speed it up.' },
    { heading: 'Period Independent of Speed', explanation: 'The orbital period of a charged particle in a magnetic field depends only on its mass, charge and the field strength. Faster particles simply travel larger circles in the same time — the principle the cyclotron exploits.' },
    { heading: 'Crossed Fields', explanation: 'With perpendicular electric and magnetic fields the electric and magnetic forces can be arranged to oppose one another. They balance for exactly one speed, v = E/B, so only particles at that speed pass straight through. Entering a magnetic field at an angle produces a helix, since the velocity component along the field is unaffected.' }
  ],
  formulas: [
    { name: 'Force on a Charge in an Electric Field', formula: 'F = qE', variables: { F: 'force (N)', q: 'charge (C)', E: 'electric field strength (N C⁻¹)' }, explanation: 'Constant in a uniform field, giving constant acceleration a = qE/m.' },
    { name: 'Acceleration Through a Potential Difference', formula: 'qV = ½mv²', variables: { q: 'charge (C)', V: 'accelerating potential difference (V)', m: 'mass (kg)', v: 'final speed (m s⁻¹)' }, explanation: 'Work done by the field becomes kinetic energy, for a particle starting from rest.' },
    { name: 'Force on a Moving Charge in a Magnetic Field', formula: 'F = qvB sinθ', variables: { F: 'force (N)', q: 'charge (C)', v: 'speed (m s⁻¹)', B: 'magnetic flux density (T)', 'θ': 'angle between velocity and field' }, explanation: 'Maximum when the velocity is perpendicular to the field and zero when parallel.' },
    { name: 'Radius of the Circular Path', formula: 'r = mv / qB', variables: { r: 'radius (m)', m: 'mass (kg)', v: 'speed (m s⁻¹)', q: 'charge (C)', B: 'magnetic flux density (T)' }, explanation: 'From equating the magnetic force to the centripetal force.' },
    { name: 'Period in a Magnetic Field', formula: 'T = 2πm / qB', variables: { T: 'period (s)', m: 'mass (kg)', q: 'charge (C)', B: 'magnetic flux density (T)' }, explanation: 'Independent of the particle’s speed and of the radius of its path.' },
    { name: 'Velocity Selector Condition', formula: 'v = E / B', variables: { v: 'selected speed (m s⁻¹)', E: 'electric field strength (V m⁻¹)', B: 'magnetic flux density (T)' }, explanation: 'The speed at which the electric and magnetic forces balance exactly.' }
  ],
  worked_examples: [
    { question: 'An electron is accelerated from rest through a potential difference of 500 V. Calculate its final speed. Take m = 9.11 × 10⁻³¹ kg and e = 1.60 × 10⁻¹⁹ C.',
      solution: ['Use qV = ½mv², so v = √(2qV/m)', 'v = √(2 × 1.60 × 10⁻¹⁹ × 500 / 9.11 × 10⁻³¹)', 'v = √(1.756 × 10¹⁴)'],
      answer: 'About 1.33 × 10⁷ m s⁻¹' },
    { question: 'A proton of speed 2.0 × 10⁶ m s⁻¹ enters a 0.50 T field at right angles. Calculate the radius of its path. Take m = 1.67 × 10⁻²⁷ kg.',
      solution: ['Use r = mv / qB', 'r = (1.67 × 10⁻²⁷ × 2.0 × 10⁶) / (1.60 × 10⁻¹⁹ × 0.50)', 'r = 3.34 × 10⁻²¹ / 8.0 × 10⁻²⁰'],
      answer: 'About 0.042 m' }
  ],
  common_mistakes: [
    'Claiming a magnetic field speeds a particle up — it does no work and cannot change the speed.',
    'Using the maximum magnetic force when the velocity is parallel to the field, where the force is actually zero.',
    'Forgetting that a stationary charge feels no magnetic force at all.',
    'Assuming the period in a magnetic field depends on speed; it does not.',
    'Mixing up the directions for positive and negative charges when applying a hand rule.',
    'Forgetting that a negative charge accelerates opposite to the electric field direction.'
  ],
  ib_exam_tips: [
    'Treat a uniform electric field problem exactly like a projectile: resolve into components and share the time.',
    'Use qV = ½mv² whenever a particle is accelerated from rest through a stated potential difference.',
    'Say explicitly that the magnetic force is perpendicular to the velocity when asked why the speed is constant.',
    'State the sign of the charge when using a hand rule, and reverse the result for a negative charge.',
    'Convert electronvolts to joules before substituting into any mechanical equation.'
  ],
  hl_extension: [
    { topic: 'Helical Motion', explanation: 'A charge entering a magnetic field at an angle keeps its velocity component along the field unchanged while the perpendicular component circles. The combination is a helix whose pitch is set by the parallel component.' },
    { topic: 'Mass Spectrometry', explanation: 'A velocity selector first passes only one speed, then a magnetic field bends the beam into a circle whose radius depends on mass. Measuring the radius therefore measures the mass-to-charge ratio, which is how isotopes are separated and identified.' }
  ],
  practice_questions: [
    { level: 'Easy', question: 'State why a magnetic force does no work on a moving charge.', answer: 'The force is always perpendicular to the velocity, so there is no component of force along the displacement and the work done is zero.' },
    { level: 'Medium', question: 'Describe the path of a positive charge entering a uniform electric field at right angles to the field lines.', answer: 'It follows a parabola, keeping constant velocity perpendicular to the field while accelerating uniformly along the field direction — the same shape as a projectile under gravity.' },
    { level: 'Medium', question: 'An electron and a proton travel at the same speed in the same magnetic field. Which has the larger orbital radius, and why?', answer: 'The proton, because r = mv/qB and the two have the same magnitude of charge but the proton is far more massive.' },
    { level: 'Hard', question: 'Explain how crossed electric and magnetic fields can select particles of one particular speed.', answer: 'The electric force qE and the magnetic force qvB are arranged to act in opposite directions. They balance only when qE = qvB, that is when v = E/B, so only particles at that speed pass through undeflected while all others are deflected out of the beam.' }
  ],
  summary: 'A charged particle in a uniform electric field follows a parabolic path, and one accelerated through a potential difference gains kinetic energy qV. In a uniform magnetic field the force is always perpendicular to the velocity, so the particle moves in a circle of radius mv/qB at constant speed, with a period independent of that speed. Crossed fields balance at v = E/B, giving a velocity selector.'
},

};

let written = 0;
for (const [name, lesson] of Object.entries(lessons)) {
  const target = path.join(DIR, name + '.json');
  fs.writeFileSync(target, JSON.stringify(lesson, null, 2) + '\n');
  console.log(`  wrote ${name}.json  — ${lesson.title}`);
  written += 1;
}
console.log(`${written} lessons written`);
