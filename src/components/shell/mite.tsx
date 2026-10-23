import { cn } from '@/lib/utils';

/**
 * Mite, the filemite mascot: a little paper file with big eyes.
 *
 * - idle: sways, blinks, glances around
 * - work: leans in and chomps, cheeks puffing
 * - hungry: mouth wide open, bouncing (a file is being dragged over)
 * - happy: jumps with arms up and squinty smile
 */
export type MiteMood = 'idle' | 'work' | 'hungry' | 'happy';

/** The character, drawn around its feet at (0, 0). Embed inside any SVG. */
export function MiteFigure({ mood }: { mood: MiteMood }) {
  const squint = mood === 'happy';
  return (
    <g className={`mite mite-${mood}`}>
      <ellipse className="mite-shadow" cx="0" cy="2" rx="26" ry="3.5" />
      <g className="mite-bob">
        <rect className="mite-foot mite-foot-l" x="-19" y="-7" width="11" height="8" rx="4" />
        <rect className="mite-foot mite-foot-r" x="7" y="-7" width="11" height="8" rx="4" />

        <path className="mite-arm mite-arm-l" d="M-30 -26 q-10 -2 -14 -10" />
        <path className="mite-arm mite-arm-r" d="M30 -26 q10 -2 14 -10" />

        <g className="mite-body">
          <path
            className="mite-paper"
            d="M-21 -64H11L32 -43V-15a10 10 0 0 1-10 10H-21a10 10 0 0 1-10-10V-54a10 10 0 0 1 10-10Z"
          />
          <path className="mite-fold" d="M11 -64V-50a7 7 0 0 0 7 7H32Z" />
          <circle className="mite-cheek" cx="-20" cy="-22" r="4.5" />
          <circle className="mite-cheek" cx="21" cy="-22" r="4.5" />

          {squint ? (
            <g className="mite-squint">
              <path d="M-18 -36q5 -7 10 0" />
              <path d="M5 -36q5 -7 10 0" />
            </g>
          ) : (
            <>
              <g className="mite-eye">
                <circle className="mite-white" cx="-12" cy="-37" r="8" />
                <circle className="mite-white" cx="10" cy="-37" r="8" />
                <g className="mite-pupils">
                  <circle cx="-11" cy="-36" r="3.6" />
                  <circle cx="11" cy="-36" r="3.6" />
                  <circle className="mite-glint" cx="-9.6" cy="-37.6" r="1.1" />
                  <circle className="mite-glint" cx="12.4" cy="-37.6" r="1.1" />
                </g>
              </g>
              <path className="mite-brow mite-brow-l" d="M-19 -50l9 2" />
              <path className="mite-brow mite-brow-r" d="M17 -50l-9 2" />
            </>
          )}

          <g className="mite-mouth">
            <path d="M-7 -21h14v1a7 7 0 0 1-14 0Z" />
            <rect className="mite-tooth" x="-3.5" y="-21" width="3" height="3" rx="0.6" />
          </g>
          <path className="mite-sweat" d="M27 -54q3 5 0 7a3 3 0 0 1-3-3q0-2 3-4Z" />
        </g>
      </g>
    </g>
  );
}

export function Mite({ mood = 'idle', className }: { mood?: MiteMood; className?: string }) {
  return (
    <svg viewBox="-52 -78 104 84" className={cn('overflow-visible', className)} aria-hidden>
      <MiteFigure mood={mood} />
    </svg>
  );
}

/**
 * A little factory scene for long-running work: sheets ride in on a conveyor,
 * Mite chomps them, and squished cubes pop out the back into a tray.
 */
export function MiteStage({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 120" className={cn('w-full overflow-visible', className)} aria-hidden>
      {/* Tray the output lands in. */}
      <g className="stage-tray">
        <path d="M8 92h44l-4 14H12Z" />
        <rect className="stage-cube stage-pile" x="20" y="86" width="9" height="7" rx="1.5" />
        <rect className="stage-cube stage-pile" x="31" y="87" width="8" height="6" rx="1.5" />
      </g>

      {/* Squished cubes flying from Mite's back into the tray. */}
      {[0, 1].map((i) => (
        <rect
          key={i}
          className="stage-cube stage-fly"
          x="-4"
          y="-4"
          width="9"
          height="8"
          rx="1.6"
          style={{ animationDelay: `${0.62 + i * 0.8}s` } as React.CSSProperties}
        />
      ))}

      {/* Conveyor belt. */}
      <g className="stage-belt">
        <rect x="132" y="100" width="124" height="10" rx="5" />
        <line className="stage-belt-dash" x1="138" y1="105" x2="250" y2="105" />
        <circle cx="139" cy="105" r="2.2" />
        <circle cx="249" cy="105" r="2.2" />
      </g>

      {/* Sheets riding in, one after another. */}
      {[0, 1].map((i) => (
        <g
          key={i}
          className="stage-sheet"
          style={{ animationDelay: `${i * 0.8}s` } as React.CSSProperties}
        >
          <rect x="0" y="-26" width="20" height="26" rx="2.5" />
          <path d="M4 -19h12M4 -14h12M4 -9h8" />
        </g>
      ))}

      <g transform="translate(96 100)">
        <MiteFigure mood="work" />
      </g>

      {/* Chomp! */}
      <text className="stage-sfx" x="150" y="40">
        chomp!
      </text>
    </svg>
  );
}
