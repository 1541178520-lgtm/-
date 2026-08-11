import type { Tag } from '../../../shared/contracts';

interface Props {
  tags: Tag[];
  selected: number[];
  onChange: (tagIds: number[]) => void;
}

export function StudentTagsEditor({ tags, selected, onChange }: Props) {
  function toggle(id: number, checked: boolean) {
    onChange(checked ? [...selected, id] : selected.filter((tagId) => tagId !== id));
  }

  return (
    <fieldset className="tag-selector">
      <legend>学生标签</legend>
      {tags.length === 0 ? <p>尚未建立标签，可稍后在目录中管理。</p> : (
        <div className="tag-options">
          {tags.map((tag) => (
            <label key={tag.id}>
              <input type="checkbox" checked={selected.includes(tag.id)} onChange={(event) => toggle(tag.id, event.target.checked)} />
              <span>{tag.name}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
