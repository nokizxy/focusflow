import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCurrentUser } from '../services/authService';
import { fetchServerState, saveServerState } from '../services/stateSync';
import {
  clearDataState,
  updateSettingsInState
} from './actions/settingsActions';
import {
  addStepToState,
  completeTaskInState,
  completeStepInState,
  skipStepInState,
  updateStepInState
} from './actions/stepActions';
import {
  addTaskToState,
  deleteTaskFromState,
  startTaskInState,
  swapFirstTaskInState,
  updateTaskInState
} from './actions/taskActions';
import { selectQueue, selectTodayHistory } from './selectors';
import { createInitialState, loadState, normalizeState, saveState } from './storage';
import { uid } from '../utils/id';

export function useFocusStore() {
  const [state, setState] = useState(loadState);
  const initialStateRef = useRef(state);
  const [serverReady, setServerReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    saveState(state);
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateAuth() {
      try {
        const payload = await fetchCurrentUser();
        if (!cancelled) setUser(payload.user || null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }

    hydrateAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      setServerReady(false);
      return undefined;
    }

    let cancelled = false;

    async function hydrateFromServer() {
      try {
        const payload = await fetchServerState();
        if (cancelled) return;

        if (payload.hasState) {
          setState(normalizeState(payload.state));
        } else {
          await saveServerState(initialStateRef.current);
        }
      } catch {
        // The app still works offline with localStorage if the backend is unavailable.
      } finally {
        if (!cancelled) setServerReady(true);
      }
    }

    hydrateFromServer();
    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  useEffect(() => {
    if (!serverReady || !user) return;

    const id = window.setTimeout(() => {
      saveServerState(state).catch(() => {});
    }, 350);

    return () => window.clearTimeout(id);
  }, [serverReady, state, user]);

  const acceptAuthPayload = useCallback((payload) => {
    if (payload.user) setUser(payload.user);
    if (payload.state) setState(normalizeState(payload.state));
    setServerReady(Boolean(payload.user));
  }, []);

  const clearUser = useCallback(() => {
    setUser(null);
    setServerReady(false);
    setState(createInitialState());
  }, []);

  const queue = useMemo(() => selectQueue(state.tasks), [state.tasks]);
  const todayHistory = useMemo(
    () => selectTodayHistory(state.history),
    [state.history]
  );

  const addTask = useCallback((title) => {
    const input = typeof title === 'string' ? { title } : title;
    const id = input.id || uid('task');
    setState((current) => addTaskToState(current, { ...input, id }));
    return id;
  }, []);

  const updateTask = useCallback((taskId, patch) => {
    setState((current) => updateTaskInState(current, taskId, patch));
  }, []);

  const deleteTask = useCallback((taskId) => {
    setState((current) => deleteTaskFromState(current, taskId));
  }, []);

  const startTask = useCallback((taskId) => {
    setState((current) => startTaskInState(current, taskId));
  }, []);

  const addStep = useCallback((taskId, title) => {
    setState((current) => addStepToState(current, taskId, title));
  }, []);

  const updateStep = useCallback((taskId, stepId, patch) => {
    setState((current) => updateStepInState(current, taskId, stepId, patch));
  }, []);

  const completeStep = useCallback((taskId, stepId, elapsedSeconds) => {
    setState((current) =>
      completeStepInState(current, taskId, stepId, elapsedSeconds)
    );
  }, []);

  const skipStep = useCallback((taskId, stepId, elapsedSeconds) => {
    setState((current) => skipStepInState(current, taskId, stepId, elapsedSeconds));
  }, []);

  const completeTask = useCallback((taskId, elapsedSeconds) => {
    setState((current) => completeTaskInState(current, taskId, elapsedSeconds));
  }, []);

  const swapFirstTask = useCallback(() => {
    setState(swapFirstTaskInState);
  }, []);

  const updateSettings = useCallback((patch) => {
    setState((current) => updateSettingsInState(current, patch));
  }, []);

  const clearData = useCallback(() => {
    setState(clearDataState());
  }, []);

  return {
    tasks: state.tasks,
    authReady,
    user,
    queue,
    settings: state.settings,
    history: state.history,
    todayHistory,
    addTask,
    updateTask,
    deleteTask,
    startTask,
    addStep,
    updateStep,
    completeStep,
    skipStep,
    completeTask,
    swapFirstTask,
    updateSettings,
    clearData,
    acceptAuthPayload,
    clearUser
  };
}
