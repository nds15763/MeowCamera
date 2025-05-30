import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/auth';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const { signUp, updateProfile, signInWithGoogle, signInWithDiscord } = useAuth();

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      // Navigation will be handled by auth state change in _layout.tsx
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred during Google login');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    setDiscordLoading(true);
    try {
      const { error } = await signInWithDiscord();
      if (error) throw error;
      // Navigation will be handled by auth state change in _layout.tsx
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred during Discord login');
    } finally {
      setDiscordLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      // Sign up with email and password
      const { error } = await signUp(email, password);
      if (error) throw error;
      
      // If username is provided, we'll update the profile after email verification
      const message = username 
        ? 'Please check your email for verification instructions. Your username will be set after verification.'
        : 'Please check your email for verification instructions.';
      
      Alert.alert(
        'Registration Successful', 
        message,
        [{ text: 'OK', onPress: () => router.push('./login') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Register</ThemedText>
      
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          label="Email"
          left={<TextInput.Icon icon="email" />}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          mode="outlined"
        />
        
        <TextInput
          style={styles.input}
          label="Password"
          left={<TextInput.Icon icon="lock" />}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined"
        />
        
        <TextInput
          style={styles.input}
          label="Username (optional)"
          left={<TextInput.Icon icon="account" />}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          mode="outlined"
        />
        
        <Button
          mode="contained"
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
          loading={loading}
        >
          Register with Email
        </Button>
        
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>OR</ThemedText>
          <View style={styles.dividerLine} />
        </View>
        
        <Button
          mode="outlined"
          style={styles.googleButton}
          icon="google"
          onPress={handleGoogleLogin}
          disabled={googleLoading}
          loading={googleLoading}
        >
          Continue with Google
        </Button>
        
        <Button
          mode="outlined"
          style={styles.discordButton}
          icon="discord"
          onPress={handleDiscordLogin}
          disabled={discordLoading}
          loading={discordLoading}
        >
          Continue with Discord
        </Button>
        
        <View style={styles.footer}>
          <ThemedText>Already have an account? </ThemedText>
          <TouchableOpacity onPress={() => router.push('./login')}>
            <ThemedText style={styles.link}>Login</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#4630EB',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
  },
  googleButton: {
    marginTop: 10,
    paddingVertical: 8,
  },
  discordButton: {
    marginTop: 10,
    paddingVertical: 8,
    backgroundColor: '#5865F2',
    borderColor: '#5865F2',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  link: {
    color: '#4630EB',
    fontWeight: 'bold',
  },
});
