import type { ThemeMode } from "./types";

/** Metadata and styling tokens for each supported application theme. */
export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  icon: string;
  description: string;
  rootClass: string;
  badgeClass: string;
  buttonPrimary: string;
  buttonSecondary: string;
  activeTabClass: string;
  accentText: string;
}

/** Theme definitions mapping visual attributes to tailored class combinations. */
export const THEMES: Record<ThemeMode, ThemeConfig> = {
  pink: {
    id: "pink",
    name: "OLED Pink",
    icon: "💖",
    description: "Deep true OLED charcoal black with hot pink highlights (Dark)",
    rootClass: "theme-pink bg-[#120e12] text-white selection:bg-[#ff2d87]/40",
    badgeClass: "bg-[#251b23] text-[#ff66a3] border border-[#ff2d87]/40 rounded-full",
    buttonPrimary: "bg-[#ff2d87] hover:bg-[#e61b74] text-white font-semibold rounded-xl shadow-md shadow-[#ff2d87]/25",
    buttonSecondary: "bg-[#1e181d] text-[#ff8dbb] border border-[#ff2d87]/30 hover:bg-[#2c222b] rounded-xl",
    activeTabClass: "bg-[#ff2d87] text-white font-semibold rounded-xl shadow-sm",
    accentText: "text-[#ff2d87]",
  },
  pink_light: {
    id: "pink_light",
    name: "Light Pink",
    icon: "🌸",
    description: "Soft elegant blush pink canvas with hot pink highlights (Light)",
    rootClass: "theme-pink-light bg-[#fceef2] text-[#241820] selection:bg-[#ff2d87]/25",
    badgeClass: "bg-[#fadee7] text-[#c91866] border border-[#ff2d87]/30 rounded-full",
    buttonPrimary: "bg-[#ff2d87] hover:bg-[#e61b74] text-white font-semibold rounded-xl shadow-md shadow-[#ff2d87]/20",
    buttonSecondary: "bg-[#fce4ec] text-[#241820] border border-[#ff2d87]/25 hover:bg-[#f8d4e0] rounded-xl",
    activeTabClass: "bg-[#ff2d87] text-white font-semibold rounded-xl shadow-sm",
    accentText: "text-[#ff2d87]",
  },
  material: {
    id: "material",
    name: "Material",
    icon: "🎨",
    description: "Google Material Design 3 elevation and tonal containers",
    rootClass: "theme-material bg-[#141218] text-[#e6e0e9] selection:bg-[#4f378b]/40",
    badgeClass: "bg-[#2b2930] text-[#d0bcff] border-[#49454f]/50 rounded-full shadow-sm",
    buttonPrimary: "bg-[#d0bcff] hover:bg-[#e8def8] text-[#381e72] font-semibold rounded-xl shadow-md",
    buttonSecondary: "bg-[#211f26] text-[#e6e0e9] border border-[#49454f]/40 hover:bg-[#2b2930] rounded-xl",
    activeTabClass: "bg-[#4f378b]/50 text-[#d0bcff] border-[#d0bcff]/40 rounded-xl",
    accentText: "text-[#d0bcff]",
  },
  apple: {
    id: "apple",
    name: "macOS",
    icon: "🍎",
    description: "Clean Cupertino minimalism with frosted glass and system blue",
    rootClass: "theme-apple bg-[#1a1a1c] text-[#f5f5f7] selection:bg-[#007aff]/30",
    badgeClass: "bg-white/10 text-neutral-200 border-white/15 backdrop-blur-md rounded-lg shadow-sm",
    buttonPrimary: "bg-[#007aff] hover:bg-[#0a84ff] text-white font-medium rounded-xl shadow-sm active:scale-95 transition-transform",
    buttonSecondary: "bg-white/10 hover:bg-white/15 text-neutral-200 border border-white/15 rounded-xl backdrop-blur-md",
    activeTabClass: "bg-white/20 text-white border-white/30 backdrop-blur-md rounded-xl",
    accentText: "text-[#2997ff]",
  },
  dark: {
    id: "dark",
    name: "Dark",
    icon: "✨",
    description: "Classic obsidian dark mode with violet accents",
    rootClass: "theme-dark bg-neutral-950 text-neutral-100 selection:bg-violet-500/30",
    badgeClass: "bg-violet-950/70 text-violet-300 border-violet-800/50 shadow-sm rounded-full",
    buttonPrimary: "bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 rounded-xl",
    buttonSecondary: "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl",
    activeTabClass: "bg-violet-950/70 text-violet-200 border-violet-700/60 rounded-xl",
    accentText: "text-violet-400",
  },
};
