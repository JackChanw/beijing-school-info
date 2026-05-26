// POST /api/posts — 发布新帖子
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env;
  if (!env?.DB) {
    return Response.json({ error: '服务暂不可用' }, { status: 503 });
  }

  // 频率限制：同一 IP 每小时最多 5 次
  const ip = request.headers.get('CF-Connecting-IP') ||
              request.headers.get('X-Forwarded-For') || 'unknown';
  const ipHash = await hashIp(ip);

  const rateLimitOk = await checkRateLimit(env.DB, ipHash);
  if (!rateLimitOk) {
    return Response.json(
      { error: '发帖过于频繁，请1小时后再试' },
      { status: 429 }
    );
  }

  // 解析请求体
  let body: { title?: string; content?: string; district?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 });
  }

  const { title, content, district } = body;
  if (!title?.trim() || !content?.trim()) {
    return Response.json({ error: '标题和内容不能为空' }, { status: 400 });
  }
  if (title.length > 100) {
    return Response.json({ error: '标题不能超过100字' }, { status: 400 });
  }
  if (content.length > 2000) {
    return Response.json({ error: '内容不能超过2000字' }, { status: 400 });
  }

  // 写入 D1
  const result = await env.DB.prepare(
    `INSERT INTO posts (title, content, district, ip_hash) VALUES (?, ?, ?, ?) RETURNING id`
  ).bind(title.trim(), content.trim(), district || null, ipHash).first<{ id: number }>();

  if (!result) {
    return Response.json({ error: '发帖失败，请重试' }, { status: 500 });
  }

  // 推送到队列触发 AI 回复
  if (env.AI_QUEUE) {
    await env.AI_QUEUE.send({ postId: result.id });
  }

  return Response.json({ success: true, postId: result.id }, { status: 201 });
};

// ── 工具函数 ────────────────────────────────────────────

async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

async function checkRateLimit(db: any, ipHash: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 3600 * 1000).toISOString();

  // 清理过期记录
  await db.prepare(`DELETE FROM rate_limits WHERE window_start < ?`).bind(windowStart).run();

  const row = await db.prepare(
    `SELECT count FROM rate_limits WHERE ip_hash = ? AND window_start >= ?`
  ).bind(ipHash, windowStart).first<{ count: number }>();

  if (!row) {
    await db.prepare(`INSERT INTO rate_limits (ip_hash) VALUES (?)`).bind(ipHash).run();
    return true;
  }
  if (row.count >= 5) return false;

  await db.prepare(
    `UPDATE rate_limits SET count = count + 1 WHERE ip_hash = ?`
  ).bind(ipHash).run();
  return true;
}
