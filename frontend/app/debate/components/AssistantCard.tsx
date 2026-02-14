'use client'

/** UI tuning (Postura/Contrapunto/Pregunta): edit UI_TUNING in ../styles/debateBlockSizes.ts */
import { useEffect, useState } from 'react'
import { t } from '@/src/i18n'
import type { AuthorLayer, FactsLayer, Message } from '../types'
import type { StructuredSection, QuestionSection } from '../types'
import { fetchMessageCreator, fetchMessageFacts, fetchMessageQuotes } from '../api'
import { SectionHeaderWithIcon } from './SectionHeaderWithIcon'
import { NumberedPoint } from './NumberedPoint'
import { UI_TUNING } from '../styles/debateBlockSizes'

const STAR_ICON_SRC = '/estrella2.png'
const POSTURA_TITLE_STAR_SRC = '/postura-star.png'
const POSTURA_SUB_STAR_SRC = '/postura-sub-star.png'
const CONTRAPOSTURA_TITLE_STAR_SRC = '/contrapostura-star.png'
const CONTRAPOSTURA_SUB_STAR_SRC = '/contrapostura-sub-star.png'
const PREGUNTA_TITLE_STAR_SRC = '/pregunta-star.png'
const PREGUNTA_SUB_STAR_SRC = '/pregunta-sub-star.png'

/**
 * Parsea texto plano (ensayo) en puntos: subtítulos (líneas que no son bullet ni "RESUMEN RÁPIDO")
 * y bullets (líneas que empiezan por •). No cambia el contenido; solo agrupa para mostrar estrella+número.
 */
function parseFlatTextToPoints(text: string): { points: { subtitle: string; bullets: string[] }[]; summary?: string } {
  const lines = text.split(/\n/).map((s) => s.trim()).filter(Boolean)
  const points: { subtitle: string; bullets: string[] }[] = []
  let currentSubtitle = ''
  let currentBullets: string[] = []
  let summary: string | undefined
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('•') || line.startsWith('• ')) {
      currentBullets.push(line.replace(/^•\s*/, '').trim())
    } else if (line.includes('RESUMEN RÁPIDO') || line.includes('RESUMEN RAPIDO')) {
      summary = lines.slice(i).join('\n')
      break
    } else {
      if (currentSubtitle !== '' || currentBullets.length > 0) {
        points.push({ subtitle: currentSubtitle, bullets: currentBullets })
      }
      currentSubtitle = line
      currentBullets = []
    }
  }
  points.push({ subtitle: currentSubtitle, bullets: currentBullets })
  return { points, summary }
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  padding: `${UI_TUNING.PAD_CONTAINER_V_PX}px ${UI_TUNING.PAD_CONTAINER_H_PX}px`,
  borderRadius: 18,
  background: '#262626',
  border: '1px solid #404040',
  color: '#e4e4e7',
  boxSizing: 'border-box',
}

