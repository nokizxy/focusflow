import { autoAdoptTemplateKeys, getTemplateCategory } from './templates/templatePolicy.mjs';

function makeStep(idPrefix, index, title, detail, minutes, flags = {}) {
  return {
    id: `${idPrefix}-${index}`,
    title,
    detail,
    minutes,
    done: false,
    isMicroStart: index === 0,
    isWinningLine: Boolean(flags.isWinningLine)
  };
}

function createBreakdown({ key, spiceLevel = 2, notes = '', preface = '', exitMessage = '', variants }) {
  const normalizedSpice = [1, 2, 3].includes(Number(spiceLevel)) ? Number(spiceLevel) : 2;
  const idPrefix = `template-${key}-${Date.now()}`;
  const selected = variants[normalizedSpice] || variants[2] || variants[1];
  const steps = normalizeStepDurations(selected.steps);

  return {
    needClarify: false,
    preface: selected.preface ?? preface,
    notes: selected.notes ?? notes,
    exitMessage: selected.exitMessage ?? exitMessage,
    spiceLevel: normalizedSpice,
    source: 'local-template',
    templateKey: key,
    category: selected.category || '',
    autoAdopt: Boolean(selected.autoAdopt),
    steps: steps.map((step, index) =>
      makeStep(idPrefix, index, step[0], step[1], step[2], {
        isWinningLine: index === steps.length - 1
      })
    )
  };
}

function normalizeStepDurations(steps) {
  const used = new Set();

  return steps.map((step, index) => {
    let minutes = Number(step[2]) || index + 1;
    while (used.has(minutes)) {
      minutes += 1;
    }
    used.add(minutes);
    return [step[0], step[1], Math.min(15, minutes)];
  });
}

