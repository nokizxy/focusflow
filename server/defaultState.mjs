export const defaultServerState = {
  tasks: [
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
          title: '检查一遍流程',
          detail: '只找最卡的一处，不全面修改。',
          minutes: 10,
          done: false,
          isMicroStart: false,
          isWinningLine: false
        },
        {
          id: 'step-polish',
          title: '停在赢线',
          detail: '改掉最明显的一页就算赢。',
          minutes: 5,
          done: false,
          isMicroStart: false,
          isWinningLine: true
        }
      ],
      createdAt: new Date().toISOString()
    }
  ],
  settings: {
    theme: 'light',
    autoAdvance: true,
    breakBetweenTasks: true,
    breakMinutes: 5,
    sound: false,
    defaultMinutes: 15,
    aiEnabled: true
  },
  history: []
};
