/**
 * 情绪类型定义
 */
export interface Emotion {
  id: string;
  categoryId: string;  // 关联的情感类别ID
  title: string;       // 情感标题
  description: string; // 情感描述
  icon: string;        // 表情图标
  audioFiles?: any[];  // 相关音频文件
}

/**
 * 情绪分类定义
 */
export interface EmotionCategory {
  id: string;          // 类别ID
  title: string;       // 类别标题
  description: string; // 类别描述
  emotions?: Emotion[]; // 该类别下的情感列表
}
