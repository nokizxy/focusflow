import { useState } from 'react';

export const routineOptions = [
  '洗澡',
  '刷牙',
  '吃药',
  '倒垃圾',
  '做饭',
  '写周报',
  '看书',
  '复习考试'
];

export function RoutineChips({ onCreateTask }) {
  const [loadingTitle, setLoadingTitle] = useState('');

  async function createRoutine(title) {
    if (loadingTitle) return;
    setLoadingTitle(title);
    try {
      await onCreateTask(title);
    } finally {
      setLoadingTitle('');
    }
  }

  return (
    <div className="routine-strip__chips" aria-label="常见卡住场景">
      {routineOptions.map((routine) => (
        <button
          key={routine}
          type="button"
          disabled={Boolean(loadingTitle)}
          onClick={() => createRoutine(routine)}
        >
          {loadingTitle === routine ? '生成中...' : routine}
        </button>
      ))}
    </div>
  );
}

export default function RoutineStrip({ onCreateTask }) {
  return (
    <section className="routine-strip" aria-label="常见卡住场景">
      <div>
        <strong>常见卡住场景</strong>
        <span>点一下，先生成能开始的一小步。</span>
      </div>
      <RoutineChips onCreateTask={onCreateTask} />
    </section>
  );
}
