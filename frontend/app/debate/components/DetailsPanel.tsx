'use client'

import { t } from '@/src/i18n'
import type { DebateResponse, CreatorResponse } from '../types'

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
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#a3a3a3' }}>{facts_layer.summary}</p>
          )}
          {(() => {
            const rawFacts = (facts_layer.facts ?? []).slice(0, 3)
            const slots = [...rawFacts]
            while (slots.length < 3) {
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
        </div>
      )}

      {activeTab === 'quotes' && (
        <div>
          {hasQuotes ? (
            author_layer.quotes.map((q, j) => (
              <div key={q.quote_id ?? j} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#a3a3a3', marginBottom: 4 }}>
                  {q.author}
                  {q.work ? `, ${q.work}` : ''}
                  {q.quote_id && <span style={{ marginLeft: 6, color: '#737373' }}>#{q.quote_id}</span>}
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
            <div>
              <p style={emptyStyle}>{t('detailsNoCreatorYet')}</p>
              <button
                type="button"
                onClick={onGenerateCreator}
                disabled={creatorLoading}
                style={{
                  padding: '8px 14px',
                  background: creatorLoading ? '#404040' : '#10b981',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 13,
                  cursor: creatorLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {creatorLoading ? t('detailsGenerating') : t('detailsGenerateScript')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
