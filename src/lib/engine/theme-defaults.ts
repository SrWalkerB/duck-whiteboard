import type { FillStyle, Theme } from './types'

export interface ItemDefaults {
  strokeColor: string
  backgroundColor: string
  fillStyle: FillStyle
  strokeWidth: number
  roughness: number
  fontFamily: string
  fontSize: number
}

/** Content font — Kalam is a hand-printed face, so board text reads as drawn "à mão". */
export const CONTENT_FONT = "'Kalam', 'Fredoka', ui-rounded, system-ui, sans-serif"

export const INK_LIGHT = '#1f2430'
export const INK_DARK = '#e8e6e1'
const NEUTRAL_INKS = new Set([INK_LIGHT, INK_DARK])

/** The neutral "ink" default stroke for a theme (dark paper → light ink). */
export function defaultInk(theme: Theme): string {
  return theme === 'dark' ? INK_DARK : INK_LIGHT
}

/**
 * Display color for a stroke: user-chosen colors render as-is, but the neutral
 * ink follows the current theme — so a plain sketch stays legible after a theme
 * switch, while a red stays red in both themes.
 */
export function displayStroke(color: string, theme: Theme): string {
  return NEUTRAL_INKS.has(color) ? defaultInk(theme) : color
}

/**
 * Default styling for newly created elements. Only the neutral stroke adapts to
 * the theme; user-chosen colors are stored and rendered as-is (no inversion), so
 * a color you pick always looks exactly like what you picked.
 */
export function themeDefaults(theme: Theme): ItemDefaults {
  return {
    strokeColor: defaultInk(theme),
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 2,
    roughness: 1.1,
    fontFamily: CONTENT_FONT,
    fontSize: 20,
  }
}

/** Paper-like board background in the "Pond" palette. */
export function canvasBackground(theme: Theme): string {
  return theme === 'dark' ? '#12171a' : '#fbfaf7'
}

/** Dot-grid color (pond teal, low opacity). */
export function gridColor(theme: Theme): string {
  return theme === 'dark' ? 'rgba(52,195,207,0.14)' : 'rgba(14,124,134,0.14)'
}
