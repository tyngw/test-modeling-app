export const generateId = (): string => {
  // 背景: uuid v14 は ESM-only で現行 Jest 設定と相性が悪いため、標準APIでID生成を完結させる。
  // 前提: IDは永続的な暗号トークンではなく、タブ・要素の衝突回避用として利用する。
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const randomValue = Math.floor(Math.random() * 16);
    const value = char === 'x' ? randomValue : (randomValue & 0x3) | 0x8;

    return value.toString(16);
  });
};
