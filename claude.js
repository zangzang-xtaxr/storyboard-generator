/**
 * Claude API 集成模块
 * 用于分镜脚本生成
 */

const Anthropic = require('@anthropic-ai/sdk');

// 初始化 Anthropic 客户端（懒加载）
let anthropicClient = null;

function getClient() {
  if (!anthropicClient) {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey || apiKey === 'test_key') {
      throw new Error('CLAUDE_API_KEY 未配置，请在 .env 文件中设置有效的 Claude API Key');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * 检查 Claude API 是否可用
 * @returns {{ available: boolean, reason?: string }}
 */
function checkClaudeAvailability() {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey || apiKey === 'test_key') {
    return { available: false, reason: 'CLAUDE_API_KEY 未设置或仍为默认测试值，将使用本地规则解析' };
  }
  return { available: true };
}

/**
 * 使用 Claude API 将剧情脚本解析为结构化分镜场景列表
 * @param {string} scriptContent - 用户输入的剧情脚本文本
 * @returns {Promise<Array>} - 结构化的场景数组
 */
async function generateStoryboardWithClaude(scriptContent) {
  const client = getClient();

  const systemPrompt = `你是一位专业的影视分镜导演，擅长将剧情脚本拆解为详细的分镜脚本。
请将用户提供的剧情内容解析为结构化的分镜场景列表。

每个场景必须包含以下字段，以纯 JSON 数组格式返回，不要包含任何 Markdown 标记、代码块或其他文字：
- id: 场景唯一ID，格式为 "scene-N"（N从1开始）
- sceneNumber: 场景编号（整数）
- location: 拍摄地点/场景环境（如"室内-卧室-白天"）
- description: 场景的视觉描述，描述画面内容（50字以内）
- action: 人物动作或画面动态描述（30字以内）
- camera: 镜头类型，从以下选项中选一个：全景、中景、近景、特写、大特写、俯视、仰视、移动镜头
- duration: 建议时长（秒，整数，范围2-10）
- characters: 出现的角色名称数组（如 ["主角", "配角A"]，无角色则为空数组）
- dialogue: 该场景的对白内容（无对白则为空字符串）
- notes: 导演备注或特殊拍摄要求（无则为空字符串）

示例输出格式：
[
  {
    "id": "scene-1",
    "sceneNumber": 1,
    "location": "室外-街道-白天",
    "description": "主角站在繁忙的街头，神情迷茫地看着来往的人群",
    "action": "主角缓缓转身，目光锁定远处的咖啡馆",
    "camera": "中景",
    "duration": 4,
    "characters": ["主角"],
    "dialogue": "",
    "notes": "光线柔和，营造孤独感"
  }
]`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `请将以下剧情脚本解析为分镜场景列表：\n\n${scriptContent}`
      }
    ],
    system: systemPrompt
  });

  const rawText = response.content[0].text.trim();

  // 去除可能的 Markdown 代码块包裹
  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let scenes;
  try {
    scenes = JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Claude 返回内容无法解析为 JSON:', rawText.substring(0, 200));
    throw new Error('Claude 返回格式异常，无法解析分镜脚本');
  }

  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('Claude 返回的场景列表为空或格式不正确');
  }

  // 标准化每个场景，补全缺失字段
  return scenes.map((scene, idx) => ({
    id: scene.id || `scene-${idx + 1}`,
    sceneNumber: scene.sceneNumber || idx + 1,
    location: scene.location || `场景 ${idx + 1}`,
    description: scene.description || '',
    action: scene.action || '',
    camera: scene.camera || '中景',
    duration: typeof scene.duration === 'number' ? scene.duration : 3,
    characters: Array.isArray(scene.characters) ? scene.characters : [],
    dialogue: scene.dialogue || '',
    notes: scene.notes || ''
  }));
}

module.exports = { generateStoryboardWithClaude, checkClaudeAvailability };
