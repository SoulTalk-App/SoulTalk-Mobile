import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { fonts } from '../theme';

/**
 * so-ve7q: root ErrorBoundary around Navigation. Prior to this, any
 * render-time throw in any screen unmounted to a white screen with no
 * recovery on a production build — App.tsx had no boundary anywhere.
 *
 * Contract:
 * - Catches render/lifecycle errors in the child tree.
 * - Surfaces a minimal recovery UI with a "Try again" affordance that
 *   resets boundary state, remounting the child tree.
 * - Optional onError hook for future telemetry (crash reporting): the
 *   parent passes a callback and we invoke it with the error + componentStack.
 *   Kept optional — no telemetry pipeline lives in the app yet, this is the
 *   seam where it will plug in.
 *
 * NOT caught (React's documented limitations): event handlers, async code,
 * server-side rendering, and errors thrown by the boundary itself. For those
 * the existing per-call-site try/catch + so-pw5d mountedRef pattern remains
 * the right tool.
 */

interface Props {
  children: ReactNode;
  /** Optional telemetry sink for crash reporting. Called once per caught
   *  error before the fallback UI is shown. Must not throw. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info });
    if (this.props.onError) {
      try {
        this.props.onError(error, info);
      } catch (telemetryErr) {
        // Never let a misbehaving telemetry sink mask the original crash.
        // eslint-disable-next-line no-console
        console.error('[ErrorBoundary] onError sink threw:', telemetryErr);
      }
    }
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ error: null, info: null });
  };

  render(): ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    // Minimal first-pass fallback — intentionally untextured/unstyled
    // beyond legibility. Visual design + theme-aware tokens can land in
    // a follow-up. Goal here is "don't ship a white screen."
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            SoulTalk hit an unexpected error. You can try again — if it keeps
            happening, please reopen the app.
          </Text>

          {__DEV__ && (
            <View style={styles.devBlock}>
              <Text style={styles.devLabel}>{error.name}: {error.message}</Text>
              {info?.componentStack ? (
                <Text style={styles.devStack}>{info.componentStack}</Text>
              ) : null}
            </View>
          )}

          <Pressable
            onPress={this.handleReset}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0E0A1E',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  // so-kima: add Outfit family (was missing, fell back to OS system font).
  title: {
    fontFamily: fonts.outfit.semiBold,
    color: '#FFFFFF',
    fontSize: 22,
    marginBottom: 12,
  },
  body: {
    fontFamily: fonts.outfit.regular,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 24,
  },
  devBlock: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  // Intentional monospace — dev-only stack trace display.
  devLabel: {
    color: '#FFB4B4',
    fontSize: 13,
    fontFamily: 'Courier',
    marginBottom: 8,
  },
  devStack: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontFamily: 'Courier',
    lineHeight: 14,
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  buttonPressed: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  buttonText: {
    fontFamily: fonts.outfit.semiBold,
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default ErrorBoundary;
