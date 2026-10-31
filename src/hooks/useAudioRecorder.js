import { useCallback, useEffect, useRef, useState } from 'react';

const RECOGNITION_ERRORS = {
    'not-allowed': 'Trình duyệt chưa cho phép dùng micro. Hãy cấp quyền hoặc gõ câu trả lời.',
    'service-not-allowed': 'Trình duyệt chưa cho phép dùng micro. Hãy cấp quyền hoặc gõ câu trả lời.',
    'audio-capture': 'Không tìm thấy micro trên máy này. Bạn có thể gõ câu trả lời.',
    network: 'Không kết nối được dịch vụ nhận giọng nói. Bạn có thể gõ câu trả lời.',
};

const getRecognitionApi = () => window.SpeechRecognition || window.webkitSpeechRecognition;

/**
 * Nhận giọng nói ngay trên trình duyệt (Web Speech API, chạy trên Chrome/Edge).
 * Backend chưa có STT nên câu nói được đổi thành chữ rồi gửi như câu trả lời gõ tay.
 */
export const useAudioRecorder = ({ onText, lang = 'vi-VN' }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [interimText, setInterimText] = useState('');
    const [error, setError] = useState('');
    const recognitionRef = useRef(null);
    const keepListening = useRef(false);
    const onTextRef = useRef(onText);

    useEffect(() => {
        onTextRef.current = onText;
    });

    const resetState = useCallback(() => {
        setIsRecording(false);
        setInterimText('');
    }, []);

    const startRecording = useCallback(() => {
        const RecognitionApi = getRecognitionApi();
        if (!RecognitionApi || keepListening.current) return;

        const recognition = new RecognitionApi();
        recognition.lang = lang;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
            let interim = '';
            for (let index = event.resultIndex; index < event.results.length; index += 1) {
                const result = event.results[index];
                if (result.isFinal) onTextRef.current?.(result[0].transcript.trim());
                else interim += result[0].transcript;
            }
            setInterimText(interim);
        };
        recognition.onerror = (event) => {
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            keepListening.current = false;
            setError(RECOGNITION_ERRORS[event.error] ?? 'Không nhận được giọng nói. Bạn có thể gõ câu trả lời.');
        };
        // Chrome tự dừng sau một quãng im lặng: mở lại nếu sinh viên chưa bấm dừng
        recognition.onend = () => {
            if (keepListening.current) recognition.start();
            else resetState();
        };

        recognitionRef.current = recognition;
        keepListening.current = true;
        setError('');
        setIsRecording(true);
        recognition.start();
    }, [lang, resetState]);

    // Dừng và vẫn nhận nốt đoạn cuối
    const stopRecording = useCallback(() => {
        keepListening.current = false;
        recognitionRef.current?.stop();
    }, []);

    // Dừng và bỏ đoạn chưa chốt (dùng khi đã gửi câu trả lời hoặc chuyển câu)
    const cancelRecording = useCallback(() => {
        keepListening.current = false;
        if (recognitionRef.current) recognitionRef.current.onresult = null;
        recognitionRef.current?.abort();
        recognitionRef.current = null;
        resetState();
    }, [resetState]);

    useEffect(() => cancelRecording, [cancelRecording]);

    return { supported: Boolean(getRecognitionApi()), isRecording, interimText, error, startRecording, stopRecording, cancelRecording };
};
