// so-cbhq: signup age-gate form fields — a masked DOB input and a searchable
// country picker. Pure JS — no native date/country deps (worktree is edit-only).
//
// so-7jzs: restyled to match RegisterScreen's other fields — the dark, rounded,
// frosted inputContainer with a leading icon and placeholder-INSIDE (no
// label-above white boxes). Theme-aware via useThemeColors + useTheme.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fonts, useThemeColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { maskDobInput } from '../../utils/ageGate';
import { COUNTRIES, countryNameForCode } from '../../data/countries';

const useFieldStyles = () => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        // Mirrors RegisterScreen.inputContainer (so-7jzs).
        inputContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : colors.border,
          borderRadius: 12,
          marginBottom: 16,
          paddingHorizontal: 12,
          height: 56,
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : colors.white,
        },
        inputContainerFocused: {
          borderColor: colors.primary,
          borderWidth: 2,
        },
        inputIcon: { marginRight: 12 },
        input: {
          flex: 1,
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: colors.text.dark,
        },
        // Country picker row reads as an input but shows selected/placeholder text.
        pickerText: {
          flex: 1,
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: colors.text.dark,
        },
        pickerPlaceholder: { color: colors.text.secondary },
        errorText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 12,
          color: colors.error,
          marginTop: -8,
          marginBottom: 8,
          marginLeft: 4,
        },
        // ── Country modal ──
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'flex-end',
        },
        modalSheet: {
          backgroundColor: colors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 12,
          maxHeight: '80%',
        },
        modalHandle: {
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          marginBottom: 12,
        },
        searchInput: {
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: colors.text.dark,
          borderWidth: 1.5,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          marginHorizontal: 16,
          marginBottom: 8,
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : colors.white,
        },
        countryRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
        },
        countryName: {
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: colors.text.primary,
          flex: 1,
        },
        countryCode: {
          fontFamily: fonts.outfit.medium,
          fontSize: 13,
          color: colors.text.light,
        },
        rowSep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
      }),
    [colors, isDarkMode],
  );
};

interface DobProps {
  /** Masked `MM/DD/YYYY` string. */
  value: string;
  onChange: (masked: string) => void;
  error?: string | null;
}

export const DateOfBirthField: React.FC<DobProps> = ({ value, onChange, error }) => {
  const styles = useFieldStyles();
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);
  const accent = focused ? colors.primary : colors.text.secondary;
  return (
    <View>
      <View style={[styles.inputContainer, focused && styles.inputContainerFocused]}>
        <Ionicons name="calendar-outline" size={20} color={accent} style={styles.inputIcon} />
        <TextInput
          value={value}
          onChangeText={(t) => onChange(maskDobInput(t))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Date of birth (MM/DD/YYYY)"
          placeholderTextColor={accent}
          keyboardType="number-pad"
          maxLength={10}
          style={styles.input}
          accessibilityLabel="Date of birth, month day year"
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

interface CountryProps {
  selectedCode: string | null;
  onSelect: (code: string) => void;
  error?: string | null;
}

export const CountryPickerField: React.FC<CountryProps> = ({
  selectedCode,
  onSelect,
  error,
}) => {
  const styles = useFieldStyles();
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [query]);

  const selectedName = countryNameForCode(selectedCode);

  return (
    <View>
      <Pressable
        style={[styles.inputContainer, open && styles.inputContainerFocused]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          selectedName ? `Country: ${selectedName}` : 'Select your country'
        }
      >
        <Ionicons
          name="earth-outline"
          size={20}
          color={open ? colors.primary : colors.text.secondary}
          style={styles.inputIcon}
        />
        <Text
          style={[styles.pickerText, !selectedName && styles.pickerPlaceholder]}
          numberOfLines={1}
        >
          {selectedName ?? 'Country'}
        </Text>
        <Feather name="chevron-down" size={20} color={colors.text.secondary} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          {/* No-op onPress absorbs taps on the sheet so they don't fall
              through to the overlay's close handler. */}
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search countries"
              placeholderTextColor={colors.text.secondary}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Search countries"
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.rowSep} />}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.countryRow}
                  onPress={() => {
                    onSelect(item.code);
                    setQuery('');
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected: item.code === selectedCode }}
                >
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryCode}>{item.code}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};
