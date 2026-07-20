import { X } from 'lucide-react';

interface HowToPlayProps {
  title: string;
  accentColor: string;
  steps: { icon: string; text: string }[];
  onClose: () => void;
}

export function HowToPlay({ title, accentColor, steps, onClose }: HowToPlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 relative bounce-in"
        style={{ background: '#1a1a2e', border: `1px solid ${accentColor}40`, boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${accentColor}20` }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="mb-4">
          <div className="text-2xl mb-1">📖</div>
          <h2 className="font-black text-white text-lg">How to Play</h2>
          <p className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: accentColor }}>{title}</p>
        </div>

        <div className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0 mt-0.5">{step.icon}</span>
              <p className="text-slate-300 text-sm leading-snug">{step.text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
          style={{ background: accentColor, boxShadow: `0 4px 16px ${accentColor}55` }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
