import { useEffect, useState } from 'react';

export const useSignalR = (url) => {
    const [connection, setConnection] = useState(null);

    useEffect(() => {
        // Init SignalR connection here
    }, [url]);

    return { connection };
};
