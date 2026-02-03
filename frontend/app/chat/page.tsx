'use client'

import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// --- Tipos alineados con PhysicalSpec (backend)
type Variable = { name: string; meaning: string; unit: string }
type CandidateLaw = { name: string; form: string; why_applicable: string }
type SuggestedLaw = {
  kb_id: string
  name: string
  equation: string
  explanation: string
  status: string  // "postulate" | "empirical" | "derived" | "definition"
  assumptions: string[]
  validity_limits: string[]
  notes: string[]
}

// Helper to map status to display label
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    postulate: "POSTULATE",
    empirical: "EMPIRICAL",
    derived: "DERIVED",
    definition: "DEFINITION",
  }
  return labels[status.toLowerCase()] || status.toUpperCase()
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    postulate: "#8b5cf6",  // purple
    empirical: "#f59e0b",  // amber
    derived: "#3b82f6",     // blue
    definition: "#10b981",  // green
  }
  return colors[status.toLowerCase()] || "#71717a"
}

type PhysicalSpec = {
  domain: string
  goal: string
  assumptions: string[]
  variables: Variable[]
  constraints: string[]
  candidate_laws: CandidateLaw[]
  suggested_laws: SuggestedLaw[]
  questions: string[]
}

type FixSuggestion = { op: string; path: string; value: unknown; label: string }
type CheckItem = {
  id: string
  name: string
  status: 'passed' | 'warning' | 'failed'
  message?: string | null
  related_fields?: string[]
  fix_suggestions?: FixSuggestion[] | null
  metadata?: { suggested_law?: string; source_kb_id?: string; kb_driven?: boolean; [k: string]: unknown } | null
}
type CheckReport = { items: CheckItem[] }

function setByPath<T>(obj: T, pathStr: string, value: unknown): T {
  const path = pathStr.split('.')
  const result = JSON.parse(JSON.stringify(obj)) as T
  let cur: unknown = result
  for (let i = 0; i < path.length - 1; i++) {
    cur = (cur as Record<string, unknown>)[path[i]]
  }
  ;(cur as Record<string, unknown>)[path[path.length - 1]] = value
  return result
}

type ChatTurn = { role: 'user' | 'assistant'; content: string }

const card = {
  border: '1px solid #3f3f46',
  borderRadius: 10,
  background: '#18181b',
  padding: '1rem 1.25rem',
  marginBottom: '0.75rem',
} as const

const cardTitle = { color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase' as const, marginBottom: '0.5rem' }

function SpecCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <div style={cardTitle}>{title}</div>
      {children}
    </div>
  )
}

