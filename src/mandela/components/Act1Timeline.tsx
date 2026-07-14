/**
 * Act1Timeline — editorial scroll-driven narrative.
 * One chapter card per event, revealed as the user scrolls.
 * No SVG waves. Typographic ghost year as visual anchor.
 */

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { AudioManager } from '../lib/AudioManager';

const EVENTS = [
  {
    year: '1918',
    title: 'Rolihlahla Mandela is born',
    body: 'Born in the village of Mvezo on the banks of the Mbashe River, Eastern Cape. A Methodist teacher gives him the name Nelson on his first day of school.',
    audioIndex: -1,
  },
  {
    year: '1944',
    title: 'The ANC Youth League',
    body: 'Mandela co-founds the ANC Youth League, demanding mass-action resistance against apartheid — rejecting the polite petitions of the old guard.',
    audioIndex: -1,
  },
  {
    year: '1964',
    title: '"I am prepared to die."',
    body: 'At the Rivonia Trial, Mandela delivers a three-hour statement from the dock. Sentenced to life imprisonment. He boards a ferry to Robben Island.',
    audioIndex: 0,
  },
  {
    year: '1985',
    title: 'Freedom offered — and refused',
    body: "P.W. Botha offers conditional release. Mandela's daughter reads his reply to 10,000 people in Soweto: \"Only free men can negotiate.\"",
    audioIndex: 1,
  },
  {
    year: '1990',
    title: 'The walk to freedom',
    body: 'After 27 years, Nelson Mandela walks through the gates of Victor Verster Prison, fist raised. The world holds its breath.',
    audioIndex: 2,
  },
];

const SCROLL_TRACK_ID = 'mandela-act1-scroll-track';

interface Props {
  audioManager: AudioManager;
  onComplete: () => void;
}

const Act1Timeline: React.FC<Props> = ({ audioManager, onComplete }) => {
  const overlayRef  = useRef<HTMLDivElement>(null);
  const spineRef    = useRef<HTMLDivElement>(null);
  const cardRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);
  const hintRef     = useRef<HTMLDivElement>(null);

  const onCompleteRef  = useRef(onComplete);
  const completedRef   = useRef(false);
  const activeCardRef  = useRef(-1);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const vh         = window.innerHeight;
    const trackHeight = (EVENTS.length + 1) * vh;
    const maxScroll   = trackHeight - vh;

    // Tall scroll track on body
    const track = document.createElement('div');
    track.id = SCROLL_TRACK_ID;
    track.style.cssText = `position:absolute;top:0;left:0;width:1px;height:${trackHeight}px;pointer-events:none;visibility:hidden;`;
    document.body.appendChild(track);
    document.body.style.overflowY = 'auto';
    document.body.style.height    = `${trackHeight}px`;
    window.scrollTo(0, 0);

    // Fade in overlay
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8 });

    // Show first card
    const first = cardRefs.current[0];
    if (first) {
      gsap.to(first, { opacity: 1, y: 0, duration: 0.9, delay: 0.35 });
      activeCardRef.current = 0;
    }

    const handleScroll = () => {
      const p = Math.min(window.scrollY / maxScroll, 1);

      // Spine fill
      if (spineRef.current) {
        spineRef.current.style.transform = `scaleY(${p})`;
      }

      // Progress bar
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${p})`;
      }

      // Scroll hint fades after first scroll
      if (p > 0.04 && hintRef.current && hintRef.current.style.opacity !== '0') {
        gsap.to(hintRef.current, { opacity: 0, duration: 0.4, overwrite: true });
      }

      // Which card is active
      const cardIndex = Math.min(Math.floor(p * EVENTS.length), EVENTS.length - 1);

      if (cardIndex !== activeCardRef.current) {
        const prev = cardRefs.current[activeCardRef.current];
        if (prev) {
          gsap.to(prev, {
            opacity: 0,
            y: cardIndex > activeCardRef.current ? -24 : 24,
            duration: 0.35,
            overwrite: true,
          });
          if (EVENTS[activeCardRef.current]?.audioIndex >= 0) audioManager.stopTimeline();
        }

        const next = cardRefs.current[cardIndex];
        if (next) {
          gsap.fromTo(
            next,
            { opacity: 0, y: cardIndex > activeCardRef.current ? 36 : -36 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', overwrite: true },
          );
          if (EVENTS[cardIndex]?.audioIndex >= 0) {
            audioManager.playTimeline(EVENTS[cardIndex].audioIndex);
          }
        }

        activeCardRef.current = cardIndex;
      }

      if (p >= 0.995 && !completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.getElementById(SCROLL_TRACK_ID)?.remove();
      document.body.style.overflowY = '';
      document.body.style.height    = '';
      window.scrollTo(0, 0);
    };
  }, [audioManager]);

  return (
    <div ref={overlayRef} className="act1-overlay" style={{ opacity: 0 }}>

      {/* Vertical spine — left edge */}
      <div className="act1-spine">
        <div ref={spineRef} className="act1-spine-fill" style={{ height: '100%', transform: 'scaleY(0)' }} />
      </div>
      <span className="act1-chapter-label">Long Walk to Freedom</span>

      {/* Cards */}
      <div className="act1-cards-stage">
        {EVENTS.map((event, i) => (
          <div
            key={event.year}
            ref={(el) => { cardRefs.current[i] = el; }}
            className="act1-card"
            style={{ opacity: 0, transform: 'translateY(36px)' }}
          >
            {/* Ghost year — typographic anchor */}
            <span className="act1-card-ghost-year" aria-hidden="true">
              {event.year}
            </span>

            {/* Content */}
            <div className="act1-card-rule" />
            <span className="act1-card-eyebrow">{event.year}</span>
            <h2 className="act1-card-title">{event.title}</h2>
            <p className="act1-card-body">{event.body}</p>
            {event.audioIndex >= 0 && (
              <span className="act1-card-audio-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
                Audio
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="act1-progress-track" aria-hidden="true">
        <div ref={progressRef} className="act1-progress-bar" />
      </div>

      {/* Scroll hint */}
      <div ref={hintRef} className="act1-scroll-hint" aria-hidden="true">
        <span>Scroll to begin</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </div>
  );
};

export default Act1Timeline;
