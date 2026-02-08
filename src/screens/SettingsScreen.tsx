import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme';

const BackButtonIcon = require('../../assets/images/settings/BackButtonIcon.png');
const SoulTalkLogo = require('../../assets/images/settings/SoulTalkLogo.png');

const SettingsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user, logout, resetPassword } = useAuth();
  const [pushNotifications, setPushNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return local.slice(0, 2) + '********@' + domain;
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      Alert.alert('Password Reset', 'Please check your email for reset instructions.');
    } catch {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image source={BackButtonIcon} style={styles.backIcon} resizeMode="contain" />
          </Pressable>
          <Text style={styles.backText}>Back</Text>
        </View>

        {/* Signed in as */}
        <Text style={styles.signedInText}>
          Signed in as <Text style={styles.signedInBold}>{user?.first_name || 'User'}</Text>
        </Text>

        {/* Dashed separator */}
        <View style={styles.dashedLine} />

        {/* Username */}
        <Text style={styles.fieldMuted}>{user?.first_name?.toLowerCase() || 'user'}</Text>
        <View style={styles.separator} />

        {/* @username */}
        <Text style={styles.fieldMuted}>@{user?.first_name?.toLowerCase() || 'username'}</Text>
        <View style={styles.separator} />

        {/* User Email */}
        <Text style={styles.fieldWhite}>User Email</Text>
        <Text style={styles.fieldMuted}>{user?.email ? maskEmail(user.email) : 'No email'}</Text>
        <View style={styles.separator} />

        {/* Reset Password */}
        <Pressable onPress={handleResetPassword}>
          <Text style={styles.fieldWhite}>RESET PASSWORD</Text>
        </Pressable>

        {/* Bio */}
        <Text style={styles.fieldWhite}>Bio</Text>
        <View style={styles.separator} />

        {/* Pronouns */}
        <Text style={styles.pronounText}>He/Him</Text>
        <View style={styles.separator} />

        {/* Push Notification */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Push Notification</Text>
          <Switch
            value={pushNotifications}
            onValueChange={setPushNotifications}
            trackColor={{ false: 'rgba(255,255,255,0.3)', true: colors.accent.cyan }}
            thumbColor={colors.white}
            style={styles.toggle}
          />
        </View>

        {/* Dark/Light Mode */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Dark/Light Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: 'rgba(255,255,255,0.3)', true: colors.accent.cyan }}
            thumbColor={colors.white}
            style={styles.toggle}
          />
        </View>

        {/* Log Out */}
        <Pressable onPress={handleLogout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
        </Pressable>

        {/* Spacer */}
        <View style={{ flex: 1, minHeight: 80 }} />

        {/* Footer */}
        <View style={styles.footerLinks}>
          <Pressable>
            <Text style={styles.footerLink}>Terms & Privacy</Text>
          </Pressable>
          <Pressable>
            <Text style={styles.footerLink}>Help</Text>
          </Pressable>
        </View>
        <View style={styles.footerSeparator} />
        <View style={styles.logoContainer}>
          <Image source={SoulTalkLogo} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#59168B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    marginRight: 12,
  },
  backIcon: {
    width: 36,
    height: 36,
  },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    lineHeight: 24 * 1.26,
    color: colors.white,
  },

  // Signed in
  signedInText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 46,
    color: colors.white,
  },
  signedInBold: {
    fontFamily: fonts.outfit.semiBold,
  },

  // Dashed line
  dashedLine: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    marginBottom: 0,
  },

  // Fields
  fieldMuted: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 46,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  fieldWhite: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 46,
    color: colors.white,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: colors.white,
    marginRight: 0,
  },

  // Pronouns
  pronounText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    lineHeight: 46,
    color: colors.white,
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 46,
  },
  toggleLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 46,
    color: colors.white,
  },
  toggle: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
  },

  // Logout
  logoutText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 46,
    color: '#FF5E5E',
  },

  // Footer
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLink: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    lineHeight: 28,
    color: '#5ECFFF',
  },
  footerSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  logo: {
    width: 100,
    height: 22,
  },
});

export default SettingsScreen;
