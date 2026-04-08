import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useInactivityTimeout(timeoutMinutes = 15) {
  const router = useRouter();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const logout = async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(logout, timeoutMinutes * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [router, timeoutMinutes]);
}
