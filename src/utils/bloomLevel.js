// Khớp với enum Domain.Enums.BloomLevel ở Backend (Remember = 1 ... Create = 6)
export const BLOOM_LEVELS = [
    { value: 1, name: 'Remember', label: 'Ghi nhớ', color: 'blue' },
    { value: 2, name: 'Understand', label: 'Hiểu', color: 'cyan' },
    { value: 3, name: 'Apply', label: 'Vận dụng', color: 'green' },
    { value: 4, name: 'Analyze', label: 'Phân tích', color: 'gold' },
    { value: 5, name: 'Evaluate', label: 'Đánh giá', color: 'orange' },
    { value: 6, name: 'Create', label: 'Sáng tạo', color: 'magenta' },
];

export const BLOOM_LEVEL_OPTIONS = BLOOM_LEVELS.map((b) => ({
    value: b.value,
    label: `${b.value}. ${b.name} - ${b.label}`,
}));

export const getBloomLevel = (value) => BLOOM_LEVELS.find((b) => b.value === value);
