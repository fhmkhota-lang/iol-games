/**
 * Mandela Day — Scroll-Driven Canvas Experience
 *
 * Scroll mechanic: Continuous 900vh scroll track. Fixed background canvas
 * crossfades between images as the user scrolls — simulating the animated-website
 * skill's video-frame-on-scroll technique with still images.
 *
 * Visual language: Bold condensed sans, protest-poster energy. B&W for oppression,
 * colour floods in at liberation. One accent per chapter, not gold everywhere.
 *
 * No scroll-snap. No content boxes. No vignette + left-aligned card. Just type
 * floating on imagery that changes under your scroll.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import './mandela.css';

/* ── Chapter data ────────────────────────────────────────────────────── */
const CHAPTERS = [
  {
    id: 'title',
    yearLabel: '',
    headline: 'LONG WALK\nTO FREEDOM',
    sub: 'Nelson Rolihlahla Mandela',
    dates: '18 July 1918 — 5 December 2013',
    body: null,
    quote: null,
    quoteSource: null,
    stat: null,
    statLabel: null,
    image: null,
    imageFilter: 'none',
    accent: '#ffffff',
    textAlign: 'center' as const,
    verticalAlign: 'center' as const,
    audio: null,
    audioPeak: 0.6,
  },
  {
    id: 'origins',
    yearLabel: '18 JULY 1918',
    headline: 'ROLIHLAHLA',
    sub: 'A Child of the Clan · Mvezo, Eastern Cape',
    dates: null,
    body: 'Born in the village of Mvezo on the banks of the Mbashe River, Eastern Cape. His father, a local Thembu chief, died when he was twelve. He was sent to the Great Place of the regent Jongintaba — a royal court where tribal councils let any man speak, where democracy was already ancient practice. He tended cattle on the hillsides and listened to elders tell stories of warriors who had resisted European encroachment. He would spend his life continuing that resistance.',
    quote: '"It was in the fields that I learned to drive an ox, to hunt, to cook, and to think. It was here that my whole being was infused with the beauty of a South African world."',
    quoteSource: 'Long Walk to Freedom, 1994',
    stat: null,
    statLabel: null,
    image: '/assets/images/soweto-house.jpg',
    imageFilter: 'grayscale(1) contrast(1.25) brightness(0.42)',
    accent: '#e8e4dc',
    textAlign: 'left' as const,
    verticalAlign: 'bottom' as const,
    audio: null,
    audioPeak: 0,
  },
  {
    id: 'resistance',
    yearLabel: '1944 — 1960',
    headline: 'A NATION\nREFUSES',
    sub: 'The ANC Youth League · The Defiance Campaign · Sharpeville',
    dates: null,
    body: 'In 1944, Mandela co-founded the ANC Youth League with Walter Sisulu and Oliver Tambo, demanding mass defiance where the older guard had offered polite petitions. The 1952 Defiance Campaign filled the jails with fifty thousand volunteers who deliberately broke unjust laws. Then, on 21 March 1960, police opened fire on unarmed protesters at Sharpeville, killing sixty-nine people — most shot in the back as they fled. The ANC was banned. Mandela went underground.',
    quote: '"The time for passive resistance has passed. What is needed is direct, vigorous, positive action."',
    quoteSource: 'ANC Youth League Programme of Action, 1949',
    stat: '69',
    statLabel: 'killed at Sharpeville',
    image: '/assets/images/quarry.jpg',
    imageFilter: 'grayscale(1) contrast(1.5) brightness(0.3)',
    accent: '#c41e1e',
    textAlign: 'right' as const,
    verticalAlign: 'bottom' as const,
    audio: null,
    audioPeak: 0,
  },
  {
    id: 'trial',
    yearLabel: '20 APRIL 1964',
    headline: 'PREPARED\nTO DIE',
    sub: 'The Rivonia Trial · Palace of Justice, Pretoria',
    dates: null,
    body: 'Mandela and nine others faced the death penalty. Arrested at Liliesleaf Farm with their plans for armed resistance in hand, they were charged with sabotage and conspiracy to overthrow the state. For three hours, Mandela spoke from the dock — not a plea for mercy, but a principled statement he had prepared knowing these might be his last public words. The verdict was life imprisonment, not death. He was forty-five years old.',
    quote: '"I have fought against white domination, and I have fought against black domination. I have cherished the ideal of a democratic and free society in which all persons live together in harmony and with equal opportunities. It is an ideal which I hope to live for and to achieve. But if needs be, it is an ideal for which I am prepared to die."',
    quoteSource: 'Rivonia Trial Statement · 20 April 1964',
    stat: null,
    statLabel: null,
    image: '/assets/images/quarry.jpg',
    imageFilter: 'grayscale(1) contrast(1.8) brightness(0.22) sepia(0.1)',
    accent: '#c41e1e',
    textAlign: 'center' as const,
    verticalAlign: 'center' as const,
    audio: '/assets/audio/mandela-npr-tribute.mp3',
    audioPeak: 0.55,
  },
  {
    id: 'prison',
    yearLabel: '1964 — 1982',
    headline: '27\nYEARS',
    sub: 'Robben Island · Cell B, Section B · 2.1 × 2.4 metres',
    dates: null,
    body: 'The cell was smaller than a parking space. A straw mat on concrete. One visitor every six months, one letter in, one letter out — both censored. During the day, prisoners crushed limestone in the island quarry; the lime dust damaged his eyes permanently. He refused release in 1985 on condition that he renounce violence. "Only free men can negotiate," his daughter read to fifty thousand people in Soweto. "Prisoners cannot enter into contracts." He waited.',
    quote: '"I could walk the length of my cell in three paces. When I lay down, I could feel the wall with my feet and my head grazed the concrete at the other side."',
    quoteSource: 'Long Walk to Freedom, 1994',
    stat: '27',
    statLabel: 'years imprisoned',
    image: '/assets/images/cell.jpg',
    imageFilter: 'grayscale(1) brightness(0.35) contrast(1.4)',
    accent: '#aaa9a6',
    textAlign: 'left' as const,
    verticalAlign: 'bottom' as const,
    audio: null,
    audioPeak: 0,
  },
  {
    id: 'release',
    yearLabel: '11 FEBRUARY 1990',
    headline: 'FREE\nAT LAST',
    sub: 'Victor Verster Prison · Paarl, Western Cape',
    dates: null,
    body: 'At 4:14 pm, the prison gates of Victor Verster opened. Nelson Mandela walked out, holding Winnie\'s hand, his right fist raised. He was seventy-one years old. He had gone in a young man; he walked out an elder, his hair grey, his face lined — but his bearing unchanged: upright, calm, unbroken. The world had been waiting since before dawn. He drove to Cape Town City Hall, where fifty thousand people had gathered. Speaking from the balcony, he left no doubt: negotiations, yes — but on behalf of all South Africans.',
    quote: '"I stand here before you not as a prophet but as a humble servant of you, the people. Your tireless and heroic sacrifices have made it possible for me to be here today."',
    quoteSource: 'Cape Town City Hall · 11 February 1990',
    stat: null,
    statLabel: null,
    image: '/assets/images/prison-gate.jpg',
    imageFilter: 'grayscale(0.4) brightness(0.62) sepia(0.25)',
    accent: '#c9a028',
    textAlign: 'left' as const,
    verticalAlign: 'bottom' as const,
    audio: '/assets/audio/release-speech.mp3',
    audioPeak: 0.7,
  },
  {
    id: 'inauguration',
    yearLabel: '10 MAY 1994',
    headline: 'LET FREEDOM\nREIGN',
    sub: 'Union Buildings · Pretoria · First democratic election',
    dates: null,
    body: 'On the morning of 10 May 1994, Nelson Rolihlahla Mandela was inaugurated as the first democratically elected President of South Africa. Military jets painted the sky in the colours of the new flag. One thousand world leaders attended. The generals who had authorised his imprisonment stood at attention and saluted. It was, as Mandela said, a common victory — for justice, for peace, for human dignity. He had lived to see the ideal he was prepared to die for become the law of the land.',
    quote: '"Never, never and never again shall it be that this beautiful land will again experience the oppression of one by another. The sun shall never set on so glorious a human achievement."',
    quoteSource: 'Inaugural Address · 10 May 1994',
    stat: '67',
    statLabel: 'years of public service — honour them',
    image: '/assets/images/inauguration.jpg',
    imageFilter: 'brightness(0.68) saturate(1.3)',
    accent: '#fbb040',
    textAlign: 'center' as const,
    verticalAlign: 'bottom' as const,
    audio: '/assets/audio/inauguration-crowd.mp3',
    audioPeak: 0.65,
  },
] as const;

