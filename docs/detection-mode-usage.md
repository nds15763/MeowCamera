# 猫叫检测模式使用说明

## 概述

猫叫检测模块现在支持两种检测模式：
1. **简单振幅模式** (SIMPLE_AMPLITUDE) - 默认模式
2. **高级特征模式** (ADVANCED_FEATURES) - 开发中

## 功能特性

### 1. 算法开关
- 可以在运行时切换检测模式
- 保持向后兼容，默认使用简单模式

### 2. 真实音频特征提取
- 简单模式下，当检测到高振幅声音时，会尝试提取真实的音频特征
- 包括：振幅、频谱中心、音高、MFCC等特征
- 如果提取失败，会降级到基础特征

### 3. 情感预测
- 基于音高特征预测猫叫的情感状态：
  - 高音调 (>600Hz): 紧张
  - 中音调 (400-600Hz): 呼唤
  - 低音调 (<400Hz): 平静

## 使用方法

### 基本使用

```typescript
import { MeowDetectorModule, DetectionMode } from '../lib/meowDetectorModule';

// 创建检测器实例（默认使用简单模式）
const detector = MeowDetectorModule.getInstance({
  audioProcessorConfig: {
    sampleRate: 44100,
    silenceThreshold: 0.02,
    minSilenceTime: 0.3,
    minProcessTime: 1.0,
    maxBufferTime: 5.0,
  }
});

// 切换到高级模式
detector.setDetectionMode(DetectionMode.ADVANCED_FEATURES);

// 切换回简单模式
detector.setDetectionMode(DetectionMode.SIMPLE_AMPLITUDE);
```

### 在组件中使用

```typescript
// 参考 app/testDetectionMode.tsx 完整示例

const toggleDetectionMode = (useAdvanced: boolean) => {
  const newMode = useAdvanced ? 
    DetectionMode.ADVANCED_FEATURES : 
    DetectionMode.SIMPLE_AMPLITUDE;
  
  const detectorModule = MeowDetectorModule.getInstance(config);
  detectorModule.setDetectionMode(newMode);
};
```

## 测试页面

运行测试页面查看实际效果：
```bash
# 在您的应用中导航到
/testDetectionMode
```

测试页面功能：
- 实时切换检测模式
- 显示检测到的音频特征
- 查看检测历史记录
- 实时情感分析

## 技术细节

### 简单振幅模式工作流程
1. 监听实时音频振幅（通过 metering）
2. 当振幅 >= -30 dBFS 时触发
3. 尝试提取真实音频特征
4. 基于特征预测情感
5. 返回检测结果

### 特征提取
使用 `expo-audio-studio` 提取以下特征：
- RMS (均方根/音量)
- Spectral Centroid (频谱中心)
- Pitch (音高)
- MFCC (梅尔频率倒谱系数)
- Zero Crossing Rate (零交叉率)
- Energy (能量)

### 降级策略
如果实时特征提取失败，系统会：
1. 使用预定义的基础特征
2. 保持检测功能正常运行
3. 记录质量为 0.7（而非 0.9）

## 后续开发计划

### 高级特征模式（开发中）
- 实现滑动窗口分析
- 避免截断猫叫声
- 多维特征综合判断
- 提高检测准确率

### 性能优化
- 减少 CPU 占用
- 优化内存使用
- 提高响应速度

## 注意事项

1. 确保已授予麦克风权限
2. 在安静环境中测试效果更佳
3. 简单模式适合快速原型开发
4. 高级模式适合生产环境（完成后）
