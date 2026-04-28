import { useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import api from '../services/api';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const STARTER_MESSAGES: ChatMessage[] = [
  {
    role: 'assistant',
    content:
      'I am the Anvayaa project assistant. Ask me only about this supply-chain platform, such as route optimization, sea-only routing, shipments, disruptions, alerts, forecasts, frontend behavior, or backend APIs.',
  },
];

const SUGGESTIONS = [
  'Explain the sea-only route optimizer in this project',
  'How does the disruptions dashboard work here?',
  'What backend APIs power shipments and forecasts?',
  'How is Gemini restricted to project-only answers?',
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(STARTER_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(prefilled?: string) {
    const content = (prefilled ?? input).trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post<{ reply: string; scoped: boolean }>('/api/v1/assistant/chat', {
        messages: nextMessages,
      });

      setMessages((current) => [...current, { role: 'assistant', content: data.reply }]);
    } catch (requestError: unknown) {
      const detail =
        extractErrorDetail(requestError) ||
        'The project assistant is unavailable right now. Check the backend Gemini API configuration.';
      setError(detail);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'I could not answer just now. The backend assistant route may be unavailable, or the Gemini API key may not be configured.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 'calc(100vh - 112px)' }}>
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#60a5fa',
            }}
          >
            <Bot size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '1rem' }}>Project Assistant</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Gemini 2.5 Flash, restricted to this Anvayaa project only
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '8px 12px' }}
              onClick={() => sendMessage(suggestion)}
              disabled={loading}
            >
              <Sparkles size={14} />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--color-border)',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
          }}
        >
          This assistant should answer only about the current supply-chain platform. Out-of-topic questions are refused.
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              style={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
                padding: '12px 14px',
                borderRadius: 14,
                background: message.role === 'user' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(15, 23, 42, 0.7)',
                border: `1px solid ${message.role === 'user' ? 'rgba(96, 165, 250, 0.28)' : 'var(--color-border)'}`,
                color: 'var(--text-primary)',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                fontSize: '0.9rem',
              }}
            >
              {message.content}
            </div>
          ))}

          {loading && (
            <div
              style={{
                alignSelf: 'flex-start',
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--color-border)',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
              }}
            >
              Thinking about this project...
            </div>
          )}
        </div>

        <div style={{ padding: 18, borderTop: '1px solid var(--color-border)' }}>
          {error && (
            <div
              style={{
                marginBottom: 10,
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: '0.78rem',
                color: '#fecaca',
                background: 'rgba(127, 29, 29, 0.24)',
                border: '1px solid rgba(239, 68, 68, 0.24)',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <textarea
              className="input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about route optimization, shipments, disruptions, forecasts, or this project's code..."
              rows={3}
              style={{ resize: 'none', minHeight: 88 }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <button className="btn btn-primary" style={{ minWidth: 120, height: 44 }} onClick={() => sendMessage()} disabled={loading || !input.trim()}>
              <Send size={15} />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function extractErrorDetail(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'detail' in error.response &&
    typeof error.response.detail === 'string'
  ) {
    return error.response.detail;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'detail' in error.response.data &&
    typeof error.response.data.detail === 'string'
  ) {
    return error.response.data.detail;
  }

  return null;
}