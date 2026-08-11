import { createContext, useContext } from 'react';
import type { Student, Tag } from '../../shared/contracts';

export interface ArchiveContextValue {
  students: Student[];
  tags: Tag[];
  refresh: () => Promise<void>;
  openCreateStudent: () => void;
}

export const ArchiveContext = createContext<ArchiveContextValue | null>(null);

export function useArchive(): ArchiveContextValue {
  const value = useContext(ArchiveContext);
  if (!value) throw new Error('useArchive 必须在 ArchiveLayout 内使用');
  return value;
}
