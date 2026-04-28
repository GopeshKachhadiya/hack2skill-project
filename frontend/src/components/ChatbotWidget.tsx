import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useShipments } from '../hooks/useShipments';
import { useDisruptions } from '../hooks/useDisruptions';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const MAX_ASSISTANT_MESSAGES = 24;

const STARTER_MESSAGES: ChatMessage[] = [
  {
    role: 'assistant',
    content: 'Hi! I am the Anvayaa AI assistant. Ask me about shipments, route optimization, disruptions, or the platform.',
  },
];

function ChatMessageContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="markdown-content">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: '8px' }} />;
        
        const isBullet = line.trim().startsWith('* ');
        const cleanLine = isBullet ? line.trim().slice(2) : line;

        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const elements = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', paddingLeft: '4px' }}>
              <span style={{ color: '#3b82f6' }}>•</span>
              <div style={{ flex: 1 }}>{elements}</div>
            </div>
          );
        }

        return <p key={i} style={{ margin: '0 0 10px 0', lineHeight: 1.5 }}>{elements}</p>;
      })}
    </div>
  );
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(STARTER_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: shipments = [] } = useShipments();
  const { data: disruptions = [] } = useDisruptions();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setCooldownSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  async function sendMessage() {
    const content = input.trim();
    if (!content || loading || cooldownSeconds > 0) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    const requestMessages = nextMessages.slice(-MAX_ASSISTANT_MESSAGES);
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post<{ reply: string; scoped: boolean; retryAfterSeconds?: number }>('/api/v1/assistant/chat', {
        messages: requestMessages,
        context: {
          shipments: shipments.slice(0, 75).map((shipment) => ({
            id: shipment.id,
            origin: shipment.origin,
            destination: shipment.destination,
            cargoType: shipment.cargoType,
            priority: shipment.priority,
            currentStatus: shipment.currentStatus,
            riskScore: shipment.riskScore,
            delay: shipment.delay,
            expectedArrival: shipment.expectedArrival,
            cargoValue: shipment.cargoValue,
          })),
          disruptions: disruptions.slice(0, 12).map((disruption) => ({
            id: disruption.id,
            location: disruption.location,
            disruptionType: disruption.disruptionType,
            predictedSeverity: disruption.predictedSeverity,
            probability: disruption.probability,
            status: disruption.status,
          })),
        },
      });
      setCooldownSeconds(data.retryAfterSeconds && data.retryAfterSeconds > 0 ? data.retryAfterSeconds : 0);
      setMessages((current) => [...current, { role: 'assistant', content: data.reply }]);
    } catch (requestError: unknown) {
      const detail =
        extractErrorDetail(requestError) ||
        'Assistant unavailable right now. The backend route may be down, but shipment-specific questions should still work once it reconnects.';
      setError(detail);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: detail,
        },
      ]);
      setCooldownSeconds(extractRetryAfterSeconds(detail) ?? 0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>
        {`
          @keyframes slideUpFade {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes pulseSoft {
            0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
            70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
            100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
          }
          @keyframes messagePop {
            0% { opacity: 0; transform: scale(0.95) translateY(10px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          .chat-window {
            animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
          }
          .chat-message {
            animation: messagePop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .chat-header-bg {
            background: linear-gradient(135deg, rgba(30,58,138,0.8), rgba(15,23,42,0.95));
            border-bottom: 1px solid rgba(255,255,255,0.05);
          }
          .typing-dot {
            display: inline-block;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background-color: #94a3b8;
            animation: typing 1.4s infinite both;
            margin: 0 2px;
          }
          .typing-dot:nth-child(1) { animation-delay: 0s; }
          .typing-dot:nth-child(2) { animation-delay: 0.2s; }
          .typing-dot:nth-child(3) { animation-delay: 0.4s; }
          @keyframes typing {
            0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
          .chat-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .chat-scroll::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.1);
          }
          .chat-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
          }
          .chat-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.2);
          }
          .markdown-content strong { color: #fff; font-weight: 700; }
        `}
      </style>
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
        {isOpen ? (
          <div 
            className="chat-window" 
            style={{ 
              width: '380px', 
              height: '550px', 
              display: 'flex', 
              flexDirection: 'column', 
              padding: 0,
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '20px',
              overflow: 'hidden',
              background: 'rgba(15, 23, 42, 0.85)'
            }}
          >
            {}
            <div className="chat-header-bg" style={{ 
              padding: '16px 20px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: 32, height: 32, borderRadius: 10, 
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', 
                  color: '#fff', display: 'grid', placeItems: 'center',
                  boxShadow: '0 2px 10px rgba(59,130,246,0.3)'
                }}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', letterSpacing: '0.3px' }}>Anvayaa AI</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    Online
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ 
                  background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', 
                  cursor: 'pointer', display: 'grid', placeItems: 'center',
                  width: 28, height: 28, borderRadius: '50%', transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <X size={16} />
              </button>
            </div>

            {}
            <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className="chat-message"
                  style={{ 
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(30, 41, 59, 0.95)',
                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    color: msg.role === 'user' ? '#ffffff' : '#f1f5f9',
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    whiteSpace: 'normal'
                  }}>
                    <ChatMessageContent content={msg.content} />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', padding: '0 4px' }}>
                    {msg.role === 'user' ? 'You' : 'Anvayaa'}
                  </span>
                </div>
              ))}
              {loading && (
                <div className="chat-message" style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                  <div style={{
                    padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
                    background: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {}
            {error && (
              <div style={{ 
                margin: '0 20px 10px', padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', 
                fontSize: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <div style={{ width: 4, height: 16, background: '#ef4444', borderRadius: 2 }} />
                {error}
              </div>
            )}

            {cooldownSeconds > 0 && (
              <div style={{ 
                margin: '0 20px 10px', padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.14)', color: '#fde68a', 
                fontSize: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.28)',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <div style={{ width: 4, height: 16, background: '#f59e0b', borderRadius: 2 }} />
                Gemini rate limit is active. You can send the next message in about <strong>{cooldownSeconds}s</strong>.
              </div>
            )}

            {}
            <div style={{ 
              padding: '16px', 
              background: 'rgba(15, 23, 42, 0.95)', 
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', gap: '10px', alignItems: 'center' 
            }}>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && cooldownSeconds === 0 && sendMessage()}
                placeholder={cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s before sending again...` : "Message Anvayaa AI..."}
                disabled={cooldownSeconds > 0}
                style={{ 
                  flex: 1, fontSize: '0.85rem', padding: '12px 16px', 
                  borderRadius: '12px', background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                  outline: 'none', transition: 'border-color 0.2s, background 0.2s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
              />
              <button 
                onClick={sendMessage} 
                disabled={loading || !input.trim() || cooldownSeconds > 0}
                style={{ 
                  width: '44px', height: '44px', padding: 0, display: 'grid', placeItems: 'center', 
                  borderRadius: '12px', minWidth: '44px',
                  background: input.trim() && !loading && cooldownSeconds === 0 ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.1)',
                  color: input.trim() && !loading && cooldownSeconds === 0 ? '#fff' : '#64748b',
                  border: 'none', cursor: input.trim() && !loading && cooldownSeconds === 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: input.trim() && !loading && cooldownSeconds === 0 ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
                }}
              >
                <Send size={18} style={{ marginLeft: 2 }} />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsOpen(true)}
            style={{ 
              width: '60px', height: '60px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', 
              color: 'white', border: 'none', cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
              display: 'grid', placeItems: 'center',
              transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              animation: 'pulseSoft 2s infinite'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.animation = 'none';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.animation = 'pulseSoft 2s infinite';
            }}
          >
            <Bot size={28} />
          </button>
        )}
      </div>
    </>
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
    'detail' in error.response.data &&
    Array.isArray(error.response.data.detail)
  ) {
    return error.response.data.detail
      .map((entry) => {
        if (typeof entry !== 'object' || entry === null) return 'Assistant request validation failed.';
        const path = Array.isArray(entry.loc) ? entry.loc.join('.') : 'request';
        const message = typeof entry.msg === 'string' ? entry.msg : 'Invalid request payload.';
        return `${path}: ${message}`;
      })
      .join(' | ');
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

function extractRetryAfterSeconds(detail: string): number | null {
  const match = detail.match(/(\d+)\s*seconds?/i);
  if (!match) return null;
  const seconds = Number.parseInt(match[1], 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}