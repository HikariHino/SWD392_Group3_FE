# Chạy demo Frontend Milestone 3

## Source và khởi động

Source được duy trì tại `SWD392_Group3_FE/src`. Chạy từ thư mục `SWD392_Group3_FE`:

```powershell
npm.cmd run dev
```

Cấu hình Vite trong thư mục `frontend-react` cũng trỏ về source gốc. Không dùng các file `frontend-react/src` cũ làm cơ sở kiểm tra login hoặc role.

FE dùng `VITE_API_BASE_URL` trong `.env`, hiện là `http://localhost:5110/api`.
URL này khớp profile `http` trong `E:\SWDBE\WebApi\Properties\launchSettings.json`. Nếu dùng HTTPS, đặt `VITE_API_BASE_URL=https://localhost:7035/api`, tin cậy chứng chỉ (`dotnet dev-certs https --trust`) rồi khởi động lại Vite. `.env.example` có sẵn cả hai lựa chọn; không dùng cổng cũ `7123`.
Khi kết nối BE thật, mở FE bằng `http://localhost:5173` để khớp CORS đang cấu hình trong BE.

## Backend và tài khoản giảng viên

BE hiện có seed trong `E:\SWDBE\Infrastructure\Persistence\DatabaseSeeder.cs`:

- Username: `lecturer`
- Password ban đầu: `password123`
- Role: `Lecturer`
- FullName: `Default Lecturer`
- Mật khẩu được hash BCrypt trước khi lưu. Tài khoản đã tồn tại không được đặt lại mật khẩu bởi seed.

Có thể khởi động BE bằng script tiện ích từ thư mục FE:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\start-backend-demo.ps1 -BackendPath E:\SWDBE
```

Script build và chạy source BE hiện tại; giữ nguyên database đang cấu hình. Nó cung cấp JWT settings tạm thời cho tiến trình demo nếu chưa có biến môi trường tương ứng, không ghi signing key vào source. Khi restart với signing key mới, cần đăng nhập lại.

**Kết quả kiểm tra ngày 18/10/2026:** BE build thành công nhưng Azure SQL `swd392-gr3` chặn IP `171.232.37.166`. Chưa xác nhận seed hoặc đăng nhập tài khoản trên database thật. Người quản trị cần mở firewall cho IP máy demo trước, sau đó khởi động lại BE để chạy seed. Swagger mở được không đồng nghĩa database đã kết nối được. IP có thể thay đổi khi đổi mạng.

## Luồng demo

1. Đăng nhập tài khoản Lecturer. FE nhận `accessToken`, lưu key `token` và gửi Bearer trong các request. Header hiển thị họ tên, `Giảng viên (Lecturer)` và nút đăng xuất.
2. Mở **Nhập câu hỏi từ tài liệu** hoặc nút **Nhập từ tài liệu** ở ngân hàng câu hỏi.
3. Chọn môn, tải mẫu JSON/CSV, chọn file. Giới hạn 2 MB / 500 câu. File Excel cần xuất CSV UTF-8 theo mẫu.
4. Xem trước, sửa nội dung/Bloom, mở dòng để sửa rubric hoặc bỏ câu không cần. Sửa các lỗi được đánh dấu; tổng trọng số mỗi câu phải bằng 100%.
5. Bấm **Lưu câu hỏi vào ngân hàng**. FE gửi batch JSON tới `/api/questions/import`, chỉ hiện thành công sau phản hồi API. Môn được chọn áp dụng cho mọi câu trong file.
6. Mở ngân hàng để xem các câu vừa lưu. Nếu request mất kết nối sau khi gửi, kiểm tra ngân hàng trước khi gửi lại để tránh nhập trùng. FE phát hiện câu trùng trong cùng file; chưa phát hiện trùng với toàn bộ database.
7. Mở **Thống kê & Giám sát**: tổng câu, môn, tiêu chí, câu có rubric; biểu đồ Bloom; bảng theo môn; câu mới nhất; lọc môn và xuất CSV tổng hợp theo môn. Số liệu được lấy từ tất cả các trang API, có nút tải lại và trạng thái lỗi.
8. Đăng xuất: token, user và hạn phiên được xóa; route bảo vệ chuyển về login.

## Sinh câu hỏi AI Gemini

1. Tại ngân hàng câu hỏi, bấm **Sinh bằng AI Gemini**. Môn học và mức Bloom được điền theo bộ lọc nếu đã chọn.
2. Chọn môn, nhập chủ đề, chọn Bloom rồi bấm **Sinh câu hỏi**. FE gửi `{ courseId, topic, bloomLevel }` tới `POST /api/questions/ai-generate` bằng token Lecturer.
3. Trong khi chờ, form khóa thao tác để tránh gửi trùng; lỗi API hiển thị trong hộp thoại và giữ dữ liệu để thử lại.
4. Phản hồi mở trong **Xem và chỉnh sửa câu hỏi AI**. Bản nháp chưa được lưu; có thể sửa nội dung, Bloom và Rubric, hoặc hủy. Tổng trọng số phải bằng 100%.
5. Bấm **Lưu vào ngân hàng** để gọi `POST /api/questions`. Sau thành công, danh sách về trang 1 và xóa bộ lọc để hiển thị câu mới.

Gemini key chỉ cấu hình tại backend. Backend hiện trả câu hỏi dự phòng khi không có key hoặc Gemini lỗi; API chưa cung cấp trường nguồn sinh nên kết quả thành công không chứng minh đã gọi Gemini thật.

## Phạm vi các tính năng khác

- Menu tài liệu được đặt tên **Nhập câu hỏi từ tài liệu** để phản ánh chức năng đang có. Chưa có kho lưu file, đọc PDF/PPTX hoặc RAG; trang nhập nói rõ giới hạn này.
- Báo cáo sử dụng dữ liệu câu hỏi/rubric hiện có. Chưa có báo cáo điểm thi hoặc giám sát phiên thi thời gian thực.
- Dashboard lấy dữ liệu thật và tên người dùng đang đăng nhập; không còn số liệu chờ duyệt, lịch thi hoặc trạng thái hệ thống gán cứng.
- Role trong source chính đã là `Lecturer`/`Student`; không đổi thành `teacher`.

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Kiểm tra UI tự động với Chrome cài tại đường dẫn mặc định và Vite đang chạy trên `http://127.0.0.1:5173`:

