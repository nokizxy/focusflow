import { createServer } from 'node:http';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSession,
  createUser,
  deleteSession,
  getAppState,
  getDatabaseInfo,
  getSession,
  getUserByEmail,
  initDatabase,
  saveAppState
} from './db.mjs';
import { defaultServerState } from './defaultState.mjs';
import { getCommonTaskBreakdown } from './commonTaskBreakdowns.mjs';
import { buildAdhdBreakdownMessages } from './prompts/adhdBreakdownPrompt.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);

loadEnv(join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const SILICONFLOW_API_URL =
  process.env.SILICONFLOW_API_URL || 'https://api.siliconflow.cn/v1/chat/completions';
const SILICONFLOW_PRIMARY_MODEL =
  process.env.SILICONFLOW_PRIMARY_MODEL || process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3.2';
const SILICONFLOW_FALLBACK_MODEL =
  process.env.SILICONFLOW_FALLBACK_MODEL || '';
const SILICONFLOW_PRIMARY_TIMEOUT_MS = Number(process.env.SILICONFLOW_PRIMARY_TIMEOUT_MS || 9000);
const SILICONFLOW_FALLBACK_TIMEOUT_MS = Number(process.env.SILICONFLOW_FALLBACK_TIMEOUT_MS || 9000);
const SESSION_COOKIE = 'focusflow_session';
const SESSION_DAYS = 14;
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const AUTH_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const LOGIN_RATE_LIMIT_MAX = Number(process.env.LOGIN_RATE_LIMIT_MAX || 8);
const REGISTER_RATE_LIMIT_MAX = Number(process.env.REGISTER_RATE_LIMIT_MAX || 5);
const authRateLimits = new Map();

await initDatabase();

function loadEnv(path) {
  try {
    const content = readFileSync(path, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional so deployments can inject environment variables directly.
  }
}

function securityHeaders(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...extra
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    ...securityHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': 'http://127.0.0.1:3004',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Cache-Control': 'no-store'
    })
  });
  res.end(JSON.stringify(payload));
}

function sendRateLimit(res, retryAfterSeconds) {
  res.writeHead(429, securityHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:3004',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Retry-After': String(retryAfterSeconds)
  }));
  res.end(JSON.stringify({ error: '尝试次数有点多，等一会儿再试。' }));
}

async function readJsonBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 20_000) {
      throw new Error('请求内容太长。');
    }
  }
  return JSON.parse(body || '{}');
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf('=');
        if (index === -1) return [item, ''];
        return [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
      })
  );
}

function setSessionCookie(res, sessionId) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const secureFlag = COOKIE_SECURE ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secureFlag}`
  );
}

function clearSessionCookie(res) {
  const secureFlag = COOKIE_SECURE ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}`
  );
}

function publicUser(user) {
  return {
    id: user.user_id || user.id,
    email: user.email || '',
    displayName: user.display_name || user.displayName || ''
  };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase().slice(0, 180);
}

function getClientIp(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwardedFor || req.socket.remoteAddress || 'unknown';
}

function cleanupRateLimits(now = Date.now()) {
  if (authRateLimits.size < 5000) return;
  for (const [key, value] of authRateLimits.entries()) {
    if (value.resetAt <= now) authRateLimits.delete(key);
  }
}

function checkRateLimit({ req, res, scope, identifier, maxAttempts }) {
  const now = Date.now();
  cleanupRateLimits(now);

  const key = `${scope}:${getClientIp(req)}:${identifier || 'anonymous'}`;
  const current = authRateLimits.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS }
    : current;

  bucket.count += 1;
  authRateLimits.set(key, bucket);

  if (bucket.count <= maxAttempts) return false;

  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  sendRateLimit(res, retryAfterSeconds);
  return true;
}

