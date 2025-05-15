import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import AudioStatusIcon from './AudioStatusIcon';

type DynamicIslandProps = {
  isRecording: boolean;
  isMeowDetected: boolean;
  waveformData: number[];
  onPress?: () => void;
};

const DynamicIsland: React.FC<DynamicIslandProps> = ({
  isRecording,
  isMeowDetected,
  waveformData,
  onPress,
}) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [width] = useState(new Animated.Value(100));
  const [height] = useState(new Animated.Value(36));
  // 添加动画波形数据状态
  const [animatedWaveform, setAnimatedWaveform] = useState<number[]>(waveformData);

  // 处理状态变化的动画
  useEffect(() => {
    Animated.parallel([
      Animated.timing(width, {
        toValue: isExpanded ? 300 : 100,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(height, {
        toValue: isExpanded ? 120 : 36,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isExpanded, width, height]);

  // 根据录音状态自动展开/折叠
  useEffect(() => {
    setIsExpanded(isRecording);
    
    // 录音状态下每200ms更新波形动画
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      intervalId = setInterval(() => {
        // 生成随机波形数据
        const newWaveformData = Array(30).fill(0).map(() => {
          return Math.max(0.1, Math.min(0.9, Math.random()));
        });
        
        // 更新组件状态 - 仅用于动画效果
        setAnimatedWaveform([...newWaveformData]);
      }, 100);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRecording]);

  return (
    <TouchableOpacity 
      onPress={() => {
        setIsExpanded(!isExpanded);
        if (onPress) onPress();
      }}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.dynamicIsland,
          {
            width: width,
            height: height,
            backgroundColor: isMeowDetected 
              ? theme.colors.error 
              : isRecording 
                ? theme.colors.primary 
                : '#000',
          },
        ]}
      >
        {/* 收起状态 */}
        {!isExpanded && (
          <View style={styles.collapsedContent}>
            <AudioStatusIcon
              isRecording={isRecording}
              isMeowDetected={isMeowDetected}
              size={20}
              color="#fff"
            />
            <Text style={styles.statusText}>
              {isRecording ? 'Detecting...' : 'Idle'}
            </Text>
          </View>
        )}

        {/* 展开状态 */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <AudioStatusIcon
                  isRecording={isRecording}
                  isMeowDetected={isMeowDetected}
                  size={24}
                  color="#fff"
                />
              </View>
              <Text style={styles.headerText}>
                {isMeowDetected ? 'Detecting...' : 'Detecting...'}
              </Text>
            </View>

            {/* 波形可视化 */}
            <View style={styles.waveformContainer}>
              {animatedWaveform.map((value, index) => (
                <View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      height: Math.max(2, value * 50),
                      backgroundColor: '#fff',
                      opacity: value * 1.5, // 根据值调整透明度
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  dynamicIsland: {
    alignSelf: 'center',
    borderRadius: 25,
    top:20,
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12
  },
  expandedContent: {
    width: '100%',
    height: '100%',
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    marginRight: 10,
  },
  headerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 50,
    width: '100%',
  },
  waveformBar: {
    width: 3,
    borderRadius: 3,
    marginHorizontal: 1,
  },
});

export default DynamicIsland;
