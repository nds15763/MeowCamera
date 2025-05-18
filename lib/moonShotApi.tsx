import { OpenAI } from 'openai';
import { AudioFeatures } from '../types/audioTypes';
import { ApiResponse, MeowAIModelResponse } from '../types/meowTypes';


/**
 * MoonShot API服务类
 * 用于调用MoonShot大模型进行图像分析
 */
export class MoonShotService {
  private static requestQueue: {
    fn: () => Promise<MeowAIModelResponse>;
    resolve: (value: MeowAIModelResponse) => void;
    reject: (reason?: any) => void;
  }[] = [];
  private static isProcessing = false;
  private static interval = 4000; // 增加到 4 秒，减少频率限制错误
  private static queueTimer: number | null = null;

  private static startQueue() {
    if (!MoonShotService.queueTimer) {
      MoonShotService.queueTimer = setInterval(async () => {
        if (MoonShotService.requestQueue.length === 0) return;
        console.log(`处理请求队列，当前请求队列数量: ${MoonShotService.requestQueue.length}`);
        
        const { fn, resolve, reject } = MoonShotService.requestQueue.shift()!;
        try {
          // 添加日志，便于分析API调用频率
          console.log(`API请求开始时间: ${new Date().toISOString()}`);
          const result = await fn();
          console.log(`API请求成功结束时间: ${new Date().toISOString()}`);
          resolve(result);
        } catch (err) {
          console.error(`API请求失败时间: ${new Date().toISOString()}`, err);
          // 记录错误详情以分析频率限制问题
          // Define a type to handle API errors
          interface ApiErrorResponse {
            response: {
              status: number;
              data: any;
            }
          }
          
          // Check if err matches our expected API error structure
          function isApiError(err: unknown): err is ApiErrorResponse {
            return Boolean(
              err && 
              typeof err === 'object' && 
              'response' in err && 
              err.response && 
              typeof err.response === 'object' && 
              'status' in err.response && 
              'data' in err.response
            );
          }
          
          if (isApiError(err)) {
            console.error(`状态码: ${err.response.status}, 消息: ${JSON.stringify(err.response.data)}`);
          }
          reject(err);
        }
      }, MoonShotService.interval);
    }
  }

  private static enqueue(fn: () => Promise<MeowAIModelResponse>): Promise<MeowAIModelResponse> {
    return new Promise<MeowAIModelResponse>((resolve, reject) => {
      MoonShotService.requestQueue.push({ fn, resolve, reject });
      MoonShotService.startQueue();
    });
  }
  private apiKey: string;
  private baseUrl: string;
  private client: OpenAI;
  private lastCallTime: number = 0; // 记录上一次调用时间
  private minCallInterval: number = 3000; // 最小调用间隔，单位毫秒

