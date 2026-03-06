# CLAUDE.md - SoulTalk Mobile

Focus on writing minimal code. Follow existing patterns. Use the theme system.

## Commands
- `npm start` - Start Expo dev server
- `npx expo start --clear` - Start with cleared cache
- `npx tsc --noEmit` - Type check
- `eas build --platform ios --profile production` - Production build
- `eas submit --platform ios` - Submit to TestFlight

## Architecture

React Native (Expo SDK 54) + TypeScript mobile app.

### File Structure
```
App.tsx                    # Root: fonts, providers (Auth > WebSocket > Navigation)
src/
├── services/
│   ├── AuthService.ts     # Singleton axios instance, all auth API calls, token storage, biometrics
│   └── JournalService.ts  # Singleton axios instance, journal/streak/soulbar/mood/transcription API calls
├── contexts/
│   ├── AuthContext.tsx     # useAuth() hook: user, isAuthenticated, login/register/logout/social/OTP/password
│   ├── JournalContext.tsx  # useJournal() hook: entries, streak, soulBar, CRUD, draft/finalize, WebSocket AI updates
│   └── WebSocketContext.tsx# useWS() hook: auto-connect on auth, subscribe to events, reconnect logic
├── screens/
│   ├── SplashScreen.tsx           # Animated logo on launch
│   ├── WelcomeScreen.tsx          # First-time "Get Started" screen
│   ├── OnboardingScreen.tsx       # 3 swipeable slides with animations (899 lines)
│   ├── TermsScreen.tsx            # T&C agreement
│   ├── TransitionSplashScreen.tsx # Visual transition between stacks
│   ├── LoginScreen.tsx            # Email/password login, social auth buttons, biometric
│   ├── RegisterScreen.tsx         # Registration with password strength, social auth
│   ├── OTPVerificationScreen.tsx  # 6-digit code input, countdown timer, resend
│   ├── ForgotPasswordScreen.tsx   # Email input for reset
│   ├── ResetPasswordConfirmScreen.tsx # New password after deep link
│   ├── WelcomeSplashScreen.tsx    # Post-login intro video/animation
│   ├── SoulPalNameScreen.tsx      # Name your SoulPal character
│   ├── SetupCompleteScreen.tsx    # Completion checkmark animation
│   ├── HomeScreen.tsx             # Main screen: SoulPal, chat, affirmations, goals (779 lines)
│   ├── JournalScreen.tsx          # Journal list: mood meter, filters, entry cards (639 lines)
│   ├── JournalEntryScreen.tsx     # Single entry detail view
│   ├── CreateJournalScreen.tsx    # Write entry: mood selector, text input, voice, auto-save, prompts
│   ├── ProfileScreen.tsx          # Avatar, stats (streak, entries, goals)
│   ├── SettingsScreen.tsx         # Profile editing, password, notifications, logout
│   ├── ChangePasswordScreen.tsx   # Current + new password form
│   └── LoadingScreen.tsx          # Simple loading indicator
├── components/
│   ├── AnimatedButton.tsx         # Press-scale button with Reanimated
│   ├── GhostIllustration.tsx      # SVG ghost character for auth screens
│   ├── SoulTalkLogo.tsx           # SVG logo component
│   ├── OnboardingSlide.tsx        # Single onboarding slide with animations
│   ├── LayeredCarouselImage.tsx   # Multi-layer parallax image component
│   ├── SoulTalkLoader.tsx         # App-wide loading indicator
│   ├── JournalLoader.tsx          # Journal-specific loading
│   ├── InspirationDropdown.tsx    # Collapsible prompt suggestions
│   ├── SaveAnimation.tsx          # Stars-to-checkmark overlay
│   ├── VoiceRecordingIndicator.tsx# Recording UI with waveform
│   └── WebStyleInjector.tsx       # Web platform CSS overrides
├── hooks/
│   ├── useAutoSave.ts             # 30s debounced draft saving
│   ├── useVoiceRecording.ts       # expo-audio recording + Whisper transcription
│   ├── useGoogleAuth.ts           # Google Sign-In hook
│   ├── useFacebookAuth.ts         # Facebook Login hook
│   └── useWebSocket.ts            # WebSocket connection hook
├── animations/
│   ├── hooks.ts                   # useFloatingAnimation, usePulseAnimation, useShakeAnimation, etc.
│   ├── constants.ts               # Spring configs, timing configs, durations
│   └── index.ts                   # Re-exports
├── theme/
│   ├── colors.ts                  # Color palette (primary #4F1786 deep purple)
│   ├── typography.ts              # Edensor (brand serif) + Outfit (UI sans-serif) text styles
│   └── index.ts                   # Re-exports
├── data/
│   └── journalMockData.ts         # Mock data (still referenced as fallback)
├── mocks/
│   └── content.ts                 # Mock affirmations, goals
└── utils/
    ├── SecureStorage.ts           # expo-secure-store wrapper (web: localStorage fallback)
    └── resetOnboarding.ts         # AsyncStorage clear utility
```

