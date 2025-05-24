/**
 * 音频过滤器模块
 * 提供多种智能过滤算法，减少误触发
 */

// 模式评分接口
interface PatternScore {
  score: number;
  reason?: string;
}

// 音频片段接口
interface AudioSegment {
  amplitude: number;
  timestamp: number;
}

/**
 * 方案1：多特征组合过滤器
 * 通过分析振幅模式、时间模式等多个特征来判断是否应该触发检测
 */
export class SmartMeowFilter {
  // 特征历史记录
  private amplitudeHistory: number[] = [];
  private triggerHistory: number[] = []; // 触发时间历史
  private readonly HISTORY_SIZE = 10; // 保留最近10个采样点
  private readonly MIN_INTERVAL = 2000; // 最小触发间隔（毫秒）
  
  /**
   * 判断是否应该触发检测
   * @param metering 当前振幅值（dBFS）
   * @returns 是否触发检测
   */
  shouldTriggerDetection(metering: number): boolean {
    // 基础阈值检查
    if (metering < -40) {
      return false; // 太安静，直接忽略
    }
    
    // 1. 振幅模式检测
    const amplitudePattern = this.analyzeAmplitudePattern(metering);
    
    // 2. 时间模式检测
    const timePattern = this.analyzeTimePattern();
    
    // 3. 变化率检测
    const variationPattern = this.analyzeVariationPattern();
    
    // 综合评分（权重可调）
    const score = (
      amplitudePattern.score * 0.5 +  // 振幅模式权重50%
      timePattern.score * 0.3 +        // 时间模式权重30%
      variationPattern.score * 0.2     // 变化率权重20%
    );
    
    console.log(`[SmartMeowFilter] 综合评分: ${score.toFixed(2)}, 振幅: ${amplitudePattern.score.toFixed(2)}, 时间: ${timePattern.score.toFixed(2)}, 变化: ${variationPattern.score.toFixed(2)}`);
    
    // 如果评分足够高，记录触发时间
    if (score > 0.6) {
      this.triggerHistory.push(Date.now());
      // 保持历史记录大小
      if (this.triggerHistory.length > 10) {
        this.triggerHistory.shift();
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * 分析振幅模式
   */
  private analyzeAmplitudePattern(currentMetering: number): PatternScore {
    // 更新历史记录
    this.amplitudeHistory.push(currentMetering);
    if (this.amplitudeHistory.length > this.HISTORY_SIZE) {
      this.amplitudeHistory.shift();
    }
    
    // 需要足够的历史数据
    if (this.amplitudeHistory.length < 3) {
      return { score: 0, reason: '历史数据不足' };
    }
    
    let score = 0;
    
    // 1. 检测突然上升（猫叫通常有急促的起始）
    const recentValues = this.amplitudeHistory.slice(-3);
    const rise = recentValues[2] - recentValues[0];
    if (rise > 10) { // 10dB的突然上升
      score += 0.4;
    }
    
    // 2. 检查是否高于平均值
    const average = this.amplitudeHistory.reduce((a, b) => a + b, 0) / this.amplitudeHistory.length;
    if (currentMetering > average + 5) { // 高于平均值5dB
      score += 0.3;
    }
    
    // 3. 检查振幅是否在合理范围（猫叫的典型范围）
    if (currentMetering >= -30 && currentMetering <= -10) {
      score += 0.3;
    }
    
    return { score: Math.min(score, 1), reason: `振幅上升: ${rise.toFixed(1)}dB` };
  }
  
  /**
   * 分析时间模式
   */
  private analyzeTimePattern(): PatternScore {
    const now = Date.now();
    
    // 没有历史触发，给予中等分数
    if (this.triggerHistory.length === 0) {
      return { score: 0.5, reason: '首次触发' };
    }
    
    // 检查最近一次触发的时间间隔
    const lastTrigger = this.triggerHistory[this.triggerHistory.length - 1];
    const interval = now - lastTrigger;
    
    // 太频繁的触发可能是噪音
    if (interval < this.MIN_INTERVAL) {
      return { score: 0, reason: `间隔太短: ${interval}ms` };
    }
    
    // 合理的间隔（2-10秒）
    if (interval >= 2000 && interval <= 10000) {
      return { score: 0.8, reason: `间隔合理: ${interval}ms` };
    }
    
    // 间隔较长，可能是新的猫叫
    return { score: 1, reason: `间隔较长: ${interval}ms` };
  }
  
  /**
   * 分析变化率模式
   */
  private analyzeVariationPattern(): PatternScore {
    if (this.amplitudeHistory.length < 3) {
      return { score: 0.5, reason: '数据不足' };
    }
    
    // 计算标准差，检查是否有变化
    const mean = this.amplitudeHistory.reduce((a, b) => a + b, 0) / this.amplitudeHistory.length;
    const variance = this.amplitudeHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.amplitudeHistory.length;
    const stdDev = Math.sqrt(variance);
    
    // 变化太小可能是持续噪音
    if (stdDev < 2) {
      return { score: 0.2, reason: `变化太小: ${stdDev.toFixed(1)}` };
    }
    
    // 适度的变化是猫叫的特征
    if (stdDev >= 2 && stdDev <= 10) {
      return { score: 0.9, reason: `变化适中: ${stdDev.toFixed(1)}` };
    }
    
    // 变化太大可能是其他噪音
    return { score: 0.5, reason: `变化较大: ${stdDev.toFixed(1)}` };
  }
  
  /**
   * 重置过滤器状态
   */
  reset(): void {
    this.amplitudeHistory = [];
    this.triggerHistory = [];
  }
}

/**
 * 方案2：基于统计的智能阈值
 * 自适应环境噪音，动态调整触发阈值
 */
export class AdaptiveThreshold {
  private noiseFloor: number = -60; // 环境噪音基准（dBFS）
  private recentPeaks: number[] = []; // 最近的峰值
  private recentValues: number[] = []; // 最近的所有值
  private readonly WINDOW_SIZE = 100; // 10秒窗口（100ms采样）
  private readonly PEAK_WINDOW = 10; // 峰值检测窗口
  private lastTriggerTime: number = 0; // 上次触发时间
  
  /**
   * 更新并检查是否应该触发
   * @param metering 当前振幅值（dBFS）
   * @returns 是否触发检测
   */
  updateAndCheck(metering: number): boolean {
    // 更新历史值
    this.recentValues.push(metering);
    if (this.recentValues.length > this.WINDOW_SIZE) {
      this.recentValues.shift();
    }
    
    // 更新噪音基准（使用中位数而不是平均值，更稳定）
    if (this.recentValues.length >= 10) {
      const sorted = [...this.recentValues].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      // 缓慢适应新的噪音水平
      this.noiseFloor = this.noiseFloor * 0.95 + median * 0.05;
    }
    
    // 动态阈值 = 噪音基准 + 动态余量
    const dynamicMargin = this.calculateDynamicMargin();
    const dynamicThreshold = this.noiseFloor + dynamicMargin;
    
    console.log(`[AdaptiveThreshold] 当前: ${metering.toFixed(1)}dB, 噪音基准: ${this.noiseFloor.toFixed(1)}dB, 动态阈值: ${dynamicThreshold.toFixed(1)}dB`);
    
    // 基础检查
    if (metering < dynamicThreshold || metering < -40) {
      return false;
    }
    
    // 检查是否是显著峰值
    const isPeak = this.isSignificantPeak(metering);
    
    // 防抖动检查
    const now = Date.now();
    if (isPeak && (now - this.lastTriggerTime) > 1000) { // 1秒防抖
      this.lastTriggerTime = now;
      this.recentPeaks.push(metering);
      if (this.recentPeaks.length > 5) {
        this.recentPeaks.shift();
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * 计算动态余量
   * 根据环境噪音的稳定性调整余量
   */
  private calculateDynamicMargin(): number {
    if (this.recentValues.length < 20) {
      return 20; // 默认20dB余量
    }
    
    // 计算最近值的标准差
    const mean = this.recentValues.reduce((a, b) => a + b, 0) / this.recentValues.length;
    const variance = this.recentValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.recentValues.length;
    const stdDev = Math.sqrt(variance);
    
    // 环境越稳定，余量可以越小
    if (stdDev < 2) {
      return 15; // 稳定环境，15dB余量
    } else if (stdDev < 5) {
      return 20; // 一般环境，20dB余量
    } else {
      return 25; // 嘈杂环境，25dB余量
    }
  }
  
  /**
   * 检查是否是显著峰值
   */
  private isSignificantPeak(current: number): boolean {
    if (this.recentValues.length < this.PEAK_WINDOW) {
      return current > -30; // 数据不足时使用固定阈值
    }
    
    // 获取最近的值（不包括当前值）
    const recentWindow = this.recentValues.slice(-this.PEAK_WINDOW, -1);
    const recentMax = Math.max(...recentWindow);
    const recentAvg = recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length;
    
    // 检查是否是突出的峰值
    const isHigherThanRecent = current > recentMax + 3; // 比最近最大值高3dB
    const isSignificantRise = current > recentAvg + 10; // 比平均值高10dB
    
    return isHigherThanRecent || isSignificantRise;
  }
  
  /**
   * 获取当前状态信息
   */
  getStatus(): {
    noiseFloor: number;
    currentThreshold: number;
    recentPeaksCount: number;
  } {
    const dynamicMargin = this.calculateDynamicMargin();
    return {
      noiseFloor: this.noiseFloor,
      currentThreshold: this.noiseFloor + dynamicMargin,
      recentPeaksCount: this.recentPeaks.length
    };
  }
  
  /**
   * 重置过滤器状态
   */
  reset(): void {
    this.noiseFloor = -60;
    this.recentPeaks = [];
    this.recentValues = [];
    this.lastTriggerTime = 0;
  }
}

/**
 * 组合过滤器
 * 可以同时使用多个过滤器，提高准确性
 */
export class CombinedFilter {
  private smartFilter = new SmartMeowFilter();
  private adaptiveThreshold = new AdaptiveThreshold();
  
  /**
   * 使用指定的过滤器检查
   * @param metering 当前振幅值
   * @param filterType 过滤器类型：'smart' | 'adaptive' | 'both'
   */
  shouldTrigger(metering: number, filterType: 'smart' | 'adaptive' | 'both' = 'both'): boolean {
    switch (filterType) {
      case 'smart':
        return this.smartFilter.shouldTriggerDetection(metering);
      
      case 'adaptive':
        return this.adaptiveThreshold.updateAndCheck(metering);
      
      case 'both':
        // 两个过滤器都通过才触发（更严格）
        const smartResult = this.smartFilter.shouldTriggerDetection(metering);
        const adaptiveResult = this.adaptiveThreshold.updateAndCheck(metering);
        return smartResult && adaptiveResult;
      
      default:
        return false;
    }
  }
  
  /**
   * 获取过滤器状态
   */
  getStatus() {
    return {
      adaptive: this.adaptiveThreshold.getStatus()
    };
  }
  
  /**
   * 重置所有过滤器
   */
  reset(): void {
    this.smartFilter.reset();
    this.adaptiveThreshold.reset();
  }
}
