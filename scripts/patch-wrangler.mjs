#!/usr/bin/env node
/**
 * 构建后修复 dist/server/wrangler.json：
 * 1. ASSETS binding 名称冲突 → 改为 CF_ASSETS
 * 2. 移除 queues.consumers（主 Worker 没有 queue handler，消费者由单独 Worker 处理）
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
  console.log('✅ Patched ASSETS binding → CF_ASSETS');
}

if (config.queues?.consumers?.length) {
  delete config.queues.consumers;
  console.log('✅ Removed queues.consumers from main Worker config');
}

writeFileSync(path, JSON.stringify(config));