/* ── Scroll config ───────────────────────────────────────────────────── */
const VH_PER_CHAPTER = 130; // each chapter occupies 130vh of scroll track
const TOTAL_VH       = CHAPTERS.length * VH_PER_CHAPTER;
const TRANSITION_BAND = 0.08; // 8% of chapter height is the crossfade zone

/* ── Helpers ─────────────────────────────────────────────────────────── */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function chapterOpacity(progress: number, chapterIndex: number, total: number): number {
  const chunkSize = 1 / total;
  const start = chapterIndex * chunkSize;
  const end   = start + chunkSize;
  const t     = (progress - start) / chunkSize;

  if (progress < start) return chapterIndex === 0 ? 1 : 0;
  if (progress > end)   return chapterIndex === total - 1 ? 1 : 0;

  // fade in over first TRANSITION_BAND, stay at 1, fade out over last TRANSITION_BAND
  const fadeIn  = Math.min(1, t / TRANSITION_BAND);
  const fadeOut = Math.min(1, (1 - t) / TRANSITION_BAND);
  return Math.min(fadeIn, fadeOut);
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const MandelaExperience: React.FC = () => {
  const trackRef       = useRef<HTMLDivElement>(null);
  const imgRefs        = useRef<(HTMLDivElement | null)[]>([]);
  const contentRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const audioRefs      = useRef<(HTMLAudioElement | null)[]>([]);
  const rafRef         = useRef<number>(0);
  const scrollYRef     = useRef(0);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  /* Unlock AudioContext on first scroll */
  const unlockAudio = useCallback(() => {
    if (audioUnlocked) return;
    setAudioUnlocked(true);
    document.removeEventListener('scroll', unlockAudio, { capture: true });
    document.removeEventListener('click', unlockAudio);
  }, [audioUnlocked]);

  useEffect(() => {
    document.body.classList.add('mandela-active');
    document.addEventListener('scroll', unlockAudio, { capture: true, passive: true, once: true });
    document.addEventListener('click', unlockAudio, { once: true });

    const tick = () => {
      const scrollY    = window.scrollY;
      const maxScroll  = (TOTAL_VH / 100) * window.innerHeight - window.innerHeight;
      const progress   = maxScroll > 0 ? Math.max(0, Math.min(1, scrollY / maxScroll)) : 0;
      const newChapter = Math.min(
        CHAPTERS.length - 1,
        Math.floor(progress * CHAPTERS.length),
      );

      scrollYRef.current = scrollY;

      /* Progress bar */
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${progress})`;
      }

      /* Cross-fade background images */
      CHAPTERS.forEach((_, i) => {
        const el = imgRefs.current[i];
        if (!el) return;
        const opacity = chapterOpacity(progress, i, CHAPTERS.length);
        el.style.opacity = String(opacity);
      });

      /* Fade chapter text content in/out */
      const chunkSize  = 1 / CHAPTERS.length;
      CHAPTERS.forEach((_, i) => {
        const el = contentRefs.current[i];
        if (!el) return;
        const start = i * chunkSize;
        const t     = (progress - start) / chunkSize;
        const inOpacity =
          t < 0.12 ? t / 0.12
          : t > 0.85 ? 1 - (t - 0.85) / 0.15
          : 1;
        el.style.opacity = String(Math.max(0, Math.min(1, inOpacity)));
        // slide up slightly as it enters
        const translateY = t < 0.12 ? lerp(22, 0, t / 0.12) : 0;
        el.style.transform = `translateY(${translateY}px)`;
      });

      /* Update chapter index for nav */
      setChapterIdx(newChapter);

      /* Audio crossfade */
      CHAPTERS.forEach((ch, i) => {
        const el = audioRefs.current[i];
        if (!el || !ch.audio) return;
        const chunkSize = 1 / CHAPTERS.length;
        const start = i * chunkSize;
        const t     = (progress - start) / chunkSize;
        const targetVol =
          t < 0.15 ? ch.audioPeak * (t / 0.15)
          : t > 0.8  ? ch.audioPeak * (1 - (t - 0.8) / 0.2)
          : ch.audioPeak;
        const vol = Math.max(0, Math.min(1, targetVol));
        el.volume = vol;
        if (vol > 0.02 && el.paused) {
          el.play().catch(() => {});
        } else if (vol <= 0.02 && !el.paused) {
          el.pause();
        }
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.body.classList.remove('mandela-active');
    };
  }, [unlockAudio]);

  const scrollToChapter = useCallback((i: number) => {
    const maxScroll = (TOTAL_VH / 100) * window.innerHeight - window.innerHeight;
    const chunkSize = 1 / CHAPTERS.length;
    const targetProgress = i * chunkSize + chunkSize * 0.15;
    window.scrollTo({ top: maxScroll * targetProgress, behavior: 'smooth' });
  }, []);

  return (
    <div className="me-root">
      {/* ── Scroll track ── */}
      <div
        ref={trackRef}
        className="me-track"
        style={{ height: `${TOTAL_VH}vh` }}
        aria-hidden="true"
      />

      {/* ── Film grain ── */}
      <div className="me-grain" aria-hidden="true" />

      {/* ── Progress bar ── */}
      <div className="me-progress-rail" aria-hidden="true">
        <div ref={progressBarRef} className="me-progress-fill" />
      </div>

      {/* ── Chapter nav dots ── */}
      <nav className="me-nav" aria-label="Story chapters">
        {CHAPTERS.map((ch, i) => (
          <button
            key={ch.id}
            className={`me-dot${i === chapterIdx ? ' me-dot--active' : ''}`}
            onClick={() => scrollToChapter(i)}
            aria-label={`Chapter ${i + 1}`}
          />
        ))}
      </nav>

      {/* ── Fixed canvas — background image layers ── */}
      <div className="me-canvas" aria-hidden="true">
        {CHAPTERS.map((ch, i) => (
          ch.image ? (
            <div
              key={ch.id}
              ref={(el) => { imgRefs.current[i] = el; }}
              className="me-img"
              style={{
                backgroundImage: `url(${ch.image})`,
                filter: ch.imageFilter,
                opacity: i === 0 ? 0 : 0,
              }}
            />
          ) : (
            <div
              key={ch.id}
              ref={(el) => { imgRefs.current[i] = el; }}
              className="me-img me-img--void"
              style={{ opacity: i === 0 ? 1 : 0 }}
            />
          )
        ))}

        {/* Gradient overlays that vary by chapter via CSS variable */}
        <div className="me-canvas-overlay" />
      </div>

      {/* ── Fixed text layers ── */}
      {CHAPTERS.map((ch, i) => (
        <div
          key={ch.id}
          ref={(el) => { contentRefs.current[i] = el; }}
          className={[
            'me-chapter',
            `me-chapter--${ch.textAlign}`,
            `me-chapter--valign-${ch.verticalAlign}`,
          ].join(' ')}
          style={{
            opacity: i === 0 ? 1 : 0,
            '--accent': ch.accent,
          } as React.CSSProperties}
          aria-hidden={i !== chapterIdx}
        >
          {/* Year label */}
          {ch.yearLabel && (
            <span className="me-year">{ch.yearLabel}</span>
          )}

          {/* Big headline */}
          <h2 className="me-headline" style={{ color: ch.accent }}>
            {ch.headline.split('\n').map((line, li) => (
              <span key={li} className="me-headline-line">{line}</span>
            ))}
          </h2>

          {/* Sub-headline */}
          {ch.sub && (
            <p className="me-sub">{ch.sub}</p>
          )}

          {/* Stat callout */}
          {ch.stat && (
            <div className="me-stat">
              <span className="me-stat-number" style={{ color: ch.accent }}>{ch.stat}</span>
              <span className="me-stat-label">{ch.statLabel}</span>
            </div>
          )}

          {/* Dates (title only) */}
          {ch.dates && (
            <p className="me-dates">{ch.dates}</p>
          )}

          {/* Body text */}
          {ch.body && (
            <p className="me-body">{ch.body}</p>
          )}

          {/* Pull quote */}
          {ch.quote && (
            <blockquote className="me-quote" style={{ borderColor: ch.accent }}>
              <p>{ch.quote}</p>
              {ch.quoteSource && <cite>{ch.quoteSource}</cite>}
            </blockquote>
          )}

          {/* CTA for final chapter */}
          {ch.id === 'inauguration' && (
            <div className="me-cta">
              <a
                href="https://www.mandeladay.com"
                target="_blank"
                rel="noopener noreferrer"
                className="me-cta-link"
              >
                Pledge your 67 minutes →
              </a>
              <p className="me-cta-sub">
                18 July · Give 67 minutes of service in honour of 67 years of his public life.
              </p>
            </div>
          )}
        </div>
      ))}

      {/* ── Hidden audio elements ── */}
      {CHAPTERS.map((ch, i) =>
        ch.audio ? (
          <audio
            key={ch.id}
            ref={(el) => { audioRefs.current[i] = el; }}
            src={ch.audio}
            loop
            preload="none"
            aria-hidden="true"
          />
        ) : null,
      )}

      {/* ── Scroll hint ── */}
      <div className="me-scroll-hint" aria-hidden="true">
        <span>Scroll</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </div>
  );
};

export default MandelaExperience;