const commonTemplates = [
  {
    key: 'shower',
    patterns: [/洗澡|冲澡|淋浴|洗浴|洗头|头发|洗漱/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'shower',
        spiceLevel,
        variants: {
          1: {
            category: 'selfCare',
            autoAdopt: true,
            steps: [
              ['定洗到哪', '决定今天洗头还是只冲身体。', 1],
              ['开始冲洗', '把水温调舒服，先冲身体。', 4],
              ['擦干换衣', '擦干、换上干净衣服——做到这里就算今天赢。', 6]
            ]
          },
          2: {
            category: 'selfCare',
            autoAdopt: true,
            notes: '先做低配版，不追求洗得完美。',
            steps: [
              ['定低配版', '决定今天只洗身体或只洗头也行。', 1],
              ['拿好衣服', '只拿换洗衣服和毛巾，别顺手整理别的。', 2],
              ['冲掉汗味', '先冲身体，洗到舒服就够。', 5],
              ['擦干换衣', '擦干、穿上干净衣服——做到这里就算今天赢。', 7]
            ]
          },
          3: {
            category: 'selfCare',
            autoAdopt: true,
            preface: '洗澡这件事现在很重也正常。今天不追求完整，只做低配版。',
            notes: '今天只做低配版，不追求完整。',
            exitMessage: '如果今天连低配版都做不动，先停也可以。别用硬撑惩罚自己。',
            steps: [
              ['承认不想洗', '写一句“我现在就是不想洗澡”。', 1],
              ['定低配版', '决定今天只冲 3 分钟也算洗过。', 2],
              ['站到浴室', '只走到浴室门口，先不要求更多。', 3],
              ['冲完擦干', '冲掉汗味，擦干换衣——做到这里就算今天赢。', 5]
            ]
          }
        }
      })
  },
  {
    key: 'brush-teeth',
    patterns: [/刷牙/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'brush-teeth',
        spiceLevel,
        variants: {
          1: {
            category: 'selfCare',
            autoAdopt: true,
            steps: [
              ['挤好牙膏', '只把牙刷拿起来，挤一点牙膏。', 1],
              ['刷前排牙', '先刷最容易碰到的前排牙。', 2],
              ['漱口结束', '漱口，牙刷放回去——做到这里就算今天赢。', 1]
            ]
          },
          2: {
            category: 'selfCare',
            autoAdopt: true,
            notes: '低配刷牙也比完全不刷强。',
            steps: [
              ['定低配版', '决定今天刷 30 秒也算完成。', 1],
              ['拿起牙刷', '只拿起牙刷，不要求马上刷完。', 1],
              ['刷一圈牙', '沿着牙齿刷一圈，漏掉也没关系。', 2],
              ['漱口结束', '漱口，把牙刷放回去——做到这里就算今天赢。', 1]
            ]
          },
          3: {
            category: 'selfCare',
            autoAdopt: true,
            preface: '刷牙现在很难也算正常。今天只做最低版本。',
            exitMessage: '今天真的刷不动，用清水漱口也算保住一点点。',
            steps: [
              ['承认抗拒', '写一句“我现在不想刷牙”。', 1],
              ['只漱一次', '先用清水漱一次口。', 1],
              ['刷前排牙', '只刷前排牙 30 秒——做到这里就算今天赢。', 2]
            ]
          }
        }
      })
  },
  {
    key: 'wash-face',
    patterns: [/洗脸|护肤/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'wash-face',
        spiceLevel,
        variants: {
          1: { steps: [['开水沾手', '把手打湿就开始。', 1], ['擦一遍脸', '用水或洗面奶擦一遍脸。', 2], ['擦干结束', '用毛巾擦干——做到这里就算今天赢。', 1]] },
          2: { steps: [['定低配版', '决定今天只洗脸不护肤也可以。', 1], ['打湿脸', '只把脸打湿。', 1], ['洗一遍脸', '简单搓一遍，别追求完整流程。', 2], ['擦干结束', '擦干脸——做到这里就算今天赢。', 1]] },
          3: { preface: '现在连洗脸都费劲，先做最低版本。', exitMessage: '如果连洗脸都做不动，用湿巾擦一下也算。', steps: [['承认不想洗', '写一句“我现在不想洗脸”。', 1], ['湿巾擦脸', '用湿巾或清水擦一下脸。', 2], ['到这里停', '擦完就停——做到这里就算今天赢。', 1]] }
        }
      })
  },
  {
    key: 'drink-water',
    patterns: [/喝水|补水/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'drink-water',
        spiceLevel,
        variants: {
          1: { steps: [['拿起杯子', '只把杯子拿到手边。', 1], ['倒半杯水', '倒半杯就够。', 1], ['喝三口水', '喝三口——做到这里就算今天赢。', 1]] },
          2: { steps: [['定最低线', '决定今天喝三口就算完成。', 1], ['找到杯子', '只找到一个能用的杯子。', 1], ['倒一点水', '倒一点水，不用倒满。', 1], ['喝三口水', '喝三口——做到这里就算今天赢。', 1]] },
          3: { preface: '先别管健康目标，今天只喝几口。', exitMessage: '如果现在不想动，等下一次站起来再喝也行。', steps: [['承认不想动', '写一句“我现在不想去倒水”。', 1], ['拿近水杯', '把杯子或水瓶放到手边。', 1], ['喝一口水', '只喝一口——做到这里就算今天赢。', 1]] }
        }
      })
  },
  {
    key: 'eat',
    patterns: [/吃饭|吃东西|吃点东西|午饭|晚饭|早餐/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'eat',
        spiceLevel,
        variants: {
          1: { steps: [['选一种吃的', '只选一个现在能入口的东西。', 1], ['放到面前', '把食物放到桌上或手边。', 2], ['吃前三口', '先吃三口——做到这里就算今天赢。', 3]] },
          2: { steps: [['定低配版', '决定吃三口也算吃过。', 1], ['选最省事的', '在现有食物/外卖里选最省事的。', 2], ['准备入口', '拆开、加热或摆到面前。', 5], ['吃前三口', '先吃三口——做到这里就算今天赢。', 3]] },
          3: { preface: '吃饭现在也可能很费劲，先让身体拿到一点能量。', exitMessage: '如果正餐做不到，吃一口面包或喝点奶也算。', steps: [['承认没胃口', '写一句“我现在不想吃东西”。', 1], ['选一口食物', '找一个最容易入口的东西。', 2], ['吃下一口', '只吃一口——做到这里就算今天赢。', 2]] }
        }
      })
  },
  {
    key: 'dishes',
    patterns: [/洗碗|刷碗|洗盘子/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'dishes',
        spiceLevel,
        variants: {
          1: { steps: [['决定洗哪几个', '只选 3 个最碍眼的碗。', 1], ['冲掉残渣', '只冲掉看得见的食物残渣。', 2], ['洗好一个', '洗干净一个碗——做到这里就算今天赢。', 3]] },
          2: { steps: [['定低配版', '决定只洗一个碗也算。', 1], ['选一个碗', '挑最容易洗的那个。', 1], ['冲掉残渣', '只冲掉看得见的残渣。', 2], ['洗好放边', '洗好这一个放旁边——做到这里就算今天赢。', 4]] },
          3: { preface: '洗碗现在看起来像一整座山。今天只拿掉一小块。', exitMessage: '如果一个碗都洗不动，把它泡上水也算保住一点点。', steps: [['承认不想洗', '写一句“我现在不想洗碗”。', 1], ['泡一个碗', '只给一个碗加水泡着。', 2], ['洗掉一个', '洗掉这一个——做到这里就算今天赢。', 4]] }
        }
      })
  },
  {
    key: 'trash',
    patterns: [/倒垃圾|扔垃圾|垃圾/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'trash',
        spiceLevel,
        variants: {
          1: { steps: [['扎好垃圾袋', '只把当前垃圾袋扎起来。', 1], ['放到门口', '先放到门口。', 2], ['带出门外', '带到垃圾点——做到这里就算今天赢。', 5]] },
          2: { steps: [['定低配版', '决定只处理这一袋。', 1], ['扎好袋口', '只扎好袋口，不顺手收拾别的。', 1], ['放到门口', '先把它移到门口。', 2], ['扔到垃圾点', '出门扔掉这一袋——做到这里就算今天赢。', 5]] },
          3: { preface: '倒垃圾现在很烦也正常，先把它从视线里移走。', exitMessage: '如果今天出不了门，先放到门口也算往前走了。', steps: [['承认不想倒', '写一句“我现在不想倒垃圾”。', 1], ['扎好一袋', '只扎好当前这一袋。', 1], ['移到门口', '把它放到门口——做到这里就算今天赢。', 2]] }
        }
      })
  },
  {
    key: 'laundry',
    patterns: [/洗衣服|洗衣|脏衣服/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'laundry',
        spiceLevel,
        variants: {
          1: { steps: [['选一小堆', '只选最需要洗的一小堆。', 2], ['丢进洗衣机', '把这一小堆放进去。', 2], ['按下开始', '加洗衣液，按开始——做到这里就算今天赢。', 3]] },
          2: { steps: [['定低配版', '决定只洗一小堆，不分类。', 1], ['捡起五件', '只捡 5 件最需要洗的衣服。', 3], ['放进机器', '把它们放进洗衣机。', 2], ['按下开始', '加洗衣液，按开始——做到这里就算今天赢。', 3]] },
          3: { preface: '洗衣服像一整套流程，今天只做启动那一段。', exitMessage: '如果按开始都做不到，把衣服放进洗衣机也算赢一点。', steps: [['承认不想洗', '写一句“我现在不想洗衣服”。', 1], ['捡起三件', '只捡 3 件最碍眼的衣服。', 2], ['放进机器', '把它们放进洗衣机——做到这里就算今天赢。', 3]] }
        }
      })
  },
  {
    key: 'go-out',
    patterns: [/出门|去上课|去上班|上课|上班/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'go-out',
        spiceLevel,
        variants: {
          1: { steps: [['确认目的地', '说出今天要去哪里。', 1], ['拿三样东西', '手机、钥匙、包先拿好。', 2], ['穿鞋出门', '穿鞋走到门外——做到这里就算今天赢。', 4]] },
          2: { steps: [['定最低线', '决定只要准时出门，不追求完美准备。', 1], ['拿三样东西', '手机、钥匙、包先拿好。', 2], ['穿好鞋子', '穿鞋，站到门口。', 2], ['走出门口', '关门出发——做到这里就算今天赢。', 3]] },
          3: { preface: '出门现在很重，先不用想全程，只到门口。', exitMessage: '如果今天真的出不了门，先联系对方说明也可以。', steps: [['承认不想出', '写一句“我现在不想出门”。', 1], ['拿起手机', '只先拿起手机和钥匙。', 1], ['站到门口', '穿鞋站到门口——做到这里就算今天赢。', 3]] }
        }
      })
  },
  {
    key: 'take-medicine',
    patterns: [/吃药|服药|药片|吞药/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'take-medicine',
        spiceLevel,
        variants: {
          1: { steps: [['确认药名', '只确认这次要吃哪一种药。', 1], ['拿到手边', '把药和水放到面前。', 2], ['吃完放回', '吃下去，把药放回原处——做到这里就算今天赢。', 3]] },
          2: { steps: [['定最低线', '先决定只处理这一顿药。', 1], ['拿药和水', '把药和水放到同一个地方。', 2], ['看一眼剂量', '只确认这一顿吃几片。', 3], ['吃下这一顿', '吃完这一顿——做到这里就算今天赢。', 4]] },
          3: { preface: '吃药这件事现在也可能很烦。先只处理这一顿。', exitMessage: '如果现在不确定剂量，先停下确认也算保护自己。', steps: [['承认抗拒', '写一句“我现在不想吃药”。', 1], ['拿到手边', '把药和水放到面前。', 2], ['只吃这一顿', '确认剂量后吃下这一顿——做到这里就算今天赢。', 4]] }
        }
      })
  },
  {
    key: 'collect-clothes',
    patterns: [/收衣服|晾衣服|叠衣服|收拾衣服/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'collect-clothes',
        spiceLevel,
        variants: {
          1: { steps: [['选一小块', '只选最容易收的一小块衣服。', 1], ['拿回房间', '先把这一小块拿回房间。', 3], ['放成一堆', '先放成一堆，不要求叠好——做到这里就算今天赢。', 2]] },
          2: { steps: [['定低配版', '决定今天只收 5 件也算。', 1], ['拿下五件', '只拿下 5 件最顺手的衣服。', 3], ['分成两堆', '只分干净/待处理两堆。', 4], ['放到位置', '把一堆放到固定位置——做到这里就算今天赢。', 5]] },
          3: { preface: '衣服一多就会像一团乱线。今天只碰 3 件。', exitMessage: '如果连 3 件都不想碰，先把它们挪到不碍路的位置也算。', steps: [['承认不想收', '写一句“我现在不想收衣服”。', 1], ['拿三件衣服', '只拿 3 件最外面的衣服。', 2], ['放到一处', '把它们放到同一个地方——做到这里就算今天赢。', 3]] }
        }
      })
  },
  {
    key: 'cook',
    patterns: [/做饭|煮饭|做菜|煮面|下厨/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'cook',
        spiceLevel,
        variants: {
          1: { steps: [['定一份饭', '决定今天只做一个最省事的版本。', 1], ['拿出食材', '只拿出主食或一个菜。', 3], ['开始加热', '开火或开电器，先让食物热起来——做到这里就算今天赢。', 8]] },
          2: { steps: [['定低配版', '决定能吃上就行，不追求好看。', 1], ['选最省事的', '从现有食材里选最省事的一样。', 2], ['处理第一步', '只洗、切或拆开这一样食材。', 5], ['开始加热', '把它放进锅里或微波炉——做到这里就算今天赢。', 8]] },
          3: { preface: '做饭像一串很长的流程。今天先让自己有东西吃。', exitMessage: '如果做饭做不动，点外卖或吃现成的也算照顾自己。', steps: [['承认不想做', '写一句“我现在不想做饭”。', 1], ['选最低版本', '决定吃泡面、速冻或剩饭也可以。', 2], ['让食物变热', '只完成加热这一步——做到这里就算今天赢。', 6]] }
        }
      })
  },
  {
    key: 'groceries',
    patterns: [/买菜|买东西|采购|超市|购物/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'groceries',
        spiceLevel,
        variants: {
          1: { steps: [['写三样东西', '只写最必须买的 3 样。', 2], ['选购买方式', '决定外卖/到店/顺路买一种。', 1], ['买第一样', '先下单或拿到第一样——做到这里就算今天赢。', 8]] },
          2: { steps: [['定最低线', '决定只买今天必须用的东西。', 1], ['写三样东西', '只写 3 样，不补全清单。', 3], ['打开购买入口', '只打开外卖/购物 App 或走到门口。', 2], ['买下第一样', '先完成第一样购买——做到这里就算今天赢。', 8]] },
          3: { preface: '采购会让人卡在选择里。今天只保住一个必须品。', exitMessage: '如果今天买不了，先写下一个必须品也算没有丢掉这件事。', steps: [['承认不想选', '写一句“我现在不想买东西”。', 1], ['选一个必须品', '只写一个今天最需要的东西。', 2], ['买下这一个', '只买这一个——做到这里就算今天赢。', 8]] }
        }
      })
  },
  {
    key: 'email',
    patterns: [/回邮件|写邮件|发邮件|邮件/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'email',
        spiceLevel,
        variants: {
          1: { steps: [['定一句目的', '写下这封邮件只要达成什么。', 1], ['写第一句', '先写开头一句，不管语气完美。', 3], ['补一个要点', '写一个最关键的信息——做到这里就算今天赢。', 6]] },
          2: { steps: [['定60分回复', '决定这封邮件能讲清就行。', 1], ['写三个要点', '列 3 个要说的信息，不排序。', 3], ['写成草稿', '把第一个要点写成一句话。', 6], ['补上结尾', '写一句收尾——做到这里就算今天赢。', 4]] },
          3: { preface: '邮件容易卡在语气和完美上。今天只写一个能发的草稿。', exitMessage: '如果今天发不出去，只写草稿也算把压力移出来了。', steps: [['承认不想回', '写一句“我现在不想写这封邮件”。', 1], ['定最低标准', '写下：对方最需要知道哪一件事。', 2], ['只写一句正文', '只写那一件事的一句话——做到这里就算今天赢。', 5]] }
        }
      })
  },
  {
    key: 'weekly-report',
    patterns: [/周报|日报|工作汇报|进度汇报/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'weekly-report',
        spiceLevel,
        variants: {
          1: { steps: [['写一件成果', '写本周最有价值的一件事。', 2], ['补一个进展', '写一个正在推进的进展。', 4], ['写一个下步', '写下一步要做什么——做到这里就算今天赢。', 5]] },
          2: { steps: [['定60分周报', '决定这份周报只要说清 3 件事。', 1], ['写一个成果', '只写一个已完成的成果。', 3], ['写一个卡点', '写一个还卡着的问题。', 4], ['写一个下步', '写一个下一步动作——做到这里就算今天赢。', 5]] },
          3: { preface: '周报很容易变成自我审判。今天只写能交的最低版本。', exitMessage: '如果今天写不完，只写一个成果也算没有空白。', steps: [['承认抗拒', '写一句“我现在不想写周报”。', 1], ['写一个成果', '只写本周做过的一件事。', 3], ['补一句下步', '写一句接下来做什么——做到这里就算今天赢。', 4]] }
        }
      })
  },
  {
    key: 'read-book',
    patterns: [/看书|读书|阅读/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'read-book',
        spiceLevel,
        variants: {
          1: { steps: [['定一小段', '只决定读哪 2 页或哪一小节。', 1], ['扫标题', '先看标题和小标题。', 3], ['写一句收获', '写一句你刚才读到了什么——做到这里就算今天赢。', 6]] },
          2: { steps: [['定最低线', '决定今天读 2 页也算。', 1], ['扫一遍标题', '只看标题、图和加粗字。', 3], ['读第一段', '认真读第一段，不要求更多。', 5], ['写一句收获', '写一句收获——做到这里就算今天赢。', 4]] },
          3: { preface: '看书现在可能像一堵墙。今天只碰一小段。', exitMessage: '如果读不进去，只看标题也算让大脑重新接上了。', steps: [['承认读不进', '写一句“我现在读不进去”。', 1], ['只看标题', '只看这一页标题和小标题。', 2], ['读第一句', '只读正文第一句——做到这里就算今天赢。', 3]] }
        }
      })
  },
  {
    key: 'exam-review',
    patterns: [/复习考试|考试复习|备考|刷题|练习题/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'exam-review',
        spiceLevel,
        variants: {
          1: { steps: [['圈一个考点', '只选一个最可能考的点。', 1], ['做一道题', '只做一道相关题。', 8], ['写错因一句', '写一句错因或记住的点——做到这里就算今天赢。', 5]] },
          2: { steps: [['定低配复习', '决定今天只复习一个考点。', 1], ['选一道题', '只选一道最典型的题。', 3], ['做到一半也行', '先写出第一步思路。', 7], ['写一句记忆点', '写一句下次要记住什么——做到这里就算今天赢。', 4]] },
          3: { preface: '备考很容易让人想到一整座山。今天只碰一个考点。', exitMessage: '如果今天连题都做不动，只圈一个考点也算开始。', steps: [['承认害怕', '写一句“我现在害怕复习”。', 1], ['圈一个考点', '只圈一个最小考点。', 2], ['写第一步思路', '只写这类题第一步怎么想——做到这里就算今天赢。', 5]] }
        }
      })
  },
  {
    key: 'presentation-content',
    patterns: [/[:：].*(PPT内容|老板汇报|客户提案|课堂展示)|答辩.*PPT内容|演示.*PPT内容/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'presentation-content',
        spiceLevel,
        variants: {
          1: { steps: [['定听众一句话', '写下这份 PPT 是给谁看的。', 1], ['选三个结论', '只写 3 个最想让对方记住的结论。', 5], ['做出一页草稿', '把其中一个结论变成一页标题和两句话——做到这里就算今天赢。', 9]] },
          2: { steps: [['定60分版本', '决定这份 PPT 只要讲清哪一件事就能交。', 1], ['写三个标题', '先写 3 页标题，不写正文。', 4], ['填一页内容', '选最有把握的一页，写两句话。', 7], ['留一个空位', '给这一页留一个图或例子的位置——做到这里就算今天赢。', 3]] },
          3: { preface: '答辩 PPT 很容易变成一整座山。今天只做一页能站住的草稿。', exitMessage: '如果今天连一页都做不动，写下 3 个标题也算保住进度。', steps: [['承认卡住', '写一句“我现在不想整理 PPT”。', 1], ['定最低线', '写下：这份 PPT 只讲清一个结论也能过。', 2], ['写一个标题', '只写第一页标题。', 3], ['补两句话', '在标题下面写两句话——做到这里就算今天赢。', 5]] }
        }
      })
  },
  {
    key: 'presentation-script',
    patterns: [/[:：].*(演讲稿|讲稿)|答辩.*演讲稿|汇报.*演讲稿/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'presentation-script',
        spiceLevel,
        variants: {
          1: { steps: [['定开场一句', '只写第一句怎么开口。', 1], ['写三句主线', '写 3 句“我要讲什么”。', 5], ['补一个收尾', '写一句结束语——做到这里就算今天赢。', 4]] },
          2: { steps: [['定低配版', '决定讲稿只要能顺着念下来就行。', 1], ['写开场句', '写第一句开场白。', 3], ['写三句主线', '每页只配一句口播。', 8], ['写结束句', '写一句“谢谢，欢迎提问”——做到这里就算今天赢。', 2]] },
          3: { preface: '讲稿不用一次写完整。先让嘴巴知道第一句怎么开始。', exitMessage: '如果讲稿写不动，只写开场一句也算今天动了。', steps: [['承认不想写', '写一句“我现在不想写讲稿”。', 1], ['只写开场', '写第一句开场白。', 3], ['补一句主线', '写一句“我今天主要讲……”——做到这里就算今天赢。', 2]] }
        }
      })
  },
  {
    key: 'defense-qa',
    patterns: [/[:：].*(问答材料|答辩问题|Q&A)|答辩.*问答/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'defense-qa',
        spiceLevel,
        variants: {
          1: { steps: [['写一个问题', '先写最可能被问到的 1 个问题。', 2], ['写一句回答', '只写一句能接住的问题回答。', 4], ['补一个证据', '补一个例子或数据——做到这里就算今天赢。', 5]] },
          2: { steps: [['定最低线', '决定只准备 2 个最可能问题。', 1], ['写第一个问题', '写老师最可能问的第一个问题。', 3], ['写一句回答', '先用一句话回答，不求完整。', 5], ['补第二个问题', '只写第二个问题标题——做到这里就算今天赢。', 4]] },
          3: { preface: '答辩问答会让人预演很多压力。今天只准备一个问题就够。', exitMessage: '如果现在想不到答案，只写出问题也算赢一点。', steps: [['写下担心', '写一句“我怕被问到什么”。', 1], ['变成问题', '把担心改写成一个问题。', 3], ['写一句回答', '只写一句能先接住的回答——做到这里就算今天赢。', 5]] }
        }
      })
  },
  {
    key: 'presentation-general',
    patterns: [/(整理|准备|修改|做).*(答辩|演示|汇报|展示).*(稿|材料|内容|PPT|幻灯片)?/],
    build: (spiceLevel) =>
      createBreakdown({
        key: 'presentation-general',
        spiceLevel,
        variants: {
          1: {
            steps: [
              ['定听众一句话', '写下这份内容是给谁看的。', 1],
              ['列三个卖点', '只写 3 个最想让对方记住的点。', 5],
              ['做一页草稿', '把最重要的一点写成一页标题和两句话——做到这里就算今天赢。', 9]
            ]
          },
          2: {
            notes: '先做 60 分版本，不追求完整好看。',
            steps: [
              ['定60分版本', '决定这份材料只要讲清哪一件事就能交。', 1],
              ['写三个标题', '先写 3 个页面或段落标题，不写正文。', 4],
              ['填一个标题', '选最有把握的标题，往下写两句话。', 7],
              ['留个证据位', '给这一页留一个例子或数据的位置——做到这里就算赢。', 3]
            ]
          },
          3: {
            preface: '答辩或汇报很容易变成一整座山。今天只做一个能站住的小版本。',
            exitMessage: '如果今天连一页都做不动，写下 3 个标题也算保住进度。',
            steps: [
              ['承认卡住', '写一句“我现在不想整理这份材料”。', 1],
              ['定最低线', '写下：这份材料只讲清一个结论也能过。', 2],
              ['写一个标题', '只写第一个页面或段落标题。', 3],
              ['补两句话', '在标题下面写两句话——做到这里就算今天赢。', 5]
            ]
          }
        }
      })
  }
];

export function getCommonTaskBreakdown({ title, spiceLevel }) {
  const normalizedTitle = String(title || '').trim();
  const template = commonTemplates.find((item) =>
    item.patterns.some((pattern) => pattern.test(normalizedTitle))
  );

  if (!template) return null;

  const breakdown = template.build(spiceLevel);
  return {
    ...breakdown,
    templateKey: template.key,
    category: getTemplateCategory(template.key),
    autoAdopt: autoAdoptTemplateKeys.has(template.key)
  };
}