function clearRateLimit({ req, scope, identifier }) {
  authRateLimits.delete(`${scope}:${getClientIp(req)}:${identifier || 'anonymous'}`);
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

function verifyPassword(password, storedHash = '') {
  const [scheme, iterations, salt, hash] = String(storedHash).split('$');
  if (scheme !== 'pbkdf2_sha256' || !iterations || !salt || !hash) return false;
  const candidate = pbkdf2Sync(String(password), salt, Number(iterations), 32, 'sha256');
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}

async function createUserSession(res, userId) {
  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await createSession({ id: sessionId, userId, expiresAt });
  setSessionCookie(res, sessionId);
}

async function getRequestUser(req) {
  const sessionId = parseCookies(req)[SESSION_COOKIE];
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  if (!session) return null;
  return publicUser(session);
}

async function requireUser(req, res) {
  const user = await getRequestUser(req);
  if (!user) {
    sendJson(res, 401, { error: '请先登录。' });
    return null;
  }
  return user;
}

function extractJson(content) {
  const fenced = content.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : content;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');

  if (start === -1 || end === -1) {
    throw new Error('AI 没有返回可解析的 JSON。');
  }

  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeClarifyQuestion(question, title) {
  const fallbackQuestions = [
    { pattern: /^写作业$|作业$/, question: '什么作业？数学题 / 读书报告 / 论文 / 编程 / 其他' },
    { pattern: /^做\s*PPT$|^PPT$/i, question: '给谁看的？老板汇报 / 客户提案 / 课堂展示 / 其他' },
    { pattern: /^学习$|^学一下$/, question: '学什么？考试复习 / 看书 / 看课 / 练习题' },
    { pattern: /^整理$/, question: '整理什么？桌面 / 房间 / 文件 / 思路' },
    { pattern: /^写文章$|^文章$/, question: '什么文章？工作汇报 / 公众号 / 论文 / 其他' }
  ];
  const matched = fallbackQuestions.find((item) => item.pattern.test(String(title || '').trim()));
  return String(question || matched?.question || '具体要做哪一块？A / B / 其他').slice(0, 120);
}

function getLocalClarifyQuestion(title) {
  const normalized = String(title || '').trim();
  if (/[:：]/.test(normalized)) {
    return '';
  }

  const vagueTasks = [
    { pattern: /^写作业$|^作业$/, question: '什么作业？数学题 / 读书报告 / 论文 / 编程 / 其他' },
    { pattern: /^做\s*PPT$|^PPT$/i, question: '给谁看的？老板汇报 / 客户提案 / 课堂展示 / 其他' },
    { pattern: /^学习$|^学一下$|^学$|^复习$/, question: '学什么？考试复习 / 看书 / 看课 / 练习题' },
    { pattern: /^整理$|^收拾$/, question: '整理什么？桌面 / 房间 / 文件 / 思路' },
    { pattern: /^写文章$|^文章$/, question: '什么文章？工作汇报 / 公众号 / 论文 / 其他' },
    { pattern: /^做项目$|^项目$/, question: '什么项目？课程项目 / 工作项目 / 代码项目 / 其他' },
    { pattern: /^(准备|弄|搞).*(答辩|演示|汇报|展示)$/, question: '具体哪一块？PPT内容 / 演讲稿 / 问答材料 / 其他' }
  ];
  return vagueTasks.find((item) => item.pattern.test(normalized))?.question || '';
}

function hasFrictionLoweringLanguage(step) {
  const text = `${step.title || ''}${step.detail || ''}`;
  return /定|圈|选|写|最低|60|六十|范围|标准|抗拒|不想|赢|停/.test(text);
}

function buildMicroStartStep(spiceLevel, fallbackId) {
  if (Number(spiceLevel) === 3) {
    return {
      id: fallbackId,
      title: '写下抗拒',
      detail: '写一句“我现在就是不想做”。',
      minutes: 1,
      done: false,
      isMicroStart: true,
      isWinningLine: false
    };
  }

  if (Number(spiceLevel) === 2) {
    return {
      id: fallbackId,
      title: '定60分线',
      detail: '决定这次做到哪就可以停。',
      minutes: 1,
      done: false,
      isMicroStart: true,
      isWinningLine: false
    };
  }

  return {
    id: fallbackId,
    title: '圈定范围',
    detail: '决定这次只做到哪里就停。',
    minutes: 2,
    done: false,
    isMicroStart: true,
    isWinningLine: false
  };
}

function sanitizeStepTitle(title, detail = '', index = 0) {
  const normalized = String(title || '').trim();
  const text = `${normalized}${detail}`;

  if (/检查|调整|复盘|总结/.test(normalized)) {
    if (/消息|回复|老板|发送/.test(text)) return '发送消息';
    if (/论文|文章|段落/.test(text)) return '写完一段';
    if (/PPT|演示|页面/.test(text)) return '完成一页';
    return index === 0 ? '定最低线' : '完成一小块';
  }

  if (/整理桌面|打扫环境|做准备|准备工作|列计划/.test(normalized)) {
    return index === 0 ? '定最低线' : '做第一块';
  }

  return normalized;
}

function sanitizeStepDetail(detail) {
  return String(detail || '')
    .replace(/检查一遍/g, '读一遍')
    .replace(/检查/g, '看一眼')
    .replace(/调整/g, '改一个地方')
    .replace(/复盘总结/g, '记一句结果')
    .replace(/复盘/g, '记一句结果')
    .replace(/总结/g, '写一句结果');
}

function normalizeAiResult(parsed, fallbackNotes, spiceLevel, { title = '', model = '' } = {}) {
  if (parsed?.need_clarify || parsed?.needClarify) {
    return {
      needClarify: true,
      question: normalizeClarifyQuestion(parsed.question, title),
      model
    };
  }

  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('AI 返回的步骤为空。');
  }

  const normalizedSpice = [1, 2, 3].includes(Number(spiceLevel)) ? Number(spiceLevel) : 2;

  const maxSteps = normalizedSpice === 1 ? 3 : normalizedSpice === 3 ? 4 : 5;
  const normalizedSteps = parsed.steps
    .slice(0, maxSteps)
    .map((step, index) => {
      const detail = sanitizeStepDetail(step.detail).trim().slice(0, 80);

      return {
        id: `ai-step-${Date.now()}-${index}`,
        title: sanitizeStepTitle(step.title || `步骤 ${index + 1}`, detail, index).slice(0, 32),
        detail,
        minutes: Math.min(15, Math.max(1, Number(step.minutes) || 5)),
        done: false,
        isMicroStart: index === 0 || Boolean(step.is_first || step.isFirst || step.is_micro_start || step.isMicroStart),
        isWinningLine:
          index === parsed.steps.slice(0, maxSteps).length - 1 ||
          Boolean(step.is_winning_line || step.isWinningLine)
      };
    })
    .filter((step) => step.title);

  if (!hasFrictionLoweringLanguage(normalizedSteps[0])) {
    normalizedSteps[0] = buildMicroStartStep(normalizedSpice, normalizedSteps[0]?.id || `ai-step-${Date.now()}-0`);
  }

  const lastStep = normalizedSteps[normalizedSteps.length - 1];
  if (lastStep) {
    lastStep.isWinningLine = true;
    if (!/做到这里|算赢|赢/.test(`${lastStep.title}${lastStep.detail}`)) {
      lastStep.detail = `${lastStep.detail || '完成这个最小版本。'} 做到这里就算赢。`.slice(0, 80);
    }
  }

  ensureDifferentStepMinutes(normalizedSteps);

  return {
    needClarify: false,
    preface: String(parsed.preface || '').slice(0, 220),
    notes: String(parsed.preface || fallbackNotes || '').slice(0, 220),
    exitMessage: String(parsed.exit_message || parsed.exitMessage || '').slice(0, 220),
    spiceLevel: normalizedSpice,
    steps: normalizedSteps,
    model
  };
}

function ensureDifferentStepMinutes(steps) {
  if (steps.length < 2) return;

  const allSame = steps.every((step) => Number(step.minutes) === Number(steps[0].minutes));
  if (!allSame) return;

  const pattern = steps.length === 3 ? [1, 4, 9] : steps.length === 4 ? [1, 3, 7, 12] : [1, 3, 5, 9, 13];
  steps.forEach((step, index) => {
    step.minutes = pattern[index] || Math.min(15, index * 3 + 1);
  });
}

function buildFallbackBreakdown(title, notes, spiceLevel) {
  return {
    needClarify: true,
    question: getLocalClarifyQuestion(title) || '这件事具体要推进哪一块？现在能做的第一块 / 最着急的一块 / 其他',
    source: 'fallback-clarify'
  };
}

async function requestSiliconFlow({ model, messages, timeoutMs = 0 }) {
  const controller = new AbortController();
  const timeoutId = timeoutMs > 0
    ? setTimeout(() => controller.abort(new Error('AI request timed out.')), timeoutMs)
    : null;

  try {
    const aiResponse = await fetch(SILICONFLOW_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 1000,
        messages
      })
    });

    const data = await aiResponse.json().catch(() => ({}));

    if (!aiResponse.ok) {
      const providerMessage =
        data.message || data.error?.message || data.error || data.code || '硅基流动请求失败。';
      throw new Error(`硅基流动请求失败：${aiResponse.status} ${String(providerMessage).slice(0, 180)}`);
    }

    return data;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function requestBreakdownWithFallback({ title, notes, spiceLevel }) {
  const messages = buildAdhdBreakdownMessages({
    title,
    notes,
    spiceLevel
  });
  const models = [
    {
      name: SILICONFLOW_PRIMARY_MODEL,
      timeoutMs: SILICONFLOW_PRIMARY_TIMEOUT_MS
    },
    {
      name: SILICONFLOW_FALLBACK_MODEL,
      timeoutMs: SILICONFLOW_FALLBACK_TIMEOUT_MS
    }
  ].filter((model, index, list) => model.name && list.findIndex((item) => item.name === model.name) === index);

  let lastError = null;

  for (const model of models) {
    try {
      const data = await requestSiliconFlow({
        model: model.name,
        messages,
        timeoutMs: model.timeoutMs
      });
      const content = data.choices?.[0]?.message?.content || '';
      return normalizeAiResult(extractJson(content), notes, spiceLevel, {
        title,
        model: model.name
      });
    } catch (error) {
      lastError = error;
      console.error(`AI breakdown failed with ${model.name}`, error);
    }
  }

  throw lastError || new Error('AI 拆解失败。');
}

