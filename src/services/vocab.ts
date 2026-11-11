import { and, eq, ne, lte, asc, isNotNull } from 'drizzle-orm';
import { getDb } from '@/services/database/client';
import { vocabWords } from '@/services/database/schema';
import { completeJson } from '@/services/ai';
import { todayISO, nowISO, addDaysISO } from '@/utils/date';
import type { AISettings } from '@/types/ai';

export type PartOfSpeech = 'verb' | 'noun' | 'adjective' | 'other';

/** One inflected form with a short caption, e.g. `{ label: 'plural', value: 'kitaplar' }`. */
export interface WordForm {
  label: string;
  value: string;
}

export interface VocabWord {
  id: string;
  word: string;
  /** Romanised reading for non-Latin scripts (pinyin, romaji…), if any. */
  reading?: string;
  partOfSpeech: PartOfSpeech;
  translation: string;
  example?: string;
  exampleTranslation?: string;
  forms: WordForm[];
  language: string;
  showCount: number;
  status: string;
}

/** What to learn and which model to ask. */
export interface VocabRequest {
  settings: AISettings;
  language: string;
  level: string;
}

/** A word comes back this many days after each showing… */
const REPEAT_DAYS = 14;
/** …until it has been shown this many times, then it is retired. */
export const MAX_SHOWS = 4;
const MAX_FORMS = 8;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

function toPartOfSpeech(v: unknown): PartOfSpeech {
  return v === 'verb' || v === 'noun' || v === 'adjective' ? v : 'other';
}

function cleanForms(raw: unknown): WordForm[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => ({ label: str((f as WordForm)?.label), value: str((f as WordForm)?.value) }))
    .filter((f) => f.value)
    .slice(0, MAX_FORMS);
}

function mapWord(row: typeof vocabWords.$inferSelect): VocabWord {
  let forms: WordForm[] = [];
  let reading: string | undefined;

  if (row.forms) {
    try {
      const parsed = JSON.parse(row.forms) as Record<string, unknown>;
      forms = cleanForms(parsed?.items);
      reading = str(parsed?.reading) || undefined;
    } catch {
      forms = [];
    }
  }

  return {
    id: row.id,
    word: row.word,
    reading,
    partOfSpeech: toPartOfSpeech(row.partOfSpeech),
    translation: row.translation,
    example: row.example ?? undefined,
    exampleTranslation: row.exampleTranslation ?? undefined,
    forms,
    language: row.language,
    showCount: row.showCount ?? 0,
    status: row.status ?? 'active',
  };
}

interface GeneratedWord {
  word: string;
  reading?: string;
  partOfSpeech: PartOfSpeech;
  translation: string;
  example?: string;
  exampleTranslation?: string;
  forms: WordForm[];
}

/** Ask the configured model for a fresh word, excluding ones already seen. */
async function generateVocabWord(exclude: string[], req: VocabRequest): Promise<GeneratedWord> {
  const excludeList = exclude.slice(-200).join(', ') || '(none yet)';
  const prompt = `You are a foreign-language teacher. The language being learned is ${req.language}. Pick ONE new ${req.language} word at level ${req.level} (CEFR, or its closest equivalent for this language) for a learner who reads English. The word should be useful and not too rare. Do NOT use any word from this list (they were already shown): ${excludeList}.

Return STRICTLY valid JSON, with no explanation and no markdown:
{
  "word": "the word in its dictionary form, in the language's own script",
  "reading": "a Latin-script reading (pinyin, romaji, transliteration) — ONLY if the language is not written in the Latin alphabet; otherwise an empty string",
  "partOfSpeech": "verb" | "noun" | "adjective" | "other",
  "translation": "English translation (1-3 meanings, comma-separated)",
  "example": "a natural sentence in ${req.language} using the word",
  "exampleTranslation": "English translation of the example",
  "forms": [ { "label": "short English caption", "value": "the word form" } ]
}

Rules for "forms": 0 to ${MAX_FORMS} of the most useful forms for THIS language and THIS part of speech — for example present-tense conjugation, past tense, a participle, article and plural, gender, cases, comparative. Keep captions short ("I", "plural", "past"). If the word does not inflect in this language, return an empty array.`;

  const raw = await completeJson<Record<string, unknown>>(req.settings, prompt);
  const word = str(raw?.word);
  const translation = str(raw?.translation);
  if (!word || !translation) {
    throw new Error('The model returned an incomplete word.');
  }
  return {
    word,
    reading: str(raw.reading) || undefined,
    partOfSpeech: toPartOfSpeech(raw.partOfSpeech),
    translation,
    example: str(raw.example) || undefined,
    exampleTranslation: str(raw.exampleTranslation) || undefined,
    forms: cleanForms(raw.forms),
  };
}

