// src/domain/ai/agent/__test__/AgentTools.test.ts
//
// Agentic Search ツールのユニットテスト

import { createAgentTools } from '../AgentTools';
import { AgentContext } from '../types';

/** テスト用の仕様書テキスト */
const SAMPLE_SPEC = `
# ユーザー管理機能

## ログイン機能
ユーザーはメールアドレスとパスワードでログインできる。
二要素認証にも対応する。

## ユーザー登録
新規ユーザーはメールアドレスを使って登録できる。
パスワードは8文字以上で英数字を含む必要がある。

## プロフィール管理
ユーザーは自分のプロフィール情報を更新できる。
アバター画像のアップロードに対応する。

## 権限管理
管理者、編集者、閲覧者の3段階の権限レベルがある。
`.trim();

/** テスト用のAgentContext */
function createTestContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    specificationText: SAMPLE_SPEC,
    structureText: 'ルート\n  ユーザー管理\n    ログイン',
    selectedElement: {
      id: 'el-1',
      texts: ['ユーザー管理'],
    },
    parentElement: {
      id: 'root',
      texts: ['ルート'],
    },
    ...overrides,
  };
}

describe('AgentTools', () => {
  const tools = createAgentTools();

  describe('createAgentTools', () => {
    it('8つのツールを返す', () => {
      expect(tools).toHaveLength(8);
    });

    it('すべてのツールが必須プロパティを持つ', () => {
      for (const tool of tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.parameters).toBeDefined();
        expect(typeof tool.execute).toBe('function');
      }
    });

    it('想定通りのツール名を持つ', () => {
      const names = tools.map((t) => t.name);
      expect(names).toContain('search_spec');
      expect(names).toContain('get_spec_section');
      expect(names).toContain('get_spec_overview');
      expect(names).toContain('get_selected_subtree');
      expect(names).toContain('get_hierarchy_draft');
      expect(names).toContain('set_hierarchy_draft');
      expect(names).toContain('get_structure');
      expect(names).toContain('get_element_details');
    });
  });

  describe('search_spec', () => {
    const searchTool = tools.find((t) => t.name === 'search_spec');

    beforeEach(() => {
      if (!searchTool) throw new Error('search_spec tool not found');
    });

    it('キーワードに一致する仕様書セクションを返す', () => {
      if (!searchTool) return;
      const ctx = createTestContext();
      const result = searchTool.execute({ query: 'ログイン' }, ctx);
      expect(result).toContain('ログイン');
      expect(result).toContain('メールアドレス');
    });

    it('一致しないキーワードではエラーメッセージを返す', () => {
      const ctx = createTestContext();
      const result = searchTool.execute({ query: 'zzzzz_存在しない' }, ctx);
      expect(result).toContain('見つかりませんでした');
    });

    it('仕様書が空の場合はメッセージを返す', () => {
      const ctx = createTestContext({ specificationText: '' });
      const result = searchTool.execute({ query: 'テスト' }, ctx);
      expect(result).toContain('仕様書が設定されていません');
    });

    it('複数キーワードで検索できる', () => {
      const ctx = createTestContext();
      const result = searchTool.execute({ query: 'パスワード 登録' }, ctx);
      expect(result).toContain('パスワード');
    });
  });

  describe('get_spec_overview', () => {
    const overviewTool = tools.find((t) => t.name === 'get_spec_overview');

    beforeEach(() => {
      if (!overviewTool) throw new Error('get_spec_overview tool not found');
    });

    it('仕様書の概要情報を返す', () => {
      if (!overviewTool) return;
      const ctx = createTestContext();
      const result = overviewTool.execute({}, ctx);
      expect(result).toContain('仕様書概要');
      expect(result).toContain('セクション数');
      expect(result).toContain('ユーザー管理機能');
    });

    it('仕様書が空の場合はメッセージを返す', () => {
      if (!overviewTool) return;
      const ctx = createTestContext({ specificationText: '' });
      const result = overviewTool.execute({}, ctx);
      expect(result).toContain('仕様書が設定されていません');
    });
  });

  describe('get_spec_section', () => {
    const sectionTool = tools.find((t) => t.name === 'get_spec_section');

    beforeEach(() => {
      if (!sectionTool) throw new Error('get_spec_section tool not found');
    });

    it('セクション番号でセクションを取得できる', () => {
      if (!sectionTool) return;
      const ctx = createTestContext();
      const result = sectionTool.execute({ sectionIndex: 0 }, ctx);
      expect(result).toContain('セクション');
      expect(result.length).toBeGreaterThan(0);
    });

    it('範囲外のセクション番号でエラーメッセージを返す', () => {
      if (!sectionTool) return;
      const ctx = createTestContext();
      const result = sectionTool.execute({ sectionIndex: 999 }, ctx);
      expect(result).toContain('存在しません');
    });

    it('offset/length でブラウジングできる', () => {
      if (!sectionTool) return;
      const ctx = createTestContext();
      const result = sectionTool.execute({ offset: 0, length: 100 }, ctx);
      expect(result).toContain('offset=0');
    });
  });

  describe('get_structure', () => {
    const structureTool = tools.find((t) => t.name === 'get_structure');

    beforeEach(() => {
      if (!structureTool) throw new Error('get_structure tool not found');
    });

    it('現在の階層構造を返す', () => {
      if (!structureTool) return;
      const ctx = createTestContext();
      const result = structureTool.execute({}, ctx);
      expect(result).toContain('ルート');
      expect(result).toContain('ユーザー管理');
    });

    it('構造がない場合はメッセージを返す', () => {
      if (!structureTool) return;
      const ctx = createTestContext({ structureText: '' });
      const result = structureTool.execute({}, ctx);
      expect(result).toContain('階層構造データがありません');
    });
  });

  describe('get_selected_subtree', () => {
    const subtreeTool = tools.find((t) => t.name === 'get_selected_subtree');

    beforeEach(() => {
      if (!subtreeTool) throw new Error('get_selected_subtree tool not found');
    });

    it('選択要素配下のサブツリーを返す', () => {
      if (!subtreeTool) return;
      const ctx = createTestContext({ selectedSubtreeText: '対象サブツリー:\n- ユーザー管理\n  - ログイン' });
      const result = subtreeTool.execute({}, ctx);
      expect(result).toContain('対象サブツリー');
      expect(result).toContain('ログイン');
    });

    it('サブツリーがない場合はメッセージを返す', () => {
      if (!subtreeTool) return;
      const ctx = createTestContext({ selectedSubtreeText: '' });
      const result = subtreeTool.execute({}, ctx);
      expect(result).toContain('サブツリー情報はありません');
    });
  });

  describe('hierarchy draft tools', () => {
    const getDraftTool = tools.find((t) => t.name === 'get_hierarchy_draft');
    const setDraftTool = tools.find((t) => t.name === 'set_hierarchy_draft');

    beforeEach(() => {
      if (!getDraftTool) throw new Error('get_hierarchy_draft tool not found');
      if (!setDraftTool) throw new Error('set_hierarchy_draft tool not found');
    });

    it('保存した階層ドラフトを取得できる', () => {
      if (!getDraftTool || !setDraftTool) return;

      const ctx = createTestContext({ hierarchyDraftText: '' });
      setDraftTool.execute({ draft: '- ユーザー管理\n  - ログイン' }, ctx);
      const result = getDraftTool.execute({}, ctx);

      expect(result).toContain('ユーザー管理');
      expect(result).toContain('ログイン');
    });

    it('ドラフト未保存時はサブツリーを初期案として返す', () => {
      if (!getDraftTool) return;

      const ctx = createTestContext({
        hierarchyDraftText: '',
        selectedSubtreeText: '対象サブツリー:\n- ユーザー管理\n  - ログイン',
      });
      const result = getDraftTool.execute({}, ctx);

      expect(result).toContain('初期ドラフト');
      expect(result).toContain('ユーザー管理');
    });
  });

  describe('get_element_details', () => {
    const detailsTool = tools.find((t) => t.name === 'get_element_details');

    beforeEach(() => {
      if (!detailsTool) throw new Error('get_element_details tool not found');
    });

    it('選択要素の詳細を返す', () => {
      if (!detailsTool) return;
      const ctx = createTestContext();
      const result = detailsTool.execute({}, ctx);
      expect(result).toContain('el-1');
      expect(result).toContain('ユーザー管理');
    });

    it('親要素情報も含まれる', () => {
      if (!detailsTool) return;
      const ctx = createTestContext();
      const result = detailsTool.execute({}, ctx);
      expect(result).toContain('ルート');
    });

    it('選択要素がない場合はメッセージを返す', () => {
      if (!detailsTool) return;
      const ctx = createTestContext({ selectedElement: undefined });
      const result = detailsTool.execute({}, ctx);
      expect(result).toContain('選択されている要素はありません');
    });
  });
});
