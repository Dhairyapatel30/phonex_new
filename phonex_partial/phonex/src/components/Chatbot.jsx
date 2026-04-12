import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, X, Send, Sparkles, Mic, MicOff } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../lib/api.js'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'

const WELCOME = {
  role: 'bot',
  text: "Hi! I'm the PHONEX assistant. Ask me about products, coupons, shipping, or your orders.",
  suggestions: ['Show me smartphones', 'What coupons are available?', 'Shipping info'],
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  // ─── Voice input (Web Speech API) ──
  // Speaking immediately sends the transcript instead of just filling the
  // input box — snappier UX and saves one tap.
  const {
    supported: voiceSupported,
    listening,
    toggle: toggleMic,
    stop: stopMic,
  } = useSpeechRecognition({
    onResult: (transcript) => {
      setInput(transcript)
      send(transcript)
    },
    onError: (errorCode) => {
      const msg =
        errorCode === 'not-allowed'
          ? 'Microphone permission denied.'
          : errorCode === 'no-speech'
          ? "I didn't catch that — try again."
          : `Voice error: ${errorCode}`
      toast.error(msg)
    },
  })

  // Stop listening if the user closes the chat panel mid-recording.
  useEffect(() => {
    if (!open && listening) stopMic()
  }, [open, listening, stopMic])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open])

  async function send(text) {
    const trimmed = (text ?? input).trim()
    if (!trimmed || sending) return
    setMessages((m) => [...m, { role: 'user', text: trimmed }])
    setInput('')
    setSending(true)
    try {
      const res = await api.chat(trimmed)
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: res.reply,
          suggestions: res.suggestions,
          products: res.products,
          comparison: res.comparison,
        },
      ])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'bot', text: `Sorry, I couldn't reach the assistant. (${err.message})` },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full gold-bg text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="PHONEX chat assistant"
          className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[92vw] h-[520px] max-h-[80vh] rounded-3xl border bg-white shadow-2xl flex flex-col overflow-hidden"
          style={{ borderColor: 'hsl(var(--border))' }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="h-9 w-9 rounded-full gold-bg text-white flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="font-serif-display text-sm">PHONEX Assistant</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">online</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-cream/40">
            {messages.map((m, idx) => (
              <MessageBubble key={idx} message={m} onSuggest={send} />
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-4 py-2 rounded-2xl bg-white border text-sm" style={{ borderColor: 'hsl(var(--border))' }}>
                  <span className="inline-flex gap-1">
                    <Dot /><Dot delay="150ms" /><Dot delay="300ms" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="p-3 border-t flex gap-2"
            style={{ borderColor: 'hsl(var(--border))' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? 'Listening…' : 'Ask anything about PHONEX…'}
              className="flex-1 rounded-xl border bg-white px-3 py-2 text-sm"
              style={{ borderColor: 'hsl(var(--border))' }}
              aria-label="Chat message"
              disabled={listening}
            />

            {voiceSupported && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={listening}
                title={listening ? 'Listening — click to stop' : 'Speak a message'}
                className={`rounded-xl px-3 py-2 border transition-colors ${
                  listening
                    ? 'bg-red-500 text-white border-red-500 voice-pulse'
                    : 'bg-white hover:bg-cream'
                }`}
                style={!listening ? { borderColor: 'hsl(var(--border))' } : {}}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}

            <button
              type="submit"
              disabled={!input.trim() || sending || listening}
              className="gold-bg text-white rounded-xl px-4 py-2 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function MessageBubble({ message, onSuggest }) {
  const isUser = message.role === 'user'
  // Comparison bubbles need a wider max width to render the table nicely
  const widthClass = message.comparison ? 'max-w-[95%]' : 'max-w-[85%]'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${widthClass} px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
          isUser ? 'gold-bg text-white' : 'bg-white border'
        }`}
        style={!isUser ? { borderColor: 'hsl(var(--border))' } : {}}
      >
        <span>{renderWithBold(message.text)}</span>

        {message.comparison && <ComparisonTable data={message.comparison} />}

        {message.products && message.products.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.products.map((p) => (
              <Link
                key={p.id}
                to={`/product/${p.slug}`}
                className="block rounded-xl bg-cream/60 px-3 py-2 text-xs hover:bg-cream"
              >
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 gold-text">${p.price}</span>
              </Link>
            ))}
          </div>
        )}

        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSuggest(s)}
                className="text-[11px] rounded-full border px-3 py-1 hover:bg-cream"
                style={{ borderColor: 'hsl(var(--border))' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Renders a side-by-side product comparison inside a chat bubble.
 *
 * Expects `data` shape (from /api/chat):
 *   {
 *     productA: { name, slug, price, image_url, ... },
 *     productB: { ...same... },
 *     rows: [{ label, valueA, valueB }, ...]
 *   }
 */
function ComparisonTable({ data }) {
  if (!data?.productA || !data?.productB) return null
  const { productA, productB, rows = [] } = data

  return (
    <div className="mt-3 rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
      {/* Product headers with images + clickable names */}
      <div className="grid grid-cols-[100px_1fr_1fr] bg-cream">
        <div className="p-2" />
        <ProductHeader product={productA} />
        <ProductHeader product={productB} />
      </div>

      {/* Spec rows */}
      <div className="bg-white">
        {rows.map((row, idx) => (
          <div
            key={`${row.label}-${idx}`}
            className="grid grid-cols-[100px_1fr_1fr] border-t text-[11px]"
            style={{ borderColor: 'hsl(var(--border))' }}
          >
            <div className="p-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {row.label}
            </div>
            <div className="p-2 border-l" style={{ borderColor: 'hsl(var(--border))' }}>
              {row.valueA}
            </div>
            <div className="p-2 border-l" style={{ borderColor: 'hsl(var(--border))' }}>
              {row.valueB}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductHeader({ product }) {
  return (
    <div className="p-2 border-l" style={{ borderColor: 'hsl(var(--border))' }}>
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-16 object-cover rounded-md mb-1"
        />
      )}
      <Link
        to={`/product/${product.slug}`}
        className="block text-[11px] font-medium leading-tight hover:underline"
      >
        {product.name}
      </Link>
    </div>
  )
}

// Render **bold** markers without a full markdown parser
function renderWithBold(text = '') {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
  )
}

function Dot({ delay = '0ms' }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
      style={{ animationDelay: delay }}
    />
  )
}
