/**
 * Practice questions for the remaining lessons that had none: gravitation,
 * motion in fields, atomic physics, fission, and fusion and stars.
 *
 * Run once:  node tools/add-questions-b.mjs
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

/* ── D.1 Gravitation ──────────────────────────────────────────────────── */
add({ topic: 'Gravitation', level: 'SL', difficulty: 'easy', marks: 2,
  question: 'The gravitational field strength at a planet’s surface is 3.7 N/kg. Calculate the weight of a 60 kg astronaut standing on it. Give your answer in N.',
  answer: '222 N', unit: 'N', tolerance: 5,
  solution: 'W = mg = 60 × 3.7 = 222 N, about a fifth of their weight on Earth. Mass is unchanged at 60 kg.',
  lessonReferences: ['fields'], tags: ['field-strength', 'calculation'] });

add({ topic: 'Gravitation', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'A satellite orbits 400 km above the Earth’s surface. Taking the Earth’s radius as 6.37 × 10^6 m and GM = 3.99 × 10^14, calculate its orbital speed. Give your answer in m/s.',
  answer: '7680 m/s', unit: 'm/s', tolerance: 150,
  solution: 'The orbital radius is measured from the centre: r = 6.37 × 10^6 + 4.00 × 10^5 = 6.77 × 10^6 m. Then v = sqrt(GM/r) = sqrt(3.99 × 10^14 / 6.77 × 10^6) = 7.68 × 10^3 m/s. Using the altitude alone is the standard error here.',
  lessonReferences: ['fields'], tags: ['orbits', 'calculation'] });

add({ topic: 'Gravitation', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'Why does a satellite stay in orbit?',
  options: [
    'Gravity provides exactly the centripetal force needed for circular motion',
    'There is no gravity at that altitude',
    'The satellite’s engines continuously counteract gravity',
    'Air resistance balances the pull of gravity'
  ],
  correctAnswer: 'Gravity provides exactly the centripetal force needed for circular motion',
  answer: 'Gravity provides exactly the centripetal force needed for circular motion',
  solution: 'The satellite is in free fall, continually falling towards the Earth while moving sideways fast enough to keep missing it. Gravity at 400 km is still about 89% of its surface value.',
  lessonReferences: ['fields'], tags: ['orbits', 'concept'] });

add({ topic: 'Gravitation', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Explain why the gravitational field strength at the top of a mountain is slightly less than at sea level.',
  answer: 'Field strength is GM/r² and r is measured from the centre of the Earth, so a larger r at altitude gives a smaller g',
  solution: 'g = GM/r². On a mountain the distance from the Earth’s centre is larger, so g is smaller. The effect is small because mountain heights are tiny compared with the Earth’s 6.37 × 10^6 m radius.',
  lessonReferences: ['fields'], tags: ['field-strength', 'explanation'] });

add({ topic: 'Gravitation', level: 'HL', difficulty: 'hard', marks: 4,
  question: 'Explain why a satellite in a lower orbit travels faster yet has less total energy.',
  answer: 'Orbital speed is sqrt(GM/r), which rises as r falls, while total energy is −GMm/2r, which becomes more negative as r falls',
  solution: 'Speed goes as r^(−1/2), so a smaller radius means a faster satellite. Total energy is −GMm/(2r), which becomes more negative — that is, lower — as r decreases. This is why atmospheric drag makes a satellite speed up as it spirals down: it loses energy and drops to a faster orbit.',
  lessonReferences: ['fields'], tags: ['orbits', 'energy'] });

add({ topic: 'Gravitation', level: 'HL', difficulty: 'medium', marks: 2,
  question: 'State why gravitational potential is always negative.',
  answer: 'It is defined as zero at infinity, and because gravity is attractive, work must be done on a mass to move it out to infinity',
  solution: 'Bringing a mass from infinity to a point releases energy, so the potential there is below the zero reference. Gravity is only ever attractive, so there is no point at which the potential rises above zero.',
  lessonReferences: ['fields'], tags: ['potential', 'concept'] });

/* ── D.4 Motion in Electric and Magnetic Fields ───────────────────────── */
add({ topic: 'Motion in Fields', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'An electron is accelerated from rest through 500 V. Calculate its kinetic energy in joules. Take e = 1.60 × 10^-19 C.',
  answer: '8.0e-17 J', unit: 'J', tolerance: 5e-18,
  solution: 'E = qV = 1.60 × 10^-19 × 500 = 8.0 × 10^-17 J. That is 500 eV, which is why the electronvolt is the convenient unit here.',
  lessonReferences: ['motion-in-fields'], tags: ['acceleration', 'calculation'] });

