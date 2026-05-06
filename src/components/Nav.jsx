const pages = [
  { id: 'launch', label: '开始' },
  { id: 'tasks', label: '任务' },
  { id: 'review', label: '回顾' }
];

export default function Nav({ currentPage, setCurrentPage, focusActive, user, onLogout }) {
  if (focusActive) return null;

  return (
    <header className="nav">
      <button className="nav__logo" onClick={() => setCurrentPage('launch')}>
        <img src="/icon.svg" alt="" aria-hidden="true" />
        <span>FocusFlow</span>
      </button>
      <nav className="nav__links" aria-label="主导航">
        {pages.map((page) => (
          <button
            key={page.id}
            className={`nav__link ${currentPage === page.id ? 'nav__link--active' : ''}`}
            onClick={() => setCurrentPage(page.id)}
          >
            {page.label}
          </button>
        ))}
      </nav>
      <button
        className={`nav__settings ${currentPage === 'settings' ? 'nav__settings--active' : ''}`}
        title={currentPage === 'settings' ? '返回开始页' : '设置'}
        onClick={() => setCurrentPage(currentPage === 'settings' ? 'launch' : 'settings')}
      >
        {currentPage === 'settings' ? '⌂' : '⚙'}
      </button>
      <div className="nav__user">
        <span>{user?.displayName || user?.email}</span>
        <button type="button" onClick={onLogout}>
          退出
        </button>
      </div>
    </header>
  );
}
