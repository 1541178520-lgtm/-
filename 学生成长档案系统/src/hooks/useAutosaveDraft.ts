import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

interface Options<T> {
  initial: T;
  save: (draft: T) => Promise<T>;
  delay?: number;
}

const same = <T,>(left: T, right: T) => JSON.stringify(left) === JSON.stringify(right);

export function useAutosaveDraft<T>({ initial, save, delay = 800 }: Options<T>) {
  const [draft, setDraft] = useState(initial);
  const [status, setStatus] = useState<AutosaveStatus>('saved');
  const [message, setMessage] = useState('已保存');
  const draftRef = useRef(initial);
  const savedRef = useRef(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; }, [save]);

  const update = useCallback((next: T) => {
    draftRef.current = next;
    setDraft(next);
    if (same(next, savedRef.current)) { setStatus('saved'); setMessage('已保存'); }
    else { setStatus('dirty'); setMessage('等待保存'); }
  }, []);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (same(draftRef.current, savedRef.current)) { setStatus('saved'); setMessage('已保存'); return true; }
    if (inFlightRef.current) return inFlightRef.current;
    const request = (async () => {
      while (!same(draftRef.current, savedRef.current)) {
        const snapshot = draftRef.current;
        setStatus('saving'); setMessage('正在保存…');
        try {
          const saved = await saveRef.current(snapshot);
          savedRef.current = saved;
          if (same(draftRef.current, snapshot)) { draftRef.current = saved; setDraft(saved); setStatus('saved'); setMessage('已保存'); }
          else { setStatus('dirty'); setMessage('有新修改，继续保存'); }
        } catch (caught) {
          setStatus('error'); setMessage(caught instanceof Error ? `${caught.message}，修改仍保留` : '保存失败，修改仍保留');
          return false;
        }
      }
      return true;
    })().finally(() => { inFlightRef.current = null; });
    inFlightRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    if (status !== 'dirty') return;
    timerRef.current = setTimeout(() => { void saveNow(); }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [delay, draft, saveNow, status]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (same(draftRef.current, savedRef.current)) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return { draft, update, status, message, saveNow };
}
