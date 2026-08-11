import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}

export function Modal({ title, children, onClose, wide = false }: Props) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`modal-sheet${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <div><p className="eyebrow">档案操作</p><h2 id="modal-title">{title}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">×</button>
        </header>
        {children}
      </section>
    </div>
  );
}
