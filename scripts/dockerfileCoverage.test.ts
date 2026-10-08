import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Image production chỉ chứa những gì Dockerfile `COPY`. Server import thêm thư mục top-level
 * mà thiếu COPY → container crash `ERR_MODULE_NOT_FOUND` (sự cố `constants/` 10/2026).
 * Test lần theo import runtime (bỏ `import type`) từ entry của `npm start`.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRIES = ['server.ts', 'server/instrument.ts'];

function resolveImport(fromFile: string, spec: string): string | null {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && !candidate.endsWith(path.sep) && path.extname(candidate)) return candidate;
  }
  return null;
}

function runtimeRelativeImports(source: string): string[] {
  const specs: string[] = [];
  const staticImport = /^\s*(import|export)\s+(?!type\b)[^'"]*?from\s+['"](\.[^'"]+)['"]/gm;
  const sideEffectImport = /^\s*import\s+['"](\.[^'"]+)['"]/gm;
  const dynamicImport = /import\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  for (const m of source.matchAll(staticImport)) specs.push(m[2]);
  for (const m of source.matchAll(sideEffectImport)) specs.push(m[1]);
  for (const m of source.matchAll(dynamicImport)) specs.push(m[1]);
  return specs;
}

/** Thư mục top-level (hoặc file ở root) mà server nạp lúc chạy. */
function collectRuntimeTopLevelPaths(): Set<string> {
  const seen = new Set<string>();
  const queue = ENTRIES.map((entry) => path.join(ROOT, entry));
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of runtimeRelativeImports(readFileSync(file, 'utf8'))) {
      const resolved = resolveImport(file, spec);
      assert.ok(resolved, `cannot resolve '${spec}' imported from ${path.relative(ROOT, file)}`);
      queue.push(resolved);
    }
  }
  return new Set([...seen].map((file) => path.relative(ROOT, file).split(path.sep)[0]));
}

/** Nguồn của các lệnh COPY (không tính `--from=`) trong stage production. */
function productionCopySources(dockerfile: string): Set<string> {
  const stage = dockerfile.split(/^FROM\s.+\sAS\s+production\s*$/im)[1];
  assert.ok(stage, 'Dockerfile has no "AS production" stage');
  const sources = new Set<string>();
  for (const m of stage.matchAll(/^COPY\s+(?!--from)(.+)$/gm)) {
    const parts = m[1].trim().split(/\s+/);
    for (const src of parts.slice(0, -1)) sources.add(src.replace(/^\.\//, '').replace(/\/$/, ''));
  }
  return sources;
}

describe('Dockerfile production stage', () => {
  it('copies every top-level path the server loads at runtime', () => {
    const needed = collectRuntimeTopLevelPaths();
    const copied = productionCopySources(readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8'));
    const missing = [...needed].filter((p) => !copied.has(p)).sort();
    assert.deepEqual(missing, [], `Dockerfile is missing COPY for: ${missing.join(', ')}`);
  });
});
