import { Skia } from '@shopify/react-native-skia';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, CameraPosition, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { crop } from 'vision-camera-cropper';

export default function CameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isActive, setIsActive] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>('back');
  const device = useCameraDevice(cameraPosition);
  const camera = useRef<Camera>(null);
  const [shouldCapture, setShouldCapture] = useState(false);
  
  // 动态轨迹捕获相关状态
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [compositeImage, setCompositeImage] = useState<string | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameCountRef = useRef(0);

  // Request permission if not granted
  React.useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Handle captured frame
  const handleFrameCaptured = useCallback((frameData: string) => {
    // 检查是否处于动态轨迹捕获模式
    if (isCapturing && frameCountRef.current < 8) {
      // 保存帧到动态轨迹数组
      setCapturedFrames(prev => [...prev, frameData]);
      frameCountRef.current += 1;
      console.log(`动态轨迹: 捕获帧 ${frameCountRef.current}/8`);
    } else {
      // 正常的单帧捕获逻辑
      console.log('Captured frame data:', frameData);
      Alert.alert('Frame captured!', 'Frame data logged to console');
    }
    // Reset the capture flag
    setShouldCapture(false);
  }, [isCapturing]);
  
  // Create a worklet function to call from the frame processor
  const handleFrameCapturedJS = Worklets.createRunOnJS(handleFrameCaptured);

  // Frame processor function
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (shouldCapture) {
      // Get the entire frame as base64 (100% of width/height)
      const result = crop(frame, {
        cropRegion: {
          left: 0,
          top: 0,
          width: 100,
          height: 100
        },
        includeImageBase64: true,
        saveAsFile: false,
        // 将采集到的帧压缩处理，在handleFrameCaptured中
      });
      
      // 检查 base64 是否存在，然后传递给 JS 线程
      if (result.base64) {
        handleFrameCapturedJS(result.base64);
      } else {
        // 如果没有 base64 数据，使用空字符串或错误消息
        handleFrameCapturedJS('无法获取图像数据');
      }
    }
  }, [shouldCapture, handleFrameCapturedJS]);
    
  // Trigger frame capture
  const captureFrame = useCallback(() => {
    setShouldCapture(true);
  }, []);

  // Toggle camera position
  const toggleCameraPosition = useCallback(() => {
    setCameraPosition(p => (p === 'back' ? 'front' : 'back'));
  }, []);

  // Toggle camera active state
  const toggleActive = useCallback(() => {
    setIsActive(prev => !prev);
  }, []);

  // Go back to home
  const goBack = useCallback(() => {
    router.back();
  }, []);
  
  // 动态轨迹捕获相关函数
  // 使用Skia创建叠加效果图像
  const createCompositeImage = useCallback(() => {
    if (capturedFrames.length === 0) return;
    
    console.log(`动态轨迹: 正在合成 ${capturedFrames.length} 帧图像`);
    
    // 创建Skia图像数组
    const imagePromises = capturedFrames.map(base64 => {
      try {
        // 从base64创建Skia数据对象
        const data = Skia.Data.fromBase64(base64);
        // 从数据创建Skia图像
        return Skia.Image.MakeImageFromEncoded(data);
      } catch (error) {
        console.error('加载图像失败:', error);
        return null;
      }
    }).filter(Boolean); // 过滤掉null值
    
    // 确保至少有一个有效图像
    if (imagePromises.length === 0) {
      console.error('没有有效的图像可合成');
      return;
    }
    
    // 创建叠加图像
    try {
      // 获取第一个图像的尺寸
      const firstImage = imagePromises[0];
      if (!firstImage) return;
      
      const width = 360;
      const height = 640;
      
      // 创建表面
      const surface = Skia.Surface.Make(width, height);
      if (!surface) {
        console.error('无法创建绘图表面');
        return;
      }
      
      const canvas = surface.getCanvas();
      
      // 创建半透明画笔
      const paint = Skia.Paint();
      paint.setAlphaf(0.5); // 50%透明度
      
      // 依次绘制每张图片
      imagePromises.forEach(image => {
        if (image) {
          canvas.drawImageRect(
            image,
            Skia.XYWHRect(0, 0, image.width(), image.height()),
            Skia.XYWHRect(0, 0, width, height),
            paint
          );
        }
      });
      
      // 获取合成图像
      const finalImage = surface.makeImageSnapshot();
      
      // 转换为base64 - 使用encodeToBase64
      const data = finalImage.encodeToBase64();
      if (data) {
        const finalBase64 = data;
        setCompositeImage(finalBase64);
        
        // 打印结果
        console.log("动态轨迹: 合成图像完成，base64前100字符:", 
          finalBase64.substring(0, 100) + "...");
      }
    } catch (error) {
      console.error('合成图像失败:', error);
    }
  }, [capturedFrames]);
  
  // 开始捕获序列
  const startCaptureSequence = useCallback(() => {
    // 重置状态
    setCapturedFrames([]);
    frameCountRef.current = 0;
    setCompositeImage(null);
    
    // 设置捕获状态为true
    setIsCapturing(true);
    
    // 设置2秒后停止捕获
    captureTimerRef.current = setTimeout(() => {
      setIsCapturing(false);
      console.log('动态轨迹: 捕获序列完成');
      createCompositeImage();
    }, 2000);
    
    // 开始帧捕获（每250ms触发一次shouldCapture）
    const captureInterval = setInterval(() => {
      if (frameCountRef.current < 8) {
        setShouldCapture(true);
        
        // 延迟50ms后重置shouldCapture，为帧捕获留出时间
        setTimeout(() => {
          setShouldCapture(false);
        }, 50);
      } else {
        clearInterval(captureInterval);
      }
    }, 250);
  }, [createCompositeImage]);
  
  // 清理计时器
  React.useEffect(() => {
    return () => {
      if (captureTimerRef.current) {
        clearTimeout(captureTimerRef.current);
      }
    };
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={goBack}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No camera device available</Text>
        <TouchableOpacity style={styles.button} onPress={goBack}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack.Screen options={{ 
        title: 'Camera',
        headerShown: true,
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff'
      }} />
      
      {isActive && (
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isActive}
          frameProcessor={frameProcessor}
        />
      )}

      {!isActive && (
        <View style={styles.previewPlaceholder}>
          <Text style={styles.previewText}>Camera Preview (Inactive)</Text>
        </View>
      )}

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleActive}>
          <Text style={styles.buttonText}>{isActive ? 'Stop Camera' : 'Start Camera'}</Text>
        </TouchableOpacity>

        {isActive && (
          <TouchableOpacity style={styles.controlButton} onPress={captureFrame}>
            <Text style={styles.buttonText}>Capture Frame</Text>
          </TouchableOpacity>
        )}

        {isActive && (
          <TouchableOpacity style={styles.controlButton} onPress={toggleCameraPosition}>
            <Text style={styles.buttonText}>Flip Camera</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* 动态轨迹捕获按钮 */}
      {isActive && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: isCapturing ? 'red' : '#2196F3',
            padding: 15,
            borderRadius: 30,
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
          }}
          onPress={startCaptureSequence}
          disabled={isCapturing}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            {isCapturing ? '捕捉中...' : '捕捉动态轨迹'}
          </Text>
        </TouchableOpacity>
      )}

      {/* 显示结果 */}
      {compositeImage && (
        <View style={{ position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 5 }}>
          <Text style={{ color: 'white' }}>成功创建合成图像!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  previewText: {
    color: 'white',
    fontSize: 18,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 20,
  },
  controlButton: {
    backgroundColor: '#4630EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#4630EB',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
