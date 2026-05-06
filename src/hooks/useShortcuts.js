import { useEffect } from 'react';

export function useShortcuts({ currentPage, setCurrentPage, setFocusActive, addTask }) {
  useEffect(() => {
    let pendingG = false;

    function onKeyDown(event) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'Escape') {
        setFocusActive(false);
        return;
      }

      if (event.key.toLowerCase() === 'f' && currentPage === 'launch') {
        setFocusActive(true);
        return;
      }

      if (event.key.toLowerCase() === 'n') {
        const title = window.prompt('新任务');
        if (title) addTask(title);
        return;
      }

      if (event.key.toLowerCase() === 'g') {
        pendingG = true;
        window.setTimeout(() => {
          pendingG = false;
        }, 700);
        return;
      }

      if (pendingG) {
        const key = event.key.toLowerCase();
        const map = { h: 'launch', t: 'tasks', r: 'review', s: 'settings' };
        if (map[key]) setCurrentPage(map[key]);
        pendingG = false;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [addTask, currentPage, setCurrentPage, setFocusActive]);
}