add({ topic: 'Motion in Fields', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'A proton of momentum 2.0 × 10^-19 kg m/s moves perpendicular to a 0.50 T field. Calculate the radius of its path. Take q = 1.60 × 10^-19 C. Give your answer in m.',
  answer: '2.5 m', unit: 'm', tolerance: 0.1,
  solution: 'r = p/(qB) = 2.0 × 10^-19 / (1.60 × 10^-19 × 0.50) = 2.5 m. Equating the magnetic force qvB to the centripetal force mv²/r gives r = mv/qB.',
  lessonReferences: ['motion-in-fields'], tags: ['circular-motion', 'calculation'] });

add({ topic: 'Motion in Fields', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'A charged particle moves in a circle in a uniform magnetic field. What happens to its speed?',
  options: [
    'It stays constant, because the magnetic force does no work',
    'It increases steadily as the particle circles',
    'It decreases as the particle loses energy to the field',
    'It oscillates between a maximum and a minimum'
  ],
  correctAnswer: 'It stays constant, because the magnetic force does no work',
  answer: 'It stays constant, because the magnetic force does no work',
  solution: 'The magnetic force is always perpendicular to the velocity, so there is no component along the displacement and no work is done. Only the direction changes, which is why the path is a circle.',
  lessonReferences: ['motion-in-fields'], tags: ['magnetic-force', 'concept'] });

add({ topic: 'Motion in Fields', level: 'SL', difficulty: 'hard', marks: 4,
  question: 'Explain how crossed electric and magnetic fields can select particles of one particular speed.',
  answer: 'The electric force qE and magnetic force qvB act in opposite directions and balance only when v = E/B, so only particles at that speed pass through undeflected',
  solution: 'Setting qE = qvB gives v = E/B, independent of charge and mass. Particles faster than this are deflected by the larger magnetic force, slower ones by the electric force, so only one speed emerges straight. This is the velocity selector at the front of a mass spectrometer.',
  lessonReferences: ['motion-in-fields'], tags: ['velocity-selector', 'explanation'] });

add({ topic: 'Motion in Fields', level: 'HL', difficulty: 'medium', marks: 3,
  question: 'Explain why the orbital period of a charged particle in a magnetic field does not depend on its speed.',
  answer: 'The period is 2πm/qB, which contains no speed term: a faster particle travels a proportionally larger circle in the same time',
  solution: 'From r = mv/qB, the circumference 2πr is proportional to v. The time for one orbit is 2πr/v = 2πm/qB, and the speed cancels. This is the principle the cyclotron relies on.',
  lessonReferences: ['motion-in-fields'], tags: ['period', 'explanation'] });

/* ── E.1 Atomic Physics ───────────────────────────────────────────────── */
add({ topic: 'Atomic Physics', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'An electron in hydrogen falls from n = 3 to n = 2. Using Eₙ = −13.6/n² eV, calculate the energy of the emitted photon in eV.',
  answer: '1.89 eV', unit: 'eV', tolerance: 0.05,
  solution: 'E₃ = −13.6/9 = −1.51 eV and E₂ = −13.6/4 = −3.40 eV. The photon carries the difference: 3.40 − 1.51 = 1.89 eV. Use the difference between levels, never a level value on its own.',
  lessonReferences: ['atomic-physics'], tags: ['energy-levels', 'calculation'] });

add({ topic: 'Atomic Physics', level: 'SL', difficulty: 'easy', marks: 2,
  question: 'State the ionisation energy of hydrogen from its ground state, in eV.',
  answer: '13.6 eV', unit: 'eV', tolerance: 0.2,
  solution: 'The ground state sits at −13.6 eV and ionisation means raising the electron to zero energy, so 13.6 eV must be supplied.',
  lessonReferences: ['atomic-physics'], tags: ['ionisation', 'calculation'] });

add({ topic: 'Atomic Physics', level: 'SL', difficulty: 'medium', marks: 4,
  question: 'State the three observations of the Geiger–Marsden–Rutherford experiment and what each shows.',
  answer: 'Most alpha particles passed straight through, showing the atom is mostly empty space; a few deflected through large angles and a very small number reflected almost straight back, showing a tiny, massive, positively charged nucleus',
  solution: 'Thomson’s model could account for small deflections but not for large ones. Only a concentrated positive charge with almost all the mass could reverse an alpha particle, and the rarity of that event shows the nucleus is minute compared with the atom.',
  lessonReferences: ['atomic-physics'], tags: ['rutherford', 'explanation'] });

