import './landing.css';

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import EvoLanding from './components/landing/EvoLanding';
import type { Lang } from './lib/clans';
import { PAGE_METADATA } from './lib/landing-i18n';

function pickLangFromHeader(accept: string | null): Lang {
  if (!accept) return 'es';
  // Format: "es-ES,es;q=0.9,en;q=0.8"
  const first = accept.split(',')[0]?.trim().toLowerCase() ?? '';
  if (first.startsWith('es')) return 'es';
  if (first.startsWith('en')) return 'en';
  // fall back to scanning the rest
  const lower = accept.toLowerCase();
  if (lower.includes('es')) return 'es';
  if (lower.includes('en')) return 'en';
  return 'es';
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = pickLangFromHeader(headers().get('accept-language'));
  const meta = PAGE_METADATA[lang];
  return {
    title: meta.title,
    description: meta.description,
  };
}

export default function HomePage() {
  const lang = pickLangFromHeader(headers().get('accept-language'));
  return <EvoLanding initialLang={lang} />;
}
