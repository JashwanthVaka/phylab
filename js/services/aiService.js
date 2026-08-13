import { contextManager } from './contextManager.js';

function readSSE(chunk, buffer, onEvent) {
  const packets = `${buffer}${chunk}`.split(/\r?\n\r?\n/);
  const remaining = packets.pop();
  packets.forEach(packet => {
    const event = packet.match(/^event:\s*(.+)$/m)?.[1] || 'message';
    const data = packet.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('');
    if (!data) return;
    try { onEvent(event, JSON.parse(data)); } catch { /* Wait for a complete SSE packet. */ }
  });
  return remaining;
}

export const aiService = {
  stream(message, { mode = 'Physics Teacher', provider, context = contextManager.fromRoute(), history = [], image = null, onDelta, onSources, onMeta, onError, onDone } = {}) {
    const controller = new AbortController();
    const done = (async () => {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({ message, mode, provider, context, history, image })
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'PHY is unavailable.');
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error('PHY could not open a response stream.');
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { value, done: complete } = await reader.read();
          if (complete) break;
          buffer = readSSE(decoder.decode(value, { stream: true }), buffer, (event, payload) => {
            if (event === 'delta') onDelta?.(payload.delta || '');
            if (event === 'sources') onSources?.(payload.sources || []);
            if (event === 'meta') onMeta?.(payload);
            if (event === 'error') onError?.(payload.error || 'PHY could not complete that request.');
            if (event === 'done') onDone?.();
          });
        }
      } catch (error) {
        if (error.name !== 'AbortError') onError?.(error.message || 'PHY could not complete that request.');
      }
    })();
    return { abort: () => controller.abort(), done };
  }
};
