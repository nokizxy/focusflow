import { uid } from '../../utils/id';
import { selectQueue } from '../selectors';

export function addTaskToState(current, title) {
  const input = typeof title === 'string' ? { title } : title;
  const trimmed = input.title.trim();
  if (!trimmed) return current;

  const project = input.tag || '收集箱';
  const startDate = input.startDate || input.date || 'none';
  const deadlineDate = input.deadlineDate || input.dueDate || 'none';
  const minutes = input.minutes || current.settings.defaultMinutes;
  const steps =
    Array.isArray(input.steps) && input.steps.length
      ? input.steps.map((step) => ({
          id: step.id || uid('step'),
          title: String(step.title || trimmed).trim(),
          detail: step.detail || '',
          minutes: Math.max(1, Number(step.minutes) || minutes),
          done: Boolean(step.done),
          isMicroStart: Boolean(step.isMicroStart),
          isWinningLine: Boolean(step.isWinningLine),
          skipped: Boolean(step.skipped)
        }))
      : [
          {
            id: uid('step'),
            title: trimmed,
            detail: '',
            minutes,
            done: false,
            isMicroStart: true,
            isWinningLine: true
          }
        ];

  return {
    ...current,
    tasks: [
      {
        id: input.id || uid('task'),
        title: trimmed,
        notes: input.notes || '',
        preface: input.preface || '',
        exitMessage: input.exitMessage || '',
        spiceLevel: input.spiceLevel || 2,
        project,
        dueDate: deadlineDate,
        startDate,
        startTime: input.startTime || '',
        deadlineDate,
        scheduleType: input.scheduleType || (startDate === 'none' ? 'someday' : 'today'),
        status: 'active',
        focusPinnedAt: new Date().toISOString(),
        steps,
        createdAt: new Date().toISOString()
      },
      ...current.tasks.map((task) => ({ ...task, focusPinnedAt: '' }))
    ]
  };
}

export function updateTaskInState(current, taskId, patch) {
  return {
    ...current,
    tasks: current.tasks.map((task) =>
      task.id === taskId ? { ...task, ...patch } : task
    )
  };
}

export function deleteTaskFromState(current, taskId) {
  return {
    ...current,
    tasks: current.tasks.filter((task) => task.id !== taskId)
  };
}

export function startTaskInState(current, taskId) {
  const target = current.tasks.find((task) => task.id === taskId);
  if (!target || target.status === 'done') return current;

  const pinnedAt = new Date().toISOString();
  const remainingTasks = current.tasks
    .filter((task) => task.id !== taskId)
    .map((task) => ({ ...task, focusPinnedAt: '' }));
  const pinnedTarget = { ...target, focusPinnedAt: pinnedAt };
  const firstActiveIndex = remainingTasks.findIndex((task) => task.status !== 'done');

  if (firstActiveIndex === -1) {
    return {
      ...current,
      tasks: [pinnedTarget, ...remainingTasks]
    };
  }

  const tasks = [...remainingTasks];
  tasks.splice(firstActiveIndex, 0, pinnedTarget);

  return {
    ...current,
    tasks
  };
}

export function swapFirstTaskInState(current) {
  const queue = selectQueue(current.tasks);
  if (queue.length < 2) return current;

  const nextIndex = Math.floor(Math.random() * (queue.length - 1)) + 1;
  const nextId = queue[nextIndex].id;
  const pinnedAt = new Date().toISOString();

  return {
    ...current,
    tasks: current.tasks.map((task) => ({
      ...task,
      focusPinnedAt: task.id === nextId ? pinnedAt : ''
    }))
  };
}
