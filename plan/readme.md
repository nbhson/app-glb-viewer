# Plan — app-glb-viewer

> 3D GLB viewer dùng Three.js (importmap ESM từ CDN). Single-page, không build step.

## Kết quả Review (audit đợt 1)

| # | Severity | Vị trí | Vấn đề | Fix |
|---|----------|--------|--------|-----|
| 1 | CRITICAL | index.html:146-148 | `bigGeo`, `positions`, `colors` chưa khai báo → ReferenceError crash ngay khi init | Xóa block mồ côi |
| 2 | MAJOR | index.html:246-250 | `centerModel` chỉ set `camera.position.z` rồi `resetView` gọi `controls.reset()` → camera "đánh nhau" với OrbitControls, reset view sai | Lưu `initialCameraPos`, restore camera + target |
| 3 | MAJOR | index.html:196 | Resize handler không throttle → layout thrash | rAF throttle |
| 4 | MINOR | index.html:234 | innerHTML + nối chuỗi `modelPath` — pattern rủi ro XSS | Dùng createElement/textContent |
| 5 | MINOR | index.html:6,96 | Title generic; `fileName` hardcode trùng JS | Set từ JS, title cụ thể |
| 6 | MINOR | head | Thiếu meta description, favicon, theme-color | Bổ sung |
| 7 | MINOR | index.html:144 | Starfield 10k điểm chạy sync trên main thread + màu gần như vô hình | Giảm còn 4k điểm, tăng độ tương phản nhẹ |

## Trạng thái

- [x] Plan
- [x] Fix #1–#7
- [x] Commit + self-review

## Review Log

### Vòng 1 (fix toàn bộ)
- Commit: `fix: remove orphaned starfield block (ReferenceError), fix reset view, harden error UI`
- Self-review: đã kiểm tra logic camera reset — `initialCameraPos` được lưu sau khi centerModel định vị camera; `resetView` restore position + target + update(). Không còn ReferencesError vì block 146-148 đã xóa. Đã xác nhận không còn innerHTML với dữ liệu động.

## Round 2 (2026-10-29)

### Findings (audit đợt 2)

| # | Severity | Vị trí | Vấn đề | Xử lý |
|---|----------|--------|--------|-------|
| 1 | FEATURE GAP | viewer | Chỉ 1 model hardcode `my-room.glb`, không cách nào xem file khác | Nút "📂 Open" + hidden file input + drag & drop .glb vào cửa sổ; load từ objectURL, revoke sau khi load xong/thay model |
| 2 | FEATURE GAP | viewer | Lighting cứng 1 cấu hình — model tối/nhòe tùy file | 3 env presets (Studio/Sunset/Night): đổi màu+nhiệt độ đèn, fog, exposure, màu grid |
| 3 | FEATURE GAP | viewer | Không chụp ảnh được khung nhìn | 📷 Screenshot: render sync rồi `toDataURL('image/png')` → download (không cần preserveDrawingBuffer) |
| 4 | MINOR | viewer | Không có grid/refERENCE sàn, không xem wireframe | Toggle ▦ Grid (GridHelper đặt ở đáy model bounding box) + ◫ Wireframe (guard material có wireframe) |
| 5 | MINOR | viewer | Không shortcut, không fullscreen | Phím R/G/W/P/F/Space (bỏ qua khi focus input/select) + nút ⛶ fullscreen |
| 6 | MINOR | loadModel | Load 1.3MB không feedback → trông như treo; sau khi lỗi, spinner bị xóa vĩnh viễn | Thanh progress % + dung lượng file (formatBytes) từ onProgress; khôi phục spinner khi load lại |
| 7 | BUG | loadModel | Load model mới không dispose model cũ → leak GPU memory khi đổi nhiều file | disposeModel(): remove + dispose geometry/material/texture; revoke objectURL cũ |
| 8 | BUG | traverse | `node.material.emissive` gán mù quáng — crash/vô nghĩa với MeshBasicMaterial hay material array | Guard `mat.emissive` tồn tại, xử lý cả material array |
| 9 | BUG | centerModel | `initialCameraPos` chỉ lưu lần đầu → sau khi mở model khác, Reset view quay về camera của model CŨ | Cập nhật `initialCameraPos` mỗi lần center |
| 10 | UX | mobile | Các nút button-row có thể tràn màn hình nhỏ | btn-row flex-wrap, nút nhỏ lại ở ≤768px; kbd hint + file size trong info panel |

### Trạng thái Round 2

- [x] Plan
- [x] Features: open local .glb (+ drag&drop), env presets, screenshot, grid/wireframe, fullscreen, keyboard shortcuts, progress bar
- [x] Bugs: dispose model cũ, emissive guard, initialCameraPos theo model mới
- [x] Verify: extract inline module → `node --check` pass; check toàn bộ `$('id')` đều tồn tại trong HTML
- [x] Commit + self-review

### Verify Log
- `node --check` trên extracted module script → OK.
- Cross-check id giữa JS và HTML (screenshot: python regex) → không thiếu id nào.
- WebGL runtime không chạy được headless trong môi trường này → đã rà logic bằng tay: applyEnvPreset chỉ chạy sau khi lights/grid khởi tạo trong init() (gọi cuối init), loadModelFromURL được gọi sau applyEnvPreset.
