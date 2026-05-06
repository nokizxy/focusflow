import { todayKey } from '../../utils/date';
import { uid } from '../../utils/id';

export function addStepToState(current, taskId, title) {
  const trimmed = title.trim();
  if (!trimmed) return current;

  return {
    ...current,
    tasks: current.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            steps: [
              ...task.steps,
              {
                id: uid('step'),
                title: trimmed,
                minutes: current.settings.defaultMinutes,
                done: false
              }
            ]
          }
        : task
    )
  };
}

export function updateStepInState(current, taskId, stepId, patch) {
  return {
    ...current,
    tasks: current.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            steps: task.steps.map((step) =>
              step.id === stepId ? { ...step, ...patch } : step
            )
          }
        : task
    )
  };
}

export function completeStepInState(current, taskId, stepId, elapsedSeconds) {
  const tasks = current.tasks.map((task) => {
    if (task.id !== taskId) return task;

    const steps = task.steps.map((step) =>
      step.id === stepId ? { ...step, done: true } : step
    );
    const allDone = steps.every((step) => step.done);
    return { ...task, steps, status: allDone ? 'done' : task.status };
  });

  const task = current.tasks.find((item) => item.id === taskId);
  const step = task?.steps.find((item) => item.id === stepId);

  return {
    ...current,
    tasks,
    history: [
      ...current.history,
      {
        id: uid('history'),
        date: todayKey(),
        taskId,
        taskTitle: task?.title || '未命名任务',
        stepTitle: step?.title || '未命名步骤',
        plannedMinutes: step?.minutes || 0,
        elapsedSeconds,
        completedAt: new Date().toISOString()
      }
    ]
  };
}

export function skipStepInState(current, taskId, stepId, elapsedSeconds) {
  const tasks = current.tasks.map((task) => {
    if (task.id !== taskId) return task;

    const steps = task.steps.map((step) =>
      step.id === stepId ? { ...step, done: true, skipped: true } : step
    );
    const allDone = steps.every((step) => step.done);
    return { ...task, steps, status: allDone ? 'done' : task.status };
  });

  const task = current.tasks.find((item) => item.id === taskId);
  const step = task?.steps.find((item) => item.id === stepId);

  return {
    ...current,
    tasks,
    history: [
      ...current.history,
      {
        id: uid('history'),
        date: todayKey(),
        taskId,
        taskTitle: task?.title || '未命名任务',
        stepTitle: step?.title || '未命名步骤',
        plannedMinutes: step?.minutes || 0,
        elapsedSeconds,
        skipped: true,
        completedAt: new Date().toISOString()
      }
    ]
  };
}

export function completeTaskInState(current, taskId, elapsedSeconds) {
  const task = current.tasks.find((item) => item.id === taskId);
  if (!task) return current;

  const remainingSteps = task.steps.filter((step) => !step.done);
  const tasks = current.tasks.map((item) =>
    item.id === taskId
      ? {
          ...item,
          status: 'done',
          steps: item.steps.map((step) => ({ ...step, done: true }))
        }
      : item
  );

  return {
    ...current,
    tasks,
    history: [
      ...current.history,
      {
        id: uid('history'),
        date: todayKey(),
        taskId,
        taskTitle: task.title,
        stepTitle: '整个任务完成',
        plannedMinutes: remainingSteps.reduce((sum, step) => sum + (step.minutes || 0), 0),
        elapsedSeconds,
        completedTask: true,
        completedAt: new Date().toISOString()
      }
    ]
  };
}
