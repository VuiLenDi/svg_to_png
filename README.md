# Vector Studio: SVG to PNG

Ứng dụng web tiếng Việt để dán hoặc kéo-thả SVG, đổi màu fill/viền, xem trước và tải PNG. Ảnh được xử lý tại trình duyệt, không gửi lên máy chủ.

## Chạy

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```sh
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal (mặc định http://localhost:5173).

```sh
npm run check
npm run build
npm run preview
```

## Sử dụng

1. Dán mã SVG hoặc chọn/kéo-thả file `.svg` (tối đa 2 MB).
2. Bật màu fill hoặc màu viền rồi chọn màu hoặc nhập mã `#RRGGBB`.
3. Chọn kích thước PNG; nút liên kết bật/tắt giữ tỷ lệ. Bỏ chọn nền trong suốt để chọn màu nền.
4. Bấm **Chuyển đổi & tải PNG**.

## Giới hạn

- Tối đa 8192 px mỗi chiều và 16 megapixel tổng diện tích.
- Ghi đè fill giữ lại các vùng `fill="none"`; ghi đè viền áp dụng cho các hình và chữ, kể cả hình chưa có viền.
- PNG giữ tỷ lệ nội dung theo thiết lập `preserveAspectRatio` của SVG.
- Script, animation, `foreignObject` và tài nguyên bên ngoài được loại bỏ. SVG cần tự chứa hình vector; ảnh nhúng và font ngoài không được hỗ trợ. Chữ dùng font sẵn có trên máy.
- Google Fonts chỉ dùng cho giao diện; khi không có mạng, ứng dụng dùng font dự phòng. Không có dữ liệu SVG gửi tới dịch vụ này.
- Stack: JavaScript, Vite, DOMPurify, Lucide.