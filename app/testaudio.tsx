import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button, Card, Title, useTheme } from 'react-native-paper';
import { useAudioRecorder } from '@siteed/expo-audio-studio';
import MeowDetector, { MeowDetectorRef } from '../lib/meowDetector';
import { AudioFeatures } from '../types/audioTypes';

export default function TestAudioScreen() {
  // 状态管理
  const [isListening, setIsListening] = useState(false);
  const [detectionResult, setDetectionResult] = useState<string>('未检测');
  const [features, setFeatures] = useState<AudioFeatures | null>(null);
  
  // 音频可视化状态
  const [waveformData, setWaveformData] = useState<number[]>(Array(30).fill(0.1));
  const theme = useTheme();
  
  // 创建对MeowDetector的引用
  const detectorRef = useRef<MeowDetectorRef>(null);
  
  // 使用音频录制器钩子
  const { 
    startRecording, 
    stopRecording, 
    isRecording 
  } = useAudioRecorder();
  
  // 在组件卸载时清理资源
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording, stopRecording]);
  
  // 每隔一段时间模拟波形变化
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        // 模拟音量变化
        const baseAmplitude = 0.1 + Math.random() * 0.3;
        updateWaveform(baseAmplitude);
      }, 300);
      
      return () => clearInterval(interval);
    }
  }, [isRecording]);
  
  // 处理检测结果的回调
  const handleMeowDetected = (isMeow: boolean, audioFeatures?: AudioFeatures) => {
    console.log('检测结果:', isMeow ? '检测到猫叫' : '非猫叫声音');
    
    if (audioFeatures) {
      console.log('音频特征:', JSON.stringify(audioFeatures, null, 2));
      setFeatures(audioFeatures);
      
      // 如果有音频数据，更新波形图
      if (audioFeatures.amplitude) {
        const amplitude = audioFeatures.amplitude;
        updateWaveform(amplitude);
      }
    }
    
    setDetectionResult(isMeow ? '检测到猫叫!' : '检测到声音(非猫叫)');
  };
  
  // 更新波形显示
  const updateWaveform = (baseAmplitude: number) => {
    // 基于当前振幅生成波形数据
    const newWaveformData = Array(30).fill(0).map(() => {
      // 振幅在当前基础上增加随机波动
      const randomVariation = Math.random() * 0.2 - 0.1;
      return Math.max(0.05, Math.min(1, baseAmplitude + randomVariation));
    });
    
    setWaveformData(newWaveformData);
  };
  
  // 开始/停止监听
  const toggleListening = async () => {
    if (isListening) {
      // 停止监听
      detectorRef.current?.stopListening();
      setIsListening(false);
      if (typeof stopRecording === 'function') {
        stopRecording();
      }
    } else {
      try {
        // 开始录音
        if (typeof startRecording === 'function') {
          // 使用空对象作为参数，让库使用默认值
          startRecording({});
        }
        // 开始监听
        await detectorRef.current?.startListening();
        setIsListening(true);
      } catch (error) {
        console.error('启动监听失败:', error);
      }
    }
  };
  
  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Title style={styles.title}>猫叫声检测测试</Title>
        
        {/* 监听状态和结果显示 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.statusText}>
              状态: {isListening ? '正在监听' : '未监听'}
            </Text>
            <Text style={[styles.resultText, 
              detectionResult.includes('猫叫') ? styles.meowDetected : null]}>
              结果: {detectionResult}
            </Text>
          </Card.Content>
        </Card>
        
        {/* 波形可视化 */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>实时波形</Title>
            <View style={styles.waveformContainer}>
              {waveformData.map((value, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.waveformBar,
                    { 
                      height: `${Math.max(5, value * 100)}%`,
                      backgroundColor: detectionResult.includes('猫叫') 
                        ? theme.colors.error 
                        : theme.colors.primary
                    }
                  ]}
                />
              ))}
            </View>
          </Card.Content>
        </Card>
        
        {/* 音频特征显示 */}
        {features && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>音频特征</Title>
              <View style={styles.featuresContainer}>
                <Text>音量(RMS): {features.amplitude?.toFixed(4)}</Text>
                <Text>频谱中心: {features.spectralCentroidMean?.toFixed(2)} Hz</Text>
                <Text>零交叉率: {features.zeroCrossingRateMean?.toFixed(4)}</Text>
                <Text>音高: {features.pitchMean?.toFixed(2)} Hz</Text>
              </View>
            </Card.Content>
          </Card>
        )}
        
        {/* 隐藏的MeowDetector实例 */}
        <MeowDetector
          ref={detectorRef}
          onMeowDetected={handleMeowDetected}
        />
        
        {/* 底部按钮 */}
        <Button
          mode="contained"
          style={styles.button}
          onPress={toggleListening}
        >
          {isListening ? '停止监听' : '开始监听'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    marginBottom: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  statusContainer: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: '100%',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 4,
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  meowDetected: {
    color: 'red',
  },
  featuresContainer: {
    marginTop: 8,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    padding: 4,
    marginTop: 8,
  },
  waveformBar: {
    width: 8,
    borderRadius: 2,
    backgroundColor: '#2196F3',
  },
  button: {
    marginVertical: 16,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
});
