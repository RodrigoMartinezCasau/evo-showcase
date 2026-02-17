'use client'

/** Estilos Postura/Contrapunto/Pregunta: edit STYLE_CONTROLS in ../styles/debateBlockSizes.ts */
import { useEffect, useState } from 'react'
import { t } from '@/src/i18n'
import type { AuthorLayer, FactsLayer, Message } from '../types'
import type { StructuredSection, QuestionSection } from '../types'
import { fetchMessageCreator, fetchMessageFacts, fetchMessageQuotes } from '../api'
import { SectionHeaderWithIcon } from './SectionHeaderWithIcon'
import { NumberedPoint } from './NumberedPoint'
import { STYLE_CONTROLS } from '../styles/debateBlockSizes'

const SC = STYLE_CONTROLS

/** Labels editables del bloque "Hechos científicos" (solo display, sin tocar datos). */
const SCI_FACTS_LABELS = {
  contextTitle: 'CONTEXTO CIENTÍFICO',
  contextTitleSuffix: '', // ej. "(GENERADO)" o "" para quitarlo
  showNote: false,
  noteText: 'Nota: esto es una explicación general generada por IA; puede contener errores y no sustituye verificación con fuentes.',
  verifyTitle: 'CÓMO SE PODRÍA VERIFICAR',
}

/** Estilo del bloque de contexto (líneas): editable aquí. */
const SCI_FACTS_CONTEXT_STYLE = {
  fontSize: 13,
  lineHeight: 1.5,
  lineSpacingBottom: 6,
  color: '#a3a3a3',
}

/**
 * Divide el texto del contexto en líneas: respeta \n; si no hay, divide por . ; :
 * Conserva el contenido; limpia espacios y elimina líneas vacías.
 */
function splitContextIntoLines(contextText: string): string[] {
  const trimmed = contextText.trim()
  if (!trimmed) return []
  const raw = trimmed.includes('\n')
    ? trimmed.split(/\n/)
    : trimmed.split(/(?<=[.;:])\s+/)
  return raw.map((s) => s.trim().replace(/\s{2,}/g, ' ')).filter((s) => s.length > 0)
}

/** Config único para la UI de "Citas textuales" (texto autor/obra). */
const QUOTES_UI_CONFIG = {
  authorWorkFontSize: 15,
  authorWorkColor: '#737373',
  authorWorkFontWeight: '600' as React.CSSProperties['fontWeight'],
  authorWorkLineHeight: 1.35,
  authorWorkSpacingBottom: 6,
}

/** Estrella del autor en Citas textuales: tamaño y posición independientes del texto. Todo editable aquí. */
const CITAS_AUTHOR_STAR_CONFIG = {
  authorStarSize: 30,
  authorStarInsetLeft: -10,
  authorStarInsetTop: -5,
  authorStarOffsetX: 10,
  authorStarOffsetY: 0,
  authorStarToTextGap: 0,
  authorStarImageSrc: '/estrella9.png',
}

/* ========= CREATOR IDEAS CONFIG ========= */
const CREATOR_IDEAS_CONFIG = {
  emptyStateText: 'Genera al pulsar el botón brillante',
  emptyStateFontSize: 14,
  emptyStateColor: '#a3a3a3',
  emptyStateFontFamily: 'inherit',
  emptyStateGapBelow: 12,
  buttonImageSrc: '/BOTON2.png',
  // ✅ EDITA AQUÍ: tamaño del botón Ideas de Creator (solo afecta al botón, no al texto)
  buttonWidthPx: 200,
  buttonHeightPx: 50,
  buttonScale: 4,
  buttonMarginTopPx: -10,
  buttonMarginLeftPx: 0,
  blockMarginTop: 0,
  blockMarginBottom: 0,
  blockBorderRadius: 0,
  buttonHoverScale: 1.05,
  buttonHoverBrightness: 1.15,
  buttonShadowIntensity: 0,
  buttonTransitionDurationMs: 200,
}

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
  padding: `${SC.PAD_CONTAINER_V}px ${SC.PAD_CONTAINER_H}px`,
  borderRadius: 18,
  background: '#262626',
  border: '1px solid #404040',
  color: '#e4e4e7',
  boxSizing: 'border-box',
}

const blockStyle: React.CSSProperties = {
  marginBottom: SC.SPACING_BETWEEN_SECTIONS,
}