function SpecPanel({ spec, kbDebug }: { spec: PhysicalSpec; kbDebug: { kb_candidate_count: number; kb_candidates: Array<{ id: string; name: string }> } | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <SpecCard title="Dominio"><span>{spec.domain}</span></SpecCard>
      <SpecCard title="Objetivo"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{spec.goal}</p></SpecCard>
      <SpecCard title="Supuestos">
        {spec.assumptions.length ? (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {spec.assumptions.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        ) : <span style={{ color: '#71717a' }}>—</span>}
      </SpecCard>
      <SpecCard title="Variables">
        {spec.variables.length ? (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {spec.variables.map((v, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>
                <strong>{v.name}</strong> {v.meaning} <span style={{ color: '#71717a' }}>[{v.unit}]</span>
              </li>
            ))}
          </ul>
        ) : <span style={{ color: '#71717a' }}>—</span>}
      </SpecCard>
      <SpecCard title="Restricciones">
        {spec.constraints.length ? (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>{spec.constraints.map((c, i) => <li key={i}>{c}</li>)}</ul>
        ) : <span style={{ color: '#71717a' }}>—</span>}
      </SpecCard>
      <SpecCard title="Leyes candidatas">
        {spec.candidate_laws.length ? (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {spec.candidate_laws.map((l, i) => (
              <li key={i} style={{ marginBottom: '0.75rem' }}>
                <strong>{l.name}</strong>: {l.form}
                <div style={{ fontSize: '0.9em', color: '#a1a1aa', marginTop: '0.25rem' }}>{l.why_applicable}</div>
              </li>
            ))}
          </ul>
        ) : <span style={{ color: '#71717a' }}>—</span>}
      </SpecCard>
      <SpecCard title="Leyes sugeridas (KB)">
        {spec.suggested_laws && spec.suggested_laws.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {spec.suggested_laws.map((l, i) => {
              const statusLabel = getStatusLabel(l.status || '')
              const statusColor = getStatusColor(l.status || '')
              const hasAssumptions = l.assumptions && l.assumptions.length > 0
              const hasValidityLimits = l.validity_limits && l.validity_limits.length > 0
              const hasNotes = l.notes && l.notes.length > 0
              return (
                <li key={i} style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: i < spec.suggested_laws.length - 1 ? '1px solid #3f3f46' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{l.name}</strong>
                    <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: '#3b82f6', color: 'white', borderRadius: 4 }}>
                      KB
                    </span>
                    {statusLabel && (
                      <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: statusColor, color: 'white', borderRadius: 4 }}>
                        {statusLabel}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#e4e4e7', marginBottom: '0.5rem', fontWeight: 500 }}>{l.equation}</div>
                  <div style={{ fontSize: '0.85em', color: '#a1a1aa', marginBottom: '0.5rem' }}>{l.explanation}</div>
                  
                  {hasAssumptions && (
                    <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.25rem', fontWeight: 600 }}>Assumptions:</div>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#d4d4d8' }}>
                        {l.assumptions.map((a, j) => (
                          <li key={j} style={{ marginBottom: '0.2rem' }}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {hasValidityLimits && (
                    <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.25rem', fontWeight: 600 }}>Validity limits:</div>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#d4d4d8' }}>
                        {l.validity_limits.map((v, j) => (
                          <li key={j} style={{ marginBottom: '0.2rem' }}>{v}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {hasNotes && (
                    <details style={{ marginTop: '0.75rem' }}>
                      <summary style={{ fontSize: '0.75rem', color: '#a1a1aa', cursor: 'pointer', fontWeight: 600, listStyle: 'none' }}>
                        Notes ({l.notes.length})
                      </summary>
                      <ul style={{ margin: '0.25rem 0 0 1.25rem', paddingLeft: 0, fontSize: '0.8rem', color: '#d4d4d8', listStyle: 'none' }}>
                        {l.notes.map((n, j) => (
                          <li key={j} style={{ marginBottom: '0.3rem', paddingLeft: '0.5rem', borderLeft: '2px solid #3f3f46' }}>{n}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  
                  <div style={{ fontSize: '0.7rem', color: '#71717a', marginTop: '0.5rem' }}>Source: KB:{l.kb_id}</div>
                </li>
              )
            })}
          </ul>
        ) : <span style={{ color: '#71717a' }}>—</span>}
        {/* Debug UI - hidden by default, can be enabled with DEV flag */}
        {process.env.NODE_ENV === 'development' && kbDebug && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(59,130,246,0.1)', borderRadius: 6, fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Debug (DEV):</div>
            <div>KB candidates: {kbDebug.kb_candidate_count}</div>
            {kbDebug.kb_candidates.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>Candidate IDs:</div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.75rem' }}>
                  {kbDebug.kb_candidates.map((c, i) => (
                    <li key={i}>{c.id}: {c.name}</li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#71717a' }}>
              Suggested laws count: {spec.suggested_laws?.length || 0}
            </div>
          </div>
        )}
      </SpecCard>
      <SpecCard title="Preguntas">
        {spec.questions.length ? (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>{spec.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
        ) : <span style={{ color: '#71717a' }}>—</span>}
      </SpecCard>
    </div>
  )
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  passed: { bg: 'rgba(34,197,94,0.2)', color: '#4ade80' },
  warning: { bg: 'rgba(234,179,8,0.2)', color: '#facc15' },
  failed: { bg: 'rgba(239,68,68,0.2)', color: '#f87171' },
}

function VerificationPanel({
  report,
  spec,
  onRerun,
  onApplyFix,
  loading,
  disabled,
}: {
  report: CheckReport | null
  spec: PhysicalSpec | null
  onRerun: () => void
  onApplyFix: (f: FixSuggestion) => void
  loading: boolean
  disabled: boolean
}) {
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Verification</h2>
        <button
          type="button"
          onClick={onRerun}
          disabled={disabled || loading}
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            background: '#27272a',
            border: '1px solid #3f3f46',
            color: '#e4e4e7',
            borderRadius: 6,
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '…' : 'Re-run checks'}
        </button>
      </div>
      {!report ? (
        <p style={{ color: '#71717a', fontSize: '0.9rem' }}>Los resultados de verificación aparecerán aquí.</p>
      ) : (
        <>
          {(() => {
            const heuristicLaws = report.items.filter((it) => it.metadata?.suggested_law).map((it) => it.metadata!.suggested_law as string)
            const kbLaws = spec?.suggested_laws || []
            const dimensionalItems = report.items.filter((it) => it.metadata?.dimensional_check)
            const regularItems = report.items.filter((it) => !it.metadata?.suggested_law && !it.metadata?.dimensional_check)
            return (
              <>
                {(kbLaws.length > 0 || heuristicLaws.length > 0) && (
                  <div style={{ ...card, marginBottom: '1rem' }}>
                    <div style={cardTitle}>Suggested laws</div>
                    {kbLaws.length > 0 && (
                      <div style={{ marginBottom: kbLaws.length > 0 && heuristicLaws.length > 0 ? '1rem' : 0 }}>
                        {kbLaws.map((l, i) => (
                          <div key={i} style={{ marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(59,130,246,0.1)', borderRadius: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <strong style={{ fontSize: '0.9rem' }}>{l.name}</strong>
                              <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem', background: '#3b82f6', color: 'white', borderRadius: 4 }}>
                                KB
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#e4e4e7', marginBottom: '0.25rem' }}>{l.equation}</div>
                            <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.15rem' }}>{l.explanation}</div>
                            <div style={{ fontSize: '0.7rem', color: '#71717a' }}>Source: KB:{l.kb_id}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {heuristicLaws.length > 0 && (
                      <div>
                        {kbLaws.length > 0 && <div style={{ fontSize: '0.7rem', color: '#71717a', marginBottom: '0.5rem' }}>Heuristic suggestions:</div>}
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                          {heuristicLaws.map((formula, i) => (
                            <li key={i} style={{ marginBottom: '0.25rem' }}>{formula}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {dimensionalItems.length > 0 && (
                  <div style={{ ...card, marginBottom: '1rem' }}>
                    <div style={cardTitle}>Dimensional consistency</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {dimensionalItems.map((it) => {
                        const isFailed = it.status === 'failed'
                        const m = it.metadata as { law_form?: string; lhs_unit?: string; rhs_unit?: string } | undefined
                        return (
                          <div
                            key={it.id}
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderRadius: 8,
                              borderLeft: `3px solid ${isFailed ? '#ef4444' : it.status === 'warning' ? '#eab308' : '#22c55e'}`,
                              background: isFailed ? 'rgba(239,68,68,0.2)' : it.status === 'warning' ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.1)',
                            }}
                          >
                            {m?.law_form && <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>{m.law_form}</div>}
                            <div style={{ fontSize: '0.85rem', fontWeight: isFailed ? 600 : 500, color: isFailed ? '#f87171' : it.status === 'warning' ? '#facc15' : '#4ade80' }}>
                              {it.status}: {it.message}
                            </div>
                            {isFailed && m?.lhs_unit != null && m?.rhs_unit != null && (
                              <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span><strong>LHS:</strong> {String(m.lhs_unit)}</span>
                                <span><strong>RHS:</strong> {String(m.rhs_unit)}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {regularItems.map((it) => {
            const s = statusStyle[it.status] || statusStyle.warning
            const isKbDriven = it.metadata?.kb_driven === true || it.metadata?.source_kb_id != null
            const sourceKbId = it.metadata?.source_kb_id as string | undefined
            return (
              <div
                key={it.id}
                style={{
                  ...card,
                  padding: '0.6rem 0.9rem',
                  borderLeft: `3px solid ${s.color}`,
                  background: s.bg,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ color: s.color, fontWeight: 600, fontSize: '0.85rem' }}>{it.status}</span>
                  <span style={{ fontSize: '0.9rem' }}>{it.name}</span>
                  {isKbDriven && (
                    <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem', background: '#3b82f6', color: 'white', borderRadius: 4 }}>
                      KB
                    </span>
                  )}
                </div>
                {it.message && <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '0.25rem' }}>{it.message}</div>}
                {sourceKbId && (
                  <div style={{ fontSize: '0.7rem', color: '#71717a', marginTop: '0.25rem' }}>
                    Source: KB:{sourceKbId}
                  </div>
                )}
                {it.fix_suggestions && it.fix_suggestions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                    {it.fix_suggestions.map((f, j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => onApplyFix(f)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          background: '#27272a',
                          border: '1px solid #3f3f46',
                          color: '#a1a1aa',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        Apply: {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
                </div>
              </>
            )
          })()}
        </>
      )}
    </div>
  )
}

export default function ChatPage() {
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [spec, setSpec] = useState<PhysicalSpec | null>(null)
  const [checkReport, setCheckReport] = useState<CheckReport | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkLoading, setCheckLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kbDebug, setKbDebug] = useState<{ kb_candidate_count: number; kb_candidates: Array<{ id: string; name: string }> } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    setError(null)
    setTurns((t) => [...t, { role: 'user' as const, content: input.trim() }])
    setInput('')

    const body: { message: string; conversation_id?: string } = { message: input.trim() }
    if (conversationId) body.conversation_id = conversationId

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || res.statusText)

      setConversationId(data.conversation_id)
      setSpec(data.physical_spec as PhysicalSpec)
      setCheckReport((data.check_report as CheckReport) ?? null)
      setKbDebug({
        kb_candidate_count: data.kb_candidate_count || 0,
        kb_candidates: data.kb_candidates || [],
      })
      setTurns((t) => [...t, { role: 'assistant', content: data.message }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión. ¿Backend en ' + API_URL + '?')
      setTurns((t) => t.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Chat */}
      <section
        style={{
          flex: '1 1 55%',
          minWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #27272a',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #27272a' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Chat</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#a1a1aa', fontSize: '0.9rem' }}>
            Describe tu idea; se generará un PhysicalSpec en el panel.
          </p>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
          {turns.length === 0 && (
            <p style={{ color: '#71717a', fontSize: '0.9rem' }}>
              Escribe un problema o idea de física (ej. “Un bloque desliza por un plano inclinado sin fricción”).
            </p>
          )}
          {turns.map((t, i) => (
            <div
              key={i}
              style={{
                marginBottom: '1rem',
                maxWidth: '85%',
                marginLeft: t.role === 'user' ? 'auto' : 0,
                marginRight: t.role === 'user' ? 0 : 'auto',
                padding: '0.75rem 1rem',
                borderRadius: 10,
                background: t.role === 'user' ? '#3b82f6' : '#27272a',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: t.role === 'user' ? 'rgba(255,255,255,0.8)' : '#a1a1aa', marginBottom: '0.25rem' }}>
                {t.role === 'user' ? 'Tú' : 'Physics Copilot'}
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{t.content}</div>
            </div>
          ))}
          {loading && (
            <div style={{ padding: '0.75rem', color: '#71717a', fontSize: '0.9rem' }}>Generando PhysicalSpec…</div>
          )}
          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.15)', borderRadius: 8, color: '#fca5a5' }}>
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1rem 1.5rem', borderTop: '1px solid #27272a' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: 8,
                border: '1px solid #3f3f46',
                background: '#18181b',
                color: '#e4e4e7',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.25rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Enviar
            </button>
          </div>
        </form>
      </section>

      {/* Panel PhysicalSpec + Verification */}
      <aside
        style={{
          width: 400,
          minWidth: 320,
          overflow: 'auto',
          padding: '1.25rem 1.5rem',
          background: '#0c0c0e',
        }}
      >
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>PhysicalSpec</h2>
        {spec ? <SpecPanel spec={spec} kbDebug={kbDebug} /> : <p style={{ color: '#71717a', fontSize: '0.9rem' }}>El último PhysicalSpec aparecerá aquí.</p>}
        <VerificationPanel
          report={checkReport}
          spec={spec}
          onRerun={async () => {
            if (!spec) return
            setCheckLoading(true)
            try {
              const res = await fetch(`${API_URL}/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ physical_spec: spec }),
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.detail || res.statusText)
              setCheckReport(data.check_report as CheckReport)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Error al re-ejecutar checks')
            } finally {
              setCheckLoading(false)
            }
          }}
          onApplyFix={(f) => {
            if (!spec || f.op !== 'set') return
            setSpec(setByPath(spec, f.path, f.value))
          }}
          loading={checkLoading}
          disabled={!spec}
        />
      </aside>
    </div>
  )
}
