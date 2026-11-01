# Hướng dẫn sử dụng AIVES

## Kiến trúc và cách chạy

Frontend là React/Vite (`src/`) và gọi Web API .NET tại `VITE_API_BASE_URL` (mặc định `https://localhost:7035/api`). `axiosClient` tự gắn JWT sau khi đăng nhập. Backend theo Onion Architecture: `Domain` chứa entity/quy tắc lõi, `Application` chứa use case/DTO/validator, `Infrastructure` triển khai EF Core, Azure SQL và Gemini, còn `WebApi` cung cấp controller, JWT và SignalR.

Khởi động backend trước, kiểm tra `https://localhost:7035/health/live` trả `200`; sau đó chạy `npm run dev` trong FE và mở `http://localhost:5173`. Gemini API key phải nằm ở User Secrets/backend environment (`Gemini:ApiKey`), không đặt vào `VITE_*` hay commit vào source.

## Tài khoản và dữ liệu test Azure hiện có

> Các tài khoản dưới đây chỉ dùng cho môi trường test Azure hiện tại; đổi hoặc xóa trước khi demo công khai/triển khai thật.

| Vai trò | Username | Password | Mục đích |
|---|---|---|---|
| Giảng viên | `lecturer` | `password123` | Tạo rubric, câu hỏi, ca thi và chốt điểm. |
| Sinh viên | `student_test` | `student123` | Đã có bài nộp 1 câu trả lời. |
| Sinh viên | `student_empty` | `student123` | Bài không trả lời, đã chốt điểm 0. |
| Sinh viên | `student_correct` | `student123` | Bài trả lời đúng; AI đã đề xuất 8.5/10. |
| Sinh viên | `student_wrong` | `student123` | Bài trả lời sai để thử chấm AI. |

Data chính: môn `SWD392`, 1 câu hỏi 10 điểm, 3 tiêu chí rubric cấp môn (40% + 30% + 30%). Ca thi đang mở để test: `15f1481c-428d-4cea-8460-463ca30ed5c0`. Mã lượt thi đã chốt điểm thủ công: `c3fae119-37d2-4d6d-a168-100d6bdf198c`.

## Luồng giảng viên

### 1. Ngân hàng câu hỏi và rubric

1. Vào **Ngân hàng câu hỏi & Rubric**.
2. Bấm **Cấu hình rubric môn** (bánh răng ở panel rubric) để thêm/sửa/xóa tiêu chí. Tổng trọng số bắt buộc là **100%**. Rubric áp dụng cho mọi câu hỏi cùng môn, không gắn riêng từng câu hỏi.
3. Bấm **Tạo câu hỏi mới** để thêm thủ công; chọn môn, Bloom và nội dung.
4. Hoặc bấm **Sinh bằng AI Gemini**, chọn môn/chủ đề/Bloom. Hệ thống chờ Gemini tối đa 30 giây; nếu Gemini tạm lỗi, một bản nháp dự phòng có cảnh báo sẽ mở để giảng viên chỉnh sửa. Chỉ bấm **Lưu vào ngân hàng** mới ghi dữ liệu.
5. Bấm **Xem chi tiết** ở card để xem nội dung, Bloom và tóm tắt rubric; bấm **Chỉnh sửa** chỉ sửa nội dung/Bloom của câu hỏi.
6. Nhập hàng loạt qua **Nhập câu hỏi từ tài liệu** bằng CSV UTF-8 có hai cột `Content,BloomLevel` hoặc JSON. Rubric không import cùng file vì rubric thuộc môn học.

### 2. Tổ chức vấn đáp

1. Vào **Ca thi vấn đáp**.
2. Chọn môn có rubric tổng 100% và các câu hỏi có điểm dương.
3. Nhập tên ca, chọn thứ tự câu hỏi và khoảng mở ca, rồi bấm **Tạo ca thi**.
4. Mở ca và gửi link/mã ca cho sinh viên. Sinh viên bắt đầu attempt, trả lời, có thể nhận follow-up AI rồi nộp bài.
5. Mở rộng từng dòng ca thi để xem danh sách sinh viên đã vào/nộp, trạng thái bài và mở thẳng bài cần chấm. Danh sách này lấy từ server, không phụ thuộc trình duyệt đã tạo ca.

### 3. Thẩm định và chốt điểm

1. Vào **Ca thi vấn đáp**, mở rộng ca và bấm **Xem/chấm bài** tại sinh viên đã nộp; hoặc dán mã/link `/grading/{attemptId}`.
2. Bấm **Chấm thủ công ngay** để tạo phiếu chấm và nhập điểm tức thì. Đây là luồng chính, không cần Gemini.
3. Nút **Lấy gợi ý AI (tùy chọn)** chỉ bổ sung đề xuất và nhận xét. Timeout/lỗi Gemini không chặn chấm tay.
4. Nhập điểm chính thức trong giới hạn điểm câu hỏi và nhận xét, rồi chốt. Khi mọi câu đã chốt, kết quả attempt chuyển `Finalized`.

## Xử lý lỗi thường gặp

- **Không sinh/chấm được bằng Gemini**: kiểm tra BE còn chạy, `Gemini:ApiKey` và model trong backend. Provider có thể timeout/503; tạo câu hỏi sẽ mở bản nháp dự phòng, còn chấm điểm dùng **Chấm thủ công ngay** và không bị chặn.
- **Không tạo được ca**: kiểm tra rubric môn đủ 100%, có ít nhất một câu hỏi và mỗi câu có điểm dương.
- **Không mở được bài để chấm**: chỉ nhận attempt đã submit; trong từng ca, mở rộng dòng ca để tải lại danh sách thí sinh rồi chọn **Xem/chấm bài**.
- **FE không gọi được BE**: kiểm tra URL `.env`, health endpoint, chứng chỉ HTTPS và CORS localhost.
