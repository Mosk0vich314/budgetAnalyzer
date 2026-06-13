// Shared presentation constants for categories.

/** Color keys (stored on Category.color) → CSS tile class suffix. */
export const TILE_COLORS = ['denim', 'turq', 'grey', 'orange'] as const
export type TileColor = (typeof TILE_COLORS)[number]

const TILE_CLASS: Record<string, string> = {
  denim: 'tile',
  turq: 'tile turq',
  grey: 'tile grey',
  orange: 'tile orange',
}

export function tileClass(color: string): string {
  return TILE_CLASS[color] ?? 'tile'
}

/** Quick-pick emojis offered when creating a category. */
export const EMOJI_CHOICES = [
  '🛒', '🍔', '🏠', '🚗', '⛽', '💡', '📱', '🎓',
  '🎬', '✈️', '💊', '🎁', '☕', '👕', '🐶', '🏷️',
]
