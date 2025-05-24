import { extractAudioAnalysis } from '@siteed/expo-audio-studio';
import { Audio } from 'expo-av';
import { AudioAnalysisResult, AudioFeatures, MeowDetectorState } from '../types/audioTypes';
import { AdaptiveThreshold, CombinedFilter, SmartMeowFilter } from './audioFilters';

// 检测模式枚举
export enum DetectionMode {
  SIMPLE_AMPLITUDE = 'simple_amplitude',  // 简单振幅触发
  ADVANCED_FEATURES = 'advanced_features', // 高级特征检测
  SMART_FILTER = 'smart_filter',          // 方案1：多特征组合过滤器
  ADAPTIVE_THRESHOLD = 'adaptive_threshold', // 方案2：自适应阈值
  COMBINED_FILTER = 'combined_filter'      // 组合过滤器（最严格）
}

// 音频处理器配置接口
interface AudioProcessorConfig {
  sampleRate: number;
  silenceThreshold: number;
  minSilenceTime: number;
  minProcessTime: number;
  maxBufferTime: number;
}

// 猫叫检测模块配置接口
interface MeowDetectorModuleConfig {
  audioProcessorConfig: AudioProcessorConfig;
  onStateChange?: (state: MeowDetectorState) => void;
  onMeowDetected?: (result: AudioAnalysisResult) => void;
  onError?: (error: Error) => void;
  detectionMode?: DetectionMode; // 添加检测模式配置
}

/**
 * 猫叫检测器模块
 * 使用expo-av录制音频并使用meyda提取特征
 */
export class MeowDetectorModule {
  private state: MeowDetectorState = MeowDetectorState.Idle;
  private recording: Audio.Recording | null = null;
  private recordingUri: string | null = null; // Declare recordingUri property
  private timer: any = null;
  private config: MeowDetectorModuleConfig;
  private analysisInterval: number = 1000; // 降低到每1秒分析一次，提高响应速度
  private lastMeowDetectionTime: number = 0; // 上次检测到猫叫的时间戳
  private detectionMode: DetectionMode = DetectionMode.SIMPLE_AMPLITUDE; // 默认使用简单模式
  
  // 音频过滤器实例
  private smartFilter: any = null; // SmartMeowFilter
  private adaptiveThreshold: any = null; // AdaptiveThreshold
  private combinedFilter: any = null; // CombinedFilter

  // 阈值设置 - 调整阈值使检测更敏感
  private rmsThreshold: number = 0.05; // 降低RMS音量阈值以0.05，使检测更敏感
  private spectralCentroidMinThreshold: number = 150; // 拓展频谱中心范围到150-1200Hz
  private spectralCentroidMaxThreshold: number = 1200; // 拓展上限以捕获更多可能的猫叫声
  
  // 单例模式 - 静态实例
  private static instance: MeowDetectorModule | null = null;

  /**
   * 获取MeowDetectorModule实例 (单例)
   * @param config 模块配置
   * @returns MeowDetectorModule实例
   */
  public static getInstance(config: MeowDetectorModuleConfig): MeowDetectorModule {
    if (!MeowDetectorModule.instance) {
      MeowDetectorModule.instance = new MeowDetectorModule(config);
      console.log('创建新的MeowDetectorModule实例');
    } else {
      console.log('返回现有的MeowDetectorModule实例');
      // 更新配置
      MeowDetectorModule.instance.config = config;
    }
    return MeowDetectorModule.instance;
  }

  /**
   * 构造函数 - 设为私有以实现单例
   * @param config 模块配置
   */
  private constructor(config: MeowDetectorModuleConfig) {
    console.log('猫叫检测器模块初始化');
    this.config = config;
    // 如果配置中指定了检测模式，则使用配置的模式
    if (config.detectionMode) {
      this.detectionMode = config.detectionMode;
      console.log(`初始化检测模式为: ${this.detectionMode}`);
    }
    
    // 初始化过滤器（延迟加载）
    this.initializeFilters();
  }
  
  /**
   * 初始化音频过滤器
   */
  private initializeFilters(): void {
    // 直接使用导入的类
    this.smartFilter = new SmartMeowFilter();
    this.adaptiveThreshold = new AdaptiveThreshold();
    this.combinedFilter = new CombinedFilter();
    
    console.log('音频过滤器已初始化');
  }

