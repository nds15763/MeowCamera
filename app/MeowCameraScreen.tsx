import EmotionButton from '@/components/EmotionButton';
import EmotionSelectorModal from '@/components/EmotionSelectorModal';
import { useAudioRecorder } from '@siteed/expo-audio-studio';
import { Stack, router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Camera, CameraPosition, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { crop } from 'vision-camera-cropper';
import DynamicIsland from '../components/DynamicIsland';
import MeowDetector, { MeowDetectorRef } from '../lib/meowDetector';
import { moonShotApi } from '../lib/moonShotApi';
import { AudioFeatures } from '../types/audioTypes';

// 定义检测结果类型
interface MoonShotResult {
  is_meow?: boolean; // 是否有猫叫
  most_likely_meaning?: string; // 最可能的意思
  confidence: number; //置信度
}

export default function MeowCameraScreen() {
  const theme = useTheme();
  
  // 相机状态
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>('back');
  const device = useCameraDevice(cameraPosition);
  const camera = useRef<Camera>(null);
  const [shouldCapture, setShouldCapture] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const appState = useRef(AppState.currentState);
  
  // 音频检测状态
  const [isRecording, setIsRecording] = useState(false);
  const [isMeowDetected, setIsMeowDetected] = useState(false);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(Array(30).fill(0.1));
  const detectorRef = useRef<MeowDetectorRef>(null);
  
  // 表情选择器状态
  const [emotionModalVisible, setEmotionModalVisible] = useState(false);
  
  // 音频录制器
  const { startRecording, stopRecording } = useAudioRecorder();
  
  // 检测结果
  const [moonShotResults, setMoonShotResults] = useState<MoonShotResult[]>([]);
  
  // 处理音频检测结果的回调
  const handleMeowDetected = useCallback((isMeow: boolean, features?: AudioFeatures) => {
    console.log('检测结果:', isMeow ? '检测到猫叫' : '非猫叫声音');
    setIsMeowDetected(isMeow);
    
    if (features) {
      setAudioFeatures(features);
      
      // 更新波形数据
      if (features.amplitude) {
        const baseAmplitude = features.amplitude;
        // 基于当前振幅生成波形数据
        const newWaveformData = Array(30).fill(0).map(() => {
          const randomVariation = Math.random() * 0.2 - 0.1;
          return Math.max(0.05, Math.min(1, baseAmplitude + randomVariation));
        });
        setWaveformData(newWaveformData);
      }
      
      // 如果检测到猫叫，触发图像捕获
      if (isMeow) {
        console.log('检测到猫叫，准备捕获图像');
        setShouldCapture(true);
      }
    }
  }, []);
  
  // 处理捕获的图像
  const handleFrameCaptured = useCallback((frameData: string) => {
    console.log('捕获图像数据，长度:', frameData.length);
    setImageBase64(frameData);
    setShouldCapture(false);
    
    // 如果已有音频特征，发送到MoonShot API
    if (audioFeatures && isMeowDetected) {
      sendToMoonShot(frameData, audioFeatures);
    }
  }, [audioFeatures, isMeowDetected]);
  
  // 处理相机错误
  const handleCameraError = useCallback((error: Error) => {
    // 检查是否是相机限制错误，如果是则不打印
    if (!error.message.includes('camera-is-restricted')) {
      // 只打印非相机限制错误
      //console.error('相机错误:', error);
    }
  }, []);
  
  // 创建工作线程函数，在相机帧处理器中调用
  const handleFrameCapturedJS = Worklets.createRunOnJS(handleFrameCaptured);
  
  // 相机帧处理器
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (shouldCapture) {
      // 获取整个帧转为base64
      const result = crop(frame, {
        cropRegion: {
          left: 0,
          top: 0,
          width: 100,
          height: 100
        },
        includeImageBase64: true,
        saveAsFile: false
      });
      
      // 检查 base64 是否存在，然后传递给 JS 线程
      if (result.base64) {
        handleFrameCapturedJS(result.base64);
      } else {
        handleFrameCapturedJS('无法获取图像数据');
      }
    }
  }, [shouldCapture, handleFrameCapturedJS]);
  
  // 发送数据到MoonShot API
  const sendToMoonShot = useCallback(async (imageData: string, audioData: AudioFeatures) => {
    try {
      console.log('发送数据到MoonShot API...');
      // 调用MoonShot API
      const response = await moonShotApi.analyzeMeow(imageData, audioData);
      
      // 检查是否有猫咪存在
      const hasCat = response.is_meow === true;
      
      // 准备新结果
      const newResult = {
        most_likely_meaning: response.most_likely_meaning || '',
        confidence: response.confidence || 0.5,
        is_meow: hasCat
      };
      
      // 只有在有猫咪或者没有结果时添加新结果
      setMoonShotResults(prev => {
        // 如果没有猫咪且已经有结果，则不添加新的
        if (!hasCat && prev.length > 0) {
          return prev;
        }
        
        const newResults = [newResult, ...prev];
        return newResults.slice(0, 3);
      });
      
      console.log('MoonShot API处理后的结果:', newResult);
    } catch (error) {
      console.error('MoonShot API错误:', error);
    }
  }, []);
  
  // 开始录音和检测
  const startAudioDetection = useCallback(async () => {
    try {
      console.log('开始录音和检测...');
      // 开始录音
      if (typeof startRecording === 'function') {
        startRecording({});
      }
      // 开始监听
      await detectorRef.current?.startListening();
      setIsRecording(true);
    } catch (error) {
      console.error('启动录音和检测失败:', error);
      setIsRecording(false);
    }
  }, [startRecording]);
  
  // 停止录音和检测
  const stopAudioDetection = useCallback(() => {
    console.log('停止录音和检测...');
    
    // 确保停止MeowDetector监听
    if (detectorRef.current) {
      console.log('停止MeowDetector监听');
      detectorRef.current.stopListening();
    }
    
    // 确保停止录音
    if (typeof stopRecording === 'function') {
      console.log('调用stopRecording函数');
      try {
        stopRecording();
      } catch (error) {
        console.error('停止录音时出错:', error);
      }
    }
    
    // 重置状态
    setIsRecording(false);
    setIsMeowDetected(false);
    setWaveformData(Array(30).fill(0.1));
    
    // 强制进行垃圾回收（仅建议，不保证立即执行）
    if (global.gc) {
      try {
        global.gc();
      } catch (e) {
        console.log('无法强制垃圾回收');
      }
    }
  }, [stopRecording]);
  
  // 不再需要切换功能，只保留开始功能
  
  // 监听应用状态变化
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        // 应用回到前台，重新激活相机
        setIsCameraActive(false);
        // 短暂延迟后重新激活相机，给系统一些时间释放相机资源
        setTimeout(() => {
          setIsCameraActive(true);
        }, 500);
      } else if (
        appState.current.match(/active/) && 
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        console.log('App has gone to the background!');
        // 应用进入后台，停止录音和检测
        stopAudioDetection();
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [stopAudioDetection]);
  
  // 请求相机权限
  useEffect(() => {
    if (!hasCameraPermission) {
      requestCameraPermission();
    }
  }, [hasCameraPermission, requestCameraPermission]);
  
  // 组件卸载时停止录音和检测
  useEffect(() => {
    return () => {
      // 无论 isRecording 状态如何，都确保停止录音和清理资源
      console.log('组件卸载，清理录音资源...');
      stopAudioDetection();
      
      // 确保MeowDetectorModule单例实例被销毁
      import('../lib/meowDetectorModule').then(module => {
        module.MeowDetectorModule.destroy().catch((e: Error) => {
          console.error('销毁MeowDetectorModule实例时出错:', e);
        });
      }).catch((e: Error) => {
        console.error('导入MeowDetectorModule失败:', e);
      });
    };
  }, [stopAudioDetection]);
  
  // 如果没有相机权限或设备，显示相应提示
  if (!hasCameraPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>需要相机权限</Text>
        <TouchableOpacity style={styles.recordButton} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>授予权限</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>无可用相机设备</Text>
        <TouchableOpacity style={styles.recordButton} onPress={() => router.back()}>
          <Text style={styles.buttonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: '猫咪相机',
        headerShown: false
      }} />
      
      {/* 相机作为背景 */}
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isCameraActive}
        frameProcessor={frameProcessor}
        onError={handleCameraError}
      />
      
      {/* 灵动岛 - 音频状态显示 */}
      <DynamicIsland
        isRecording={isRecording}
        isMeowDetected={isMeowDetected}
        waveformData={waveformData}
        onPress={startAudioDetection}
      />
      
      {/* 检测结果列表 */}
      <ScrollView 
        style={styles.resultsContainer}
        contentContainerStyle={styles.resultsContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {moonShotResults
          .filter(result => result.is_meow === true)
          .slice(0, 3) // 限制最多显示3条结果
          .map((result, index) => (
            <View key={index} style={styles.resultCard}>
              <Text style={styles.resultText}>
                {result.most_likely_meaning}
              </Text>
              <Text style={styles.confidenceText}>
                置信度: {(result.confidence * 100).toFixed(1)}%
              </Text>
            </View>
          ))
        }
      </ScrollView>
      
      {/* 灰色遮罩 - 未开始检测时显示 */}
      {!isRecording && (
        <View style={styles.overlay}>
          {/* 底部控制面板 */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={startAudioDetection}
            >
              <View style={styles.playIcon} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* 表情按钮和模态框 */}
      <EmotionButton 
        style={styles.emotionButton} 
        onPress={() => setEmotionModalVisible(true)} 
      />
      <EmotionSelectorModal 
        visible={emotionModalVisible} 
        onClose={() => setEmotionModalVisible(false)} 
      />
      
      {/* 隐藏的MeowDetector */}
      <MeowDetector
        ref={detectorRef}
        onMeowDetected={handleMeowDetected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    margin: 20,
  },
  resultsContainer: {
    position: 'absolute',
    bottom: 100, // 从底部向上位置
    left: 20,
    maxWidth: '50%', // 最大宽度为50%
    maxHeight: '50%', // 最大高度为50%
  },
  resultsContentContainer: {
    padding: 0,
    paddingBottom: 5,
  },
  resultCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  resultText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  confidenceText: {
    color: '#aaa',
    fontSize: 14,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  playIcon: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 22,
    borderRightWidth: 0,
    borderBottomWidth: 15,
    borderTopWidth: 15,
    borderLeftColor: 'black',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
    marginLeft: 8, // 稍微向右偏移以使三角形居中
  },
  // 保留这些样式用于权限请求界面
  recordButton: {
    backgroundColor: '#4630EB',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    width: 160,
    alignItems: 'center',
  },
  recordingActive: {
    backgroundColor: '#E53935',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emotionButton: {
    position: 'absolute',
    bottom: 40,
    right: 30,
  },
});
