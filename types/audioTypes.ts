/**
 * 音频特征接口
 */
export interface AudioFeatures {
  pitchMean?: number;
  pitchStd?: number;
  spectralCentroidMean?: number;
  spectralCentroidStd?: number;
  zeroCrossingRateMean?: number;
  zeroCrossingRateStd?: number;
  mfccFeatures?: number[];
  duration?: number;
  amplitude?: number;
  recordingQuality?: number; // 录音质量，0-1之间
}

/**
 * 音频分析结果
 */
export interface AudioAnalysisResult {
  isMeow: boolean;
  emotion?: string;
  confidence?: number;
  features?: AudioFeatures;
  duration?: number;
  timestamp?: number;
  // 添加音频原始数据，用于波形分析
  audioData?: Float32Array;
}

/**
 * 猫叫检测器状态
 */
export enum MeowDetectorState {
  Idle = 'idle',        // 空闲状态
  Recording = 'recording',  // 正在录音
  Processing = 'processing', // 正在处理音频
  Done = 'done',       // 处理完成
  Error = 'error'      // 错误状态
}
