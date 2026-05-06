import { useState } from 'react';
import { normalizeDueDate, toDateInputValue } from '../utils/taskMeta';
import { parseQuickTaskText } from '../utils/quickTaskParser';
import { buildClarifiedTitle, getClarifyOptions } from '../utils/clarify';
import QuickTaskMetaPanel from './QuickTaskMetaPanel';

const spiceOptions = [
  { value: 1, icon: '😌', label: '还好', thinking: '在想一个利落的拆法……' },
  { value: 2, icon: '😣', label: '有点烦', thinking: '知道了，给你拆得细一点。' },
  { value: 3, icon: '🥵', label: '想到累', thinking: '嗯，这件事确实有点重。先帮你卸一半。' }
];

export default function QuickTaskInput({
  onAddTask,
  onPlanTask,
  onAdoptPlan,
  onStartTask,
  onCreateRoutine,
  compact = false
}) {
  const [title, setTitle] = useState('');
  const [activePanel, setActivePanel] = useState('');
  const [tag, setTag] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [scheduleType, setScheduleType] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(toDateInputValue());
  const [startTime, setStartTime] = useState('');
  const [deadlineType, setDeadlineType] = useState('none');
  const [customDeadlineDate, setCustomDeadlineDate] = useState(toDateInputValue());
  const [minutes, setMinutes] = useState(15);
  const [customMinutes, setCustomMinutes] = useState(15);
  const [customMinutesActive, setCustomMinutesActive] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);
  const [selectedSpice, setSelectedSpice] = useState(2);
  const [planningState, setPlanningState] = useState({
    loading: false,
    error: '',
    clarify: null,
    preview: null
  });
  const [notice, setNotice] = useState(null);

  function resetDraft() {
    setTitle('');
    setActivePanel('');
    setTag('');
    setCustomTag('');
    setScheduleType('today');
    setCustomStartDate(toDateInputValue());
    setStartTime('');
    setDeadlineType('none');
    setCustomDeadlineDate(toDateInputValue());
    setMinutes(15);
    setCustomMinutes(15);
    setCustomMinutesActive(false);
  }

  function submit(event) {
    event.preventDefault();
    const parsed = parseQuickTaskText(title);
    if (!parsed.title) return;
    setNotice(null);

    const draft = {
      title: parsed.title,
      tag: customTag.trim() || tag || parsed.tag,
      date: parsed.startDate || normalizeDueDate(scheduleType),
      startDate: parsed.startDate || normalizeDueDate(scheduleType === 'custom' ? customStartDate : scheduleType),
      startTime: scheduleType === 'custom' ? startTime : '',
      deadlineDate: parsed.deadlineDate || normalizeDueDate(deadlineType === 'custom' ? customDeadlineDate : deadlineType),
      scheduleType,
      minutes: parsed.minutes || (customMinutesActive ? customMinutes : minutes)
    };

    if (onPlanTask) {
      setPendingTask(draft);
      setSelectedSpice(2);
      setPlanningState({ loading: false, error: '', clarify: null, preview: null });
      return;
    }

    const result = onAddTask(draft);
    setNotice(buildCreationNotice({
      message: `已放到今天，第一步是：${draft.title}`,
      result
    }));
    resetDraft();
  }

  async function chooseSpice(spiceLevel) {
    if (!pendingTask || planningState.loading) return;

    setSelectedSpice(spiceLevel);
    setPlanningState({ loading: true, error: '', clarify: null, preview: null });

    try {
      const result = await onPlanTask({
        ...pendingTask,
        spiceLevel
      });
      if (result?.needClarify) {
        setPlanningState({
          loading: false,
          error: '',
          clarify: {
            question: result.question,
            options: getClarifyOptions(result.question)
          },
          preview: null
        });
        return;
      }
      if (result?.autoAdopt) {
        adoptPlanForTask({ ...pendingTask, spiceLevel }, result);
        return;
      }
      setPlanningState({ loading: false, error: '', clarify: null, preview: result });
    } catch (error) {
      setPlanningState({
        loading: false,
        error: error.message || 'AI 拆解失败，先用手动任务接住也可以。'
      });
    }
  }

  function addWithoutAi() {
    if (!pendingTask) return;
    const result = onAddTask({
      ...pendingTask,
      spiceLevel: selectedSpice
    });
    setNotice(buildCreationNotice({
      message: `已先保存，第一步是：${pendingTask.title}`,
      result
    }));
    resetDraft();
    setPendingTask(null);
    setPlanningState({ loading: false, error: '', clarify: null, preview: null });
  }

  function adoptPreview() {
    if (!pendingTask || !planningState.preview) return;

    return adoptPlanForTask({ ...pendingTask, spiceLevel: selectedSpice }, planningState.preview);
  }

  function adoptPlanForTask(taskDraft, plan) {
    const result = onAdoptPlan
      ? onAdoptPlan(taskDraft, plan)
      : onAddTask({
          ...taskDraft,
          steps: plan.steps,
          notes: plan.notes || taskDraft.notes || '',
          preface: plan.preface || '',
          exitMessage: plan.exitMessage || ''
        });

    const firstStep = plan.steps?.[0]?.title || taskDraft.title;
    setNotice(buildCreationNotice({
      message: plan.autoAdopt ? `已直接拆好，第一步是：${firstStep}` : `已放到今天，第一步是：${firstStep}`,
      result
    }));
    resetDraft();
    setPendingTask(null);
    setPlanningState({ loading: false, error: '', clarify: null, preview: null });
    return result;
  }

  async function chooseClarification(option) {
    if (!pendingTask || planningState.loading) return;
    if (option === '其他') {
      setPlanningState((current) => ({
        ...current,
        error: '把具体内容补到输入框里，再点添加就行。'
      }));
      return;
    }

    const clarifiedTask = {
      ...pendingTask,
      title: buildClarifiedTitle(pendingTask.title, option),
      spiceLevel: selectedSpice
    };

    setPendingTask(clarifiedTask);
    setPlanningState({ loading: true, error: '', clarify: null, preview: null });

    try {
      const result = await onPlanTask(clarifiedTask);
      if (result?.needClarify) {
        setPlanningState({
          loading: false,
          error: '',
          clarify: {
            question: result.question,
            options: getClarifyOptions(result.question)
          },
          preview: null
        });
        return;
      }

      if (result?.autoAdopt) {
        adoptPlanForTask(clarifiedTask, result);
        return;
      }

      setPlanningState({ loading: false, error: '', clarify: null, preview: result });
    } catch (error) {
      setPlanningState({
        loading: false,
        error: error.message || 'AI 拆解失败，先用手动任务接住也可以。',
        clarify: null,
        preview: null
      });
    }
  }

  const activeSpice = spiceOptions.find((option) => option.value === selectedSpice) || spiceOptions[1];

  return (
    <form className={`quick-task ${compact ? 'quick-task--compact' : ''}`} onSubmit={submit}>
      <div className="quick-task__main">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="写下一个想开始的事..."
        />
        <button className="btn btn--primary" type="submit">
          添加
        </button>
      </div>
      {pendingTask && (
        <section className="quick-task__spice" aria-live="polite">
          {planningState.loading ? (
            <div className="quick-task__thinking">
              <p>{activeSpice.thinking}</p>
              <span aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <button className="quick-task__quiet-button" type="button" onClick={addWithoutAi}>
                不等了，先保存
              </button>
            </div>
          ) : planningState.clarify ? (
            <>
              <div className="quick-task__spice-header">
                <strong>先问一下</strong>
                <span>{planningState.clarify.question}</span>
              </div>
              <div className="quick-task__clarify-options">
                {planningState.clarify.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="quick-task__clarify-chip"
                    onClick={() => chooseClarification(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {planningState.error && <p className="quick-task__error">{planningState.error}</p>}
              <div className="quick-task__spice-footer">
                <button className="quick-task__quiet-button" type="button" onClick={addWithoutAi}>
                  先不拆，直接放进队列
                </button>
                <button
                  className="quick-task__quiet-button"
                  type="button"
                  onClick={() => setPlanningState({ loading: false, error: '', clarify: null, preview: null })}
                >
                  返回选择
                </button>
              </div>
            </>
          ) : planningState.preview ? (
            <>
              <div className="quick-task__spice-header">
                <strong>先看一眼拆法</strong>
                <span>不合适就换，别让 AI 污染你的队列</span>
              </div>
              <div className="quick-task__preview-list">
                {planningState.preview.steps.map((step, index) => (
                  <article
                    className={step.isWinningLine ? 'quick-task__preview-step quick-task__preview-step--winning' : 'quick-task__preview-step'}
                    key={step.id || `${step.title}-${index}`}
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
              <div className="quick-task__preview-actions">
                <button className="btn btn--primary" type="button" onClick={adoptPreview}>
                  采用这个拆法
                </button>
                <button className="btn btn--secondary" type="button" onClick={() => chooseSpice(selectedSpice)}>
                  换个拆法
                </button>
              </div>
              <div className="quick-task__spice-footer">
                <button className="quick-task__quiet-button" type="button" onClick={addWithoutAi}>
                  先不拆，直接放进队列
                </button>
                <button className="quick-task__quiet-button" type="button" onClick={() => setPendingTask(null)}>
                  取消
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="quick-task__spice-header">
                <strong>这件事现在让你多卡？</strong>
                <span>选一个，没有对错</span>
              </div>
              <div className="quick-task__spice-options">
                {spiceOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      option.value === selectedSpice
                        ? 'quick-task__spice-option quick-task__spice-option--active'
                        : 'quick-task__spice-option'
                    }
                    onClick={() => chooseSpice(option.value)}
                  >
                    <span>{option.icon}</span>
                    <small>{option.label}</small>
                  </button>
                ))}
              </div>
              {planningState.error && <p className="quick-task__error">{planningState.error}</p>}
              <div className="quick-task__spice-footer">
                <button className="quick-task__quiet-button" type="button" onClick={addWithoutAi}>
                  先不拆，直接放进队列
                </button>
                <button
                  className="quick-task__quiet-button"
                  type="button"
                  onClick={() => setPendingTask(null)}
                >
                  取消
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {notice && (
        <div className="quick-task__notice">
          <span>{notice.message}</span>
          {notice.taskId && onStartTask && (
            <button type="button" onClick={() => onStartTask(notice.taskId)}>
              开始第一步
            </button>
          )}
        </div>
      )}
      <QuickTaskMetaPanel
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        tag={tag}
        setTag={setTag}
        customTag={customTag}
        setCustomTag={setCustomTag}
        scheduleType={scheduleType}
        setScheduleType={setScheduleType}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        startTime={startTime}
        setStartTime={setStartTime}
        deadlineType={deadlineType}
        setDeadlineType={setDeadlineType}
        customDeadlineDate={customDeadlineDate}
        setCustomDeadlineDate={setCustomDeadlineDate}
        minutes={minutes}
        setMinutes={setMinutes}
        customMinutes={customMinutes}
        setCustomMinutes={setCustomMinutes}
        setCustomMinutesActive={setCustomMinutesActive}
        onCreateRoutine={onCreateRoutine}
      />
    </form>
  );
}

function buildCreationNotice({ message, result }) {
  const taskId = typeof result === 'string' ? result : result?.taskId;
  return {
    message,
    taskId: taskId || ''
  };
}
