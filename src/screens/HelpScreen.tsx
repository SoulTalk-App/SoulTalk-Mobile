import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fonts, typography, useThemeColors } from '../theme';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { TOUCH_HITSLOP_SMALL } from '../components/touchPrimitives';
import { useTheme } from '../contexts/ThemeContext';
import JournalService from '../services/JournalService';


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

// so-nv2g: hardcoded international fallback list — SAFETY-CRITICAL.
// HelpScreen MUST always render real tappable hotline numbers even when
// fully offline, the API is down, or the user is unverified (401/403).
// This list is the floor; the server list only ENRICHES it (replaces
// this fallback when the fetch succeeds with ≥1 resource).
// Sources: IASP (https://www.iasp.info/resources/Crisis_Centres/),
// SAMHSA (988lifeline.org), Crisis Text Line, Samaritans, CAMH, Lifeline AU.
//
// so-u4hp: SAFE ORDER — universal options lead so ANY country sees actionable
// help first. IASP directory + local emergency number before country-specific lines.
const FALLBACK_CRISIS_RESOURCES: CrisisResource[] = [
  // UNIVERSAL — works from any country; always shown first.
  {
    id: 'fallback-iasp',
    country_code: 'XX',
    country_name: 'International',
    resource_name: 'Find a Helpline (IASP)',
    contact_type: 'web',
    contact_value: 'https://findahelpline.com/i/iasp',
    description: 'International directory of crisis centres (findahelpline.com)',
    display_order: 1,
  },
  {
    id: 'fallback-local-emergency',
    country_code: 'XX',
    country_name: 'International',
    resource_name: 'Local Emergency Services',
    contact_type: 'call',
    contact_value: '112',
    description: 'Call your local emergency number (112 / 911 / 000 / 999)',
    display_order: 2,
  },
  // Country-specific lines below.
  {
    id: 'fallback-uk-samaritans',
    country_code: 'XX',
    country_name: 'International',
    resource_name: 'Samaritans',
    contact_type: 'call',
    contact_value: '116123',
    description: 'Call 116 123 — free, 24/7 (UK & Ireland)',
    display_order: 3,
  },
  {
    id: 'fallback-us-988',
    country_code: 'XX',
    country_name: 'International',
    resource_name: 'US 988 Suicide & Crisis Lifeline',
    contact_type: 'call_text',
    contact_value: '988',
    description: 'Call or text 988 — free, 24/7 (United States)',
    display_order: 4,
  },
  {
    id: 'fallback-us-ctl',
    country_code: 'XX',
    country_name: 'International',
    resource_name: 'Crisis Text Line',
    contact_type: 'text',
    contact_value: '741741',
    description: 'Text HOME to 741741 — free, 24/7 (United States)',
    display_order: 5,
  },
  {
    id: 'fallback-ca-988',
    country_code: 'XX',
    country_name: 'International',
    resource_name: 'Canada Suicide Crisis Helpline',
    contact_type: 'call_text',
    contact_value: '988',
    description: 'Call or text 988 — free, 24/7 (Canada)',
    display_order: 6,
  },
  {
    id: 'fallback-au-lifeline',
    country_code: 'XX',
    country_name: 'International',
    resource_name: 'Lifeline Australia',
    contact_type: 'call',
    contact_value: '131114',
    description: 'Call 13 11 14 — free, 24/7 (Australia)',
    display_order: 7,
  },
];

const HelpScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  // so-u4hp: seed from prefetch cache if available → correct country data on
  // first paint, zero flash. Falls back to safe-ordered FALLBACK list on miss.
  // so-nv2g: never a spinner — always render something actionable immediately.
  const [resources, setResources] = useState<CrisisResource[]>(() => {
    const cached = JournalService.getCachedCrisisResources();
    return (cached?.resources?.length ? cached.resources : FALLBACK_CRISIS_RESOURCES) as CrisisResource[];
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // so-u4hp / so-nv2g: background refresh — fires on every mount to stay fresh
    // but only calls setResources when the data actually changes (avoids jank
    // when the cache is already current). On any error, leaves the cached or
    // fallback state in place — a person in crisis always sees tappable numbers.
    JournalService.getCrisisResources()
      .then((data) => {
        const serverList = (data.resources || []) as CrisisResource[];
        if (serverList.length > 0) {
          setResources((prev) => {
            // so-dorm: Set-based compare — order-independent so a server that
            // returns the same resources in a different order doesn't trigger
            // a spurious re-render and layout jump.
            const newIds = new Set(serverList.map((r) => r.id));
            const prevIds = new Set(prev.map((r) => r.id));
            if (newIds.size === prevIds.size && [...newIds].every((id) => prevIds.has(id))) {
              return prev;
            }
            return serverList;
          });
        }
      })
      .catch(() => {
        // Cache or fallback already showing — no action needed
      })
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
        // so-oecu: reduced to 20 so the longer "Mental Health and Safety
        // Resources" title wraps cleanly on SE-width screens.
        headerTitle: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 20,
          lineHeight: 20 * 1.28,
          color: isDarkMode ? colors.white : colors.text.primary,
          flex: 1,
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
          // so-u4hp: moved to top (under title) and made prominent — safety
          // banner must be readable at a glance, not a near-invisible footnote.
          fontFamily: fonts.outfit.medium,
          fontSize: 16,
          lineHeight: 22,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.92)' : colors.text.primary,
          textAlign: 'center',
          marginBottom: 20,
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
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={TOUCH_HITSLOP_SMALL}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather
              name="chevron-left"
              size={28}
              color={isDarkMode ? '#FFFFFF' : '#3A0E66'}
            />
          </Pressable>
          {/* so-oecu: renamed per client feedback #8 (Sam) — must clearly
              label this as the mental-health/safety resource surface. */}
          <Text style={styles.headerTitle}>Mental Health and Safety Resources</Text>
        </View>

        {/* so-u4hp: safety disclaimer at top — prominent banner, not a footnote */}
        <Text style={styles.disclaimer}>
          SoulTalk is not a substitute for professional mental health care. If you are experiencing a mental health emergency, please contact your local emergency services or a crisis helpline immediately.
        </Text>

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

            {/* No resources fallback — should not be reached since
                the fetch always falls back to FALLBACK_CRISIS_RESOURCES,
                but kept as a last safety net. */}
            {resources.length === 0 && (
              <View style={styles.section}>
                <Text style={styles.fallbackText}>
                  If you are in immediate danger, call your local emergency services.{'\n\n'}
                  US/Canada: call or text 988{'\n'}
                  UK: call 116 123 (Samaritans){'\n'}
                  Australia: call 13 11 14 (Lifeline){'\n'}
                  International: findahelpline.com
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

          </>
        )}
      </ScrollView>
      </View>
    </CosmicScreen>
  );
};

export default HelpScreen;
