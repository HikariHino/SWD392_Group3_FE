import React, { createContext, useState } from 'react';

export const ExamContext = createContext();

export const ExamProvider = ({ children }) => {
    const [examState, setExamState] = useState(null);
    return (
        <ExamContext.Provider value={{ examState, setExamState }}>
            {children}
        </ExamContext.Provider>
    );
};
