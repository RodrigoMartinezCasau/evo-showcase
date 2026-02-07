'use client'

import { useEffect, useState } from 'react'
import { t } from '@/src/i18n'
import type { AuthorLayer, FactsLayer, Message } from '../types'
import { fetchMessageCreator, fetchMessageFacts, fetchMessageQuotes } from '../api'

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  padding: '14px 18px',
  borderRadius: 18,
  background: '#262626',
  border: '1px solid #404040',
  color: '#e4e4e7',
  boxSizing: 'border-box',
}

const blockStyle: React.CSSProperties = {
  marginBottom: 12,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#737373',
  marginBottom: 4,
}

const questionLabelStyle: React.CSSProperties = {
  ...labelStyle,
  marginTop: 8,
}

const accordionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '8px 0',
  marginTop: 4,
  background: 'transparent',
  border: 'none',
  color: '#a3a3a3',
  fontSize: 12,
  cursor: 'pointer',
  textAlign: 'left',
}

const accordionContentStyle: React.CSSProperties = {
  padding: '8px 0 12px 24px',
  borderLeft: '1px solid #404040',
  marginLeft: 6,
}

const emptyStyle: React.CSSProperties = {
  color: '#737373',
  fontSize: 13,
  fontStyle: 'italic',
  padding: '4px 0',
}

const claimRowStyle: React.CSSProperties = {
  padding: '8px 0',
  borderBottom: '1px solid #262626',
  fontSize: 13,
  color: '#e4e4e7',
}

const badgeStyle = (certainty: string): React.CSSProperties => {
  const colors: Record<string, string> = {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#ef4444',
    consensus: '#10b981',
    debated: '#f59e0b',
    speculative: '#a3a3a3',
    exact: '#10b981',
    measured: '#10b981',
    theoretical: '#f59e0b',
    'model-dependent': '#a3a3a3',
  }
  return {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    background: colors[certainty] ?? '#404040',
    color: '#fff',
    marginRight: 8,
    textTransform: 'uppercase',
  }
}

const quoteBlockStyle: React.CSSProperties = {
  padding: 10,
  borderLeft: '3px solid #7000ff',
  background: '#171717',
  borderRadius: 6,
  marginBottom: 10,
  fontStyle: 'italic',
  color: '#e4e4e7',
  fontSize: 13,
}

type Props = {
  message: Message
  messageIndex: number
  creatorLoading: boolean
  onGenerateCreator: (messageIndex: number) => void
  onFactsLoaded?: (messageIndex: number, data: FactsLayer) => void
  onQuotesLoaded?: (messageIndex: number, data: AuthorLayer) => void
  onCreatorLoaded?: (messageIndex: number, data: import('../types').CreatorResponse) => void
}

