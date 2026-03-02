'use client'

const containerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 40,
}

export default function AjustesPage() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#0f0f12' }}>
      <div style={containerStyle}>
        <h2 style={{ color: '#fafafa', marginBottom: 24 }}>Ajustes</h2>
        <div style={{ background: '#1a1a1a', border: '1px solid #404040', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%' }}>
          <p style={{ color: '#737373', margin: 0, fontSize: 14 }}>Próximamente: preferencias, notificaciones, cuenta</p>
        </div>
      </div>
    </div>
  )
}
