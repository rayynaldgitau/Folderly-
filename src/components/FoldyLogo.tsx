import React, { useId } from "react";

export interface FoldyLogoProps {
  /** Size in pixels (width and height). Defaults to 28. */
  size?: number;
  /** Additional CSS class names. */
  className?: string;
  /** Whether to enable subtle interactive hover animation. Defaults to true. */
  interactive?: boolean;
}

/**
 * Modern vector brand logo for Foldy.
 *
 * Renders a crisp crimson/ruby red folder with layered depth, a subtle glossy sheen,
 * and an angled document insert, designed for a professional desktop production feel.
 *
 * @param props - Size, style class names, and interactivity options.
 * @returns An SVG element representing the Foldy logo.
 */
export const FoldyLogo: React.FC<FoldyLogoProps> = ({
  size = 28,
  className = "",
  interactive = true,
}) => {
  // Generates unique DOM IDs for SVG defs so multiple logo instances don't collide.
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
          ? "transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          : ""
      } ${className}`}
      aria-label="Foldy logo"
      role="img"
    >
      <defs>
        {/* Soft vibrant drop shadow */}
        <filter id={`foldy-glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#991b1b" floodOpacity="0.25" />
        </filter>

        {/* Back folder flap gradient */}
        <linearGradient id={`foldy-back-${uid}`} x1="8" y1="14" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ef4444" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>

        {/* Paper sheet gradient inside folder */}
        <linearGradient id={`foldy-paper-${uid}`} x1="20" y1="10" x2="48" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#f8fafc" />
        </linearGradient>

        {/* Front folder body gradient */}
        <linearGradient id={`foldy-body-${uid}`} x1="6" y1="20" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f87171" />
          <stop offset="0.4" stopColor="#ef4444" />
          <stop offset="1" stopColor="#b91c1c" />
        </linearGradient>

        {/* Glossy sheen on upper curvature */}
        <linearGradient id={`foldy-sheen-${uid}`} x1="32" y1="19.5" x2="32" y2="33" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Subtle inner rim highlight */}
        <linearGradient id={`foldy-rim-${uid}`} x1="6" y1="24" x2="58" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fca5a5" stopOpacity="0.8" />
          <stop offset="1" stopColor="#f87171" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Folder Back Flap */}
      <g filter={`url(#foldy-glow-${uid})`}>
        <path
          d="M8 20C8 16.6863 10.6863 14 14 14H24C26.2091 14 28.2435 15.2217 29.2847 17.174L30.7153 19.826C31.2359 20.8022 32.2531 21.413 33.3577 21.413H50C53.3137 21.413 56 24.0993 56 27.413V48C56 52.4183 52.4183 56 48 56H16C11.5817 56 8 52.4183 8 48V20Z"
          fill={`url(#foldy-back-${uid})`}
        />

        {/* Clean professional angled document sheet */}
        <g transform="rotate(-3 32 20)">
          <rect x="22" y="10" width="22" height="19" rx="3" fill={`url(#foldy-paper-${uid})`} />
          <rect x="22" y="10" width="22" height="19" rx="3" stroke="#e2e8f0" strokeWidth="0.8" />
          <line x1="26" y1="15" x2="38" y2="15" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="26" y1="18.5" x2="35" y2="18.5" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="26" y1="22" x2="32" y2="22" stroke="#e2e8f0" strokeWidth="1.3" strokeLinecap="round" />
        </g>

        {/* Front Folder Body / Pouch */}
        <path
          d="M6 24C6 20.6863 8.68629 18 12 18H25.2C27.1352 18 28.9372 18.9328 30.0489 20.5126L31.9511 23.2147C32.5069 24.0047 33.4079 24.471 34.3755 24.471H52C55.3137 24.471 58 27.1573 58 30.471V48C58 52.4183 54.4183 56 50 56H14C9.58172 56 6 52.4183 6 48V24Z"
          fill={`url(#foldy-body-${uid})`}
        />

        {/* Front Folder Top Rim Accent */}
        <path
          d="M6 24C6 20.6863 8.68629 18 12 18H25.2C27.1352 18 28.9372 18.9328 30.0489 20.5126L31.9511 23.2147C32.5069 24.0047 33.4079 24.471 34.3755 24.471H52C55.3137 24.471 58 27.1573 58 30.471"
          stroke={`url(#foldy-rim-${uid})`}
          strokeWidth="0.8"
          strokeLinecap="round"
        />

        {/* Glossy Sheen Highlight */}
        <path
          d="M12 19.5H25.2C26.7 19.5 28.1 20.2 29 21.4L30.9 24.1C31.8 25.3 33.2 26 34.7 26H52C54.5 26 56.5 28 56.5 30.5V33C56.5 33 46 29 32 29C18 29 7.5 33 7.5 33V24C7.5 21.5 9.5 19.5 12 19.5Z"
          fill={`url(#foldy-sheen-${uid})`}
        />
      </g>
    </svg>
  );
};

export default FoldyLogo;
