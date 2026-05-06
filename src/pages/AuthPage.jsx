import { useState } from 'react';

export default function AuthPage({ onLogin, onRegister, authError }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await onRegister({ email, password, displayName });
      } else {
        await onLogin({ email, password });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card__intro">
          <div className="auth-brand" aria-label="FocusFlow">
            <img src="/icon.svg" alt="" aria-hidden="true" />
            <span>FocusFlow</span>
          </div>
          <h1>把卡住的事，变成第一小步</h1>
          <p>把脑子里最吵的那件事写下来。FocusFlow 会帮你拆成一个现在就能开始的小动作。</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-form__tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              登录
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              注册
            </button>
          </div>
          {mode === 'register' && (
            <label>
              昵称
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Eleanor"
              />
            </label>
          )}
          <label>
            邮箱
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 8 位"
              required
              minLength={8}
            />
          </label>
          {authError && <p className="auth-form__error">{authError}</p>}
          <button className="btn btn--primary" type="submit" disabled={submitting}>
            {submitting ? '处理中...' : mode === 'register' ? '创建账户' : '进入 FocusFlow'}
          </button>
        </form>
      </section>
    </main>
  );
}
