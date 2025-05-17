/**
 * EmotionSelectorScreen
 * 
 * This screen demonstrates the EmotionSelector component in action.
 */

import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import EmotionSelector from '../components/EmotionSelector';

export default function EmotionSelectorScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cat Emotions</Text>
        <Text style={styles.subtitle}>Tap an emotion to hear cat sounds</Text>
      </View>
      
      <View style={styles.content}>
        {/* This space can be used for other content */}
      </View>
      
      {/* EmotionSelector takes up the bottom half of the screen */}
      <EmotionSelector />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  content: {
    flex: 1,
    // You can add content in this area
  },
});