async function advanceAndReturn(
  row: typeof vocabWords.$inferSelect,
  today: string
): Promise<VocabWord> {
  const showCount = (row.showCount ?? 0) + 1;
  const retired = showCount >= MAX_SHOWS;
  const nextShowDate = retired ? null : addDaysISO(today, REPEAT_DAYS);
  const status = retired ? 'retired' : 'active';

  await getDb()
    .update(vocabWords)
    .set({ showCount, lastShownDate: today, nextShowDate, status })
    .where(eq(vocabWords.id, row.id));

  return mapWord({ ...row, showCount, lastShownDate: today, nextShowDate, status });
}

async function generateAndStore(req: VocabRequest, today: string): Promise<VocabWord> {
  const db = getDb();
  const existing = await db
    .select({ word: vocabWords.word })
    .from(vocabWords)
    .where(eq(vocabWords.language, req.language));
  const gen = await generateVocabWord(existing.map((w) => w.word), req);

  const row = {
    id: crypto.randomUUID(),
    word: gen.word,
    partOfSpeech: gen.partOfSpeech,
    translation: gen.translation,
    example: gen.example ?? null,
    exampleTranslation: gen.exampleTranslation ?? null,
    forms: JSON.stringify({ items: gen.forms, reading: gen.reading ?? '' }),
    showCount: 1,
    nextShowDate: addDaysISO(today, REPEAT_DAYS),
    lastShownDate: today,
    status: 'active',
    createdAt: nowISO(),
    language: req.language,
  };
  await db.insert(vocabWords).values(row);
  return mapWord(row as typeof vocabWords.$inferSelect);
}

/**
 * The word for today in the requested language, stable through the day: reuse
 * the one already shown today, else surface a repeat that's due (oldest first),
 * else generate a new word. Each language keeps its own independent history.
 */
export async function getWordOfDay(req: VocabRequest): Promise<VocabWord> {
  const db = getDb();
  const today = todayISO();
  const inLanguage = eq(vocabWords.language, req.language);

  const shownToday = await db
    .select()
    .from(vocabWords)
    .where(and(inLanguage, eq(vocabWords.lastShownDate, today), ne(vocabWords.status, 'known')))
    .limit(1);
  if (shownToday[0]) return mapWord(shownToday[0]);

  const due = await db
    .select()
    .from(vocabWords)
    .where(
      and(
        inLanguage,
        eq(vocabWords.status, 'active'),
        isNotNull(vocabWords.nextShowDate),
        lte(vocabWords.nextShowDate, today)
      )
    )
    .orderBy(asc(vocabWords.nextShowDate))
    .limit(1);
  if (due[0]) return advanceAndReturn(due[0], today);

  return generateAndStore(req, today);
}

/** Mark the current word as known (never show again) and surface a fresh one. */
export async function skipWord(currentId: string, req: VocabRequest): Promise<VocabWord> {
  await getDb().update(vocabWords).set({ status: 'known' }).where(eq(vocabWords.id, currentId));
  return getWordOfDay(req);
}
