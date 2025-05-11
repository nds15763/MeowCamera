import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/auth';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<{ email: string | null } | null>(null);

  useEffect(() => {
    if (user) {
      setUserData({ email: user.email || null });
    }
  }, [user]);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await signOut();
      if (error) throw error;
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred while signing out');
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color="#4630EB" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Profile</ThemedText>
      
      <View style={styles.infoContainer}>
        <ThemedText type="subtitle">Email</ThemedText>
        <ThemedText style={styles.infoText}>{userData.email}</ThemedText>
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleSignOut}
        disabled={loading}
      >
        <ThemedText style={styles.buttonText}>
          {loading ? 'Loading...' : 'Sign Out'}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoText: {
    marginTop: 5,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4630EB',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