const blockStylePregunta: React.CSSProperties = {
  marginBottom: SC.GAP_AFTER_PREGUNTA,
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
  const [creatorButtonHover, setCreatorButtonHover] = useState(false)

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
    marginTop: SC.GAP_BEFORE_SUMMARY,
    paddingTop: SC.DIVIDER_PADDING_TOP,
    borderTop: `${SC.DIVIDER_HEIGHT}px solid #404040`,
    fontSize: SC.TEXT_SUMMARY_SIZE,
    lineHeight: SC.LINE_HEIGHT_BODY,
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
            <strong style={{ color: '#737373', fontSize: SC.TEXT_SUMMARY_LABEL_SIZE, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              RESUMEN RÁPIDO
            </strong>
            <p style={{ margin: '4px 0 0', color: '#e4e4e7', fontSize: SC.TEXT_SUMMARY_SIZE, lineHeight: SC.LINE_HEIGHT_BODY }}>
              {section.quick_summary}
            </p>
          </div>
        )}
      </>
    )
  }

  function renderQuestionSection(qSection: QuestionSection) {
    return (
      <>
        <SectionHeaderWithIcon title={qSection.section_title} iconSrc={PREGUNTA_TITLE_STAR_SRC} />
        {/* Pregunta: estrella en gutter (absoluta), texto con TEXT_LEFT_PADDING */}
        <div
          style={{
            position: 'relative',
            paddingLeft: SC.TEXT_LEFT_PADDING,
            minHeight: SC.STAR_SUBTITLE_SIZE,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: SC.STAR_SUBTITLE_LEFT_OFFSET,
              top: SC.STAR_SUBTITLE_TOP_OFFSET,
              width: SC.STAR_SUBTITLE_SIZE,
              height: SC.STAR_SUBTITLE_SIZE,
            }}
            aria-hidden
          >
            <img
              src={PREGUNTA_SUB_STAR_SRC}
              alt=""
              width={SC.STAR_SUBTITLE_SIZE}
              height={SC.STAR_SUBTITLE_SIZE}
              style={{ display: 'block', width: SC.STAR_SUBTITLE_SIZE, height: SC.STAR_SUBTITLE_SIZE }}
            />
          </div>
          <p style={{ margin: 0, minWidth: 0, whiteSpace: 'pre-wrap', fontSize: SC.TEXT_QUESTION_SIZE, lineHeight: SC.LINE_HEIGHT_BODY }}>
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
          <div style={blockStylePregunta}>
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
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e4e4e7', fontSize: SC.TEXT_SUMMARY_SIZE, lineHeight: SC.LINE_HEIGHT_BODY }}>
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
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e4e4e7', fontSize: SC.TEXT_SUMMARY_SIZE, lineHeight: SC.LINE_HEIGHT_BODY }}>
                        {summary}
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
          <div style={blockStylePregunta}>
            <SectionHeaderWithIcon title={labelPregunta} iconSrc={PREGUNTA_TITLE_STAR_SRC} />
            <div
              style={{
                position: 'relative',
                paddingLeft: SC.TEXT_LEFT_PADDING,
                minHeight: SC.STAR_SUBTITLE_SIZE,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: SC.STAR_SUBTITLE_LEFT_OFFSET,
                  top: SC.STAR_SUBTITLE_TOP_OFFSET,
                  width: SC.STAR_SUBTITLE_SIZE,
                  height: SC.STAR_SUBTITLE_SIZE,
                }}
                aria-hidden
              >
                <img
                  src={PREGUNTA_SUB_STAR_SRC}
                  alt=""
                  width={SC.STAR_SUBTITLE_SIZE}
                  height={SC.STAR_SUBTITLE_SIZE}
                  style={{ display: 'block', width: SC.STAR_SUBTITLE_SIZE, height: SC.STAR_SUBTITLE_SIZE }}
                />
              </div>
              <p style={{ margin: 0, minWidth: 0, whiteSpace: 'pre-wrap', fontSize: SC.TEXT_QUESTION_SIZE, lineHeight: SC.LINE_HEIGHT_BODY }}>
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
                      <div style={{ ...labelStyle, marginBottom: 2 }}>
                        {SCI_FACTS_LABELS.contextTitle}
                        {SCI_FACTS_LABELS.contextTitleSuffix ? ` ${SCI_FACTS_LABELS.contextTitleSuffix}` : ''}
                      </div>
                      {SCI_FACTS_LABELS.showNote && (
                        <p style={{ margin: '0 0 4px', fontSize: 12, color: '#a3a3a3' }}>
                          {SCI_FACTS_LABELS.noteText}
                        </p>
                      )}
                      <div style={{ marginBottom: 8 }}>
                        {(() => {
                          const lines = splitContextIntoLines(factsData!.summary)
                          return lines.map((line, i) => (
                            <div
                              key={i}
                              style={{
                                fontSize: SCI_FACTS_CONTEXT_STYLE.fontSize,
                                lineHeight: SCI_FACTS_CONTEXT_STYLE.lineHeight,
                                color: SCI_FACTS_CONTEXT_STYLE.color,
                                marginBottom: i < lines.length - 1 ? SCI_FACTS_CONTEXT_STYLE.lineSpacingBottom : 0,
                              }}
                            >
                              {line}
                            </div>
                          ))
                        })()}
                      </div>
                    </>
                  )}
                  {Array.isArray(factsData!.verification_points) && factsData!.verification_points.length > 0 && (
                    <div style={claimRowStyle}>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>{SCI_FACTS_LABELS.verifyTitle}</div>
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
                quotesData!.quotes.slice(0, 3).map((q, j) => (
                  <div key={q.quote_id ?? j} style={{ marginBottom: 10 }}>
                    <div style={{ position: 'relative', marginBottom: QUOTES_UI_CONFIG.authorWorkSpacingBottom }}>
                      <img
                        src={CITAS_AUTHOR_STAR_CONFIG.authorStarImageSrc}
                        alt=""
                        role="presentation"
                        style={{
                          position: 'absolute',
                          left: CITAS_AUTHOR_STAR_CONFIG.authorStarInsetLeft + CITAS_AUTHOR_STAR_CONFIG.authorStarOffsetX,
                          top: CITAS_AUTHOR_STAR_CONFIG.authorStarInsetTop + CITAS_AUTHOR_STAR_CONFIG.authorStarOffsetY,
                          width: CITAS_AUTHOR_STAR_CONFIG.authorStarSize,
                          height: CITAS_AUTHOR_STAR_CONFIG.authorStarSize,
                          margin: 0,
                          display: 'block',
                        }}
                      />
                      <div
                        style={{
                          marginLeft:
                            CITAS_AUTHOR_STAR_CONFIG.authorStarInsetLeft +
                            CITAS_AUTHOR_STAR_CONFIG.authorStarOffsetX +
                            CITAS_AUTHOR_STAR_CONFIG.authorStarSize +
                            CITAS_AUTHOR_STAR_CONFIG.authorStarToTextGap,
                          fontSize: QUOTES_UI_CONFIG.authorWorkFontSize,
                          color: QUOTES_UI_CONFIG.authorWorkColor,
                          fontWeight: QUOTES_UI_CONFIG.authorWorkFontWeight,
                          lineHeight: QUOTES_UI_CONFIG.authorWorkLineHeight,
                        }}
                      >
                        {q.author}
                        {q.work ? `, ${q.work}` : ''}
                      </div>
                    </div>
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
                <div
                  style={{
                    marginTop: CREATOR_IDEAS_CONFIG.blockMarginTop,
                    marginBottom: CREATOR_IDEAS_CONFIG.blockMarginBottom,
                    borderRadius: CREATOR_IDEAS_CONFIG.blockBorderRadius,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      marginBottom: CREATOR_IDEAS_CONFIG.emptyStateGapBelow,
                      fontSize: CREATOR_IDEAS_CONFIG.emptyStateFontSize,
                      color: CREATOR_IDEAS_CONFIG.emptyStateColor,
                      fontFamily: CREATOR_IDEAS_CONFIG.emptyStateFontFamily,
                    }}
                  >
                    {CREATOR_IDEAS_CONFIG.emptyStateText}
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateCreator}
                    disabled={creatorLoading || creatorLoadingLocal}
                    onMouseEnter={() => setCreatorButtonHover(true)}
                    onMouseLeave={() => setCreatorButtonHover(false)}
                    style={{
                      display: 'block',
                      marginTop: CREATOR_IDEAS_CONFIG.buttonMarginTopPx,
                      marginLeft: CREATOR_IDEAS_CONFIG.buttonMarginLeftPx,
                      padding: 0,
                      width: CREATOR_IDEAS_CONFIG.buttonWidthPx,
                      height: CREATOR_IDEAS_CONFIG.buttonHeightPx,
                      border: 'none',
                      borderRadius: CREATOR_IDEAS_CONFIG.blockBorderRadius || 8,
                      background: 'transparent',
                      cursor: creatorLoading || creatorLoadingLocal ? 'not-allowed' : 'pointer',
                      overflow: 'hidden',
                      transform:
                        creatorButtonHover && !creatorLoading && !creatorLoadingLocal
                          ? `scale(${CREATOR_IDEAS_CONFIG.buttonScale * CREATOR_IDEAS_CONFIG.buttonHoverScale})`
                          : `scale(${CREATOR_IDEAS_CONFIG.buttonScale})`,
                      filter:
                        creatorButtonHover && !creatorLoading && !creatorLoadingLocal
                          ? `brightness(${CREATOR_IDEAS_CONFIG.buttonHoverBrightness}) drop-shadow(0 0 ${CREATOR_IDEAS_CONFIG.buttonShadowIntensity}px rgba(0,0,0,0.3))`
                          : CREATOR_IDEAS_CONFIG.buttonShadowIntensity
                            ? `drop-shadow(0 0 ${CREATOR_IDEAS_CONFIG.buttonShadowIntensity}px rgba(0,0,0,0.2))`
                            : 'none',
                      transition: `transform ${CREATOR_IDEAS_CONFIG.buttonTransitionDurationMs}ms ease, filter ${CREATOR_IDEAS_CONFIG.buttonTransitionDurationMs}ms ease`,
                    }}
                  >
                    <img
                      src={CREATOR_IDEAS_CONFIG.buttonImageSrc}
                      alt={t('assistantGenerateScript')}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                        pointerEvents: 'none',
                      }}
                    />
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
