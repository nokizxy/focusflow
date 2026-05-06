import EmptyState from '../components/EmptyState';
import QuickTaskInput from '../components/QuickTaskInput';
import TaskCard from '../components/TaskCard';

export default function LaunchPage({
  queue,
  addTask,
  previewTaskBreakdown,
  addPlannedTask,
  startTask,
  swapFirstTask,
  setCurrentPage,
  onStartFocus
}) {
  const current = queue[0];
  const nextItems = queue.slice(1, 4);

  async function createRoutineTask(title) {
    const draft = {
      title,
      spiceLevel: 2,
      scheduleType: 'today',
      startDate: new Date().toISOString().slice(0, 10)
    };
    const plan = await previewTaskBreakdown(draft);
    if (plan?.needClarify) {
      addTask(draft);
      return;
    }
    addPlannedTask(draft, plan);
  }

  function startCreatedTask(taskId) {
    startTask(taskId);
    onStartFocus();
  }

  if (!current) {
    return (
      <main className="page launch-page page--center">
        <section className="launch-empty">
          <EmptyState
            icon="＋"
            title="脑子里最吵的是哪件事？"
            desc="先写下来，不用想清楚。FocusFlow 会把它变成第一小步。"
          />
          <QuickTaskInput
            onAddTask={addTask}
            onPlanTask={previewTaskBreakdown}
            onAdoptPlan={addPlannedTask}
            onStartTask={startCreatedTask}
            onCreateRoutine={createRoutineTask}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="page launch-page">
      <section className="launch-hero">
        <div className="launch-hero__eyebrow">现在最值得开始</div>
        <TaskCard task={current} large />
        <div className="launch-hero__actions">
          <button className="btn btn--primary" onClick={onStartFocus}>
            开始这一小步
          </button>
          <button className="btn btn--secondary" onClick={swapFirstTask}>
            换一个
          </button>
        </div>
        <QuickTaskInput
          onAddTask={addTask}
          onPlanTask={previewTaskBreakdown}
          onAdoptPlan={addPlannedTask}
          onStartTask={startCreatedTask}
          onCreateRoutine={createRoutineTask}
          compact
        />
      </section>

      <aside className="next-list">
        <div className="section-title">接下来</div>
        {nextItems.length ? (
          nextItems.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <p className="muted">队列里暂时没有别的任务。</p>
        )}
      </aside>
    </main>
  );
}
