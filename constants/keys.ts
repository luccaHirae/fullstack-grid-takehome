export const Keys = {
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Tab: 'Tab',
  Enter: 'Enter',
  Home: 'Home',
  End: 'End',
} as const;

export type KeyName = (typeof Keys)[keyof typeof Keys];

export const isArrowKey = (k: string): k is KeyName =>
  k === Keys.ArrowUp ||
  k === Keys.ArrowDown ||
  k === Keys.ArrowLeft ||
  k === Keys.ArrowRight;
