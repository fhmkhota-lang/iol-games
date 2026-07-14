import { useState } from 'react';
import { Share2, Download, Check, Copy } from 'lucide-react';
import { copyToClipboard, downloadShareCard } from '../../utils/share';

interface ShareButtonProps {
  text: string;
  gameName: string;
  resultLine: string;
  emojiGrid?: string;
  className?: string;
}

export function ShareButton({ text, gameName, resultLine, emojiGrid = '', className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setOpen(false);
  }

  function handleDownload() {
    downloadShareCard(gameName, resultLine, emojiGrid);
    setOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-iol-red hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
      >
        <Share2 size={16} />
        Share
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 right-0 z-20 bg-[#2a2a2a] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-48">
            <button
              onClick={handleCopy}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/10 text-white text-sm transition-colors"
            >
              {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/10 text-white text-sm transition-colors border-t border-white/10"
            >
              <Download size={15} />
              Download card
            </button>
          </div>
        </>
      )}
    </div>
  );
}
