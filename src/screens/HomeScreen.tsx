import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme';

const HomeScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome to SoulTalk!</Text>
        <Text style={styles.userInfo}>
          Hello, {user?.first_name} {user?.last_name}
        </Text>
        <Text style={styles.emailText}>{user?.email}</Text>
        {user?.email_verified ? (
          <Text style={styles.verifiedText}>✅ Email Verified</Text>
        ) : (
          <Text style={styles.unverifiedText}>⚠️ Email Not Verified</Text>
        )}
        
        {user?.groups && user.groups.length > 0 && (
          <View style={styles.groupsContainer}>
            <Text style={styles.groupsTitle}>Your Groups:</Text>
            {user.groups.map((group, index) => (
              <Text key={index} style={styles.groupText}>• {group}</Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.contentText}>
          Your SoulTalk journey begins here!
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 40,
  },
  welcomeText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 28,
    color: colors.primary,
    marginBottom: 16,
  },
  userInfo: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  emailText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  verifiedText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: '#28a745',
  },
  unverifiedText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: '#ffc107',
  },
  groupsContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  groupsTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.text.dark,
    marginBottom: 8,
  },
  groupText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    fontFamily: fonts.outfit.semiBold,
    color: colors.white,
    fontSize: 16,
  },
});

export default HomeScreen;