### Navigation (App.tsx)
Three conditional stacks based on auth + onboarding state:

1. **OnboardingStack** (first launch): Splash -> Welcome -> Onboarding -> Terms -> TransitionSplash -> WelcomeSplash -> SoulPalName -> SetupComplete -> Login/Register -> OTP
2. **AuthStack** (onboarding done, not logged in): Splash -> Welcome -> Login/Register -> OTP -> ForgotPassword -> ResetPasswordConfirm
3. **AppStack** (authenticated): Home, Profile, Journal, JournalEntry, CreateJournal, Settings, ChangePassword
   - Wrapped in `JournalProvider`
   - Home/Profile/Journal use fast-fade transitions (pill tab bar in screens)

**Deep linking**: `soultalk://reset-password/:token` -> ResetPasswordConfirmScreen

### Provider Hierarchy
```
GestureHandlerRootView > SafeAreaProvider > AuthProvider > WebSocketProvider > Navigation
```
AppStack wraps children in `JournalProvider`.

### Key Patterns
- **Services**: Singleton class instances exported as default, own axios instance with auth interceptor
- **Auth interceptor**: 401 -> queue requests, refresh token, retry all queued. If refresh fails -> clear tokens
- **Contexts**: React Context + custom hook (useAuth, useJournal, useWS)
- **Token storage**: expo-secure-store (SecureStorage wrapper)
- **Animations**: Reanimated 4.x hooks in `src/animations/hooks.ts`, spring-based
- **Styling**: Inline StyleSheet.create, theme colors/typography imported from `src/theme/`
- **Fonts**: Edensor (custom .otf serif) for brand/headings, Outfit (Google Font) for UI text
- **State keys**: `@soultalk_onboarding_complete`, `@soultalk_setup_complete` in AsyncStorage
- **Screen transitions**: Bottom slide-up for Login/Register, fast opacity fade for tab screens

### API Base URL
Configured via `app.config.js` -> `Constants.expoConfig.extra.apiConfig.baseUrl`
- Dev: set via `API_BASE_URL` env var (defaults to `https://soultalkapp.com/api`)
- Prod EAS: set in `eas.json` env -> `https://soultalkapp.com/api`

### Journal Flow
1. User taps "+" on JournalScreen or "I'm Feeling..." on HomeScreen -> CreateJournalScreen
2. Auto-save as draft every 30s (useAutoSave hook)
3. On submit: finalize draft (is_draft: false) -> triggers streak/SoulBar/AI on backend
4. WebSocket pushes `journal_ai_complete` event -> JournalContext updates entry in-place
5. If WebSocket missed, GET /{entry_id} re-triggers AI processing on backend

### Mood System
10 moods: Happy, Sad, Mad, Normal, Chill, Vibing, Lost, Tired, Sexy, Fire
Each has a color defined in JournalScreen's `moodColors` object.

### Key Dependencies
- expo ~54.0.0, react-native 0.81.5, react 19.1.0
- react-native-reanimated ~4.1.1, react-native-gesture-handler ~2.28.0
- @react-navigation/stack ^6.3.0
- axios ^1.5.0, expo-secure-store, expo-audio
- expo-local-authentication (biometrics)
