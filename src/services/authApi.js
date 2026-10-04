import axiosClient from './axiosClient';

// Endpoint Backend: WebApi/Controllers/AuthController.cs + UsersController.cs
export const authApi = {
    // POST /api/auth/login { username, password }
    //   -> { accessToken, expiresAt, user: { id, username, fullName, role, createdAt } }
    login: (data) => axiosClient.post('/auth/login', data),
    // GET /api/auth/me (cần Bearer token) -> { id, username, role }
    getMe: () => axiosClient.get('/auth/me'),
    // POST /api/users { username, password, fullName, role } -> UserDto
    register: (data) => axiosClient.post('/users', data),
};

// Role do Backend định nghĩa (Application/Validators/UserManagement/CreateUserDtoValidator.cs)
export const ROLES = {
    LECTURER: 'Lecturer',
    STUDENT: 'Student',
};

export const ROLE_LABELS = {
    [ROLES.LECTURER]: 'Giảng viên',
    [ROLES.STUDENT]: 'Sinh viên',
};

// Trang mặc định sau khi đăng nhập, tuỳ theo vai trò
export const HOME_PATH_BY_ROLE = {
    [ROLES.LECTURER]: '/dashboard',
    [ROLES.STUDENT]: '/exam-room',
};
