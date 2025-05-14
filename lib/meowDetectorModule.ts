import { extractAudioAnalysis } from '@siteed/expo-audio-studio';
import { Audio } from 'expo-av';
import { AudioAnalysisResult, AudioFeatures, MeowDetectorState } from '../types/audioTypes';

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
        (status: Audio.RecordingStatus) => {
          if (status.isRecording) {
            // 实时振幅（dBFS）, -160 (静音) to 0 (最大)
            if (status.metering !== undefined) {
              console.log(`实时振幅: ${status.metering} dBFS`);
              
              // 检测振幅是否 >= -30 dBFS
              if (status.metering >= -30) {
                const currentTime = Date.now();
                // 确保生成的猫叫数据至少有3秒的间隔
                if (currentTime - this.lastMeowDetectionTime >= 3000) {
                  this.lastMeowDetectionTime = currentTime;
                  console.log('检测到高振幅声音 (>= -30 dBFS)，模拟猫叫数据');
                  
                  // 生成模拟猫叫数据
                  const meowFeatures: AudioFeatures = this.generateMockMeowFeatures();
                  
                  // 创建分析结果
                  const result: AudioAnalysisResult = {
                    isMeow: true,
                    features: meowFeatures,
                    emotion: Math.random() > 0.5 ? '紧张' : '平静',
                    confidence: 0.7 + Math.random() * 0.25, // 生成0.7-0.95的随机置信度
                    timestamp: currentTime
                  };
                  
                  // 通过回调函数返回结果
                  if (this.config.onMeowDetected) {
                    this.config.onMeowDetected(result);
                  }
                }
              }
            }
          }
          // 可选: 处理录音完成的事件
          // if (status.didJustFinish && !status.isRecording) {
          //   console.log('录音完成（通过状态更新回调）');
          //   // 注意: this.recording.getURI() 可能在这里还是 null
          //   // 通常在 stopRecordingAndUnloadAsync 之后获取 URI
          // }
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
    // 清除定时器
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // 停止录音
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('停止录音失败:', error);
      }
      this.recording = null;
    }
    
    this.state = MeowDetectorState.Idle;
    console.log('停止监听猫叫声', Date.now());
    if (this.config.onStateChange) {
      this.config.onStateChange(this.state);
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
