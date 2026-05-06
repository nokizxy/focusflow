import { useEffect, useMemo, useRef, useState } from 'react';

function formatTime(seconds) {
  const abs = Math.abs(seconds);
  const minutes = Math.floor(abs / 60).toString().padStart(2, '0');
  const rest = (abs % 60).toString().padStart(2, '0');
  return `${seconds < 0 ? '+' : ''}${minutes}:${rest}`;
}

export default function FocusPage({
  queue,
  settings,
  completeStep,
  skipStep,
  completeTask,
  onExit
}) {
  const task = queue[0];
  const step = useMemo(() => task?.steps.find((item) => !item.done), [task]);
  const initialSeconds = (step?.minutes || settings.defaultMinutes) * 60;
  const [phase, setPhase] = useState('countdown');
  const phaseRef = useRef(phase);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(settings.breakMinutes * 60);
  const [elapsed, setElapsed] = useState(0);
  const [breakTarget, setBreakTarget] = useState('step');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phaseRef.current === 'break') return;

    setPhase('countdown');
    setSecondsLeft(initialSeconds);
    setBreakSecondsLeft(settings.breakMinutes * 60);
    setElapsed(0);
    setBreakTarget('step');
  }, [initialSeconds, settings.breakMinutes, step?.id]);

  useEffect(() => {
    if (!task || !step || (phase !== 'countdown' && phase !== 'overtime')) return undefined;

    const id = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (phase === 'countdown' && value <= 1) {
          setPhase('overtime');
          return 0;
        }
        return value - 1;
      });
      setElapsed((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(id);
  }, [phase, step, task]);

  useEffect(() => {
    if (phase !== 'break') return undefined;
    const id = window.setInterval(() => {
      setBreakSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'feedback') return undefined;

    const id = window.setTimeout(() => {
      setFeedback(null);
      setPhase('countdown');
    }, 1500);

    return () => window.clearTimeout(id);
  }, [phase]);

  function shouldRestAfterTask() {
    return queue.length > 1 && settings.breakBetweenTasks;
  }

  function completeCurrentStep() {
    if (!task || !step) return;

    const finishingTask = task.steps.filter((item) => !item.done).length === 1;
    const reachedWinningLine = Boolean(step.isWinningLine);
    const nextFeedback = getCompletionFeedback(task.spiceLevel, reachedWinningLine);
    completeStep(task.id, step.id, elapsed);

    if (reachedWinningLine) {
      setFeedback({
        type: 'victory',
        title: '今天赢了',
        message: task.exitMessage || '剩下的，明天的你来处理。也可以继续，但没必要硬撑。'
      });
      setPhase('victory');
      return;
    }

    if (finishingTask && shouldRestAfterTask()) {
      setBreakTarget('task');
      setBreakSecondsLeft(settings.breakMinutes * 60);
      setPhase('break');
      return;
    }

    setFeedback(nextFeedback);
    setPhase('feedback');
  }

  function skipCurrentStep() {
    if (!task || !step) return;

    const finishingTask = task.steps.filter((item) => !item.done).length === 1;
    skipStep(task.id, step.id, elapsed);

    if (finishingTask && shouldRestAfterTask()) {
      setBreakTarget('task');
      setBreakSecondsLeft(settings.breakMinutes * 60);
      setPhase('break');
    }
  }

  function completeCurrentTask() {
    if (!task) return;
    completeTask(task.id, elapsed);

    if (shouldRestAfterTask()) {
      setBreakTarget('task');
      setBreakSecondsLeft(settings.breakMinutes * 60);
      setPhase('break');
    }
  }

  function startBreak(target = 'step') {
    setBreakTarget(target);
    setBreakSecondsLeft(settings.breakMinutes * 60);
    setPhase('break');
  }

  function continueAfterBreak() {
    if (breakTarget === 'task') {
      setSecondsLeft(initialSeconds);
      setElapsed(0);
      setBreakTarget('step');
      setPhase('countdown');
      return;
    }

    setPhase('overtime');
  }

  if (!task || !step) {
    return (
      <div className="focus-mode">
        <div className="focus-complete">
          <h1>全部搞定！</h1>
          <p>今天已经清空当前队列。</p>
          <button className="btn btn--primary" onClick={onExit}>
            回到开始页
          </button>
        </div>
      </div>
    );
  }

  const completed = task.steps.filter((item) => item.done).length;
  const isOvertime = phase === 'overtime';
  const progressRatio = isOvertime
    ? 1
    : Math.max(0, Math.min(1, secondsLeft / Math.max(1, initialSeconds)));
  const progressTone =
    progressRatio > 0.6 ? 'steady' : progressRatio > 0.3 ? 'warm' : 'low';

  if (phase === 'victory' && feedback) {
    return (
      <div className="focus-mode focus-mode--victory">
        <div className="focus-victory">
          <div className="focus-victory__flag">🏁</div>
          <h1>{feedback.title}</h1>
          <p>{feedback.message}</p>
          <div className="focus-mode__actions">
            <button className="btn btn--focus" onClick={onExit}>
              今天就到这
            </button>
            <button
              className="btn btn--ghost-light"
              onClick={() => {
                setFeedback(null);
                setPhase('countdown');
              }}
            >
              我还想继续
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'feedback' && feedback) {
    return (
      <div className={`focus-mode focus-mode--feedback focus-mode--feedback-${feedback.tone}`}>
        <div className="focus-feedback">
          <span aria-hidden="true" />
          <h1>{feedback.title}</h1>
        </div>
      </div>
    );
  }

  if (phase === 'break') {
    const nextTask = breakTarget === 'task' ? queue[0] : task;

    return (
      <div className="focus-mode focus-mode--break">
        <button className="focus-mode__exit" onClick={onExit} title="退出">
          ×
        </button>
        <div className="focus-break">
          <div className="focus-break__eyebrow">
            {breakTarget === 'task' ? '任务完成，先休息一下' : '先离开一下也可以'}
          </div>
          <h1>{formatTime(breakSecondsLeft)}</h1>
          <p>{breakTarget === 'task' ? `下一个任务：${nextTask?.title || '暂无任务'}` : `回来后继续：${step.title}`}</p>
          <div className="focus-mode__actions">
            <button className="btn btn--focus" onClick={continueAfterBreak}>
              {breakTarget === 'task' ? '开始下个任务' : '回到检查点'}
            </button>
            <button className="btn btn--ghost-light" onClick={onExit}>
              回到开始页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`focus-mode ${isOvertime ? 'focus-mode--overtime' : ''}`}>
      <button className="focus-mode__exit" onClick={onExit} title="退出">
        ×
      </button>
      <div className="focus-mode__content">
        <div className="focus-mode__task">{task.title}</div>
        <h1>{step.title}</h1>
        {step.detail && <p className="focus-mode__detail">{step.detail}</p>}
        <div className={`focus-mode__timer ${isOvertime ? 'focus-mode__timer--overtime' : ''}`}>
          {formatTime(secondsLeft)}
        </div>
        {!isOvertime && (
          <div className={`focus-timebar focus-timebar--${progressTone}`} aria-hidden="true">
            <span style={{ width: `${progressRatio * 100}%` }} />
          </div>
        )}

        {isOvertime && (
          <p className="focus-mode__overtime-note">
            已经超过预估了，不算失败。做完这一小步再停就好。
          </p>
        )}

        <div className="focus-mode__actions">
          <button className="btn btn--focus" onClick={completeCurrentStep}>
            完成这一步
          </button>
          {isOvertime ? (
            <>
              <button className="btn btn--ghost-light" onClick={() => startBreak('step')}>
                休息一下
              </button>
              <button className="btn btn--ghost-light" onClick={onExit}>
                稍后继续
              </button>
              <button className="btn btn--ghost-light" onClick={skipCurrentStep}>
                跳过
              </button>
            </>
          ) : (
            <button className="btn btn--ghost-light" onClick={onExit}>
              稍后继续
            </button>
          )}
          <button className="btn btn--ghost-light" onClick={completeCurrentTask}>
            整个任务完成
          </button>
        </div>
        <div className="focus-mode__progress">
          {step.isWinningLine ? '做到这里就算赢' : `今日进度：${completed}/${task.steps.length} 步`}
        </div>
      </div>
    </div>
  );
}

function getCompletionFeedback(spiceLevel = 2, isWinningLine = false) {
  if (isWinningLine) {
    return {
      type: 'victory',
      tone: 'win',
      title: '今天赢了'
    };
  }

  const pools = {
    1: ['动起来了', '这一步，搞定', '干净利落'],
    2: ['你比刚才轻一点了', '这一小步赢了', '看，已经开始了'],
    3: ['今天的你已经在赢了', '别小看这一步，它最难', '继续不继续都行']
  };
  const pool = pools[spiceLevel] || pools[2];

  return {
    type: 'step',
    tone: spiceLevel === 3 ? 'soft' : spiceLevel === 1 ? 'steady' : 'warm',
    title: pool[Math.floor(Math.random() * pool.length)]
  };
}