  /**
   * 构造函数
   * @param apiKey MoonShot API密钥
   * @param baseUrl API基础URL
   */
  constructor(apiKey?: string, baseUrl?: string) {
    // 如果没有提供API密钥，可以尝试从环境变量获取
    this.apiKey = apiKey ||  'sk-r4sVBNCVkOHXDn6mpgDBbYs1qnTIfSfO2twFwWM0JCT23OdJ';
    this.baseUrl = baseUrl || 'https://api.moonshot.cn/v1';

    if (!this.apiKey) {
      console.warn('警告: MoonShot API密钥未设置，请确保在使用前设置API密钥');
    }

    // 初始化OpenAI客户端
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl
    });
  }

  /**
   * 设置API密钥
   * @param apiKey MoonShot API密钥
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    // 更新客户端API密钥
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl
    });
  }


  /**
   * 使用自定义提示词分析图像和音频特征
   * @param imageBase64 图像的base64编码
   * @param audioFeatures 音频特征
   * @param systemPrompt 系统提示词
   * @param userPrompt 用户提示词
   * @param contextData 上下文数据（可选）
   * @returns 分析结果
   */
  async analyzeWithCustomPrompt(
    imageBase64: string,
    audioFeatures: AudioFeatures,
    systemPrompt: string,
    userPrompt: string,
    contextData?: any
  ): Promise<ApiResponse> {
    // 队列包裹，保证串行和限速
    return MoonShotService.enqueue(() => this._analyzeWithCustomPrompt(imageBase64, audioFeatures, systemPrompt, userPrompt, contextData));
  }
  
  /**
   * 分析猫叫声和图像
   * @param imageBase64 图像的base64编码
   * @param audioFeatures 音频特征
   * @returns 分析结果
   */
  async analyzeMeow(
    imageBase64: string,
    audioFeatures: AudioFeatures
  ): Promise<ApiResponse> {
    
    // 为猫叫分析定制的系统提示词
    const systemPrompt = `你是一个专门分析猫咪的AI助手。你需要分析提供的图像和音频特征，判断图像中是否有猫咪，并给出相应分析。
如果图像中有猫咪，请根据猫咪的外貌特征、品种习性、所处环境、猜测猫咪最有可能的情绪状态，以及它最有可能想表达的含义，用拟人的口吻说一句短语，用英语`
    
    // 用户提示词，包含音频特征数据
    const userPrompt = `请分析这张图片，判断是否有猫咪，并结合以下音频特征数据进行分析：
音量(RMS): ${audioFeatures.amplitude?.toFixed(4)}
频谱中心: ${audioFeatures.spectralCentroidMean?.toFixed(2)} Hz
零交叉率: ${audioFeatures.zeroCrossingRateMean?.toFixed(4)}
音高: ${audioFeatures.pitchMean?.toFixed(2)} Hz

请分析并给出以下JSON格式的回复：
{
  "is_meow": true/false, // 图片中是否有猫咪
  "most_likely_meaning":"" // 最可能想表达的情感，一句短语
  "confidence":0.xx // 本次判断的置信度
}`;
    
    // 调用通用分析方法
    return this.analyzeWithCustomPrompt(imageBase64, audioFeatures, systemPrompt, userPrompt);
  }
  

  /**
   * 使用自定义提示词的API调用逻辑（私有）
   */
  private async _analyzeWithCustomPrompt(
    imageBase64: string,
    audioFeatures: AudioFeatures,
    systemPrompt: string,
    userPrompt: string,
    contextData?: any
  ): Promise<ApiResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('MoonShot API密钥未设置');
      }

      // 检查imageBase64的格式
      let imageUrl = '';
      if (imageBase64.startsWith('data:image/')) {
        imageUrl = imageBase64;
      } else {
        imageUrl = `data:image/jpeg;base64,${imageBase64}`;
      }
      
      // 使用OpenAI SDK调用MoonShot API
      const completion = await this.client.chat.completions.create({
        model: "moonshot-v1-8k-vision-preview", // 使用视觉模型
        messages: [
          {
            "role": "system",
            "content": systemPrompt
          },
          {
            "role": "user",
            "content": [
              {
                "type": "image_url",
                "image_url": {
                  "url": imageUrl,
                }
              },
              {
                "type": "text",
                "text": userPrompt
              }
            ]
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      // 返回处理后的结果
      try {
        console.log('completion:',completion)
        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('API返回结果为空');
        }

        // 解析JSON结果
        const rawResult = JSON.parse(content);
        console.log('API原始响应结果:', rawResult);
        
        // 确保返回结果符合MeowAIModelResponse接口
        const formattedResult: MeowAIModelResponse = {
          is_meow: rawResult.is_meow ?? false,
          most_likely_meaning: rawResult.most_likely_meaning ?? "",
          confidence: rawResult.confidence || 0.5
        };
        
        console.log('格式化后的响应结果:', formattedResult);
        return formattedResult;
      } catch (error) {
        console.error('解析API返回结果失败:', error);
        throw error;
      }
    } catch (error) {
      console.error('API调用失败:', error);
      throw error;
    }
  }
}

// 创建一个MoonShotService实例并导出，方便直接使用
export const moonShotApi = new MoonShotService();
