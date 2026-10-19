# 🎓 AIVES - Frontend Web Application

Hướng dẫn chạy và kiểm tra bản demo hiện tại: [Demo Milestone 3](docs/DEMO_M3.md). Source chính nằm tại `src/`; cấu hình Vite trong `frontend-react/` cũng sử dụng source này.

> **SWD392 (Software Architecture and Design) - Group 3**  
> Client-side interface for the AI-powered Viva Exam System, built with **React 19**, **Vite**, **Ant Design**, and **SignalR** for real-time audio streaming.

---

## 🛠️ Technology Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **UI Framework** | React 19 + Vite 8 | SPA, fast HMR dev experience |
| **UI Component Library** | Ant Design (antd) 6 | Professional UI components & layout |
| **Routing** | React Router DOM v6 | Nested routing with Protected Routes |
| **HTTP Client** | Axios | REST API communication with Backend |
| **Real-time** | @microsoft/signalr 8 | WebSocket audio streaming for AI Viva Exam |
| **State Management** | React Context API | Global auth state & exam session state |
| **Styling** | SCSS / Sass | Component-level scoped styles |

---

## 📁 Project Structure

```text
SWD392_Group3_FE/
├── public/                           # Static assets (favicon, images)
├── .env                              # Environment variables (API base URL)
└── src/
    ├── assets/                       # Images, global CSS/SCSS files
    ├── components/
    │   ├── common/
    │   │   └── ProtectedRoute.jsx    # Route guard — checks login & role before access
    │   └── layouts/
    │       └── MainLayout.jsx        # Shell layout: Sidebar menu + Header + Content area
    │
    ├── context/
    │   ├── AuthContext.jsx           # Global: stores JWT token, user role (Lecturer / Student)
    │   └── ExamContext.jsx           # Global: stores active exam session state
    │
    ├── hooks/
    │   ├── useAudioRecorder.js       # Custom hook: manages microphone On/Off recording
    │   └── useSignalR.js             # Custom hook: manages WebSocket connection lifecycle
    │
    ├── pages/
    │   ├── Auth/                     # Login.jsx, Register.jsx
    │   ├── QuestionBank/             # Feature 1: Question list, Import questions
    │   ├── Interview/                # Feature 3: ExamRoom.jsx — real-time AI viva interface
    │   └── Grading/                  # Feature 4: GradingDashboard.jsx, ReviewTranscript.jsx
    │
    ├── services/
    │   ├── axiosClient.js            # Axios instance — auto-attaches JWT token to headers
    │   ├── questionApi.js            # API calls: Question Bank & Rubric endpoints
    │   ├── gradingApi.js             # API calls: Grading & Assessment endpoints
    │   └── signalRService.js         # SignalR connection setup for Interview Hub
    │
    ├── utils/                        # Helper functions (formatScore, formatDate...)
    ├── App.jsx                       # Root component — wraps AuthContext & ExamContext
    ├── main.jsx                      # React entry point
    └── routes.jsx                    # Route definitions: public & protected routes with MainLayout
```

---

## 🚀 Key Features (Milestone 1 Scope)

* **Feature 1 - Question Bank UI:**
  * Màn hình danh sách câu hỏi, phân trang, tìm kiếm và lọc theo môn học / Bloom Level.
  * Giao diện tạo mới và cấu hình tiêu chí Rubric đi kèm câu hỏi.

* **Feature 3 - Real-Time AI Viva Exam Room:**
  * Giao diện phòng thi với nút **Bật/Tắt Micro** và đồng hồ đếm thời gian.
  * Kết nối WebSocket qua `SignalR` để stream âm thanh 2 chiều liên tục.
  * Hiển thị real-time transcript hội thoại (Sinh viên nói / AI trả lời) ngay trên màn hình.

* **Feature 4 - Grading Dashboard & Transcript Review:**
  * Bảng danh sách sinh viên đã hoàn thành ca thi kèm trạng thái chấm điểm.
  * Màn hình xem lại chi tiết Transcript và điểm AI gợi ý.
  * Form cho Giảng viên điều chỉnh và chốt điểm số chính thức.

---

## ⚙️ Getting Started & Local Setup

### 1. Prerequisites
* [Node.js (v18 or higher)](https://nodejs.org/)
* Backend API chạy tại `http://localhost:5110` (profile `http`) hoặc `https://localhost:7035` (profile `https`).

### 2. Environment Configuration
Tạo file `.env` ở thư mục gốc với nội dung:

```env
VITE_API_BASE_URL=http://localhost:5110/api
```

Có thể sao chép `.env.example` thành `.env`. Nếu chạy HTTPS, đổi URL thành `https://localhost:7035/api` và tin cậy chứng chỉ bằng `dotnet dev-certs https --trust`. Khởi động lại Vite sau khi thay đổi `.env`. Mở FE tại `http://localhost:5173` để khớp CORS backend.

Trong ngân hàng câu hỏi, bấm **Sinh bằng AI Gemini**, chọn môn học, nhập chủ đề và mức Bloom. FE gọi `POST /api/questions/ai-generate`, sau đó mở bản nháp để chỉnh sửa nội dung/Rubric. Bấm **Lưu vào ngân hàng** mới gửi `POST /api/questions`. Gemini API key được cấu hình ở backend, không đưa vào biến `VITE_*`. Backend hiện có cơ chế sinh câu hỏi dự phòng khi Gemini không khả dụng; phản hồi chưa có trường phân biệt nguồn sinh.

### 3. Run the Frontend App

```bash
# Cài đặt các thư viện
npm install

# Khởi chạy Development Server
npm run dev
```

Ứng dụng sẽ chạy tại: **`http://localhost:5173`**

---

## 🔗 Related Repositories

* **Backend API (.NET 8):** [SWD392_Group3](https://github.com/HikariHino/SWD392_Group3)

---
