import { aiService } from './services/aiService.js';
import { aiHistoryService } from './services/aiHistoryService.js';
import { contextManager } from './services/contextManager.js';
import { escapeHTML } from './utils.js';
import { markdownService } from './services/markdownService.js';
import { guestConversationService } from './services/guestConversationService.js';

const MODES = ['Quick Answer', 'Explain', 'Teach', 'Step-by-step', 'Hint', 'Socratic Tutor', 'Numerical Solver', 'Examiner', 'Revision', 'Challenge Me', 'Concept Check'];
const SELECTED_KEY = 'phylab_ai_selected_conversation';
const safe = value => markdownService.render(value || '');

const messageHTML = message => `<article class="ai-message ${message.role}" data-message-id="${escapeHTML(message.id || '')}"><header><b>${message.role === 'user' ? 'You' : 'PHY'}:</b><time>${new Date(message.createdAt || message.created_at || Date.now()).toLocaleTimeString()}</time></header><div>${safe(message.content)}</div>${message.sources?.length ? `<div class="source-cards">${message.sources.map(source => `<a href="${source.href}" data-route>${escapeHTML(source.type)}: ${escapeHTML(source.title)}</a>`).join('')}</div>` : ''}${message.role === 'assistant' ? '<footer><button data-ai-action="copy">Copy</button><button data-ai-action="simpler">Explain Simpler</button><button data-ai-action="steps">Show Steps</button><button data-ai-action="hint">Give Hint</button><button data-ai-action="quiz">Quiz Me</button></footer>' : ''}</article>`;
const conversationHTML = (conversation, selected) => `<div class="ai-conversation-row"><button class="text-button ${conversation.id === selected ? 'active' : ''}" data-ai-open="${conversation.id}">${escapeHTML(conversation.title)}<small>${new Date(conversation.updatedAt || conversation.updated_at || Date.now()).toLocaleString()}</small></button><button data-ai-rename="${conversation.id}" aria-label="Rename conversation">✎</button><button data-ai-delete="${conversation.id}" aria-label="Delete conversation">×</button></div>`;

export async function aiWorkspace() {
  const remote = await aiHistoryService.list();
  const guestMode = !remote.length;
  const conversations = (guestMode ? guestConversationService.list() : remote).sort((a, b) => new Date(b.updatedAt || b.updated_at) - new Date(a.updatedAt || a.updated_at));
  const selected = sessionStorage.getItem(SELECTED_KEY) || conversations[0]?.id || '';
  return `<section class="page ai-workspace"><p class="eyebrow">PHY AI WORKSPACE</p><h1>Ask PHY.</h1><div class="ai-layout"><aside class="content-card ai-sidebar" data-ai-store="${guestMode ? 'guest' : 'remote'}"><button class="button" data-ai-new>New conversation</button><label for="aiSearch">Search conversations</label><input id="aiSearch" data-ai-search><div data-ai-list>${conversations.map(item => conversationHTML(item, selected)).join('') || '<p class="muted">Create a conversation to begin.</p>'}</div></aside><main class="ai-chat"><div id="aiMessages" class="chat" aria-live="polite" aria-label="Conversation history"></div><form id="aiForm"><label for="aiMode">Teaching mode</label><select id="aiMode">${MODES.map(mode => `<option>${mode}</option>`).join('')}</select><label for="aiInput">Message</label><textarea id="aiInput" required></textarea><div><button class="button" id="aiSend">Send</button><button type="button" class="outline" data-ai-regenerate>Regenerate</button></div></form></main><aside class="content-card ai-context"><p class="eyebrow">CONTEXT</p><pre>${escapeHTML(JSON.stringify(contextManager.fromRoute(), null, 2))}</pre></aside></div></section>`;
}

