// so-ylps: extracted from HomeScreen.handleMoodChange so the sanitizer
// contract can be unit-tested without rendering Home. The sanitizer has
// been wrong twice (so-kt77 leaked digits, so-lkrr's inline comment
// claimed coverage it didn't have); pinning the contract in a test file
// catches the next regression at edit-time, not on the next user report.
//
// Allowlist rationale:
//   \p{L}                     — Unicode letters across all scripts
//                               (Latin w/ accents, Cyrillic, CJK, Hangul,
//                                Arabic, etc.) per so-v8w1.
//   \p{Extended_Pictographic} — base emoji glyphs (😊 ❤ 🌟 …). Covers the
//                               default-emoji-style set; the heart and
//                               other text-default chars rely on the
//                               trailing VS16 below to render emoji-style.
//   \p{Emoji_Modifier}        — skin-tone modifiers (🏻🏼🏽🏾🏿).
//   ‍                    — ZWJ joiner, required by family/profession
//                               sequences (👨‍👩‍👧‍👦, 🧑‍💻 …).
//   ️                    — VS16 variation selector; pins emoji-style
//                               rendering on dual-presentation chars (❤️).
//
// Documented strip behavior (NOT a bug — the one-word UX rule drops
// non-letter content; emoji are the explicit exception):
//   Spaces, digits, ASCII punctuation, control chars → DROPPED.
//   Regional indicator codepoints (U+1F1E6-U+1F1FF) are NOT in
//   Extended_Pictographic and we no longer admit Emoji_Component (so-lkrr
//   dropped it to plug the digit/keycap leak), so 🇺🇸-style FLAG emoji
//   ARE STRIPPED today. If product wants flags in mood words, the fix
//   is to add \p{Regional_Indicator} to the allowlist, NOT to re-admit
//   Emoji_Component (which would re-leak 0-9 # *).
const MOOD_ALLOWED = /[^\p{L}\p{Extended_Pictographic}\p{Emoji_Modifier}\u200D\uFE0F]/gu;

export function sanitizeMoodWord(text: string): string {
  return text.replace(MOOD_ALLOWED, '');
}
