import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const HomeScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    console.log('Logout button clicked');
    try {
      if (Platform.OS === 'web') {
        // Use browser confirm for web
        const confirmed = window.confirm('Are you sure you want to logout?');
        if (confirmed) {
          console.log('Logout confirmed, calling logout function');
          await logout();
          console.log('Logout completed successfully');
        }
      } else {
        // Use React Native Alert for mobile
        Alert.alert(
          'Logout',
          'Are you sure you want to logout?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Logout', 
              style: 'destructive', 
              onPress: async () => {
                console.log('Logout confirmed, calling logout function');
                try {
                  await logout();
                  console.log('Logout completed successfully');
                } catch (error) {
                  console.error('Logout error:', error);
                  Alert.alert('Error', 'Failed to logout properly');
                }
              }
            },
          ]
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
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
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  userInfo: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  verifiedText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  unverifiedText: {
    fontSize: 14,
    color: '#ffc107',
    fontWeight: '500',
  },
  groupsContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  groupsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  groupText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;