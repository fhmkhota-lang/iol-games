/**
 * Act2Cell — real photograph of Mandela's Cell B, Robben Island.
 * Replaces the 3D scene with a historically accurate full-bleed image.
 * The 3D canvas is hidden; interaction is via a plain CTA button.
 */

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { AudioManager } from '../lib/AudioManager';

interface Props {
  audioManager: AudioManager;
  onResolutionComplete: () => void;
  active: boolean;
}

const Act2Cell: React.FC<Props> = ({ audioManager, onResolutionComplete, active }) => {
  const fadeWrapperRef = useRef<HTMLDivElement>(null);
  const photoRef       = useRef<HTMLDivElement>(null);
  const contentRef     = useRef<HTMLDivElement>(null);
  const btnRef         = useRef<HTMLButtonElement>(null);
  const triggered      = useRef(false);
  const canvasRef      = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;

    triggered.current = false;

    // Fade in wrapper
    const fadeTimer = setTimeout(() => {
      fadeWrapperRef.current?.classList.add('act2-fade-wrapper--visible');
    }, 60);

    // Slow ken burns on photo
    if (photoRef.current) {
      setTimeout(() => photoRef.current?.classList.add('act2-photo--loaded'), 200);
    }

    // Content rises in after photo settles
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 1.1, ease: 'power2.out', delay: 0.9 },
      );
    }

    // Audio
    audioManager.playCellMonologue();

    return () => {
      clearTimeout(fadeTimer);
    };
  }, [active, audioManager]);

  const handleOpen = () => {
    if (triggered.current) return;
    triggered.current = true;

    audioManager.stopCell();
    audioManager.playInauguration();

    // Fade out the whole wrapper
    if (fadeWrapperRef.current) {
      gsap.to(fadeWrapperRef.current, {
        opacity: 0,
        duration: 1.4,
        ease: 'power2.inOut',
        onComplete: onResolutionComplete,
      });
    }
  };

  return (
    <div className="act2-wrapper" aria-label="Robben Island prison cell — Act 2">
      <div ref={fadeWrapperRef} className="act2-fade-wrapper">

        {/* Full-bleed real photograph */}
        <div ref={photoRef} className="act2-photo" aria-hidden="true" />

        {/* Gradient vignette */}
        <div className="act2-vignette" aria-hidden="true" />

        {/* Hidden canvas — kept for potential future 3D overlay */}
        <canvas ref={canvasRef} className="act2-canvas" aria-hidden="true" />

        {/* Top-left label */}
        <div className="act2-label">
          <span className="act2-label-title">Robben Island</span>
          <span className="act2-label-sub">Cell B — Section B · 2.1 × 2.4 m · 1964–1982</span>
        </div>

        {/* Bottom editorial content */}
        <div ref={contentRef} className="act2-content" style={{ opacity: 0 }}>
          <p className="act2-eyebrow">Nelson Mandela · 18 years in this cell</p>

          <blockquote>
            <p className="act2-quote-text">
              "I could walk the length of my cell in three paces.
              When I lay down, I could feel the wall with my feet
              and my head grazed the concrete at the other side."
            </p>
            <footer>
              <cite className="act2-quote-attr">Long Walk to Freedom, 1994</cite>
            </footer>
          </blockquote>

          <button
            ref={btnRef}
            className="act2-cta-btn"
            onClick={handleOpen}
            aria-label="Open the gate and continue to Act 3"
          >
            Open the gate
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
};

export default Act2Cell;