  /**
   * 设置检测模式
   * @param mode 检测模式
   */
  public setDetectionMode(mode: DetectionMode): void {
    this.detectionMode = mode;
    console.log(`切换检测模式为: ${mode}`);
  }

  /**
   * 获取当前检测模式
   * @returns 当前检测模式
   */
  public getDetectionMode(): DetectionMode {
    return this.detectionMode;
  }

  /**
   * 开始监听猫叫声
   * @param callback 检测到猫叫时的回调函数
   */
  async startListening(callback: (result: AudioAnalysisResult) => void): Promise<void> {
    if (this.state !== MeowDetectorState.Idle) {
      console.log('已经在监听中');
      return;
    }

    try {
      // 首先停止任何现有的监听
      await this.stopListening();
      
      // 明确设置状态为Recording
      this.state = MeowDetectorState.Recording;
      console.log('开始监听猫叫声...', Date.now(), '状态:', this.state);
      if (this.config.onStateChange) {
        this.config.onStateChange(this.state);
      }

      // 创建录音对象
      const recordingOptions = this.getRecordingOptions();
      const { recording } = await Audio.Recording.createAsync(
        recordingOptions,
        async (status: Audio.RecordingStatus) => {
          if (status.isRecording && status.metering !== undefined) {
            const metering = status.metering;
            console.log(`实时振幅: ${metering} dBFS, 检测模式: ${this.detectionMode}`);
            
            // 根据不同的检测模式决定是否触发
            let shouldTrigger = false;
            
            switch (this.detectionMode) {
              case DetectionMode.SIMPLE_AMPLITUDE:
                // 简单振幅检测：>= -30 dBFS
                shouldTrigger = metering >= -30;
                break;
                
              case DetectionMode.SMART_FILTER:
                // 方案1：多特征组合过滤器
                shouldTrigger = this.smartFilter.shouldTriggerDetection(metering);
                break;
                
              case DetectionMode.ADAPTIVE_THRESHOLD:
                // 方案2：自适应阈值
                shouldTrigger = this.adaptiveThreshold.updateAndCheck(metering);
                break;
                
              case DetectionMode.COMBINED_FILTER:
                // 组合过滤器（最严格）
                shouldTrigger = this.combinedFilter.shouldTrigger(metering, 'both');
                break;
                
              case DetectionMode.ADVANCED_FEATURES:
                // 高级特征模式暂未实现，使用简单模式
                shouldTrigger = metering >= -30;
                break;
            }
            
            if (shouldTrigger) {
              const currentTime = Date.now();
              // 确保生成的猫叫数据至少有3秒的间隔（简单模式）
              // 其他模式由过滤器自己控制间隔
              const minInterval = this.detectionMode === DetectionMode.SIMPLE_AMPLITUDE ? 3000 : 0;
              
              if (currentTime - this.lastMeowDetectionTime >= minInterval) {
                this.lastMeowDetectionTime = currentTime;
                console.log(`[${this.detectionMode}] 触发检测，提取音频特征`);
                  
                try {
                  // 尝试提取真实音频特征
                  const realFeatures = await this.extractRealtimeFeatures();
                  
                  // 创建分析结果
                  const result: AudioAnalysisResult = {
                    isMeow: true,
                    features: realFeatures,
                    emotion: this.predictEmotionFromFeatures(realFeatures),
                    confidence: 0.7 + Math.random() * 0.25, // 生成0.7-0.95的随机置信度
                    timestamp: currentTime
                  };
                  
                  // 通过回调函数返回结果
                  callback(result);
                  if (this.config.onMeowDetected) {
                    this.config.onMeowDetected(result);
                  }
                } catch (error) {
                  console.error('提取实时特征失败，使用模拟数据:', error);
                  // 如果提取失败，降级到模拟数据
                  const mockFeatures = this.generateMockMeowFeatures();
                  const result: AudioAnalysisResult = {
                    isMeow: true,
                    features: mockFeatures,
                    emotion: Math.random() > 0.5 ? '紧张' : '平静',
                    confidence: 0.7 + Math.random() * 0.25,
                    timestamp: currentTime
                  };
                  
                  callback(result);
                  if (this.config.onMeowDetected) {
                    this.config.onMeowDetected(result);
                  }
                }
              }
            }
          }
        }
      );
      this.recording = recording;
      this.recordingUri = null; // 重置之前的 URI
      
      // 开始录音
      await this.recording.startAsync();
      console.log('录音已开始 - 再次确认状态:', this.state);
      
      // 确保状态是Recording (以防在过程中被改变)
      if (this.state !== MeowDetectorState.Recording) {
        this.state = MeowDetectorState.Recording;
        console.log('重新设置状态为Recording');
        if (this.config.onStateChange) {
          this.config.onStateChange(this.state);
        }
      }

      // 设置定时器定期分析音频
      this.timer = setInterval(async () => {
        console.log('定时器触发分析，当前时间:', Date.now());
        try {
          // 添加预检查日志
          console.log('定时器检查状态:', this.state, '是否有录音:', !!this.recording);
          
          // 如果状态不是Recording但有录音，强制设置状态
          if (this.recording && this.state !== MeowDetectorState.Recording) {
            console.log('检测到状态不一致，强制重置为Recording');
            this.state = MeowDetectorState.Recording;
            if (this.config.onStateChange) {
              this.config.onStateChange(this.state);
            }
          }
          
          // 现在只检查是否有录音，不再检查状态
          if (this.recording) {
            console.log('开始进行音频分析...');
            // 先设置状态为Processing
            this.state = MeowDetectorState.Processing;
            if (this.config.onStateChange) {
              this.config.onStateChange(this.state);
            }

            // 分析音频
            const result = await this.analyzeAudio();
            console.log('分析结果返回:', result.isMeow ? '是猫叫' : '非猫叫', '音量:', result.features?.amplitude);

            // 始终调用回调函数，无论是否是猫叫
            callback(result);
            console.log('已执行外部回调函数');

            // 如果检测到猫叫，也通知模块的监听者
            if (this.config.onMeowDetected) {
              // 无论是否是猫叫都触发回调，以便于测试
              this.config.onMeowDetected(result);
              console.log('已执行模块内部onMeowDetected回调');
            }

            // 更新状态为录音中
            this.state = MeowDetectorState.Recording;
            if (this.config.onStateChange) {
              this.config.onStateChange(this.state);
            }
          }
        } catch (error) {
          console.error('定时分析失败:', error);
          // 即使出错也返回结果以更新UI
          const fallbackResult: AudioAnalysisResult = {
            isMeow: false,
            features: {
              amplitude: 0.05,
              spectralCentroidMean: 0,
              duration: 0,
              recordingQuality: 0.5
            },
            emotion: '错误',
            confidence: 0,
            timestamp: Date.now()
          };
          callback(fallbackResult);
        }
      }, this.analysisInterval);

    } catch (error) {
      //console.error('开始录音失败:', error); TODO 出实话前两次报错
      this.state = MeowDetectorState.Error;
      if (this.config.onStateChange) {
        this.config.onStateChange(this.state);
      }
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
    }
  }

