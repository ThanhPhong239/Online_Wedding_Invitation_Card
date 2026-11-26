# Wedding Invitation System — Long & Loan (Local Edition)

Hệ thống thiệp cưới trực tuyến, xác nhận tham dự (RSVP), sổ lưu bút lời chúc 3D và cổng quản trị khách mời (hỗ trợ PWA). Xây dựng trên **Node.js 24.x**, **Express 5**, **MySQL 8.0 Local** và **HTML/CSS/JS thuần**.

---

## 1. Cấu trúc dự án

```text
├── database.js                   # MySQL connection pool & hàng đợi FIFO giới hạn thời gian
├── server.js                     # Express API, xác thực session admin & static server
├── schema.sql                    # Cấu trúc bảng guests, wishes (utf8mb4)
├── .local-mysql/                 # Dữ liệu MySQL 8.0 cục bộ lưu trữ bền vững (tự khởi tạo)
├── public/
│   ├── wedding-config.js         # Cấu hình nội dung thiệp, timeline, ảnh, STK mừng cưới
│   ├── guests.html / css / js    # Trang thiệp mời khách
│   ├── admin.html / css / js     # Trang quản trị khách mời, tạo lô, lọc/xuất CSV & PWA
│   ├── request.js                # Fetch wrapper có AbortController timeout toàn trình
│   ├── sw.js                     # Service Worker tối giản hỗ trợ cài PWA Admin
│   └── manifest.webmanifest      # Web App Manifest cho cổng quản trị
├── scripts/
│   └── local-db.js               # Tự động khởi tạo, bật/tắt & nạp schema cho MySQL local
```

---

## 2. Chạy dự án trên máy Local

Dự án tự động sử dụng **MySQL Server 8.0** có sẵn trên máy để khởi tạo cơ sở dữ liệu cục bộ riêng tại `.local-mysql/` (mặc định cổng `3307`, không xung đột với dịch vụ `MySQL80` cổng `3306`).

1. Cài đặt phụ thuộc (nếu chưa cài):
   ```bash
   npm install
   ```
2. Khởi động ứng dụng (tự động bật MySQL local & nạp bảng `guests`, `wishes`, `sessions` trước khi mở web):
   - Chế độ phát triển (tự tải lại khi sửa code): `npm run dev`
   - Chạy thường: `npm start`
3. Quản lý riêng Database Local:
   - Kiểm tra trạng thái & số lượng bản ghi: `npm run db:status`
   - Bật MySQL local thủ công: `npm run db:start`
   - Dừng MySQL local an toàn: `npm run db:stop`

---

## 3. Đường dẫn & Thông tin kết nối mặc định

- **Trang thiệp mẫu**: `http://localhost:3000/`
- **Thiệp riêng từng khách**: `http://localhost:3000/invite/<token>`
- **Trang quản trị Admin**: `http://localhost:3000/admin` (mặc định trong `.env`: `admin` / `123123`)
- **Kiểm tra kết nối DB**: `http://localhost:3000/api/health`
- **Kết nối từ MySQL Workbench / DBeaver / HeidiSQL**:
  - Host: `127.0.0.1`
  - Port: `3307`
  - User: `wedding`
  - Password: `wedding_local_2026`
  - Database: `wedding`
