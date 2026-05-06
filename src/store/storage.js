import { defaultSettings, defaultTasks } from './defaultData';

export const STORAGE_KEY = 'focusflow-react-state-v1';

export function createInitialState() {
  return {
    tasks: defaultTasks,
    settings: defaultSettings,
    history: []
  };
}

function normalizeStep(step, index, defaultMinutes) {
  return {
    ...step,
    id: step.id,
    title: step.title || '未命名步骤',
    detail: step.detail || '',
    minutes: Math.max(1, Number(step.minutes) || defaultMinutes),
    done: Boolean(step.done),
    isMicroStart: Boolean(step.isMicroStart || index === 0),
    isWinningLine: Boolean(step.isWinningLine || false),
    skipped: Boolean(step.skipped)
  };
}

function normalizeTask(task, settings) {
  const steps = Array.isArray(task.steps) ? task.steps : [];

  return {
    ...task,
    notes: task.notes || '',
    preface: task.preface || '',
    exitMessage: task.exitMessage || '',
    spiceLevel: task.spiceLevel || 2,
    focusPinnedAt: task.focusPinnedAt || '',
    steps: steps.map((step, index) => normalizeStep(step, index, settings.defaultMinutes))
  };
}

export function normalizeState(state) {
  const settings = { ...defaultSettings, ...state?.settings };

  return {
    tasks: state?.tasks?.length
      ? state.tasks.map((task) => normalizeTask(task, settings))
      : defaultTasks,
    settings,
    history: Array.isArray(state?.history) ? state.history : []
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();

    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return createInitialState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
