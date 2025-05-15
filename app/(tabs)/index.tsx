import { HelloWave } from '@/components/HelloWave';
import { LoginForm } from '@/components/LoginForm';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/auth';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      
      {!user ? (
        <LoginForm />
      ) : (
        <>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Welcome!</ThemedText>
            <HelloWave />
          </ThemedView>
          <ThemedView style={styles.stepContainer}>
            <ThemedText type="subtitle">Camera Demo</ThemedText>
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={() => router.push('../cameraScreen')}
            >
              <ThemedText style={styles.cameraButtonText}>Open Camera</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          
          <ThemedView style={styles.stepContainer}>
            <ThemedText type="subtitle">猫叫声检测测试</ThemedText>
            <TouchableOpacity 
              style={[styles.cameraButton, { backgroundColor: '#FF9800' }]}
              onPress={() => router.push('../testaudio')}
            >
              <ThemedText style={styles.cameraButtonText}>声音检测测试</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          
          <ThemedView style={styles.stepContainer}>
            <ThemedText type="subtitle">猫咪智能相机</ThemedText>
            <TouchableOpacity 
              style={[styles.cameraButton, { backgroundColor: '#E53935' }]}
              onPress={() => router.push('../MeowCameraScreen')}
            >
              <ThemedText style={styles.cameraButtonText}>启动猫咪相机</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  cameraButton: {
    backgroundColor: '#4630EB',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  cameraButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
