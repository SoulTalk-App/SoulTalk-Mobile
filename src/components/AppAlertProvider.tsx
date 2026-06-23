/**
 * so-1zn0: AppAlertProvider + useAppAlert.
 *
 * Mounts the themed AppAlert at the App root and exposes an imperative
 * hook that mirrors the React Native `Alert.alert` API so call-site
 * migrations from `Alert.alert(title, message, buttons)` to
 * `showAlert({ title, message, buttons })` are largely mechanical.
 *
 * Public surface:
 *   showAlert(opts)  — present an alert; auto-dismisses on any button.
 *   showError(err)   — runs `err` through `normalizeError` and presents
 *                      an OK-only alert with a friendly message. Title
 *                      defaults to 'Something went wrong' so the alert
 *                      tone stays brand-neutral (callers can override
 *                      with `{ title }`).
 *   hideAlert()      — programmatic close (rarely needed; buttons close).
 *
 * Mount order: place <AppAlertProvider> as the first child of
 * <ThemeProvider> so the alert can read theme tokens, and inside that
 * wrap the rest of the providers + Navigation. The alert renders via
 * RN's <Modal>, so it sits above the navigator regardless of nesting.
 *
 * Public path: src/components/AppAlertProvider — so-hz61 (rn_features)
 * imports useAppAlert from this same module.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppAlert, AppAlertButton } from './AppAlert';
import { normalizeError } from '../utils/normalizeError';

export interface ShowAlertOptions {
  title?: string;
  message: string;
  buttons?: AppAlertButton[];
  dismissOnBackdrop?: boolean;
}

export interface ShowErrorOptions {
  title?: string;
  /** Override the OK button label (default 'OK'). */
  okLabel?: string;
  /** Optional click handler for the OK button. */
  onPress?: () => void;
}

interface AppAlertContextValue {
  showAlert: (opts: ShowAlertOptions) => void;
  showError: (err: unknown, opts?: ShowErrorOptions) => void;
  hideAlert: () => void;
}

const noop = () => {};

const AppAlertContext = createContext<AppAlertContextValue>({
  showAlert: noop,
  showError: noop,
  hideAlert: noop,
});

interface InternalAlertState {
  visible: boolean;
  title?: string;
  message: string;
  buttons?: AppAlertButton[];
  dismissOnBackdrop?: boolean;
}

const HIDDEN_STATE: InternalAlertState = {
  visible: false,
  message: '',
};

export const AppAlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<InternalAlertState>(HIDDEN_STATE);
  // Keep a ref so back-to-back showAlert calls (e.g. a screen mount that
  // throws synchronously) replace the current alert instead of racing
  // through stale React state.
  const stateRef = useRef<InternalAlertState>(HIDDEN_STATE);

  const showAlert = useCallback((opts: ShowAlertOptions) => {
    const next: InternalAlertState = {
      visible: true,
      title: opts.title,
      message: opts.message,
      buttons: opts.buttons,
      dismissOnBackdrop:
        opts.dismissOnBackdrop != null
          ? opts.dismissOnBackdrop
          : // Default: dismiss on backdrop UNLESS there's a destructive
            // button (don't let a backdrop tap fire a destructive default).
            !(opts.buttons ?? []).some((b) => b.style === 'destructive'),
    };
    stateRef.current = next;
    setState(next);
  }, []);

  const showError = useCallback(
    (err: unknown, opts?: ShowErrorOptions) => {
      const message = normalizeError(err);
      const title = opts?.title ?? 'Something went wrong';
      const okLabel = opts?.okLabel ?? 'OK';
      showAlert({
        title,
        message,
        buttons: [
          {
            text: okLabel,
            style: 'default',
            onPress: opts?.onPress,
          },
        ],
        dismissOnBackdrop: true,
      });
    },
    [showAlert],
  );

  const hideAlert = useCallback(() => {
    stateRef.current = HIDDEN_STATE;
    setState(HIDDEN_STATE);
  }, []);

  const ctx = useMemo<AppAlertContextValue>(
    () => ({ showAlert, showError, hideAlert }),
    [showAlert, showError, hideAlert],
  );

  return (
    <AppAlertContext.Provider value={ctx}>
      {children}
      <AppAlert
        visible={state.visible}
        title={state.title}
        message={state.message}
        buttons={state.buttons}
        dismissOnBackdrop={state.dismissOnBackdrop}
        onRequestClose={hideAlert}
      />
    </AppAlertContext.Provider>
  );
};

export const useAppAlert = (): AppAlertContextValue => useContext(AppAlertContext);

export default AppAlertProvider;
