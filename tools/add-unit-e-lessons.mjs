/**
 * Adds the three Unit E chapters that had no lesson: atomic physics,
 * nuclear fission, and nuclear fusion and stars. Same shape as the
 * existing lessons so normalizeLesson() and the content tests accept them.
 *
 * Run once:  node tools/add-unit-e-lessons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'lessons');
const S = 'IBDP Physics';

const lessons = {

/* ─────────────────── E.1 · Atomic Physics (chapter 21) ─────────────────── */
'atomic_physics': {
  title: 'E.1 Atomic Physics',
  subject: S,
  level: 'SL and HL',
  introduction: 'Everything known about the inside of an atom was inferred rather than seen. Scattering alpha particles off gold foil revealed a tiny dense nucleus, and the sharp bright lines in the light emitted by a hot gas revealed that atomic energy is quantised. This lesson follows both lines of evidence and the model they force.',
  learning_objectives: [
    'Describe the Geiger–Marsden–Rutherford experiment and its observations.',
    'Explain why those observations rule out the Thomson model.',
    'Describe emission and absorption spectra.',
    'Explain discrete spectra in terms of quantised energy levels.',
    'Calculate photon energies and wavelengths for atomic transitions.',
    'Understand the quantisation of angular momentum (HL).'
  ],
  definitions: [
    { term: 'Nucleus', meaning: 'The tiny, dense, positively charged centre of an atom containing almost all of its mass.' },
    { term: 'Energy Level', meaning: 'One of the discrete energies an electron in an atom is permitted to have.' },
    { term: 'Emission Spectrum', meaning: 'A set of discrete bright lines emitted by a hot gas as electrons drop to lower energy levels.' },
    { term: 'Absorption Spectrum', meaning: 'A continuous spectrum crossed by dark lines, produced when a cool gas absorbs the photons it would otherwise emit.' },
    { term: 'Ionisation Energy', meaning: 'The energy needed to remove an electron completely from an atom in its ground state.' },
    { term: 'Ground State', meaning: 'The lowest energy level available to an electron in an atom.' }
  ],
  core_concepts: [
    { heading: 'The Alpha-Scattering Experiment', explanation: 'Alpha particles fired at a thin gold foil mostly passed straight through, a few were deflected substantially, and a very small number bounced almost straight back. The Thomson model of positive charge spread through the atom could explain small deflections but nothing large.' },
    { heading: 'What the Results Force', explanation: 'Because almost all alphas passed undeflected, the atom must be mostly empty space. Because a very few reversed direction, they must have met something extremely small, very massive and strongly positive — a nucleus containing essentially all of the atom’s mass and all of its positive charge.' },
    { heading: 'Discrete Spectra', explanation: 'A hot gas emits only certain wavelengths, appearing as sharp bright lines. Passing white light through a cool gas removes exactly those same wavelengths, leaving dark lines. Both are direct evidence that only certain electron energies exist.' },
    { heading: 'Transitions and Photons', explanation: 'An electron dropping from a higher to a lower level emits a single photon whose energy is exactly the difference between the two levels. A larger energy gap gives a higher frequency and a shorter wavelength, so the pattern of lines is a fingerprint of the element.' },
    { heading: 'Negative Energy Levels', explanation: 'Energies are defined as zero for a free electron at rest far from the nucleus, so bound levels are negative. The ground state of hydrogen at −13.6 eV means 13.6 eV must be supplied to ionise it.' }
  ],
  formulas: [
    { name: 'Photon Energy of a Transition', formula: 'ΔE = hf = hc / λ', variables: { 'ΔE': 'energy difference between levels (J)', h: 'Planck constant (6.63 × 10⁻³⁴ J s)', f: 'photon frequency (Hz)', c: 'speed of light (m s⁻¹)', 'λ': 'photon wavelength (m)' }, explanation: 'The emitted photon carries exactly the energy lost by the electron.' },
    { name: 'Hydrogen Energy Levels', formula: 'Eₙ = −13.6 / n²  eV', variables: { 'Eₙ': 'energy of level n (eV)', n: 'principal quantum number (1, 2, 3 …)' }, explanation: 'Levels crowd together as n rises and approach zero at ionisation.' },
    { name: 'Quantised Angular Momentum', formula: 'mvr = nh / 2π', variables: { m: 'electron mass (kg)', v: 'speed (m s⁻¹)', r: 'orbit radius (m)', n: 'whole number', h: 'Planck constant (J s)' }, explanation: 'The Bohr condition, later understood as fitting a whole number of electron wavelengths around the orbit.' }
  ],
  worked_examples: [
    { question: 'An electron in hydrogen falls from n = 3 to n = 2. Calculate the energy of the emitted photon in eV.',
      solution: ['E₃ = −13.6 / 9 = −1.51 eV', 'E₂ = −13.6 / 4 = −3.40 eV', 'ΔE = E₃ − E₂ = −1.51 − (−3.40)'],
      answer: '1.89 eV' },
    { question: 'Calculate the wavelength of a photon of energy 1.89 eV.',
      solution: ['Convert: E = 1.89 × 1.60 × 10⁻¹⁹ = 3.02 × 10⁻¹⁹ J', 'Use λ = hc / E', 'λ = (6.63 × 10⁻³⁴ × 3.00 × 10⁸) / 3.02 × 10⁻¹⁹'],
      answer: 'About 6.6 × 10⁻⁷ m, which is red light' }
  ],
  common_mistakes: [
    'Saying the alpha-scattering experiment proved the atom is mostly empty space without mentioning the large-angle deflections that reveal the nucleus.',
    'Forgetting to convert electronvolts to joules before using E = hc/λ.',
    'Treating energy levels as positive; bound levels are negative by convention.',
    'Claiming a continuous spectrum comes from isolated atoms — it comes from hot dense solids.',
    'Confusing the direction of a transition: emission is a drop to a lower level, absorption a jump to a higher one.',
    'Assuming the largest energy gap gives the longest wavelength; it gives the shortest.'
  ],
  ib_exam_tips: [
    'Quote all three observations of the alpha-scattering experiment and the conclusion drawn from each.',
    'When asked for evidence of discrete energy levels, name emission and absorption line spectra explicitly.',
    'Use the level differences, not the level values, when calculating photon energy.',
    'State that the line pattern is unique to each element when discussing spectral identification.',
    'Watch units: a photon energy in eV must be converted before combining with h and c in SI.'
  ],
  hl_extension: [
    { topic: 'The Bohr Condition as a Standing Wave', explanation: 'Requiring the electron’s de Broglie wave to close on itself around the orbit means a whole number of wavelengths must fit the circumference. Substituting λ = h/mv reproduces the quantised angular momentum condition exactly.' },
    { topic: 'Limits of the Bohr Model', explanation: 'The model predicts hydrogen’s spectrum well but fails for multi-electron atoms and says nothing about line intensities. It was superseded by the wave-mechanical model, in which electrons occupy probability distributions rather than definite orbits.' }
  ],
  practice_questions: [
    { level: 'Easy', question: 'State the three observations of the Geiger–Marsden–Rutherford experiment.', answer: 'Most alpha particles passed straight through with little or no deflection; a small number were deflected through large angles; a very few were reflected almost straight back.' },
    { level: 'Medium', question: 'Explain how an emission spectrum provides evidence for discrete energy levels.', answer: 'Only certain wavelengths are emitted, giving sharp lines rather than a continuous band. Each line corresponds to a fixed photon energy, so only certain energy differences — and therefore only certain electron energies — can exist.' },
    { level: 'Medium', question: 'Calculate the ionisation energy of hydrogen from its ground state.', answer: '13.6 eV, since the ground state is at −13.6 eV and ionisation raises the electron to zero energy.' },
    { level: 'Hard', question: 'Explain why an absorption spectrum shows dark lines at exactly the wavelengths of the emission spectrum of the same element.', answer: 'Absorption raises electrons across the same energy gaps that emission drops them across. Since the gaps are identical, the photon energies — and so the wavelengths — are identical; they are removed from the transmitted light instead of being added to it.' }
  ],
  summary: 'Alpha scattering revealed that the atom is mostly empty space with a tiny, massive, positively charged nucleus. Line emission and absorption spectra show that electron energies are quantised, with each transition emitting or absorbing a photon of energy exactly equal to the level difference. Bound levels are negative, and the energy needed to reach zero is the ionisation energy.'
},

