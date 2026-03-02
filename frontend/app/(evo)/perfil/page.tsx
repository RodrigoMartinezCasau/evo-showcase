'use client'

import { useUserStats } from '@/src/context/UserContext'

const containerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 40,
}

export default function PerfilPage() {
  const stats = useUserStats()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#0f0f12' }}>
      <div style={containerStyle}>
        <h2 style={{ color: '#fafafa', marginBottom: 24 }}>Grupo filosófico</h2>
        <div style={{ background: '#1a1a1a', border: '1px solid #404040', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%' }}>
          <p style={{ color: '#a3a3a3', margin: '0 0 8px' }}>Grupo</p>
          <p style={{ color: '#fafafa', margin: 0, fontSize: 18, fontWeight: 600 }}>{stats.groupName}</p>
          <p style={{ color: '#a3a3a3', margin: '16px 0 8px' }}>Rango</p>
          <p style={{ color: '#fafafa', margin: 0, fontSize: 18 }}>{stats.rankTitle}</p>
          <p style={{ color: '#737373', marginTop: 24, fontSize: 13 }}>Próximamente: insignia, estadísticas del clan</p>
        </div>
      </div>
    </div>
  )
}
