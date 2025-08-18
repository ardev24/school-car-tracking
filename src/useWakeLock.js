import { useEffect, useRef } from 'react';

export default function useWakeLock(active) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (!active) {                  // need to release
      lockRef.current?.release();
      lockRef.current = null;
      return;
    }

    let cancelled = false;

    const request = async () => {
      try {
        if ('wakeLock' in navigator && !lockRef.current) {
          lockRef.current = await navigator.wakeLock.request('screen');
          lockRef.current.addEventListener('release', () =>
            console.log('Wake lock released')
          );
          console.log('Wake lock obtained');
        }
      } catch (err) {
        console.warn('Wake-lock error', err);
      }
    };

    request();                      // first try
    document.addEventListener('visibilitychange', request);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      lockRef.current?.release();
      lockRef.current = null;
    };
  }, [active]);
}