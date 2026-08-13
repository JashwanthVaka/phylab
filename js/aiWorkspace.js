import { aiService } from './services/aiService.js';
import { aiHistoryService } from './services/aiHistoryService.js';
import { authService } from './services/authService.js';
import { bookmarkService } from './services/bookmarkService.js';
import { contextManager } from './services/contextManager.js';
import { escapeHTML } from './utils.js';
import { markdownService } from './services/markdownService.js';
import { guestConversationService } from './services/guestConversationService.js';

const MODES = ['Physics Teacher', 'Numerical Solver', 'Formula Explainer', 'Derivation Tutor', 'IB Examiner', 'Revision Coach', 'Lab Assistant', 'Graph Analyzer', 'TOK Discussion', 'IA Mentor', 'Question Generator', 'Challenge Me', 'Concept Check'];
const SELECTED_KEY = 'phylab_ai_selected_conversation';
const safe = value => markdownService.render(value || '');
const date = value => new Date(value || Date.now()).toLocaleString();

const messageHTML = message => `<article class="ai-message ${message.role}" data-message-id="${escapeHTML(message.id || '')}"><header><b>${message.role === 'user' ? 'You' : 'KIT'}:</b><time>${date(message.createdAt || message.created_at)}</time></header><div>${safe(message.content)}</div>${message.metadata?.imageAttached ? '<p class="tag">Image attached to this question</p>' : ''}${message.sources?.length ? `<div class="source-cards">${message.sources.map(source => `<a href="${escapeHTML(source.href)}" data-route>${escapeHTML(source.type)}: ${escapeHTML(source.title)}</a>`).join('')}</div>` : ''}${message.role === 'assistant' ? '<footer><button type="button" data-ai-action="copy">Copy</button><button type="button" data-ai-action="simpler">Explain simpler</button><button type="button" data-ai-action="steps">Show steps</button><button type="button" data-ai-action="hint">Give hint</button><button type="button" data-ai-action="quiz">Quiz me</button><button type="button" data-ai-action="bookmark">Save</button></footer>' : ''}</article>`;
const conversationHTML = (conversation, selected) => `<div class="ai-conversation-row"><button type="button" class="text-button ${conversation.id === selected ? 'active' : ''}" data-ai-open="${conversation.id}">${escapeHTML(conversation.title)}<small>${date(conversation.updatedAt || conversation.updated_at)}</small></button><button type="button" data-ai-rename="${conversation.id}" aria-label="Rename conversation">✎</button><button type="button" data-ai-delete="${conversation.id}" aria-label="Delete conversation">×</button></div>`;

/** Reports which server-side AI providers are usable so the page can explain itself before a learner types. */
async function providerStatus() {
  try {
    const response = await fetch('/api/ai/providers');
    if (!response.ok) throw new Error('unavailable');
    return await response.json();
  } catch {
    return { active: null, providers: [] };
  }
}

function providerNotice(status) {
  const ready = status.providers.filter(provider => provider.configured);
  if (ready.length) {
    return `<p class="ai-status">KIT is answering with <b>${escapeHTML(ready.find(item => item.id === status.active)?.label || ready[0].label)}</b>. ${ready.length > 1 ? 'Switch provider below at any time.' : ''} Answers are drafted from KINETIQ content first and are practice support, not official IB marking.</p>`;
  }
  const keys = status.providers.map(provider => `<code>${escapeHTML(provider.envKey)}</code>`).join(', ') || '<code>GROQ_API_KEY</code>';
  return `<p class="ai-status">KIT is installed and ready, but no AI key is configured on the server yet, so it cannot answer. Add one of ${keys} to your <code>.env</code> file (or your host’s environment settings) and restart KINETIQ. Everything else — lessons, formulae, graphs, simulations and quizzes — works without a key.</p>`;
}

