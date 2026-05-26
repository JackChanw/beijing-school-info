#!/usr/bin/env node
/**
 * 构建后修复 dist/server/wrangler.json 中的 ASSETS binding 名称冲突
 * @astrojs/cloudflare 生成的 ASSETS 是 Pages 保留名，需要改掉
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const path = 'dist/server/wrangler.json';

if (!existsSync(path)) {
  console.log('wrangler.json not found, skipping patch');
  process.exit(0);
}

const config = JSON.parse(readFileSync(path, 'utf-8'));

if (config.assets?.binding === 'ASSETS') {
  config.assets.binding = 'CF_ASSETS';
  writeFileSync(path, JSON.stringify(config));
  console.log('✅ Patched ASSETS binding → CF_ASSETS');
} else {
  console.log('No patch needed');
}
