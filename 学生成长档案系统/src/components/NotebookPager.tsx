interface Props {
  currentIndex: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function NotebookPager({ currentIndex, total, onPrevious, onNext }: Props) {
  return (
    <nav className="notebook-pager" aria-label="笔记翻页">
      <button className="button button-secondary" type="button" onClick={onPrevious} disabled={total === 0 || currentIndex === 0}>上一页</button>
      <span>{total === 0 ? '暂无记录' : `第 ${currentIndex + 1} 页 / 共 ${total} 页`}</span>
      <button className="button button-secondary" type="button" onClick={onNext} disabled={total === 0 || currentIndex >= total - 1}>下一页</button>
    </nav>
  );
}