/* ─────────────────── E.4 · Nuclear Fission (chapter 24) ─────────────────── */
'nuclear_fission': {
  title: 'E.4 Nuclear Fission',
  subject: S,
  level: 'SL and HL',
  introduction: 'A heavy nucleus struck by a slow neutron can split into two lighter fragments, releasing around 200 MeV — millions of times more per atom than any chemical reaction. The spare neutrons released can trigger further splits, and controlling that chain reaction is what a nuclear reactor is for.',
  learning_objectives: [
    'Describe the process of nuclear fission.',
    'Explain why fission releases energy using the binding-energy curve.',
    'Calculate the energy released in a fission reaction.',
    'Explain how a chain reaction is sustained and controlled.',
    'Describe the function of the moderator, control rods and coolant.',
    'Discuss the safety and environmental issues of nuclear power.'
  ],
  definitions: [
    { term: 'Nuclear Fission', meaning: 'The splitting of a heavy nucleus into two lighter nuclei, together with several neutrons and a release of energy.' },
    { term: 'Chain Reaction', meaning: 'A self-sustaining sequence in which neutrons released by one fission trigger further fissions.' },
    { term: 'Critical Mass', meaning: 'The minimum mass of fissile material needed for a chain reaction to sustain itself.' },
    { term: 'Moderator', meaning: 'A material that slows fast neutrons so they are more readily absorbed by the fuel.' },
    { term: 'Control Rod', meaning: 'A neutron-absorbing rod raised or lowered to hold the reaction rate steady.' },
    { term: 'Fissile', meaning: 'Able to undergo fission after absorbing a slow neutron, as uranium-235 does.' }
  ],
  core_concepts: [
    { heading: 'Why Fission Releases Energy', explanation: 'Binding energy per nucleon rises to a maximum near iron-56 and falls away for heavier nuclei. Splitting a heavy nucleus produces fragments closer to that peak, so the products are more tightly bound and the difference in mass appears as energy.' },
    { heading: 'The Fission Process', explanation: 'A uranium-235 nucleus absorbs a slow neutron, becomes unstable, and splits into two unequal fragments plus two or three neutrons. Around 200 MeV is released, mostly as kinetic energy of the fragments, which then heats the surrounding material.' },
    { heading: 'The Chain Reaction', explanation: 'Each fission releases more neutrons than it consumed, so the reaction can sustain itself if enough of them go on to cause further fissions. Below the critical mass too many neutrons escape and the reaction dies out.' },
    { heading: 'Why Neutrons Must Be Slowed', explanation: 'Uranium-235 absorbs slow neutrons far more readily than fast ones, but fission releases fast neutrons. A moderator such as water or graphite slows them through repeated collisions, which is what makes a sustained reaction possible.' },
    { heading: 'Controlling the Rate', explanation: 'Control rods of boron or cadmium absorb neutrons. Lowering them further reduces the number available to cause fission and slows the reaction; raising them speeds it up. They are set so that exactly one neutron per fission goes on to cause the next.' },
    { heading: 'Getting the Energy Out', explanation: 'A coolant carries thermal energy from the core to a heat exchanger, raising steam that drives a turbine and generator. The coolant also prevents the core from overheating, which remains necessary after shutdown because decay heat continues.' }
  ],
  formulas: [
    { name: 'Mass–Energy Equivalence', formula: 'E = Δmc²', variables: { E: 'energy released (J)', 'Δm': 'mass defect (kg)', c: 'speed of light (3.00 × 10⁸ m s⁻¹)' }, explanation: 'The mass lost in the reaction appears as energy.' },
    { name: 'Energy from Atomic Mass Units', formula: 'E = Δm × 931.5  MeV', variables: { E: 'energy released (MeV)', 'Δm': 'mass defect (u)' }, explanation: 'A convenient shortcut: one atomic mass unit is equivalent to 931.5 MeV.' },
    { name: 'Energy Released per Fission', formula: 'E = (binding energy of products) − (binding energy of reactants)', variables: { E: 'energy released (MeV)' }, explanation: 'Equivalently, the increase in total binding energy as the system moves towards the peak of the curve.' }
  ],
  worked_examples: [
    { question: 'A fission reaction has a mass defect of 0.215 u. Calculate the energy released in MeV.',
      solution: ['Use E = Δm × 931.5', 'E = 0.215 × 931.5'],
      answer: 'About 200 MeV' },
    { question: 'Convert 200 MeV to joules.',
      solution: ['1 eV = 1.60 × 10⁻¹⁹ J, so 1 MeV = 1.60 × 10⁻¹³ J', 'E = 200 × 1.60 × 10⁻¹³'],
      answer: '3.2 × 10⁻¹¹ J' }
  ],
  common_mistakes: [
    'Swapping the roles of the moderator and the control rods — the moderator slows neutrons, the rods absorb them.',
    'Saying fission releases energy because the products are lighter, without linking it to binding energy per nucleon.',
    'Forgetting that the neutron absorbed must be slow for uranium-235.',
    'Failing to balance nucleon number and proton number in a fission equation.',
    'Claiming a reactor can explode like a bomb; reactor fuel is far too dilute to go supercritical in that way.',
    'Ignoring decay heat, which means cooling is still needed after the reaction is shut down.'
  ],
  ib_exam_tips: [
    'Always check that nucleon numbers and proton numbers balance on both sides of a fission equation.',
    'Refer to the binding-energy-per-nucleon curve explicitly when explaining why energy is released.',
    'Name the specific material when asked about a reactor component, for example graphite as a moderator or boron as a control rod.',
    'Use 931.5 MeV per u to avoid converting to kilograms unnecessarily.',
    'For evaluation questions, give both sides: very low carbon dioxide output against long-lived waste and proliferation risk.'
  ],
  hl_extension: [
    { topic: 'Neutron Economy and Criticality', explanation: 'The multiplication factor is the average number of neutrons from one fission that go on to cause another. Below one the reaction dies out, above one it grows, and a reactor is held at exactly one — the critical condition — by continuous adjustment of the control rods.' },
    { topic: 'Fission Products and Waste', explanation: 'The fragments are neutron-rich and therefore beta-active, and some have half-lives of thousands of years. This is why spent fuel must be shielded, cooled and stored securely for far longer than the reactor itself operates.' }
  ],
  practice_questions: [
    { level: 'Easy', question: 'State what is meant by a chain reaction.', answer: 'A self-sustaining sequence in which neutrons released by one fission go on to cause further fissions.' },
    { level: 'Medium', question: 'Explain the difference in function between a moderator and a control rod.', answer: 'A moderator slows fast neutrons so uranium-235 can absorb them and fission. A control rod absorbs neutrons to reduce the number available, and is raised or lowered to hold the reaction rate steady.' },
    { level: 'Medium', question: 'Explain why fission of a heavy nucleus releases energy.', answer: 'The fragments lie closer to the peak of the binding-energy-per-nucleon curve than the original nucleus, so they are more tightly bound. The excess mass is released as energy.' },
    { level: 'Hard', question: 'Discuss two safety issues associated with nuclear fission power.', answer: 'Spent fuel remains intensely radioactive for thousands of years and needs secure long-term storage. Decay heat continues after shutdown, so loss of cooling can still damage the core. Fissile material also carries a weapons-proliferation risk.' }
  ],
  summary: 'A heavy nucleus absorbing a slow neutron splits into lighter fragments plus two or three neutrons, releasing about 200 MeV because the products sit closer to the peak of the binding-energy curve. Those neutrons can sustain a chain reaction, which a reactor controls with a moderator to slow neutrons, control rods to absorb them, and a coolant to carry the energy away.'
},

