/**
 * The visual contract for the complete KINETIQ course.
 *
 * Keep this table explicit. A missing lesson should be visible in tests rather
 * than silently inheriting a plausible-looking but incorrect visual. `depth`
 * records an editorial decision: pseudo-3D is reserved for spatial concepts;
 * everything else stays in the clearest 2D representation.
 */
export const LESSON_VISUAL_REGISTRY = Object.freeze({
  'kinematics': Object.freeze({ diagram: 'kinematics', depth: '2d', graph: 'kinematics', interactiveGraph: 'kinematics' }),
  'forces': Object.freeze({ diagram: 'forces', depth: '2d', graph: 'forces', interactiveGraph: 'forces' }),
  'energy': Object.freeze({ diagram: 'energy', depth: '2d', graph: 'energy', interactiveGraph: 'energy' }),
  'rigid-body-mechanics': Object.freeze({ diagram: 'rigid-body-mechanics', depth: '2d', graph: 'rigid-body-mechanics', interactiveGraph: 'rigid-body-mechanics' }),
  'relativity': Object.freeze({ diagram: 'relativity', depth: '2d', graph: 'relativity', interactiveGraph: 'relativity' }),
  'thermal-physics': Object.freeze({ diagram: 'thermal-energy', depth: '2d', graph: 'thermal-physics', interactiveGraph: null }),
  'greenhouse-effect': Object.freeze({ diagram: 'greenhouse-effect', depth: '2d', graph: 'greenhouse-effect', interactiveGraph: null }),
  'gas-laws': Object.freeze({ diagram: 'gas-laws', depth: '3d', graph: 'gas-laws', interactiveGraph: 'gas-laws' }),
  'thermodynamics': Object.freeze({ diagram: 'thermodynamics', depth: '2d', graph: 'thermodynamics', interactiveGraph: null }),
  'simple-harmonic-motion': Object.freeze({ diagram: 'simple-harmonic-motion', depth: '2d', graph: 'simple-harmonic-motion', interactiveGraph: 'simple-harmonic-motion' }),
  'wave-properties': Object.freeze({ diagram: 'the-wave-model', depth: '2d', graph: 'wave-properties', interactiveGraph: 'wave-properties' }),
  'electromagnetic-waves': Object.freeze({ diagram: 'electromagnetic-waves', depth: '3d', graph: 'electromagnetic-waves', interactiveGraph: null }),
  'wave-phenomena': Object.freeze({ diagram: 'wave-phenomena', depth: '2d', graph: 'wave-phenomena', interactiveGraph: null }),
  'standing-waves-and-resonance': Object.freeze({ diagram: 'standing-waves', depth: '2d', graph: 'standing-waves-and-resonance', interactiveGraph: null }),
  'doppler-effect': Object.freeze({ diagram: 'doppler-effect', depth: '2d', graph: 'doppler-effect', interactiveGraph: null }),
  'fields': Object.freeze({ diagram: 'gravitation', depth: '3d', graph: 'fields', interactiveGraph: null }),
  'electric-fields': Object.freeze({ diagram: 'electric-fields', depth: '2d', graph: 'electric-fields', interactiveGraph: 'electric-fields' }),
  'magnetic-fields': Object.freeze({ diagram: 'magnetic-fields', depth: '3d', graph: 'magnetic-fields', interactiveGraph: null }),
  'motion-in-fields': Object.freeze({ diagram: 'motion-in-fields', depth: '3d', graph: 'motion-in-fields', interactiveGraph: null }),
  'electromagnetic-induction': Object.freeze({ diagram: 'electromagnetic-induction', depth: '3d', graph: 'electromagnetic-induction', interactiveGraph: 'electromagnetic-induction' }),
  'current-and-circuits': Object.freeze({ diagram: 'current-and-circuits', depth: '2d', graph: 'current-and-circuits', interactiveGraph: null }),
  'atomic-physics': Object.freeze({ diagram: 'atomic-physics', depth: '2d', graph: 'atomic-physics', interactiveGraph: null }),
  'quantum-physics': Object.freeze({ diagram: 'quantum-physics', depth: '2d', graph: 'quantum-physics', interactiveGraph: 'quantum-physics' }),
  'nuclear-physics': Object.freeze({ diagram: 'nuclear-physics', depth: '2d', graph: 'nuclear-physics', interactiveGraph: 'nuclear-physics' }),
  'nuclear-fission': Object.freeze({ diagram: 'nuclear-fission', depth: '2d', graph: 'nuclear-fission', interactiveGraph: null }),
  'nuclear-fusion-and-stars': Object.freeze({ diagram: 'nuclear-fusion', depth: '2d', graph: 'nuclear-fusion-and-stars', interactiveGraph: null }),
});

export const COURSE_LESSON_SLUGS = Object.freeze(Object.keys(LESSON_VISUAL_REGISTRY));

export function visualForLesson(lesson) {
  const slug = String(lesson?.slug || '').trim().toLowerCase().replace(/_/g, '-');
  return LESSON_VISUAL_REGISTRY[slug] || null;
}
