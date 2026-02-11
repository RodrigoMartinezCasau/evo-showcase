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

  const dl = dr?.debate_layer
  const steelman = dl?.steelman_of_user ?? ''
  const contrarian = dl?.contrarian_position ?? ''
  const steelmanBlocks = dl?.steelman_blocks
  const steelmanResumen = dl?.steelman_resumen ?? ''
  const contrarianBlocks = dl?.contrarian_blocks
  const contrarianResumen = dl?.contrarian_resumen ?? ''
  const oneQuestion =
    message.nextQuestion ??
    dl?.socratic_questions?.[0] ??
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

  const sectionHeaderStyle: React.CSSProperties = { ...labelStyle, marginBottom: 6 }
  const blockTitleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#e4e4e7', marginBottom: 4, marginTop: 8 }
  const bulletStyle: React.CSSProperties = { marginBottom: 4, paddingLeft: 4, fontSize: 13, color: '#e4e4e7' }
  const resumenStyle: React.CSSProperties = { marginTop: 8, fontSize: 13, color: '#a3a3a3', fontStyle: 'italic' }

  return (
    <div style={cardStyle} className="debate-assistant-body">
      <div style={blockStyle}>
        <div style={sectionHeaderStyle}>⭐ TU POSTURA (EN SU MEJOR VERSIÓN)</div>
        {steelmanBlocks && steelmanBlocks.length > 0 ? (
          <>
            {steelmanBlocks.map((block, i) => (
              <div key={i}>
                <div style={blockTitleStyle}>[{i + 1}] {block.title}</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {(block.bullets || []).map((b, j) => (
                    <li key={j} style={bulletStyle}>• {b}</li>
                  ))}
                </ul>
              </div>
            ))}
            {steelmanResumen && (
              <div style={resumenStyle}>
                <strong>RESUMEN RÁPIDO</strong><br />
                → {steelmanResumen}
              </div>
            )}
          </>
        ) : (
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{steelman || mainContent || '—'}</p>
        )}
      </div>
      <div style={blockStyle}>
        <div style={sectionHeaderStyle}>⭐ CONTRAPOSTURA</div>
        {contrarianBlocks && contrarianBlocks.length > 0 ? (
          <>
            {contrarianBlocks.map((block, i) => (
              <div key={i}>
                <div style={blockTitleStyle}>[{i + 1}] {block.title}</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {(block.bullets || []).map((b, j) => (
                    <li key={j} style={bulletStyle}>• {b}</li>
                  ))}
                </ul>
              </div>
            ))}
            {contrarianResumen && (
              <div style={resumenStyle}>
                <strong>RESUMEN RÁPIDO</strong><br />
                → {contrarianResumen}
              </div>
            )}
          </>
        ) : (
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{contrarian || '—'}</p>
        )}
      </div>
      <div style={blockStyle}>
        <div style={sectionHeaderStyle}>⭐ PREGUNTA PARA TI</div>
        {oneQuestion ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li style={bulletStyle}>• {oneQuestion}</li>
          </ul>
        ) : (
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>—</p>
        )}
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
                    <>
                      <div style={{ ...labelStyle, marginBottom: 2 }}>CONTEXTO CIENTÍFICO (GENERADO)</div>
                      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#a3a3a3' }}>
                        Nota: esto es una explicación general generada por IA; puede contener errores y no sustituye verificación con fuentes.
                      </p>
                      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#a3a3a3' }}>
                        {factsData!.summary}
                      </p>
                    </>
                  )}
                  {Array.isArray(factsData!.verification_points) && factsData!.verification_points.length > 0 && (
                    <div style={claimRowStyle}>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>Cómo se podría verificar</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#e4e4e7' }}>
                        {factsData!.verification_points.map((v, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>
                            {v}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