/* ─────────── E.5 · Nuclear Fusion and Stars (chapter 25) ─────────── */
'nuclear_fusion_and_stars': {
  title: 'E.5 Nuclear Fusion and Stars',
  subject: S,
  level: 'SL and HL',
  introduction: 'Fusion joins light nuclei into a heavier one and releases more energy per nucleon than fission. It is the process that powers every star, and the balance between the outward push of radiation and the inward pull of gravity determines how a star lives and how it dies.',
  learning_objectives: [
    'Describe nuclear fusion and explain why it releases energy.',
    'Explain the conditions required for fusion to occur.',
    'Define luminosity and apparent brightness.',
    'Use the Stefan–Boltzmann law and Wien’s law for stars.',
    'Interpret the Hertzsprung–Russell diagram.',
    'Describe stellar evolution for low-mass and high-mass stars (HL).'
  ],
  definitions: [
    { term: 'Nuclear Fusion', meaning: 'The joining of two light nuclei into a heavier one, with a release of energy.' },
    { term: 'Luminosity', meaning: 'The total power radiated by a star in all directions, measured in watts.' },
    { term: 'Apparent Brightness', meaning: 'The power received per unit area at the observer, which falls off with the square of distance.' },
    { term: 'Main Sequence', meaning: 'The diagonal band on the Hertzsprung–Russell diagram occupied by stars fusing hydrogen into helium in their cores.' },
    { term: 'Chandrasekhar Limit', meaning: 'About 1.4 solar masses, the largest mass a white dwarf can have before electron degeneracy pressure fails.' },
    { term: 'Oppenheimer–Volkoff Limit', meaning: 'Roughly 2 to 3 solar masses, above which neutron degeneracy pressure cannot prevent collapse to a black hole.' }
  ],
  core_concepts: [
    { heading: 'Why Fusion Releases Energy', explanation: 'Light nuclei sit low on the binding-energy-per-nucleon curve. Joining them moves the system up towards the peak near iron-56, so the product is more tightly bound and the lost mass appears as energy — more per nucleon than fission gives.' },
    { heading: 'The Coulomb Barrier', explanation: 'Both nuclei are positively charged and repel strongly at short range. Overcoming that repulsion needs enormous kinetic energy, meaning temperatures of order ten million kelvin, which is why fusion occurs in stellar cores and is so difficult to sustain on Earth.' },
    { heading: 'Hydrostatic Equilibrium', explanation: 'A stable star is a balance: radiation pressure and gas pressure from the fusing core push outwards, gravity pulls inwards. A star remains on the main sequence for as long as core hydrogen fusion can maintain that balance.' },
    { heading: 'Luminosity and Brightness', explanation: 'Luminosity depends on the star’s surface area and the fourth power of its surface temperature. What we actually measure is apparent brightness, which is the luminosity spread over a sphere of radius equal to the star’s distance — so distance must be known before luminosity can be found.' },
    { heading: 'Reading the HR Diagram', explanation: 'Luminosity is plotted against surface temperature, with temperature increasing to the left. Most stars lie on the main sequence. Red giants sit above and to the right: cool but enormous, and therefore very luminous. White dwarfs sit below and to the left: hot but tiny, and therefore faint.' },
    { heading: 'How Mass Decides the Ending', explanation: 'Once core hydrogen is exhausted the core contracts and heats while the outer layers swell. A low-mass star becomes a red giant, sheds a planetary nebula and leaves a white dwarf. A high-mass star becomes a red supergiant and explodes as a supernova, leaving a neutron star or a black hole.' }
  ],
  formulas: [
    { name: 'Stellar Luminosity', formula: 'L = 4πR²σT⁴', variables: { L: 'luminosity (W)', R: 'stellar radius (m)', 'σ': 'Stefan–Boltzmann constant (5.67 × 10⁻⁸ W m⁻² K⁻⁴)', T: 'surface temperature (K)' }, explanation: 'Combines surface area with the Stefan–Boltzmann law.' },
    { name: 'Apparent Brightness', formula: 'b = L / 4πd²', variables: { b: 'apparent brightness (W m⁻²)', L: 'luminosity (W)', d: 'distance to the star (m)' }, explanation: 'The inverse-square spreading of radiated power.' },
    { name: 'Wien’s Displacement Law', formula: 'λ_max = 2.9 × 10⁻³ / T', variables: { 'λ_max': 'wavelength of peak emission (m)', T: 'surface temperature (K)' }, explanation: 'Links a star’s colour to its surface temperature.' },
    { name: 'Mass–Energy Equivalence', formula: 'E = Δmc²', variables: { E: 'energy released (J)', 'Δm': 'mass defect (kg)', c: 'speed of light (m s⁻¹)' }, explanation: 'The mass lost in fusion appears as radiated energy.' }
  ],
  worked_examples: [
    { question: 'A star has a surface temperature of 5800 K. Calculate the wavelength at which it emits most strongly.',
      solution: ['Use λ_max = 2.9 × 10⁻³ / T', 'λ_max = 2.9 × 10⁻³ / 5800'],
      answer: 'About 5.0 × 10⁻⁷ m, in the green-yellow part of the visible spectrum' },
    { question: 'A star of luminosity 4.0 × 10²⁶ W lies 2.0 × 10¹⁷ m away. Calculate its apparent brightness.',
      solution: ['Use b = L / 4πd²', 'b = 4.0 × 10²⁶ / (4π × (2.0 × 10¹⁷)²)', 'b = 4.0 × 10²⁶ / (5.03 × 10³⁵)'],
      answer: 'About 8.0 × 10⁻¹⁰ W m⁻²' }
  ],
  common_mistakes: [
    'Reading the HR diagram left to right as increasing temperature; the axis is reversed.',
    'Confusing luminosity with apparent brightness — the second depends on distance, the first does not.',
    'Forgetting to square the distance in the inverse-square law.',
    'Using celsius in Wien’s law or the Stefan–Boltzmann law; both need kelvin.',
    'Applying the Chandrasekhar limit to the original mass of the star rather than to the remnant core.',
    'Saying fusion is easy because it releases more energy than fission; the Coulomb barrier makes it far harder to start.'
  ],
  ib_exam_tips: [
    'State that temperature increases to the left whenever you describe the HR diagram.',
    'Say explicitly whether a quantity is luminosity or apparent brightness before choosing an equation.',
    'Use the fourth power carefully: doubling surface temperature multiplies luminosity by sixteen.',
    'Link a star’s position on the HR diagram to its stage of life, not just to its temperature.',
    'For evolution questions, begin from the mass of the star, since mass decides every later stage.'
  ],
  hl_extension: [
    { topic: 'Stellar Evolution Pathways', explanation: 'Low-mass stars pass through a red giant phase, eject a planetary nebula and leave a white dwarf supported by electron degeneracy pressure. High-mass stars become red supergiants, fuse progressively heavier elements up to iron, then collapse and explode as supernovae, leaving a neutron star or a black hole.' },
    { topic: 'Degeneracy Pressure and Mass Limits', explanation: 'A white dwarf is held up by electron degeneracy pressure, which fails above the Chandrasekhar limit of about 1.4 solar masses. A neutron star is held up by neutron degeneracy pressure, which fails above roughly 2 to 3 solar masses, leaving collapse to a black hole as the only outcome.' }
  ],
  practice_questions: [
    { level: 'Easy', question: 'State why fusion requires extremely high temperatures.', answer: 'Both nuclei are positively charged and repel each other, so they need very large kinetic energies to come close enough for the strong nuclear force to bind them.' },
    { level: 'Medium', question: 'Distinguish between luminosity and apparent brightness.', answer: 'Luminosity is the total power a star radiates and is a property of the star. Apparent brightness is the power received per unit area at the observer and depends on distance as well as luminosity.' },
    { level: 'Medium', question: 'A red giant is cool yet very luminous. Explain how both can be true.', answer: 'Luminosity depends on surface area as well as temperature. A red giant has a very large radius, so despite a low surface temperature its enormous surface area gives it a high total power output.' },
    { level: 'Hard', question: 'Explain what determines whether a star ends as a white dwarf, a neutron star or a black hole.', answer: 'The mass of the remnant core. Below about 1.4 solar masses electron degeneracy pressure supports a white dwarf. Above that, collapse continues to a neutron star supported by neutron degeneracy pressure. Above roughly 2 to 3 solar masses even that fails and the core collapses to a black hole.' }
  ],
  summary: 'Fusion joins light nuclei, moving them up the binding-energy curve and releasing energy, but needs temperatures of order ten million kelvin to overcome electrostatic repulsion. A star balances radiation pressure against gravity while fusing hydrogen on the main sequence. Luminosity depends on radius and the fourth power of surface temperature, and the mass of the remnant core decides whether a star ends as a white dwarf, a neutron star or a black hole.'
},

};

let written = 0;
for (const [name, lesson] of Object.entries(lessons)) {
  fs.writeFileSync(path.join(DIR, name + '.json'), JSON.stringify(lesson, null, 2) + '\n');
  console.log(`  wrote ${name}.json  — ${lesson.title}`);
  written += 1;
}
console.log(`${written} lessons written`);
