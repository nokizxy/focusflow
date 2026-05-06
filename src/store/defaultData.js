export const defaultTasks = [
  {
    id: 'task-proposal',
    title: '整理答辩演示稿',
    notes: '先把最容易推进的部分拆小，避免一上来就卡住。',
    preface: '',
    exitMessage: '',
    spiceLevel: 2,
    project: 'FocusFlow',
    status: 'active',
    steps: [
      {
        id: 'step-outline',
        title: '列三个卖点',
        detail: '先写 3 个关键词，不用排序。',
        minutes: 5,
        done: false,
        isMicroStart: true,
        isWinningLine: false
      },
      {
        id: 'step-demo',
        title: '补一页证据',
        detail: '给最有把握的卖点补 2 句证据。',
        minutes: 8,
        done: false,
        isMicroStart: false,
        isWinningLine: false
      },
      {
        id: 'step-polish',
        title: '停在赢线',
        detail: '把这一页整理到能讲清楚——做到这里就算赢。',
        minutes: 12,
        done: false,
        isMicroStart: false,
        isWinningLine: true
      }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-reading',
    title: '读完课程材料第 4 章',
    notes: '目标不是完美笔记，是抓出考试会问的概念。',
    preface: '',
    exitMessage: '',
    spiceLevel: 1,
    project: 'Study',
    status: 'active',
    steps: [
      {
        id: 'step-skim',
        title: '扫标题图表',
        detail: '只看标题和图表，先不精读。',
        minutes: 10,
        done: false,
        isMicroStart: true,
        isWinningLine: false
      },
      {
        id: 'step-key',
        title: '写五个词',
        detail: '写下 5 个可能会考的概念就算赢。',
        minutes: 5,
        done: false,
        isMicroStart: false,
        isWinningLine: true
      }
    ],
    createdAt: new Date().toISOString()
  }
];

export const defaultSettings = {
  theme: 'light',
  autoAdvance: true,
  breakBetweenTasks: true,
  breakMinutes: 5,
  sound: false,
  defaultMinutes: 15,
  aiEnabled: true
};
