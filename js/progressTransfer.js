/**
 * Export and import everything KINETIQ knows about a learner.
 *
 * Progress lives in this browser's localStorage, which means a new laptop, a
 * cleared cache or a switch from phone to desktop loses it. Until account sync
 * is configured, a file the student holds themselves is the honest answer --
 * and it stays useful afterwards as a backup that does not depend on us.
 *
 * The AI conversation keys are deliberately not included. They are chat logs
 * rather than progress, they can be long, and a student sharing a progress
 * file with a teacher should not be handing over their tutoring transcript.
 */

const FORMAT = 'kinetiq.progress';
const VERSION = 1;

/** The keys that describe study progress, and what each one holds. */
export const TRANSFERABLE = {
  phylab_progress_v2: 'Lessons completed and study settings',
  phylab_flashcards_v1: 'Flashcard review schedule',
  phylab_mistake_state_v1: 'Mistake bank and its review dates',
  phylab_saved_answers_v1: 'Answers you saved for review',
  phylab_ia_draft_v1: 'Internal assessment draft',
};

/**
 * Each finished attempt is stored under its own key, `phylab_quiz_results:<id>`,
 * rather than in one list. An export that only copied fixed key names would
 * silently leave every practice attempt behind, so these are matched by prefix.
 */
const PREFIXED = ['phylab_quiz_results:'];

const isTransferable = key =>
  key in TRANSFERABLE || PREFIXED.some(prefix => key.startsWith(prefix));

/** Every progress key this browser currently holds, fixed names and prefixed alike. */
function storedKeys() {
  const keys = Object.keys(TRANSFERABLE).filter(key => readKey(key) !== null);
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && PREFIXED.some(prefix => key.startsWith(prefix))) keys.push(key);
    }
  } catch { /* Storage unavailable; the fixed keys are all we can offer. */ }
  return [...new Set(keys)];
}

const readKey = key => {
  try { return localStorage.getItem(key); } catch { return null; }
};

/** Builds the export payload from whatever this browser actually holds. */
export function collectProgress() {
  const data = {};
  const summary = [];
  storedKeys().forEach(key => {
    const raw = readKey(key);
    if (raw === null) return;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      // A key that is not JSON is still worth carrying, verbatim.
      data[key] = raw;
    }
    summary.push(key);
  });
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    keys: summary,
    data,
  };
}

/** A short, human-readable account of what a payload contains. */
export function describe(payload) {
  const data = payload?.data || {};
  const lines = [];
  const progress = data.phylab_progress_v2;
  const completed = Array.isArray(progress?.completedLessons) ? progress.completedLessons.length : 0;
  if (progress) lines.push(`${completed} lesson${completed === 1 ? '' : 's'} completed`);

  const cards = data.phylab_flashcards_v1;
  const cardCount = cards && typeof cards === 'object' ? Object.keys(cards).length : 0;
  if (cardCount) lines.push(`${cardCount} flashcard${cardCount === 1 ? '' : 's'} in review`);

  const mistakes = data.phylab_mistake_state_v1;
  const mistakeCount = mistakes && typeof mistakes === 'object' ? Object.keys(mistakes).length : 0;
  if (mistakeCount) lines.push(`${mistakeCount} mistake${mistakeCount === 1 ? '' : 's'} banked`);

  const attempts = Object.keys(data).filter(key => key.startsWith('phylab_quiz_results:')).length;
  if (attempts) lines.push(`${attempts} practice attempt${attempts === 1 ? '' : 's'}`);

  if (data.phylab_ia_draft_v1) lines.push('an IA draft');

  return lines.length ? lines.join(' · ') : 'no progress recorded yet';
}

/**
 * Validates a parsed file before it is allowed anywhere near storage.
 *
 * An import overwrites real work, so a malformed or foreign file must be
 * refused with a reason rather than partially applied.
 */
export function validate(payload) {
  if (!payload || typeof payload !== 'object') return 'That file is not a KINETIQ progress export.';
  if (payload.format !== FORMAT) return 'That file was not exported from KINETIQ.';
  if (!Number.isInteger(payload.version) || payload.version > VERSION) {
    return 'That file came from a newer version of KINETIQ than this one.';
  }
  if (!payload.data || typeof payload.data !== 'object') return 'That export contains no progress data.';
  const known = Object.keys(payload.data).filter(isTransferable);
  if (!known.length) return 'That export contains nothing this version of KINETIQ can restore.';
  return null;
}

/**
 * Writes a validated payload into storage.
 *
 * `replace` clears each key it is about to write, so restoring onto a browser
 * that already has progress cannot leave a half-merged state. Anything the
 * file does not mention is left alone either way.
 */
export function applyProgress(payload, { replace = true } = {}) {
  const problem = validate(payload);
  if (problem) throw new Error(problem);
  const restored = [];
  Object.entries(payload.data).forEach(([key, value]) => {
    if (!isTransferable(key)) return;
    try {
      if (replace) localStorage.removeItem(key);
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      restored.push(key);
    } catch {
      // Storage full or blocked; carry on with the keys that do fit.
    }
  });
  return restored;
}

/** A filename that sorts by date and says what it is. */
export const exportFilename = () =>
  `kinetiq-progress-${new Date().toISOString().slice(0, 10)}.json`;
