import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
import { useRitualStore } from '@/stores/ritualStore';
import { useTasksStore } from '@/stores/tasksStore';
import { useAtticStore } from '@/stores/atticStore';
import { todayISO } from '@/utils/date';
import type { Task } from '@/types/task';

const STEP_COUNT = 2;
const duneTransition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const };

/** Random sample of up to `n` items. */
function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export const MorningRitual: React.FC = () => {
  const visible = useRitualStore((s) => s.visible);
  const complete = useRitualStore((s) => s.complete);
  const skip = useRitualStore((s) => s.skip);

  const [step, setStep] = useState(0);
  const [options, setOptions] = useState<{ id: string; text: string }[]>([]);
  const [selectedTop3, setSelectedTop3] = useState<Set<string>>(new Set());
  const [newText, setNewText] = useState('');
  const [atticSample, setAtticSample] = useState<Task[]>([]);
  const [selectedAttic, setSelectedAttic] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    setSelectedTop3(new Set());
    setNewText('');
    setSelectedAttic(new Set());

    (async () => {
      await useTasksStore.getState().loadForDate(todayISO());
      const todayTasks = useTasksStore
        .getState()
        .items.filter((t) => !t.completed)
        .map((t) => ({ id: t.id, text: t.text }));
      setOptions(todayTasks);

      await useAtticStore.getState().load();
      setAtticSample(sample(useAtticStore.getState().items, 5));
    })().catch((err) => console.error('Ritual init failed:', err));
  }, [visible]);

  if (!visible) return null;

  const toggleTop3 = (id: string) => {
    setSelectedTop3((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const addNewTask = async () => {
    const text = newText.trim();
    if (!text) return;
    const id = await useTasksStore.getState().addTask({ text, targetDate: todayISO() });
    setOptions((prev) => [...prev, { id, text }]);
    setSelectedTop3((prev) => (prev.size < 3 ? new Set(prev).add(id) : prev));
    setNewText('');
  };

  const toggleAttic = (id: string) => {
    setSelectedAttic((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const tasks = useTasksStore.getState();
      for (const id of selectedTop3) await tasks.setPriority(id, 1);

      const attic = useAtticStore.getState();
      for (const id of selectedAttic) await attic.returnToToday(id);

      await complete({ top3: [...selectedTop3] });

      await tasks.loadForDate(todayISO());
    } catch (err) {
      console.error('Ritual finish failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const next = () => (step < STEP_COUNT - 1 ? setStep((s) => s + 1) : finish());
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-dune-bg-primary">
      {/* Skip */}
      <div className="flex justify-end p-5">
        <button
          onClick={() => skip()}
          className="font-display text-xs tracking-widest uppercase text-dune-text-muted hover:text-dune-text-secondary transition-colors duration-300"
        >
          Not now
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8">
        <div className="max-w-md mx-auto py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={duneTransition}
            >
              {step === 0 && (
                <div className="space-y-6">
                  <h2 className="font-display text-xl tracking-widest uppercase text-dune-text-primary leading-tight">
                    What are your 3 main tasks today?
                  </h2>
                  <div className="space-y-1">
                    {options.map((o) => {
                      const on = selectedTop3.has(o.id);
                      return (
                        <button
                          key={o.id}
                          onClick={() => toggleTop3(o.id)}
                          className="flex items-center gap-3 w-full py-3 text-left border-b border-dune-border-subtle/60"
                        >
                          <span
                            className={`shrink-0 w-4 h-4 border flex items-center justify-center transition-colors duration-300 ${
                              on
                                ? 'border-dune-accent bg-dune-accent/10'
                                : 'border-dune-border-primary'
                            }`}
                          >
                            {on && <Check size={11} strokeWidth={2} className="text-dune-accent" />}
                          </span>
                          <span
                            className={`font-body text-sm ${
                              on ? 'text-dune-text-primary' : 'text-dune-text-secondary'
                            }`}
                          >
                            {o.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <Plus size={16} strokeWidth={1.5} className="shrink-0 text-dune-text-muted" />
                    <input
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addNewTask();
                      }}
                      placeholder="Add a new one…"
                      className="flex-1 bg-transparent outline-none font-body text-sm text-dune-text-primary placeholder:text-dune-text-muted"
                    />
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-dune-text-muted">
                    Selected: {selectedTop3.size} / 3
                  </p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="font-display text-xl tracking-widest uppercase text-dune-text-primary leading-tight">
                    Bring anything back from the attic?
                  </h2>
                  {atticSample.length === 0 ? (
                    <p className="font-body text-sm text-dune-text-muted py-4">
                      The attic is empty — nothing to bring back.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {atticSample.map((t) => {
                        const on = selectedAttic.has(t.id);
                        return (
                          <button
                            key={t.id}
                            onClick={() => toggleAttic(t.id)}
                            className="flex items-center gap-3 w-full py-3 text-left border-b border-dune-border-subtle/60"
                          >
                            <span
                              className={`shrink-0 w-4 h-4 border flex items-center justify-center transition-colors duration-300 ${
                                on
                                  ? 'border-dune-accent bg-dune-accent/10'
                                  : 'border-dune-border-primary'
                              }`}
                            >
                              {on && <Check size={11} strokeWidth={2} className="text-dune-accent" />}
                            </span>
                            <span
                              className={`font-body text-sm ${
                                on ? 'text-dune-text-primary' : 'text-dune-text-secondary'
                              }`}
                            >
                              {t.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer: nav + progress */}
      <div className="px-8 pb-6 pt-2">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className={`font-display text-xs tracking-widest uppercase transition-colors duration-300 ${
              step === 0
                ? 'text-transparent pointer-events-none'
                : 'text-dune-text-muted hover:text-dune-text-secondary'
            }`}
          >
            Back
          </button>
          <button
            onClick={next}
            disabled={saving}
            className="font-display text-sm tracking-widest uppercase text-dune-accent hover:text-dune-text-primary transition-colors duration-300 disabled:opacity-50"
          >
            {step === STEP_COUNT - 1 ? 'Done' : 'Next'}
          </button>
        </div>
      </div>

      {/* Progress line */}
      <div className="h-px bg-dune-border-subtle">
        <motion.div
          className="h-px bg-dune-accent"
          initial={false}
          animate={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
          transition={duneTransition}
        />
      </div>
    </div>
  );
};
