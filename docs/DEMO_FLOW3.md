# Chạy demo Flow 3 - Phòng thi vấn đáp AI

## Chuẩn bị

1. Chạy Backend trên `http://localhost:5110`. Muốn có câu hỏi xoáy thật thì đặt biến môi trường `Gemini__ApiKey` trước khi chạy.
2. Chạy Frontend bằng `npm.cmd run dev` và mở đúng `http://localhost:5173` (CORS của Backend chỉ mở cổng này).
3. Dùng môn **SWD392**: seed đã có Rubric tổng 100%. Môn PRN231 chưa có Rubric nên không tạo được ca thi.
4. Đăng nhập Lecturer (`lecturer` / `password123`), vào **Quản lý người dùng** tạo tài khoản vai trò Student cho sinh viên thi.

## Luồng demo

1. Lecturer mở **Ca thi vấn đáp**, chọn môn, chọn câu hỏi (thứ tự chọn là thứ tự hỏi), đặt thời gian rồi bấm **Tạo ca thi**.
2. Bấm **Mở ca**, sau đó bấm biểu tượng sao chép ở cột **Link cho sinh viên** và gửi link cho sinh viên.
3. Student mở link. Nếu chưa đăng nhập, hệ thống đưa qua trang đăng nhập rồi quay lại đúng phòng thi. Student cũng có thể dán mã ca thi ở `/exam-room`.
4. Góc trên bên phải chuyển từ **Đang kết nối** sang **Đã kết nối**.
5. Student gõ câu trả lời hoặc bấm **Trả lời bằng giọng nói** (Chrome/Edge), rồi bấm **Gửi câu trả lời** hoặc nhấn Ctrl + Enter.
6. Câu trả lời hiện ở **Bản ghi buổi thi**. AI gửi câu hỏi xoáy qua SignalR, mỗi câu tối đa 2 lượt.
7. Bấm **Câu tiếp theo**, đến câu cuối bấm **Nộp bài**.
8. Lecturer có thể **Đóng ca**: các bài đang làm được tự động nộp.

## Trạng thái và lỗi kết nối

| Tình huống | Sinh viên thấy gì | Bài thi |
| --- | --- | --- |
| Đang mở kết nối | Đang kết nối... | Vẫn gửi được câu trả lời |
| Mất kết nối giữa chừng | Đang nối lại... và thanh cảnh báo | Tự nối lại, sau đó tải lại bản ghi |
| Không nối lại được | Mất kết nối, có nút Kết nối lại | Câu trả lời và câu hỏi xoáy đi qua REST API |
| Không gửi được câu trả lời | Thông báo lỗi, nội dung còn trong ô trả lời | Gửi lại không tạo câu trả lời trùng |
| AI lỗi hoặc chưa có key | Chưa lấy được câu hỏi xoáy, có nút Thử lại | Câu trả lời đã lưu, vẫn đi tiếp được |
| Hết giờ hoặc ca bị huỷ | Thanh báo lỗi khi gửi câu trả lời, có nút Nộp bài | Không nhận thêm câu trả lời |

## Giới hạn hiện tại

- Backend chưa có API để sinh viên đọc giờ kết thúc và tên ca thi, nên phòng thi hiển thị thời gian đã làm thay vì đếm ngược.
- Backend chưa có API liệt kê ca thi, nên danh sách ca lưu trên trình duyệt của giảng viên đã tạo ca.
- Giới hạn 2 lượt hỏi xoáy đang nằm ở Frontend, Backend chưa kiểm tra.
- Giọng nói chỉ đổi thành chữ ngay trên trình duyệt. Chưa có lưu file ghi âm và AI đọc câu hỏi.
- Rubric nay thuộc về môn học nên đã bỏ khỏi form câu hỏi. Frontend chưa có màn hình cấu hình Rubric theo môn; `GET /api/courses` đang trả 500 khi có từ 2 môn trở lên.

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Bài `tests/ui-smoke.mjs` nên chạy trên `vite preview` sau khi build: dev server có thể sập khi trình duyệt khoá file trong `.ui-smoke.local`.
