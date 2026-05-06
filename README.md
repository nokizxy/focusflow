# FocusFlow

FocusFlow 是我为高阶课程项目开发的一个移动端友好 Web 应用。它面向 ADHD、执行功能困难和拖延倾向用户，目标不是做一个更复杂的待办清单，而是帮助用户把“卡住的任务”变成一个现在就能开始的小步骤。

线上 Demo：

```text
https://focusflow.172.245.228.213.sslip.io/
```

## 项目解决的问题

很多任务管理工具默认用户已经知道下一步怎么做。但现实里，用户常常不是忘记任务，而是被任务压住了：

- 任务太大，比如“写论文”“做 PPT”“整理答辩演示稿”
- 不知道从哪里开始
- 怕做不好，所以一直拖
- 估不出时间，任务在脑子里变成“无限大”
- 打开普通 todo app 后，只看到更多未完成事项

FocusFlow 的思路是：先不要求用户完成整个任务，只帮用户跨过第一步。

## 核心功能

- 邮箱和密码注册 / 登录
- 按用户隔离任务数据
- 快速添加任务
- 选择当前卡住程度
- AI 拆解任务步骤
- 高频任务本地模板兜底
- 拆解结果先预览，再采用
- 任务和步骤可编辑
- 专注倒计时，超时后自动进入正计时
- “做到这里就算赢”的胜利线
- 今日回顾和完成记录
- 响应式移动端界面
- 移动端/PWA 支持，包括 manifest、service worker 和 192 / 512 PNG 图标

## 技术栈

前端：

- React 19
- JavaScript
- HTML / CSS
- 响应式布局
- PWA

后端：

- Node.js HTTP server
- REST JSON API
- SQLite
- Cookie session
- PBKDF2 密码哈希
- 登录 / 注册限流
- 基础安全响应头

AI：

- SiliconFlow API
- DeepSeek / Kimi 模型配置
- 后端代理 AI 请求
- 本地任务模板系统

## 系统架构

```text
React 前端
  -> 前端服务层 authService / stateSync / aiBreakdown
  -> Node.js 后端 API
  -> SQLite 数据库
  -> SiliconFlow AI API
```

前端不会保存 AI API Key。浏览器只调用自己的后端接口，真实 API Key 只放在后端环境变量中。

## 数据库

SQLite 当前包含：

- `users`：用户账户
- `sessions`：登录会话
- `app_states`：按用户保存应用状态
- `tasks`：预留任务表
- `steps`：预留步骤表
- `focus_sessions`：预留专注记录表
- `user_settings`：预留用户设置表

当前 MVP 主要用 `app_states` 保存完整状态。这样方便快速迭代；后续可以把任务、步骤和专注记录迁移到规范化 CRUD 表。

## 本地运行

安装依赖：

```bash
npm install
```

创建环境变量：

```bash
cp server/.env.example server/.env
```

在 `server/.env` 中配置：

```bash
SILICONFLOW_API_KEY=your_key_here
```

启动后端：

```bash
npm run server
```

启动前端：

```bash
PORT=3004 HOST=127.0.0.1 BROWSER=none npm start
```

打开：

```text
http://127.0.0.1:3004
```

## 生产构建

```bash
npm run build
npm run serve
```

本项目也已经部署到个人 RackNerd VPS：

```text
Browser -> Nginx :80/:443 -> Node.js :8787 -> SQLite
```

当前线上地址：

```text
https://focusflow.172.245.228.213.sslip.io/
```

备用访问地址：

```text
http://focusflow1.duckdns.org/
http://172.245.228.213/
```

如果后续要做成更正式的公开版本，我会优先补自有域名、DNS 托管、CSRF 防护和数据库备份。

## 验证

检查本地模板质量：

```bash
npm run check:templates
```

构建生产版本：

```bash
npm run build
```

健康检查：

```bash
curl -s https://focusflow.172.245.228.213.sslip.io/api/health
```

## 安全说明

- `server/.env` 保存本地或服务器环境变量，不提交到 GitHub
- `server/data/` 保存 SQLite 数据库文件，不提交到 GitHub
- `node_modules/` 是依赖安装目录，不提交到 GitHub
- API Key 只保存在后端环境变量中
- 密码使用 PBKDF2 哈希保存
- 登录态使用 HttpOnly Cookie
- 登录和注册接口有限流

## 项目限制

- 当前是响应式 PWA，不是原生 iOS / Android 应用
- 当前主要使用 `app_states` JSON 保存用户状态
- 当前线上 Demo 使用免费 HTTPS 域名，尚未绑定自有品牌域名
- 还缺端到端自动化测试
- 还没有接入云数据库和多设备同步

## 后续计划

- 绑定自有域名并接入 Cloudflare
- 增加 Playwright 端到端测试
- 将任务和步骤迁移到规范化 CRUD
- 增加数据库备份
- 增加提醒和日历集成
- 做真实用户可用性测试
