import React, { useId } from "react";

export interface FoldyLogoProps {
  /** Size in pixels (width and height). Defaults to 28. */
  size?: number;
  /** Additional CSS class names. */
  className?: string;
  /** Whether to enable playful hover animation. Defaults to true. */
  interactive?: boolean;
}

/**
 * Cute mascot vector logo for Foldy.
 *
 * Renders an adorable, kawaii-styled pink folder character with sparkling
 * anime eyes, sweet rosy blush cheeks, a joyful smile, and a playful document sheet.
 *
 * @param props - Size, style class names, and interactivity options.
 * @returns An SVG element representing the Foldy mascot.
 */
export const FoldyLogo: React.FC<FoldyLogoProps> = ({
  size = 28,
  className = "",
  interactive = true,
}) => {
  const uid = useId().replace(/:/g, "_");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${
        interactive
          ? "transition-transform duration-300 hover:scale-110 hover:-rotate-3 active:scale-95 cursor-pointer"
          : ""
      } ${className}`}
      aria-label="Foldy mascot logo"
      role="img"
    >
      <defs>
        {/* Soft vibrant drop shadow */}
        <filter id={`foldy-glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#ff2d87" floodOpacity="0.3" />
        </filter>

        {/* Back folder flap gradient */}
        <linearGradient id={`foldy-back-${uid}`} x1="8" y1="12" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff4b98" />
          <stop offset="1" stopColor="#cf1262" />
        </linearGradient>

        {/* Paper sheet gradient inside folder */}
        <linearGradient id={`foldy-paper-${uid}`} x1="20" y1="10" x2="48" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#fff1f6" />
        </linearGradient>

        {/* Front folder body gradient */}
        <linearGradient id={`foldy-body-${uid}`} x1="6" y1="20" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff69a6" />
          <stop offset="0.45" stopColor="#ff2d87" />
          <stop offset="1" stopColor="#d60060" />
        </linearGradient>

        {/* Glossy sheen on upper curvature */}
        <linearGradient id={`foldy-sheen-${uid}`} x1="32" y1="20" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Anime eye gradient */}
        <linearGradient id={`foldy-eye-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#28051b" />
          <stop offset="1" stopColor="#460f32" />
        </linearGradient>
      </defs>

      {/* Folder Back Flap */}
      <g filter={`url(#foldy-glow-${uid})`}>
        <path
          d="M8 20C8 16.6863 10.6863 14 14 14H24C26.2091 14 28.2435 15.2217 29.2847 17.174L30.7153 19.826C31.2359 20.8022 32.2531 21.413 33.3577 21.413H50C53.3137 21.413 56 24.0993 56 27.413V48C56 52.4183 52.4183 56 48 56H16C11.5817 56 8 52.4183 8 48V20Z"
          fill={`url(#foldy-back-${uid})`}
        />

        {/* Peek-a-boo cute folded paper sheet */}
        <g transform="rotate(-4 32 20)">
          <rect x="22" y="10" width="22" height="18" rx="3.5" fill={`url(#foldy-paper-${uid})`} />
          {/* Paper lines */}
          <line x1="26" y1="15" x2="38" y2="15" stroke="#ffb3d1" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="26" y1="18.5" x2="35" y2="18.5" stroke="#ffb3d1" strokeWidth="1.2" strokeLinecap="round" />
          {/* Tiny cute heart sticker on paper */}
          <path d="M38.5 17.5C38.5 16.6 39.2 16 40 16C40.5 16 41 16.3 41.2 16.7C41.4 16.3 41.9 16 42.4 16C43.2 16 43.9 16.6 43.9 17.5C43.9 18.7 41.2 20.3 41.2 20.3C41.2 20.3 38.5 18.7 38.5 17.5Z" fill="#ff2d87" />
        </g>

        {/* Front Folder Body / Pouch */}
        <path
          d="M6 24C6 20.6863 8.68629 18 12 18H25.2C27.1352 18 28.9372 18.9328 30.0489 20.5126L31.9511 23.2147C32.5069 24.0047 33.4079 24.471 34.3755 24.471H52C55.3137 24.471 58 27.1573 58 30.471V48C58 52.4183 54.4183 56 50 56H14C9.58172 56 6 52.4183 6 48V24Z"
          fill={`url(#foldy-body-${uid})`}
        />

        {/* Glossy Sheen Highlight */}
        <path
          d="M12 19.5H25.2C26.7 19.5 28.1 20.2 29 21.4L30.9 24.1C31.8 25.3 33.2 26 34.7 26H52C54.5 26 56.5 28 56.5 30.5V33C56.5 33 46 29 32 29C18 29 7.5 33 7.5 33V24C7.5 21.5 9.5 19.5 12 19.5Z"
          fill={`url(#foldy-sheen-${uid})`}
        />
      </g>

      {/* ── Cute Kawaii Face ── */}
      {/* Left Rosy Cheek with twin sparkles */}
      <ellipse cx="19" cy="42" rx="4.5" ry="2.7" fill="#ffa1c5" fillOpacity="0.9" />
      <ellipse cx="18" cy="41.5" rx="1.2" ry="0.8" fill="#ffffff" fillOpacity="0.8" />

      {/* Right Rosy Cheek with twin sparkles */}
      <ellipse cx="45" cy="42" rx="4.5" ry="2.7" fill="#ffa1c5" fillOpacity="0.9" />
      <ellipse cx="44" cy="41.5" rx="1.2" ry="0.8" fill="#ffffff" fillOpacity="0.8" />

      {/* Left Big Anime Sparkle Eye */}
      <g>
        <ellipse cx="23.5" cy="35.5" rx="3.8" ry="4.5" fill={`url(#foldy-eye-${uid})`} />
        {/* Big Catchlight Sparkle */}
        <circle cx="22.2" cy="33.8" r="1.7" fill="#ffffff" />
        {/* Mini Secondary Sparkle */}
        <circle cx="25.2" cy="37.5" r="0.9" fill="#ffffff" />
      </g>

      {/* Right Big Anime Sparkle Eye */}
      <g>
        <ellipse cx="40.5" cy="35.5" rx="3.8" ry="4.5" fill={`url(#foldy-eye-${uid})`} />
        {/* Big Catchlight Sparkle */}
        <circle cx="39.2" cy="33.8" r="1.7" fill="#ffffff" />
        {/* Mini Secondary Sparkle */}
        <circle cx="42.2" cy="37.5" r="0.9" fill="#ffffff" />
      </g>

      {/* Joyful Smile with Peek Tongue */}
      <path
        d="M28.5 39.5C29.5 42.6 34.5 42.6 35.5 39.5"
        stroke="#250518"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M30.2 41C31.2 42.3 32.8 42.3 33.8 41"
        fill="#ff4b8b"
      />

      {/* Magical 4-Pointed Star Sparkle (Top Right) */}
      <g transform="translate(49, 13)">
        <path
          d="M0 -5.5C0.3 -1.8 1.8 -0.3 5.5 0C1.8 0.3 0.3 1.8 0 5.5C-0.3 1.8 -1.8 0.3 -5.5 0C-1.8 -0.3 -0.3 -1.8 0 -5.5Z"
          fill="#ffe066"
        />
        <circle cx="0" cy="0" r="1" fill="#ffffff" />
      </g>

      {/* Tiny Mini Sparkle (Top Left) */}
      <g transform="translate(13, 11) scale(0.6)">
        <path
          d="M0 -4C0.2 -1.2 1.2 -0.2 4 0C1.2 0.2 0.2 1.2 0 4C-0.2 1.2 -1.2 0.2 -4 0C-1.2 -0.2 -0.2 -1.2 0 -4Z"
          fill="#ffd166"
        />
        <circle cx="0" cy="0" r="0.8" fill="#ffffff" />
      </g>
    </svg>
  );
};

export default FoldyLogo;