export async function aiWorkspace() {
  const [signedIn, status] = await Promise.all([authService.user().then(Boolean), providerStatus()]);
  const conversations = (signedIn ? await aiHistoryService.list() : guestConversationService.list()).sort((a, b) => new Date(b.updatedAt || b.updated_at) - new Date(a.updatedAt || a.updated_at));
  const selected = sessionStorage.getItem(SELECTED_KEY) || conversations[0]?.id || '';
  const ready = status.providers.filter(provider => provider.configured);
  const providerField = ready.length > 1
    ? `<label for="aiProvider">AI provider</label><select id="aiProvider">${ready.map(provider => `<option value="${escapeHTML(provider.id)}" ${provider.id === status.active ? 'selected' : ''}>${escapeHTML(provider.label)}</option>`).join('')}</select>`
    : '';
  return `<section class="page ai-workspace"><p class="eyebrow">KIT AI WORKSPACE</p><h1>Ask KIT.</h1>${providerNotice(status)}<div class="ai-layout" data-ai-workspace data-ai-store="${signedIn ? 'remote' : 'guest'}"><aside class="content-card ai-sidebar"><button class="button" type="button" data-ai-new>New conversation</button><label for="aiSearch">Search conversations</label><input id="aiSearch" data-ai-search autocomplete="off"><div data-ai-list>${conversations.map(item => conversationHTML(item, selected)).join('') || '<p class="muted">Create a conversation to begin.</p>'}</div></aside><main class="ai-chat"><div id="aiMessages" class="chat" aria-live="polite" aria-label="Conversation history"></div><form id="aiForm"><label for="aiMode">Teaching mode</label><select id="aiMode">${MODES.map(mode => `<option>${mode}</option>`).join('')}</select>${providerField}<label for="aiInput">Message</label><textarea id="aiInput" required placeholder="Ask about a question, formula, graph, or lab result."></textarea><label for="aiImage">Question or graph image <span class="muted">(optional, PNG/JPEG/WebP/GIF, max 1.8 MB)</span></label><input id="aiImage" type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-ai-image><p class="muted" data-ai-image-status>No image selected.</p><div><button class="button" id="aiSend">Send</button><button type="button" class="outline" data-ai-stop hidden>Stop</button><button type="button" class="outline" data-ai-regenerate>Regenerate</button></div></form></main><aside class="content-card ai-context"><p class="eyebrow">LIVE CONTEXT</p><pre data-ai-context>${escapeHTML(JSON.stringify(contextManager.fromRoute(), null, 2))}</pre></aside></div></section>`;
}

