import { toDateInputValue } from '../utils/taskMeta';
import { RoutineChips } from './RoutineStrip';

const startOptions = [
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'week', label: '本周' },
  { value: 'someday', label: 'Someday' },
  { value: 'custom', label: '自定义' }
];

const deadlineOptions = [
  { value: 'none', label: '不设' },
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'week', label: '本周' },
  { value: 'custom', label: '自定义' }
];

const tagOptions = ['学习', '工作', '家务', '生活'];
const minuteOptions = [5, 10, 15, 25];

const tabs = [
  { id: 'start', label: '开始' },
  { id: 'deadline', label: '截止' },
  { id: 'tag', label: '#' },
  { id: 'duration', label: '时长' },
  { id: 'routine', label: '场景' }
];

export default function QuickTaskMetaPanel({
  activePanel,
  setActivePanel,
  tag,
  setTag,
  customTag,
  setCustomTag,
  scheduleType,
  setScheduleType,
  customStartDate,
  setCustomStartDate,
  startTime,
  setStartTime,
  deadlineType,
  setDeadlineType,
  customDeadlineDate,
  setCustomDeadlineDate,
  minutes,
  setMinutes,
  customMinutes,
  setCustomMinutes,
  setCustomMinutesActive,
  onCreateRoutine
}) {
  return (
    <div className="quick-task__meta">
      <span className="quick-task__hint">可直接写：回老板消息 #工作 今天 5分钟</span>
      <div className="quick-task__meta-tabs" role="group" aria-label="任务附加信息">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activePanel === tab.id ? 'quick-task__meta-tab active' : 'quick-task__meta-tab'}
            onClick={() => setActivePanel(activePanel === tab.id ? '' : tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activePanel ? (
        <div className="quick-task__panel">
          {activePanel === 'start' ? (
            <>
              <div className="quick-task__chips" aria-label="开始时间">
                {startOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={scheduleType === option.value ? 'quick-task__chip quick-task__chip--active' : 'quick-task__chip'}
                    onClick={() => setScheduleType(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {scheduleType === 'custom' ? (
                <div className="quick-task__panel-row">
                  <input
                    className="quick-task__date"
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                  />
                  <input
                    className="quick-task__time"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {activePanel === 'deadline' ? (
            <>
              <div className="quick-task__chips" aria-label="截止日期">
                {deadlineOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={deadlineType === option.value ? 'quick-task__chip quick-task__chip--active' : 'quick-task__chip'}
                    onClick={() => setDeadlineType(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {deadlineType === 'custom' ? (
                <input
                  className="quick-task__date"
                  type="date"
                  value={customDeadlineDate || toDateInputValue()}
                  onChange={(event) => setCustomDeadlineDate(event.target.value)}
                />
              ) : null}
            </>
          ) : null}

          {activePanel === 'tag' ? (
            <div className="quick-task__chips" aria-label="标签">
              {tagOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={tag === option ? 'quick-task__chip quick-task__chip--active' : 'quick-task__chip'}
                  onClick={() => setTag(tag === option ? '' : option)}
                >
                  #{option}
                </button>
              ))}
              <label className="quick-task__inline-field">
                #自定义
                <input
                  value={customTag}
                  onChange={(event) => {
                    setCustomTag(event.target.value);
                    setTag('');
                  }}
                  placeholder="标签"
                />
              </label>
            </div>
          ) : null}

          {activePanel === 'duration' ? (
            <div className="quick-task__chips" aria-label="时长">
              {minuteOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={minutes === option ? 'quick-task__chip quick-task__chip--active' : 'quick-task__chip'}
                  onClick={() => {
                    setMinutes(option);
                    setCustomMinutesActive(false);
                  }}
                >
                  {option} 分钟
                </button>
              ))}
              <label className="quick-task__inline-field">
                自定义
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customMinutes}
                  onChange={(event) => {
                    setCustomMinutes(Number(event.target.value));
                    setCustomMinutesActive(true);
                  }}
                />
              </label>
            </div>
          ) : null}

          {activePanel === 'routine' ? (
            <div className="quick-task__routine-panel">
              <span>点一下，先生成能开始的一小步。</span>
              <RoutineChips onCreateTask={onCreateRoutine} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
