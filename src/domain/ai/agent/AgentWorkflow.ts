// src/domain/ai/agent/AgentWorkflow.ts

// eslint-disable-next-line camelcase
export type AgentWorkflowPresetId = 'default' | 'full_generation';

type AgentWorkflowPreset = {
  stepInstructions: string[];
  finalInstruction: string;
};

const DEFAULT_FINAL_INSTRUCTION =
  '【指示】これまでに収集した情報を基に、最終的な回答を生成してください。' +
  'これ以上ツールを使用せず、必ず指定されたJSON形式で回答してください。';

const WORKFLOW_PRESETS: Record<AgentWorkflowPresetId, AgentWorkflowPreset> = {
  default: {
    stepInstructions: [
      '【ワークフロー: 理解フェーズ】まず対象要素・仕様書概要・現在構造を確認し、必要ならツールで関連箇所を探索してください。この段階では拙速に最終回答せず、情報収集を優先してください。',
      '【ワークフロー: 検証フェーズ】収集済み情報をもとに、重複・粒度・分類軸の整合性を確認してください。不足があれば最小限のツール呼び出しで補完してください。',
      '【ワークフロー: 仕上げフェーズ】十分な情報が揃っていれば、仕様書の根拠に基づいて一貫したJSONを返してください。',
    ],
    finalInstruction: DEFAULT_FINAL_INSTRUCTION,
  },
  // eslint-disable-next-line camelcase
  full_generation: {
    stepInstructions: [
      '【ワークフロー: Explore】まず対象要素・対象サブツリー・仕様書概要・現在構造を確認してください。このステップでは全体像の把握を優先し、まだ最終回答しないでください。入力文のどの部分がルート名・章・下位項目に相当するかを洗い出してください。',
      '【ワークフロー: Analyze】仕様書の見出し、主張、理由、例、補足を区別し、どこまで階層化すべきかを判断してください。情報を捨てず、未配置の内容が残らないように必要な根拠を追加収集してください。',
      '【ワークフロー: Plan】配下全体を通して使う単一の分類軸・章立て・粒度を決めてください。必要なら仕様書を追加検索し、分類の根拠を揃えてください。ルート要素名も必要に応じてより適切な表現へ更新してください。',
      '【ワークフロー: Build】全体で一貫した階層案を完成させてください。子ごとに分類軸を変えず、同じ深さでは粒度を揃えてください。大きな節目ごとに set_hierarchy_draft で現在案を保存してください。',
      '【ワークフロー: Expand】まだ表現できていない本文の論点・例・注意点・反論があれば、より深い階層へ展開してください。深さや要素数に上限を設けず、入力テキスト全体を階層に配置することを優先してください。',
      '【ワークフロー: Review】get_hierarchy_draft で直前案を見直し、重複、抜け漏れ、分類のぶれを修正してください。選択要素名の更新結果と、直下以降の完全な階層案を最終JSONへまとめてください。',
    ],
    finalInstruction:
      '【指示】これまでに収集した情報を基に、対象要素名の更新結果と配下の完成した階層案を最終出力してください。' +
      'これ以上ツールを使用せず、必ず rootText と hierarchicalItems を含むJSONのみで回答してください。',
  },
};

export function getAgentWorkflowStepInstruction(
  workflowPreset: AgentWorkflowPresetId | undefined,
  step: number,
): string | null {
  if (!workflowPreset) return null;

  const preset = WORKFLOW_PRESETS[workflowPreset];
  if (!preset) return null;

  const index = Math.min(step - 1, preset.stepInstructions.length - 1);
  return preset.stepInstructions[index] ?? null;
}

export function getAgentWorkflowFinalInstruction(
  workflowPreset: AgentWorkflowPresetId | undefined,
): string {
  if (!workflowPreset) return DEFAULT_FINAL_INSTRUCTION;

  return WORKFLOW_PRESETS[workflowPreset]?.finalInstruction ?? DEFAULT_FINAL_INSTRUCTION;
}
