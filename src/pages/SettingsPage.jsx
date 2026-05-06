export default function SettingsPage({ settings, updateSettings, clearData, setCurrentPage }) {
  function scrollToGroup(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="page settings-page">
      <aside className="settings-nav">
        <h1>设置</h1>
        <button onClick={() => scrollToGroup('settings-focus')}>聚焦</button>
        <button onClick={() => scrollToGroup('settings-ai')}>AI</button>
        <button onClick={() => scrollToGroup('settings-appearance')}>外观</button>
        <button onClick={() => scrollToGroup('settings-data')}>数据</button>
        <button className="settings-nav__home" onClick={() => setCurrentPage('launch')}>
          返回开始页
        </button>
      </aside>
      <section className="settings-panel">
        <div className="settings-group" id="settings-focus">
          <h2>聚焦</h2>
          <label className="setting-row">
            <span>
              <strong>自动进入下一步</strong>
              <small>完成后 3 秒自动接上。</small>
            </span>
            <input
              type="checkbox"
              checked={settings.autoAdvance}
              onChange={(event) => updateSettings({ autoAdvance: event.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>
              <strong>默认步骤时长</strong>
              <small>新建任务和步骤会使用这个分钟数。</small>
            </span>
            <input
              type="number"
              min="5"
              max="90"
              value={settings.defaultMinutes}
              onChange={(event) => updateSettings({ defaultMinutes: Number(event.target.value) })}
            />
          </label>
          <label className="setting-row">
            <span>
              <strong>任务之间休息</strong>
              <small>完成一个任务后先停一下，再进入下一个。</small>
            </span>
            <input
              type="checkbox"
              checked={settings.breakBetweenTasks}
              onChange={(event) => updateSettings({ breakBetweenTasks: event.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>
              <strong>休息时长</strong>
              <small>给大脑一个清晰的缓冲。</small>
            </span>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.breakMinutes}
              onChange={(event) => updateSettings({ breakMinutes: Number(event.target.value) })}
            />
          </label>
        </div>

        <div className="settings-group" id="settings-ai">
          <h2>AI</h2>
          <label className="setting-row">
            <span>
              <strong>AI 拆解任务</strong>
              <small>把大任务拆成更容易开始的小步骤。</small>
            </span>
            <input
              type="checkbox"
              checked={settings.aiEnabled}
              onChange={(event) => updateSettings({ aiEnabled: event.target.checked })}
            />
          </label>
        </div>

        <div className="settings-group" id="settings-appearance">
          <h2>外观</h2>
          <label className="setting-row">
            <span>
              <strong>深色模式</strong>
              <small>Focus Mode 会始终保持低干扰深色。</small>
            </span>
            <input
              type="checkbox"
              checked={settings.theme === 'dark'}
              onChange={(event) =>
                updateSettings({ theme: event.target.checked ? 'dark' : 'light' })
              }
            />
          </label>
        </div>

        <div className="settings-group" id="settings-data">
          <h2>数据</h2>
          <button
            className="btn btn--danger"
            onClick={() => {
              if (window.confirm('确定清除全部本地数据吗？')) clearData();
            }}
          >
            清除全部数据
          </button>
        </div>
      </section>
    </main>
  );
}
