import { formatDueDate } from '../utils/taskMeta';

function displayDate(value) {
  return value && value !== 'none' && value !== 'week' ? value : '';
}

export default function TaskMetaEditor({ task, onChange }) {
  return (
    <section className="task-meta-editor" aria-label="任务时间和标签">
      <label>
        <span>标签</span>
        <input
          value={task.project || ''}
          onChange={(event) => onChange({ project: event.target.value || '收集箱' })}
          placeholder="收集箱"
        />
      </label>
      <label>
        <span>开始日期</span>
        <input
          type="date"
          value={displayDate(task.startDate || task.dueDate)}
          onChange={(event) =>
            onChange({
              startDate: event.target.value || 'none',
              scheduleType: event.target.value ? 'custom' : 'someday'
            })
          }
        />
      </label>
      <label>
        <span>开始时间</span>
        <input
          type="time"
          value={task.startTime || ''}
          onChange={(event) => onChange({ startTime: event.target.value })}
        />
      </label>
      <label>
        <span>截止日期</span>
        <input
          type="date"
          value={displayDate(task.deadlineDate || task.dueDate)}
          min={displayDate(task.startDate)}
          onChange={(event) =>
            onChange({
              deadlineDate: event.target.value || 'none',
              dueDate: event.target.value || 'none'
            })
          }
        />
      </label>
      <div className="task-meta-editor__summary">
        <span>开始 {formatDueDate(task.startDate || task.dueDate)}</span>
        <span>截止 {formatDueDate(task.deadlineDate)}</span>
      </div>
    </section>
  );
}