async function handleAiBreakdown(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (!process.env.SILICONFLOW_API_KEY) {
    sendJson(res, 500, { error: '后端没有配置 SILICONFLOW_API_KEY。' });
    return;
  }

  const { title, notes, spiceLevel } = await readJsonBody(req);
  const safeTitle = String(title || '').trim().slice(0, 160);
  const safeNotes = String(notes || '').trim().slice(0, 600);
  const safeSpiceLevel = [1, 2, 3].includes(Number(spiceLevel)) ? Number(spiceLevel) : 2;

  if (!safeTitle) {
    sendJson(res, 400, { error: '任务标题不能为空。' });
    return;
  }

  const commonBreakdown = getCommonTaskBreakdown({
    title: safeTitle,
    spiceLevel: safeSpiceLevel
  });
  if (commonBreakdown) {
    sendJson(res, 200, commonBreakdown);
    return;
  }

  const localClarifyQuestion = getLocalClarifyQuestion(safeTitle);
  if (localClarifyQuestion) {
    sendJson(res, 200, {
      needClarify: true,
      question: localClarifyQuestion,
      source: 'local-clarify'
    });
    return;
  }

  try {
    sendJson(res, 200, await requestBreakdownWithFallback({
      title: safeTitle,
      notes: safeNotes,
      spiceLevel: safeSpiceLevel
    }));
  } catch (error) {
    sendJson(res, 200, {
      ...buildFallbackBreakdown(safeTitle, safeNotes, safeSpiceLevel),
      source: 'fallback',
      error: String(error.message || '').slice(0, 180)
    });
  }
}

