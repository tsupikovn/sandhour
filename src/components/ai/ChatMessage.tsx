import type { ChatMessage as Msg } from '@/types/ai';

/** Minimal message: no avatars or bubbles — just a thin left border and text. */
export const ChatMessage: React.FC<{ message: Msg }> = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`pl-4 border-l-2 py-1 ${isUser ? 'border-dune-border-primary' : 'border-dune-accent'}`}>
      <div
        className={`font-display text-[10px] tracking-widest uppercase mb-1 ${
          isUser ? 'text-dune-text-muted' : 'text-dune-accent'
        }`}
      >
        {isUser ? 'You' : 'Assistant'}
      </div>
      <div
        className={`text-sm leading-relaxed whitespace-pre-wrap ${
          message.error
            ? 'font-body text-dune-danger'
            : isUser
              ? 'font-mono text-dune-text-secondary'
              : 'font-body text-dune-text-primary'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
};
