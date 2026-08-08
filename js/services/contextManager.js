const KEY = 'phylab_ai_context_memory';

function read() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

function write(value) {
  try { sessionStorage.setItem(KEY, JSON.stringify(value)); } catch { /* Session memory is an enhancement, never a blocker. */ }
}

export const contextManager = {
  fromRoute() {
    const parts = location.pathname.split('/').filter(Boolean);
    const memory = read();
    return {
      route: location.pathname,
      lesson_slug: parts[0] === 'lesson' ? parts[1] : memory.lesson_slug || null,
      formula_slug: parts[0] === 'formulas' ? parts[1] : memory.formula_slug || null,
      simulation_slug: parts[0] === 'simulations' ? parts[1] : memory.simulation_slug || null,
      quiz: parts[0] === 'quiz' || parts[0] === 'exam',
      topic: memory.topic || null,
      recent_formulas: memory.recent_formulas || [],
      recent_simulations: memory.recent_simulations || [],
      recent_questions: memory.recent_questions || [],
      teaching_mode: memory.teaching_mode || null,
      revision_session: memory.revision_session || null
    };
  },
  remember(patch = {}) {
    const current = read();
    const next = { ...current, ...patch, updated_at: Date.now() };
    ['recent_formulas', 'recent_simulations', 'recent_questions'].forEach(key => { if (Array.isArray(next[key])) next[key] = [...new Set(next[key])].slice(-8); });
    write(next);
    return next;
  },
  merge(...items) { return Object.assign({}, ...items.filter(Boolean)); }
};
