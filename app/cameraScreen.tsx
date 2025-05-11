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

  // Request permission if not granted
  React.useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Handle captured frame
  const handleFrameCaptured = useCallback((frameData: string) => {
    // Just log the base64 preview of the frame to console
    console.log('Captured frame data:', frameData.substring(0, 30) + '...');
    Alert.alert('Frame captured!', 'Frame data logged to console');
    // Reset the capture flag
    setShouldCapture(false);
  }, []);
  
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
        saveAsFile: false
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
