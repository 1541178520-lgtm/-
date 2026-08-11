import { Modal } from './Modal';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = '确认删除', busy = false, onConfirm, onCancel }: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="confirm-body">
        <p>{message}</p>
        <div className="form-actions">
          <button className="button button-secondary" type="button" onClick={onCancel}>取消</button>
          <button className="button button-danger" type="button" disabled={busy} onClick={onConfirm}>{busy ? '正在删除…' : confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}
