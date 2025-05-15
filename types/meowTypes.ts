
/**
 * 通用API响应格式
 */
export interface ApiResponse {
    [key: string]: any;
}

/**
 * 定义MeowAIModelResponse接口
 */
export interface MeowEmotion {
    emotion: string; // 表示的情感
    confidence: number; // 置信度，0-1范围
}

export interface MeowAIModelResponse {
    is_meow?: boolean; // 是否有猫叫
    most_likely_meaning?: string; // 最可能的意思
    confidence?: number; //置信度
}
