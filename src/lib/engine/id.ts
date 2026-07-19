import { nanoid } from 'nanoid'

/** A fresh element id. */
export const newId = (): string => nanoid()

/** A fresh rough.js seed (fixed per element so the hand-drawn look never shifts). */
export const newSeed = (): number => Math.floor(Math.random() * 2 ** 31)
