import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fonts } from '../../theme';
import { PURPLE, Theme } from './tokens';
import { CardInfoModal } from './CardInfoModal';

type Props = {
  theme: Theme;
  aspectRatio: number;
  label?: string;
  labelColor?: string;
  onPress?: () => void;
  info?: { title: string; body: string };
  children: React.ReactNode;
  style?: ViewStyle;
};

export function CardShell({
  theme,
  aspectRatio,
  label,
  labelColor,
  onPress,
  info,
  children,
  style,
}: Props) {
  const isDark = theme === 'dark';
  const [infoOpen, setInfoOpen] = useState(false);

  const Container: any = onPress ? Pressable : View;
  const containerProps = onPress ? { onPress, android_ripple: { color: 'rgba(255,255,255,0.08)' } } : {};

  return (
    <Container
      {...containerProps}
      style={[
        styles.shell,
        {
          aspectRatio,
          borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(58,14,102,0.08)',
          shadowColor: isDark ? '#000' : '#4F1786',
          shadowOpacity: isDark ? 0.35 : 0.10,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
      {label ? (
        <View
          style={[
            styles.chip,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.95)' : '#ffffff',
              borderColor: isDark ? 'transparent' : 'rgba(79,23,134,0.06)',
              borderWidth: isDark ? 0 : 1,
            },
          ]}
        >
          <Text style={[styles.chipText, { color: labelColor || PURPLE }]}>{label}</Text>
        </View>
      ) : null}
      {info ? (
        <>
          <Pressable
            onPress={() => setInfoOpen(true)}
            hitSlop={10}
            style={[
              styles.infoBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(0,0,0,0.35)'
                  : 'rgba(255,255,255,0.85)',
                borderColor: isDark
                  ? 'rgba(255,255,255,0.16)'
                  : 'rgba(58,14,102,0.10)',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`About ${info.title}`}
          >
            <Text
              style={[
                styles.infoBadgeText,
                { color: isDark ? 'rgba(255,255,255,0.78)' : PURPLE },
              ]}
            >
              i
            </Text>
          </Pressable>
          <CardInfoModal
            visible={infoOpen}
            onClose={() => setInfoOpen(false)}
            theme={theme}
            title={info.title}
            body={info.body}
          />
        </>
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },
  chip: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 11,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  infoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBadgeText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    lineHeight: 14,
  },
});
