# Flow 4 — AI hỗ trợ chấm điểm, giảng viên chốt điểm

Source chính ở `src/`. Không thay đổi Backend. Hợp đồng API được đọc từ `E:\SWDBE`.

## Chạy thử

1. Chạy BE với database đã áp dụng migration Assessment và cấu hình dịch vụ AI.
2. Chạy FE: `npm.cmd run dev`, mở `http://localhost:5173`.
3. Sinh viên thực hiện Flow 3 rồi nộp bài. Màn hình hoàn thành có **mã lượt thi** và nút sao chép để gửi giảng viên.
4. Giảng viên vào **Thẩm định chấm điểm** (`/grading`), dán mã lượt thi. Có thể mở trực tiếp `/grading/{attemptId}` hoặc `/grading/review?attemptId={attemptId}`.
5. Xem transcript toàn bài hoặc lọc theo câu hỏi. Đề gốc lấy từ snapshot câu hỏi của lượt thi, giữ nguyên nội dung lúc thi.
6. Với bài `Submitted`, bấm **Chấm gợi ý bằng AI**. Việc mở trang không tự gọi chấm AI và không tự chốt điểm.
7. Chọn từng câu, xem câu trả lời đã dùng để chấm, điểm AI, nhận xét và độ tin cậy nếu có. Rubric hiện tại của môn hiển thị riêng để tham khảo.
8. Nhập điểm trong khoảng `0..points` của câu, ghi nhận xét (tối đa 2.000 ký tự), bấm **Chốt điểm câu này**, kiểm tra điểm/nhận xét trong hộp thoại rồi xác nhận.
9. Câu đã chốt khóa chỉnh sửa. Tổng điểm chính thức chỉ hiện sau khi BE xác nhận đã chốt toàn bộ câu. Tổng điểm do BE chuẩn hóa về thang 10.

## API đang dùng

| Mục đích | Endpoint |
| --- | --- |
| Lượt thi / câu hỏi snapshot / hội thoại | `GET /api/attempts/{id}`, `/questions`, `/turns` |
| Ca thi | `GET /api/exam-sessions/{id}` |
| Hồ sơ sinh viên | `GET /api/users/{id}` |
| Rubric hiện tại của môn | `GET /api/courses/{id}` |
| Đánh giá từng câu và kết quả tổng | `GET /api/attempts/{id}/result` |
| Tạo gợi ý AI | `POST /api/attempts/{id}/grade` |
| Chốt câu | `PUT /api/assessments/{id}/final-score` |

Payload chốt điểm: `{ finalScore, teacherComment, version }`. Dùng `version` của Assessment, không dùng version của Attempt. Điểm 0 là điểm hợp lệ; điểm AI `null` hiển thị chưa có, không tự chuyển thành 0.

Nếu lưu bị từ chối, FE giữ điểm/nhận xét đang sửa. Nếu xung đột 409 hoặc kết quả ghi không chắc chắn do mất mạng, FE khóa ghi tiếp và yêu cầu tải lại để đối chiếu trạng thái trên máy chủ. Tải lại dữ liệu sẽ hỏi trước khi bỏ các thay đổi chưa chốt. Chuyển câu giữ các bản sửa trong phiên hiện tại, chưa lưu nháp vào BE.

## Giới hạn hợp đồng BE hiện tại

- Chưa có endpoint liệt kê lượt thi theo ca. FE mở bằng mã lượt thi; mã ca thi không thay thế mã lượt thi.
- AssessmentDto và AttemptQuestionDto chưa trả rubric snapshot hoặc đáp án chuẩn đã dùng khi AI chấm. FE hiển thị rubric thật từ CourseDto với nhãn **hiện tại / tham khảo**, không khẳng định đó là rubric đã dùng lúc thi. Không hiển thị điểm hoặc giải trình giả theo từng tiêu chí.
- AI feedback là một trường văn bản; FE giữ nguyên nội dung để giảng viên xem các điểm mạnh/yếu/ý còn thiếu mà AI thực sự trả về.
- API chưa trả tín hiệu độ trôi chảy, thời gian phản hồi từng câu hoặc URL ghi âm. FE chỉ hiển thị thời gian làm bài từ mốc bắt đầu/nộp và không suy ra các chỉ số giọng nói.
- BE chỉ chấp nhận chốt khi `AwaitingReview`; đã chốt thì không có API sửa lại. FE không cung cấp nút phúc khảo hoặc lưu nháp giả.

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Nếu ACL cũ của thư mục `node_modules/.vite-temp` hoặc `dist` chặn ghi, có thể build độc lập:

```powershell
npm.cmd run build -- --configLoader runner --outDir .build-flow4.local
npm.cmd run preview -- --configLoader runner --outDir .build-flow4.local --host 127.0.0.1 --port 4174 --strictPort
node tests/grading-ui-smoke.mjs
```

Smoke test chạy Chrome headless với API fixtures theo DTO BE, không ghi dữ liệu lên BE thật. Kiểm tra transcript, rubric, lỗi AI/thử lại, thang điểm từng câu, điểm 0, giữ bản sửa khi chuyển câu/lưu lỗi, payload/version, xung đột, mất kết nối đọc lại sau ghi, khóa điểm đã chốt, tổng điểm sau chốt đủ câu, reload, lỗi rubric độc lập, quyền sở hữu và bố cục mobile. Ảnh nằm trong `.ui-smoke.local/grading-*`.
