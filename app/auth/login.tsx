import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/auth';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const { signIn, signInWithGoogle, signInWithDiscord } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      // Navigation will be handled by auth state change in _layout.tsx
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Login</ThemedText>
      
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
        
        <Button
          mode="contained"
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
          loading={loading}
        >
          Login with Email
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
          Login with Google
        </Button>
        
        <Button
          mode="outlined"
          style={styles.discordButton}
          icon="discord"
          onPress={handleDiscordLogin}
          disabled={discordLoading}
          loading={discordLoading}
        >
          Login with Discord
        </Button>
        
        <View style={styles.footer}>
          <ThemedText>Don&apos;t have an account? </ThemedText>
          <TouchableOpacity onPress={() => router.push('./register')}>
            <ThemedText style={styles.link}>Register</ThemedText>
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
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
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
