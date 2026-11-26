import type { ThemeMode } from "./types";

/** Metadata and token-backed styling presets for supported application schemes. */
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

const SHARED_DARK: Omit<ThemeConfig, "id" | "name" | "description"> = {
  rootClass: "bg-surface text-on-surface selection:bg-primary/25",
  badgeClass: "bg-secondary-container text-on-secondary-container rounded-m3-full",
  buttonPrimary: "bg-primary text-on-primary font-medium rounded-m3-full",
  buttonSecondary: "bg-transparent text-primary border border-outline rounded-m3-full",
  activeTabClass: "bg-primary-container text-on-primary-container font-medium rounded-m3-md",
  accentText: "text-primary",
};

const SHARED_LIGHT: Omit<ThemeConfig, "id" | "name" | "description"> = {
  rootClass: "bg-surface text-on-surface selection:bg-primary/20",
  badgeClass: "bg-secondary-container text-on-secondary-container rounded-m3-full",
  buttonPrimary: "bg-primary text-on-primary font-medium rounded-m3-full",
  buttonSecondary: "bg-transparent text-primary border border-outline rounded-m3-full",
  activeTabClass: "bg-primary-container text-on-primary-container font-medium rounded-m3-md",
  accentText: "text-primary",
};

/** All themes map to the single-seed M3 Light or Dark scheme in `src/styles/tokens.css`. */
export const THEMES: Record<ThemeMode, ThemeConfig> = {
  material: {
    id: "material",
    name: "Material 3 Dark",
    description: "Neutral dark tonal surfaces with slate-blue primary accents",
    ...SHARED_DARK,
  },
  pink_light: {
    id: "pink_light",
    name: "Material 3 Light",
    description: "Clean light tonal surfaces with slate-blue primary accents",
    ...SHARED_LIGHT,
  },
  pink: {
    id: "pink",
    name: "Material 3 Dark",
    description: "Neutral dark tonal surfaces with slate-blue primary accents",
    ...SHARED_DARK,
  },
  apple: {
    id: "apple",
    name: "Material 3 Dark",
    description: "Neutral dark tonal surfaces with slate-blue primary accents",
    ...SHARED_DARK,
  },
  dark: {
    id: "dark",
    name: "Material 3 Dark",
    description: "Neutral dark tonal surfaces with slate-blue primary accents",
    ...SHARED_DARK,
  },
};
