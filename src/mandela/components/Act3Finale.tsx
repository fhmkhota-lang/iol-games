/**
 * Act3Finale — full-bleed inauguration image that dissolves in as Act 2 exits.
 *
 * Drop /assets/images/inauguration.jpg (or .webp / .png) into public/assets/images/
 * and the component will use it. Falls back to a CSS gradient placeholder.
 */

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface Props {
  active: boolean;
}

const INAUGURATION_QUOTE = '"Let freedom reign!"';
const INAUGURATION_DATE = '10 May 1994 — Union Buildings, Pretoria';

const Act3Finale: React.FC<Props> = ({ active }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !wrapperRef.current) return;

    const tl = gsap.timeline();

    // Overlay fades in
    tl.fromTo(wrapperRef.current, { opacity: 0 }, { opacity: 1, duration: 2, ease: 'power2.out' });

    // Quote rises in
    if (quoteRef.current) {
      tl.fromTo(
        quoteRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out' },
        '-=0.6',
      );
    }

    // CTA appears last
    if (ctaRef.current) {
      tl.fromTo(
        ctaRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1, ease: 'power2.out' },
        '+=0.6',
      );
    }
  }, [active]);

  if (!active) return null;

  return (
    <div ref={wrapperRef} className="act3-wrapper" aria-label="Act 3 — Freedom">
      {/* ── Background — drop inauguration.jpg into /assets/images/ ── */}
      <div
        className="act3-bg"
        style={{ backgroundImage: 'url(/assets/images/inauguration.jpg)' }}
        aria-hidden="true"
      />

      {/* ── Gradient overlay for text legibility ── */}
      <div className="act3-overlay" aria-hidden="true" />

      {/* ── ANC flag colour bar ── */}
      <div className="act3-flag-bar" aria-hidden="true">
        <span style={{ background: '#007A4D' }} />
        <span style={{ background: '#FFB612' }} />
        <span style={{ background: '#DE3831' }} />
        <span style={{ background: '#002395' }} />
        <span style={{ background: '#000000' }} />
        <span style={{ background: '#FFFFFF' }} />
      </div>

      {/* ── Text content ── */}
      <div className="act3-content">
        <span className="act3-eyebrow">10 May 1994 · Union Buildings, Pretoria</span>
        <blockquote ref={quoteRef} className="act3-quote">
          <p className="act3-quote-text">{INAUGURATION_QUOTE}</p>
          <footer className="act3-quote-footer">
            <cite>Nelson Mandela · {INAUGURATION_DATE}</cite>
          </footer>
        </blockquote>

        <div ref={ctaRef} className="act3-cta">
          <div className="act3-cta-number">67</div>
          <div className="act3-cta-body">
            <p className="act3-cta-text">
              On <strong>Mandela Day — 18 July</strong>, give 67 minutes of your
              time in honour of 67 years of public service.
            </p>
            <a
              href="https://www.mandeladay.com"
              target="_blank"
              rel="noopener noreferrer"
              className="act3-cta-link"
            >
              Pledge your 67 minutes →
            </a>
          </div>
        </div>
      </div>

      {/* ── Attribution note (editorial/legal best practice) ── */}
      <p className="act3-attribution">
        Image: Nelson Mandela Foundation Digital Archive / Creative Commons
      </p>
    </div>
  );
};

export default Act3Finale;
