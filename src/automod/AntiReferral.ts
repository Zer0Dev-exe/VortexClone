export class AntiReferral {
  private static readonly REF_REGEX = /https?:\/\/\S+(?:\/ref\/|[?&#](?:ref|aff|referrer|referral)=)\S+/i;
  private static readonly SUSPICIOUS_DOMAINS = [
    'free-giftcards',
    'discord-nitro',
    'steam-gift',
    'steam-community'
  ];

  public static isReferralOrScam(content: string): boolean {
    if (this.REF_REGEX.test(content)) {
      return true;
    }

    const lower = content.toLowerCase();
    for (const domain of this.SUSPICIOUS_DOMAINS) {
      if (lower.includes(domain) && (lower.includes('http://') || lower.includes('https://'))) {
        return true;
      }
    }

    return false;
  }
}
