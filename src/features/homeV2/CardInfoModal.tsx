import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme';
import { Theme } from './tokens';
import { ink, inkSub } from '../soulSignals/tokens';

type Props = {
  visible: boolean;
  theme: Theme;
  title: string;
  body: string;
  onClose: () => void;
};

export function CardInfoModal({ visible, theme, title, body, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';

  // Match TendModal: bail when not visible so ModalHostView doesn't sit in
  // memory; reduces ShadowNode pressure when several cards each carry one.
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.fullScreen}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View
          style={[
            styles.sheetWrap,
            { paddingTop: insets.top + 120, paddingBottom: insets.bottom + 16 },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? '#0E0820' : '#FFFFFF',
                borderColor: isDark
                  ? 'rgba(255,255,255,0.10)'
                  : 'rgba(58,14,102,0.08)',
              },
            ]}
          >
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Feather
                name="x"
                size={20}
                color={isDark ? 'rgba(255,255,255,0.7)' : '#3A0E66'}
              />
            </Pressable>
            <ScrollView
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.title, { color: ink(theme) }]}>{title}</Text>
              <Text style={[styles.body, { color: inkSub(theme) }]}>{body}</Text>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrap: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
  },
  sheet: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    paddingTop: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  sheetContent: {
    paddingRight: 28,
  },
  title: {
    fontFamily: fonts.edensor.regular,
    fontSize: 22,
    lineHeight: 22 * 1.15,
    marginBottom: 14,
  },
  body: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 15 * 1.5,
  },
});
