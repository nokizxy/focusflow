export const autoAdoptTemplateKeys = new Set([
  'shower',
  'brush-teeth',
  'wash-face',
  'drink-water',
  'eat',
  'dishes',
  'trash',
  'laundry',
  'go-out',
  'take-medicine',
  'collect-clothes',
  'cook',
  'groceries'
]);

export function getTemplateCategory(key) {
  if (
    [
      'shower',
      'brush-teeth',
      'wash-face',
      'drink-water',
      'eat',
      'take-medicine',
      'go-out'
    ].includes(key)
  ) {
    return 'selfCare';
  }

  if (['dishes', 'trash', 'laundry', 'collect-clothes', 'cook', 'groceries'].includes(key)) {
    return 'chores';
  }

  if (['read-book', 'exam-review'].includes(key)) {
    return 'study';
  }

  return 'work';
}