export function bindAI() {
  const root = document.querySelector('[data-ai-workspace]');
  if (!root) return undefined;
  const guestMode = root.dataset.aiStore === 'guest';
  const sidebar = root.querySelector('.ai-sidebar');
  const messages = root.querySelector('#aiMessages');
  const form = root.querySelector('#aiForm');
  const input = root.querySelector('#aiInput');
  const modeInput = root.querySelector('#aiMode');
  const imageInput = root.querySelector('[data-ai-image]');
  const imageStatus = root.querySelector('[data-ai-image-status]');
  const send = root.querySelector('#aiSend');
  const stop = root.querySelector('[data-ai-stop]');
  const controller = new AbortController();
  let currentId = sessionStorage.getItem(SELECTED_KEY) || sidebar.querySelector('[data-ai-open]')?.dataset.aiOpen || '';
  let history = [];
  let selectedMode = 'Physics Teacher';
  let pendingRequest = null;
  let failedRequest = null;
  let imageData = null;

  const rows = async () => guestMode ? guestConversationService.list() : aiHistoryService.list();
  const persist = async message => {
    if (guestMode) return guestConversationService.message(currentId, message);
    const stored = await aiHistoryService.addMessage({ conversation_id: currentId, role: message.role, content: message.content, metadata: { mode: selectedMode, context: message.context || contextManager.fromRoute(), sources: message.sources || [], imageAttached: Boolean(message.metadata?.imageAttached) } });
    if (stored?.data?.id) message.id = stored.data.id;
    return stored;
  };
  const updateConversation = async patch => guestMode ? guestConversationService.update(currentId, patch) : aiHistoryService.update(currentId, patch);
  const renderList = async filter => {
    const term = String(filter || '').toLowerCase();
    const list = (await rows()).filter(row => row.title.toLowerCase().includes(term)).sort((a, b) => new Date(b.updatedAt || b.updated_at) - new Date(a.updatedAt || a.updated_at));
    root.querySelector('[data-ai-list]').innerHTML = list.map(row => conversationHTML(row, currentId)).join('') || '<p class="muted">No conversations found.</p>';
  };
  const scrollLatest = () => { messages.scrollTop = messages.scrollHeight; };
  const renderMessages = () => { messages.innerHTML = history.length ? history.map(messageHTML).join('') : '<p><b>KIT:</b> Choose a teaching mode and ask about the physics you are studying.</p>'; modeInput.value = selectedMode; scrollLatest(); };
  const setPending = value => { send.disabled = value; input.disabled = value; imageInput.disabled = value; stop.hidden = !value; };
  const showError = text => { messages.insertAdjacentHTML('beforeend', `<article class="content-card" role="alert"><h3>KIT needs another try</h3><p>${escapeHTML(text)}</p><button type="button" data-ai-retry>Retry</button></article>`); scrollLatest(); };
  const getConversation = async id => {
    if (guestMode) return guestConversationService.list().find(row => row.id === id) || null;
    const row = (await aiHistoryService.list()).find(item => item.id === id);
    return row ? { ...row, messages: await aiHistoryService.messages(id) } : null;
  };
  const open = async id => {
    const row = await getConversation(id);
    if (!row) return;
    currentId = row.id;
    sessionStorage.setItem(SELECTED_KEY, currentId);
    history = (row.messages || []).map(message => ({ ...message, sources: message.sources || message.metadata?.sources || [] }));
    selectedMode = row.mode || row.context?.mode || row.messages?.at(-1)?.metadata?.mode || 'Physics Teacher';
    renderMessages(); await renderList(root.querySelector('[data-ai-search]').value);
  };
  const ensureConversation = async () => {
    if (currentId) return true;
    const context = { ...contextManager.fromRoute(), mode: selectedMode };
    const row = guestMode ? guestConversationService.create('New KIT conversation') : (await aiHistoryService.createConversation({ title: 'New KIT conversation', context }))?.data;
    if (!row) return false;
    currentId = row.id; sessionStorage.setItem(SELECTED_KEY, currentId); await renderList();
    return true;
  };
  const readImage = file => new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 1800000) return reject(new Error('Use a PNG, JPEG, WebP, or GIF image smaller than 1.8 MB.'));
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('KIT could not read that image.')); reader.readAsDataURL(file);
  });
  const request = async ({ text, reuseUser = false } = {}) => {
    if (pendingRequest || !text || !await ensureConversation()) return;
    selectedMode = modeInput.value;
    contextManager.remember({ teaching_mode: selectedMode, recent_questions: [text] });
    const requestContext = { ...contextManager.fromRoute(), mode: selectedMode };
    await updateConversation({ context: requestContext });
    let user = history.at(-1);
    if (!reuseUser || user?.role !== 'user') {
      user = { id: crypto.randomUUID(), role: 'user', content: text, createdAt: Date.now(), context: requestContext, metadata: { imageAttached: Boolean(imageData) } };
      history.push(user); await persist(user);
    }
    const assistant = { id: crypto.randomUUID(), role: 'assistant', content: '', createdAt: Date.now(), sources: [] };
    history.push(assistant);
    failedRequest = { text: user.content, reuseUser: true };
    renderMessages(); setPending(true);
    let streamError = null;
    pendingRequest = aiService.stream(user.content, {
      mode: selectedMode, provider: root.querySelector('#aiProvider')?.value || undefined, context: user.context, history: history.slice(0, -1).map(item => ({ role: item.role, content: item.content })), image: imageData,
      onDelta: delta => { assistant.content += delta; renderMessages(); },
      onSources: sources => { assistant.sources = sources; renderMessages(); },
      onError: error => { streamError = error; },
      onDone: () => {}
    });
    await pendingRequest.done;
    pendingRequest = null; setPending(false); imageData = null; imageInput.value = ''; imageStatus.textContent = 'No image selected.';
    if (streamError || !assistant.content.trim()) { history = history.filter(item => item !== assistant); renderMessages(); showError(streamError || 'KIT returned an empty response. Please retry.'); return; }
    await persist(assistant); failedRequest = null; renderMessages(); await renderList(root.querySelector('[data-ai-search]').value);
  };
  const removeLastAssistant = async () => {
    const index = [...history].map(item => item.role).lastIndexOf('assistant');
    if (index < 0) return null;
    const [removed] = history.splice(index, 1);
    if (guestMode) guestConversationService.update(currentId, { messages: history });
    else if (removed.id) await aiHistoryService.removeMessage(removed.id);
    return [...history].reverse().find(message => message.role === 'user');
  };

  void open(currentId);
  sidebar.addEventListener('click', async event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.matches('[data-ai-new]')) { currentId = ''; history = []; selectedMode = 'Physics Teacher'; await ensureConversation(); renderMessages(); return; }
    if (button.matches('[data-ai-open]')) { await open(button.dataset.aiOpen); return; }
    if (button.matches('[data-ai-rename]')) { const title = window.prompt('Conversation title'); if (title?.trim()) { if (guestMode) guestConversationService.update(button.dataset.aiRename, { title: title.trim() }); else await aiHistoryService.rename(button.dataset.aiRename, title.trim()); await renderList(root.querySelector('[data-ai-search]').value); } return; }
    if (button.matches('[data-ai-delete]') && window.confirm('Delete this conversation?')) { if (guestMode) guestConversationService.remove(button.dataset.aiDelete); else await aiHistoryService.remove(button.dataset.aiDelete); if (currentId === button.dataset.aiDelete) { currentId = ''; history = []; sessionStorage.removeItem(SELECTED_KEY); } await renderList(root.querySelector('[data-ai-search]').value); renderMessages(); }
  }, { signal: controller.signal });
  root.querySelector('[data-ai-search]').addEventListener('input', event => { void renderList(event.target.value); }, { signal: controller.signal });
  imageInput.addEventListener('change', async () => { try { imageData = await readImage(imageInput.files?.[0]); imageStatus.textContent = imageData ? `${imageInput.files[0].name} is ready to analyse.` : 'No image selected.'; } catch (error) { imageData = null; imageInput.value = ''; imageStatus.textContent = error.message; } }, { signal: controller.signal });
  modeInput.addEventListener('change', () => { selectedMode = modeInput.value; contextManager.remember({ teaching_mode: selectedMode }); if (currentId) void updateConversation({ context: { ...contextManager.fromRoute(), mode: selectedMode } }); }, { signal: controller.signal });
  form.addEventListener('submit', event => { event.preventDefault(); const text = input.value.trim(); input.value = ''; void request({ text }); }, { signal: controller.signal });
  stop.addEventListener('click', () => pendingRequest?.abort(), { signal: controller.signal });
  root.querySelector('[data-ai-regenerate]').addEventListener('click', async () => { const user = await removeLastAssistant(); if (user) void request({ text: user.content, reuseUser: true }); }, { signal: controller.signal });
  messages.addEventListener('click', event => {
    const action = event.target.dataset.aiAction; if (!action) { if (event.target.matches('[data-ai-retry]') && failedRequest) void request(failedRequest); return; }
    const card = event.target.closest('.ai-message'); const assistant = history.find(message => message.id === card?.dataset.messageId);
    if (!assistant) return;
    if (action === 'copy') { navigator.clipboard?.writeText(assistant.content); return; }
    if (action === 'bookmark') { void bookmarkService.add({ content_type: 'ai_message', content_key: assistant.id, note: assistant.content.slice(0, 500) }); return; }
    const prompts = { simpler: 'Explain this more simply', steps: 'Show the working step by step', hint: 'Give a short hint without the final answer', quiz: 'Quiz me on this with one original IBDP Physics question' };
    void request({ text: `${prompts[action]}:\n${assistant.content}` });
  }, { signal: controller.signal });
  return () => { pendingRequest?.abort(); controller.abort(); };
}
