import { Audio } from 'expo-av';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AudioAnalysisResult, AudioFeatures, MeowDetectorState } from '../types/audioTypes';
import { MeowDetectorModule } from './meowDetectorModule';

// 导出猫叫检测器引用类型
export interface MeowDetectorRef {
  startListening: () => Promise<void>;
  stopListening: () => void;
  isListening: boolean;
  detectorState: MeowDetectorState;
}

interface MeowDetectorProps {
  // 检测到猫叫时的回调，返回是否是猫叫和音频特征
  onMeowDetected?: (isMeow: boolean, features?: AudioFeatures) => void;
  // 实时输出振幅数据，供UI动画使用
  //onAmplitudeUpdate?: (amplitudeData: number[]) => void;
  // 是否显示UI组件
  showUI?: boolean;
}

/**
 * 猫叫检测组件
 */
const MeowDetector = forwardRef<MeowDetectorRef, MeowDetectorProps>(({ 
  onMeowDetected,
  // onAmplitudeUpdate,
  showUI = false
}, ref) => {
  // 状态
  const [detectorState, setDetectorState] = useState<MeowDetectorState>(MeowDetectorState.Idle);
  const [isListening, setIsListening] = useState(false);
  
  // 猫叫检测器模块引用
  const detectorModuleRef = useRef<MeowDetectorModule | null>(null);
  
  // 停止监听音频
  const stopListening = () => {
    console.log('准备停止监听...');
    if (isListening && detectorModuleRef.current) {
      console.log('调用模块停止监听');
      detectorModuleRef.current.stopListening();
      setIsListening(false);
      setDetectorState(MeowDetectorState.Idle);
    } else {
      console.log('无需停止监听 isListening=', isListening);
    }
  };

  // 向父组件暴露方法
  useImperativeHandle(ref, () => ({
    startListening,
    stopListening,
    isListening,
    detectorState
  }), [isListening, detectorState]);
  
  // 初始化检测器模块
  useEffect(() => {
    console.log('初始化检测器模块...');
    // 使用单例模式获取检测器模块
    detectorModuleRef.current = MeowDetectorModule.getInstance({
      audioProcessorConfig: {
        sampleRate: 44100,
        silenceThreshold: 0.02,
        minSilenceTime: 0.3,
        minProcessTime: 1.0,
        maxBufferTime: 5.0,
      },
      onStateChange: (state: MeowDetectorState) => {
        console.log('检测器状态变更:', state);
        setDetectorState(state);
      },
      onMeowDetected: (result: AudioAnalysisResult) => {
        console.log('模块内部检测到猫叫:', result.isMeow);
        if (onMeowDetected) {
          onMeowDetected(result.isMeow, result.features);
        }
      },
      onError: (error: Error) => {
        //console.error('检测器错误:', error); TODO
      }
    });
    console.log('检测器模块初始化完成');

    return () => {
      // 清理资源
      console.log('组件卸载，清理资源');
      if (isListening) {
        stopListening();
      }
      // 单例模式下不需要置空，因为可能其他地方还在使用该实例
      // detectorModuleRef.current = null;
    };
  }, []); // 移除依赖项列表中的isListening和onMeowDetected，避免重复初始化

  // 开始监听音频
  const startListening = async () => {
    try {
      // 请求麦克风权限
      console.log('请求麦克风权限...');
      const permissionResponse = await Audio.requestPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        console.error('未获取到麦克风权限');
        return;
      }
      
      console.log('麦克风权限已获取，设置音频模式');
      // 设置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 1,
        shouldDuckAndroid: true,
        interruptionModeAndroid: 1,
        playThroughEarpieceAndroid: false,
      });
      
      // 更新状态
      setIsListening(true);
      setDetectorState(MeowDetectorState.Recording);
      
      // 使用检测器模块开始监听
      if (detectorModuleRef.current) {
        console.log('开始使用检测器模块监听...');
        
        // 定义单独的回调函数便于调试
        const meowCallback = (result: AudioAnalysisResult) => {
          console.log('检测到音频分析结果:', result.isMeow, Date.now());
          
          // 任何结果都回调，而不仅仅是猫叫
          if (onMeowDetected) {
            onMeowDetected(result.isMeow, result.features);
            if (result.isMeow) {
              setDetectorState(MeowDetectorState.Done);
            }
          }
        };
        
        // 启动监听
        detectorModuleRef.current.startListening(meowCallback);
      } else {
        console.error('检测器模块未初始化');
        return;
      }
      
      console.log('开始监听猫叫声...', Date.now());
      
    } catch (error) {
      console.error('获取麦克风权限失败:', error);
      setIsListening(false);
      setDetectorState(MeowDetectorState.Idle);
    }
  };

// 新增：将音频数据分段转为振幅数组
// 计算音频振幅的辅助函数
  function calculateAmplitude(audioData: Float32Array, numBars: number = 30): number[] {
    const blockSize = Math.floor(audioData.length / numBars);
    const result: number[] = [];

    for (let i = 0; i < numBars; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        const index = i * blockSize + j;
        if (index < audioData.length) {
          sum += Math.abs(audioData[index]);
        }
      }
      const avg = sum / blockSize;
      result.push(Math.min(1.0, Math.max(0.1, avg * 5)));
    }
    return result;
  }

  
  // 切换监听状态
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  // 只有在showUI为true时才渲染UI
  return (
    showUI ? (
      <View style={styles.container}>
        <TouchableOpacity 
          style={[styles.button, isListening ? styles.listening : styles.notListening]}
          onPress={toggleListening}
        >
          <Text style={styles.buttonText}>
            {isListening ? '停止监听' : '开始监听'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.status}>
          状态: {getStatusText(detectorState)}
        </Text>
      </View>
    ) : null
  );
});

// 获取状态文本
function getStatusText(state: MeowDetectorState): string {
  switch (state) {
    case MeowDetectorState.Idle:
      return '空闲';
    case MeowDetectorState.Recording:
      return '录音中';
    case MeowDetectorState.Processing:
      return '处理中';
    case MeowDetectorState.Done:
      return '完成';
    default:
      return '未知';
  }
}

// 样式
const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 10,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  listening: {
    backgroundColor: '#e74c3c',
  },
  notListening: {
    backgroundColor: '#3498db',
  },
  status: {
    marginTop: 8,
    textAlign: 'center',
    color: '#333',
  },
});

// 添加 displayName 属性用于调试和开发工具
MeowDetector.displayName = 'MeowDetector';

export default MeowDetector;
