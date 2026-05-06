import { useState } from 'react';
import EmptyState from '../components/EmptyState';
import { formatClockTime, formatReviewDate, secondsToRoundedMinutes } from '../utils/date';

function getEventLabel(item) {
  if (item.completedTask) return '完成任务';
  if (item.skipped) return '跳过步骤';
  return '完成步骤';
}

function getEventClass(item) {
  if (item.completedTask) return 'review-item--task';
  if (item.skipped) return 'review-item--skipped';
  return 'review-item--step';
}

function groupByTask(history) {
  const groups = new Map();
  history.forEach((item) => {
    const key = item.taskId || item.taskTitle;
    const existing = groups.get(key) || {
      taskId: key,
      taskTitle: item.taskTitle,
      events: [],
      minutes: 0,
      completedTask: false,
      skipped: 0,
      lastAt: item.completedAt
    };

    existing.events.push(item);
    existing.minutes += secondsToRoundedMinutes(item.elapsedSeconds);
    existing.completedTask = existing.completedTask || Boolean(item.completedTask);
    existing.skipped += item.skipped ? 1 : 0;
    existing.lastAt = item.completedAt > existing.lastAt ? item.completedAt : existing.lastAt;
    groups.set(key, existing);
  });

  return Array.from(groups.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export default function ReviewPage({ todayHistory, setCurrentPage }) {
  const taskEvidence = groupByTask(todayHistory);
  const [expandedTaskIds, setExpandedTaskIds] = useState(() =>
    taskEvidence.slice(0, 2).map((group) => group.taskId)
  );
  const [timelineOpen, setTimelineOpen] = useState(false);
  const startedTasks = taskEvidence.length;
  const movedSteps = todayHistory.filter((item) => !item.completedTask && !item.skipped).length;
  const completedTasks = todayHistory.filter((item) => item.completedTask).length;
  const totalMinutes = todayHistory.reduce(
    (sum, item) => sum + secondsToRoundedMinutes(item.elapsedSeconds),
    0
  );
  const date = formatReviewDate();
  const reviewMessage = getReviewMessage({ startedTasks, movedSteps, completedTasks });

  function toggleTaskEvidence(taskId) {
    setExpandedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId]
    );
  }

  if (!todayHistory.length) {
    return (
      <main className="page review-page page--center">
        <EmptyState
          icon="○"
          title="今天还没开始呢"
          desc="先去开始页启动第一个任务。"
          actionText="回到开始页"
          onAction={() => setCurrentPage('launch')}
        />
      </main>
    );
  }

  return (
    <main className="page review-page">
      <section className="review-summary">
        <div>
          <div className="section-title">启动证据</div>
          <h1>{date}</h1>
          <p>{reviewMessage}</p>
        </div>
        <div className="review-summary__stats">
          <div><strong>{startedTasks}</strong><span>启动任务</span></div>
          <div><strong>{movedSteps}</strong><span>推进小步</span></div>
          <div><strong>{completedTasks}</strong><span>完成任务</span></div>
          <div><strong>{totalMinutes}</strong><span>专注分钟</span></div>
        </div>
      </section>
      <section className="review-evidence">
        {taskEvidence.map((group) => (
          <article
            className={`review-evidence-card ${expandedTaskIds.includes(group.taskId) ? 'review-evidence-card--open' : ''}`}
            key={group.taskId}
          >
            <button
              className="review-evidence-card__header"
              type="button"
              aria-expanded={expandedTaskIds.includes(group.taskId)}
              onClick={() => toggleTaskEvidence(group.taskId)}
            >
              <div>
                <span>{group.completedTask ? '跨过终点' : group.skipped ? '保留余地' : '已经启动'}</span>
                <h2>{group.taskTitle}</h2>
                <p>
                  {group.events.length} 条证据 · {group.minutes} 分钟
                  {group.skipped ? ` · ${group.skipped} 次跳过` : ''}
                </p>
              </div>
              <div className="review-evidence-card__meta">
                <time>{formatClockTime(group.lastAt)}</time>
                <em>{expandedTaskIds.includes(group.taskId) ? '收起' : '展开'}</em>
              </div>
            </button>
            {expandedTaskIds.includes(group.taskId) && (
              <div className="review-evidence-card__events">
                {group.events.slice().reverse().map((item) => (
                  <div className={`review-evidence-event ${getEventClass(item)}`} key={item.id}>
                    <time>{formatClockTime(item.completedAt)}</time>
                    <div>
                      <strong>{getEventLabel(item)}</strong>
                      <span>{item.stepTitle}</span>
                    </div>
                    <em>{secondsToRoundedMinutes(item.elapsedSeconds)} 分钟</em>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </section>
      <section className={`review-timeline-panel ${timelineOpen ? 'review-timeline-panel--open' : ''}`}>
        <button type="button" onClick={() => setTimelineOpen((open) => !open)}>
          <span>完整时间线</span>
          <em>{timelineOpen ? '收起' : '查看全部记录'}</em>
        </button>
        {timelineOpen && (
          <div className="review-timeline">
            {todayHistory.slice().reverse().map((item) => (
              <article className={`review-item ${getEventClass(item)}`} key={item.id}>
                <time className="review-item__time">{formatClockTime(item.completedAt)}</time>
                <div className="review-item__dot" aria-hidden="true" />
                <div>
                  <div className="review-item__label">{getEventLabel(item)}</div>
                  <h2>{item.stepTitle}</h2>
                  <p>{item.taskTitle}</p>
                </div>
                <span className="review-item__duration">
                  {secondsToRoundedMinutes(item.elapsedSeconds)} 分钟
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function getReviewMessage({ startedTasks, movedSteps, completedTasks }) {
  if (completedTasks > 0) {
    return `今天你完成了 ${completedTasks} 个任务，也启动过 ${startedTasks} 件事。不是靠硬撑，是一步一步走出来的。`;
  }

  if (movedSteps > 0) {
    return `今天你推进了 ${movedSteps} 个小步骤。就算任务还没全完，大脑也已经留下“我开始过”的证据。`;
  }

  return `今天你启动了 ${startedTasks} 次。能开始，就已经不是空白。`;
}
