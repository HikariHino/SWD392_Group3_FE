import { useState } from 'react';

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    
    const startRecording = () => setIsRecording(true);
    const stopRecording = () => setIsRecording(false);

    return { isRecording, startRecording, stopRecording };
};