add({ topic: 'Atomic Physics', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'What do the discrete lines of an emission spectrum show?',
  options: [
    'Electrons can only occupy certain energy levels',
    'Atoms emit light continuously at all wavelengths',
    'Electrons are stationary within the atom',
    'The nucleus emits the visible light'
  ],
  correctAnswer: 'Electrons can only occupy certain energy levels',
  answer: 'Electrons can only occupy certain energy levels',
  solution: 'Each line is a fixed photon energy, so only certain energy differences exist, so only certain electron energies exist. A continuous spectrum comes from a hot dense solid, not from isolated atoms.',
  lessonReferences: ['atomic-physics'], tags: ['spectra', 'concept'] });

add({ topic: 'Atomic Physics', level: 'SL', difficulty: 'hard', marks: 3,
  question: 'Explain why an absorption spectrum shows dark lines at exactly the wavelengths of the element’s emission spectrum.',
  answer: 'Absorption raises electrons across the same energy gaps that emission drops them across, so the photon energies and therefore the wavelengths are identical',
  solution: 'The energy levels are a property of the atom and do not change. Absorption removes photons of those energies from transmitted light, leaving dark lines; emission adds them, giving bright lines. Same gaps, same wavelengths, opposite direction.',
  lessonReferences: ['atomic-physics'], tags: ['spectra', 'explanation'] });

/* ── E.4 Nuclear Fission ──────────────────────────────────────────────── */
add({ topic: 'Nuclear Fission', level: 'SL', difficulty: 'medium', marks: 2,
  question: 'A fission reaction has a mass defect of 0.215 u. Calculate the energy released. Give your answer in MeV.',
  answer: '200 MeV', unit: 'MeV', tolerance: 8,
  solution: 'E = Δm × 931.5 = 0.215 × 931.5 = 200 MeV. Using 931.5 MeV per u avoids converting to kilograms.',
  lessonReferences: ['nuclear-fission'], tags: ['fission', 'calculation'] });

add({ topic: 'Nuclear Fission', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Explain the difference in function between a moderator and a control rod in a nuclear reactor.',
  answer: 'A moderator slows fast neutrons so uranium-235 can absorb them and fission; a control rod absorbs neutrons to reduce the number available and is raised or lowered to hold the reaction rate steady',
  solution: 'Fission releases fast neutrons but uranium-235 absorbs slow ones far more readily, so a moderator such as water or graphite slows them through collisions. Control rods of boron or cadmium remove neutrons entirely. Swapping these two roles is the most common error in this topic.',
  lessonReferences: ['nuclear-fission'], tags: ['reactor', 'explanation'] });

add({ topic: 'Nuclear Fission', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Explain, using the binding energy per nucleon curve, why fission of a heavy nucleus releases energy.',
  answer: 'The fragments lie closer to the peak of the curve than the original nucleus, so they are more tightly bound, and the excess mass is released as energy',
  solution: 'Binding energy per nucleon peaks near iron-56. A heavy nucleus splitting produces fragments further up the curve, so the products are more tightly bound. The difference in total binding energy appears as kinetic energy of the fragments.',
  lessonReferences: ['nuclear-fission', 'nuclear-physics'], tags: ['binding-energy', 'explanation'] });

add({ topic: 'Nuclear Fission', level: 'SL', difficulty: 'easy', marks: 1, type: 'multiple-choice',
  question: 'What is a chain reaction?',
  options: [
    'A self-sustaining sequence in which neutrons from one fission cause further fissions',
    'A reaction in which nuclei join to form heavier ones',
    'The steady decay of an unstable nucleus over many half-lives',
    'The absorption of all released neutrons by control rods'
  ],
  correctAnswer: 'A self-sustaining sequence in which neutrons from one fission cause further fissions',
  answer: 'A self-sustaining sequence in which neutrons from one fission cause further fissions',
  solution: 'Each fission releases two or three neutrons, more than the one it consumed. If enough go on to cause further fissions the reaction sustains itself; below the critical mass too many escape and it dies out.',
  lessonReferences: ['nuclear-fission'], tags: ['chain-reaction', 'concept'] });

add({ topic: 'Nuclear Fission', level: 'SL', difficulty: 'hard', marks: 4,
  question: 'Discuss two safety issues associated with nuclear fission power.',
  answer: 'Spent fuel stays intensely radioactive for thousands of years and needs secure long-term storage, and decay heat continues after shutdown so loss of cooling can still damage the core',
  solution: 'Fission fragments are neutron-rich and beta-active, some with half-lives of thousands of years, so waste must be shielded and stored far longer than the reactor operates. Decay heat means cooling cannot simply be switched off with the reaction. A third issue is that fissile material carries a weapons-proliferation risk. Against these, fission generates electricity with almost no carbon dioxide.',
  lessonReferences: ['nuclear-fission'], tags: ['safety', 'evaluation'] });

