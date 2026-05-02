# Typography & Accessibility Audit — 2026-05-02

**Audit target:** `agent/soultalk_rn_features` post-so-cn9 (cea67b2). Token state: `body`/`bodySmall` regular, `caption` medium, `subheading` regular, `subheadingSmall` light, light `inkFaint` bumped 0.5→0.65 (4.84:1 on lavender wash).

**Method:** static-grep + targeted file inspection. Contrast estimates are alpha-blends against the worst-case rendered backdrop (light = `#F5F0FB` lavender wash; dark = `#0F0828` night / `#231237` dawn). Liberal flagging per bead direction.

**Severity guide:**
- **P1** = fails AA body 4.5:1, < 12pt anywhere, illegible weight (Outfit thin/extraLight on body), or hardcoded color that breaks a theme entirely
- **P2** = token bypass (hardcoded ink that happens to pass), light-only weight (300) on borderline-readable copy, fontSize literal where a token would do, mild contrast borderline (4.5–5.0:1)
- **P3** = stylistic / consistency (e.g., Edensor on subheading where Outfit would scan better)

---

## Summary

- **Files scanned:** 27 screens + 32 feature components = 59 files
- **Violations flagged:** ~210 across all files (rough; line-noise-style hardcodes counted once per file)
  - **P1:** ~45 (illegible weight on cosmic, < 10pt sizes, hardcoded `#fff` text on light path)
  - **P2:** ~140 (hardcoded `#59168B` / `#3A0E66` / `'#FFFFFF'` instead of `ink(theme)`, fontSize literals)
  - **P3:** ~25 (Edensor light italic on body that's borderline)
- **Files clean:** SplashScreen, LoadingScreen, TransitionSplashScreen, WelcomeScreen, LoginScreen, SoulShiftsScreen, SoulSignalsScreen, SoulSightDetailScreen (thin shell screens); Theme tokens/PageBg/StarsBg/HeroOrb/SoulPalAnimated (no text or token-clean)
- **Largest offenders:** `ProfileScreen.tsx` (~25), `PersonalityResultScreen.tsx` (~25), `HomeScreen.tsx` (~15), `JournalEntryScreen.tsx` (~12), `PersonalityIntroScreen.tsx` (~10)

---

## Per-screen findings

### AffirmationMirrorScreen.tsx

**OK:**
- L129 `affirmationText`: dynamic 22–42 sized white on cosmic mirror video (full ink) ✓
- L168 `revealButtonText`: Edensor semiBold 22 — title-sized, fine ✓

**Violations:**
- L142 `revealButtonGradient` placeholder Light path token: `fontFamily: fonts.outfit.light` → on a 22pt button, light 300 reads borderline on white-ish glow disc. **P2**

---

### ChangePasswordScreen.tsx

(Static-styles, uses module-level `colors` import — does not theme-fork at all. Also flagged in so-iao handoff as out-of-scope from that bead.)

**Violations:**
- L245 `inputContainer` bg: `colors.white` literal — same hardcoded-white-on-cosmic pattern as the so-iao fixes. **P1** (light inputs render fine; dark is bright white blob).
- L268 `errorText` color: `'#FF6B6B'` hardcoded — works on both bgs as red but not via token. **P2**
- L273 `submitButton` bg: `colors.white`, `submitButtonText` color: `colors.primary` — same brand CTA pill pattern as other auth screens; only flag is the bg static while the rest of the screen is. **P2**
- L221, L228 `title`/`subtitle`: `color: colors.white` — static; on light cosmic atmosphere (`tone="night"`-ish), white is invisible. Verify which CosmicScreen tone wraps this. **P1** if rendered on light theme.

**Recommendation:** convert to `useThemeColors()` + `useTheme()`, plumb `isDark` into a `buildStyles(colors, isDark)` mirror of LoginScreen/RegisterScreen.

---

### CreateJournalScreen.tsx

**OK:**
- L36 `topInputArea`: theme-token bg ✓

**Violations:**
- L45 dark `textInput`: `outfit.light` 16pt — should be `outfit.regular` per so-cn9 floor (long-form journal entry). **P2**
- L65 light `textInput`: `outfit.light` 16pt + `color: '#333333'` hardcoded — should be `colors.text.dark` token + `outfit.regular`. **P2**
- L197 `placeholderTextColor="rgba(255,255,255,0.25)"` — 0.25 alpha is below AA on dark cosmic (~3.0:1 estimated). Bump to 0.45. **P1**
- L248 `placeholderTextColor="rgba(51, 51, 51, 0.4)"` — 0.4 alpha grey on white = ~3.5:1, fails AA. **P1**

---

### ForgotPasswordScreen.tsx

**OK:** Inputs forked per so-iao (see L100–110).

**Violations:**
- L126 `errorText` color: `'#FF6B6B'` hardcoded — works as red but token-bypass. **P2**
- L59 title `fontFamily: fonts.edensor.bold` 28pt — title-sized, fine. ✓ (listed for completeness)
- L106 input `color: colors.text.dark` — theme-aware token ✓

---

### HelpScreen.tsx

**Violations:**
- L181 `fontSize: 11` on what's likely a label/caption — at 11pt this needs to be at least medium weight; check fontFamily. **P2**
- Otherwise clean (read-heavy doc — bodyLarge from typography.ts would suit it now).

**Recommendation:** consider replacing body text with `typography.bodyLarge` (17pt regular) added in so-cn9.

---

### HomeScreen.tsx (high-density, large)

**OK:**
- soulPalHex glow fork via `getSoulPalHex(colorId, isDark)` ✓
- soulBar gradient via theme tokens ✓

**Violations (P1):**
- L218 `fontSize: 10`, L261 `fontSize: 9`, L583 `fontSize: 10`, L626 `fontSize: 9` — sub-12pt sizes scattered in metadata/streak chips. ≤ 10pt is unreadable for non-decorative text. **P1**
- L147, L188, L217, L248, L268, L582 `color: '#FFFFFF'` hardcoded — light-mode HomeScreen renders these on cosmic lavender wash → pure white on lavender = ~1.4:1 contrast. **P1** for light theme.

**Violations (P2):**
- L303, L308, L668, L673 `fontSize: 11` — caption-tier; covered by `typography.caption` token if migrated.
- L512, L553, L613, L633 `color: '#3A0E66'` — should be `colors.text.primary` (light) / forked. Static.
- L698, L741, L796 `color: '#59168B'` — same hardcoded brand purple.
- L170, L263, L304, L309 `color: 'rgba(255, 255, 255, 0.78)'` — token-bypass (`inkSub` dark = 0.72), close enough to use the token.
- L535, L628, L669 `color: 'rgba(58, 14, 102, 0.7)'` — exactly `inkSub` light, just inlined.

**Recommendation:** large fix bead — token migration + size floor cleanup. Est 1.5–2h.

---

### JournalEntryScreen.tsx

(Forked per dark-then-light render branches.)

**Violations:**
- L46, L58 dark `aiText`/`aiLoadingText`: `outfit.light` 14–15pt — body-tier, should be `outfit.regular`. **P2**
- L62 `entryLabel`: `color: 'rgba(255,255,255,0.5)'` 14pt — 0.5 alpha is borderline (4.5:1 on dark night). **P2**
- L92 light `aiText`: `outfit.light` 14pt + `color: '#333333'` hardcoded — should be `outfit.regular` + token. **P2**
- L90, L97, L99, L102, L107 hardcoded `#59168B` (purple labels), L102 `#2E7D32` (green coping) — should be `colors.primary` / `colors.success` tokens. **P2**
- L105 `aiLoadingText` light: `color: '#888'` 13pt — light grey on white = ~3.5:1, **P1**.
- L51, L53 `color: 'rgba(255,255,255,0.8)'` / `rgba(77,232,212,0.7)` — token-bypass. **P2**

---

### JournalScreen.tsx

**OK:**
- soulPalHex glow forked via getSoulPalHex ✓ (so-5n8)
- Header tokens ✓

**Violations:**
- L135 `filterBadgeText` 10pt + `colors.white` — sub-12pt on a colored badge bg. Sub-12 is OK ONLY for badges/pills with strong bg contrast; verify pill bg has 3:1 vs text. **P2** (size; verify contrast on the badge bg color).
- L146 `fontSize: 11` — caption tier, pair with `typography.caption` (medium). **P2**
- L190 `aiLabel`: `fontSize: 10, color: 'rgba(76, 175, 80, 0.8)'` — green at 0.8 on dark cosmic ~5:1, OK; on light cosmic likely fails. Theme-fork. **P2**

---

### LoadingScreen.tsx
**Clean.** No text content; pure video bg + ActivityIndicator.

---

### LoginScreen.tsx
**Clean post-so-iao.** Inputs forked, text via `colors.text.*` tokens, CTA brand pattern. ✓

---

### OnboardingScreen.tsx

**OK:**
- Bottom nav arrows + bg forked per so-iao ✓
- Slide titles use Edensor semiBold at large sizes ✓

**Violations:**
- L158 `color: '#C47ADB'` — hardcoded lavender, no theme fork. **P2**
- L268 `fontFamily: fonts.outfit.light` — the slide subtitle uses light 300 at body size; on dark cosmic this is borderline. **P2**

---

### OTPVerificationScreen.tsx

**OK:** otpInput forked per so-iao.

**Violations:**
- L87 `errorText` color: `'#FF6B6B'` hardcoded — same pattern as Forgot/Reset. **P2**

---

### ProfileScreen.tsx (largest single offender — ~25 violations)

(Two render branches: dark `dk` and light `lt` styles. Many static hex.)

**Violations (P1):**
- L736, L838, L1119 `fontSize: 10` / `fontSize: 11` — sub-12pt across multiple metadata rows. **P1** for the 10pt entries.
- L989, L1010, L1055, L1061, L1087, L1109, L1114, L1142, L1187, L1237, L1301 — all `color: '#59168B'` hardcoded across the LIGHT branch. Should resolve via `colors.primary` (light). **P2** but high volume.
- L735, L1118 `fontFamily: fonts.outfit.light` — body-tier 10–11pt on light branch in cards. Light 300 at sub-body is the worst-case. **P1**.

**Violations (P2):**
- L583, L716, L737 `color: 'rgba(255,255,255,0.5)'` — token-bypass (inkFaint dark).
- L605, L625, L678, L704 `color: 'rgba(255,255,255,0.6/0.7/0.85/0.9)'` — closer to `inkSub`/`ink` tokens.
- L731 `color: 'rgba(167,139,250,0.9)'` — lavender accent, no token equivalent yet (could add). **P2**.
- L570–1298 many `fontFamily: fonts.edensor.bold` at sub-20pt — Edensor bold at 14–16pt is a typography rule violation per `feedback_typography_rule`. **P3** (per the rule, body-length italic Edensor specifically — bold may be allowed for short titles; verify line-by-line).

**Recommendation:** ProfileScreen is the single biggest cleanup. Worth a dedicated fix bead (~2–3h). Suggest splitting into "color tokens" sub-bead and "font sizes" sub-bead.

---

### RegisterScreen.tsx

**OK post-so-iao.** Inputs forked.

**Violations:**
- L230 `color: '#2196F3'` (Terms link) — hardcoded blue, should use `colors.accent.cyan` or a link token. **P2**

---

### ResetPasswordConfirmScreen.tsx

**OK post-so-iao.** Inputs forked.

**Violations:**
- L125 `errorText` color: `'#FF6B6B'` — same as Forgot/OTP. **P2**

---

### SettingsScreen.tsx

**OK post-so-tbe.** ink/inkSub/divider/dashedBorder forked.

**Violations:**
- L445 `fontSize: 11` (themeSegmentText), L493 `fontSize: 11` (separator-related caption) — caption-tier; consider `typography.caption` token. **P2** (low-priority since both are 12px-adjacent and forked).
- L615 `color: 'rgba(255,255,255,0.7)'` (modalOptionText) — modal sheet is opaque, alpha-on-opaque is fine, but token would be cleaner. **P2**

---

### SetupCompleteScreen.tsx

**Violations:**
- L38, L46 `fontFamily: fonts.outfit.light` — body-tier copy in light 300. **P2**.

---

### SoulPalNameScreen.tsx

**Violations:**
- L85 `fontFamily: fonts.outfit.light` — likely subtitle/intro copy. Light at body tier reads thin on dark cosmic. **P2**
- L267 `placeholderTextColor="rgba(255,255,255,0.45)"` — 0.45 alpha on dark cosmic = ~4.4:1, just below AA placeholder readability. Bump to 0.5. **P2**.

---

### SoulShiftsScreen.tsx
**Clean** (thin shell — composes feature components covered separately).

---

### SoulSightDetailScreen.tsx
**Clean** (thin shell — composes feature components covered separately).

---

### SoulSightScreen.tsx (canonical SoulSightList host)

**Violations (P1):**
- L594 `fontSize: 9` — sub-10pt anywhere is illegible. **P1**.
- L646 `color: '#FFFFFF'` — hardcoded; on light theme renders on lavender wash, ~1.4:1. **P1**.

**Violations (P2):**
- L623, L683, L690 `fontSize: 11` — caption-tier; use token. **P2**.
- L722, L745 `fontSize: 10` — caption-tier; bump to 11–12 with medium weight. **P2**.

---

### SoulSignalsScreen.tsx
**Clean** (thin shell).

---

### SplashScreen.tsx, LoadingScreen.tsx, TransitionSplashScreen.tsx, WelcomeScreen.tsx
**Clean** (no text or video-only / SoulTalkLoader passthrough).

---

### TermsScreen.tsx

**Violations:**
- L111 `fontFamily: fonts.outfit.light` — body-length policy text. Light 300 at body tier on cosmic atmosphere = readability complaint. **P1** (read-heavy screen).

**Recommendation:** TermsScreen is exactly the use case for the new `typography.bodyLarge` token. Migrate.

---

### WelcomeSplashScreen.tsx

**Violations:**
- L67 `welcomeToText` and L87 `soulTalkText` use `outfit.light` 48 / `edensor.regular` 56 — at display sizes light Edensor / Outfit are actually fine. ✓ on size; flagging the Outfit light only if the welcome text doesn't have full-ink color. Currently colors.text.primary forked → fine. ✓
- L237 `placeholderTextColor="#D3C5E1"` — pale lilac on white input, ~2.8:1 contrast. **P1**.

---

### personality/PersonalityHubScreen.tsx

**OK post-so-nvo.** Single-row header pattern + forked tokens.

**Violations:**
- L491 `fontSize: 8` — way below floor. **P1**.
- L486, L576, L588, L601 `fontSize: 11` — caption-tier; should use token. **P2**.
- L612, L617 `fontSize: 10` — caption-tier. **P2**.
- L619 `color: '#FFFFFF'` — hardcoded white in test card status pill (active state); should fork. **P2** (might be intentional on a colored gradient pill; verify).
- Edensor regular/italic used on body subtitles (L461, L515, L556) — italics on body length per `feedback_typography_rule` is OK at 16pt+0.2 letterSpacing, verify each. **P3**.

---

### personality/PersonalityIntroScreen.tsx

**Violations (P2 mostly, high volume):**
- L212, L251 `outfit.light` — body copy, raise to regular. **P2**.
- L232, L273 `color: '#FFFFFF'`; L304, L312 `color: '#3A0E66'`; L334–411 `color: '#59168B'` — all hardcoded, no fork. **P2** but ~10 hits.
- L215, L224, L254 `rgba(255,255,255,0.75/0.9/0.85)` — token-bypass. **P2**.
- L319 `rgba(58,14,102,0.85)` — should be `inkSub`-ish or fork. **P2**.

---

### personality/PersonalityQuestionScreen.tsx

**Violations (P2 high volume):**
- L399, L443, L460, L571 `color: '#FFFFFF'`; L488 `'#3A0E66'`; L520, L528, L567, L588 `'#59168B'` — hardcoded across both render branches. **P2** ~9 hits.
- L356, L361 `rgba(255,255,255,0.7)` and L390 `rgba(167,139,250,0.9)` — token-bypass. **P2**.
- L483 `rgba(58,14,102,0.85)` — same pattern. **P2**.

---

### personality/PersonalityResultScreen.tsx (second-largest offender — ~25 violations)

**Violations:**
- L502, L537, L589, L618, L625, L715, L838 `outfit.light` — body-tier light 300 on result-card description text. **P1** (read-heavy result).
- L491, L519, L534, L556, L598, L615, L651 `color: '#FFFFFF'`; L682, L704, L813 `'#3A0E66'`; L742–857 `'#59168B'` — ~17 hardcoded hex refs across the file. **P2** high volume.
- L483, L525 `rgba(167,139,250,0.9)` — lavender accent token-bypass. **P2**.
- L498–592 multiple `rgba(255,255,255,*)` text colors — all should be `inkSub`/`inkFaint` or `colors.text.*`. **P2**.

**Recommendation:** match ProfileScreen — split into color-token bead + light-weight bead.

---

## Feature components

### homeV2/

**OK:**
- ChargeUpGrid, MirrorCard, SoulSightsCard (post-so-arh), SoulShiftsCard, SoulSignalsCard, PersonalityCard — labels via CardShell label pill (theme-forked).

**Violations:**
- CardShell L84 `chipText fontSize: 11` — caption-tier; consider token. **P2**.
- PersonalityCard L244 `fontSize: 11` — same. **P2**.
- SoulShiftsCard L86 `fontSize: 11` — same. **P2**.
- SoulSignalsCard L114 `fontSize: 11` — same. **P2**.
- (All four are CardShell-style chips at 11pt; OK for a brand pill pattern but the audit flags them.)

---

### soulShifts/

**OK:** ShiftCard (post-so-c0o), ShiftsA (post-so-rlz), modals (post-so-y4p) all token-forked.

**Violations:**
- **ShiftCard** L235 `fontSize: 11`, L245 `fontSize: 10`, L270 `fontSize: 9`, L275 `fontSize: 11` — sub-12pt metadata. L270 `fontSize: 9` is **P1**.
- **ShiftsA** L236 `outfit.light`, L262 `fontSize: 11` — light 300 on caption. **P2**.
- **ShiftsDetailModal** L482 `outfit.light`, L423/473/500/547/569 fontSize 10–11 (multiple) — modal body dense with caption-tier copy. **P2**.
- **StageAdvance** L293 `outfit.light`, L269 `fontSize: 11`, L279/323/356 `color: '#FFFFFF'` — hardcoded white text on a tone-tinted celebration sheet; the sheet bg is opaque colored so contrast is fine, but token-bypass. **P2**.
- **TendModal/SnoozeModal/IntegratedModal/SuggestModal** — all use `fontSize: 10` / `11` for chips/labels (`P2`); CTA `color: '#FFFFFF'` on gradient pill (intentional, **P3** stylistic).
- **ReleaseModal** L184 `color: '#FFFFFF'` — gradient CTA, intentional. **P3**.
- **TendToast** L181 `fontSize: 11`, L155 `color: '#FFFFFF'` — toast pill on opaque tone, fine but token-bypass. **P2**.

---

### soulSightsB/

**OK:** PageBg, StarsBg, HeroOrb (decorative).

**Violations:**
- **LockedState** L142, L146 `fontSize: 11`; L167 `color: '#fff'` — locked-state hint copy in light path renders white-on-light bg. **P1** (verify CosmicScreen tone here).
- **ProcessingState** L176 `fontSize: 11` — caption. **P2**.
- **ReadingBody** L172, L225 `outfit.light`, L195 `fontSize: 11`, L245 `color: '#fff'` — body-length reading copy at light 300; the `#fff` likely on a tone-tinted card bg, intentional but static. **P2**.
- **SightsB** L193 `fontSize: 11` — chip caption. **P2**.

---

### soulSignals/

**OK:** PageBg, StarsBg.

**Violations:**
- **ListeningState** L219 `fontSize: 11` — caption. **P2**.
- **LockedState** L151, L155 `fontSize: 11`; L176 `color: '#fff'` — same pattern as soulSightsB LockedState. **P1** if the `#fff` lands on light bg.
- **PatternCard** L320 `outfit.light`, L270/276/332 `fontSize: 10`, L377 `fontSize: 9`, L392 `fontSize: 11` — dense card with multiple sub-12pt sizes. L377 `9` is **P1**.
- **ResonanceToast** L127 `color: '#FFFFFF'` — toast on tone bg, intentional. **P3**.
- **SignalsB** L157 `fontSize: 11` — eyebrow caption. **P2**.
- **SignalsDetailModal** L496 `outfit.light`, L444/505/519/541 multiple sub-12pt sizes. **P2**.
- **SignalsMuteModal** L265 `fontSize: 11`, L192 `color: '#FFFFFF'` (gradient CTA, intentional). **P2** + **P3**.
- **SignalsPatternModal** L302/359/401 `fontSize: 10`, L382 `fontSize: 11`. **P2**.
- **SignalsTurnToShiftModal** L351, L356, L387 `outfit.light`; L309/315/345 `fontSize: 10`, L388 `fontSize: 11`; L404 `color: '#FFFFFF'`. **P2** high volume.

---

## Cross-cutting findings

### Hardcoded `#FFFFFF` / `#fff` text on tone-tinted CTAs (~30 hits)
Pattern: gradient or tone-tinted button → white text. Intentional brand pattern, but should standardize on a single source: `colors.white` (theme-insensitive `'#FFFFFF'`) is fine, OR a dedicated `onPrimary` token. Currently mixed — some hex literals, some `colors.white`. **P3**.

### `color: '#59168B'` light-path purple (~22 hits across ProfileScreen + Personality* + JournalEntry)
Pattern: brand purple text on white card bg in light theme. Should resolve via `colors.primary` (light = `#4F1786`) or a dedicated `colors.accent.deepPurple`. The current `#59168B` differs from `colors.primary` (`#4F1786`) and `colors.text.primary` (`#4F1786`) — it's a separate purple. **P2** (visual mismatch — the canonical brand purple is `#4F1786`).

### `color: '#3A0E66'` ink-on-light hardcodes (~6 hits)
Equals `PURPLE_INK` from feature tokens. Should resolve via `ink(theme)` or `colors.text.primary`. **P2**.

### Sub-12pt sizes (~84 hits across the codebase)
Standard is 12pt floor for non-decorative. Many are 10–11pt label/caption/badge tier. Migrate to `typography.caption` (medium 12pt post-so-cn9) where applicable. **P2** mostly; **P1** for any < 10pt.

### `outfit.light` body copy (35 hits remaining post-so-cn9)
Token bypass — these screens import `fonts.outfit.light` directly instead of using `typography.subheadingSmall` or `typography.body`. Since `fonts` are still exported, the bypass continues working. Migrate to typography tokens. **P2**.

---

## Recommended follow-up beads (proposed)

Stack target: agent/soultalk_rn_features (cea67b2 + audit commit).

Per the bead's coordination note, all fix beads stack into the single mega-PR.

| Bead | Scope | Effort |
|------|-------|--------|
| **so-A** ProfileScreen color-token + size cleanup | ~25 hardcoded `#59168B`/`#3A0E66`/`rgba` → `colors.primary`/`ink`/`inkSub`; sub-12pt sizes → `typography.caption` (medium); Edensor.bold at sub-20pt → review per typography rule | 2–3h |
| **so-B** PersonalityResultScreen token migration | ~25 hardcoded hex; 7 `outfit.light` body → regular; verify result-card subheadings use Italiana tokens | 2h |
| **so-C** PersonalityIntroScreen + QuestionScreen token cleanup | ~20 hardcoded hex split across both; light/regular weight floor | 1.5h |
| **so-D** HomeScreen sub-12pt + hardcoded white sweep | L218/261/583/626 `9–10pt` → bump or remove; `#FFFFFF` text → token; `rgba` tokens → `inkSub`/`ink` | 1.5h |
| **so-E** JournalEntryScreen typography + token migration | L92/105 light path bg `#fff`/`#888` 13pt → token + AA bump; L107/L99 `#59168B` → `colors.primary`; `outfit.light` body → regular | 1h |
| **so-F** ChangePasswordScreen theme-fork (parity with so-iao) | Convert static styles to `buildStyles(colors, isDark)`; fork inputContainer + title + subtitle | 1h |
| **so-G** Modal CTAs + sub-12pt sweep across soulShifts/soulSignals modals | TendModal/SnoozeModal/IntegratedModal/SuggestModal/ReleaseModal/Mute/PatternModal/TurnToShift — sub-12pt chip/label sizes → token; CTA `'#FFFFFF'` → `colors.white` consistency | 1.5h |
| **so-H** Locked-state white text bug | soulSightsB/LockedState L167, soulSignals/LockedState L176 — `color: '#fff'` likely renders white-on-light. Verify CosmicScreen tone, theme-fork. | 30min |
| **so-I** Sub-9pt size bumps (P1 illegibility) | HomeScreen L261/626, PersonalityHub L491 (8pt), PatternCard L377, SoulSightScreen L594, ShiftCard L270 | 30min |
| **so-J** PlaceholderTextColor AA bumps | CreateJournalScreen L197 (0.25 → 0.45), L248 (0.4 grey-on-white → 0.55), SoulPalNameScreen L267 (0.45 → 0.5), WelcomeSplash L237 (`#D3C5E1` → token) | 30min |
| **so-K** Token consolidation pass (cross-cutting) | Hoist `ink`/`inkSub`/`inkFaint` into `theme/colors.ts` (currently 3 feature copies); add `colors.white` standardization for gradient CTAs; add `colors.accent.deepPurple` if `#59168B` is intentional brand | 1.5h (refactor) |
| **so-L** TermsScreen + HelpScreen typography upgrade | Migrate to `typography.bodyLarge` (17pt) added in so-cn9; verify long-form copy reads comfortably | 30min |

**Total estimated effort:** ~14–17h across 12 beads.

**Suggested sling order (highest-impact-first):**
1. **so-I** (illegibility P1, 30min) — fast wins
2. **so-J** (placeholder P1, 30min)
3. **so-H** (locked-state white-on-white P1, 30min)
4. **so-A** (Profile, biggest-volume single-screen)
5. **so-B** (PersonalityResult)
6. **so-D** (HomeScreen)
7. **so-E** (JournalEntry)
8. **so-F** (ChangePassword parity)
9. **so-C** (Personality Intro/Question)
10. **so-G** (modal sweep)
11. **so-L** (Terms/Help — bodyLarge migration)
12. **so-K** (token consolidation, optional refactor — leave for last so per-screen beads validate the new token names first)

---

## Out of scope (not addressed here)

- Edensor weights — governed by `feedback_typography_rule` memory; flagged a few cases per-screen (`P3`) but no bulk action.
- Image / icon contrast.
- Motion / animation accessibility (reduce-motion preferences).
- Voiceover / accessibilityLabel completeness.
- Touch-target size minimums (44×44).
- Color-only signaling (ColorBlind).

These warrant a separate accessibility audit if the lead wants the full WCAG 2.2 sweep.
