/**
 * Client-side utility functions for message tagging
 */

// Predefined tags with their descriptive labels
export const TAG_DEFINITIONS: Record<string, string> = {
  housing: "Housing & Shelter",
  insurance: "Insurance Claims",
  documents: "Documents & Paperwork",
  funding: "Funding & Financial Aid",
  medical: "Medical & Health",
  recovery: "Recovery & Rebuilding",
  utilities: "Utilities",
  emergency: "Emergency"
};

/**
 * Parse tags from a comma-separated string
 * @param tagsString Comma-separated string of tags
 * @returns Array of tags
 */
export function parseTags(tagsString: string | null | undefined): string[] {
  if (!tagsString) return [];
  return tagsString.split(',').filter(tag => tag.trim().length > 0);
}

/**
 * Format tags as a comma-separated string for storage
 * @param tags Array of tags
 * @returns Comma-separated string of tags
 */
export function formatTags(tags: string[]): string {
  return tags.join(',');
}

/**
 * Get all available tags for the system
 * @returns Array of available tag options
 */
export function getAvailableTags(): string[] {
  return Object.keys(TAG_DEFINITIONS);
}

/**
 * Get the display label for a tag
 * @param tag Tag ID
 * @returns Human-readable label
 */
export function getTagLabel(tag: string): string {
  return TAG_DEFINITIONS[tag] || tag;
}