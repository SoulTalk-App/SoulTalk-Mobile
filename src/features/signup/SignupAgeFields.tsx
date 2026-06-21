// so-cbhq: signup age-gate form fields — a masked DOB input and a searchable
// country picker. Self-contained (own theme-aware styling via useThemeColors)
// so they drop into RegisterScreen without threading the screen's StyleSheet.
// Pure JS — no native date/country deps (worktree is edit-only).
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
import { Feather } from '@expo/vector-icons';
import { fonts, useThemeColors } from '../../theme';
import { maskDobInput } from '../../utils/ageGate';
import { COUNTRIES, countryNameForCode } from '../../data/countries';

const useFieldStyles = () => {
  const colors = useThemeColors();
  return useMemo(
    () =>
      StyleSheet.create({
        label: {
          fontFamily: fonts.outfit.medium,
          fontSize: 13,
          color: colors.text.secondary,
          marginBottom: 6,
        },
        input: {
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: colors.text.primary,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: colors.white,
        },
        inputFocused: { borderColor: colors.primary },
        pickerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: colors.white,
        },
        pickerText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: colors.text.primary,
        },
        pickerPlaceholder: { color: colors.text.light },
        error: {
          fontFamily: fonts.outfit.regular,
          fontSize: 12,
          color: '#E5484D',
          marginTop: 4,
        },
        // Modal
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
          color: colors.text.primary,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          marginHorizontal: 16,
          marginBottom: 8,
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
    [colors],
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
  return (
    <View>
      <Text style={styles.label}>Date of birth</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(maskDobInput(t))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="MM/DD/YYYY"
        placeholderTextColor={colors.text.light}
        keyboardType="number-pad"
        maxLength={10}
        style={[styles.input, focused && styles.inputFocused]}
        accessibilityLabel="Date of birth, month day year"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
      <Text style={styles.label}>Country</Text>
      <Pressable
        style={styles.pickerRow}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          selectedName ? `Country: ${selectedName}` : 'Select your country'
        }
      >
        <Text
          style={[styles.pickerText, !selectedName && styles.pickerPlaceholder]}
        >
          {selectedName ?? 'Select your country'}
        </Text>
        <Feather name="chevron-down" size={20} color={colors.text.light} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

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
              placeholderTextColor={colors.text.light}
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
