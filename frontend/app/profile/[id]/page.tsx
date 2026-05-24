import type { Metadata } from 'next'
import { ShareOpenInApp } from '@/components/ShareOpenInApp'
import { DEFAULT_OG_IMAGE, publicProfileUrl } from '@/lib/share/constants'
import { fetchShareProfile } from '@/lib/share/supabaseShareServer'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const profile = await fetchShareProfile(id)
  const displayName = profile?.username ? `@${profile.username.toUpperCase()}` : 'Perfil en EVO'
  const description =
    profile?.insigniaPhrase?.trim() ||
    (profile
      ? `${profile.totalReflections} reflexiones · ${profile.totalQuotes} frases en EVO`
      : 'Abre este perfil en la app EVO')

  return {
    title: `${displayName} · EVO`,
    description,
    openGraph: {
      title: displayName,
      description,
      url: publicProfileUrl(id),
      siteName: 'EVO',
      type: 'profile',
      images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512, alt: 'EVO' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: displayName,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

export default async function ProfileSharePage({ params }: Props) {
  const { id } = await params
  const profile = await fetchShareProfile(id)
  const displayName = profile?.username ? `@${profile.username.toUpperCase()}` : 'Perfil en EVO'
  const subtitle = profile
    ? `${profile.totalReflections} reflexiones · ${profile.totalQuotes} frases`
    : 'Descarga EVO para ver este perfil'
  const preview = profile?.insigniaPhrase?.trim() || undefined

  return (
    <ShareOpenInApp
      appPath={`profile/${id}`}
      title={displayName}
      subtitle={subtitle}
      preview={preview}
    />
  )
}
