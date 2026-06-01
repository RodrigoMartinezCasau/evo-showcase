import type { Metadata } from 'next';
import { headers } from 'next/headers';
import EvoTutoriales from './EvoTutoriales';
import { getTutDict } from './i18n';
import type { Lang } from '../lib/clans';

function pickLangFromHeader(accept: string | null): Lang {
  if (!accept) return 'es';
  const first = accept.split(',')[0]?.trim().toLowerCase() ?? '';
  if (first.startsWith('es')) return 'es';
  if (first.startsWith('en')) return 'en';
  const lower = accept.toLowerCase();
  if (lower.includes('es')) return 'es';
  if (lower.includes('en')) return 'en';
  return 'es';
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = pickLangFromHeader(headers().get('accept-language'));
  const dict = getTutDict(lang);
  return { title: dict.metaTitle, description: dict.metaDesc };
}

export default function TutorialesPage() {
  const lang = pickLangFromHeader(headers().get('accept-language'));
  return <EvoTutoriales initialLang={lang} />;
}
