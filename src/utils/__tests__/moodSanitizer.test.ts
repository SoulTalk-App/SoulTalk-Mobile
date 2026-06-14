import { sanitizeMoodWord } from '../moodSanitizer';

// so-ylps: contract pin for the mood-bar sanitizer. The regex has been
// edited three times (so-v8w1 went from /[^a-zA-Z]/ to \p{L}; so-kt77
// added emoji categories and accidentally re-admitted digits via
// \p{Emoji_Component}; so-lkrr removed \p{Emoji_Component} but dropped
// flag emoji coverage). Each row below is one of the cases the bead /
// reviewer called out — when this list changes, the contract is
// changing on purpose.

describe('sanitizeMoodWord', () => {
  describe('digits + ASCII punctuation strip', () => {
    it('strips a trailing digit', () => {
      expect(sanitizeMoodWord('day1')).toBe('day');
    });
    it('strips a leading hash', () => {
      expect(sanitizeMoodWord('#sad')).toBe('sad');
    });
    it('strips a leading hash + digit', () => {
      expect(sanitizeMoodWord('#1winner')).toBe('winner');
    });
    it('strips interleaved digits', () => {
      expect(sanitizeMoodWord('a1b2')).toBe('ab');
    });
    it('strips wrapping asterisks', () => {
      expect(sanitizeMoodWord('*test*')).toBe('test');
    });
  });

  describe('plain letters pass through', () => {
    it('keeps a single ASCII word', () => {
      expect(sanitizeMoodWord('happy')).toBe('happy');
    });
  });

  describe('emoji preservation', () => {
    it('keeps a single base emoji', () => {
      expect(sanitizeMoodWord('\u{1F60A}')).toBe('\u{1F60A}'); // 😊
    });
    it('keeps emoji appended to a word', () => {
      expect(sanitizeMoodWord('sad\u{1F622}')).toBe('sad\u{1F622}'); // sad😢
    });
    it('keeps ZWJ family sequence intact', () => {
      const family =
        '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}'; // family
      expect(sanitizeMoodWord(family)).toBe(family);
    });
    it('keeps a skin-tone modifier on a base emoji', () => {
      const thumbs = '\u{1F44D}\u{1F3FD}'; // 👍🏽
      expect(sanitizeMoodWord(thumbs)).toBe(thumbs);
    });
    it('keeps VS16-rendered text emoji (heart)', () => {
      const heart = '\u2764\uFE0F';
      expect(sanitizeMoodWord(heart)).toBe(heart);
    });
  });

  describe('documented strip — regional indicator flags', () => {
    // so-lkrr dropped \p{Emoji_Component} to plug the digit leak. Regional
    // indicators (U+1F1E6..U+1F1FF) are Emoji_Component=TRUE but
    // Extended_Pictographic=FALSE, so flag sequences are stripped today.
    // If product wants flags back, the fix is adding
    // \p{Regional_Indicator} to the allowlist — NOT re-admitting
    // \p{Emoji_Component} (that would re-leak 0-9 # *).
    it('strips a single regional indicator pair (US flag)', () => {
      const usFlag = '\u{1F1FA}\u{1F1F8}'; // 🇺🇸
      expect(sanitizeMoodWord(usFlag)).toBe('');
    });
  });
});
