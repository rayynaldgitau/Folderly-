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
    name: "Material You",
    icon: "🤖",
    description: "Official Google & Android Material 3 with Google Blue and Android Green",
    rootClass: "theme-material bg-[#131314] text-[#f1f3f4] selection:bg-[#8ab4f8]/30",
    badgeClass: "bg-[#3ddc84]/15 text-[#3ddc84] border border-[#3ddc84]/35 rounded-full shadow-sm",
    buttonPrimary: "bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold rounded-2xl shadow-md shadow-[#1a73e8]/25",
    buttonSecondary: "bg-[#23252b] text-[#f1f3f4] border border-[#44474f]/40 hover:bg-[#2c2f37] rounded-2xl",
    activeTabClass: "bg-[#004a77] text-[#c2e7ff] border border-[#8ab4f8]/40 rounded-2xl shadow-sm",
    accentText: "text-[#8ab4f8]",
  },
  apple: {
    id: "apple",
    name: "macOS (Silver & Multicolor)",
    icon: "🍎",
    description: "Neutral gray-and-silver system backdrop with Apple Multicolor accents",
    rootClass: "theme-apple bg-[#24262b] text-[#f5f5f7] selection:bg-white/20",
    badgeClass: "bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30 rounded-md shadow-sm",
    buttonPrimary: "bg-gradient-to-b from-[#535760] to-[#3e4148] text-white border border-white/20 rounded-xl shadow-sm",
    buttonSecondary: "bg-white/10 hover:bg-white/15 text-neutral-200 border border-white/15 rounded-xl backdrop-blur-md",
    activeTabClass: "bg-gradient-to-r from-[#ff453a] via-[#ffd60a] to-[#30d158] text-white font-semibold rounded-xl shadow-sm",
    accentText: "text-white",
  },
  dark: {
    id: "dark",
    name: "Midnight Orange",
    icon: "✨",
    description: "Obsidian midnight black with subtle matte orange accents",
    rootClass: "theme-dark bg-[#0c0c0e] text-[#f4f4f5] selection:bg-[#ea580c]/30",
    badgeClass: "bg-[#ea580c]/15 text-[#fb923c] border border-[#ea580c]/30 rounded-full shadow-sm",
    buttonPrimary: "bg-[#d96520] hover:bg-[#bf5215] text-white font-semibold rounded-xl shadow-md shadow-[#d96520]/20",
    buttonSecondary: "bg-[#18181d] hover:bg-[#202026] text-[#f4f4f5] border border-[#272730] rounded-xl",
    activeTabClass: "bg-[#ea580c] text-white font-semibold rounded-xl shadow-sm",
    accentText: "text-[#fb923c]",
  },
};
