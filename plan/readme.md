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
