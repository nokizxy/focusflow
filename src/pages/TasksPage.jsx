import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState';
import QuickTaskInput from '../components/QuickTaskInput';
import StepList from '../components/StepList';
import TaskCard from '../components/TaskCard';
import TaskMetaEditor from '../components/TaskMetaEditor';
import { breakdownTaskWithAI } from '../services/aiBreakdown';
import { compareQueueTasks } from '../store/selectors';
import { buildClarifiedTitle, getClarifyOptions } from '../utils/clarify';

export default function TasksPage({
  tasks,
  addTask,
  previewTaskBreakdown,
  addPlannedTask,
  updateTask,
  deleteTask,
  startTask,
  addStep,
  updateStep,
  settings,
  onStartFocus
}) {
  const [selectedId, setSelectedId] = useState(tasks[0]?.id || '');
  const [newStep, setNewStep] = useState('');
  const [taskFilter, setTaskFilter] = useState('today');
  const [renamingTaskId, setRenamingTaskId] = useState('');
  const [renameTitle, setRenameTitle] = useState('');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [taskSettingsOpen, setTaskSettingsOpen] = useState(false);
  const [aiState, setAiState] = useState({
    loading: false,
    error: '',
    success: '',
    clarify: null,
    preview: null,
    draftTitle: ''
  });
  const visibleTasks = useMemo(
    () =>
      tasks
        .filter((task) => matchesTaskFilter(task, taskFilter))
        .slice()
        .sort(taskFilter === 'done' ? compareCompletedTasks : compareQueueTasks),
    [taskFilter, tasks]
  );
  const selected = useMemo(
    () => visibleTasks.find((task) => task.id === selectedId) || visibleTasks[0],
    [selectedId, visibleTasks]
  );

  useEffect(() => {
    if (!visibleTasks.length) {
      setSelectedId('');
      return;
    }

    if (!visibleTasks.some((task) => task.id === selectedId)) {
      setSelectedId(visibleTasks[0].id);
    }
  }, [selectedId, visibleTasks]);

  useEffect(() => {
    setTaskSettingsOpen(false);
    setAiState({
      loading: false,
      error: '',
      success: '',
      clarify: null,
      preview: null,
      draftTitle: ''
    });
  }, [selected?.id]);

  function submitStep(event) {
    event.preventDefault();
    if (!selected) return;
    addStep(selected.id, newStep);
    setNewStep('');
  }

  function addTaskAndSelect(draft) {
    const taskId = addTask(draft);
    if (taskId) setSelectedId(taskId);
    return taskId;
  }

  function adoptPlanAndSelect(draft, plan) {
    const result = addPlannedTask(draft, plan);
    if (result?.taskId) {
      setSelectedId(result.taskId);
      window.setTimeout(() => {
        document.querySelector('.step-section-header')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 80);
    }
    return result;
  }

  async function requestAiBreakdown(taskTitle = selected?.title) {
    if (!selected || aiState.loading) return;
    if (!settings.aiEnabled) {
      setAiState({
        loading: false,
        error: '请先在设置页开启 AI 拆解任务。',
        success: '',
        clarify: null,
        preview: null,
        draftTitle: ''
      });
      return;
    }

    setAiState({
      loading: true,
      error: '',
      success: '',
      clarify: null,
      preview: null,
      draftTitle: taskTitle
    });
    try {
      const result = await breakdownTaskWithAI({
        task: {
          ...selected,
          title: taskTitle
        },
        spiceLevel: selected.spiceLevel || 2,
        context: selected.notes || ''
      });
      if (result.needClarify) {
        setAiState({
          loading: false,
          error: '',
          success: '',
          clarify: {
            question: result.question || '这条任务还需要补充一点具体信息。',
            options: getClarifyOptions(result.question)
          },
          preview: null,
          draftTitle: taskTitle
        });
        return;
      }
      if (result.autoAdopt) {
        updateTask(selected.id, {
          title: taskTitle,
          notes: result.notes || selected.notes,
          preface: result.preface || '',
          exitMessage: result.exitMessage || '',
          spiceLevel: result.spiceLevel || selected.spiceLevel || 2,
          steps: result.steps
        });
        setAiState({
          loading: false,
          error: '',
          success: `已直接拆好，第一步是：${result.steps?.[0]?.title || taskTitle}。`,
          clarify: null,
          preview: null,
          draftTitle: ''
        });
        return;
      }
      setAiState({
        loading: false,
        error: '',
        success: '',
        clarify: null,
        preview: result,
        draftTitle: taskTitle
      });
    } catch (error) {
      setAiState({
        loading: false,
        error: '这次没拆好，原来的步骤先保留。可以换个说法再试，或者直接开始第一步。',
        success: '',
        clarify: null,
        preview: null,
        draftTitle: taskTitle
      });
    }
  }

  function adoptAiPreview() {
    if (!selected || !aiState.preview) return;

    updateTask(selected.id, {
      title: aiState.draftTitle || selected.title,
      notes: aiState.preview.notes || selected.notes,
      preface: aiState.preview.preface || '',
      exitMessage: aiState.preview.exitMessage || '',
      spiceLevel: aiState.preview.spiceLevel || selected.spiceLevel || 2,
      steps: aiState.preview.steps
    });
    setAiState({
      loading: false,
      error: '',
      success: `已采用 ${aiState.preview.steps.length} 个未完成步骤，可以直接开始第一步。`,
      clarify: null,
      preview: null,
      draftTitle: ''
    });
  }

  function handleClarifyChoice(option) {
    if (!selected) return;

    if (option === '其他') {
      setAiState((current) => ({
        ...current,
        error: '把具体内容补到任务标题或备注里，再点 AI 拆解就行。'
      }));
      return;
    }

    requestAiBreakdown(buildClarifiedTitle(selected.title, option));
  }

  function startFocusFromTask(taskId) {
    startTask(taskId);
    onStartFocus();
  }

  function beginRename(task) {
    setRenamingTaskId(task.id);
    setRenameTitle(task.title);
  }

  function saveRename(taskId) {
    const trimmed = renameTitle.trim();
    if (trimmed) {
      updateTask(taskId, { title: trimmed });
    }
    setRenamingTaskId('');
    setRenameTitle('');
  }

  async function createRoutineTask(title) {
    const draft = {
      title,
      spiceLevel: 2,
      scheduleType: 'today',
      startDate: new Date().toISOString().slice(0, 10)
    };
    const plan = await previewTaskBreakdown(draft);
    if (plan?.needClarify) {
      const taskId = addTask(draft);
      if (taskId) setSelectedId(taskId);
      return;
    }
    adoptPlanAndSelect(draft, plan);
  }

  function setAllSelectedStepsChecked(done) {
    if (!selected) return;

    updateTask(selected.id, {
      steps: selected.steps.map((step) => ({
        ...step,
        done
      }))
    });
  }

  const selectedCheckedCount = selected?.steps.filter((step) => step.done).length || 0;
  const selectedStepCount = selected?.steps.length || 0;
  const selectedNextStep = selected?.steps.find((step) => !step.done) || selected?.steps[0];

  return (
    <main className={`page tasks-page ${mobileDetailOpen ? 'tasks-page--mobile-detail' : ''}`}>
      <aside className="tasks-list">
        <div className="tasks-list__header">
          <div>
            <div className="section-title">任务队列</div>
            <span>{getFilterHint(taskFilter)}</span>
          </div>
          <div className="tasks-list__filters" aria-label="任务筛选">
            {[
              ['today', '今天'],
              ['someday', 'Someday'],
              ['done', '已完成']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={taskFilter === value ? 'active' : ''}
                onClick={() => setTaskFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="tasks-list__scroll">
          {visibleTasks.length ? (
            visibleTasks.map((task) => (
              <div className="task-list-item" key={task.id}>
                {renamingTaskId === task.id ? (
                  <div className="task-list-item__rename">
                    <label>
                      任务名称
                      <input
                        value={renameTitle}
                        onChange={(event) => setRenameTitle(event.target.value)}
                        autoFocus
                      />
                    </label>
                    <div>
                      <button type="button" onClick={() => saveRename(task.id)}>
                        保存
                      </button>
                      <button type="button" onClick={() => setRenamingTaskId('')}>
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <TaskCard
                      task={task}
                      active={selected?.id === task.id}
                      onClick={() => {
                        setSelectedId(task.id);
                        setMobileDetailOpen(true);
                      }}
                    />
                    <div className="task-list-item__actions">
                      {task.status !== 'done' && (
                        <button
                          className="btn btn--secondary task-list-item__start"
                          onClick={() => startFocusFromTask(task.id)}
                        >
                          开始这一小步
                        </button>
                      )}
                      <button
                        className="task-list-item__rename-button"
                        type="button"
                        onClick={() => beginRename(task)}
                      >
                        重命名
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <EmptyState
              icon="＋"
              title={getEmptyTitle(taskFilter)}
              desc={getEmptyDesc(taskFilter)}
            />
          )}
        </div>
        <QuickTaskInput
          onAddTask={addTaskAndSelect}
          onPlanTask={previewTaskBreakdown}
          onAdoptPlan={adoptPlanAndSelect}
          onStartTask={startFocusFromTask}
          onCreateRoutine={createRoutineTask}
          compact
        />
      </aside>

      <section className="task-detail">
        {!selected ? (
          <EmptyState icon="←" title="选一个任务看详情" desc="从左边列表中点击任意任务。" />
        ) : (
          <>
            <div className="task-detail__header">
              <button
                className="task-detail__back"
                type="button"
                onClick={() => setMobileDetailOpen(false)}
              >
                ← 队列
              </button>
              <input
                className="task-detail__title"
                value={selected.title}
                onChange={(event) => updateTask(selected.id, { title: event.target.value })}
              />
              <button
                className="btn btn--primary"
                onClick={() => startFocusFromTask(selected.id)}
                disabled={selected.status === 'done'}
              >
                开始这一小步
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => requestAiBreakdown()}
                disabled={aiState.loading || !settings.aiEnabled}
              >
                {aiState.loading ? '拆解中...' : 'AI 拆解'}
              </button>
              <button
                className="btn btn--danger-soft"
                onClick={() => {
                  if (window.confirm('确定删除这个任务吗？')) deleteTask(selected.id);
                }}
              >
                删除任务
              </button>
            </div>
            {selectedNextStep && selected.status !== 'done' && (
              <section className="task-next-step">
                <div>
                  <span>现在只看这一小步</span>
                  <h2>{selectedNextStep.title}</h2>
                  <p>{selectedNextStep.detail || '做完这一步就算往前走了。'}</p>
                </div>
                <button className="btn btn--primary" onClick={() => startFocusFromTask(selected.id)}>
                  开始
                </button>
              </section>
            )}
            <section className={`task-settings ${taskSettingsOpen ? 'task-settings--open' : ''}`}>
              <button
                className="task-settings__toggle"
                type="button"
                aria-expanded={taskSettingsOpen}
                onClick={() => setTaskSettingsOpen((open) => !open)}
              >
                <span>任务设置</span>
                <em>{getTaskSettingsSummary(selected)}</em>
              </button>
              {taskSettingsOpen && (
                <div className="task-settings__content">
                  <textarea
                    className="task-detail__notes"
                    value={selected.notes}
                    onChange={(event) => updateTask(selected.id, { notes: event.target.value })}
                    placeholder="写一点上下文..."
                  />
                  <TaskMetaEditor
                    task={selected}
                    onChange={(patch) => updateTask(selected.id, patch)}
                  />
                </div>
              )}
            </section>
            {aiState.error && <div className="task-detail__error">{aiState.error}</div>}
            {aiState.success && <div className="task-detail__success">{aiState.success}</div>}
            {aiState.clarify && (
              <section className="task-ai-card">
                <div>
                  <strong>先问一下</strong>
                  <span>{aiState.clarify.question}</span>
                </div>
                <div className="task-ai-card__chips">
                  {aiState.clarify.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleClarifyChoice(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {aiState.preview && (
              <section className="task-ai-card">
                <div>
                  <strong>先看一眼拆法</strong>
                  <span>确认合适后再覆盖当前步骤。</span>
                </div>
                <div className="task-ai-preview">
                  {aiState.preview.steps.map((step, index) => (
                    <article
                      key={step.id || `${step.title}-${index}`}
                      className={step.isWinningLine ? 'task-ai-preview__step task-ai-preview__step--winning' : 'task-ai-preview__step'}
                    >
                      <span>{index + 1}</span>
                      <div>
                        <strong>{step.title}</strong>
                        <small>{step.detail}</small>
                      </div>
                      <em>{step.minutes}m</em>
                    </article>
                  ))}
                </div>
                <div className="task-ai-card__actions">
                  <button className="btn btn--primary" type="button" onClick={adoptAiPreview}>
                    采用这个拆法
                  </button>
                  <button className="btn btn--secondary" type="button" onClick={() => requestAiBreakdown(aiState.draftTitle || selected.title)}>
                    换个拆法
                  </button>
                </div>
              </section>
            )}
            <div className="step-section-header">
              <div>
                <div className="section-title">步骤</div>
                <span>{selectedCheckedCount}/{selectedStepCount} 已勾选</span>
              </div>
              <div className="step-section-actions" aria-label="批量勾选步骤">
                <button
                  type="button"
                  onClick={() => setAllSelectedStepsChecked(true)}
                  disabled={selectedCheckedCount === selectedStepCount}
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={() => setAllSelectedStepsChecked(false)}
                  disabled={selectedCheckedCount === 0}
                >
                  全不选
                </button>
              </div>
            </div>
            <StepList
              taskId={selected.id}
              steps={selected.steps}
              onUpdateStep={updateStep}
            />
            <form className="quick-add quick-add--step" onSubmit={submitStep}>
              <input
                value={newStep}
                onChange={(event) => setNewStep(event.target.value)}
                placeholder="+ 添加步骤..."
              />
              <button className="btn btn--icon" title="添加步骤">＋</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

function matchesTaskFilter(task, filter) {
  if (filter === 'done') return task.status === 'done';
  if (filter === 'someday') {
    return task.status !== 'done' && (task.scheduleType === 'someday' || task.startDate === 'none');
  }
  return task.status !== 'done' && task.scheduleType !== 'someday' && task.startDate !== 'none';
}

function getFilterHint(filter) {
  if (filter === 'done') return '已经完成';
  if (filter === 'someday') return '以后再说';
  return '可开始的事';
}

function getTaskSettingsSummary(task) {
  const parts = [];
  if (task.project) parts.push(task.project);
  if (task.startTime) parts.push(`${task.startTime} 开始`);
  if (task.deadlineDate && task.deadlineDate !== 'none') parts.push(`${task.deadlineDate} 截止`);
  if (task.startDate && task.startDate !== 'none' && !task.startTime) parts.push(task.startDate);
  return parts.length ? parts.join(' · ') : '备注、开始时间、截止时间';
}

function getEmptyTitle(filter) {
  if (filter === 'done') return '还没有完成记录';
  if (filter === 'someday') return 'Someday 暂时是空的';
  return '今天没有可开始任务';
}

function getEmptyDesc(filter) {
  if (filter === 'done') return '完成任务后会从队列里移到这里。';
  if (filter === 'someday') return '那些暂时不想面对的事，可以先放这里。';
  return '把脑子里的事情倒出来，先开始一个小步骤。';
}

function compareCompletedTasks(a, b) {
  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
}
