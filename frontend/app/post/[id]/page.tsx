import type { Metadata } from 'next'
import { ShareOpenInApp } from '@/components/ShareOpenInApp'
import { DEFAULT_OG_IMAGE, appPostDeepLink, publicPostUrl } from '@/lib/share/constants'
import { fetchSharePost, truncatePreview } from '@/lib/share/supabaseShareServer'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post = await fetchSharePost(id)
  const author = post?.authorUsername ? `@${post.authorUsername.replace(/^@/, '').toUpperCase()}` : 'EVO'
  const bodyPreview = post ? truncatePreview(post.body || post.title || '') : 'Publicación en EVO'
  const description = post ? `${author}: «${bodyPreview}»` : 'Abre esta publicación en la app EVO'

  return {
    title: `${author} en EVO`,
    description,
    openGraph: {
      title: `${author} en EVO`,
      description,
      url: publicPostUrl(id),
      siteName: 'EVO',
      type: 'article',
      images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512, alt: 'EVO' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${author} en EVO`,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

export default async function PostSharePage({ params }: Props) {
  const { id } = await params
  const post = await fetchSharePost(id)
  const author = post?.authorUsername ? `@${post.authorUsername.replace(/^@/, '').toUpperCase()}` : 'EVO'
  const preview = post ? truncatePreview(post.body || post.title || '', 280) : undefined

  return (
    <ShareOpenInApp
      deepLink={appPostDeepLink(id)}
      title={author}
      subtitle={post?.type === 'phrase' ? 'Frase en EVO' : 'Reflexión en EVO'}
      preview={preview ? `«${preview}»` : undefined}
    />
  )
}
