/**
 * CrisisResourcesSheet — so-h8eo
 *
 * Surfaces crisis resources synchronously attached to the POST /journal/ 201
 * response (be_core so-qyky CR-2). Renders the server-provided text with
 * tappable https:// URLs and known crisis numbers (988, 741741) so the user
 * can reach help without leaving the app.
 *
 * Safety design principles:
 *  - Never crash or throw — defensive parse on every field.
 *  - Links open silently; Linking errors are swallowed (no error toast that
 *    competes with the resources themselves).
 *  - Accessible: role=link on tappable spans; role=button on dismiss.
 */

import React, { useCallback } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme';

// ─── link parsing ────────────────────────────────────────────────────────────

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'link'; label: string; url: string };

/**
 * Parse a single text line into a sequence of plain-text and tappable-link
 * segments. Handles:
 *   - https:// URLs
 *   - The standalone digits "988"  → tel:988
 *   - The standalone digits "741741" → sms:741741?body=HOME
 * Trailing punctuation (. , ) ) is stripped from URLs to avoid broken links
 * from prose wrapping.
 */
function parseSegments(line: string): Segment[] {
  // Order matters: URL first so "https://...988..." isn't double-matched.
  const re = /(https?:\/\/[^\s,)\n]+)|\b(988)\b|\b(741741)\b/g;
  const segments: Segment[] = [];
  let cursor = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(line)) !== null) {
    if (m.index > cursor) {
      segments.push({ kind: 'text', value: line.slice(cursor, m.index) });
    }

    if (m[1]) {
      // Raw URL — strip trailing punctuation that isn't part of the link.
      const raw = m[1].replace(/[.,)]+$/, '');
      segments.push({ kind: 'link', label: raw, url: raw });
    } else if (m[2]) {
      // 988 — US/CA suicide + crisis lifeline; call or text.
      segments.push({ kind: 'link', label: '988', url: 'tel:988' });
    } else if (m[3]) {
      // 741741 — Crisis Text Line; HOME is the standard start keyword.
      segments.push({ kind: 'link', label: '741741', url: 'sms:741741?body=HOME' });
    }

    cursor = m.index + m[0].length;
  }

  if (cursor < line.length) {
    segments.push({ kind: 'text', value: line.slice(cursor) });
  }

  return segments;
}

// ─── component ───────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  /** Raw string from crisis_resources on the 201 response. */
  text: string;
  onClose: () => void;
};

export function CrisisResourcesSheet({ visible, text, onClose }: Props) {
  const insets = useSafeAreaInsets();

  const openLink = useCallback((url: string) => {
    // Swallow Linking errors — a failed link open must never interfere with
    // the safety content display.
    Linking.openURL(url).catch(() => {});
  }, []);

  if (!visible) return null;

  // Split the full text into lines for rendering. Blank lines become spacers.
  const lines = text.split('\n');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Feather name="heart" size={20} color="#B89CE0" />
              <Text style={styles.headerTitle}>You are not alone</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Dismiss crisis resources"
              style={styles.closeBtn}
            >
              <Feather name="x" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {lines.map((line, lineIdx) => {
              if (!line.trim()) {
                return <View key={lineIdx} style={styles.lineGap} />;
              }

              const segments = parseSegments(line);

              return (
                <Text key={lineIdx} style={styles.line}>
                  {segments.map((seg, segIdx) => {
                    if (seg.kind === 'text') {
                      return (
                        <Text key={segIdx} style={styles.bodyText}>
                          {seg.value}
                        </Text>
                      );
                    }
                    return (
                      <Text
                        key={segIdx}
                        style={styles.linkText}
                        onPress={() => openLink(seg.url)}
                        accessibilityRole="link"
                        accessibilityLabel={seg.label}
                      >
                        {seg.label}
                      </Text>
                    );
                  })}
                </Text>
              );
            })}
          </ScrollView>

          {/* Footer CTA */}
          <Pressable
            onPress={onClose}
            style={styles.closeFooter}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeFooterText}>I've read this</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 2, 24, 0.88)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#110628',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(184,156,224,0.22)',
    maxHeight: '92%',
    paddingHorizontal: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: fonts.edensor.regular,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  lineGap: {
    height: 10,
  },
  line: {
    // Wrapping Text container — inline segments flow within it.
    flexShrink: 1,
  },
  bodyText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.65,
    color: 'rgba(255,255,255,0.82)',
  },
  linkText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    lineHeight: 14 * 1.65,
    color: '#B89CE0',
    textDecorationLine: 'underline',
  },
  closeFooter: {
    marginTop: 16,
    height: 50,
    backgroundColor: 'rgba(184,156,224,0.18)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(184,156,224,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeFooterText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
