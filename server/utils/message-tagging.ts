/**
 * Utility functions for message tagging and auto-tagging
 */

// Predefined tags with keywords for auto-tagging
const TAG_KEYWORDS = {
  housing: [
    'housing', 'rent', 'mortgage', 'apartment', 'home', 'lease', 'eviction', 
    'landlord', 'tenant', 'property', 'shelter', 'residence', 'accommodation'
  ],
  insurance: [
    'insurance', 'policy', 'coverage', 'claim', 'premium', 'deductible', 
    'benefits', 'provider', 'reimbursement', 'adjuster', 'flood insurance'
  ],
  documents: [
    'document', 'paperwork', 'form', 'application', 'certificate', 'license', 
    'id', 'identification', 'birth certificate', 'passport', 'social security',
    'tax', 'deed', 'title'
  ],
  funding: [
    'funding', 'grant', 'financial assistance', 'money', 'loan', 'aid', 
    'payment', 'compensation', 'reimbursement', 'fema', 'sba', 'application'
  ],
  medical: [
    'medical', 'health', 'doctor', 'hospital', 'prescription', 'medication',
    'treatment', 'therapy', 'injury', 'illness', 'healthcare', 'appointment',
    'emergency'
  ],
  recovery: [
    'recovery', 'rebuild', 'restoration', 'repair', 'damage', 'contractor',
    'construction', 'assessment', 'inspection', 'cleanup', 'debris'
  ],
  utilities: [
    'utility', 'utilities', 'electricity', 'water', 'gas', 'power', 'bill',
    'service', 'outage', 'restoration', 'internet', 'phone'
  ],
  emergency: [
    'emergency', 'evacuation', 'shelter', 'urgent', 'immediate', 'crisis',
    'safety', 'danger', 'threat', 'warning', 'alert'
  ]
};

/**
 * Auto-tag a message based on its content
 * @param content The message content to analyze
 * @returns Array of auto-detected tags
 */
export function autoTagMessage(content: string): string[] {
  if (!content) return [];
  
  const lowercaseContent = content.toLowerCase();
  const detectedTags: string[] = [];
  
  // Check each tag's keywords against the content
  Object.entries(TAG_KEYWORDS).forEach(([tag, keywords]) => {
    // If any keyword is found in the content, add the tag
    if (keywords.some(keyword => lowercaseContent.includes(keyword.toLowerCase()))) {
      detectedTags.push(tag);
    }
  });
  
  return detectedTags;
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
 * Parse tags from a comma-separated string
 * @param tagsString Comma-separated string of tags
 * @returns Array of tags
 */
export function parseTags(tagsString: string | null | undefined): string[] {
  if (!tagsString) return [];
  return tagsString.split(',').filter(tag => tag.trim().length > 0);
}

/**
 * Get all available tags for the system
 * @returns Array of available tag options
 */
export function getAvailableTags(): string[] {
  return Object.keys(TAG_KEYWORDS);
}