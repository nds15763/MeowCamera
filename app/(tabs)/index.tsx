import EmotionButton from '@/components/EmotionButton';
import EmotionSelectorModal from '@/components/EmotionSelectorModal';
import { HelloWave } from '@/components/HelloWave';
import { LoginForm } from '@/components/LoginForm';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/auth';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  const { user } = useAuth();
  const [emotionModalVisible, setEmotionModalVisible] = useState(false);

  return (
    <ThemedView style={{ flex: 1 }}>
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
              <ThemedText type="subtitle">猫咪智能相机</ThemedText>
              <TouchableOpacity 
                style={[styles.cameraButton, { backgroundColor: '#E53935' }]}
                onPress={() => router.push('../MeowCameraScreen')}
              >
                <ThemedText style={styles.cameraButtonText}>启动猫咪相机</ThemedText>
              </TouchableOpacity>
            </ThemedView>

            <ThemedView style={styles.stepContainer}>
              <ThemedText type="subtitle">检测猫叫</ThemedText>
              <TouchableOpacity 
                style={[styles.cameraButton, { backgroundColor: '#E53935' }]}
                onPress={() => router.push('../testDetectionMode')}
              >
                <ThemedText style={styles.cameraButtonText}>检测猫叫</ThemedText>
              </TouchableOpacity>
            </ThemedView>
            
          </>
        )}
      </ParallaxScrollView>
      
      {/* Emotion Button and Modal */}
      <EmotionButton 
        style={styles.emotionButton} 
        onPress={() => setEmotionModalVisible(true)} 
      />
      <EmotionSelectorModal 
        visible={emotionModalVisible} 
        onClose={() => setEmotionModalVisible(false)} 
      />
    </ThemedView>
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
  emotionButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
  },
});
