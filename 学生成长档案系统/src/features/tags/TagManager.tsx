import { useState, type FormEvent } from 'react';
import type { Tag } from '../../../shared/contracts';
import { api, ApiClientError, jsonBody } from '../../api/client';

interface Props {
  tags: Tag[];
  onChanged: (tags: Tag[]) => void;
  onClose: () => void;
}

export function TagManager({ tags, onChanged, onClose }: Props) {
  const [items, setItems] = useState(tags);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function commit(next: Tag[]) {
    const sorted = [...next].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
    setItems(sorted);
    onChanged(sorted);
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setError('标签名称不能为空'); return; }
    setError('');
    try {
      const result = await api<{ tag: Tag }>('/tags', { method: 'POST', body: jsonBody({ name }) });
      commit([...items, result.tag]);
      setName('');
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.fields?.name ?? caught.message : '新增标签失败');
    }
  }

  async function rename(id: number) {
    if (!editingName.trim()) { setError('标签名称不能为空'); return; }
    setError('');
    try {
      const result = await api<{ tag: Tag }>(`/tags/${id}`, { method: 'PUT', body: jsonBody({ name: editingName }) });
      commit(items.map((tag) => tag.id === id ? result.tag : tag));
      setEditingId(null);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.fields?.name ?? caught.message : '修改标签失败');
    }
  }

  async function remove(id: number) {
    setError('');
    try {
      const result = await api<{ deleted: boolean; affectedStudents: number }>(`/tags/${id}`, { method: 'DELETE' });
      commit(items.filter((tag) => tag.id !== id));
      setDeletingId(null);
      setNotice(`标签已删除，已从 ${result.affectedStudents} 名学生的档案中移除关联。`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '删除标签失败');
    }
  }

  return (
    <div className="tag-manager">
      <form className="inline-form" onSubmit={add}>
        <label className="field grow"><span>新标签名称</span><input aria-label="新标签名称" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <button className="button button-primary" type="submit">新增标签</button>
      </form>
      {error && <p className="form-alert" role="alert">{error}</p>}
      {notice && <p className="form-notice" role="status">{notice}</p>}
      <ul className="tag-list">
        {items.map((tag) => (
          <li key={tag.id}>
            {editingId === tag.id ? (
              <div className="inline-form grow">
                <input aria-label={`修改${tag.name}`} value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                <button className="text-button" type="button" onClick={() => void rename(tag.id)}>保存</button>
                <button className="text-button" type="button" onClick={() => setEditingId(null)}>取消</button>
              </div>
            ) : <span>{tag.name}</span>}
            {editingId !== tag.id && deletingId !== tag.id && (
              <div><button className="text-button" type="button" aria-label={`修改${tag.name}`} onClick={() => { setEditingId(tag.id); setEditingName(tag.name); }}>修改</button><button className="text-button danger-text" type="button" aria-label={`删除${tag.name}`} onClick={() => setDeletingId(tag.id)}>删除</button></div>
            )}
            {deletingId === tag.id && (
              <div className="tag-delete-confirm"><span>将从所有已关联学生的档案中移除此标签。</span><button className="button button-danger button-small" type="button" onClick={() => void remove(tag.id)}>确认删除标签</button><button className="text-button" type="button" onClick={() => setDeletingId(null)}>取消</button></div>
            )}
          </li>
        ))}
      </ul>
      <div className="form-actions"><button className="button button-secondary" type="button" onClick={onClose}>完成</button></div>
    </div>
  );
}
