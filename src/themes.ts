import type { ThemeMode } from "./types";

/** Metadata and token-backed styling presets for each supported application theme. */
export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  description: string;
  rootClass: string;
  badgeClass: string;
  buttonPrimary: string;
  buttonSecondary: string;
  activeTabClass: string;
  accentText: string;
}

/** Theme definitions backed by `--md-sys-*` CSS custom properties in `src/styles/tokens.css`. */
export const THEMES: Record<ThemeMode, ThemeConfig> = {
  material: {
    id: "material",
    name: "Material You (Cobalt Dark)",
    description: "Material Design 3 tonal surfaces generated from a Cobalt Blue seed",
    rootClass: "bg-surface text-on-surface selection:bg-primary/30",
    badgeClass: "bg-secondary-container text-on-secondary-container border border-outline-variant rounded-m3-full",
    buttonPrimary: "bg-primary text-on-primary font-semibold rounded-m3-full",
    buttonSecondary: "bg-secondary-container text-on-secondary-container border border-outline-variant rounded-m3-full",
    activeTabClass: "bg-primary-container text-on-primary-container font-semibold rounded-m3-md",
    accentText: "text-primary",
  },
  pink: {
    id: "pink",
    name: "Midnight Sakura (OLED)",
    description: "Deep OLED obsidian surface paired with high-contrast sakura rose tokens",
    rootClass: "bg-surface text-on-surface selection:bg-primary/30",
    badgeClass: "bg-secondary-container text-on-secondary-container border border-outline-variant rounded-m3-full",
    buttonPrimary: "bg-primary text-on-primary font-semibold rounded-m3-full",
    buttonSecondary: "bg-secondary-container text-on-secondary-container border border-outline-variant rounded-m3-full",
    activeTabClass: "bg-primary-container text-on-primary-container font-semibold rounded-m3-md",
    accentText: "text-primary",
  },
  pink_light: {
    id: "pink_light",
    name: "Blush Cotton Candy (Light)",
    description: "Warm light tonal surfaces paired with accessible berry rose accents",
    rootClass: "bg-surface text-on-surface selection:bg-primary/20",
    badgeClass: "bg-secondary-container text-on-secondary-container border border-outline-variant rounded-m3-full",
    buttonPrimary: "bg-primary text-on-primary font-semibold rounded-m3-full",
    buttonSecondary: "bg-secondary-container text-on-secondary-container border border-outline-variant rounded-m3-full",
    activeTabClass: "bg-primary-container text-on-primary-container font-semibold rounded-m3-md",
    accentText: "text-primary",
  },
  apple: {
    id: "apple",
    name: "Cupertino Silver",
    description: "Neutral brushed slate surfaces with crisp cobalt and emerald accents",
    rootClass: "bg-surface text-on-surface selection:bg-primary/25",
    badgeClass: "bg-secondary-container text-on-secondary-container border border-outline-variant rounded-m3-full",
    buttonPrimary: "bg-primary text-on-primary font-semibold rounded-m3-full",
    buttonSecondary: "bg-secondary-container text-on-secondary-container border border-outline-variant rounded-m3-full",
    activeTabClass: "bg-primary-container text-on-primary-container font-semibold rounded-m3-md",
    accentText: "text-primary",
  },
  dark: {
    id: "dark",
    name: "Solar Sunset (Matte Amber)",
    description: "Matte obsidian surfaces with warm amber-orange primary tokens",
    rootClass: "bg-surface text-on-surface selection:bg-primary/30",
    badgeClass: "bg-secondary-container text-on-secondary-container border border-outline-variant rounded-m3-full",
    buttonPrimary: "bg-primary text-on-primary font-semibold rounded-m3-full",
    buttonSecondary: "bg-secondary-container text-on-secondary-container border border-outline-variant rounded-m3-full",
    activeTabClass: "bg-primary-container text-on-primary-container font-semibold rounded-m3-md",
    accentText: "text-primary",
  },
};