export function AssistantCard({ message, messageIndex, creatorLoading, onGenerateCreator, onFactsLoaded, onQuotesLoaded, onCreatorLoaded }: Props) {
  const [factsOpen, setFactsOpen] = useState(false)
  const [quotesOpen, setQuotesOpen] = useState(false)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [factsLoading, setFactsLoading] = useState(false)
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [creatorLoadingLocal, setCreatorLoadingLocal] = useState(false)

  if (message.role !== 'assistant') return null

  const dr = message.debateResponse
  const labelPostura = t('assistantSteelman')
  const labelContrapunto = t('assistantContrapunto')
  const labelPregunta = t('assistantPregunta')

  const steelman = dr?.debate_layer?.steelman_of_user ?? ''
  const contrarian = dr?.debate_layer?.contrarian_position ?? ''
  const oneQuestion =
    message.nextQuestion ??
    dr?.debate_layer?.socratic_questions?.[0] ??
    dr?.closing?.next_questions_for_user?.[0] ??
    ''

  const factsData = message.factsCache ?? dr?.facts_layer
  const quotesData = message.quotesCache ?? dr?.author_layer
  const factsDomain = factsData?.facts_domain
  const isVerifiedFacts = factsDomain === 'other'
  // Always show exactly 3 fact slots when we have facts data (backend sends 3; pad for old cache)
  const hasFacts = !!factsData
  const factsSectionLabel = 'Hechos científicos'
  const factsEmptyText = isVerifiedFacts ? t('assistantNoFactsVerified') : t('assistantNoFacts')
  const hasQuotes = quotesData && (quotesData.quotes?.length ?? 0) > 0
  const hasCreator =
    message.creatorResponse &&
    ((message.creatorResponse.title_options?.length ?? 0) > 0 ||
      (message.creatorResponse.outline?.length ?? 0) > 0)

  useEffect(() => {
    if (factsOpen && !factsData && message.id && !factsLoading) {
      setFactsLoading(true)
      fetchMessageFacts(message.id)
        .then((d) => onFactsLoaded?.(messageIndex, d))
        .finally(() => setFactsLoading(false))
    }
  }, [factsOpen, factsData, message.id, messageIndex, factsLoading, onFactsLoaded])

  useEffect(() => {
    if (quotesOpen && !quotesData && message.id && !quotesLoading) {
      setQuotesLoading(true)
      fetchMessageQuotes(message.id)
        .then((d) => onQuotesLoaded?.(messageIndex, d))
        .finally(() => setQuotesLoading(false))
    }
  }, [quotesOpen, quotesData, message.id, messageIndex, quotesLoading, onQuotesLoaded])

  const handleGenerateCreator = async () => {
    if (!message.id || creatorLoadingLocal) return
    setCreatorLoadingLocal(true)
    try {
      const d = await fetchMessageCreator(message.id)
      onCreatorLoaded?.(messageIndex, d)
    } finally {
      setCreatorLoadingLocal(false)
    }
  }

  const mainContent = (message.content || '').trim()

  return (
    <div style={cardStyle} className="debate-assistant-body">
      <div style={blockStyle}>
        <div style={labelStyle}>{labelPostura}</div>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{steelman || mainContent || '—'}</p>
      </div>
      <div style={blockStyle}>
        <div style={labelStyle}>{labelContrapunto}</div>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{contrarian || '—'}</p>
      </div>
      <div style={blockStyle}>
        <div style={questionLabelStyle}>{labelPregunta}</div>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{oneQuestion || '—'}</p>
      </div>

      {dr && (
        <>
          <button
            type="button"
            style={accordionHeaderStyle}
            onClick={() => setFactsOpen((o) => !o)}
            aria-expanded={factsOpen}
          >
            <span style={{ fontSize: 14 }}>{factsOpen ? '▼' : '▶'}</span>
            {factsSectionLabel}
          </button>
          {factsOpen && (
            <div style={accordionContentStyle}>
              {factsLoading ? (
                <p style={emptyStyle}>{t('assistantLoading')}</p>
              ) : hasFacts ? (
                <>
                  {factsData!.summary?.trim() && (
                    <p style={{ margin: '0 0 8px', fontSize: 13, color: '#a3a3a3' }}>
                      {factsData!.summary}
                    </p>
                  )}
                  {(() => {
                    const rawFacts = (factsData!.facts ?? []).slice(0, 3)
                    const FACT_SLOTS = 3
                    const slots = [...rawFacts]
                    while (slots.length < FACT_SLOTS) {
                      slots.push({
                        id: `placeholder-${slots.length}`,
                        claim: '—',
                        certainty: '',
                        source_name: '',
                        source_note: '',
                      } as (typeof rawFacts)[0])
                    }
                    return slots.map((f) => (
                      <div key={f.id} style={claimRowStyle}>
                        {f.source_name !== undefined && f.source_name !== '' ? (
                          <>
                            <span style={badgeStyle(f.certainty)}>
                              {typeof f.score_pct === 'number' ? `${f.score_pct}%` : (f.certainty || 'VERIFIED')}
                            </span>
                            {f.claim}
                            {(f.value ?? f.units ?? f.formula) && (
                              <div style={{ fontSize: 12, color: '#a3a3a3', marginTop: 4 }}>
                                {[f.value, f.units, f.formula].filter(Boolean).join(' · ')}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: '#737373', marginTop: 4 }}>
                              {f.source_name}
                              {f.source_note ? ` — ${f.source_note}` : ''}
                            </div>
                          </>
                        ) : (
                          <span style={{ color: '#737373' }}>{f.claim}</span>
                        )}
                      </div>
                    ))
                  })()}
                </>
              ) : (
                isVerifiedFacts ? (
                  <div style={claimRowStyle}>{factsEmptyText}</div>
                ) : (
                  <p style={emptyStyle}>{factsEmptyText}</p>
                )
              )}
            </div>
          )}

          <button
            type="button"
            style={accordionHeaderStyle}
            onClick={() => setQuotesOpen((o) => !o)}
            aria-expanded={quotesOpen}
          >
            <span style={{ fontSize: 14 }}>{quotesOpen ? '▼' : '▶'}</span>
            {t('tabQuotes')}
          </button>
          {quotesOpen && (
            <div style={accordionContentStyle}>
              {quotesLoading ? (
                <p style={emptyStyle}>{t('assistantLoading')}</p>
              ) : hasQuotes ? (
                quotesData!.quotes.map((q, j) => (
                  <div key={q.quote_id ?? j} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: '#a3a3a3', marginBottom: 4 }}>
                      {q.author}
                      {q.work ? `, ${q.work}` : ''}
                      {q.quote_id && (
                        <span style={{ marginLeft: 6, color: '#737373' }}>#{q.quote_id}</span>
                      )}
                    </div>
                    {q.relevance && (
                      <div style={{ fontSize: 11, color: '#737373', marginBottom: 4 }}>
                        {q.relevance}
                      </div>
                    )}
                    <blockquote style={quoteBlockStyle}>{q.quote}</blockquote>
                  </div>
                ))
              ) : (
                <p style={emptyStyle}>{t('assistantNoQuotes')}</p>
              )}
            </div>
          )}

          <button
            type="button"
            style={accordionHeaderStyle}
            onClick={() => setCreatorOpen((o) => !o)}
            aria-expanded={creatorOpen}
          >
            <span style={{ fontSize: 14 }}>{creatorOpen ? '▼' : '▶'}</span>
            {t('tabCreator')}
          </button>
          {creatorOpen && (
            <div style={accordionContentStyle}>
              {hasCreator ? (
                <>
                  <div style={{ ...labelStyle, marginBottom: 6 }}>{t('detailsTitleOptions')}</div>
                  <ul style={{ margin: '0 0 10px', paddingLeft: 20, color: '#e4e4e7', fontSize: 13 }}>
                    {message.creatorResponse!.title_options.map((t, j) => (
                      <li key={j} style={{ marginBottom: 4 }}>{t}</li>
                    ))}
                  </ul>
                  <div style={{ ...labelStyle, marginBottom: 6 }}>{t('detailsOutline')}</div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#e4e4e7', fontSize: 13 }}>
                    {message.creatorResponse!.outline.map((item, j) => (
                      <li key={j} style={{ marginBottom: 4 }}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : creatorLoading || creatorLoadingLocal ? (
                <p style={emptyStyle}>{t('detailsGenerating')}</p>
              ) : (
                <div>
                  <p style={emptyStyle}>{t('assistantNoCreatorYet')}</p>
                  <button
                    type="button"
                    onClick={handleGenerateCreator}
                    disabled={creatorLoading || creatorLoadingLocal}
                    style={{
                      marginTop: 8,
                      padding: '8px 14px',
                      background: 'linear-gradient(90deg, #c7ff02 0%, #7000ff 100%)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {t('assistantGenerateScript')}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