function createDefaultServerState() {
  return defaultServerState;
}

async function handleMe(req, res) {
  const user = await getRequestUser(req);
  sendJson(res, 200, { user });
}

async function handleRegister(req, res) {
  const { email, password, displayName } = await readJsonBody(req);
  const safeEmail = normalizeEmail(email);
  const safeDisplayName = String(displayName || safeEmail.split('@')[0] || 'FocusFlow User').trim().slice(0, 80);
  const safePassword = String(password || '');

  if (checkRateLimit({
    req,
    res,
    scope: 'register',
    identifier: safeEmail,
    maxAttempts: REGISTER_RATE_LIMIT_MAX
  })) return;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
    sendJson(res, 400, { error: '请输入有效邮箱。' });
    return;
  }

  if (safePassword.length < 8) {
    sendJson(res, 400, { error: '密码至少 8 位。' });
    return;
  }

  if (await getUserByEmail(safeEmail)) {
    sendJson(res, 409, { error: '这个邮箱已经注册，可以直接登录。' });
    return;
  }

  const user = {
    id: `user-${randomBytes(12).toString('hex')}`,
    email: safeEmail,
    displayName: safeDisplayName,
    passwordHash: hashPassword(safePassword)
  };

  await createUser(user);
  await saveAppState(user.id, createDefaultServerState());
  await createUserSession(res, user.id);
  clearRateLimit({ req, scope: 'register', identifier: safeEmail });
  sendJson(res, 201, {
    user: publicUser(user),
    state: createDefaultServerState()
  });
}

