'use client'

import { useState } from 'react'
import { t } from '@/src/i18n'
import type { DebateResponse, CreatorResponse } from '../types'

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
  authorStarSize: 20,
  authorStarInsetLeft: 0,
  authorStarInsetTop: 0,
  authorStarOffsetX: 0,
  authorStarOffsetY: 0,
  authorStarToTextGap: 6,
  authorStarImageSrc: '/estrella9.png',
}

/* ========= CREATOR IDEAS CONFIG ========= */
const CREATOR_IDEAS_CONFIG = {
  emptyStateText: 'Genera al pulsar el botón brillante ✨',
  emptyStateFontSize: 14,
  emptyStateColor: '#a3a3a3',
  emptyStateFontFamily: 'inherit',
  emptyStateGapBelow: 12,
  buttonImageSrc: '/BOTON2.png',
  // ✅ EDITA AQUÍ: tamaño del botón Ideas de Creator (solo afecta al botón, no al texto)
  buttonWidthPx: 280,
  buttonHeightPx: 48,
  buttonScale: 1,
  buttonMarginTopPx: 0,
  buttonMarginLeftPx: 0,
  blockMarginTop: 0,
  blockMarginBottom: 0,
  blockBorderRadius: 0,
  buttonHoverScale: 1.05,
  buttonHoverBrightness: 1.15,
  buttonShadowIntensity: 0,
  buttonTransitionDurationMs: 200,
}

const panelStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 16,
  background: '#171717',
  border: '1px solid #262626',
  borderRadius: 12,
}

const tabRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginBottom: 12,
  borderBottom: '1px solid #262626',
  paddingBottom: 8,
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 8,
  border: 'none',
  background: active ? '#262626' : 'transparent',
  color: active ? '#fafafa' : '#a3a3a3',
  fontSize: 13,
  cursor: 'pointer',
})

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#737373',
  marginBottom: 8,
}

const claimRowStyle: React.CSSProperties = {
  padding: '10px 0',
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
  padding: 12,
  borderLeft: '3px solid #3b82f6',
  background: '#262626',
  borderRadius: 8,
  marginBottom: 12,
  fontStyle: 'italic',
  color: '#e4e4e7',
  fontSize: 13,
}

const emptyStyle: React.CSSProperties = {
  color: '#737373',
  fontSize: 13,
  fontStyle: 'italic',
  padding: '12px 0',
}

type Props = {
  debateResponse: DebateResponse
  creatorResponse?: CreatorResponse | null
  activeTab: 'facts' | 'quotes' | 'creator'
  onTab: (tab: 'facts' | 'quotes' | 'creator') => void
  creatorLoading: boolean
  onGenerateCreator: () => void
}

export function DetailsPanel({
  debateResponse,
  creatorResponse,
  activeTab,
  onTab,
  creatorLoading,
  onGenerateCreator,
}: Props) {
  const [creatorButtonHover, setCreatorButtonHover] = useState(false)
  const { facts_layer, author_layer } = debateResponse
  const hasFacts = true
  const hasQuotes = author_layer.quotes?.length > 0
  const hasCreator = creatorResponse && (creatorResponse.title_options?.length > 0 || creatorResponse.outline?.length > 0)
  const factsSectionLabel = 'Hechos científicos'
  const factsEmptyText = t('detailsNoFacts')

  return (
    <div style={panelStyle}>
      <div style={tabRowStyle}>
        <button type="button" style={tabStyle(activeTab === 'facts')} onClick={() => onTab('facts')}>
          {factsSectionLabel}
        </button>
        <button type="button" style={tabStyle(activeTab === 'quotes')} onClick={() => onTab('quotes')}>
          {t('tabQuotes')}
        </button>
        <button type="button" style={tabStyle(activeTab === 'creator')} onClick={() => onTab('creator')}>
          {t('tabCreator')}
        </button>
      </div>

      {activeTab === 'facts' && (
        <div>
          {facts_layer.summary?.trim() && (
            <>
              <div style={sectionTitleStyle}>
                {SCI_FACTS_LABELS.contextTitle}
                {SCI_FACTS_LABELS.contextTitleSuffix ? ` ${SCI_FACTS_LABELS.contextTitleSuffix}` : ''}
              </div>
              {SCI_FACTS_LABELS.showNote && (
                <p style={{ margin: '0 0 4px', fontSize: 12, color: '#a3a3a3' }}>
                  {SCI_FACTS_LABELS.noteText}
                </p>
              )}
              <div style={{ marginBottom: 12 }}>
                {(() => {
                  const lines = splitContextIntoLines(facts_layer.summary)
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
          {Array.isArray(facts_layer.verification_points) && facts_layer.verification_points.length > 0 && (
            <div>
              <div style={{ ...sectionTitleStyle, marginTop: 4, marginBottom: 4 }}>{SCI_FACTS_LABELS.verifyTitle}</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#e4e4e7', fontSize: 13 }}>
                {facts_layer.verification_points.map((v, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'quotes' && (
        <div>
          {hasQuotes ? (
            author_layer.quotes.slice(0, 3).map((q, j) => (
              <div key={q.quote_id ?? j} style={{ marginBottom: 12 }}>
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
            <p style={emptyStyle}>{t('detailsNoQuotes')}</p>
          )}
        </div>
      )}

      {activeTab === 'creator' && (
        <div>
          {hasCreator ? (
            <>
              <div style={sectionTitleStyle}>{t('detailsTitleOptions')}</div>
              <ul style={{ margin: '0 0 12px', paddingLeft: 20, color: '#e4e4e7', fontSize: 13 }}>
                {creatorResponse!.title_options.map((t, j) => (
                  <li key={j} style={{ marginBottom: 4 }}>{t}</li>
                ))}
              </ul>
              <div style={sectionTitleStyle}>{t('detailsOutline')}</div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#e4e4e7', fontSize: 13 }}>
                {creatorResponse!.outline.map((item, j) => (
                  <li key={j} style={{ marginBottom: 4 }}>{item}</li>
                ))}
              </ul>
            </>
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
                onClick={onGenerateCreator}
                disabled={creatorLoading}
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
                  cursor: creatorLoading ? 'not-allowed' : 'pointer',
                  overflow: 'hidden',
                  transform:
                    creatorButtonHover && !creatorLoading
                      ? `scale(${CREATOR_IDEAS_CONFIG.buttonScale * CREATOR_IDEAS_CONFIG.buttonHoverScale})`
                      : `scale(${CREATOR_IDEAS_CONFIG.buttonScale})`,
                  filter:
                    creatorButtonHover && !creatorLoading
                      ? `brightness(${CREATOR_IDEAS_CONFIG.buttonHoverBrightness}) drop-shadow(0 0 ${CREATOR_IDEAS_CONFIG.buttonShadowIntensity}px rgba(0,0,0,0.3))`
                      : CREATOR_IDEAS_CONFIG.buttonShadowIntensity
                        ? `drop-shadow(0 0 ${CREATOR_IDEAS_CONFIG.buttonShadowIntensity}px rgba(0,0,0,0.2))`
                        : 'none',
                  transition: `transform ${CREATOR_IDEAS_CONFIG.buttonTransitionDurationMs}ms ease, filter ${CREATOR_IDEAS_CONFIG.buttonTransitionDurationMs}ms ease`,
                }}
              >
                <img
                  src={CREATOR_IDEAS_CONFIG.buttonImageSrc}
                  alt={t('detailsGenerateScript')}
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
    </div>
  )
}
