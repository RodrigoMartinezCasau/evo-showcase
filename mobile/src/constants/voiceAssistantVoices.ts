/**
 * Voces OpenAI TTS (tts-1). En la UI cada voz lleva el nombre de un autor o filósofo
 * cuyo carácter encaja con el timbre; el id sigue siendo el de OpenAI.
 */
export type VoiceAssistantVoiceId = 'nova' | 'onyx';

export type VoiceAssistantVoiceOption = {
  id: VoiceAssistantVoiceId;
  /** Autor o filósofo (persona de la voz en la UI). */
  label: string;
  description: string;
  tone: string;
  /** Muestra en primera persona para el preview en Ajustes. */
  previewLine: string;
};

export const VOICE_ASSISTANT_VOICES: VoiceAssistantVoiceOption[] = [
  {
    id: 'nova',
    label: 'Jane',
    description: 'Femenina, cálida y refinada',
    tone: 'Cálida',
    previewLine: 'Hola, soy Jane. Así te hablaré cuando me elijas en Evo.',
  },
  {
    id: 'onyx',
    label: 'Fyodor',
    description: 'Masculina, grave y profunda',
    tone: 'Grave',
    previewLine: 'Hola, soy Fyodor. Así oirás mi voz en Evo.',
  },
];

export const VOICE_ASSISTANT_DEFAULT_VOICE: VoiceAssistantVoiceId = 'nova';

const VALID_IDS = new Set<VoiceAssistantVoiceId>(VOICE_ASSISTANT_VOICES.map((v) => v.id));

export function normalizeVoiceAssistantVoiceId(
  raw: string | null | undefined,
): VoiceAssistantVoiceId {
  const id = (raw ?? '').trim().toLowerCase();
  return VALID_IDS.has(id as VoiceAssistantVoiceId)
    ? (id as VoiceAssistantVoiceId)
    : VOICE_ASSISTANT_DEFAULT_VOICE;
}

export function getVoiceAssistantVoiceOption(
  id: string | null | undefined,
): VoiceAssistantVoiceOption {
  const norm = normalizeVoiceAssistantVoiceId(id);
  return VOICE_ASSISTANT_VOICES.find((v) => v.id === norm) ?? VOICE_ASSISTANT_VOICES[0]!;
}
