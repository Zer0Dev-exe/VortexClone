export class AntiCopypasta {
  // Regex that detects repeating patterns of at least 15 chars repeated 3 or more times
  private static readonly REPEAT_PATTERN = /(.{15,}?)\s*(?:\1\s*){2,}/is;

  public static isCopypasta(content: string): boolean {
    if (content.length < 60) return false;

    // Check for repetitive substring patterns
    if (this.REPEAT_PATTERN.test(content)) {
      return true;
    }

    // Check for character frequency distortion (e.g. 80% same character)
    const charCounts: Map<string, number> = new Map();
    for (const char of content.toLowerCase()) {
      if (/\s/.test(char)) continue;
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }

    const nonWhitespaceLength = content.replace(/\s+/g, '').length;
    if (nonWhitespaceLength >= 40) {
      for (const count of charCounts.values()) {
        if (count / nonWhitespaceLength > 0.6) {
          return true;
        }
      }
    }

    return false;
  }
}
