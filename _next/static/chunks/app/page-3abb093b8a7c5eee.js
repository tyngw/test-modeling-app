(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[974],{1469:(e,t,i)=>{Promise.resolve().then(i.bind(i,9594))},9594:(e,t,i)=>{"use strict";i.d(t,{default:()=>ej});var n=i(5155);let l={dropChildElement:"子要素にドロップすることはできません",noSelect:"要素を選択してから実行してください",dragError:"ドラッグ操作中にエラーが発生しました",aiError:"AI処理に失敗しました",noApiKey:"APIキーが設定されていません",noPrompt:"入力情報(プロンプト)が設定されていません",clipboardEmpty:"クリップボードにテキストがありません",clipboardReadError:"クリップボードの読み取りに失敗しました"};var r=i(2115);let o=(0,r.createContext)(void 0),a=e=>{let{children:t,state:i,dispatch:l}=e,a=(0,r.useMemo)(()=>({state:i,dispatch:l}),[i,l]);return(0,n.jsx)(o.Provider,{value:a,children:t})},s=()=>{let e=(0,r.useContext)(o);if(!e)throw Error("useCanvas must be used within a CanvasProvider");return e};var d=i(6924),c=i(3346),h=i(8265),u=i(2226);let x=(0,r.memo)(e=>{let{x:t,y:i,width:l,height:o,text:a,zoomRatio:s,fontFamily:x,onHeightChange:p}=e,[m,E]=(0,r.useState)({width:0,height:0}),[g,f]=(0,r.useState)(!1),[v,y]=(0,r.useState)(d._K),j=(0,r.useRef)(null),b=(0,r.useRef)({width:0,height:0}),w=(0,r.useRef)(a);return((0,r.useRef)(p).current=p,(0,r.useEffect)(()=>{y((0,u.vG)())},[]),(0,r.useEffect)(()=>{let e;return f(!0),g&&(a!==w.current||l!==b.current.width||o!==b.current.height)&&(e=requestAnimationFrame(()=>{if(!j.current)return;let e=Math.min(d.SK.WIDTH.MAX,l);(0,h.c)(`[updateDimensions] text: ${a}  size: ${e} x ${o}`);let t=(0,c.C1)(a||"",e,s),i=d.gI*d.RZ*s,n=Math.max(d.SK.SECTION_HEIGHT*s,(i+d.rF.VERTICAL)*s),r=Math.max(t.length*i,n)+d.rF.VERTICAL*s,u=Math.abs(e-b.current.width)>1,x=Math.abs(r-b.current.height)>1;(u||x)&&(E({width:e,height:r}),b.current={width:e,height:r})}),w.current=a),()=>{e&&cancelAnimationFrame(e)}},[a,l,o,s,g]),g)?(0,n.jsx)("foreignObject",{x:t,y:i,width:m.width,height:Math.round(m.height/s),pointerEvents:"none",children:(0,n.jsx)("div",{ref:j,style:{fontFamily:x||d.zs,color:v,fontSize:`${d.gI}px`,lineHeight:d.RZ,width:`${m.width-d.rF.HORIZONTAL}px`,minHeight:`${d.SK.SECTION_HEIGHT}px`,padding:`${.5*d.rF.VERTICAL}px ${.5*d.rF.HORIZONTAL}px`,overflow:"hidden",whiteSpace:"pre-wrap",wordBreak:"break-word",boxSizing:"content-box"},children:a})}):null});var p=i(6670),m=i(840),E=i(9605),g=i(6624);let f=(e,t,i)=>((e,t)=>{if(!e.tentative)return!1;let i=Math.min(...t.filter(t=>t.parentId===e.parentId&&t.tentative).map(e=>e.order));return e.order===i})(e,i)?(0,n.jsxs)("g",{transform:`translate(${e.x+1.1*e.width},${e.y})`,onClick:e=>e.stopPropagation(),style:{cursor:"pointer",pointerEvents:"all"},children:[(0,n.jsxs)("g",{children:[(0,n.jsx)("rect",{x:"0",y:"0",width:"24",height:"24",rx:"4",fill:"white",stroke:"#e0e0e0",strokeWidth:"1"}),(0,n.jsx)("foreignObject",{x:"4",y:"4",width:"16",height:"16",children:(0,n.jsx)(m.A,{sx:{color:"#4CAF50","&:hover":{color:"#388E3C"},transition:"color 0.2s ease-in-out"},style:{width:"100%",height:"100%"},onClick:()=>t({type:"CONFIRM_TENTATIVE_ELEMENTS",payload:e.parentId})})})]}),(0,n.jsxs)("g",{transform:"translate(30, 0)",children:[(0,n.jsx)("rect",{x:"0",y:"0",width:"24",height:"24",rx:"4",fill:"white",stroke:"#e0e0e0",strokeWidth:"1"}),(0,n.jsx)("foreignObject",{x:"4",y:"4",width:"16",height:"16",children:(0,n.jsx)(E.A,{sx:{color:"#F44336","&:hover":{color:"#D32F2F"},transition:"color 0.2s ease-in-out"},style:{width:"100%",height:"100%"},onClick:()=>t({type:"CANCEL_TENTATIVE_ELEMENTS",payload:e.parentId})})})]})]}):null,v=e=>{let{element:t,isHovered:i}=e;return h.y&&i?(0,n.jsx)("foreignObject",{x:t.x+t.width+10,y:t.y-10,width:"340",height:"200",className:"debug-info",children:(0,n.jsxs)("div",{style:{fontSize:"12px",color:"black",backgroundColor:"white",border:"1px solid black",padding:"5px",borderRadius:"5px",boxShadow:"0 2px 10px rgba(0, 0, 0, 0.2)"},children:[(0,n.jsxs)("div",{children:["id: ",t.id]}),(0,n.jsxs)("div",{children:["parentID: ",t.parentId]}),(0,n.jsxs)("div",{children:["order: ",t.order]}),(0,n.jsxs)("div",{children:["depth: ",t.depth]}),(0,n.jsxs)("div",{children:["children: ",t.children]}),(0,n.jsxs)("div",{children:["arrow: ",t.connectionPathType]}),(0,n.jsxs)("div",{children:["editing: ",t.editing?"true":"false"]}),(0,n.jsxs)("div",{children:["selected: ",t.selected?"true":"false"]}),(0,n.jsxs)("div",{children:["visible: ",t.visible?"true":"false"]}),(0,n.jsxs)("div",{children:["x: ",t.x]}),(0,n.jsxs)("div",{children:["y: ",t.y]}),(0,n.jsxs)("div",{children:["width: ",t.width]}),(0,n.jsxs)("div",{children:["height: ",t.width]})]})}):null},y=r.memo(e=>{let{element:t,currentDropTarget:i,dropPosition:l,draggingElement:o,handleMouseDown:a,onHoverChange:m}=e,{state:E,dispatch:v}=s(),[y,j]=(0,r.useState)(!1);E.elements[t.parentId];let b=i?.id||-1,[w,C]=(0,r.useState)(!1),A=(0,r.useRef)(!1),[T,S]=(0,r.useState)(d.iC.NORMAL.COLOR),[k,I]=(0,r.useState)(d.iC.NORMAL.STROKE_COLOR),[O,N]=(0,r.useState)(d.iC.STROKE_WIDTH),[D,R]=(0,r.useState)("");(0,r.useEffect)(()=>{j(!0),S((0,u.kN)()),I((0,u._1)()),N((0,u.xo)()),R((0,u.af)())},[]),(0,r.useEffect)(()=>{if(t.editing||!y)return;let{newWidth:e,newHeight:i,sectionHeights:n}=(()=>{let e=(0,c.PC)(t.texts,d.rF.HORIZONTAL),i=t.texts.map(t=>{let i=(0,c.C1)(t||"",e,E.zoomRatio).length;return Math.max(d.SK.SECTION_HEIGHT*E.zoomRatio,i*d.gI*d.RZ+d.rF.VERTICAL*E.zoomRatio)});return{newWidth:e,newHeight:i.reduce((e,t)=>e+t,0),sectionHeights:i}})();t.editing||e===t.width&&i===t.height||v({type:"UPDATE_ELEMENT_SIZE",payload:{id:t.id,width:e,height:i,sectionHeights:n}})},[t.editing,t.texts,t.width,t.height,v,t.id,E.zoomRatio]);let H=(0,r.useMemo)(()=>Object.values(E.elements).filter(e=>e.parentId===t.id&&!e.visible),[E.elements,t.id]),L=!!o&&(o.id===t.id||(0,g.K9)(E.elements,o.id,t.id)),M=(0,r.useCallback)((e,i)=>{let n=t.sectionHeights[e];if(null!==n&&Math.abs(i-n)>1){let n=[...t.sectionHeights];n[e]=i;let l=(0,c.PC)(t.texts,d.rF.HORIZONTAL),r=n.reduce((e,t)=>e+t,0);(0,h.c)(`[IdeaElement][handleHeightChange] resized: ${t.texts} ${t.width} x ${t.height} -> ${l} x ${r}`),v({type:"UPDATE_ELEMENT_SIZE",payload:{id:t.id,width:l,height:r,sectionHeights:n}})}},[v,t]),_=(0,r.useCallback)(()=>{C(!0),m&&!A.current&&(m(t.id,!0),A.current=!0)},[t.id,m]),W=(0,r.useCallback)(()=>{C(!1),m&&A.current&&(m(t.id,!1),A.current=!1)},[t.id,m]);return((0,r.useEffect)(()=>()=>{m&&A.current&&m(t.id,!1)},[t.id,m]),y)?(0,n.jsx)(r.Fragment,{children:(0,n.jsxs)("g",{opacity:L?.3:1,children:[f(t,v,Object.values(E.elements)),H.length>0&&(0,n.jsxs)(n.Fragment,{children:[t.texts.length>1?(0,n.jsx)("rect",{x:t.x+d.N,y:t.y+d.N,width:t.width,height:t.height,rx:d.iC.RX,fill:"none",stroke:d.iC.SHADDOW.COLOR,strokeWidth:O},`shadow-${t.id}`):(0,n.jsx)("line",{x1:t.x+d.N,y1:t.y+t.height+d.N,x2:t.x+t.width+d.N,y2:t.y+t.height+d.N,stroke:d.iC.SHADDOW.COLOR,strokeWidth:O},`shadow-line-${t.id}`),(0,n.jsxs)("g",{transform:`translate(${t.x+1.1*t.width},${t.y})`,onClick:e=>{e.stopPropagation(),v({type:"SELECT_ELEMENT",payload:{id:t.id,ctrlKey:!1,shiftKey:!1}}),v({type:"EXPAND_ELEMENT"})},style:{cursor:"pointer"},children:[(0,n.jsx)("rect",{x:"0",y:"0",width:"24",height:"24",rx:"4",fill:"white",stroke:"#e0e0e0",strokeWidth:"1"}),(0,n.jsx)("svg",{x:"4",y:"4",width:"16",height:"16",viewBox:"0 0 24 24",children:(0,n.jsx)(p.A,{sx:{color:"#666666"},style:{width:"100%",height:"100%"}})})]})]}),(0,n.jsx)("defs",{children:(0,n.jsx)("filter",{id:"boxShadow",x:"-20%",y:"-20%",width:"140%",height:"140%",children:(0,n.jsx)("feDropShadow",{dx:"2",dy:"2",stdDeviation:"3",floodColor:"gray"})})}),(0,n.jsx)("rect",{x:t.x,y:t.y,width:t.width,height:t.height,rx:d.iC.RX,strokeWidth:O,stroke:t.texts.length>1?t.selected?d.iC.SELECTED.STROKE_COLOR:t.tentative?"#9E9E9E":k:"transparent",strokeDasharray:t.tentative?"4 2":"none",onClick:e=>{e.stopPropagation(),v({type:"SELECT_ELEMENT",payload:{id:t.id,ctrlKey:e.ctrlKey||e.metaKey,shiftKey:e.shiftKey}})},onDoubleClick:()=>v({type:"EDIT_ELEMENT"}),onMouseDown:e=>a(e,t),onMouseEnter:_,onMouseLeave:W,style:{fill:t.id===b&&"child"===l?d.iC.DRAGGING.COLOR:T,strokeOpacity:t.tentative?.6:1,pointerEvents:"all",cursor:w?"pointer":"default",filter:t.selected&&t.texts.length>1?"url(#boxShadow)":"none"}}),1===t.texts.length&&y&&(0,n.jsxs)(n.Fragment,{children:[t.selected&&(0,n.jsx)("line",{x1:t.x+2,y1:t.y+t.height+2,x2:t.x+t.width+1,y2:t.y+t.height+2,stroke:"rgba(0,0,255,0.2)",strokeWidth:O,strokeLinecap:"round",pointerEvents:"none"}),(0,n.jsx)("line",{x1:t.x,y1:t.y+t.height,x2:t.x+t.width,y2:t.y+t.height,stroke:t.selected?d.iC.SELECTED.STROKE_COLOR:t.tentative?"#9E9E9E":k,strokeWidth:O,strokeDasharray:t.tentative?"4 2":"none",pointerEvents:"none"})]}),i?.id===t.id&&o&&"child"!==l&&(0,n.jsx)("rect",{className:"drop-preview",x:t.x,y:"before"===l?t.y-.5*o.height-d.e$.Y:t.y+.5*t.height+d.e$.Y,width:o.width,height:o.height,fill:d.iC.DRAGGING.COLOR,rx:d.iC.RX,stroke:d.iC.DRAGGING.COLOR,strokeWidth:O,style:{pointerEvents:"none"}}),t.texts.map((e,i)=>(0,n.jsxs)(r.Fragment,{children:[!t.editing&&(0,n.jsx)(x,{x:t.x,y:t.y+t.sectionHeights.slice(0,i).reduce((e,t)=>e+t,0),width:t.width,height:t.sectionHeights[i],text:e,fontSize:d.gI,zoomRatio:E.zoomRatio,fontFamily:D,onHeightChange:e=>M(i,e)}),i<t.texts.length-1&&(0,n.jsx)("line",{x1:t.x,y1:t.y+t.sectionHeights.slice(0,i+1).reduce((e,t)=>e+t,0),x2:t.x+t.width,y2:t.y+t.sectionHeights.slice(0,i+1).reduce((e,t)=>e+t,0),stroke:k,strokeWidth:"1"})]},`${t.id}-section-${i}`))]})},t.id):null}),j=r.memo(e=>{let{element:t,onEndEditing:i}=e,{dispatch:l,state:o}=s(),a=(0,r.useRef)([]),[h,x]=(0,r.useState)([]),[p,m]=(0,r.useState)(-1),E=(0,r.useRef)(null),g=(0,r.useRef)(void 0),[f,v]=(0,r.useState)(""),[y,j]=(0,r.useState)(""),[b,w]=(0,r.useState)("");(0,r.useEffect)(()=>{E.current=document.createElement("canvas").getContext("2d"),v((0,u.af)()),j((0,u.kN)()),w((0,u.vG)())},[]),(0,r.useEffect)(()=>{t?.id!==g.current&&(x(t?.sectionHeights||[]),m(0),g.current=t?.id,setTimeout(()=>a.current[0]?.focus({preventScroll:!0}),50))},[t]);let C=(0,r.useCallback)(e=>{let t=d.SK.WIDTH.MAX,i=(0,c.C1)(e,t,o.zoomRatio).length,n=d.gI*d.RZ*o.zoomRatio,l=d.rF.VERTICAL*o.zoomRatio;return Math.max(d.SK.SECTION_HEIGHT*o.zoomRatio,i*n+l)},[o.zoomRatio]),A=(0,r.useCallback)((e,i)=>{let n=e.target.value,r=C(n);x(e=>{let t=[...e];return t[i]=r/o.zoomRatio,t}),l({type:"UPDATE_TEXT",payload:{id:t.id,index:i,value:n}});let s=a.current[i];s&&(s.style.height=`${r}px`)},[t,o.zoomRatio,l,C]),T=(0,r.useCallback)(e=>{let n=e+1;if(t&&n<t.texts.length){let e=a.current[n];if(e){let{scrollX:t,scrollY:i}=window;e.focus({preventScroll:!0}),m(n),window.scrollTo(t,i)}}else i?.(),l({type:"END_EDITING"})},[t,i,l]),S=(e,t)=>{"Tab"===e.key&&(e.preventDefault(),T(t)),"Escape"===e.key&&(e.preventDefault(),i?.(),l({type:"END_EDITING"}))};return t?(0,n.jsx)(n.Fragment,{children:t.texts.map((e,i)=>{let l=h.slice(0,i).reduce((e,t)=>e+t,0)*o.zoomRatio,r=d.SK.WIDTH.MAX*o.zoomRatio,s=C(e);return(0,n.jsx)("textarea",{ref:e=>{a.current[i]=e,i===p&&e?.focus({preventScroll:!0})},value:e,onChange:e=>A(e,i),onKeyDown:e=>S(e,i),onClick:e=>e.stopPropagation(),style:{position:"absolute",left:`${t.x*o.zoomRatio}px`,top:`${t.y*o.zoomRatio+l}px`,width:`${r}px`,height:`${s}px`,minWidth:`${d.SK.WIDTH.MAX*o.zoomRatio}px`,maxWidth:`${d.SK.WIDTH.MAX*o.zoomRatio}px`,minHeight:`${d.SK.SECTION_HEIGHT*o.zoomRatio}px`,margin:"1px 1px",fontSize:`${d.gI*o.zoomRatio}px`,lineHeight:`${d.RZ}em`,padding:"0 3px",fontFamily:f,backgroundColor:y,color:b,boxSizing:"border-box",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale",overflow:"hidden",whiteSpace:"pre-wrap",wordWrap:"break-word",resize:"none",zIndex:1e4,opacity:1,transition:"all 0.2s ease-in-out",pointerEvents:"all"},autoFocus:0===i},`${t.id}-${i}`)})}):null}),b=e=>{let t=Object.values(e),i=Math.max(...t.map(e=>e.x+e.width)),n=Math.max(...t.map(e=>e.y+e.height));return{width:i+d.e$.X,height:n+d.SK.SECTION_HEIGHT*d.zX}},w=e=>{let{setCanvasSize:t,setDisplayArea:i,state:n}=e;(0,r.useEffect)(()=>{let e=b(n.elements),l=window.innerHeight-2*d.JY;e.width=Math.max(e.width,window.innerWidth),e.height=Math.max(e.height,l);let r={width:e.width,height:e.height};e.width*=n.zoomRatio,e.height*=n.zoomRatio,t(e),i(`0 0 ${r.width} ${r.height}`)},[n.elements,n.zoomRatio,t,i])},C={"Ctrl+z":"UNDO","Ctrl+Shift+z":"REDO",ArrowUp:"ARROW_UP",ArrowDown:"ARROW_DOWN",ArrowRight:"ARROW_RIGHT","Ctrl+ArrowRight":"EXPAND_ELEMENT",ArrowLeft:"ARROW_LEFT","Ctrl+ArrowLeft":"COLLAPSE_ELEMENT","Ctrl+x":"CUT_ELEMENT","Ctrl+c":"COPY_ELEMENT","Ctrl+v":"PASTE_ELEMENT",Tab:"ADD_ELEMENT","Shift+Tab":"ADD_SIBLING_ELEMENT",Delete:"DELETE_ELEMENT",Backspace:"DELETE_ELEMENT",Enter:"EDIT_ELEMENT"},A=(e,t)=>{let{dispatch:i}=s();(0,r.useEffect)(()=>{let n=e.current,l=e=>{e.target instanceof SVGElement&&"svg"===e.target.tagName&&(i({type:"DESELECT_ALL"}),t&&i({type:"END_EDITING"}))};return n?.addEventListener("mousedown",l),()=>{n?.removeEventListener("mousedown",l)}},[e,t,i])};var T=i(3147);let S=e=>"touches"in e,k=()=>{let{state:e,dispatch:t}=s(),{addToast:i}=(0,T.d)(),[n,o]=(0,r.useState)(null),[a,c]=(0,r.useState)({x:0,y:0}),[h,u]=(0,r.useState)({x:0,y:0}),[x,p]=(0,r.useState)(null),m=(0,r.useRef)(new Map),E=(0,r.useCallback)(t=>{let i,n;return S(t)?(i=t.touches[0].clientX+window.scrollX,n=t.touches[0].clientY+window.scrollY):(i=t.clientX+window.scrollX,n=t.clientY+window.scrollY),{x:i/e.zoomRatio,y:(n-d.uF)/e.zoomRatio}},[e.zoomRatio]),f=(0,r.useCallback)((t,i)=>{let n;if(!i.parentId)return;t.stopPropagation(),t.nativeEvent instanceof TouchEvent&&t.preventDefault();let l=E(t.nativeEvent);o(i),c({x:l.x-i.x,y:l.y-i.y}),u({x:i.x,y:i.y}),m.current.clear(),Object.values(e.elements).filter(e=>e.selected).forEach(e=>{m.current.set(e.id,{x:e.x,y:e.y})})},[E,e.elements]),v=()=>{Object.values(e.elements).filter(e=>e.selected).forEach(e=>{let i=m.current.get(e.id);i&&t({type:"MOVE_ELEMENT",payload:{id:e.id,x:i.x,y:i.y}})}),o(null),m.current.clear()},y=(0,r.useCallback)(async()=>{if(n)try{let n=Object.values(e.elements).filter(e=>e.selected),r=(t,i)=>!(i&&(0,g.K9)(e.elements,t.id,i));if(x){let{element:o,position:a}=x;if(n.some(t=>(0,g.K9)(e.elements,t.id,o.id))){v(),i(l.dropChildElement,"warn");return}let s=!1;if(!("child"===a?(e=>n.some(t=>!r(t,e.id))?(i(l.dropChildElement,"warn"),v(),!1):(t({type:"SNAPSHOT"}),n.forEach(i=>{let l=e.depth+1;t({type:"DROP_ELEMENT",payload:{id:i.id,oldParentId:i.parentId,newParentId:e.id,newOrder:e.children+n.indexOf(i),depth:l}})}),!0))(o):((e,o)=>{let a="before"===o?e.order:e.order+1,s=e.parentId;return n.some(e=>!r(e,s))?(i(l.dropChildElement,"warn"),v(),!1):(t({type:"SNAPSHOT"}),n.forEach((i,n)=>{t({type:"DROP_ELEMENT",payload:{id:i.id,oldParentId:i.parentId,newParentId:s,newOrder:a+n,depth:e.depth}})}),!0)})(o,a))){v();return}}else v()}catch(e){console.error("Drag error:",e),i(l.dragError,"warn"),v()}finally{o(null),p(null),m.current.clear()}},[n,x,e.elements,t,i]);return(0,r.useEffect)(()=>{if(!n)return;let i=t=>{let i=E(t),o=i.x,a=i.y,s=Object.values(e.elements).filter(e=>e.visible&&e.id!==n?.id&&l(e,o)),d=null,c=1/0;for(let e of s){let{position:t,distanceSq:i}=r(e,o,a);i<c&&(c=i,d={element:e,position:t})}return d},l=(e,t)=>t>e.x&&t<e.x+e.width,r=(e,t,i)=>{let n=e.y,l=e.y+e.height,r=.1*e.height,o="child";i<n+r?o="before":i>l-r&&(o="after");let a=e.x+e.width/2,s=n+e.height/2,d=t-a,c=i-s;return{position:o,distanceSq:d*d+c*c}},o=e=>{e instanceof TouchEvent&&1===e.touches.length&&e.preventDefault(),p(i(e));let l=E(e),r={x:l.x-a.x,y:l.y-a.y};t({type:"MOVE_ELEMENT",payload:{id:n.id,...r}})},s=e=>o(e),d=e=>{1===e.touches.length&&o(e)},c=()=>y(),h=()=>y();return document.addEventListener("mousemove",s),document.addEventListener("touchmove",d,{passive:!1}),document.addEventListener("mouseup",c),document.addEventListener("touchend",h),()=>{document.removeEventListener("mousemove",s),document.removeEventListener("touchmove",d),document.removeEventListener("mouseup",c),document.removeEventListener("touchend",h)}},[n,a,e.elements,E,t,y]),{handleMouseDown:f,handleMouseUp:y,currentDropTarget:x?.element||null,dropPosition:x?.position||null,draggingElement:n}},I=r.memo(e=>{let{isHelpOpen:t,toggleHelp:i}=e,o=(0,r.useRef)(null),[a,c]=(0,r.useState)(!1),{state:h,dispatch:x}=s(),{elements:p,zoomRatio:m}=h,E=(0,u.ZF)(),f=(0,u.S4)(),b=(0,u.Es)(),{addToast:S}=(0,T.d)(),[I,O]=(0,r.useState)({width:0,height:0}),[N,D]=(0,r.useState)("0 0 0 0"),[R,H]=(0,r.useState)(!1),[L,M]=(0,r.useState)(0),[_,W]=(0,r.useState)({x:0,y:0}),$=Object.values(p).find(e=>e.editing),[P,G]=(0,r.useState)(null),[X,z]=(0,r.useState)(null),[F,K]=(0,r.useState)({});(0,r.useEffect)(()=>{$||o.current?.focus()},[$]),(0,r.useEffect)(()=>{c(!0),O({width:window.innerWidth,height:window.innerHeight}),D(`0 0 ${window.innerWidth} ${window.innerHeight-d.JY}`)},[]),(0,r.useEffect)(()=>{O({width:window.innerWidth,height:window.innerHeight}),D(`0 0 ${window.innerWidth} ${window.innerHeight-d.JY}`)},[]),w({setCanvasSize:O,setDisplayArea:D,state:h}),A(o,!!$);let{handleMouseDown:Y,handleMouseUp:U,currentDropTarget:Z,dropPosition:V,draggingElement:B}=k(),J=(0,r.useCallback)(async e=>{e.preventDefault();let t=C[`${e.ctrlKey||e.metaKey?"Ctrl+":""}${e.shiftKey?"Shift+":""}${e.key}`];if("PASTE_ELEMENT"===t){if(h.cutElements&&Object.keys(h.cutElements).length>0)x({type:t});else try{let e=await navigator.clipboard.readText(),t=Object.values(h.elements).find(e=>e.selected);if(!t){S(l.noSelect);return}if(e){let i=e.split("\n").filter(e=>""!==e.trim());if(0===i.length){S(l.clipboardEmpty);return}x({type:"ADD_ELEMENTS_SILENT",payload:{parentId:t.id,texts:i}})}else S(l.clipboardEmpty)}catch(e){console.error("クリップボード読み取りエラー:",e),S(l.clipboardReadError)}}else t&&x({type:t})},[x,h.cutElements,h.elements,S]),q=(0,r.useCallback)(e=>{if(2===e.touches.length){H(!0);let t=e.touches[0],i=e.touches[1];M(Math.hypot(i.clientX-t.clientX,i.clientY-t.clientY)),W({x:window.scrollX,y:window.scrollY})}else if(1===e.touches.length){e.preventDefault();let t=e.touches[0],i=document.elementFromPoint(t.clientX,t.clientY);if(i instanceof SVGRectElement){let e=new MouseEvent("mousedown",{clientX:t.clientX,clientY:t.clientY,bubbles:!0});i.dispatchEvent(e)}}},[]),Q=(0,r.useCallback)(e=>{if(R&&2===e.touches.length){e.preventDefault();let t=e.touches[0],i=e.touches[1],n=Math.hypot(i.clientX-t.clientX,i.clientY-t.clientY),l=t.clientX-i.clientX,r=Math.atan2(t.clientY-i.clientY,l),o=n/L,a=(t.clientX+i.clientX)/2,s=(t.clientY+i.clientY)/2;window.scrollTo({left:_.x+a*(o-1)*Math.cos(r),top:_.y+s*(o-1)*Math.sin(r),behavior:"auto"})}else 1===e.touches.length&&e.preventDefault()},[R,L,_]),ee=(0,r.useCallback)(()=>{H(!1),M(0),W({x:0,y:0})},[]),et=function(e,t){let i,l=arguments.length>2&&void 0!==arguments[2]?arguments[2]:d.lB.COLOR,r=arguments.length>3&&void 0!==arguments[3]?arguments[3]:d.lB.STROKE;if(!e)return null;let o=0;switch(e.connectionPathType){case d.vX.ARROW:case d.vX.CIRCLE:case d.vX.SQUARE:case d.vX.DIAMOND:o=d.tl.OFFSET;break;default:o=0}let a=t.height,s=`M ${e.x+e.width+o},${e.y+e.height/2} C ${e.x+e.width+d.mO},${e.y+e.height/2} ${t.x-d.mO},${t.y+a/2} ${t.x},${t.y+a/2}`;return e.connectionPathType===d.vX.ARROW?i="url(#arrowhead)":e.connectionPathType===d.vX.CIRCLE?i="url(#circlemarker)":e.connectionPathType===d.vX.SQUARE?i="url(#squaremarker)":e.connectionPathType===d.vX.DIAMOND&&(i="url(#diamondmarker)"),(0,n.jsxs)("g",{children:[(0,n.jsx)("circle",{cx:t.x+t.width+10,cy:t.y+a/2,r:10,fill:"transparent",style:{zIndex:0,opacity:0},onMouseEnter:()=>G(t.id),onMouseLeave:()=>G(null),onClick:()=>z(t.id)}),(P===t.id||X===t.id)&&(0,n.jsx)("circle",{cx:t.x+t.width+10,cy:t.y+a/2,r:10,fill:"#bfbfbf"}),(0,n.jsx)("path",{d:s,stroke:l,strokeWidth:r,fill:"none",markerStart:i},`connection-${t.id}-${t.parentId}`)]},`connection-${t.id}-${t.parentId}`)};(0,r.useEffect)(()=>{let e=e=>{X&&!e.target.closest(".popup-menu")&&z(null)};return document.addEventListener("mousedown",e),()=>{document.removeEventListener("mousedown",e)}},[X]);let ei=(0,r.useCallback)((e,t)=>{K(i=>{if(i[e]===t)return i;let n={...i};return t?n[e]=!0:delete n[e],n})},[]);return(0,n.jsx)(n.Fragment,{children:(0,n.jsxs)("div",{style:{position:"absolute",top:d.uF,left:0,overflow:"auto",touchAction:R?"none":"manipulation",backgroundColor:b},children:[a&&(0,n.jsxs)("svg",{"data-testid":"view-area",ref:o,width:I.width,height:I.height,viewBox:N,tabIndex:0,onKeyDown:J,onTouchStart:q,onTouchMove:Q,onTouchEnd:ee,style:{outline:"none",touchAction:R?"none":"manipulation",userSelect:"none",WebkitUserSelect:"none",backgroundColor:b},className:"svg-element",children:[(0,n.jsxs)("defs",{children:[(0,n.jsx)("marker",{id:"arrowhead",markerWidth:d.tl.WIDTH,markerHeight:d.tl.HEIGHT,refX:d.tl.WIDTH,refY:d.tl.HEIGHT/2,orient:"auto",fill:"none",stroke:E,children:(0,n.jsx)("polygon",{points:`${d.tl.WIDTH} 0, ${d.tl.WIDTH} ${d.tl.HEIGHT}, 0 ${d.tl.HEIGHT/2}`,fill:"none",stroke:E})}),(0,n.jsx)("marker",{id:"circlemarker",markerWidth:d.tl.WIDTH,markerHeight:d.tl.HEIGHT,refX:d.tl.WIDTH,refY:d.tl.HEIGHT/2,orient:"auto",children:(0,n.jsx)("circle",{cx:d.tl.WIDTH/2,cy:d.tl.HEIGHT/2,r:d.tl.WIDTH/2-1,fill:"none",stroke:E,strokeWidth:"1"})}),(0,n.jsx)("marker",{id:"squaremarker",markerWidth:d.tl.WIDTH,markerHeight:d.tl.HEIGHT,refX:d.tl.WIDTH,refY:d.tl.HEIGHT/2,orient:"auto",children:(0,n.jsx)("rect",{x:"1",y:"1",width:d.tl.WIDTH-2,height:d.tl.HEIGHT-2,fill:"none",stroke:E,strokeWidth:"1"})}),(0,n.jsx)("marker",{id:"diamondmarker",markerWidth:d.tl.WIDTH,markerHeight:d.tl.HEIGHT,refX:d.tl.WIDTH,refY:d.tl.HEIGHT/2,orient:"auto",children:(0,n.jsx)("polygon",{points:`${d.tl.WIDTH/2},1 ${d.tl.WIDTH-1},${d.tl.HEIGHT/2} ${d.tl.WIDTH/2},${d.tl.HEIGHT-1} 1,${d.tl.HEIGHT/2}`,fill:"none",stroke:E,strokeWidth:"1"})})]}),Object.values(p).filter(e=>e.visible).map(e=>(0,n.jsx)(r.Fragment,{children:(0,n.jsx)(y,{element:e,currentDropTarget:Z,dropPosition:V,draggingElement:B,handleMouseDown:Y,handleMouseUp:U,onHoverChange:ei})},e.id)),Object.values(p).filter(e=>e.visible&&!!e.parentId).map(e=>{let t=h.elements[e.parentId];return B&&(e.id===B.id||(0,g.K9)(h.elements,B.id,e.id))?null:et(t,e,E,f)}),Z&&B&&(()=>{let e="child"===V?Z:Z.parentId?h.elements[Z.parentId]:null,t=h.elements[B.id];return e&&t&&et(e,t,d.lB.DRAGGING_COLOR,d.lB.STROKE)})(),(()=>{if(!X)return null;let e=p[X];if(!e)return null;let t=e.height;return(0,n.jsx)("foreignObject",{x:e.x+e.width+15,y:e.y+t/2-25,width:100,height:160,className:"popup-menu",children:(0,n.jsx)("div",{style:{backgroundColor:"white",border:"2px solid black",borderRadius:"4px",boxShadow:"0 2px 10px rgba(0, 0, 0, 0.2)",padding:"8px"},children:[{id:"arrow",label:"Arrow"},{id:"circle",label:"Circle"},{id:"square",label:"Square"},{id:"diamond",label:"Diamond"},{id:"none",label:"None"}].map(t=>(0,n.jsx)("div",{style:{padding:"4px 0",cursor:"pointer",backgroundColor:P===t.id?"#e0e0e0":"white"},onMouseEnter:()=>G(t.id),onMouseLeave:()=>G(null),onClick:()=>{x({type:"UPDATE_CONNECTION_PATH_TYPE",payload:{id:e.id,connectionPathType:t.id}}),z(null)},children:t.label},t.id))})})})(),Object.keys(F).map(e=>{let t=p[e];return t&&t.visible?(0,n.jsx)(v,{element:t,isHovered:!0},`debug-${e}`):null}).filter(Boolean)]}),(0,n.jsx)(j,{element:$,onEndEditing:()=>{x({type:"END_EDITING"}),o.current?.focus()}})]})})});var O=i(5857),N=i(2554),D=i(7040),R=i(2152),H=i(2397),L=i(5194),M=i(1311),_=i(1496),W=i(6597),$=i(9691),P=i(1081),G=i(8694),X=i(1401),z=i(5833),F=i(5785),K=i(8283),Y=i(514);let U={NEW:"新規作成",OPEN:"ファイルを開く",SAVE:"保存（JSON形式）",SAVE_SVG:"SVG画像で保存",ADD:"新しい要素の追加",DELETE:"要素の削除",AI:"AI機能",EXPAND:"展開",COLLAPSE:"折りたたみ",UNDO:"元に戻す",REDO:"やり直す",ZOOM_IN:"ズームイン",ZOOM_OUT:"ズームアウト",HELP:"ヘルプを表示",SETTINGS:"設定"};var Z=i(1386);let V=e=>{let{saveSvg:t,loadElements:i,saveElements:l,toggleHelp:o,toggleSettings:a,onAIClick:c}=e,{dispatch:h}=s(),{addTab:u}=(0,Z.u)(),x=(0,r.useRef)(null),p=(0,r.useRef)(null),m=e=>()=>{h({type:e})};return(0,n.jsx)("div",{style:{position:"fixed",width:"100%",height:d.JY,overflowX:"auto",WebkitOverflowScrolling:"touch"},ref:p,children:(0,n.jsxs)("div",{style:{display:"flex",justifyContent:"left",alignItems:"center",height:"100%",backgroundColor:"#f1f1f1",padding:"0 20px",minWidth:"max-content"},children:[(0,n.jsx)("input",{type:"file",ref:x,onChange:i,style:{display:"none"}}),(0,n.jsx)(Y.A,{title:U.NEW,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:u,children:(0,n.jsx)($.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(Y.A,{title:U.OPEN,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:()=>{x.current?.click()},children:(0,n.jsx)(L.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(Y.A,{title:U.SAVE,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:l,children:(0,n.jsx)(M.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(Y.A,{title:U.SAVE_SVG,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:t,children:(0,n.jsx)(_.A,{sx:{color:"#666666"}})})}),(0,n.jsx)("div",{style:{width:"10px"}}),(0,n.jsx)(Y.A,{title:U.ADD,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:m("ADD_ELEMENT"),children:(0,n.jsx)(P.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(Y.A,{title:U.DELETE,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:m("DELETE_ELEMENT"),children:(0,n.jsx)(G.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(Y.A,{title:U.AI,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:c,children:(0,n.jsx)(K.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(Y.A,{title:U.EXPAND,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:m("EXPAND_ELEMENT"),children:(0,n.jsx)(z.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(Y.A,{title:U.COLLAPSE,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:m("COLLAPSE_ELEMENT"),children:(0,n.jsx)(X.A,{sx:{color:"#666666"}})})}),(0,n.jsx)("div",{style:{width:"10px"}}),(0,n.jsx)(Y.A,{title:U.UNDO,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:m("UNDO"),children:(0,n.jsx)(N.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(Y.A,{title:U.REDO,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:m("REDO"),children:(0,n.jsx)(D.A,{sx:{color:"#666666"}})})}),(0,n.jsx)("div",{style:{width:"10px"}}),(0,n.jsx)(Y.A,{title:U.ZOOM_IN,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:m("ZOOM_IN"),children:(0,n.jsx)(R.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(Y.A,{title:U.ZOOM_OUT,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:m("ZOOM_OUT"),children:(0,n.jsx)(H.A,{sx:{color:"#666666"}})})}),(0,n.jsx)("div",{style:{width:"10px"}}),(0,n.jsx)(Y.A,{title:U.HELP,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:o,children:(0,n.jsx)(W.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(Y.A,{title:U.SETTINGS,children:(0,n.jsx)(O.A,{variant:"text",className:"iconbar-button",onClick:a,children:(0,n.jsx)(F.A,{sx:{color:"#666666"}})})})]})})},B=r.memo(e=>{let{tab:t,isCurrent:i,closeTab:l,switchTab:o}=e,[a,s]=(0,r.useState)(!1);return((0,r.useEffect)(()=>{s(!0)},[]),a)?(0,n.jsxs)("div",{style:{padding:"8px",marginRight:"4px",backgroundColor:i?"#fff":"#ddd",borderBottom:i?"3px solid #87CEFA":"none",paddingBottom:"3px",borderRadius:"5px 5px 0 0",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center"},onClick:()=>o(t.id),children:[(0,n.jsx)("span",{children:t.name}),(0,n.jsx)("button",{onClick:e=>{e.stopPropagation(),l(t.id)},style:{marginLeft:"8px",border:"0",backgroundColor:"transparent",fontSize:"16px",color:"#666",fontWeight:"bold",cursor:"pointer"},children:"\xd7"})]}):null}),J=r.memo(e=>{let{tabs:t,currentTabId:i,addTab:l,closeTab:r,switchTab:o}=e;return(0,n.jsxs)("div",{style:{display:"flex",alignItems:"center",backgroundColor:"#f0f0f0",width:"100%",height:d.FM,marginTop:d.JY,position:"fixed"},children:[t.map(e=>(0,n.jsx)(B,{tab:e,isCurrent:i===e.id,closeTab:r,switchTab:o},e.id)),(0,n.jsx)("button",{onClick:l,style:{marginLeft:"8px"},children:"+"})]})}),q=e=>{let{isOpen:t,onClose:i,children:l}=e;return t?(0,n.jsx)("div",{style:{position:"fixed",top:0,left:0,width:"100%",height:"100%",backgroundColor:"rgba(0, 0, 0, 0.5)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:1e6},children:(0,n.jsx)("div",{style:{backgroundColor:"#fff",padding:"40px 24px 24px",borderRadius:"10px",width:"80%",maxWidth:"500px",overflow:"hidden",position:"relative",zIndex:1000001},children:(0,n.jsxs)("div",{style:{maxHeight:"80vh",overflow:"auto"},children:[(0,n.jsx)("button",{onClick:i,style:{position:"absolute",right:10,top:10,background:"transparent",border:"none",fontSize:"1.5em"},children:"\xd7"}),(0,n.jsx)("div",{style:{flex:1,overflow:"auto",paddingRight:"8px"},children:l})]})})}):null};var Q=i(5358),ee=i(5055),et=i(460),ei=i(8893),en=i(2582),el=i(3025),er=i(7498),eo=i(9284),ea=i(9868),es=i(7923),ed=i(7298),ec=i(9439),eh=i(4512),eu=i(8410);let ex=e=>{let{isOpen:t,onClose:i}=e,[l,o]=(0,r.useState)(0),[a,s]=(0,r.useState)("3"),[c,h]=(0,r.useState)(""),[x,p]=(0,r.useState)(""),[m,E]=(0,r.useState)(""),[g,f]=(0,r.useState)("gemini-1.5-flash"),[v,y]=(0,r.useState)(""),[j,b]=(0,r.useState)(""),[w,C]=(0,r.useState)(""),[A,T]=(0,r.useState)(""),[S,k]=(0,r.useState)(""),[I,N]=(0,r.useState)(""),[D,R]=(0,r.useState)(""),[H,L]=(0,r.useState)(""),[M,_]=(0,r.useState)(""),[W,$]=(0,r.useState)(!1),[P,G]=(0,r.useState)(!1);(0,r.useEffect)(()=>{(async()=>{t&&(s((0,u.X0)().toString()),h(await (0,u.CG)()),p((0,u.XH)()),E((0,u.k0)()),f((0,u.OA)()),y((0,u.kN)()),b((0,u._1)()),C((0,u.xo)().toString()),T((0,u.af)()),k((0,u.zn)()||d.vX.NONE),N((0,u.ZF)()),R((0,u.S4)().toString()),L((0,u.Es)()),_((0,u.vG)()))})()},[t]);let X=async()=>{let e=Math.max(1,Math.min(10,parseInt(a,10)));(0,u.jE)(e),await (0,u.wt)(c),(0,u.bJ)(x),(0,u.mF)(m),(0,u.Iz)(g),(0,u.qu)(v),(0,u.JT)(j);let t=parseFloat(w);!isNaN(t)&&t>0&&(0,u.Jg)(t),(0,u.Yu)(A),(0,u.li)(S),(0,u.xN)(I);let n=parseFloat(D);!isNaN(n)&&n>0&&(0,u.K2)(n),(0,u.QY)(H),(0,u.vY)(M),i()},z=e=>{f(e.target.value)};return(0,n.jsxs)(q,{isOpen:t,onClose:i,children:[(0,n.jsx)(Q.A,{variant:"h6",gutterBottom:!0,children:"Preference"}),(0,n.jsxs)(ee.A,{value:l,onChange:(e,t)=>o(t),children:[(0,n.jsx)(et.A,{label:"Elements Setting"}),(0,n.jsx)(et.A,{label:"API Setting"}),(0,n.jsx)(et.A,{label:"Prompt"})]}),(0,n.jsxs)(ei.A,{sx:{mt:2,minHeight:300},children:[0===l&&(0,n.jsxs)(ei.A,{children:[(0,n.jsx)(en.A,{label:"Number of sections",type:"number",value:a,onChange:e=>{let t=e.target.value;s(t);let i=parseInt(t,10);$(""===t||isNaN(i)||i<1||i>10)},fullWidth:!0,margin:"normal",inputProps:{min:1,max:10},error:W}),(0,n.jsx)(el.A,{error:W,children:W?"1から10の数値を入力してください":"同時に表示するセクションの数（1〜10）"}),(0,n.jsxs)(er.A,{fullWidth:!0,margin:"normal",children:[(0,n.jsx)(eo.A,{id:"marker-type-label",children:"Default Marker Type"}),(0,n.jsxs)(ea.A,{labelId:"marker-type-label",value:S,label:"Default Marker Type",onChange:e=>k(e.target.value),children:[(0,n.jsx)(es.A,{value:d.vX.NONE,children:"None"}),(0,n.jsx)(es.A,{value:d.vX.ARROW,children:"Arrow"}),(0,n.jsx)(es.A,{value:d.vX.CIRCLE,children:"Circle"}),(0,n.jsx)(es.A,{value:d.vX.SQUARE,children:"Square"}),(0,n.jsx)(es.A,{value:d.vX.DIAMOND,children:"Diamond"})]}),(0,n.jsx)(el.A,{children:"新規要素作成時のデフォルトマーカータイプ"})]}),(0,n.jsx)(en.A,{label:"Font Family",value:A,onChange:e=>T(e.target.value),fullWidth:!0,margin:"normal",helperText:"表示に使用するフォントファミリ"}),(0,n.jsxs)(ei.A,{sx:{display:"flex",alignItems:"center",mt:2,mb:1},children:[(0,n.jsx)(Q.A,{variant:"body1",sx:{mr:2,width:"120px"},children:"Element Color:"}),(0,n.jsx)("input",{type:"color",value:v,onChange:e=>y(e.target.value)})]}),(0,n.jsx)(el.A,{children:"要素の背景色"}),(0,n.jsxs)(ei.A,{sx:{display:"flex",alignItems:"center",mt:2,mb:1},children:[(0,n.jsx)(Q.A,{variant:"body1",sx:{mr:2,width:"120px"},children:"Stroke Color:"}),(0,n.jsx)("input",{type:"color",value:j,onChange:e=>b(e.target.value)})]}),(0,n.jsx)(el.A,{children:"要素の枠線色"}),(0,n.jsx)(en.A,{label:"Stroke Width",type:"number",value:w,onChange:e=>{let t=e.target.value;C(t);let i=parseFloat(t);G(""===t||isNaN(i)||i<=0)},fullWidth:!0,margin:"normal",inputProps:{min:.5,step:.5},error:P,helperText:P?"正の数値を入力してください":"要素の枠線の太さ"}),(0,n.jsxs)(ei.A,{sx:{display:"flex",alignItems:"center",mt:2,mb:1},children:[(0,n.jsx)(Q.A,{variant:"body1",sx:{mr:2,width:"120px"},children:"Connection Path Color:"}),(0,n.jsx)("input",{type:"color",value:I,onChange:e=>N(e.target.value)})]}),(0,n.jsx)(el.A,{children:"接続線の色"}),(0,n.jsx)(en.A,{label:"Connection Path Stroke",type:"number",value:D,onChange:e=>R(e.target.value),fullWidth:!0,margin:"normal",inputProps:{min:.5,step:.5},helperText:"接続線の太さ"}),(0,n.jsxs)(ei.A,{sx:{display:"flex",alignItems:"center",mt:2,mb:1},children:[(0,n.jsx)(Q.A,{variant:"body1",sx:{mr:2,width:"120px"},children:"Canvas Background Color:"}),(0,n.jsx)("input",{type:"color",value:H,onChange:e=>L(e.target.value)})]}),(0,n.jsx)(el.A,{children:"キャンバスの背景色"}),(0,n.jsxs)(ei.A,{sx:{display:"flex",alignItems:"center",mt:2,mb:1},children:[(0,n.jsx)(Q.A,{variant:"body1",sx:{mr:2,width:"120px"},children:"Text Color:"}),(0,n.jsx)("input",{type:"color",value:M,onChange:e=>_(e.target.value)})]}),(0,n.jsx)(el.A,{children:"テキストの色"})]}),1===l&&(0,n.jsxs)(ei.A,{children:[(0,n.jsxs)(er.A,{component:"fieldset",fullWidth:!0,children:[(0,n.jsx)(ed.A,{component:"legend",children:"Select Model"}),(0,n.jsxs)(ec.A,{children:[(0,n.jsx)(eh.A,{value:"gemini-1.5-flash",control:(0,n.jsx)(eu.A,{checked:"gemini-1.5-flash"===g,onChange:z}),label:"Gemini-1.5-flash"}),(0,n.jsx)(eh.A,{value:"gemini-2.0-flash",control:(0,n.jsx)(eu.A,{checked:"gemini-2.0-flash"===g,onChange:z}),label:"Gemini-2.0-flash"})]})]}),(0,n.jsx)(en.A,{label:"Gemini API Key",type:"password",value:c,onChange:e=>h(e.target.value),fullWidth:!0,margin:"normal",helperText:"入力されたキーは暗号化してlocalStorageに保存されます。サーバに送信されることはありません。"})]}),2===l&&(0,n.jsxs)(ei.A,{children:[(0,n.jsx)(en.A,{label:"inputText",value:x,onChange:e=>p(e.target.value),fullWidth:!0,margin:"normal",multiline:!0,rows:6,variant:"outlined"}),(0,n.jsx)(en.A,{label:"SystemPromptTemplate",value:m,onChange:e=>E(e.target.value),fullWidth:!0,margin:"normal",multiline:!0,rows:6,variant:"outlined"})]})]}),(0,n.jsxs)(ei.A,{sx:{mt:2,display:"flex",justifyContent:"flex-end",gap:1},children:[(0,n.jsx)(O.A,{variant:"outlined",onClick:i,children:"Cancel"}),(0,n.jsx)(O.A,{variant:"contained",onClick:X,color:"primary",disabled:W||P||""===a,children:"OK"})]})]})},ep=e=>{let{showCloseConfirm:t,setShowCloseConfirm:i,tabToClose:l,closeTab:r}=e;return t?(0,n.jsx)(q,{isOpen:t,onClose:()=>i(!1),children:(0,n.jsxs)("div",{style:{padding:"20px"},children:[(0,n.jsx)("p",{style:{marginBottom:"20px"},children:"タブを閉じてよろしいですか？"}),(0,n.jsxs)("div",{style:{display:"flex",justifyContent:"flex-end",gap:"10px"},children:[(0,n.jsx)(O.A,{variant:"outlined",onClick:()=>i(!1),children:"いいえ"}),(0,n.jsx)(O.A,{variant:"contained",color:"primary",onClick:()=>{l&&r(l),i(!1)},children:"はい"})]})]})}):null},em=`
<h4>Keyboard shortcuts</h4>
<p>Tab: Add a child element to the selected element</p>
<p>Shift + Tab: Add a sibling element to the selected element</p>
<p>Delete/Backspace: Remove the selected element</p>
<p>Enter: Edit the selected element</p>
<p>Esc: Stop editing the selected element</p>
<p>Tab in editing mode: Move the focus to the next text box</p>
<p>Ctrl + Z: Undo the last action</p>
<p>Shift + Ctrl + Z: Redo the last action</p>
<p>Ctrl + X: Cut the selected element</p>
<p>Ctrl + C: Copy the selected element</p>
<p>Ctrl + V: Paste the copied element</p>
<p>Ctrl + ArrowLeft: Collapse the children of the selected element</p>
<p>Ctrl + ArrowRight: Expand the children of the selected element</p>
<p>Arrow keys: Navigate between elements</p>

<h4>Mouse operations</h4>
<p>Click: Select an element</p>
<p>Double click: Edit the selected element</p>
<p>Clicking outside the element will end the editing mode</p>
<p>Drag: Move the selected element</p>

<h4>Menu operations</h4>
<p>New: Create a new diagram. Unsaved changes will be discarded.</p>
<p>Open: Load saved data. The current data will be discarded.</p>
<p>Save as: Save the diagram data in JSON format</p>
<p>Export: Export the diagram in SVG format</p>
`;var eE=i(4098),eg=i(3464);let ef=async(e,t,i)=>{try{console.log("prompt: \n",e);let i=`${(0,u.G6)()}?key=${t}`,n=await eg.A.post(i,{contents:[{parts:[{text:e}]}]},{headers:{"Content-Type":"application/json"}}),l=n.data.candidates?.[0]?.content?.parts?.[0]?.text||"";return console.log(l),l}catch(e){throw console.error("Gemini API Error:",e),Error("API呼び出しに失敗しました")}},ev=(e,t)=>{let i={};Object.values(e).forEach(e=>{i[e.id]={id:e.id,text:e.texts[0]||"",parentId:e.parentId,depth:e.depth}});let n=(e,l)=>Object.values(i).filter(t=>t.parentId===e).sort((e,t)=>e.depth-t.depth).flatMap(e=>{let i="  ".repeat(e.depth-1);return[`${i}- ${e.text}${e.id===t?" (selected)":""}`,...n(e.id,l+1)]});return n(null,0).join("\n")},ey=e=>{let{structureText:t,inputText:i}=e;return(0,u.k0)().replace("{{structureText}}",t).replace("{{inputText}}",i)},ej=()=>{let{tabs:e,currentTabId:t,addTab:i,closeTab:o,switchTab:s,updateTabState:d,updateTabName:c}=(0,Z.u)(),h=(0,r.useMemo)(()=>e.find(e=>e.id===t),[e,t]),[x,p]=(0,r.useState)(!1),[m,E]=(0,r.useState)(!1),[f,v]=(0,r.useState)(null),[y,j]=(0,r.useState)(!1),{addToast:b}=(0,T.d)(),w=(0,r.useCallback)(()=>p(e=>!e),[]),C=(0,r.useCallback)(()=>E(e=>!e),[]),A=(0,r.useCallback)(e=>{d(t,t=>(0,g.Ff)(t,e))},[t,d]),S=t=>{e.find(e=>e.id===t),v(t),j(!0)},k=(0,r.useCallback)(async()=>{if(!h)return;let e=Object.values(h.state.elements).find(e=>e.selected);if(!e){b(l.noSelect);return}let t=await (0,u.CG)();if(!t){b(l.noApiKey,"warn");return}let i=localStorage.getItem("prompt")||"";if(!i){b(l.noPrompt);return}try{let n=ev(h.state.elements,e.id),l=ey({structureText:n,inputText:i}),r=(0,u.OA)(),o=await ef(l,t,r),a=[];Array.isArray(o)?a=o:"string"==typeof o&&(a=(o.match(/```[\s\S]*?```/g)||[]).flatMap(e=>e.replace(/```/g,"").split("\n").map(e=>e.trim()).filter(e=>e.length>0))),A({type:"ADD_ELEMENTS_SILENT",payload:{parentId:e.id,texts:a,tentative:!0}})}catch(e){b(e instanceof Error?`${l.aiError}: ${e.message}`:l.aiError)}},[h,A,b]),O=(0,r.useMemo)(()=>h?(0,n.jsxs)(a,{state:h.state,dispatch:A,children:[(0,n.jsx)(I,{isHelpOpen:x,toggleHelp:w}),(0,n.jsx)(J,{tabs:e,currentTabId:t,addTab:i,closeTab:S,switchTab:s}),(0,n.jsx)(V,{saveSvg:()=>(0,eE.Sz)(document.querySelector(".svg-element"),"download.svg"),loadElements:e=>(0,eE.wl)(e.nativeEvent).then(e=>{let{elements:i,fileName:n}=e;A({type:"LOAD_ELEMENTS",payload:i}),c(t,n.replace(".json",""))}).catch(e=>b(e.message)),saveElements:()=>(0,eE.$r)(Object.values(h.state.elements),h.name),toggleHelp:w,toggleSettings:C,onAIClick:k})]}):null,[h,A,w,x,t,c,C,b,k]);return(0,n.jsxs)("div",{children:[O,(0,n.jsx)(ep,{showCloseConfirm:y,setShowCloseConfirm:j,tabToClose:f,closeTab:o}),(0,n.jsx)(ex,{isOpen:m,onClose:C}),(0,n.jsx)(q,{isOpen:x,onClose:w,children:(0,n.jsx)("div",{dangerouslySetInnerHTML:{__html:em}})})]})}}},e=>{var t=t=>e(e.s=t);e.O(0,[387,255,441,684,358],()=>t(1469)),_N_E=e.O()}]);