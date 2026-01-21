(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[177],{395:(e,t,r)=>{"use strict";r.d(t,{GoogleAnalytics:()=>d});var s=r(5155),i=r(5695),n=r(2115),a=r(1195),o=r(7358);function l(){let e=(0,i.usePathname)(),t=(0,i.useSearchParams)(),r=o.env.NEXT_PUBLIC_GA_TRACKING_ID;return(0,n.useEffect)(()=>{r&&a.Ay.initialize(r)},[r]),(0,n.useEffect)(()=>{if(r&&1){let r=e+(t.toString()?`?${t}`:"");a.Ay.send({hitType:"pageview",page:r})}},[e,t,r]),null}function d(){return(0,s.jsx)(n.Suspense,{fallback:null,children:(0,s.jsx)(l,{})})}},5601:(e,t,r)=>{"use strict";r.d(t,{Providers:()=>C});var s=r(5155),i=r(2115),n=r(7242),a=r(7451),o=r(826),l=r(7650);let d=e=>{let{className:t="",size:r=24}=e;return(0,s.jsxs)("svg",{width:r,height:r,viewBox:"0 0 24 24",fill:"none",xmlns:"http://www.w3.org/2000/svg",className:t,children:[(0,s.jsx)("path",{d:"M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"}),(0,s.jsx)("path",{d:"M8 9H16",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"}),(0,s.jsx)("path",{d:"M8 13H12",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})]})};var c=r(4146),h=r(1970);let p=e=>{let{onSendMessage:t,isLoading:r=!1,isVisible:n=!1,onToggle:a,externalMessage:o,onExternalMessageProcessed:p}=e,[u,g]=(0,i.useState)([]),[x,E]=(0,i.useState)(""),f=(0,i.useRef)(null),m=(0,i.useRef)(null),[y,T]=(0,i.useState)(null);(0,i.useEffect)(()=>{{T(document.body);let e=document.createElement("style");return e.textContent=`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `,document.head.appendChild(e),()=>{document.head.removeChild(e)}}},[]),(0,i.useEffect)(()=>{f.current?.scrollIntoView({behavior:"smooth"})},[u]),(0,i.useEffect)(()=>{n&&(m.current?.focus(),setTimeout(()=>{f.current?.scrollIntoView({behavior:"smooth"})},0))},[n]);let b=(0,i.useCallback)(async e=>{let s=e||x.trim();if(!s||r)return;let i={id:Date.now().toString(),text:s,sender:"user",timestamp:new Date};g(e=>[...e,i]),e||E(""),E("");try{let e=await t(i.text),r={id:(Date.now()+1).toString(),text:e||"操作を実行しました！",sender:"assistant",timestamp:new Date};g(e=>[...e,r])}catch(t){let e={id:(Date.now()+1).toString(),text:`エラーが発生しました: ${t instanceof Error?t.message:"不明なエラー"}`,sender:"assistant",timestamp:new Date};g(t=>[...t,e])}},[x,r,t]);(0,i.useEffect)(()=>{o&&o.trim()&&(b(o),p?.())},[o,b,p]);let w=(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)("div",{className:"fixed bottom-4 right-4 z-50",style:{position:"fixed",bottom:"16px",right:"16px",zIndex:50},children:(0,s.jsx)("button",{onClick:a,"aria-label":"チャットアシスタントを開く",style:{width:"56px",height:"56px",backgroundColor:"#e5e7eb",border:"none",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.2s ease",boxShadow:"0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)",outline:"none"},onMouseOver:e=>{e.currentTarget.style.backgroundColor="#d1d5db",e.currentTarget.style.transform="scale(1.05)",e.currentTarget.style.boxShadow="0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)"},onMouseOut:e=>{e.currentTarget.style.backgroundColor="#e5e7eb",e.currentTarget.style.transform="scale(1)",e.currentTarget.style.boxShadow="0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)"},children:(0,s.jsx)(d,{size:24})})}),n&&(0,s.jsx)("div",{style:{position:"fixed",top:0,left:0,width:"100%",height:"100%",display:"flex",justifyContent:"flex-end",alignItems:"flex-end",zIndex:9e3,padding:"20px"},onClick:a,children:(0,s.jsxs)("div",{style:{background:"linear-gradient(135deg, #f3f4f6 0%, #e5e7ef 100%)",borderRadius:"16px",width:"400px",height:"600px",position:"relative",overflow:"hidden",boxShadow:`
                0 10px 15px -3px rgba(0, 0, 0, 0.1),
                0 4px 6px -2px rgba(0, 0, 0, 0.05),
                0 0 0 1px rgba(255, 255, 255, 0.1)
              `,border:"2px solid #d1d5db",transform:"translateY(0) scale(1)",transition:"transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",marginRight:"20px",marginBottom:"100px"},onClick:e=>e.stopPropagation(),children:[(0,s.jsxs)("div",{style:{position:"absolute",top:16,left:24,display:"flex",alignItems:"center",gap:"8px"},children:[(0,s.jsx)("div",{style:{display:"flex",alignItems:"center",justifyContent:"center"},children:(0,s.jsx)("div",{className:"w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center",children:(0,s.jsx)(d,{size:16,className:"text-white"})})}),(0,s.jsx)("div",{style:{fontSize:"1.2em",fontWeight:"bold",color:"#1f2937",display:"flex",alignItems:"center",height:"32px"},children:"AIアシスタント"})]}),(0,s.jsx)("button",{onClick:a,style:{position:"absolute",right:16,top:16,background:"#1f293715",border:"none",borderRadius:"50%",width:"32px",height:"32px",display:"flex",justifyContent:"center",alignItems:"center",fontSize:"1.2em",color:"#1f2937",cursor:"pointer",transition:"all 0.2s ease",outline:"none"},onMouseOver:e=>{e.currentTarget.style.background="#1f293725",e.currentTarget.style.transform="scale(1.1)"},onMouseOut:e=>{e.currentTarget.style.background="#1f293715",e.currentTarget.style.transform="scale(1)"},children:"\xd7"}),(0,s.jsx)("div",{style:{position:"relative",maxHeight:"calc(600px - 140px)",marginTop:"72px",overflowY:"auto",overflowX:"hidden",padding:"0 24px",scrollbarWidth:"thin",scrollbarColor:"#1f293740 transparent"},children:(0,s.jsxs)("div",{style:{padding:"16px 0",minHeight:"300px"},children:[0===u.length?(0,s.jsx)("div",{style:{textAlign:"center",paddingTop:"40px"},children:(0,s.jsxs)("div",{style:{color:"#6b7280",fontSize:"0.875rem",lineHeight:"1.5"},children:[(0,s.jsx)("p",{style:{fontWeight:"500",marginBottom:"8px"},children:"複数の操作を組み合わせた指示も可能です"}),(0,s.jsxs)("div",{style:{fontSize:"0.75rem",color:"#9ca3af",display:"flex",flexDirection:"column",gap:"4px"},children:[(0,s.jsx)("p",{children:"\uD83E\uDDE9 例: 子要素「概要」「詳細」を追加して"}),(0,s.jsx)("p",{children:"✏️ 例: テキストを「新しいタイトル」に変更して"}),(0,s.jsx)("p",{children:"� 例: ルート要素に「テスト」を追加し、そこに移動して"}),(0,s.jsx)("p",{children:"\uD83D\uDCDD 例: 「概要」要素を選択して内容を「新しい概要」に変更"})]})]})}):(0,s.jsx)("div",{style:{display:"flex",flexDirection:"column",gap:"16px"},children:u.map(e=>(0,s.jsx)("div",{style:{display:"flex",justifyContent:"user"===e.sender?"flex-end":"flex-start"},children:(0,s.jsx)("div",{style:{maxWidth:"75%",padding:"12px 16px",borderRadius:"16px",fontSize:"0.875rem",fontWeight:"500",boxShadow:"0 1px 2px 0 rgba(0, 0, 0, 0.05)",whiteSpace:"pre-wrap",..."user"===e.sender?{background:"linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",color:"#ffffff",marginLeft:"16px"}:{backgroundColor:"#f9fafb",border:"1px solid #e5e7eb",color:"#1f2937",marginRight:"16px"}},children:e.text})},e.id))}),(0,s.jsx)("div",{ref:f})]})}),(0,s.jsx)("div",{style:{position:"absolute",bottom:0,left:0,right:0,padding:"12px 12px",borderTop:"1px solid #e5e7eb",background:"linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%)",borderRadius:"0 0 16px 16px"},children:(0,s.jsxs)("div",{style:{display:"flex",gap:"8px"},children:[(0,s.jsx)("input",{ref:m,type:"text",value:x,onChange:e=>E(e.target.value),onKeyPress:e=>{"Enter"!==e.key||e.shiftKey||(e.preventDefault(),b())},placeholder:"メッセージを入力...",disabled:r,style:{flex:1,padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:"8px",fontSize:"0.85rem",outline:"none",backgroundColor:"#f9fafb",transition:"all 0.2s ease",boxShadow:"0 1px 2px 0 rgba(0, 0, 0, 0.05)",minHeight:"32px",height:"32px",lineHeight:"20px",boxSizing:"border-box",display:"block"},onFocus:e=>{e.target.style.borderColor="#3b82f6",e.target.style.backgroundColor="#ffffff",e.target.style.boxShadow="0 0 0 3px rgba(59, 130, 246, 0.1)"},onBlur:e=>{e.target.style.borderColor="#e5e7eb",e.target.style.backgroundColor="#f9fafb",e.target.style.boxShadow="0 1px 2px 0 rgba(0, 0, 0, 0.05)"}}),(0,s.jsx)(c.A,{onClick:()=>b(),disabled:!x.trim()||r,"aria-label":"送信",size:"small",sx:{background:!x.trim()||r?"linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)":"linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",color:"#fff",borderRadius:"8px",boxShadow:"0 2px 4px 0 rgba(0,0,0,0.1)",opacity:!x.trim()||r?.5:1,width:"32px",height:"32px",transition:"all 0.2s ease",display:"flex",alignItems:"center",justifyContent:"center","&:hover":{background:!r&&x.trim()?"linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)":"linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)",boxShadow:"0 4px 8px 0 rgba(0,0,0,0.15)"}},children:r?(0,s.jsx)("div",{style:{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"},children:(0,s.jsx)("div",{style:{width:"14px",height:"14px",border:"2px solid #ffffff",borderTop:"2px solid transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}})}):(0,s.jsx)("span",{style:{display:"flex",alignItems:"center",justifyContent:"center",padding:"2px"},children:(0,s.jsx)(h.A,{style:{fontSize:14},htmlColor:"#fff"})})})]})})]})})]});return y?(0,l.createPortal)(w,y):null};var u=r(8265),g=r(9929),x=r(1782);class E{constructor(e,t,r,s,i,n,a,o,l,d,c){this.type=e,this.targetId=t,this.elements=r,this.autoSelect=s,this.targetText=i,this.newText=n,this.targetNodeId=a,this.targetIndex=o,this.message=l,this.direction=d,this.elementsTree=c}isValid(){switch(this.type){case"ADD_ELEMENTS":return!!(this.elements&&this.elements.length>0);case"SELECT_ELEMENT":return!!(this.targetText||this.targetId);case"UPDATE_TEXT":return void 0!==this.newText;case"DELETE_ELEMENT":case"ADD_SIBLING_ELEMENT":case"COPY_ELEMENT":return!0;case"DROP_ELEMENT":return!!this.targetNodeId;case"ADD_WITH_CHILDREN":return!!(this.elementsTree&&this.elementsTree.length>0&&this.elementsTree.every(e=>"string"==typeof e.parent&&e.parent.trim()));case"ERROR":return!!this.message;default:return!1}}getOperationKey(){let e={targetId:this.targetId,elements:this.elements,targetText:this.targetText,newText:this.newText,targetNodeId:this.targetNodeId,elementsTree:this.elementsTree};return`${this.type}_${JSON.stringify(e)}`}}let f=`
あなたは構造化思考支援アプリケーションの専門チャットアシスタントです。ユーザー指示を受け取り、指定されたJSON形式だけで操作提案を出力します。

## [あなたの役割]
- ユーザーの要求を理解し、適切なアプリケーション操作を提案する
- 選択された要素に対して実行可能な操作のみを指示する

## [出力ルール]
- **必ずJSONオブジェクトのみを返すこと**（前後に説明文・挨拶・マークダウンを付けない）
- キー構造は下記「出力形式」に厳密に従う
- 文字列値は日本語で記述する
- 応答が生成できない場合も、'{"operations":[{"type":"ERROR","message":"理由"}]}' の形で返す

## [実行可能な操作]
1. 要素の追加（'ADD_ELEMENTS'）: 'targetId' が 'current' の場合は現在要素の子として追加。新規子要素を選択したい場合は 'autoSelect: true' を指定する
2. 要素の更新（'UPDATE_TEXT' / 'UPDATE_MARKER' 等）
3. 要素の削除（'DELETE_ELEMENT'）
4. 要素の移動（'DROP_ELEMENT'）: 必要に応じて 'targetNodeId' と 'targetIndex' を指定する
5. 要素のコピー（'COPY_ELEMENT'）
6. 要素の選択（'SELECT_ELEMENT'）: 'targetText' または 'targetId' を指定して任意の要素を選択する。後続操作で別要素を扱う場合は必ず選択操作を先に挟む
7. 親子セットの追加（'ADD_WITH_CHILDREN'）: 'elementsTree' に { "parent": "親テキスト", "children": ["子1", "子2"], "targetId": "current" } を指定し、一度の応答で親とその子要素を追加する
8. 上記操作の組み合わせ: 「A要素を追加し、B要素を削除し、C要素を更新」など複数指示を順序通りに並べる

## [移動操作の補足]
- 'targetNodeId': 移動先の親要素ID。ルートへ移動する場合は 'null'
- 'targetIndex': 子リスト内での挿入位置（0開始、未指定なら末尾）
- 'direction': 'right' | 'left' | 'none' のいずれか（必要時のみ）

## [出力形式]
{
  "operations": [
    {
      "type": "操作タイプ",
      "targetId": "対象要素IDまたはcurrent",
      "elements": ["必要なら追加するテキスト"]
    }
  ]
}

## [操作例]
### 子要素を追加する場合
{
  "operations": [
    {
      "type": "ADD_ELEMENTS",
      "targetId": "current",
      "elements": ["新しい子要素1", "新しい子要素2"]
    }
  ]
}

### 子要素を追加して自動選択する場合
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

### テキストを更新する場合
{
  "operations": [
    {
      "type": "UPDATE_TEXT",
      "newText": "更新されたテキスト"
    }
  ]
}

### 要素を削除する場合
{
  "operations": [
    {
      "type": "DELETE_ELEMENT"
    }
  ]
}

### 要素を移動する場合
{
  "operations": [
    {
      "type": "DROP_ELEMENT",
      "targetNodeId": "target-element-id",
      "targetIndex": 0
    }
  ]
}

### 複数操作を組み合わせる場合
{
  "operations": [
    {
      "type": "ADD_ELEMENTS",
      "targetId": "current",
      "elements": ["新要素1"],
      "autoSelect": true
    },
    {
      "type": "SELECT_ELEMENT",
      "targetText": "既存の課題"
    },
    {
      "type": "UPDATE_TEXT",
      "newText": "新要素1の詳細を更新"
    },
    {
      "type": "DELETE_ELEMENT"
    }
  ]
}

### 親子要素を同時に追加する場合
{
  "operations": [
    {
      "type": "ADD_WITH_CHILDREN",
      "targetId": "current",
      "autoSelect": true,
      "elementsTree": [
        {
          "parent": "A",
          "children": ["A1", "A2"]
        }
      ]
    }
  ]
}

## [エラーレスポンス例]
### 移動先の要素が見つからない場合
{
  "operations": [
    {
      "type": "ERROR",
      "message": "指定された移動先が見つかりません。利用可能な要素を確認してください。"
    }
  ]
}

## [追加ルール]
- 操作が不可能なときは 'ERROR' 応答で理由と代替案を日本語で伝える
- 要素の追加直後にその子要素を操作する必要がある場合は、'autoSelect: true' を活用して選択状態を維持する
- 現在選択中以外の要素を操作する際は必ず 'SELECT_ELEMENT' で対象を指定し、その後に操作を続ける
- 常にユーザーの指示順序を反映し、必要最小限の手順で操作を構成する
`;class m{constructor(e,t,r){this.aiRepository=e,this.configRepository=t,this.chatOperationService=r,this.chatHistory=[],this.hasSentInitialSystemInstruction=!1}async generateChatOperations(e,t,r){let s=this.configRepository.getApiKey();if(!s||""===s.trim())throw Error("APIキーが設定されていません。設定画面からAPIキーを設定してください。");let i=(e=>{let{selectedElement:t,currentStructure:r,userInput:s}=e;return`## [現在の状況]
[選択された要素]
${t}

[ユーザーの指示]
${s}

[現在の構造]
階層構造:
${r}`})({selectedElement:t?.texts[0]||"未選択",currentStructure:r,userInput:e}),n=0===this.chatHistory.length,a=this.configRepository.getModelType(),o=!this.hasSentInitialSystemInstruction,{response:l,updatedHistory:d}=await this.aiRepository.generateWithThread(i,s,a,this.chatHistory,o?f:void 0,!0,!0,o);o&&n?this.chatHistory=[{role:"user",parts:[{text:f}]},...d]:this.chatHistory=d,o&&(this.hasSentInitialSystemInstruction=!0);let c=this.parseAIResponse(l);return this.chatOperationService.validateOperations(c),this.chatOperationService.optimizeOperationOrder(c)}parseAIResponse(e){let t;if("string"!=typeof e)throw Error("予期しないレスポンスの型です");if(!e.trim())throw Error("AIからの応答が空でした。プロンプトを確認してください。");let r=e.replace(/```json\s*|```\s*/g,"").trim();try{t=JSON.parse(r)}catch(t){throw(0,u.c)("[ChatAssistant] JSONパースエラー:",{error:t,originalResponse:e,cleanedResponse:r}),Error("AIからの応答を解析できませんでした。再度お試しください。")}let s=t.operations;if(!s||0===s.length)throw Error("実行可能な操作が見つかりませんでした。");return s.map(e=>new E(e.type,e.targetId,e.elements,e.autoSelect,e.targetText,e.newText,e.targetNodeId,e.targetIndex,e.message,e.direction,e.elementsTree))}createFriendlyErrorMessage(e){return this.chatOperationService.createFriendlyErrorMessage(e)}}class y{validateOperations(e){if(!e||0===e.length)throw Error("実行可能な操作が見つかりませんでした。");for(let t of e)if(!t.isValid())throw Error(`無効な操作です: ${t.type}`)}determineSearchStrategy(e,t){let r=t.find(t=>t.texts.some(t=>t===e));return r||(r=t.find(t=>t.texts.some(t=>t.includes(e))))?r:(r=t.find(t=>t.texts.some(t=>t.toLowerCase().includes(e.toLowerCase()))))||null}optimizeOperationOrder(e){return[...e.filter(e=>"SELECT_ELEMENT"===e.type),...e.filter(e=>"SELECT_ELEMENT"!==e.type)]}createFriendlyErrorMessage(e){let t=e.message;return t.includes("要素が削除されている可能性があります")?"操作対象の要素が見つかりません。ページを更新するか、別の要素を選択してください。":t.includes("選択された要素がありません")?"要素を選択してから操作を実行してください。":t.includes("応答を解析できませんでした")?"AIからの応答を処理できませんでした。もう一度お試しください。":t}}class T{constructor(e,t,r,s){this.message=e,this.newSelectedElementId=t,this.newElementId=r,this.newElementText=s}static success(e,t,r,s){return new T(e,t,r,s)}static error(e){return new T(e)}hasNewSelection(){return!!this.newSelectedElementId}}class b{constructor(e,t){this.dispatch=e,this.findElementByText=t,this.operationTimestamps=new Map}async executeOperations(e,t,r){let s=[],i=this.getCurrentSelectedElementId(t);for(let n=0;n<e.length;n++){let a=e[n];n>0&&await new Promise(e=>setTimeout(e,300));let o=await this.executeOperation(a,i,t,r);s.push(o.message),o.hasNewSelection()&&(i=o.newSelectedElementId,await new Promise(e=>setTimeout(e,400))),n<e.length-1&&await new Promise(e=>setTimeout(e,200))}return 1===s.length?s[0]:`${s.length}個の操作を実行しました:
${s.map((e,t)=>`${t+1}. ${e}`).join("\n")}`}async executeOperation(e,t,r,s){if(this.isDuplicateOperation(e))return T.success("重複実行を防止しました");let i=t||this.getFirstElementId(r);switch(e.type){case"ADD_ELEMENTS":return this.executeAddElements(e,i,r,s);case"ADD_WITH_CHILDREN":return this.executeAddElementsWithChildren(e,i,r,s);case"SELECT_ELEMENT":return this.executeSelectElement(e,r);case"UPDATE_TEXT":return this.executeUpdateText(e,i);case"DELETE_ELEMENT":return this.executeDeleteElement();case"ADD_SIBLING_ELEMENT":return this.executeAddSiblingElement();case"COPY_ELEMENT":return this.executeCopyElement();case"DROP_ELEMENT":return this.executeDropElement(e,i,r,s);case"ERROR":throw Error(e.message||"操作エラーが発生しました");default:throw Error(`サポートされていない操作です: ${e.type}`)}}async executeAddElements(e,t,r,s){let i=e.elements||[],n="current"===e.targetId?t:e.targetId,a=e.autoSelect||!1,o=await this.addElementsInternal(i,n,r,s);if(this.markOperationComplete(e),a&&o.length>0){let e=o[0],t=i[0];return setTimeout(()=>{this.dispatch({type:"SELECT_ELEMENT",payload:{id:e}})},100),T.success(`${i.length}個の要素を追加し、「${t}」を選択しました`,e)}return T.success(`${i.length}個の要素を追加しました: ${i.join(", ")}`)}async executeAddElementsWithChildren(e,t,r,s){let i,n=e.elementsTree||[];if(0===n.length)return this.markOperationComplete(e),T.success("追加対象の親子要素がありませんでした");let a="current"===e.targetId?t:e.targetId,o=[];for(let e of n){if(!e||!e.parent?.trim())continue;let n="current"===e.targetId?t:e.targetId?e.targetId:a,l=await this.addElementsInternal([e.parent],n,r,s);if(0===l.length)continue;let d=l[0];o.push(`親要素「${e.parent}」を追加`),i=d,e.children&&e.children.length>0&&(await this.addElementsInternal(e.children,d,r,s),o.push(`  └ 子要素: ${e.children.join(", ")}`))}if(this.markOperationComplete(e),e.autoSelect&&i){let e=i;setTimeout(()=>{this.dispatch({type:"SELECT_ELEMENT",payload:{id:e}})},100)}let l=o.length?`${n.length}組の親子要素を追加しました:
${o.join("\n")}`:"親子要素の追加対象が見つかりませんでした";return T.success(l,e.autoSelect?i:void 0)}async executeSelectElement(e,t){if(e.targetText){let t=null;for(let r=0;r<5&&!(t=await this.findElementByText(e.targetText));r++)await new Promise(e=>setTimeout(e,50));return t?(this.dispatch({type:"SELECT_ELEMENT",payload:{id:t.id}}),T.success(`要素「${e.targetText}」を選択しました`,t.id)):((0,u.c)(`[ChatOperationAdapter] SELECT_ELEMENT: 「${e.targetText}」が見つかりません`),T.success(`要素「${e.targetText}」が見つかりませんでした。状態更新を待機してください。`))}return e.targetId?(this.dispatch({type:"SELECT_ELEMENT",payload:{id:e.targetId}}),T.success("要素を選択しました",e.targetId)):T.success("選択対象が指定されていません")}executeUpdateText(e,t){return this.dispatch({type:"UPDATE_TEXT",payload:{id:t,index:0,value:e.newText||""}}),T.success(`テキストを「${e.newText||""}」に更新しました`)}executeDeleteElement(){return this.dispatch({type:"DELETE_ELEMENT"}),T.success("要素を削除しました")}executeAddSiblingElement(){return this.dispatch({type:"ADD_SIBLING_ELEMENT"}),T.success("兄弟要素を追加しました")}executeCopyElement(){return this.dispatch({type:"COPY_ELEMENT"}),T.success("要素をコピーしました")}executeDropElement(e,t,r,s){let i="current"===e.targetNodeId?t:e.targetNodeId;if("current"===e.targetNodeId&&i){let e=s?s():r;if(e?.state.hierarchicalData&&!(0,x.sv)(e.state.hierarchicalData,i)){let t=(0,x.nn)(e.state.hierarchicalData).map(e=>e.id);throw(0,u.c)(`[ChatOperationAdapter] 利用可能な要素ID: ${t.join(", ")}`),Error(`新しい親 current が見つかりません。ID: ${i}`)}}let n={id:t,targetNodeId:i||null};return void 0!==e.targetIndex&&(n.targetIndex=e.targetIndex),void 0!==e.direction&&(n.direction=e.direction),this.dispatch({type:"DROP_ELEMENT",payload:n}),T.success("要素を移動しました")}isDuplicateOperation(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:2e3,r=e.getOperationKey(),s=Date.now(),i=this.operationTimestamps.get(r);return i&&s-i<t?((0,u.c)(`[ChatOperationAdapter] 重複実行を防止しました (前回実行: ${s-i}ms前, key: ${r})`),!0):(this.operationTimestamps.set(r,s),!1)}async addElementsInternal(e,t,r,s){return 0===e.length?[]:await new Promise((r,s)=>{this.dispatch({type:"ADD_ELEMENTS_SILENT",payload:{targetNodeId:t,targetPosition:"child",texts:e,tentative:!1,onSuccess:e=>{r(e)},onError:e=>{s(Error(`要素の追加に失敗しました: ${e}`))}}})})}markOperationComplete(e){let t=e.getOperationKey();this.operationTimestamps.delete(t),(0,u.c)(`[ChatOperationAdapter] 操作完了、重複防止キーをクリア: ${t}`)}getCurrentSelectedElementId(e){if(!e.state.hierarchicalData)return"";let t=(0,x.nn)(e.state.hierarchicalData).find(e=>e.selected);return t?.id||this.getFirstElementId(e)}getFirstElementId(e){if(!e.state.hierarchicalData)return"";let t=(0,x.nn)(e.state.hierarchicalData);return t[0]?.id||""}}var w=r(7602),I=r(5507),S=r(4342),D=r(5512);function C(e){let{children:t}=e;return(0,s.jsx)(a.t,{children:(0,s.jsx)(o.K,{children:(0,s.jsxs)(n.O,{children:[t,(0,s.jsx)(L,{})]})})})}function L(){let{currentTab:e,dispatch:t}=(0,D.A)(),r=i.useCallback(()=>e,[e]),{handleChatMessage:n,isLoading:a}=function(e){let{currentTab:t,dispatch:r,getLatestState:s}=e,[n,a]=(0,i.useState)(!1),o=(0,i.useMemo)(()=>{let e=new w.g;return new m(e,new I.F,new y)},[]),l=(0,i.useCallback)(e=>new S.H(e.id,e.texts,e.x,e.y,e.width,e.height,e.sectionHeights,e.editing,e.selected,e.visible,e.tentative,e.startMarker,e.endMarker,e.direction,e.tempParentId),[]),d=(0,i.useCallback)(async e=>{if(!t?.state.hierarchicalData)return null;let r=(0,x.nn)(t.state.hierarchicalData),s=r.find(t=>t.texts&&t.texts.some(t=>t===e));return s||(s=r.find(t=>t.texts&&t.texts.some(t=>t.includes(e))))||(s=r.find(t=>t.texts&&t.texts.some(t=>t.toLowerCase().includes(e.toLowerCase()))))?l(s):null},[t,l]),c=(0,i.useMemo)(()=>new b(r,d),[r,d]);return{handleChatMessage:(0,i.useCallback)(async e=>{if(n)throw Error("処理中です。しばらくお待ちください。");a(!0);try{if(!t)throw Error("アクティブなタブがありません。");let r=t.state.hierarchicalData?(0,x.WN)(t.state.hierarchicalData):[],i=null;if(0===r.length){let e=t.state.hierarchicalData?(0,x.Xd)(t.state.hierarchicalData):{},r=Object.keys(e)[0],s=e[r];i=s?l(s):null}else i=l(r[0]);let n=t.state.hierarchicalData?(0,g.Je)(t.state.hierarchicalData):"階層構造データがありません",a=await o.generateChatOperations(e,i,n);return await c.executeOperations(a,t,s)}catch(t){let e=t instanceof Error?t.message:"不明なエラーが発生しました";throw(0,u.c)("[ChatAssistant] エラー詳細:",{message:e,error:t,timestamp:new Date().toISOString()}),Error(o.createFriendlyErrorMessage(t instanceof Error?t:Error(e)))}finally{a(!1)}},[t,n,o,c,s,l]),isLoading:n}}({currentTab:e,dispatch:t,getLatestState:r}),[o,l]=i.useState(!1),[d,c]=i.useState(""),h=i.useCallback(()=>{l(e=>!e)},[]),E=i.useCallback(()=>{c("")},[]);return i.useEffect(()=>{let e=e=>{let t=e.detail.message;l(!0),c(t)};return window.addEventListener("aiAssistantMessage",e),()=>{window.removeEventListener("aiAssistantMessage",e)}},[]),(0,s.jsx)(p,{onSendMessage:n,isLoading:a,isVisible:o,onToggle:h,externalMessage:d,onExternalMessageProcessed:E})}},6948:(e,t,r)=>{Promise.resolve().then(r.bind(r,395)),Promise.resolve().then(r.bind(r,5601)),Promise.resolve().then(r.t.bind(r,7107,23))},7107:()=>{}},e=>{e.O(0,[578,659,169,783,441,964,358],()=>e(e.s=6948)),_N_E=e.O()}]);