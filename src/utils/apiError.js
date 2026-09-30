// "Rubrics[0].Weight" -> ['rubrics', 0, 'weight'] (tên field của antd Form)
const toFormPath = (propertyName) =>
    propertyName.split('.').flatMap((segment) => {
        const match = segment.match(/^(\w+)\[(\d+)\]$/);
        const toCamel = (s) => s.charAt(0).toLowerCase() + s.slice(1);
        return match ? [toCamel(match[1]), Number(match[2])] : [toCamel(segment)];
    });

/**
 * Chuẩn hoá lỗi Axios trả về từ Backend thành { message, fieldErrors }.
 * Hỗ trợ 2 dạng lỗi 400:
 *  - FluentValidation của QuestionsController: { message, errors: [{ field, error }] }
 *  - ProblemDetails mặc định của ASP.NET:     { title, errors: { Field: [msg] } }
 */
export const parseApiError = (error, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại.') => {
    if (!error?.response) {
        return {
            message: 'Không kết nối được tới máy chủ Backend. Hãy kiểm tra API đã chạy chưa.',
            fieldErrors: [],
        };
    }

    const data = error.response.data || {};
    let rawErrors = [];
    if (Array.isArray(data.errors)) {
        rawErrors = data.errors.map((e) => ({ field: e.field, error: e.error }));
    } else if (data.errors && typeof data.errors === 'object') {
        rawErrors = Object.entries(data.errors).flatMap(([field, messages]) =>
            [].concat(messages).map((error) => ({ field, error })),
        );
    }

    return {
        message: data.message || data.title || fallback,
        fieldErrors: rawErrors.map((e) => ({
            name: e.field ? toFormPath(e.field.replace(/^\$\./, '')) : [],
            error: e.error,
        })),
    };
};
