import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/** Night-time = 20:00–06:00 (the moon is visible then). */
function isNightNow(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}

/**
 * Ambient "moon" — a crater-pocked disc with a tiny landed flying saucer at the
 * bottom-left of the widget, shown at night (20:00–06:00). Slow, weighty motion
 * only: a gentle vertical drift, soft breathing, and a ±5° rock. Theme-adaptive.
 */
export const EveningReminder: React.FC = () => {
  const [night, setNight] = useState(isNightNow());

  useEffect(() => {
    const id = setInterval(() => setNight(isNightNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!night) return null;

  return (
    <motion.div
      aria-hidden
      title="Evening — time to wrap up the day"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none fixed bottom-3 left-6 z-0"
      style={{ width: '14vw' }}
    >
      <motion.svg
        viewBox="0 0 100 100"
        className="w-full h-auto"
        style={{ transformOrigin: '50% 50%' }}
        animate={{ y: [0, -6, 0], rotate: [-5, 5, -5], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}
      >
        {/* Moon body — pale disc that reads as a moon in dark and stays visible on light beige */}
        <circle
          cx="50"
          cy="50"
          r="46"
          className="fill-dune-text-secondary stroke-dune-text-muted"
          strokeWidth="1"
        />
        {/* Craters — kept to the edges so the lander has clear ground */}
        <circle cx="30" cy="42" r="5" className="fill-dune-bg-secondary opacity-55" />
        <circle cx="32" cy="64" r="7" className="fill-dune-bg-secondary opacity-55" />
        <circle cx="67" cy="66" r="9" className="fill-dune-bg-secondary opacity-50" />
        <circle cx="71" cy="44" r="4" className="fill-dune-bg-secondary opacity-45" />
        <circle cx="52" cy="76" r="3.5" className="fill-dune-bg-secondary opacity-45" />

        {/* Tiny flying saucer on legs, landed on the upper part of the moon — thin line art */}
        <g
          className="stroke-dune-bg-primary"
          fill="none"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* dome */}
          <path d="M43 19 Q50 11 57 19" />
          {/* saucer disc */}
          <ellipse cx="50" cy="20" rx="13" ry="3.6" />
          {/* legs */}
          <line x1="45" y1="23" x2="42" y2="29" />
          <line x1="50" y1="24" x2="50" y2="30" />
          <line x1="55" y1="23" x2="58" y2="29" />
          {/* feet */}
          <line x1="40" y1="29" x2="43.5" y2="29" />
          <line x1="48.3" y1="30" x2="51.7" y2="30" />
          <line x1="56.5" y1="29" x2="60" y2="29" />
        </g>
        {/* portholes */}
        <circle cx="46" cy="20" r="1" className="fill-dune-bg-primary" />
        <circle cx="50" cy="20" r="1" className="fill-dune-bg-primary" />
        <circle cx="54" cy="20" r="1" className="fill-dune-bg-primary" />
      </motion.svg>
    </motion.div>
  );
};
