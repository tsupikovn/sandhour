import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVocabStore } from '@/stores/vocabStore';
import { useAIStore } from '@/stores/aiStore';
import { MAX_SHOWS, type PartOfSpeech, type WordForm } from '@/services/vocab';

const POS_LABEL: Record<PartOfSpeech, string> = {
  verb: 'verb',
  noun: 'noun',
  adjective: 'adjective',
  other: '',
};

const Forms: React.FC<{ forms: WordForm[] }> = ({ forms }) => {
  if (forms.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
      {forms.map((f, i) => (
        <div key={`${f.label}-${i}`} className="font-mono text-[11px] text-dune-text-secondary">
          {f.label && <span className="text-dune-text-muted">{f.label} </span>}
          {f.value}
        </div>
      ))}
    </div>
  );
};

export const WordOfDay: React.FC = () => {
  const word = useVocabStore((s) => s.word);
  const loading = useVocabStore((s) => s.loading);
  const error = useVocabStore((s) => s.error);
  const noKey = useVocabStore((s) => s.noKey);
  const language = useVocabStore((s) => s.language);
  const level = useVocabStore((s) => s.level);
  const load = useVocabStore((s) => s.load);
  const skip = useVocabStore((s) => s.skip);

  useEffect(() => {
    load().catch((err) => console.error('Word of day failed:', err));
  }, [load]);

  const openAISettings = () => {
    useAIStore.getState().open();
    useAIStore.getState().toggleSettings(true);
  };

  return (
    <div className="py-4 border-y border-dune-border-subtle">
      <div className="font-display text-[10px] tracking-widest text-dune-text-muted uppercase mb-3">
        Word of the day · {language} {level}
      </div>

      {noKey && (
        <div className="space-y-2">
          <p className="font-body text-sm text-dune-text-secondary leading-relaxed">
            To learn words, connect an AI provider in the assistant settings.
          </p>
          <button
            onClick={openAISettings}
            className="font-display text-xs tracking-widest uppercase text-dune-accent hover:text-dune-text-primary transition-colors duration-300"
          >
            AI settings →
          </button>
        </div>
      )}

      {!noKey && error && (
        <div className="space-y-2">
          <p className="font-body text-sm text-dune-danger leading-relaxed">{error}</p>
          <button
            onClick={() => load()}
            className="font-display text-xs tracking-widest uppercase text-dune-accent hover:text-dune-text-primary transition-colors duration-300"
          >
            Try again
          </button>
        </div>
      )}

      {!noKey && !error && loading && !word && (
        <div className="py-4">
          <div className="h-px bg-dune-accent animate-pulse" />
          <p className="mt-3 font-mono text-[11px] text-dune-text-muted uppercase tracking-wide">
            Picking a word…
          </p>
        </div>
      )}

      {!noKey && !error && word && (
        <AnimatePresence mode="wait">
          <motion.div
            key={word.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-body text-2xl italic text-dune-accent leading-tight">
                {word.word}
              </span>
              {POS_LABEL[word.partOfSpeech] && (
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-dune-text-muted">
                  {POS_LABEL[word.partOfSpeech]}
                </span>
              )}
            </div>

            {word.reading && (
              <p className="font-mono text-[11px] text-dune-text-muted mt-1">{word.reading}</p>
            )}

            <p className="font-body text-sm text-dune-text-secondary mt-1">{word.translation}</p>

            {word.example && (
              <p className="font-body text-sm italic text-dune-text-primary mt-3 leading-relaxed">
                «{word.example}»
              </p>
            )}
            {word.exampleTranslation && (
              <p className="font-body text-xs text-dune-text-muted mt-1 leading-relaxed">
                {word.exampleTranslation}
              </p>
            )}

            <Forms forms={word.forms} />

            <div className="flex items-center justify-between mt-4">
              <span className="font-mono text-[10px] uppercase tracking-wide text-dune-text-muted">
                Shown {word.showCount} / {MAX_SHOWS}
              </span>
              <button
                onClick={() => skip()}
                disabled={loading}
                title="Skip: I already know this word"
                className="font-mono text-[11px] uppercase tracking-wide text-dune-text-muted hover:text-dune-accent disabled:opacity-40 transition-colors duration-300"
              >
                I know it →
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};
