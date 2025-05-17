/**
 * EmotionSelector Component
 * 
 * This component displays emotions in a tabbed interface with the following features:
 * 1. A half-screen list showing emotions organized by categories
 * 2. Three tabs based on emotionCategories (Friendly, Attention, Warning)
 * 3. Each tab displays the emotions for that category
 * 4. When an emotion is clicked, it randomly plays one of the audio files from that emotion
 */

import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import {
    AppState,
    AppStateStatus,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { emotionCategories, emotions } from '../config/emotions';
import { Emotion, EmotionCategory } from '../types/emotion';

const windowWidth = Dimensions.get('window').width;
const GRID_SPACING = 10;
const GRID_PADDING = 14;
const TOTAL_SPACING = (GRID_SPACING * 2) + (GRID_PADDING * 2);
const buttonWidth = (windowWidth - TOTAL_SPACING) / 3; // Ensures three buttons per row

export default function EmotionSelector() {
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EmotionCategory>(emotionCategories[0]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Initialize audio configuration
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };
    setupAudio();

    // Monitor app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup when component unmounts
    return () => {
      subscription.remove();
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  async function playSound(audioFile: any) {
    try {
      // If there's audio playing, stop and unload it first
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(audioFile, {
        shouldPlay: true,
        volume: 1.0,
      });

      // Monitor playback completion
      newSound.setOnPlaybackStatusUpdate(async (status: any) => {
        if (status.didJustFinish) {
          // Automatically unload when playback ends
          await newSound.unloadAsync();
          setSound(null);
        }
      });

      setSound(newSound);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/active/) && 
      (nextAppState === 'background' || nextAppState === 'inactive')
    ) {
      // App enters background, stop and unload audio
      if (sound) {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
          setSound(null);
        } catch (error) {
          console.error('Failed to stop audio:', error);
        }
      }
    }
    appState.current = nextAppState;
  };

  const handleEmotionSelect = (emotion: Emotion) => {
    setSelectedEmotion(emotion);
    if (emotion.audioFiles && emotion.audioFiles.length > 0) {
      // Randomly select an audio file to play
      const randomIndex = Math.floor(Math.random() * emotion.audioFiles.length);
      playSound(emotion.audioFiles[randomIndex]);
    }
  };

  const handleCategorySelect = (category: EmotionCategory) => {
    setSelectedCategory(category);
    setSelectedEmotion(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {emotionCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.tabButton,
              selectedCategory.id === category.id && styles.selectedTab,
            ]}
            onPress={() => handleCategorySelect(category)}
          >
            <Text style={[
              styles.tabTitle,
              selectedCategory.id === category.id && styles.selectedTabText
            ]}>
              {category.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.scrollViewContainer}>
        <ScrollView contentContainerStyle={styles.emotionsContainer}>
          <View style={styles.gridContainer}>
            {emotions
              .filter((emotion) => emotion.categoryId === selectedCategory.id)
              .map((emotion) => (
                <TouchableOpacity
                  key={emotion.id}
                  style={[
                    styles.emotionButton,
                    selectedEmotion?.id === emotion.id && styles.selectedEmotion,
                  ]}
                  onPress={() => handleEmotionSelect(emotion)}
                >
                  <View style={styles.emotionContent}>
                    <Text style={styles.emotionIcon}>{emotion.icon}</Text>
                    <Text style={[
                      styles.emotionTitle,
                      selectedEmotion?.id === emotion.id && styles.selectedEmotionText
                    ]}>
                      {emotion.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        </ScrollView>
      </View>
      
      {selectedEmotion && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>{selectedEmotion.description}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '50%', // Half-screen height
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: 'center',
  },
  selectedTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#EF7C8E',
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  selectedTabText: {
    color: '#EF7C8E',
  },
  scrollViewContainer: {
    flex: 1,
  },
  emotionsContainer: {
    flexGrow: 1,
    paddingVertical: 10,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_SPACING,
  },
  emotionButton: {
    width: (windowWidth - (GRID_PADDING * 2) - (GRID_SPACING * 2)) / 3, // Three buttons per row
    aspectRatio: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  emotionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedEmotion: {
    backgroundColor: '#EF7C8E',
    borderColor: '#EF7C8E',
    transform: [{ scale: 1.05 }],
  },
  emotionIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  emotionTitle: {
    color: '#333333',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedEmotionText: {
    color: '#FFFFFF',
  },
  descriptionContainer: {
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  descriptionText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555555',
  },
});
