-- 帖子表
CREATE TABLE IF NOT EXISTS posts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT    NOT NULL,
  content   TEXT    NOT NULL,
  district  TEXT,                          -- '昌平区' | '海淀区' | NULL(通用)
  status    TEXT    NOT NULL DEFAULT 'pending', -- 'pending' | 'answered' | 'failed'
  ip_hash   TEXT,                          -- 用于频率限制（哈希后的IP）
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- AI 回复表
CREATE TABLE IF NOT EXISTS replies (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES posts(id),
  content    TEXT    NOT NULL,
  model      TEXT,                         -- 使用的模型名
  used_search INTEGER NOT NULL DEFAULT 0, -- 是否用了联网搜索
  created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- 频率限制表（按 ip_hash，每小时清理）
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash    TEXT    NOT NULL,
  count      INTEGER NOT NULL DEFAULT 1,
  window_start DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_post ON replies(post_id);
CREATE INDEX IF NOT EXISTS idx_rate_ip ON rate_limits(ip_hash);
