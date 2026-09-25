import { slugify } from './utils.js';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const asList = value => Array.isArray(value) ? value : [];
const percent = row => Number(row?.max) > 0 ? Math.round(Number(row.earned || 0) / Number(row.max) * 100) : null;
const idOrder = (left, right) => String(left.id).localeCompare(String(right.id), undefined, { numeric: true });

/** Aggregate only scored question evidence. The same shape works for local reports and tests. */
export function evidenceFromReports(reports = []) {
  const topics = new Map();
  reports.forEach(report => (report.review || []).forEach(item => {
    if (!item?.q?.topic || !item?.r) return;
    const key = slugify(item.q.topic);
    const row = topics.get(key) || { label: item.q.topic, attempted: 0, earned: 0, max: 0, diagnosticAttempts: 0 };
    row.attempted += 1;
    row.earned += Number(item.r.marks || 0);
    row.max += Number(item.q.marks || 0);
    if (report.mode === 'Diagnostic') row.diagnosticAttempts += 1;
    topics.set(key, row);
  }));
  return Object.fromEntries([...topics].map(([key, row]) => [key, { ...row, percentage: percent(row) }]));
}

/** Difficulty rises only when enough scored evidence supports it. */
export function difficultyForEvidence(row = {}) {
  const attempted = Number(row.attempted || row.attempt_count || 0);
  const score = Number.isFinite(row.percentage) ? row.percentage : Number(row.mastery_score);
  if (attempted < 3 || !Number.isFinite(score) || score < 60) return 'easy';
  if (attempted < 8 || score < 80) return 'medium';
  return 'hard';
}

function originalBank(questions) {
  const originals = questions.filter(question => question.sourceType === 'original-kinetiq');
  return originals.length ? originals : questions;
}

/** A deterministic, broad baseline made only from questions already in KINETIQ's bank. */
export function selectDiagnosticQuestions(questions = [], { count = 10 } = {}) {
  const source = [...originalBank(questions)].sort((left, right) =>
    String(left.topic).localeCompare(String(right.topic))
      || DIFFICULTIES.indexOf(left.difficulty) - DIFFICULTIES.indexOf(right.difficulty)
      || idOrder(left, right));
  const groups = new Map();
  source.forEach(question => {
    const key = slugify(question.topic);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(question);
  });
  const selected = [];
  const topicGroups = [...groups.values()];
  for (let round = 0; selected.length < count; round += 1) {
    let found = false;
    topicGroups.forEach(group => {
      if (selected.length < count && group[round]) {
        selected.push(group[round]);
        found = true;
      }
    });
    if (!found) break;
  }
  return selected;
}

/** Selects a stable set, starting with least-secure topics at their evidenced difficulty. */
export function selectAdaptiveQuestions(questions = [], evidence = {}, { count = 5 } = {}) {
  const source = originalBank(questions);
  const groups = new Map();
  source.forEach(question => {
    const key = slugify(question.topic);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(question);
  });
  const topicKeys = [...groups.keys()].sort((left, right) => {
    const a = evidence[left] || {};
    const b = evidence[right] || {};
    const aScore = Number.isFinite(a.percentage) ? a.percentage : -1;
    const bScore = Number.isFinite(b.percentage) ? b.percentage : -1;
    return aScore - bScore || Number(a.attempted || 0) - Number(b.attempted || 0) || left.localeCompare(right);
  });
  const selected = [];
  const used = new Set();
  for (let round = 0; selected.length < count; round += 1) {
    let found = false;
    for (const key of topicKeys) {
      if (selected.length >= count) break;
      const target = difficultyForEvidence(evidence[key]);
      const targetIndex = DIFFICULTIES.indexOf(target);
      const preference = [target, DIFFICULTIES[Math.max(0, targetIndex - 1)], DIFFICULTIES[Math.min(2, targetIndex + 1)]];
      const candidates = groups.get(key).filter(question => !used.has(String(question.id)));
      const candidate = preference.map(level => candidates.filter(question => question.difficulty === level).sort(idOrder)[round]).find(Boolean)
        || candidates.sort(idOrder)[round];
      if (!candidate) continue;
      selected.push(candidate);
      used.add(String(candidate.id));
      found = true;
    }
    if (!found) break;
  }
  return selected;
}

const overlap = (left, right) => asList(left).filter(value => asList(right).includes(value));

/** Finds an unused original question with a defensible relationship to the mistake. */
export function recoveryQuestion(questions = [], mistaken, usedIds = []) {
  if (!mistaken?.topic) return null;
  const used = new Set(usedIds.map(String));
  const ranked = originalBank(questions).filter(candidate =>
    String(candidate.id) !== String(mistaken.id)
      && !used.has(String(candidate.id))
      && slugify(candidate.topic) === slugify(mistaken.topic))
    .map(candidate => {
      const sharedSkills = overlap(candidate.skills, mistaken.skills);
      const sharedTags = overlap(candidate.tags, mistaken.tags);
      const sameSubtopic = Boolean(candidate.subtopic && mistaken.subtopic && slugify(candidate.subtopic) === slugify(mistaken.subtopic));
      const score = sharedSkills.length * 4 + sharedTags.length * 2 + (sameSubtopic ? 6 : 0)
        - Math.max(0, DIFFICULTIES.indexOf(candidate.difficulty) - DIFFICULTIES.indexOf(mistaken.difficulty));
      return { candidate, sharedSkills, sharedTags, sameSubtopic, score };
    })
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score
      || DIFFICULTIES.indexOf(left.candidate.difficulty) - DIFFICULTIES.indexOf(right.candidate.difficulty)
      || idOrder(left.candidate, right.candidate));
  const match = ranked[0];
  if (!match) return null;
  const relationship = match.sameSubtopic ? 'same subtopic'
    : match.sharedSkills.length ? `shared skill: ${match.sharedSkills[0]}`
      : `shared idea: ${match.sharedTags[0]}`;
  return {
    ...match.candidate,
    recoveryOf: String(mistaken.id),
    adaptiveTag: 'recovery',
    recoveryRelationship: relationship,
  };
}

export function evidenceLabel(attempted = 0) {
  if (!attempted) return 'Not assessed';
  if (attempted < 5) return 'Early evidence';
  if (attempted < 10) return 'Developing evidence';
  return 'Measured evidence';
}

/** Includes every catalogue topic, even when no evidence row exists. */
export function completeTopicMastery(topicNames = [], rows = []) {
  const byTopic = new Map(rows.map(row => [slugify(row.label || row.topic_slug), row]));
  return [...new Set(topicNames.filter(Boolean))].sort((a, b) => a.localeCompare(b)).map(label => {
    const row = byTopic.get(slugify(label)) || {};
    const attempted = Number(row.attempted ?? row.attempt_count ?? 0);
    const score = attempted ? Number(row.percentage ?? row.mastery_score ?? 0) : null;
    return { ...row, label, attempted, score, evidenceLabel: evidenceLabel(attempted) };
  });
}
