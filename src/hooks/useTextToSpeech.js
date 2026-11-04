import { useCallback, useEffect, useState } from 'react';

/** Reads an exam question with the browser's built-in speech engine. */
export const useTextToSpeech = ({ lang = 'vi-VN' } = {}) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

    const stop = useCallback(() => {
        if (supported) window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, [supported]);

    const speak = useCallback((text) => {
        const content = text?.trim();
        if (!supported || !content) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(content);
        utterance.lang = lang;
        utterance.rate = 0.95;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    }, [lang, supported]);

    useEffect(() => stop, [stop]);
    return { supported, isSpeaking, speak, stop };
};
