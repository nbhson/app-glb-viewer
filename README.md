# GLB Viewer

WebGL 3D model viewer dùng [Three.js](https://threejs.org/) (ES modules qua importmap — không cần build step).

## Tính năng

- Load file `my-room.glb` (đặt cùng thư mục `index.html`)
- Orbit / zoom / pan (OrbitControls, có damping)
- Auto-rotate toggle, reset view
- Hiển thị số mesh + số triangle của model
- Starfield + nebula background

## Chạy local

```bash
# Cần HTTP server vì ES modules không chạy qua file://
python3 -m http.server 8080
# mở http://localhost:8080
```

## Cấu trúc

```
index.html    — toàn bộ app (HTML + CSS + JS inline, Three.js từ CDN)
my-room.glb   — model mẫu
```

## Ghi chú kỹ thuật

- Three.js `0.170.0` load từ jsdelivr qua importmap; cần browser hiện đại hỗ trợ import maps (Chrome 89+, Safari 16.4+, Firefox 108+).
- Camera tự căn khoảng cách theo bounding box của model (`centerModel`); vị trí ban đầu được lưu lại cho nút "Reset view".
- Error loading model hiển thị bằng DOM API (không dùng innerHTML với dữ liệu động).
- Đổi model: sửa hằng `modelPath` trong `index.html`.
