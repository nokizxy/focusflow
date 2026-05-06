import { useState } from 'react';
import Nav from './components/Nav';
import { useShortcuts } from './hooks/useShortcuts';
import AuthPage from './pages/AuthPage';
import FocusPage from './pages/FocusPage';
import LaunchPage from './pages/LaunchPage';
import ReviewPage from './pages/ReviewPage';
import SettingsPage from './pages/SettingsPage';
import TasksPage from './pages/TasksPage';
import { loginUser, logoutUser, registerUser } from './services/authService';
import { breakdownTaskWithAI } from './services/aiBreakdown';
import { useFocusStore } from './store/useFocusStore';
import { uid } from './utils/id';

export default function App() {
  const store = useFocusStore();
  const [currentPage, setCurrentPage] = useState('launch');
  const [focusActive, setFocusActive] = useState(false);
  const [authError, setAuthError] = useState('');

  async function handleLogin(credentials) {
    setAuthError('');
    try {
      store.acceptAuthPayload(await loginUser(credentials));
      setCurrentPage('launch');
    } catch (error) {
      setAuthError(error.message || '登录失败。');
    }
  }

  async function handleRegister(credentials) {
    setAuthError('');
    try {
      store.acceptAuthPayload(await registerUser(credentials));
      setCurrentPage('launch');
    } catch (error) {
      setAuthError(error.message || '注册失败。');
    }
  }

  async function handleLogout() {
    await logoutUser().catch(() => {});
    store.clearUser();
    setFocusActive(false);
    setCurrentPage('launch');
  }

  async function previewTaskBreakdown(draft) {
    if (!store.settings.aiEnabled) {
      return {
        needClarify: false,
        preface: '',
        notes: draft.notes || '',
        exitMessage: '',
        spiceLevel: draft.spiceLevel || 2,
        steps: [
          {
            id: uid('step'),
            title: draft.title,
            detail: '先做这一小步就够了。',
            minutes: draft.minutes || store.settings.defaultMinutes,
            done: false,
            isMicroStart: true,
            isWinningLine: true
          }
        ]
      };
    }

    return breakdownTaskWithAI({
      task: {
        title: draft.title,
        notes: draft.notes || ''
      },
      spiceLevel: draft.spiceLevel,
      context: draft.notes || ''
    });
  }

  function addPlannedTask(draft, plan) {
    const taskId = draft.id || uid('task');

    store.addTask({
      ...draft,
      id: taskId,
      notes: plan.notes || draft.notes || '',
      preface: plan.preface || '',
      exitMessage: plan.exitMessage || '',
      spiceLevel: plan.spiceLevel || draft.spiceLevel,
      steps: plan.steps
    });

    return { created: true, taskId, model: plan.model };
  }

  useShortcuts({
    currentPage,
    setCurrentPage,
    setFocusActive,
    addTask: store.addTask
  });

  if (!store.authReady) {
    return (
      <div className="app-shell">
        <main className="page page--center">
          <p className="muted">正在连接 FocusFlow...</p>
        </main>
      </div>
    );
  }

  if (!store.user) {
    return (
      <AuthPage
        onLogin={handleLogin}
        onRegister={handleRegister}
        authError={authError}
      />
    );
  }

  return (
    <div className="app-shell">
      <Nav
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        focusActive={focusActive}
        user={store.user}
        onLogout={handleLogout}
      />
      {currentPage === 'launch' && (
        <LaunchPage
          queue={store.queue}
          addTask={store.addTask}
          previewTaskBreakdown={previewTaskBreakdown}
          addPlannedTask={addPlannedTask}
          startTask={store.startTask}
          swapFirstTask={store.swapFirstTask}
          setCurrentPage={setCurrentPage}
          onStartFocus={() => setFocusActive(true)}
        />
      )}
      {currentPage === 'tasks' && (
        <TasksPage
          tasks={store.tasks}
          addTask={store.addTask}
          previewTaskBreakdown={previewTaskBreakdown}
          addPlannedTask={addPlannedTask}
          updateTask={store.updateTask}
          deleteTask={store.deleteTask}
          startTask={store.startTask}
          addStep={store.addStep}
          updateStep={store.updateStep}
          settings={store.settings}
          onStartFocus={() => setFocusActive(true)}
        />
      )}
      {currentPage === 'review' && (
        <ReviewPage todayHistory={store.todayHistory} setCurrentPage={setCurrentPage} />
      )}
      {currentPage === 'settings' && (
        <SettingsPage
          settings={store.settings}
          updateSettings={store.updateSettings}
          clearData={store.clearData}
          setCurrentPage={setCurrentPage}
        />
      )}
      {focusActive && (
        <FocusPage
          queue={store.queue}
          settings={store.settings}
          completeStep={store.completeStep}
          skipStep={store.skipStep}
          completeTask={store.completeTask}
          onExit={() => setFocusActive(false)}
        />
      )}
    </div>
  );
}
