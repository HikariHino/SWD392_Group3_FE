# Hướng dẫn sử dụng AIVES

## Kiến trúc và cách chạy

Frontend là React/Vite (`src/`) và gọi Web API .NET tại `VITE_API_BASE_URL` (mặc định `https://localhost:7035/api`). `axiosClient` tự gắn JWT sau khi đăng nhập. Backend theo Onion Architecture: `Domain` chứa entity/quy tắc lõi, `Application` chứa use case/DTO/validator, `Infrastructure` triển khai EF Core, Azure SQL và Gemini, còn `WebApi` cung cấp controller, JWT và SignalR.

Khởi động backend trước, kiểm tra `https://localhost:7035/health/live` trả `200`; sau đó chạy `npm run dev` trong FE và mở `http://localhost:5173`. Gemini API key phải nằm ở User Secrets/backend environment (`Gemini:ApiKey`), không đặt vào `VITE_*` hay commit vào source.

## Luồng giảng viên

### 1. Ngân hàng câu hỏi và rubric

1. Vào **Ngân hàng câu hỏi & Rubric**.
2. Bấm **Cấu hình rubric môn** (bánh răng ở panel rubric) để thêm/sửa/xóa tiêu chí. Tổng trọng số bắt buộc là **100%**. Rubric áp dụng cho mọi câu hỏi cùng môn, không gắn riêng từng câu hỏi.
3. Bấm **Tạo câu hỏi mới** để thêm thủ công; chọn môn, Bloom và nội dung.
4. Hoặc bấm **Sinh bằng AI Gemini**, chọn môn/chủ đề/Bloom. Hệ thống chỉ tạo bản nháp; kiểm tra rồi bấm **Lưu vào ngân hàng** mới ghi dữ liệu.
5. Bấm **Xem chi tiết** ở card để xem nội dung, Bloom và tóm tắt rubric; bấm **Chỉnh sửa** chỉ sửa nội dung/Bloom của câu hỏi.
6. Nhập hàng loạt qua **Nhập câu hỏi từ tài liệu** bằng CSV UTF-8 có hai cột `Content,BloomLevel` hoặc JSON. Rubric không import cùng file vì rubric thuộc môn học.

### 2. Tổ chức vấn đáp

1. Vào **Ca thi vấn đáp**.
2. Chọn môn có rubric tổng 100% và các câu hỏi có điểm dương.
3. Nhập tên ca, chọn thứ tự câu hỏi và khoảng mở ca, rồi bấm **Tạo ca thi**.
4. Mở ca và gửi link/mã ca cho sinh viên. Sinh viên bắt đầu attempt, trả lời, có thể nhận follow-up AI rồi nộp bài.

### 3. Thẩm định và chốt điểm

1. Sinh viên gửi **mã lượt thi** sau khi nộp.
2. Vào **Thẩm định chấm điểm**, dán mã hoặc link `/grading/{attemptId}`.
3. Giảng viên xem transcript, rubric snapshot, AI đề xuất và nhận xét.
4. Nhập điểm chính thức trong giới hạn điểm câu hỏi và nhận xét, rồi chốt. Khi mọi câu đã chốt, kết quả attempt chuyển `Finalized`.

## Xử lý lỗi thường gặp

- **Không sinh/chấm được bằng Gemini**: kiểm tra BE còn chạy, `Gemini:ApiKey` và model trong backend. Provider có thể timeout/503; thử lại sau, không nhập key vào FE.
- **Không tạo được ca**: kiểm tra rubric môn đủ 100%, có ít nhất một câu hỏi và mỗi câu có điểm dương.
- **Không mở được bài để chấm**: chỉ nhận attempt đã submit; API chưa có danh sách attempt theo ca nên dùng mã lượt thi của sinh viên.
- **FE không gọi được BE**: kiểm tra URL `.env`, health endpoint, chứng chỉ HTTPS và CORS localhost.