/* ── E.5 Nuclear Fusion and Stars ─────────────────────────────────────── */
add({ topic: 'Fusion and Stars', level: 'SL', difficulty: 'medium', marks: 2,
  question: 'A star has a surface temperature of 5800 K. Using Wien’s law with 2.90 × 10^-3 m K, calculate its peak emission wavelength. Give your answer in m.',
  answer: '5.0e-7 m', unit: 'm', tolerance: 3e-8,
  solution: 'λ_max = 2.90 × 10^-3 / 5800 = 5.0 × 10^-7 m, in the green-yellow part of the visible spectrum. Temperature must be in kelvin.',
  lessonReferences: ['nuclear-fusion-and-stars'], tags: ['wien', 'calculation'] });

add({ topic: 'Fusion and Stars', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Explain why fusion requires extremely high temperatures.',
  answer: 'Both nuclei are positively charged and repel, so they need very large kinetic energies to come close enough for the strong nuclear force to bind them',
  solution: 'The electrostatic repulsion between two positive nuclei rises steeply as they approach. Only at kinetic energies corresponding to temperatures of order 10^7 K do enough nuclei get close enough for the short-ranged strong force to take over. This is why fusion happens in stellar cores and is so hard to sustain on Earth.',
  lessonReferences: ['nuclear-fusion-and-stars'], tags: ['fusion', 'explanation'] });

add({ topic: 'Fusion and Stars', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'Distinguish between the luminosity and the apparent brightness of a star.',
  answer: 'Luminosity is the total power the star radiates and is a property of the star; apparent brightness is the power received per unit area at the observer and depends on distance as well',
  solution: 'b = L/4πd². Two stars of equal luminosity appear very different in brightness if they lie at different distances, so distance must be known before luminosity can be found from brightness.',
  lessonReferences: ['nuclear-fusion-and-stars'], tags: ['luminosity', 'comparison'] });

add({ topic: 'Fusion and Stars', level: 'SL', difficulty: 'medium', marks: 1, type: 'multiple-choice',
  question: 'On a Hertzsprung–Russell diagram, where do red giants sit relative to the main sequence?',
  options: [
    'Above and to the right: cool but very luminous',
    'Below and to the left: hot but faint',
    'Directly on the main sequence, at its cool end',
    'Above and to the left: hot and very luminous'
  ],
  correctAnswer: 'Above and to the right: cool but very luminous',
  answer: 'Above and to the right: cool but very luminous',
  solution: 'Temperature increases to the left on an HR diagram, so cool stars sit right. A red giant has a low surface temperature but an enormous radius, and since L = 4πR²σT⁴ the huge area makes it very luminous.',
  lessonReferences: ['nuclear-fusion-and-stars'], tags: ['hr-diagram', 'concept'] });

add({ topic: 'Fusion and Stars', level: 'HL', difficulty: 'hard', marks: 4,
  question: 'Explain what determines whether a star ends as a white dwarf, a neutron star or a black hole.',
  answer: 'The mass of the remnant core: below about 1.4 solar masses electron degeneracy pressure supports a white dwarf, above that collapse continues to a neutron star, and above roughly 2 to 3 solar masses not even neutron degeneracy pressure holds and a black hole forms',
  solution: 'The Chandrasekhar limit of about 1.4 solar masses is the largest mass electron degeneracy pressure can support. The Oppenheimer–Volkoff limit of roughly 2 to 3 solar masses is the equivalent for neutrons. Both limits apply to the remnant core, not the original star: a star far heavier than 1.4 solar masses can still end as a white dwarf if it sheds enough mass first.',
  lessonReferences: ['nuclear-fusion-and-stars'], tags: ['stellar-evolution', 'explanation'] });

add({ topic: 'Fusion and Stars', level: 'SL', difficulty: 'medium', marks: 3,
  question: 'A red giant is cool yet very luminous. Explain how both can be true.',
  answer: 'Luminosity depends on surface area as well as temperature, and a red giant’s enormous radius more than compensates for its low surface temperature',
  solution: 'L = 4πR²σT⁴. Although T⁴ is small for a cool star, R is hundreds of times larger than the Sun’s, and R² grows fast enough to make the total radiated power very large.',
  lessonReferences: ['nuclear-fusion-and-stars'], tags: ['luminosity', 'explanation'] });

fs.writeFileSync(FILE, JSON.stringify(bank, null, 2) + '\n');
console.log(`questions.json: ${bank.length} total (added ${bank.length - before})`);
