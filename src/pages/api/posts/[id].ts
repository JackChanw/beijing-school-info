// GET /api/posts/[id] — 获取帖子详情（含 AI 回复）
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  if (!env?.DB) return Response.json({ error: '服务暂不可用' }, { status: 503 });

  const id = Number(params.id);
  if (!id || isNaN(id)) return Response.json({ error: '无效的帖子ID' }, { status: 400 });

  const post = await env.DB.prepare(
    `SELECT id, title, content, district, status, created_at FROM posts WHERE id = ?`
  ).bind(id).first();

  if (!post) return Response.json({ error: '帖子不存在' }, { status: 404 });

  const reply = await env.DB.prepare(
    `SELECT content, model, used_search, created_at FROM replies WHERE post_id = ? LIMIT 1`
  ).bind(id).first();

  return Response.json({ post, reply: reply || null });
};
