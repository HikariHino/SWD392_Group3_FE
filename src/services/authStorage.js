const TOKEN_KEY = 'token';
const USER_KEY = 'auth_user';
const EXPIRES_KEY = 'auth_expires_at';

// Sự kiện phát ra khi API trả 401 -> AuthContext lắng nghe để đăng xuất
export const UNAUTHORIZED_EVENT = 'auth:unauthorized';

const safeGet = (key) => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

export const getToken = () => safeGet(TOKEN_KEY);

export const getStoredSession = () => {
    const token = getToken();
    const rawUser = safeGet(USER_KEY);
    const expiresAt = safeGet(EXPIRES_KEY);
    if (!token || !rawUser) return null;

    // Token hết hạn -> coi như chưa đăng nhập
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return null;

    try {
        return { token, user: JSON.parse(rawUser), expiresAt };
    } catch {
        return null;
    }
};

export const saveSession = ({ accessToken, expiresAt, user }) => {
    try {
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        if (expiresAt) localStorage.setItem(EXPIRES_KEY, expiresAt);
    } catch {
        // Trình duyệt chặn localStorage (chế độ ẩn danh) -> phiên chỉ tồn tại trong tab hiện tại
    }
};

export const clearSession = () => {
    try {
        [TOKEN_KEY, USER_KEY, EXPIRES_KEY].forEach((key) => localStorage.removeItem(key));
    } catch {
        // Bỏ qua: không có gì để xoá
    }
};
