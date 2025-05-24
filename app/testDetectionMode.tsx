import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MeowDetector, { MeowDetectorRef } from '../lib/meowDetector';
import { DetectionMode, MeowDetectorModule } from '../lib/meowDetectorModule';
import { AudioFeatures } from '../types/audioTypes';

export default function TestDetectionMode() {
  const [isListening, setIsListening] = useState(false);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>(DetectionMode.SIMPLE_AMPLITUDE);
  const [lastDetection, setLastDetection] = useState<{
    isMeow: boolean;
    features?: AudioFeatures;
    timestamp: number;
  } | null>(null);
  const [detectionHistory, setDetectionHistory] = useState<string[]>([]);
  
  const detectorRef = useRef<MeowDetectorRef>(null);

  // 切换检测模式
  const changeDetectionMode = (mode: DetectionMode) => {
    setDetectionMode(mode);
    
    // 获取检测器模块实例并设置模式
    const detectorModule = MeowDetectorModule.getInstance({
      audioProcessorConfig: {
        sampleRate: 44100,
        silenceThreshold: 0.02,
        minSilenceTime: 0.3,
        minProcessTime: 1.0,
        maxBufferTime: 5.0,
      }
    });
    detectorModule.setDetectionMode(mode);
    
    const modeNames: Record<DetectionMode, string> = {
      [DetectionMode.SIMPLE_AMPLITUDE]: '简单振幅',
      [DetectionMode.SMART_FILTER]: '智能过滤器',
      [DetectionMode.ADAPTIVE_THRESHOLD]: '自适应阈值',
      [DetectionMode.COMBINED_FILTER]: '组合过滤器',
      [DetectionMode.ADVANCED_FEATURES]: '高级特征'
    };
    
    addToHistory(`切换到${modeNames[mode]}检测模式`);
  };

  // 添加到历史记录
  const addToHistory = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDetectionHistory(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
  };

  // 开始/停止监听
  const toggleListening = async () => {
    if (!detectorRef.current) return;

    if (isListening) {
      detectorRef.current.stopListening();
      setIsListening(false);
      addToHistory('停止监听');
    } else {
      await detectorRef.current.startListening();
      setIsListening(true);
      addToHistory(`开始监听 (${detectionMode === DetectionMode.SIMPLE_AMPLITUDE ? '简单模式' : '高级模式'})`);
    }
  };

  // 处理猫叫检测
  const handleMeowDetected = (isMeow: boolean, features?: AudioFeatures) => {
    if (isMeow) {
      setLastDetection({
        isMeow,
        features,
        timestamp: Date.now()
      });
      
      const emotion = features?.pitchMean && features.pitchMean > 600 ? '紧张' : 
                     features?.pitchMean && features.pitchMean > 400 ? '呼唤' : '平静';
      
      addToHistory(`检测到猫叫！情感: ${emotion}, 音量: ${features?.amplitude?.toFixed(3)}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>猫叫检测模式测试</Text>
      </View>

      {/* 检测模式切换 */}
      <View style={styles.modeSection}>
        <Text style={styles.sectionTitle}>检测模式</Text>
        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              detectionMode === DetectionMode.SIMPLE_AMPLITUDE && styles.modeButtonActive
            ]}
            onPress={() => changeDetectionMode(DetectionMode.SIMPLE_AMPLITUDE)}
          >
            <Text style={[
              styles.modeButtonText,
              detectionMode === DetectionMode.SIMPLE_AMPLITUDE && styles.modeButtonTextActive
            ]}>简单振幅</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.modeButton,
              detectionMode === DetectionMode.SMART_FILTER && styles.modeButtonActive
            ]}
            onPress={() => changeDetectionMode(DetectionMode.SMART_FILTER)}
          >
            <Text style={[
              styles.modeButtonText,
              detectionMode === DetectionMode.SMART_FILTER && styles.modeButtonTextActive
            ]}>智能过滤</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.modeButton,
              detectionMode === DetectionMode.ADAPTIVE_THRESHOLD && styles.modeButtonActive
            ]}
            onPress={() => changeDetectionMode(DetectionMode.ADAPTIVE_THRESHOLD)}
          >
            <Text style={[
              styles.modeButtonText,
              detectionMode === DetectionMode.ADAPTIVE_THRESHOLD && styles.modeButtonTextActive
            ]}>自适应阈值</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.modeButton,
              detectionMode === DetectionMode.COMBINED_FILTER && styles.modeButtonActive
            ]}
            onPress={() => changeDetectionMode(DetectionMode.COMBINED_FILTER)}
          >
            <Text style={[
              styles.modeButtonText,
              detectionMode === DetectionMode.COMBINED_FILTER && styles.modeButtonTextActive
            ]}>组合过滤</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.modeDescription}>
          {detectionMode === DetectionMode.SIMPLE_AMPLITUDE && '简单模式：当声音振幅达到-30dBFS时触发'}
          {detectionMode === DetectionMode.SMART_FILTER && '智能过滤：考虑振幅变化、持续时间和频率特征'}
          {detectionMode === DetectionMode.ADAPTIVE_THRESHOLD && '自适应阈值：根据环境噪声动态调整检测阈值'}
          {detectionMode === DetectionMode.COMBINED_FILTER && '组合过滤：最严格的检测，同时使用多种过滤方案'}
        </Text>
      </View>

      {/* 控制按钮 */}
      <TouchableOpacity
        style={[styles.button, isListening ? styles.stopButton : styles.startButton]}
        onPress={toggleListening}
      >
        <Text style={styles.buttonText}>
          {isListening ? '停止监听' : '开始监听'}
        </Text>
      </TouchableOpacity>

      {/* 最新检测结果 */}
      {lastDetection && (
        <View style={styles.resultSection}>
          <Text style={styles.sectionTitle}>最新检测结果</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>检测到猫叫声！</Text>
            {lastDetection.features && (
              <>
                <Text style={styles.featureText}>
                  音量: {lastDetection.features.amplitude?.toFixed(3)}
                </Text>
                <Text style={styles.featureText}>
                  频谱中心: {lastDetection.features.spectralCentroidMean?.toFixed(0)} Hz
                </Text>
                <Text style={styles.featureText}>
                  音高: {lastDetection.features.pitchMean?.toFixed(0)} Hz
                </Text>
                <Text style={styles.featureText}>
                  录音质量: {((lastDetection.features.recordingQuality || 0) * 100).toFixed(0)}%
                </Text>
              </>
            )}
          </View>
        </View>
      )}

      {/* 检测历史 */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>检测历史</Text>
        {detectionHistory.length === 0 ? (
          <Text style={styles.emptyHistory}>暂无检测记录</Text>
        ) : (
          detectionHistory.map((item, index) => (
            <Text key={index} style={styles.historyItem}>{item}</Text>
          ))
        )}
      </View>

      {/* 隐藏的检测器组件 */}
      <MeowDetector
        ref={detectorRef}
        onMeowDetected={handleMeowDetected}
        showUI={false}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  modeSection: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  modeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modeText: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 10,
  },
  modeDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  button: {
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultSection: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultCard: {
    padding: 15,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    marginVertical: 2,
  },
  historySection: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 40,
  },
  emptyHistory: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  historyItem: {
    fontSize: 14,
    color: '#666',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  modeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
    marginVertical: 5,
    minWidth: 80,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#2196F3',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
