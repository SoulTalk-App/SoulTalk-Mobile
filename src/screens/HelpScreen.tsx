import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts, typography, useThemeColors } from '../theme';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { useTheme } from '../contexts/ThemeContext';
import JournalService from '../services/JournalService';

const BackButtonIcon = require('../../assets/images/settings/BackButtonIcon.png');

interface CrisisResource {
  id: string;
  country_code: string;
  country_name: string;
  resource_name: string;
  contact_type: string;
  contact_value: string;
  description: string;
  display_order: number;
}

const CONTACT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  call: 'call-outline',
  text: 'chatbubble-outline',
  call_text: 'chatbubbles-outline',
  web: 'globe-outline',
};

const HelpScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const [resources, setResources] = useState<CrisisResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    JournalService.getCrisisResources()
      .then((data) => {
        setResources(data.resources || []);
      })
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, []);

  const localResources = resources.filter((r) => r.country_code !== 'XX');
  const internationalResources = resources.filter((r) => r.country_code === 'XX');

  const handleContact = (resource: CrisisResource) => {
    const value = resource.contact_value;
    if (resource.contact_type === 'web') {
      const url = value.startsWith('http') ? value : `https://${value}`;
      Linking.openURL(url);
    } else if (resource.contact_type === 'text') {
      Linking.openURL(`sms:${value}`);
    } else {
      Linking.openURL(`tel:${value}`);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        // Shared layout
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          paddingHorizontal: 22,
          flexGrow: 1,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 20,
        },
        backButton: {
          marginRight: 12,
        },
        backIcon: {
          width: 36,
          height: 36,
        },
        loader: {
          marginTop: 60,
        },
        section: {
          marginBottom: 28,
        },
        resourceInfo: {
          flex: 1,
        },
        // Themed
        container: {
          flex: 1,
        },
        // Light path: page-bg ink for AA on the so-u1k lavender wash.
        headerTitle: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 24,
          lineHeight: 24 * 1.26,
          color: isDarkMode ? colors.white : colors.text.primary,
        },
        introText: {
          // bodyLarge per so-ci7 — read-heavy intro paragraph
          ...typography.bodyLarge,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(58, 14, 102, 0.85)',
          marginBottom: 24,
        },
        sectionTitle: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 18,
          color: isDarkMode ? colors.white : colors.text.primary,
          marginBottom: 12,
        },
        resourceCard: {
          flexDirection: 'row',
          alignItems: 'center',
          // Visual: glass surface alpha differs per mode
          backgroundColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(255, 255, 255, 0.10)',
          borderRadius: 14,
          padding: 16,
          marginBottom: 10,
          borderWidth: 1,
          // Dark uses a tinted purple border, light uses translucent white
          borderColor: isDarkMode ? 'rgba(155, 89, 182, 0.2)' : 'rgba(255, 255, 255, 0.18)',
        },
        resourceIconWrap: {
          width: 42,
          height: 42,
          borderRadius: 12,
          backgroundColor: isDarkMode
            ? 'rgba(77, 232, 212, 0.1)'
            : 'rgba(255, 255, 255, 0.22)',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 14,
        },
        resourceName: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 15,
          color: isDarkMode ? colors.white : colors.text.primary,
          marginBottom: 2,
        },
        resourceDesc: {
          fontFamily: fonts.outfit.regular,
          fontSize: 12,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(58, 14, 102, 0.7)',
          lineHeight: 17,
          marginBottom: 4,
        },
        resourceContact: {
          fontFamily: fonts.outfit.medium,
          fontSize: 13,
          // Dark = #4DE8D4 (= colors.primary in dark). Light original = '#7DF0FF' which has no
          // light palette equivalent (light accent.cyan is #5ECEFF). TODO: align light token.
          color: isDarkMode ? colors.primary : '#7DF0FF',
        },
        fallbackText: {
          // bodyLarge per so-ci7 — empty-state copy needs comfortable read
          ...typography.bodyLarge,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(58, 14, 102, 0.7)',
          textAlign: 'center',
          marginTop: 30,
        },
        disclaimer: {
          fontFamily: fonts.outfit.regular,
          // 11 → 12 per typography.caption floor (so-cn9 / so-8li)
          fontSize: 12,
          lineHeight: 16,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(58, 14, 102, 0.55)',
          textAlign: 'center',
          marginTop: 8,
        },
      }),
    [colors, isDarkMode],
  );

  const renderResource = (resource: CrisisResource) => {
    const iconName = CONTACT_ICONS[resource.contact_type] || 'help-circle-outline';

    return (
      <Pressable
        key={resource.id}
        style={styles.resourceCard}
        onPress={() => handleContact(resource)}
      >
        <View style={styles.resourceIconWrap}>
          <Ionicons
            name={iconName}
            size={22}
            color={isDarkMode ? colors.primary : colors.text.primary}
          />
        </View>
        <View style={styles.resourceInfo}>
          <Text style={styles.resourceName}>{resource.resource_name}</Text>
          <Text style={styles.resourceDesc}>{resource.description}</Text>
          <Text style={styles.resourceContact}>{resource.contact_value}</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          // TODO: light-mode chevron uses purple-tinted alpha (#59168B-derived); no palette key
          color={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(89,22,139,0.25)'}
        />
      </Pressable>
    );
  };

  return (
    <CosmicScreen tone="void">
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image source={BackButtonIcon} style={styles.backIcon} resizeMode="contain" />
          </Pressable>
          <Text style={styles.headerTitle}>Help</Text>
        </View>

        {/* Intro */}
        <Text style={styles.introText}>
          If you or someone you know is in crisis, please reach out to one of the resources below. You are not alone.
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={isDarkMode ? colors.primary : colors.text.primary}
            style={styles.loader}
          />
        ) : (
          <>
            {/* Local Resources */}
            {localResources.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {localResources[0].country_name || 'Your Region'}
                </Text>
                {localResources.map(renderResource)}
              </View>
            )}

            {/* International Resources */}
            {internationalResources.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>International</Text>
                {internationalResources.map(renderResource)}
              </View>
            )}

            {/* No resources fallback */}
            {resources.length === 0 && (
              <View style={styles.section}>
                <Text style={styles.fallbackText}>
                  If you are in immediate danger, please call your local emergency services.
                </Text>
              </View>
            )}

            {/* Contact SoulTalk */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact SoulTalk</Text>
              <Pressable
                style={styles.resourceCard}
                onPress={() => Linking.openURL('mailto:info@soultalkapp.com')}
              >
                <View style={styles.resourceIconWrap}>
                  <Ionicons
                    name="mail-outline"
                    size={22}
                    color={isDarkMode ? colors.primary : colors.text.primary}
                  />
                </View>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceName}>Email Support</Text>
                  <Text style={styles.resourceDesc}>
                    For questions, feedback, or account issues
                  </Text>
                  <Text style={styles.resourceContact}>info@soultalkapp.com</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  // TODO: light-mode chevron uses purple-tinted alpha (#59168B-derived); no palette key
                  color={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(89,22,139,0.25)'}
                />
              </Pressable>
            </View>

            {/* Disclaimer */}
            <Text style={styles.disclaimer}>
              SoulTalk is not a substitute for professional mental health care. If you are experiencing a mental health emergency, please contact your local emergency services or a crisis helpline immediately.
            </Text>
          </>
        )}
      </ScrollView>
      </View>
    </CosmicScreen>
  );
};

export default HelpScreen;