const blockStyle: React.CSSProperties = {
  marginBottom: UI_TUNING.GAP_BETWEEN_SECTIONS_PX,
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
  const oneQuestion =
    message.nextQuestion ??
    dl?.socratic_questions?.[0] ??
    dr?.closing?.next_questions_for_user?.[0] ??
    ''
  const useStructured =
    dl?.stance_section && dl?.counter_section && dl?.question_section &&
    (dl.stance_section.points?.length ?? 0) >= 1 &&
    (dl.counter_section.points?.length ?? 0) >= 1

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

  const quickSummaryStyle: React.CSSProperties = {
    marginTop: UI_TUNING.GAP_BEFORE_SUMMARY_PX,
    paddingTop: UI_TUNING.DIVIDER_PADDING_TOP_PX,
    borderTop: `${UI_TUNING.DIVIDER_HEIGHT_PX}px solid #404040`,
    fontSize: UI_TUNING.FONT_SUMMARY_PX,
    lineHeight: UI_TUNING.LINE_BODY,
    color: '#a3a3a3',
  }

  function renderStructuredSection(
    section: StructuredSection,
    titleIconSrc: string = STAR_ICON_SRC,
    subtitleStarSrc: string = STAR_ICON_SRC
  ) {
    return (
      <>
        <SectionHeaderWithIcon title={section.section_title} iconSrc={titleIconSrc} />
        {section.points.map((point, i) => (
          <NumberedPoint
            key={point.index ?? i}
            index={point.index ?? i + 1}
            subtitle={point.title}
            bullets={point.bullets.map((b) => (typeof b === 'object' && b && 'text' in b ? b : { text: String(b) }))}
            starIconSrc={subtitleStarSrc}
          />
        ))}
        {section.quick_summary?.trim() && (
          <div style={quickSummaryStyle}>
            <strong style={{ color: '#737373', fontSize: UI_TUNING.FONT_SUMMARY_LABEL_PX, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              RESUMEN RÁPIDO
            </strong>
            <p style={{ margin: '4px 0 0', color: '#e4e4e7', fontSize: UI_TUNING.FONT_SUMMARY_PX, lineHeight: UI_TUNING.LINE_BODY }}>
              {section.quick_summary}
            </p>
          </div>
        )}
      </>
    )
  }

  const questionRowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: UI_TUNING.STAR_GAP_PX,
  }

  function renderQuestionSection(qSection: QuestionSection) {
    return (
      <>
        <SectionHeaderWithIcon title={qSection.section_title} iconSrc={PREGUNTA_TITLE_STAR_SRC} />
        <div style={questionRowStyle}>
          <div style={{ flexShrink: 0, width: UI_TUNING.STAR_SUB_SIZE_PX, height: UI_TUNING.STAR_SUB_SIZE_PX }} aria-hidden>
            <img
              src={PREGUNTA_SUB_STAR_SRC}
              alt=""
              width={UI_TUNING.STAR_SUB_SIZE_PX}
              height={UI_TUNING.STAR_SUB_SIZE_PX}
              style={{ display: 'block', width: UI_TUNING.STAR_SUB_SIZE_PX, height: UI_TUNING.STAR_SUB_SIZE_PX }}
            />
          </div>
          <p style={{ flex: 1, minWidth: 0, margin: 0, whiteSpace: 'pre-wrap', fontSize: UI_TUNING.FONT_BODY_PX, lineHeight: UI_TUNING.LINE_BODY }}>
            {qSection.socratic_question}
          </p>
        </div>
      </>
    )
  }

  return (
    <div style={cardStyle} className="debate-assistant-body">
      {useStructured ? (
        <>
          <div style={blockStyle}>
            {renderStructuredSection(dl!.stance_section!, POSTURA_TITLE_STAR_SRC, POSTURA_SUB_STAR_SRC)}
          </div>
          <div style={blockStyle}>
            {renderStructuredSection(dl!.counter_section!, CONTRAPOSTURA_TITLE_STAR_SRC, CONTRAPOSTURA_SUB_STAR_SRC)}
          </div>
          <div style={blockStyle}>
            {renderQuestionSection(dl!.question_section!)}
          </div>
        </>
      ) : (
        <>
          <div style={blockStyle}>
            <SectionHeaderWithIcon title={labelPostura} iconSrc={POSTURA_TITLE_STAR_SRC} />
            {(() => {
              const raw = steelman || mainContent || '—'
              const { points, summary } = parseFlatTextToPoints(raw)
              return (
                <>
                  {points.map((p, i) => (
                    <NumberedPoint
                      key={i}
                      index={i + 1}
                      subtitle={p.subtitle}
                      bullets={p.bullets.map((t) => ({ text: t }))}
                      starIconSrc={POSTURA_SUB_STAR_SRC}
                    />
                  ))}
                  {summary != null && summary.trim() && (
                    <div style={quickSummaryStyle}>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e4e4e7', fontSize: UI_TUNING.FONT_SUMMARY_PX, lineHeight: UI_TUNING.LINE_BODY }}>
                        {summary}
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
          <div style={blockStyle}>
            <SectionHeaderWithIcon title={labelContrapunto} iconSrc={CONTRAPOSTURA_TITLE_STAR_SRC} />
            {(() => {
              const raw = contrarian || '—'
              const { points, summary } = parseFlatTextToPoints(raw)
              return (
                <>
                  {points.map((p, i) => (
                    <NumberedPoint
                      key={i}
                      index={i + 1}
                      subtitle={p.subtitle}
                      bullets={p.bullets.map((t) => ({ text: t }))}
                      starIconSrc={CONTRAPOSTURA_SUB_STAR_SRC}
                    />
                  ))}
                  {summary != null && summary.trim() && (
                    <div style={quickSummaryStyle}>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e4e4e7', fontSize: UI_TUNING.FONT_SUMMARY_PX, lineHeight: UI_TUNING.LINE_BODY }}>
                        {summary}
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
          <div style={blockStyle}>
            <SectionHeaderWithIcon title={labelPregunta} iconSrc={PREGUNTA_TITLE_STAR_SRC} />
            <div style={questionRowStyle}>
              <div style={{ flexShrink: 0, width: UI_TUNING.STAR_SUB_SIZE_PX, height: UI_TUNING.STAR_SUB_SIZE_PX }} aria-hidden>
                <img
                  src={PREGUNTA_SUB_STAR_SRC}
                  alt=""
                  width={UI_TUNING.STAR_SUB_SIZE_PX}
                  height={UI_TUNING.STAR_SUB_SIZE_PX}
                  style={{ display: 'block', width: UI_TUNING.STAR_SUB_SIZE_PX, height: UI_TUNING.STAR_SUB_SIZE_PX }}
                />
              </div>
              <p style={{ flex: 1, minWidth: 0, margin: 0, whiteSpace: 'pre-wrap', fontSize: UI_TUNING.FONT_BODY_PX, lineHeight: UI_TUNING.LINE_BODY }}>
                {oneQuestion || '—'}
              </p>
            </div>
          </div>
        </>
      )}

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
