/**
 * AI Reply Worker — Cloudflare Queue Consumer
 * 从队列接收 postId，调用 relay API 生成回复，写回 D1
 */
import OpenAI from 'openai';
import { SYSTEM_PROMPT } from '../src/lib/knowledge';

interface Env {
  DB: D1Database;
  AI_QUEUE: Queue;
  RELAY_BASE_URL: string;
  RELAY_MODEL: string;
  RELAY_API_KEY: string;
  TAVILY_API_KEY: string;
}

interface QueueMessage {
  postId: number;
}

export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await processPost(msg.body.postId, env);
        msg.ack();
      } catch (err) {
        console.error(`Failed to process post ${msg.body.postId}:`, err);
        msg.retry();
      }
    }
  },
};

async function processPost(postId: number, env: Env): Promise<void> {
  // 1. 获取帖子内容
  const post = await env.DB.prepare(
    `SELECT id, title, content, district FROM posts WHERE id = ? AND status = 'pending'`
  ).bind(postId).first<{ id: number; title: string; content: string; district: string | null }>();

  if (!post) return; // 已处理或不存在

  // 2. 构建用户问题
  const userQuestion = post.district
    ? `[${post.district}] ${post.title}\n\n${post.content}`
    : `${post.title}\n\n${post.content}`;

  // 3. 联网搜索（Tavily）
  let searchContext = '';
  let usedSearch = false;
  if (env.TAVILY_API_KEY) {
    try {
      searchContext = await tavilySearch(post.title, env.TAVILY_API_KEY);
      usedSearch = !!searchContext;
    } catch (err) {
      console.warn('Tavily search failed, falling back to knowledge base only:', err);
    }
  }

  // 4. 调用 relay API
  const client = new OpenAI({
    apiKey: env.RELAY_API_KEY,
    baseURL: env.RELAY_BASE_URL,
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  if (searchContext) {
    messages.push({
      role: 'system',
      content: `以下是最新的网络搜索结果，供参考：\n\n${searchContext}`,
    });
  }

  messages.push({ role: 'user', content: userQuestion });

  const completion = await client.chat.completions.create({
    model: env.RELAY_MODEL || 'claude-sonnet-4-6',
    messages,
    max_tokens: 1500,
  });

  const replyContent = completion.choices[0]?.message?.content;
  if (!replyContent) throw new Error('Empty response from AI');

  // 5. 写回 D1
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO replies (post_id, content, model, used_search) VALUES (?, ?, ?, ?)`
    ).bind(postId, replyContent, env.RELAY_MODEL, usedSearch ? 1 : 0),

    env.DB.prepare(
      `UPDATE posts SET status = 'answered', updated_at = datetime('now') WHERE id = ?`
    ).bind(postId),
  ]);
}

// ── Tavily 搜索 ─────────────────────────────────────────

async function tavilySearch(query: string, apiKey: string): Promise<string> {
  const resp = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: `北京幼升小 ${query}`,
      search_depth: 'basic',
      max_results: 3,
      include_answer: true,
    }),
  });

  if (!resp.ok) throw new Error(`Tavily error: ${resp.status}`);

  const data = await resp.json() as {
    answer?: string;
    results?: Array<{ title: string; content: string; url: string }>;
  };

  const parts: string[] = [];
  if (data.answer) parts.push(`搜索摘要：${data.answer}`);
  if (data.results?.length) {
    parts.push(
      ...data.results.map(r => `来源：${r.title}\n${r.content.slice(0, 300)}`)
    );
  }

  return parts.join('\n\n');
}
