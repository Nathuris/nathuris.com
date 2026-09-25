#!/usr/bin/env node
/**
 * 把上传目录里过大的图片压小。
 *
 * 规则（和之前手工压缩用的是同一套参数）：
 *   - 只有超过 500KB 的图才处理，小图一律不动
 *   - 长边最大 1200 像素，等比缩放，不放大
 *   - 不带透明通道的图转成 JPEG，质量 88
 *   - 带透明通道的图保持 PNG（转 JPEG 会丢掉透明背景）
 *
 * 用法：
 *   node scripts/compress-uploads.mjs                 扫描整个 public/uploads
 *   node scripts/compress-uploads.mjs 文件1 文件2 ...  只处理指定的文件
 *
 * 输出：把改动写回磁盘，并打印一份清单。
 */

import { readFile, writeFile, stat, unlink, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// 图片处理库没有写进项目依赖（免得拖慢网站构建），用之前先临时装一下
let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('缺少图片处理库，请先运行：npm install sharp --no-save');
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, '..');
const UPLOAD_DIR = path.join(ROOT, 'public', 'uploads');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');

const THRESHOLD = 500 * 1024; // 500KB
const MAX_EDGE = 1200;
const QUALITY = 88;

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/** 把一个文件压小，返回结果说明；不需要处理时返回 null */
async function compressFile(filePath) {
  const before = (await stat(filePath)).size;
  if (before <= THRESHOLD) return null;

  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXT.has(ext)) return null;

  const inputBuffer = await readFile(filePath);
  const meta = await sharp(inputBuffer).metadata();

  // 云端导出的 PNG 常带一个没用的 alpha 通道，这里判断「是否真的有透明像素」
  let hasRealAlpha = false;
  if (meta.hasAlpha) {
    const stats = await sharp(inputBuffer).stats();
    hasRealAlpha = stats.channels[3]?.min < 255;
  }

  const pipeline = sharp(inputBuffer).resize({
    width: MAX_EDGE,
    height: MAX_EDGE,
    fit: 'inside',
    withoutEnlargement: true,
  });

  let outPath;
  let outBuffer;

  if (hasRealAlpha) {
    // 保留透明：仍用 PNG，只缩小尺寸
    outBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    outPath = filePath;
  } else {
    // 照片类：转 JPEG
    outBuffer = await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    outPath = filePath.replace(/\.(png|webp)$/i, '.jpg');
  }

  // 压完反而更大就别动它
  if (outBuffer.length >= before) return null;

  await writeFile(outPath, outBuffer);

  const renamed = outPath !== filePath;
  if (renamed) await unlink(filePath);

  return {
    from: path.relative(ROOT, filePath),
    to: path.relative(ROOT, outPath),
    before,
    after: outBuffer.length,
    renamed,
  };
}

/** 图片改了扩展名时，同步改掉内容文件里的引用 */
async function updateReferences(renamePairs) {
  if (renamePairs.length === 0) return 0;

  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(md|mdx|yaml|yml)$/i.test(entry.name)) files.push(full);
    }
  }
  await walk(CONTENT_DIR);

  let changed = 0;
  for (const file of files) {
    const original = await readFile(file, 'utf8');
    let updated = original;
    for (const [oldName, newName] of renamePairs) {
      updated = updated.split(`/uploads/${oldName}`).join(`/uploads/${newName}`);
    }
    if (updated !== original) {
      await writeFile(file, updated);
      changed++;
    }
  }
  return changed;
}

async function main() {
  const args = process.argv.slice(2);

  let targets;
  if (args.length > 0) {
    targets = args.map((a) => path.resolve(ROOT, a)).filter((p) => existsSync(p));
  } else {
    const names = await readdir(UPLOAD_DIR);
    targets = names.map((n) => path.join(UPLOAD_DIR, n));
  }

  const results = [];
  for (const file of targets) {
    try {
      const r = await compressFile(file);
      if (r) results.push(r);
    } catch (err) {
      console.error(`处理失败：${path.basename(file)} — ${err.message}`);
    }
  }

  if (results.length === 0) {
    console.log('没有需要压缩的图片（没有超过 500KB 的）。');
    return;
  }

  const renamePairs = results
    .filter((r) => r.renamed)
    .map((r) => [path.basename(r.from), path.basename(r.to)]);
  const refChanges = await updateReferences(renamePairs);

  console.log(`已压缩 ${results.length} 张图片：\n`);
  let beforeTotal = 0;
  let afterTotal = 0;
  for (const r of results) {
    beforeTotal += r.before;
    afterTotal += r.after;
    console.log(
      `  ${path.basename(r.from)}  ${(r.before / 1048576).toFixed(1)}MB → ` +
        `${(r.after / 1024).toFixed(0)}KB` +
        (r.renamed ? '  （已转成 JPEG）' : '')
    );
  }
  console.log(
    `\n合计 ${(beforeTotal / 1048576).toFixed(1)}MB → ${(afterTotal / 1048576).toFixed(1)}MB，` +
      `缩小 ${(100 - (afterTotal / beforeTotal) * 100).toFixed(0)}%`
  );
  if (refChanges > 0) console.log(`同步更新了 ${refChanges} 个内容文件里的图片引用。`);
}

main();