export function bindAI() {
  const sidebar = document.querySelector('[data-ai-store]');
  if (!sidebar) return;
  const guestMode = sidebar.dataset.aiStore === 'guest';
  let currentId = sessionStorage.getItem(SELECTED_KEY) || sidebar.querySelector('[data-ai-open]')?.dataset.aiOpen || '';
  let history = [];
  let selectedMode = 'Explain';
  let pending = false;
  let failedRequest = null;
  const messages = document.querySelector('#aiMessages');
  const send = document.querySelector('#aiSend');

  const rows = async () => guestMode ? guestConversationService.list() : aiHistoryService.list();
  const getConversation = async id => {
    if (guestMode) return guestConversationService.list().find(item => item.id === id);
    const row = (await aiHistoryService.list()).find(item => item.id === id);
    return row ? { ...row, messages: await aiHistoryService.messages(id) } : null;
  };
  const scrollLatest = () => { messages.scrollTop = messages.scrollHeight; };
  const renderMessages = () => { messages.innerHTML = history.length ? history.map(messageHTML).join('') : '<p><b>PHY:</b> Choose a teaching mode and ask about the physics you are studying.</p>'; document.querySelector('#aiMode').value = selectedMode; scrollLatest(); };
  const setPending = value => { pending = value; send.disabled = value; document.querySelector('#aiInput').disabled = value; if (value) messages.insertAdjacentHTML('beforeend', '<p class="chat-loading" role="status">PHY is thinking<span aria-hidden="true">…</span></p>'); else document.querySelector('.chat-loading')?.remove(); scrollLatest(); };
  const errorCard = text => { messages.insertAdjacentHTML('beforeend', `<article class="content-card" role="alert"><h3>PHY needs another try</h3><p>${escapeHTML(text)}</p><button data-ai-retry>Retry</button></article>`); scrollLatest(); };
  const open = async id => { const row = await getConversation(id); if (!row) return; currentId = row.id; sessionStorage.setItem(SELECTED_KEY, currentId); history = row.messages || []; selectedMode = row.mode || 'Explain'; renderMessages(); };
  const persist = async message => { if (guestMode) return guestConversationService.message(currentId, message); return aiHistoryService.addMessage({ conversation_id: currentId, role: message.role, content: message.content, metadata: { mode: selectedMode, context: message.context || contextManager.fromRoute(), sources: message.sources || [] } }); };
  const ensureConversation = async () => { if (currentId) return true; const row = guestMode ? guestConversationService.create() : (await aiHistoryService.createConversation({ title: 'New PHY conversation', context: contextManager.fromRoute() }))?.data; if (!row) return false; currentId = row.id; sessionStorage.setItem(SELECTED_KEY, currentId); return true; };
  const request = async ({ text, reuseUser = false } = {}) => {
    if (pending || !text || !await ensureConversation()) return;
    selectedMode = document.querySelector('#aiMode').value;
    let user = history.at(-1);
    if (!reuseUser || user?.role !== 'user') { user = { id: crypto.randomUUID(), role: 'user', content: text, createdAt: Date.now(), mode: selectedMode, context: contextManager.fromRoute() }; if (!history.some(message => message.id === user.id)) { history.push(user); await persist(user); } }
    failedRequest = { text: user.content, reuseUser: true };
    renderMessages(); setPending(true);
    try { const response = await aiService.ask(user.content, { mode: selectedMode, history, context: user.context }); const assistant = { id: crypto.randomUUID(), role: 'assistant', content: response.answer, createdAt: Date.now(), mode: selectedMode, sources: response.sources || [] }; history.push(assistant); await persist(assistant); failedRequest = null; renderMessages(); }
    catch { errorCard('The request could not be completed. Check your connection and try again.'); }
    finally { setPending(false); }
  };

  sidebar.querySelector('[data-ai-new]').onclick = async () => { const row = guestMode ? guestConversationService.create() : (await aiHistoryService.createConversation({ title: 'New PHY conversation', context: contextManager.fromRoute() }))?.data; if (row) { await open(row.id); location.reload(); } };
  sidebar.querySelectorAll('[data-ai-open]').forEach(button => button.onclick = () => open(button.dataset.aiOpen));
  sidebar.querySelectorAll('[data-ai-rename]').forEach(button => button.onclick = async () => { const title = prompt('Conversation title'); if (!title) return; if (guestMode) guestConversationService.update(button.dataset.aiRename, { title }); else await aiHistoryService.rename(button.dataset.aiRename, title); location.reload(); });
  sidebar.querySelectorAll('[data-ai-delete]').forEach(button => button.onclick = async () => { if (!confirm('Delete this conversation?')) return; if (guestMode) guestConversationService.remove(button.dataset.aiDelete); else await aiHistoryService.remove(button.dataset.aiDelete); if (currentId === button.dataset.aiDelete) sessionStorage.removeItem(SELECTED_KEY); location.reload(); });
  sidebar.querySelector('[data-ai-search]').oninput = async event => { const term = event.target.value.toLowerCase(); document.querySelector('[data-ai-list]').innerHTML = (await rows()).filter(item => item.title.toLowerCase().includes(term)).sort((a, b) => new Date(b.updatedAt || b.updated_at) - new Date(a.updatedAt || a.updated_at)).map(item => conversationHTML(item, currentId)).join('') || '<p class="muted">No conversations found.</p>'; };
  void open(currentId);
  document.querySelector('#aiForm').onsubmit = event => { event.preventDefault(); const input = document.querySelector('#aiInput'); const text = input.value.trim(); input.value = ''; request({ text }); };
  document.querySelector('[data-ai-regenerate]').onclick = () => { const user = [...history].reverse().find(message => message.role === 'user'); if (user) request({ text: user.content, reuseUser: true }); };
  document.addEventListener('click', event => { const action = event.target.dataset.aiAction; if (action === 'copy') navigator.clipboard?.writeText(event.target.closest('.ai-message').innerText); if (action && action !== 'copy') { const assistant = [...history].reverse().find(message => message.role === 'assistant'); if (assistant) request({ text: `${action === 'simpler' ? 'Explain this more simply' : action === 'steps' ? 'Show the steps' : action === 'hint' ? 'Give me a hint' : 'Quiz me'}: ${assistant.content}` }); } if (event.target.matches('[data-ai-retry]') && failedRequest) request(failedRequest); });
}
