// so-cbhq: signup age-gate form fields — a DOB picker and a searchable
// country picker.
//
// so-7jzs: restyled to match RegisterScreen's other fields — the dark, rounded,
// frosted inputContainer with a leading icon and placeholder-INSIDE (no
// label-above white boxes). Theme-aware via useThemeColors + useTheme.
//
// so-7yb8: DOB is now a native date-wheel (@react-native-community/datetimepicker)
// instead of a masked text input. The field face stays the themed inputContainer;
// tapping it opens the platform picker. 18+ logic is unchanged (parent derives
// DobParts from the chosen Date).
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fonts, useThemeColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDobDisplay } from '../../utils/ageGate';
import { COUNTRIES, countryNameForCode } from '../../data/countries';

// Wheel starts ~18 years back (a plausible adult DOB) when nothing is chosen.
const defaultPickerDate = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
};
const MIN_DOB = new Date(1900, 0, 1); // matches backend lower bound (so-8544)

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
        // so-yszc: FlatList must shrink within the sheet's maxHeight so it
        // doesn't overflow below the keyboard when the search input is focused.
        countryList: { flexShrink: 1 },
        // so-7yb8: iOS DOB spinner sheet header (Cancel / Done).
        pickerSheetHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingBottom: 4,
        },
        pickerSheetCancel: {
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: colors.text.secondary,
        },
        pickerSheetDone: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 16,
          color: colors.primary,
        },
      }),
    [colors, isDarkMode],
  );
};

interface DobProps {
  /** Selected date of birth, or null when not yet chosen. */
  value: Date | null;
  onChange: (d: Date) => void;
  error?: string | null;
}

export const DateOfBirthField: React.FC<DobProps> = ({ value, onChange, error }) => {
  const styles = useFieldStyles();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const [open, setOpen] = useState(false);
  // iOS shows an inline spinner inside a sheet with a Done button, so we stage
  // the in-progress value and only commit on Done. Android's dialog commits on
  // the onChange 'set' event directly.
  const [tempDate, setTempDate] = useState<Date>(value ?? defaultPickerDate());
  const today = new Date();

  const openPicker = () => {
    setTempDate(value ?? defaultPickerDate());
    setOpen(true);
  };

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === 'set' && date) onChange(date);
  };

  const accent = open ? colors.primary : colors.text.secondary;

  return (
    <View>
      <Pressable
        style={[styles.inputContainer, open && styles.inputContainerFocused]}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={
          value ? `Date of birth: ${formatDobDisplay(value)}` : 'Select your date of birth'
        }
      >
        <Ionicons name="calendar-outline" size={20} color={accent} style={styles.inputIcon} />
        <Text
          style={[styles.pickerText, !value && styles.pickerPlaceholder]}
          numberOfLines={1}
        >
          {value ? formatDobDisplay(value) : 'Date of birth'}
        </Text>
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Android: native dialog, commits on selection. */}
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          mode="date"
          display="default"
          value={value ?? defaultPickerDate()}
          maximumDate={today}
          minimumDate={MIN_DOB}
          onChange={onAndroidChange}
        />
      ) : null}

      {/* iOS: spinner inside a themed bottom sheet with Cancel/Done.
          so-yszc: KAV lifts the sheet if a keyboard ever appears (future-proof). */}
      {Platform.OS === 'ios' ? (
        <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
            <KeyboardAvoidingView behavior="padding">
              <Pressable style={styles.modalSheet} onPress={() => {}}>
                <View style={styles.pickerSheetHeader}>
                  <Pressable onPress={() => setOpen(false)} accessibilityRole="button">
                    <Text style={styles.pickerSheetCancel}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      onChange(tempDate);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.pickerSheetDone}>Done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  mode="date"
                  display="spinner"
                  value={tempDate}
                  maximumDate={today}
                  minimumDate={MIN_DOB}
                  themeVariant={isDarkMode ? 'dark' : 'light'}
                  onChange={(_e, date) => {
                    if (date) setTempDate(date);
                  }}
                />
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>
      ) : null}
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

      {/* so-yszc: KAV lifts the bottom sheet above the keyboard so the
          country suggestion list stays visible when the search input is focused. */}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                style={styles.countryList}
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
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
};
