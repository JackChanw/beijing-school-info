// GET /api/posts/list — 获取帖子列表（分页）
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const env = (locals as any).runtime?.env;
  if (!env?.DB) return Response.json({ error: '服务暂不可用' }, { status: 503 });

  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const limit = 20;
  const offset = (page - 1) * limit;
  const district = url.searchParams.get('district') || null;

  const whereClause = district ? `WHERE district = ?` : '';
  const binds = district ? [district, limit, offset] : [limit, offset];

  const posts = await env.DB.prepare(
    `SELECT p.id, p.title, p.district, p.status, p.created_at,
            r.content as reply_preview
     FROM posts p
     LEFT JOIN replies r ON r.post_id = p.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...binds).all();

  const total = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM posts ${whereClause}`
  ).bind(...(district ? [district] : [])).first<{ cnt: number }>();

  return Response.json({
    posts: posts.results,
    total: total?.cnt || 0,
    page,
    totalPages: Math.ceil((total?.cnt || 0) / limit),
  });
};
