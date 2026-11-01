import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(path.join(root, "index.html"), "utf8");

test("index.html tham chiếu đúng asset tách ra (viewer.js, style.css)", () => {
  for (const f of ["viewer.js", "style.css"]) {
    assert.ok(existsSync(path.join(root, f)), `thiếu file ${f}`);
    assert.ok(html.includes(f), `index.html không tham chiếu ${f}`);
  }
  assert.match(html, /<script\s+type="module"\s+src="viewer\.js">/);
  assert.match(html, /<link\s+rel="stylesheet"\s+href="style\.css">/);
});

test("importmap three vẫn nằm trong index.html (trước viewer.js)", () => {
  assert.match(html, /type="importmap"/);
  assert.match(html, /three@[\d.]+\/build\/three\.module\.js/);
  assert.ok(html.indexOf("importmap") < html.indexOf("viewer.js"),
    "importmap phải xuất hiện trước script viewer.js");
});

test("model mặc định my-room.glb tồn tại và được viewer load", () => {
  assert.ok(existsSync(path.join(root, "my-room.glb")), "thiếu my-room.glb");
  const js = readFileSync(path.join(root, "viewer.js"), "utf8");
  assert.match(js, /my-room\.glb/);
});

test("viewer.js pass node --check", () => {
  execFileSync(process.execPath, ["--check", path.join(root, "viewer.js")]);
});

test("các asset local được tham chiếu trong HTML đều tồn tại", () => {
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !/^(https?:)?\/\//.test(u) && !u.startsWith("data:") && !u.startsWith("/"))
    .filter((u) => /\.[a-z0-9]+$/i.test(u.split("?")[0]));
  assert.ok(refs.length > 0, "index.html phải tham chiếu ít nhất một asset local");
  for (const ref of refs) {
    const p = path.join(root, decodeURIComponent(ref.split("?")[0]));
    assert.ok(existsSync(p), `thiếu asset "${ref}"`);
  }
});

test("viewer xử lý WebGL context loss", () => {
  const js = readFileSync(path.join(root, "viewer.js"), "utf8");
  assert.match(js, /webglcontextlost/);
  assert.match(js, /webglcontextrestored/);
  assert.match(js, /preventDefault\(\)/);
});