async function handleLogin(req, res) {
  const { email, password } = await readJsonBody(req);
  const safeEmail = normalizeEmail(email);
  if (checkRateLimit({
    req,
    res,
    scope: 'login',
    identifier: safeEmail,
    maxAttempts: LOGIN_RATE_LIMIT_MAX
  })) return;

  const user = await getUserByEmail(safeEmail);

  if (!user || !verifyPassword(password, user.password_hash)) {
    sendJson(res, 401, { error: '邮箱或密码不对。' });
    return;
  }

  await createUserSession(res, user.id);
  clearRateLimit({ req, scope: 'login', identifier: safeEmail });
  sendJson(res, 200, {
    user: publicUser(user),
    state: (await getAppState(user.id)) || createDefaultServerState()
  });
}

async function handleLogout(req, res) {
  const sessionId = parseCookies(req)[SESSION_COOKIE];
  if (sessionId) await deleteSession(sessionId);
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
}

async function handleGetState(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const state = await getAppState(user.id);
  sendJson(res, 200, {
    hasState: Boolean(state),
    state: state || createDefaultServerState()
  });
}

async function handleSaveState(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const state = await readJsonBody(req);

  if (!Array.isArray(state.tasks) || !state.settings || !Array.isArray(state.history)) {
    sendJson(res, 400, { error: '状态数据结构不正确。' });
    return;
  }

  await saveAppState(user.id, state);
  sendJson(res, 200, { ok: true });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const buildRoot = resolve(projectRoot, 'build');
  const filePath = resolve(buildRoot, `.${requestedPath}`);

  if (relative(buildRoot, filePath).startsWith('..')) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  const ext = extname(filePath);
  const type =
    {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';

  try {
    const file = readFileSync(filePath);
    res.writeHead(200, securityHeaders({ 'Content-Type': type }));
    res.end(file);
  } catch {
    try {
      const fallback = readFileSync(join(projectRoot, 'build', 'index.html'));
      res.writeHead(200, securityHeaders({ 'Content-Type': 'text/html; charset=utf-8' }));
      res.end(fallback);
    } catch {
      sendJson(res, 404, { error: 'Not found' });
    }
  }
}

createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    if (req.method === 'POST' && req.url === '/api/ai-breakdown') {
      await handleAiBreakdown(req, res);
      return;
    }

    if (req.method === 'GET' && req.url === '/api/auth/me') {
      await handleMe(req, res);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/auth/register') {
      await handleRegister(req, res);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/auth/login') {
      await handleLogin(req, res);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/auth/logout') {
      await handleLogout(req, res);
      return;
    }

    if (req.method === 'GET' && req.url === '/api/state') {
      await handleGetState(req, res);
      return;
    }

    if (req.method === 'PUT' && req.url === '/api/state') {
      await handleSaveState(req, res);
      return;
    }

    if (req.method === 'GET' && req.url === '/api/health') {
      const user = await getRequestUser(req);
      sendJson(res, 200, { ok: true, database: await getDatabaseInfo(user?.id) });
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || '服务器错误。' });
  }
}).listen(PORT, HOST, () => {
  console.log(`FocusFlow backend listening on http://${HOST}:${PORT}`);
});
