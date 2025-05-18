import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface EmotionButtonProps {
  onPress: () => void;
  style?: object;
}

const EmotionButton: React.FC<EmotionButtonProps> = ({ onPress, style }) => {
  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={onPress}
    >
      <Text style={styles.emoji}>🐱</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6AC2', // Pink background similar to the image
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emoji: {
    fontSize: 30,
  },
});

export default EmotionButton;
