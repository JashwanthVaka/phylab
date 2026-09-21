import { escapeHTML } from './utils.js';
import { classroomService } from './services/classroomService.js';
import { authService } from './services/authService.js';

const date = value => value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No deadline';
const shell = body => `<section class="page classroom-page"><p class="eyebrow">KINETIQ CLASSROOM</p><h1>Classes and assignments.</h1>${body}</section>`;

function assignments(rows = []) {
  if (!rows.length) return '<p class="muted">No published assignments yet.</p>';
  return `<ul class="class-assignment-list">${rows.map(row => {
    const config = row.content || {};
    const href = `/quiz?mode=Target+Test&topics=${encodeURIComponent(config.topic || 'all')}&count=${Number(config.questionCount || 10)}`;
    return `<li><div><b>${escapeHTML(row.title)}</b><span>${escapeHTML(row.instructions || 'KINETIQ practice')} · Due ${escapeHTML(date(row.due_at))}</span></div><a class="outline" href="${href}" data-route>Open practice</a></li>`;
  }).join('')}</ul>`;
}

function students(rows = []) {
  if (!rows.length) return '<p class="muted">No learners have joined. Share the code above.</p>';
  return rows.map(student => {
    const mastery = student.mastery == null ? 'No assessed mastery yet' : `${student.mastery}% assessed mastery`;
    return `<div><span class="class-avatar" aria-hidden="true">${escapeHTML(student.name.charAt(0).toUpperCase())}</span><p><b>${escapeHTML(student.name)}</b><span>${student.lessonsCompleted} lessons complete · ${escapeHTML(mastery)}</span></p></div>`;
  }).join('');
}

function teacherCards(rows = []) {
  if (!rows.length) return '<div class="empty-state"><h3>No classes yet</h3><p>Create your first class above. Only accounts explicitly approved as teachers can do this.</p></div>';
  return rows.map(row => `<article class="class-card">
    <header><div><span class="tag">${row.students.length} learner${row.students.length === 1 ? '' : 's'}</span><h2>${escapeHTML(row.name)}</h2></div><button class="outline" type="button" data-copy-code="${escapeHTML(row.join_code)}">Copy code ${escapeHTML(row.join_code)}</button></header>
    <div class="class-students">${students(row.students)}</div>
    <section class="class-assignments"><h3>Assignments</h3>${assignments(row.assignments)}</section>
    <details class="class-assignment-create"><summary>Create assignment</summary><form data-assignment-create data-class-id="${row.id}">
      <label>Title<input name="title" required maxlength="100" placeholder="Mechanics checkpoint"></label>
      <label>Topic<input name="topic" maxlength="80" placeholder="Kinematics or all"></label>
      <label>Questions<input name="questionCount" type="number" min="5" max="40" value="10"></label>
      <label>Due date<input name="dueAt" type="date"></label>
      <label class="class-wide">Instructions<textarea name="instructions" maxlength="500" rows="3"></textarea></label>
      <button class="button">Publish assignment</button><p role="status" data-assignment-status></p>
    </form></details>
  </article>`).join('');
}

function studentCards(rows = []) {
  if (!rows.length) return '<div class="empty-state"><h3>No classes joined</h3><p>Enter the code from your teacher. Your personal KINETIQ workspace still works normally without a class.</p></div>';
  return rows.map(row => `<article class="class-card"><header><div><span class="tag">JOINED CLASS</span><h2>${escapeHTML(row.name)}</h2></div><button class="text-button" type="button" data-leave-class="${row.id}">Leave class</button></header>${assignments(row.assignments)}</article>`).join('');
}

function teacherView(data) {
  return shell(`<p class="page-lead">Create classes, share a private code, assign original KINETIQ practice, and see only the progress evidence learners agree to share by joining.</p>
    <form class="class-create surface-form" data-class-create>
      <label>New class name<input name="name" required maxlength="80" placeholder="Physics HL, Period 2"></label>
      <button class="button">Create class</button><p role="status" data-class-status></p>
    </form>
    <div class="class-grid">${teacherCards(data.classes)}</div>`);
}

function studentView(data) {
  return shell(`<p class="page-lead">Join a teacher's class with its private code. Your teacher will see lesson completion, assessed topic mastery and quiz summaries. Bookmarks, Ask KIT history and private revision notes stay private.</p>
    <form class="class-join surface-form" data-class-join>
      <label>Class code<input name="code" required maxlength="32" autocomplete="off" placeholder="Enter the code from your teacher"></label>
      <button class="button">Join class</button><p role="status" data-class-status></p>
    </form>
    <div class="class-grid">${studentCards(data.classes)}</div>`);
}

export async function classroomPage() {
  if (!authService.enabled()) return shell('<div class="empty-state"><h3>Accounts are required</h3><p>Classes use signed-in accounts so every learner keeps separate progress.</p><a class="button" href="/login" data-route>Sign in</a></div>');
  try {
    const data = await classroomService.overview();
    return ['teacher', 'admin'].includes(data.role) ? teacherView(data) : studentView(data);
  } catch (error) {
    const signedIn = await authService.user().catch(() => null);
    return shell(`<div class="empty-state" role="alert"><h3>${signedIn ? 'Classes could not load' : 'Sign in to use classes'}</h3><p>${escapeHTML(signedIn ? error.message : 'Your class and progress are tied to your own account.')}</p><a class="button" href="/login" data-route>Sign in</a></div>`);
  }
}

export function bindClassroom(router) {
  const status = element => element?.querySelector('[role="status"]');
  document.querySelector('[data-class-create]')?.addEventListener('submit', async event => {
    event.preventDefault(); const out = status(event.currentTarget); out.textContent = 'Creating class…';
    try { await classroomService.createClass(new FormData(event.currentTarget).get('name')); router.go('/classroom'); }
    catch (error) { out.textContent = error.message; }
  });
  document.querySelector('[data-class-join]')?.addEventListener('submit', async event => {
    event.preventDefault(); const out = status(event.currentTarget); out.textContent = 'Joining class…';
    try { await classroomService.join(new FormData(event.currentTarget).get('code')); router.go('/classroom'); }
    catch (error) { out.textContent = error.message; }
  });
  document.querySelectorAll('[data-assignment-create]').forEach(form => form.addEventListener('submit', async event => {
    event.preventDefault(); const out = status(form); const values = Object.fromEntries(new FormData(form)); out.textContent = 'Publishing…';
    try { await classroomService.createAssignment({ ...values, classId: form.dataset.classId }); router.go('/classroom'); }
    catch (error) { out.textContent = error.message; }
  }));
  document.querySelectorAll('[data-copy-code]').forEach(button => button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(button.dataset.copyCode); button.textContent = 'Code copied';
  }));
  document.querySelectorAll('[data-leave-class]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm('Leave this class? Your teacher will immediately lose access to your progress.')) return;
    await classroomService.leave(button.dataset.leaveClass); router.go('/classroom');
  }));
}