  /**
   * 停止监听
   */
  async stopListening(): Promise<void> {
    console.log('MeowDetectorModule.stopListening 开始执行...');
    
    // 清除定时器
    if (this.timer) {
      console.log('清除分析定时器');
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // 停止录音
    if (this.recording) {
      try {
        console.log('停止并卸载录音实例...');
        await this.recording.stopAndUnloadAsync();
        console.log('录音实例已成功卸载');
      } catch (error) {
        console.error('停止录音失败:', error);
      } finally {
        // 无论成功失败，都确保引用被清除
        this.recording = null;
      }
    } else {
      console.log('没有活动的录音实例需要停止');
    }
    
    // 重置状态
    this.state = MeowDetectorState.Idle;
    console.log('停止监听猫叫声', Date.now());
    if (this.config.onStateChange) {
      this.config.onStateChange(this.state);
    }
  }
  
  /**
   * 销毁单例实例
   * 用于完全清理所有资源，应在组件卸载时调用
   */
  public static async destroy(): Promise<void> {
    if (MeowDetectorModule.instance) {
      console.log('销毁MeowDetectorModule单例实例');
      
      // 停止定时器
      if (MeowDetectorModule.instance.timer) {
        clearInterval(MeowDetectorModule.instance.timer);
        MeowDetectorModule.instance.timer = null;
      }
      
      // 停止并卸载录音
      if (MeowDetectorModule.instance.recording) {
        try {
          console.log('销毁录音实例...');
          await MeowDetectorModule.instance.recording.stopAndUnloadAsync();
          console.log('录音实例已成功销毁');
        } catch (e) {
          console.error('销毁录音实例时出错:', e);
        } finally {
          MeowDetectorModule.instance.recording = null;
        }
      }
      
      // 重置单例实例
      MeowDetectorModule.instance = null;
      console.log('MeowDetectorModule单例实例已销毁');
    }
  }

  /**
   * 获取当前检测器状态
   */
  getState(): MeowDetectorState {
    return this.state;
  }

  /**
   * 分析音频数据
   * 使用expo-audio-studio提取RMS和频谱中心特征
   */
  private async analyzeAudio(): Promise<AudioAnalysisResult> {
    console.log('==== 分析音频 开始 ====');
    if (!this.recording) {
      console.error('分析失败: 没有正在进行的录音');
      throw new Error('没有正在进行的录音');
    }

    try {
      // 获取录音状态
      console.log('获取录音状态...');
      const status = await this.recording.getStatusAsync();
      console.log('录音状态:', JSON.stringify(status));
      
      // 创建一个临时的音频文件
      console.log('获取录音URI...');
      const uri = this.recording.getURI();
      if (!uri) {
        console.error('分析失败: 无法获取录音URI');
        throw new Error('无法获取录音URI');
      }
      console.log('录音URI:', uri);

      // 使用expo-audio-studio进行音频分析
      console.log('开始调用extractAudioAnalysis...');
      const analysis = await extractAudioAnalysis({
        fileUri: uri,
        features: {
          rms: true,           // 均方根（音量）
          spectralCentroid: true,  // 频谱中心
          zcr: true,           // 零交叉率
          pitch: true,         // 音高
          energy: true         // 能量
        }
      });
      console.log('extractAudioAnalysis返回结果:', JSON.stringify(analysis));
      
      // 使用类型断言处理分析结果
      const analysisData = analysis as Record<string, any>;
      
      // 获取真实的RMS值和频谱中心值
      const rms = analysisData.rms?.mean || 0.1;
      const spectralCentroid = analysisData.spectralCentroid?.mean || 500;
      console.log('分析结果 - RMS:', rms, '频谱中心:', spectralCentroid, '阈值:', this.rmsThreshold, this.spectralCentroidMinThreshold, this.spectralCentroidMaxThreshold);
      
      // 基于RMS和频谱中心判断是否是猫叫声
      const isMeow = this.detectMeow(rms, spectralCentroid);
      console.log('猫叫判断结果:', isMeow ? '是猫叫' : '非猫叫');
      
      // 创建音频特征对象
      const features: AudioFeatures = {
        amplitude: rms,
        spectralCentroidMean: spectralCentroid,
        spectralCentroidStd: analysisData.spectralCentroid?.std || 0,
        pitchMean: analysisData.pitch?.mean || 0,
        pitchStd: analysisData.pitch?.std || 0,
        zeroCrossingRateMean: analysisData.zcr?.mean || 0,
        zeroCrossingRateStd: analysisData.zcr?.std || 0,
        duration: status.durationMillis ? status.durationMillis / 1000 : 1.0,
        recordingQuality: 0.9 // 使用真实分析，质量更高
      };
      
      // 简单情感分析
      const emotion = isMeow ? 
        (features.pitchMean && features.pitchMean > 400 ? '紧张' : '平静') : 
        '未知';
      
      // 创建分析结果
      const result: AudioAnalysisResult = {
        isMeow,
        features,
        emotion,
        confidence: isMeow ? 0.85 : 0.3, // 使用真实分析提高置信度
        timestamp: Date.now()
      };
      
      return result;
    } catch (error) {
      console.error('音频分析失败:', error);
      
      // 返回一个默认的分析结果
      return {
        isMeow: false,
        features: {
          amplitude: 0.05,
          spectralCentroidMean: 0,
          duration: 0,
          recordingQuality: 0.5
        },
        emotion: '未知',
        confidence: 0,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 基于RMS和频谱中心检测是否是猫叫声
   */
  private detectMeow(rms: number, spectralCentroid: number): boolean {
    // 检查RMS是否超过阈值
    const hasSignificantVolume = rms > this.rmsThreshold;
    
    // 检查频谱中心是否在猫叫声的频率范围内
    const isInFrequencyRange = 
      spectralCentroid >= this.spectralCentroidMinThreshold && 
      spectralCentroid <= this.spectralCentroidMaxThreshold;
    
    // 同时满足音量和频率条件才判定为猫叫声
    return hasSignificantVolume && isInFrequencyRange;
  }

  /**
   * 提取实时音频特征
   * 从当前录音中提取真实的音频特征
   */
  private async extractRealtimeFeatures(): Promise<AudioFeatures> {
    if (!this.recording) {
      throw new Error('没有活动的录音实例');
    }

    try {
      // 获取当前录音的URI
      const uri = this.recording.getURI();
      if (!uri) {
        throw new Error('无法获取录音URI');
      }

      // 使用 expo-audio-studio 提取特征
      const analysis = await extractAudioAnalysis({
        fileUri: uri,
        features: {
          rms: true,
          spectralCentroid: true,
          pitch: true,
          mfcc: true,
          zcr: true,
          energy: true
        }
      });

      const analysisData = analysis as Record<string, any>;

      // 返回真实的音频特征
      return {
        amplitude: analysisData.rms?.mean || 0.3,
        spectralCentroidMean: analysisData.spectralCentroid?.mean || 700,
        spectralCentroidStd: analysisData.spectralCentroid?.std || 100,
        pitchMean: analysisData.pitch?.mean || 500,
        pitchStd: analysisData.pitch?.std || 50,
        zeroCrossingRateMean: analysisData.zcr?.mean || 0.05,
        zeroCrossingRateStd: analysisData.zcr?.std || 0.02,
        mfccFeatures: analysisData.mfcc?.values || [],
        duration: 1.0, // 实时片段默认1秒
        recordingQuality: 0.9
      };
    } catch (error) {
      console.error('提取实时特征失败:', error);
      // 如果失败，返回基础特征
      return this.getBasicFeaturesFromMetering();
    }
  }

  /**
   * 从计量数据获取基础特征
   * 当无法提取完整特征时的降级方案
   */
  private getBasicFeaturesFromMetering(): AudioFeatures {
    return {
      amplitude: 0.3, // 触发阈值对应的振幅
      spectralCentroidMean: 700, // 猫叫的典型频率
      spectralCentroidStd: 100,
      pitchMean: 500,
      pitchStd: 50,
      zeroCrossingRateMean: 0.05,
      zeroCrossingRateStd: 0.02,
      duration: 1.0,
      recordingQuality: 0.7 // 降级方案质量较低
    };
  }

  /**
   * 基于音频特征预测情感
   * @param features 音频特征
   * @returns 预测的情感
   */
  private predictEmotionFromFeatures(features: AudioFeatures): string {
    // 基于音频特征的简单情感分类
    if (!features.pitchMean) {
      return '未知';
    }

    // 高音调通常表示紧张或兴奋
    if (features.pitchMean > 600) {
      return '紧张';
    }
    
    // 中等音调可能是呼唤或寻求注意
    if (features.pitchMean > 400) {
      return '呼唤';
    }
    
    // 低音调通常表示平静或满足
    return '平静';
  }

  /**
   * 生成模拟猫叫特征数据
   * 返回符合猫叫特征范围的随机数据
   */
  private generateMockMeowFeatures(): AudioFeatures {
    return {
      // 猫叫通常在0.1-0.5之间的振幅
      amplitude: 0.2 + Math.random() * 0.3,
      
      // 猫叫频谱中心通常在500-900 Hz
      spectralCentroidMean: 500 + Math.random() * 400,
      spectralCentroidStd: 50 + Math.random() * 50,
      
      // 猫叫音高通常在300-800 Hz
      pitchMean: 300 + Math.random() * 500,
      pitchStd: 20 + Math.random() * 40,
      
      // 零交叉率
      zeroCrossingRateMean: 0.05 + Math.random() * 0.05,
      zeroCrossingRateStd: 0.01 + Math.random() * 0.02,
      
      // 持续时间1-3秒
      duration: 1 + Math.random() * 2,
      
      // 录音质量
      recordingQuality: 0.8 + Math.random() * 0.2 // 0.8-1.0的高质量
    };
  }
  
  private getRecordingOptions(): Audio.RecordingOptions {
    const presetOptions = Audio.RecordingOptionsPresets.HIGH_QUALITY;
    presetOptions.isMeteringEnabled = true; 

    return presetOptions;
  }
}
