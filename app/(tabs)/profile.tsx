import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

export default function ProfileScreen() {
  const { user, userProfile, signOut, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.username || '');
    }
  }, [userProfile]);

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

  const handleUpdateProfile = async () => {
    setUpdateLoading(true);
    try {
      const { error } = await updateProfile({ username });
      if (error) throw error;
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred while updating profile');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (!user || !userProfile) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color="#4630EB" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Profile</ThemedText>
      
      <View style={styles.avatarContainer}>
        <Image 
          source={require('@/assets/images/catavatar.png')} 
          style={styles.avatar}
        />
      </View>
      
      <View style={styles.infoContainer}>
        <ThemedText type="subtitle">Email</ThemedText>
        <ThemedText style={styles.infoText}>{user.email}</ThemedText>
        
        <View style={styles.usernameContainer}>
          <ThemedText type="subtitle">Username</ThemedText>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                mode="outlined"
                autoCapitalize="none"
              />
              <View style={styles.editButtons}>
                <Button 
                  mode="contained" 
                  onPress={handleUpdateProfile}
                  loading={updateLoading}
                  disabled={updateLoading}
                  style={styles.saveButton}
                >
                  Save
                </Button>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setIsEditing(false);
                    setUsername(userProfile.username || '');
                  }}
                  disabled={updateLoading}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.usernameRow}>
              <ThemedText style={styles.infoText}>
                {userProfile.username || 'Not set'}
              </ThemedText>
              <Button 
                mode="text" 
                onPress={() => setIsEditing(true)}
                style={styles.editButton}
              >
                Edit
              </Button>
            </View>
          )}
        </View>
      </View>
      
      <Button
        mode="contained"
        style={styles.button}
        onPress={handleSignOut}
        disabled={loading}
        loading={loading}
      >
        Sign Out
      </Button>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoText: {
    marginTop: 5,
    fontSize: 16,
  },
  usernameContainer: {
    marginTop: 15,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editContainer: {
    marginTop: 5,
  },
  input: {
    marginBottom: 10,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    flex: 1,
    marginRight: 5,
  },
  cancelButton: {
    flex: 1,
    marginLeft: 5,
  },
  editButton: {
    marginLeft: 10,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
