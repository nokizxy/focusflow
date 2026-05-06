import { formatDueDate } from '../utils/taskMeta';

function formatProjectName(project) {
  if (!project || project === 'Inbox') return '收集箱';
  return project;
}

const spiceLabels = {
  1: '还好',
  2: '有点烦',
  3: '想到累'
};

export default function TaskCard({ task, active = false, large = false, onClick }) {
  const doneCount = task.steps.filter((step) => step.done).length;
  const totalCount = task.steps.length || 1;
  const progress = Math.round((doneCount / totalCount) * 100);
  const nextStep = task.steps.find((step) => !step.done) || task.steps[0];

  return (
    <button
      className={`task-card ${active ? 'task-card--active' : ''} ${large ? 'task-card--large' : ''}`}
      onClick={onClick}
    >
      <div className="task-card__meta">
        <span>{formatProjectName(task.project)}</span>
        <span>开始 {formatDueDate(task.startDate || task.dueDate)}</span>
        {task.deadlineDate && task.deadlineDate !== 'none' ? (
          <span>截止 {formatDueDate(task.deadlineDate)}</span>
        ) : null}
        {task.spiceLevel ? <span>{spiceLabels[task.spiceLevel] || '有点烦'}</span> : null}
        <span>{doneCount}/{totalCount}</span>
      </div>
      {large ? (
        <>
          <div className="task-card__context">{task.title}</div>
          <div className="task-card__title">{nextStep ? nextStep.title : task.title}</div>
          <p className="task-card__notes">
            {nextStep?.detail || task.preface || task.notes || '只做这一小步就够了。'}
          </p>
        </>
      ) : (
        <div className="task-card__title">{task.title}</div>
      )}
      <div className="task-card__footer">
        <span>
          {nextStep?.isWinningLine
            ? '胜利线'
            : large
              ? '当前下一步'
              : nextStep
                ? nextStep.title
                : '全部完成'}
        </span>
        <span>{nextStep ? `${nextStep.minutes} 分钟` : `${progress}%`}</span>
      </div>
      <div className="task-card__progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
    </button>
  );
}
