import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { privacyPolicy, termsOfService } from "../mocks/content";
import { fonts, useThemeColors } from "../theme";
import { completeOnboarding } from "../utils/resetOnboarding";
import { SpringConfigs, TimingConfigs, AnimationValues } from "../animations/constants";
import { CosmicScreen } from "../components/CosmicBackdrop";

type LegalTab = 'privacy' | 'terms';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TermsScreenProps {
  navigation: any;
}

const TermsScreen: React.FC<TermsScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<LegalTab>('privacy');
  const scrollRef = useRef<ScrollView>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        header: {
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: 16,
        },
        backButton: {
          marginLeft: -4,
          marginBottom: 12,
          alignSelf: "flex-start",
        },
        backButtonCircle: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.white,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        },
        title: {
          fontFamily: fonts.edensor.bold,
          fontSize: 32,
          color: colors.text.dark,
          marginBottom: 4,
        },
        lastUpdated: {
          fontFamily: fonts.outfit.regular,
          fontSize: 14,
          color: colors.text.light,
          marginBottom: 12,
        },
        tabRow: {
          flexDirection: 'row',
          gap: 8,
        },
        tab: {
          flex: 1,
          paddingVertical: 10,
          borderRadius: 8,
          backgroundColor: colors.background,
          alignItems: 'center',
        },
        tabActive: {
          backgroundColor: colors.primary,
        },
        tabText: {
          fontFamily: fonts.outfit.medium,
          fontSize: 14,
          color: colors.text.light,
        },
        tabTextActive: {
          color: colors.white,
        },
        scrollContainer: {
          flex: 1,
          overflow: 'hidden',
        },
        scrollContent: {
          paddingHorizontal: 24,
          paddingBottom: 20,
        },
        content: {
          fontFamily: fonts.outfit.light,
          fontSize: 15,
          color: colors.text.primary,
          lineHeight: 24,
        },
        bottomContainer: {
          backgroundColor: colors.white,
        },
        separator: {
          height: 1,
          backgroundColor: colors.border,
        },
        buttonContainer: {
          paddingHorizontal: 24,
          paddingTop: 16,
        },
        agreementText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 12,
          color: colors.text.light,
          textAlign: "center",
          marginBottom: 16,
        },
        acceptButton: {
          backgroundColor: colors.primary,
          borderRadius: 10,
          height: 48,
          width: 319,
          alignSelf: 'center',
          justifyContent: "center",
          alignItems: "center",
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        acceptButtonText: {
          fontFamily: fonts.outfit.bold,
          fontSize: 18,
          color: colors.white,
        },
      }),
    [colors]
  );

  // Animation values
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(20);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(40);
  const buttonScale = useSharedValue(1);

  const backButtonScale = useSharedValue(1);

  useEffect(() => {
    // Staggered entrance animations
    headerOpacity.value = withDelay(100, withTiming(1, TimingConfigs.entrance));
    headerTranslateY.value = withDelay(100, withSpring(0, SpringConfigs.subtle));

    contentOpacity.value = withDelay(250, withTiming(1, TimingConfigs.entrance));
    contentTranslateY.value = withDelay(250, withSpring(0, SpringConfigs.subtle));

    buttonOpacity.value = withDelay(400, withTiming(1, TimingConfigs.entrance));
    buttonTranslateY.value = withDelay(400, withSpring(0, SpringConfigs.subtle));
  }, []);

  const handleTabSwitch = (tab: LegalTab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleBackPressIn = useCallback(() => {
    backButtonScale.value = withSpring(0.9, SpringConfigs.snappy);
  }, []);

  const handleBackPressOut = useCallback(() => {
    backButtonScale.value = withSpring(1, SpringConfigs.bouncy);
  }, []);

  const handleAccept = async () => {
    await AsyncStorage.setItem('@terms_accepted', 'true');
    await completeOnboarding();
    navigation.replace("Register");
  };

  const handleButtonPressIn = useCallback(() => {
    buttonScale.value = withSpring(AnimationValues.buttonPressScale, SpringConfigs.snappy);
  }, []);

  const handleButtonPressOut = useCallback(() => {
    buttonScale.value = withSpring(1, SpringConfigs.bouncy);
  }, []);

  // Animated styles
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const buttonContainerStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const backButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backButtonScale.value }],
  }));

  const currentDoc = activeTab === 'privacy' ? privacyPolicy : termsOfService;

  return (
    <CosmicScreen tone="void">
      <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, headerStyle]}>
        <AnimatedPressable
          style={[styles.backButton, backButtonStyle]}
          onPress={handleBack}
          onPressIn={handleBackPressIn}
          onPressOut={handleBackPressOut}
        >
          <View style={styles.backButtonCircle}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </View>
        </AnimatedPressable>
        <Text style={styles.title}>Terms and Privacy</Text>
        <Text style={styles.lastUpdated}>
          Effective: {currentDoc.effectiveDate}
        </Text>
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, activeTab === 'privacy' && styles.tabActive]}
            onPress={() => handleTabSwitch('privacy')}
          >
            <Text style={[styles.tabText, activeTab === 'privacy' && styles.tabTextActive]}>
              Privacy Policy
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'terms' && styles.tabActive]}
            onPress={() => handleTabSwitch('terms')}
          >
            <Text style={[styles.tabText, activeTab === 'terms' && styles.tabTextActive]}>
              Terms of Service
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View style={[styles.scrollContainer, contentStyle]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <Text style={styles.content}>{currentDoc.content}</Text>
        </ScrollView>
      </Animated.View>

      <Animated.View style={[styles.bottomContainer, buttonContainerStyle]}>
        <View style={styles.separator} />
        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.agreementText}>
            By tapping Accept, you agree to our Terms and Privacy Policy
          </Text>
          <AnimatedPressable
            style={[styles.acceptButton, buttonStyle]}
            onPress={handleAccept}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </AnimatedPressable>
        </View>
      </Animated.View>
      </View>
    </CosmicScreen>
  );
};

export default TermsScreen;
