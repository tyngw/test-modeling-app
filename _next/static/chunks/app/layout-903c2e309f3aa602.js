(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[177],{395:(e,t,r)=>{"use strict";r.d(t,{GoogleAnalytics:()=>d});var s=r(5155),i=r(5695),n=r(2115),a=r(1195),o=r(7358);function l(){let e=(0,i.usePathname)(),t=(0,i.useSearchParams)(),r=o.env.NEXT_PUBLIC_GA_TRACKING_ID;return(0,n.useEffect)(()=>{r&&a.Ay.initialize(r)},[r]),(0,n.useEffect)(()=>{if(r&&1){let r=e+(t.toString()?`?${t}`:"");a.Ay.send({hitType:"pageview",page:r})}},[e,t,r]),null}function d(){return(0,s.jsx)(n.Suspense,{fallback:null,children:(0,s.jsx)(l,{})})}},5601:(e,t,r)=>{"use strict";r.d(t,{Providers:()=>D});var s=r(5155),i=r(2115),n=r(7242),a=r(7451),o=r(826),l=r(7650);let d=e=>{let{className:t="",size:r=24}=e;return(0,s.jsxs)("svg",{width:r,height:r,viewBox:"0 0 24 24",fill:"none",xmlns:"http://www.w3.org/2000/svg",className:t,children:[(0,s.jsx)("path",{d:"M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"}),(0,s.jsx)("path",{d:"M8 9H16",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"}),(0,s.jsx)("path",{d:"M8 13H12",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})]})};var c=r(4146),p=r(1970);let h=e=>{let{onSendMessage:t,isLoading:r=!1,isVisible:n=!1,onToggle:a,externalMessage:o,onExternalMessageProcessed:h}=e,[u,g]=(0,i.useState)([]),[x,E]=(0,i.useState)(""),f=(0,i.useRef)(null),m=(0,i.useRef)(null),[y,b]=(0,i.useState)(null);(0,i.useEffect)(()=>{{b(document.body);let e=document.createElement("style");return e.textContent=`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `,document.head.appendChild(e),()=>{document.head.removeChild(e)}}},[]),(0,i.useEffect)(()=>{f.current?.scrollIntoView({behavior:"smooth"})},[u]),(0,i.useEffect)(()=>{n&&(m.current?.focus(),setTimeout(()=>{f.current?.scrollIntoView({behavior:"smooth"})},0))},[n]);let T=(0,i.useCallback)(async e=>{let s=e||x.trim();if(!s||r)return;let i={id:Date.now().toString(),text:s,sender:"user",timestamp:new Date};g(e=>[...e,i]),e||E(""),E("");try{let e=await t(i.text),r={id:(Date.now()+1).toString(),text:e||"操作を実行しました！",sender:"assistant",timestamp:new Date};g(e=>[...e,r])}catch(t){let e={id:(Date.now()+1).toString(),text:`エラーが発生しました: ${t instanceof Error?t.message:"不明なエラー"}`,sender:"assistant",timestamp:new Date};g(t=>[...t,e])}},[x,r,t]);(0,i.useEffect)(()=>{o&&o.trim()&&(T(o),h?.())},[o,T,h]);let w=(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)("div",{className:"fixed bottom-4 right-4 z-50",style:{position:"fixed",bottom:"16px",right:"16px",zIndex:50},children:(0,s.jsx)("button",{onClick:a,"aria-label":"チャットアシスタントを開く",style:{width:"56px",height:"56px",backgroundColor:"#e5e7eb",border:"none",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.2s ease",boxShadow:"0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)",outline:"none"},onMouseOver:e=>{e.currentTarget.style.backgroundColor="#d1d5db",e.currentTarget.style.transform="scale(1.05)",e.currentTarget.style.boxShadow="0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)"},onMouseOut:e=>{e.currentTarget.style.backgroundColor="#e5e7eb",e.currentTarget.style.transform="scale(1)",e.currentTarget.style.boxShadow="0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)"},children:(0,s.jsx)(d,{size:24})})}),n&&(0,s.jsx)("div",{style:{position:"fixed",top:0,left:0,width:"100%",height:"100%",display:"flex",justifyContent:"flex-end",alignItems:"flex-end",zIndex:9e3,padding:"20px"},onClick:a,children:(0,s.jsxs)("div",{style:{background:"linear-gradient(135deg, #f3f4f6 0%, #e5e7ef 100%)",borderRadius:"16px",width:"400px",height:"600px",position:"relative",overflow:"hidden",boxShadow:`
                0 10px 15px -3px rgba(0, 0, 0, 0.1),
                0 4px 6px -2px rgba(0, 0, 0, 0.05),
                0 0 0 1px rgba(255, 255, 255, 0.1)
              `,border:"2px solid #d1d5db",transform:"translateY(0) scale(1)",transition:"transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",marginRight:"20px",marginBottom:"100px"},onClick:e=>e.stopPropagation(),children:[(0,s.jsxs)("div",{style:{position:"absolute",top:16,left:24,display:"flex",alignItems:"center",gap:"8px"},children:[(0,s.jsx)("div",{style:{display:"flex",alignItems:"center",justifyContent:"center"},children:(0,s.jsx)("div",{className:"w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center",children:(0,s.jsx)(d,{size:16,className:"text-white"})})}),(0,s.jsx)("div",{style:{fontSize:"1.2em",fontWeight:"bold",color:"#1f2937",display:"flex",alignItems:"center",height:"32px"},children:"AIアシスタント"})]}),(0,s.jsx)("button",{onClick:a,style:{position:"absolute",right:16,top:16,background:"#1f293715",border:"none",borderRadius:"50%",width:"32px",height:"32px",display:"flex",justifyContent:"center",alignItems:"center",fontSize:"1.2em",color:"#1f2937",cursor:"pointer",transition:"all 0.2s ease",outline:"none"},onMouseOver:e=>{e.currentTarget.style.background="#1f293725",e.currentTarget.style.transform="scale(1.1)"},onMouseOut:e=>{e.currentTarget.style.background="#1f293715",e.currentTarget.style.transform="scale(1)"},children:"\xd7"}),(0,s.jsx)("div",{style:{position:"relative",maxHeight:"calc(600px - 140px)",marginTop:"72px",overflowY:"auto",overflowX:"hidden",padding:"0 24px",scrollbarWidth:"thin",scrollbarColor:"#1f293740 transparent"},children:(0,s.jsxs)("div",{style:{padding:"16px 0",minHeight:"300px"},children:[0===u.length?(0,s.jsx)("div",{style:{textAlign:"center",paddingTop:"40px"},children:(0,s.jsxs)("div",{style:{color:"#6b7280",fontSize:"0.875rem",lineHeight:"1.5"},children:[(0,s.jsx)("p",{style:{fontWeight:"500",marginBottom:"8px"},children:"複数の操作を組み合わせた指示も可能です"}),(0,s.jsxs)("div",{style:{fontSize:"0.75rem",color:"#9ca3af",display:"flex",flexDirection:"column",gap:"4px"},children:[(0,s.jsx)("p",{children:"\uD83E\uDDE9 例: 子要素「概要」「詳細」を追加して"}),(0,s.jsx)("p",{children:"✏️ 例: テキストを「新しいタイトル」に変更して"}),(0,s.jsx)("p",{children:"� 例: ルート要素に「テスト」を追加し、そこに移動して"}),(0,s.jsx)("p",{children:"\uD83D\uDCDD 例: 「概要」要素を選択して内容を「新しい概要」に変更"})]})]})}):(0,s.jsx)("div",{style:{display:"flex",flexDirection:"column",gap:"16px"},children:u.map(e=>(0,s.jsx)("div",{style:{display:"flex",justifyContent:"user"===e.sender?"flex-end":"flex-start"},children:(0,s.jsx)("div",{style:{maxWidth:"75%",padding:"12px 16px",borderRadius:"16px",fontSize:"0.875rem",fontWeight:"500",boxShadow:"0 1px 2px 0 rgba(0, 0, 0, 0.05)",whiteSpace:"pre-wrap",..."user"===e.sender?{background:"linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",color:"#ffffff",marginLeft:"16px"}:{backgroundColor:"#f9fafb",border:"1px solid #e5e7eb",color:"#1f2937",marginRight:"16px"}},children:e.text})},e.id))}),(0,s.jsx)("div",{ref:f})]})}),(0,s.jsx)("div",{style:{position:"absolute",bottom:0,left:0,right:0,padding:"12px 12px",borderTop:"1px solid #e5e7eb",background:"linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%)",borderRadius:"0 0 16px 16px"},children:(0,s.jsxs)("div",{style:{display:"flex",gap:"8px"},children:[(0,s.jsx)("input",{ref:m,type:"text",value:x,onChange:e=>E(e.target.value),onKeyPress:e=>{"Enter"!==e.key||e.shiftKey||(e.preventDefault(),T())},placeholder:"メッセージを入力...",disabled:r,style:{flex:1,padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:"8px",fontSize:"0.85rem",outline:"none",backgroundColor:"#f9fafb",transition:"all 0.2s ease",boxShadow:"0 1px 2px 0 rgba(0, 0, 0, 0.05)",minHeight:"32px",height:"32px",lineHeight:"20px",boxSizing:"border-box",display:"block"},onFocus:e=>{e.target.style.borderColor="#3b82f6",e.target.style.backgroundColor="#ffffff",e.target.style.boxShadow="0 0 0 3px rgba(59, 130, 246, 0.1)"},onBlur:e=>{e.target.style.borderColor="#e5e7eb",e.target.style.backgroundColor="#f9fafb",e.target.style.boxShadow="0 1px 2px 0 rgba(0, 0, 0, 0.05)"}}),(0,s.jsx)(c.A,{onClick:()=>T(),disabled:!x.trim()||r,"aria-label":"送信",size:"small",sx:{background:!x.trim()||r?"linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)":"linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",color:"#fff",borderRadius:"8px",boxShadow:"0 2px 4px 0 rgba(0,0,0,0.1)",opacity:!x.trim()||r?.5:1,width:"32px",height:"32px",transition:"all 0.2s ease",display:"flex",alignItems:"center",justifyContent:"center","&:hover":{background:!r&&x.trim()?"linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)":"linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)",boxShadow:"0 4px 8px 0 rgba(0,0,0,0.15)"}},children:r?(0,s.jsx)("div",{style:{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"},children:(0,s.jsx)("div",{style:{width:"14px",height:"14px",border:"2px solid #ffffff",borderTop:"2px solid transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}})}):(0,s.jsx)("span",{style:{display:"flex",alignItems:"center",justifyContent:"center",padding:"2px"},children:(0,s.jsx)(p.A,{style:{fontSize:14},htmlColor:"#fff"})})})]})})]})})]});return y?(0,l.createPortal)(w,y):null};var u=r(8265),g=r(9929),x=r(1782);class E{constructor(e,t,r,s,i,n,a,o,l,d){this.type=e,this.targetId=t,this.elements=r,this.autoSelect=s,this.targetText=i,this.newText=n,this.targetNodeId=a,this.targetIndex=o,this.message=l,this.direction=d}isValid(){switch(this.type){case"ADD_ELEMENTS":return!!(this.elements&&this.elements.length>0);case"SELECT_ELEMENT":return!!(this.targetText||this.targetId);case"UPDATE_TEXT":return void 0!==this.newText;case"DELETE_ELEMENT":case"ADD_SIBLING_ELEMENT":case"COPY_ELEMENT":return!0;case"DROP_ELEMENT":return!!this.targetNodeId;case"ERROR":return!!this.message;default:return!1}}getOperationKey(){let e={targetId:this.targetId,elements:this.elements,targetText:this.targetText,newText:this.newText,targetNodeId:this.targetNodeId};return`${this.type}_${JSON.stringify(e)}`}}let f=`
あなたは構造化思考支援アプリケーションの専門チャットアシスタントです。ユーザーからの指示に基づいて、選択された要素に対して具体的な操作を指示します。

## [あなたの役割]
- ユーザーの要求を理解し、適切なアプリケーション操作を提案する
- 選択された要素に対して実行可能な操作のみを指示する
- 操作の結果を予測し、ユーザーに分かりやすく説明する

## [実行可能な操作]
以下の操作を指示できます：

### 1. 要素の追加
- **子要素の追加**: 選択された要素の下に新しい要素を追加
- **自動選択**: autoSelect: true を指定すると、追加した最初の要素を自動的に選択状態にします

### 2. 要素の更新
- **テキストの更新**: 選択された要素のテキスト内容を変更
- **マーカーの更新**: 要素の開始・終了マーカーを変更

### 3. 要素の削除
- **要素の削除**: 選択された要素を削除

### 4. 要素の移動
- **位置の変更**: 要素を別の親要素の子として移動
- **階層の変更**: 要素の階層レベルを変更

### 5. 要素のコピー
- **要素の複製**: 選択された要素をコピーして、同じ親の子として複製

### 6. 複数操作の組み合わせ
- **一度の指示で複数の操作を実行**: 要素の追加、移動、削除、更新を組み合わせた操作

## [移動操作の詳細]
要素の移動は階層構造の変更を伴います。以下の方法で移動を指定できます：

### 特定の要素の子として移動:
- targetNodeId: 移動先の親要素のID
- targetIndex: 子要素内での位置（省略時は末尾に追加）

### ルート要素として移動:
- targetNodeId: null (ルート要素として移動)

### 特定の位置に移動:
- targetNodeId: 移動先の親要素のID
- targetIndex: 挿入位置のインデックス（0から開始）
- direction: 移動方向（"right", "left", "none"のいずれか、省略可能）

## [出力形式]
必ず以下のJSON形式で応答してください。（単一操作でも配列形式を使用）：

\`\`\`json
{
  "operations": [
    {
      "type": "操作タイプ",
      "説明": "操作のデータ"
    }
  ]
}
\`\`\`

## [操作例]
### 子要素を追加する場合：
\`\`\`json
{
  "operations": [
    {
      "type": "ADD_ELEMENTS",
      "targetId": "current",
      "elements": ["新しい子要素1", "新しい子要素2"]
    }
  ]
}
\`\`\`

### 子要素を追加して自動選択する場合：
\`\`\`json
{
  "operations": [
    {
      "type": "ADD_ELEMENTS",
      "targetId": "current",
      "elements": ["新しい子要素"],
      "autoSelect": true
    }
  ]
}
\`\`\`

### テキストを更新する場合：
\`\`\`json
{
  "operations": [
    {
      "type": "UPDATE_TEXT",
      "newText": "更新されたテキスト"
    }
  ]
}
\`\`\`

### 要素を削除する場合：
\`\`\`json
{
  "operations": [
    {
      "type": "DELETE_ELEMENT"
    }
  ]
}
\`\`\`

### 要素をコピーする場合：
\`\`\`json
{
  "operations": [
    {
      "type": "COPY_ELEMENT"
    }
  ]
}
\`\`\`

### 要素を移動する場合：
\`\`\`json
{
  "operations": [
    {
      "type": "DROP_ELEMENT",
      "targetNodeId": "target-element-id",
      "targetIndex": 0
    }
  ]
}
\`\`\`

### 複数操作を組み合わせる場合（従来方式）：
\`\`\`json
{
  "operations": [
    {
      "type": "ADD_ELEMENTS",
      "targetId": "current",
      "elements": ["新要素1", "新要素2"]
    },
    {
      "type": "SELECT_ELEMENT",
      "targetText": "新要素1"
    },
    {
      "type": "UPDATE_TEXT",
      "newText": "更新された要素1"
    }
  ]
}
\`\`\`

### 複数操作を組み合わせる場合（autoSelect使用）：
\`\`\`json
{
  "operations": [
    {
      "type": "ADD_ELEMENTS",
      "targetId": "current",
      "elements": ["新要素1"],
      "autoSelect": true
    },
    {
      "type": "ADD_ELEMENTS",
      "targetId": "current",
      "elements": ["子要素1"]
    }
  ]
}
\`\`\`

## [重要な注意事項]
1. 必ず JSON 形式で応答してください
2. 選択された要素が存在しない場合は、適切なエラーメッセージを返してください
3. 操作が不可能な場合は、代替案を提案してください
4. 常に日本語で分かりやすく説明してください
5. ユーザーの意図を正確に理解し、最適な操作を提案してください
6. **要素を追加後にその子要素を追加する場合は、autoSelect: true を使用することを強く推奨**
7. autoSelectを使用すると、SELECT_ELEMENT操作を省略でき、より確実に動作します
6. 移動先の要素が見つからない場合は、利用可能な要素のリストを含むエラーレスポンスを返してください

## [エラーレスポンス例]
移動先の要素が見つからない場合：
\`\`\`json
{
  "operations": [
    {
      "type": "ERROR",
      "message": "指定された移動先「設計不備」が見つかりません。利用可能な要素を確認してください。"
    }
  ]
}
\`\`\``+`
`.trim();class m{constructor(e,t,r){this.aiRepository=e,this.configRepository=t,this.chatOperationService=r}async generateChatOperations(e,t,r){let s=this.configRepository.getApiKey();if(!s||""===s.trim())throw Error("APIキーが設定されていません。設定画面からAPIキーを設定してください。");let i=t?.texts[0]||"未選択",n=(e=>{let{selectedElement:t,currentStructure:r,userInput:s}=e;return`## [現在の状況]
[選択された要素]
${t}

[ユーザーの指示]
${s}

[現在の構造]
階層構造:
${r}`})({selectedElement:i,currentStructure:r,userInput:e});(0,u.c)("[ChatAssistant] リクエスト:",{selectedElement:i,instruction:e});let a=this.configRepository.getModelType(),o=await this.aiRepository.generateSingle(n,s,a,!1,f),l=this.parseAIResponse(o);return this.chatOperationService.validateOperations(l),this.chatOperationService.optimizeOperationOrder(l)}parseAIResponse(e){let t;if("string"!=typeof e)throw Error("予期しないレスポンスの型です");if(!e.trim())throw Error("AIからの応答が空でした。プロンプトを確認してください。");let r=e.replace(/```json\s*|```\s*/g,"").trim();(0,u.c)("[ChatAssistant] クリーンアップ後のレスポンス:",r);try{t=JSON.parse(r)}catch(t){throw(0,u.c)("[ChatAssistant] JSONパースエラー:",{error:t,originalResponse:e,cleanedResponse:r}),Error("AIからの応答を解析できませんでした。再度お試しください。")}let s=t.operations;if(!s||0===s.length)throw Error("実行可能な操作が見つかりませんでした。");return s.map(e=>new E(e.type,e.targetId,e.elements,e.autoSelect,e.targetText,e.newText,e.targetNodeId,e.targetIndex,e.message,e.direction))}createFriendlyErrorMessage(e){return this.chatOperationService.createFriendlyErrorMessage(e)}}class y{validateOperations(e){if(!e||0===e.length)throw Error("実行可能な操作が見つかりませんでした。");for(let t of e)if(!t.isValid())throw Error(`無効な操作です: ${t.type}`)}determineSearchStrategy(e,t){let r=t.find(t=>t.texts.some(t=>t===e));return r||(r=t.find(t=>t.texts.some(t=>t.includes(e))))?r:(r=t.find(t=>t.texts.some(t=>t.toLowerCase().includes(e.toLowerCase()))))||null}optimizeOperationOrder(e){return[...e.filter(e=>"SELECT_ELEMENT"===e.type),...e.filter(e=>"SELECT_ELEMENT"!==e.type)]}createFriendlyErrorMessage(e){let t=e.message;return t.includes("要素が削除されている可能性があります")?"操作対象の要素が見つかりません。ページを更新するか、別の要素を選択してください。":t.includes("選択された要素がありません")?"要素を選択してから操作を実行してください。":t.includes("応答を解析できませんでした")?"AIからの応答を処理できませんでした。もう一度お試しください。":t}}class b{constructor(e,t,r,s){this.message=e,this.newSelectedElementId=t,this.newElementId=r,this.newElementText=s}static success(e,t,r,s){return new b(e,t,r,s)}static error(e){return new b(e)}hasNewSelection(){return!!this.newSelectedElementId}}class T{constructor(e,t){this.dispatch=e,this.findElementByText=t,this.operationTimestamps=new Map}async executeOperations(e,t,r){let s=[],i=this.getCurrentSelectedElementId(t);for(let n=0;n<e.length;n++){let a=e[n];n>0&&await new Promise(e=>setTimeout(e,300)),(0,u.c)(`[ChatOperationAdapter] 操作 ${n+1}/${e.length} 実行中: ${a.type}, currentSelectedElementId=${i}`);let o=await this.executeOperation(a,i,t,r);s.push(o.message),o.hasNewSelection()&&(i=o.newSelectedElementId,(0,u.c)(`[ChatOperationAdapter] 選択要素IDを更新: ${i}`),await new Promise(e=>setTimeout(e,400))),n<e.length-1&&await new Promise(e=>setTimeout(e,200))}return(0,u.c)("[ChatOperationAdapter] 結果:",{operationsCount:e.length,results:s}),1===s.length?s[0]:`${s.length}個の操作を実行しました:
${s.map((e,t)=>`${t+1}. ${e}`).join("\n")}`}async executeOperation(e,t,r,s){if(this.isDuplicateOperation(e))return b.success("重複実行を防止しました");let i=t||this.getFirstElementId(r);switch(e.type){case"ADD_ELEMENTS":return this.executeAddElements(e,i,r);case"SELECT_ELEMENT":return this.executeSelectElement(e,r);case"UPDATE_TEXT":return this.executeUpdateText(e,i);case"DELETE_ELEMENT":return this.executeDeleteElement();case"ADD_SIBLING_ELEMENT":return this.executeAddSiblingElement();case"COPY_ELEMENT":return this.executeCopyElement();case"DROP_ELEMENT":return this.executeDropElement(e,i,r,s);case"ERROR":throw Error(e.message||"操作エラーが発生しました");default:throw Error(`サポートされていない操作です: ${e.type}`)}}executeAddElements(e,t,r){let s=e.elements||[],i="current"===e.targetId?t:e.targetId,n=e.autoSelect||!1;if(i&&!(0,x.sv)(r.state.hierarchicalData,i))throw Error(`対象要素（ID: ${i}）が見つかりません。要素が削除されている可能性があります。`);return new Promise((t,r)=>{this.dispatch({type:"ADD_ELEMENTS_SILENT",payload:{targetNodeId:i,targetPosition:"child",texts:s,tentative:!1,onSuccess:r=>{if((0,u.c)(`[ChatOperationAdapter] 要素追加成功: ${r.join(", ")}`),this.markOperationComplete(e),n&&r.length>0){let e=r[0],i=s[0];setTimeout(()=>{this.dispatch({type:"SELECT_ELEMENT",payload:{id:e}})},100),t(b.success(`${s.length}個の要素を追加し、「${i}」を選択しました`,e))}else t(b.success(`${s.length}個の要素を追加しました: ${s.join(", ")}`))},onError:e=>{r(Error(`要素の追加に失敗しました: ${e}`))}}})})}async executeSelectElement(e,t){if(e.targetText){let t=null;for(let r=0;r<5&&!(t=await this.findElementByText(e.targetText));r++)await new Promise(e=>setTimeout(e,50));return t?(this.dispatch({type:"SELECT_ELEMENT",payload:{id:t.id}}),b.success(`要素「${e.targetText}」を選択しました`,t.id)):((0,u.c)(`[ChatOperationAdapter] SELECT_ELEMENT: 「${e.targetText}」が見つかりません`),b.success(`要素「${e.targetText}」が見つかりませんでした。状態更新を待機してください。`))}return e.targetId?(this.dispatch({type:"SELECT_ELEMENT",payload:{id:e.targetId}}),b.success("要素を選択しました",e.targetId)):b.success("選択対象が指定されていません")}executeUpdateText(e,t){return this.dispatch({type:"UPDATE_TEXT",payload:{id:t,index:0,value:e.newText||""}}),b.success(`テキストを「${e.newText||""}」に更新しました`)}executeDeleteElement(){return this.dispatch({type:"DELETE_ELEMENT"}),b.success("要素を削除しました")}executeAddSiblingElement(){return this.dispatch({type:"ADD_SIBLING_ELEMENT"}),b.success("兄弟要素を追加しました")}executeCopyElement(){return this.dispatch({type:"COPY_ELEMENT"}),b.success("要素をコピーしました")}executeDropElement(e,t,r,s){let i="current"===e.targetNodeId?t:e.targetNodeId;if("current"===e.targetNodeId&&i){let e=s?s():r;if(e?.state.hierarchicalData&&!(0,x.sv)(e.state.hierarchicalData,i)){let t=(0,x.nn)(e.state.hierarchicalData).map(e=>e.id);throw(0,u.c)(`[ChatOperationAdapter] 利用可能な要素ID: ${t.join(", ")}`),Error(`新しい親 current が見つかりません。ID: ${i}`)}}let n={id:t,targetNodeId:i||null};return void 0!==e.targetIndex&&(n.targetIndex=e.targetIndex),void 0!==e.direction&&(n.direction=e.direction),this.dispatch({type:"DROP_ELEMENT",payload:n}),b.success("要素を移動しました")}isDuplicateOperation(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:2e3,r=e.getOperationKey(),s=Date.now(),i=this.operationTimestamps.get(r);return i&&s-i<t?((0,u.c)(`[ChatOperationAdapter] 重複実行を防止しました (前回実行: ${s-i}ms前, key: ${r})`),!0):(this.operationTimestamps.set(r,s),!1)}markOperationComplete(e){let t=e.getOperationKey();this.operationTimestamps.delete(t),(0,u.c)(`[ChatOperationAdapter] 操作完了、重複防止キーをクリア: ${t}`)}getCurrentSelectedElementId(e){if(!e.state.hierarchicalData)return"";let t=(0,x.nn)(e.state.hierarchicalData).find(e=>e.selected);return t?.id||this.getFirstElementId(e)}getFirstElementId(e){if(!e.state.hierarchicalData)return"";let t=(0,x.nn)(e.state.hierarchicalData);return t[0]?.id||""}}var w=r(7602),C=r(5507),S=r(4342),I=r(5512);function D(e){let{children:t}=e;return(0,s.jsx)(a.t,{children:(0,s.jsx)(o.K,{children:(0,s.jsxs)(n.O,{children:[t,(0,s.jsx)(j,{})]})})})}function j(){let{currentTab:e,dispatch:t}=(0,I.A)(),r=i.useCallback(()=>e,[e]),{handleChatMessage:n,isLoading:a}=function(e){let{currentTab:t,dispatch:r,getLatestState:s}=e,[n,a]=(0,i.useState)(!1),o=(0,i.useMemo)(()=>{let e=new w.g;return new m(e,new C.F,new y)},[]),l=(0,i.useCallback)(e=>new S.H(e.id,e.texts,e.x,e.y,e.width,e.height,e.sectionHeights,e.editing,e.selected,e.visible,e.tentative,e.startMarker,e.endMarker,e.direction,e.tempParentId),[]),d=(0,i.useCallback)(async e=>{if(!t?.state.hierarchicalData)return null;let r=(0,x.nn)(t.state.hierarchicalData),s=r.find(t=>t.texts&&t.texts.some(t=>t===e));return s||(s=r.find(t=>t.texts&&t.texts.some(t=>t.includes(e))))||(s=r.find(t=>t.texts&&t.texts.some(t=>t.toLowerCase().includes(e.toLowerCase()))))?l(s):null},[t,l]),c=(0,i.useMemo)(()=>new T(r,d),[r,d]);return{handleChatMessage:(0,i.useCallback)(async e=>{if(n)throw Error("処理中です。しばらくお待ちください。");a(!0);try{if(!t)throw Error("アクティブなタブがありません。");let r=t.state.hierarchicalData?(0,x.WN)(t.state.hierarchicalData):[],i=null;if(0===r.length){let e=t.state.hierarchicalData?(0,x.Xd)(t.state.hierarchicalData):{},r=Object.keys(e)[0],s=e[r];i=s?l(s):null}else i=l(r[0]);let n=t.state.hierarchicalData?(0,g.Je)(t.state.hierarchicalData):"階層構造データがありません";(0,u.c)("[ChatAssistant] リクエスト開始:",{selectedElement:i?.texts[0]||"未選択",instruction:e,structureLength:n.length});let a=await o.generateChatOperations(e,i,n);return(0,u.c)(`[ChatAssistant] 生成された操作数: ${a.length}`),await c.executeOperations(a,t,s)}catch(t){let e=t instanceof Error?t.message:"不明なエラーが発生しました";throw(0,u.c)("[ChatAssistant] エラー詳細:",{message:e,error:t,timestamp:new Date().toISOString()}),Error(o.createFriendlyErrorMessage(t instanceof Error?t:Error(e)))}finally{a(!1)}},[t,n,o,c,s,l]),isLoading:n}}({currentTab:e,dispatch:t,getLatestState:r}),[o,l]=i.useState(!1),[d,c]=i.useState(""),p=i.useCallback(()=>{l(e=>!e)},[]),E=i.useCallback(()=>{c("")},[]);return i.useEffect(()=>{let e=e=>{let t=e.detail.message;l(!0),c(t)};return window.addEventListener("aiAssistantMessage",e),()=>{window.removeEventListener("aiAssistantMessage",e)}},[]),(0,s.jsx)(h,{onSendMessage:n,isLoading:a,isVisible:o,onToggle:p,externalMessage:d,onExternalMessageProcessed:E})}},6948:(e,t,r)=>{Promise.resolve().then(r.bind(r,395)),Promise.resolve().then(r.bind(r,5601)),Promise.resolve().then(r.t.bind(r,7107,23))},7107:()=>{}},e=>{e.O(0,[578,659,169,783,441,964,358],()=>e(e.s=6948)),_N_E=e.O()}]);