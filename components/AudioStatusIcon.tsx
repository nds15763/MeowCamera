import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';

type AudioStatusIconProps = {
  isRecording: boolean;
  isMeowDetected: boolean;
  size?: number;
  color?: string;
};

/**
 * 自定义音频状态图标组件，用于替代 lucide-react-native 图标
 * 这个组件使用 Expo 内置的 MaterialIcons，不依赖 react-native-svg
 */
const AudioStatusIcon: React.FC<AudioStatusIconProps> = ({
  isRecording,
  isMeowDetected,
  size = 24,
  color = 'white',
}) => {
  // 如果检测到猫叫，显示一个特殊图标
  if (isMeowDetected) {
    return <MaterialIcons name="pets" size={size} color={color} />;
  }
  
  // 根据录音状态显示不同的图标
  return isRecording ? (
    <MaterialIcons name="mic" size={size} color={color} />
  ) : (
    <MaterialIcons name="mic-off" size={size} color={color} />
  );
};

export default AudioStatusIcon;
