import { redirect } from 'next/navigation'

/** Legacy route: redirect to new reflexion flow. */
export default function DebatePage() {
  redirect('/reflexion')
}
