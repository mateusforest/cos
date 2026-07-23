'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Send,
  User,
  Lock,
  Check,
  FileText,
  Wallet,
  CalendarDays,
  BarChart3,
  Users,
} from 'lucide-react'
import { CosLogo } from '@/components/cos-logo'
import { cn } from '@/lib/utils'

type ResultCard = {
  icon: 'user' | 'document' | 'payment' | 'calendar' | 'report'
  title: string
  lines: string[]
  tag: string
}

type Message = {
  id: number
  role: 'user' | 'cos'
  text: string
  card?: ResultCard
  time: string
}

const SUGGESTIONS = [
  'Gerar um contrato',
  'Registrar um pagamento',
  'Agendar uma reunião no COS Meet',
  'Gerar um relatório',
  'Ver clientes cadastrados',
  'Simular fluxo de vendas',
]

const ICONS = {
  user: Users,
  document: FileText,
  payment: Wallet,
  calendar: CalendarDays,
  report: BarChart3,
} as const

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Gera uma resposta simulada com base em palavras-chave. Sem backend. */
function simulate(input: string): { text: string; card?: ResultCard } {
  const q = input.toLowerCase()

  if (q.includes('contrato')) {
    return {
      text: 'Contrato gerado e pronto para envio.',
      card: {
        icon: 'document',
        title: 'Contrato_Prestacao_Servicos.pdf',
        lines: ['PDF • 248 KB', 'Gerado agora'],
        tag: 'Documento',
      },
    }
  }
  if (q.includes('pagamento') || q.includes('pagar') || q.includes('cobran')) {
    return {
      text: 'Pagamento registrado no financeiro.',
      card: {
        icon: 'payment',
        title: 'Pagamento de R$ 1.250,00',
        lines: ['Recebido • Pix', 'Lançado agora'],
        tag: 'Financeiro',
      },
    }
  }
  if (q.includes('reuni') || q.includes('agend')) {
    return {
      text: 'Reunião agendada e convite enviado.',
      card: {
        icon: 'calendar',
        title: 'Reunião de alinhamento',
        lines: ['Amanhã • 14:00', 'COS Meet'],
        tag: 'Agenda',
      },
    }
  }
  if (q.includes('relat')) {
    return {
      text: 'Relatório gerado com os dados atuais.',
      card: {
        icon: 'report',
        title: 'Relatório de vendas — Julho',
        lines: ['+18% vs. mês anterior', 'Atualizado agora'],
        tag: 'Resultados',
      },
    }
  }
  if (q.includes('cliente') && (q.includes('ver') || q.includes('lista') || q.includes('cadastrados'))) {
    return {
      text: 'Você tem 2.500 clientes cadastrados. Exibindo os mais recentes.',
      card: {
        icon: 'user',
        title: 'Maria Souza',
        lines: ['maria@email.com • (11) 98888-7777', 'Cadastrado hoje'],
        tag: 'Cliente',
      },
    }
  }
  if (q.includes('fluxo') || q.includes('venda')) {
    return {
      text: 'Simulação de fluxo de vendas concluída.',
      card: {
        icon: 'report',
        title: 'Projeção de 30 dias',
        lines: ['Receita estimada: R$ 84.000', 'Conversão: 4,2%'],
        tag: 'CRM',
      },
    }
  }
  if (q.includes('cadastr') && q.includes('cliente')) {
    const nameMatch = input.match(/chamado?\s+([A-Za-zÀ-ú\s]+?)(,|email|$)/i)
    const name = nameMatch ? nameMatch[1].trim() : 'Novo cliente'
    const emailMatch = input.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)
    const phoneMatch = input.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/)
    return {
      text: 'Cliente cadastrado com sucesso.',
      card: {
        icon: 'user',
        title: name,
        lines: [
          [emailMatch?.[0], phoneMatch?.[0]].filter(Boolean).join(' • ') || 'Dados registrados',
          'Cadastrado agora',
        ],
        tag: 'Cliente',
      },
    }
  }

  return {
    text: 'Entendi sua solicitação e executei a ação nos módulos correspondentes.',
  }
}

const INITIAL: Message[] = [
  {
    id: 1,
    role: 'user',
    text: 'Cadastrar um cliente chamado Maria Souza, email maria@email.com, telefone (11) 98888-7777',
    time: '09:41',
  },
  {
    id: 2,
    role: 'cos',
    text: 'Cliente cadastrado com sucesso.',
    time: '09:41',
    card: {
      icon: 'user',
      title: 'Maria Souza',
      lines: ['maria@email.com • (11) 98888-7777', 'Cliente'],
      tag: 'Cliente',
    },
  },
]

function ResultCardView({ card }: { card: ResultCard }) {
  const Icon = ICONS[card.icon]
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{card.title}</p>
        <p className="truncate text-xs text-muted-foreground">{card.lines[0]}</p>
      </div>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="size-3.5" />
      </span>
    </div>
  )
}

export function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>(INITIAL)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(3)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  function send(value: string) {
    const text = value.trim()
    if (!text || typing) return

    const userMsg: Message = { id: idRef.current++, role: 'user', text, time: now() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setTyping(true)

    window.setTimeout(() => {
      const { text: reply, card } = simulate(text)
      setMessages((prev) => [
        ...prev,
        { id: idRef.current++, role: 'cos', text: reply, card, time: now() },
      ])
      setTyping(false)
    }, 650)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_24px_60px_-40px_rgba(24,20,50,0.35)]">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Conversa */}
        <div
          ref={scrollRef}
          className="max-h-[420px] overflow-y-auto border-b border-border/60 p-6 lg:border-b-0 lg:border-r"
        >
          <div className="flex flex-col gap-5">
            {messages.map((m) => (
              <div key={m.id} className="flex gap-3">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full',
                    m.role === 'user'
                      ? 'bg-muted text-muted-foreground'
                      : 'border-2 border-brand',
                  )}
                >
                  {m.role === 'user' && <User className="size-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      m.role === 'user' ? 'text-brand' : 'text-foreground',
                    )}
                  >
                    {m.role === 'user' ? 'Você' : 'COS'}
                  </p>
                  <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
                    {m.text}
                  </p>
                  {m.card && <ResultCardView card={m.card} />}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-brand" />
                <div className="flex items-center gap-1 pt-2">
                  <Dot delay="0ms" />
                  <Dot delay="150ms" />
                  <Dot delay="300ms" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sugestões + input */}
        <div className="flex flex-col p-6">
          <p className="text-sm font-medium text-foreground">Tente também:</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-border/70 bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-brand"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            className="mt-auto flex items-center gap-2 pt-8"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  send(input)
                }
              }}
              placeholder="Digite sua solicitação..."
              aria-label="Digite sua solicitação"
              className="h-11 flex-1 rounded-xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
            >
              <Send className="size-4" />
              Enviar
            </button>
          </form>
        </div>
      </div>

      {/* Rodapé de demonstração */}
      <div className="flex items-center justify-center gap-2 border-t border-border/60 bg-muted/40 py-3 text-xs text-muted-foreground">
        <Lock className="size-3.5" />
        Este é um ambiente de demonstração. Os dados não são salvos.
      </div>
    </div>
  )
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
      style={{ animationDelay: delay }}
    />
  )
}
