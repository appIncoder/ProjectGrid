import { Injectable, computed, effect, signal } from '@angular/core';

/**
 * Préférences d'apparence de l'application (personnalisation de l'expérience
 * utilisateur). Portée globale, indépendante du projet sélectionné :
 * persistées en localStorage et appliquées sur <html> via des attributs
 * `data-theme` / `data-accent` / `data-skin` + une classe `pg-contrast-high`,
 * que `src/styles.scss` consomme pour redéfinir les tokens --pg-color-*.
 */

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ThemeAccent = 'teal' | 'violet' | 'coral' | 'amber' | 'green';
/**
 * Style visuel global. 'lumen' est l'habillage actuel de l'application, piloté
 * par mode/accent/contraste ci-dessous. 'pulse' / 'agora' / 'mosaic' sont les
 * 3 directions explorées (maquettes "réseau social"), et 'graphite' / 'solstice'
 * 2 directions supplémentaires (minimaliste monochrome / chaleureux pastel) :
 * chacune fixe sa propre palette, typographie et rayons — elles ne se
 * combinent pas avec le réglage d'accent, qui reste spécifique à Lumen.
 */
export type ThemeSkin = 'lumen' | 'pulse' | 'agora' | 'mosaic' | 'graphite' | 'solstice';

const MODE_STORAGE_KEY = 'pg.theme.mode';
const ACCENT_STORAGE_KEY = 'pg.theme.accent';
const CONTRAST_STORAGE_KEY = 'pg.theme.contrast';
const SKIN_STORAGE_KEY = 'pg.theme.skin';

export const THEME_MODE_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'auto', label: 'Auto' },
];

export const THEME_ACCENT_OPTIONS: Array<{ value: ThemeAccent; label: string }> = [
  { value: 'teal', label: 'Teal (défaut)' },
  { value: 'violet', label: 'Violet' },
  { value: 'coral', label: 'Corail' },
  { value: 'amber', label: 'Ambre' },
  { value: 'green', label: 'Vert' },
];

export const THEME_SKIN_OPTIONS: Array<{ value: ThemeSkin; label: string; description: string }> = [
  { value: 'lumen', label: 'Lumen', description: 'Style actuel de ProjectGrid' },
  { value: 'pulse', label: 'Pulse', description: 'Sombre et vif, inspiré des apps de messagerie' },
  { value: 'agora', label: 'Agora', description: 'Clair et feutré, mise en page type fil d’actualité' },
  { value: 'mosaic', label: 'Mosaic', description: 'Coloré et ludique, cartes à bordures épaisses' },
  { value: 'graphite', label: 'Graphite', description: 'Monochrome et sobre, angles nets, esprit professionnel' },
  { value: 'solstice', label: 'Solstice', description: 'Chaleureux et pastel, formes arrondies, ambiance détendue' },
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readStored(MODE_STORAGE_KEY, 'light') as ThemeMode);
  readonly accent = signal<ThemeAccent>(this.readStored(ACCENT_STORAGE_KEY, 'teal') as ThemeAccent);
  readonly highContrast = signal<boolean>(this.readStored(CONTRAST_STORAGE_KEY, '0') === '1');
  readonly skin = signal<ThemeSkin>(this.readStored(SKIN_STORAGE_KEY, 'lumen') as ThemeSkin);

  /** `true` tant que le système indique une préférence sombre (utilisé par le mode "Auto"). */
  private readonly systemPrefersDark = signal<boolean>(this.readSystemPrefersDark());

  /** Mode réellement appliqué (résout "auto" selon la préférence système). */
  readonly resolvedMode = computed<'light' | 'dark'>(() =>
    this.mode() === 'auto' ? (this.systemPrefersDark() ? 'dark' : 'light') : (this.mode() as 'light' | 'dark')
  );

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = (e: MediaQueryListEvent) => this.systemPrefersDark.set(e.matches);
      // addEventListener n'existe pas sur tous les anciens navigateurs : fallback silencieux.
      media.addEventListener?.('change', onChange);
    }

    effect(() =>
      this.applyToDocument(this.resolvedMode(), this.accent(), this.highContrast(), this.skin())
    );
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    this.writeStored(MODE_STORAGE_KEY, mode);
  }

  setAccent(accent: ThemeAccent): void {
    this.accent.set(accent);
    this.writeStored(ACCENT_STORAGE_KEY, accent);
  }

  setHighContrast(value: boolean): void {
    this.highContrast.set(value);
    this.writeStored(CONTRAST_STORAGE_KEY, value ? '1' : '0');
  }

  setSkin(skin: ThemeSkin): void {
    this.skin.set(skin);
    this.writeStored(SKIN_STORAGE_KEY, skin);
  }

  private applyToDocument(
    resolvedMode: 'light' | 'dark',
    accent: ThemeAccent,
    highContrast: boolean,
    skin: ThemeSkin,
  ): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedMode);
    root.setAttribute('data-accent', accent);
    root.setAttribute('data-skin', skin);
    root.classList.toggle('pg-contrast-high', highContrast);
  }

  private readSystemPrefersDark(): boolean {
    try {
      return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  }

  private readStored(key: string, fallback: string): string {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  private writeStored(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // stockage indisponible (navigation privée, quota…) : préférence active pour la session en cours seulement.
    }
  }
}