```powershell
node tests/ui-smoke.mjs
```

Bài UI sử dụng API mô phỏng trong Chrome, không ghi vào database thật. Nó kiểm tra đăng nhập, header Lecturer, chặn Student khỏi route Lecturer, phân trang thống kê, lỗi/thử lại, validation import, payload lưu, bố cục mobile và đăng xuất. Luồng AI kiểm tra trường bắt buộc, lỗi/thử lại, phản hồi sai định dạng, bản nháp chưa lưu, chỉnh sửa, validation Rubric, lỗi lưu và tải lại danh sách sau lưu. Screenshot được lưu trong `.ui-smoke.local` (Git bỏ qua). Có thể đặt `CHROME_PATH` nếu Chrome nằm ở vị trí khác.

Kiểm tra bổ sung ngày 19/10/2026: 8 unit tests và UI smoke (API mô phỏng) đạt; lint không có lỗi. Do quyền ghi vào `node_modules/.vite-temp` và `dist` bị hạn chế trong môi trường kiểm tra, build thành công bằng `npm.cmd run build -- --configLoader native --outDir .build-ai.local`. Chưa kiểm thử sinh câu hỏi với Gemini và database thật.

Đã kiểm tra: 8 unit tests pass; UI smoke test pass với API mô phỏng; production build pass. Lint không có lỗi, còn cảnh báo có sẵn ở các module khác và bản source cũ. Build còn cảnh báo bundle lớn; không ảnh hưởng kết quả biên dịch. Kết quả này không thay thế kiểm chứng đăng nhập/import với Azure SQL thật sau khi mở firewall.
