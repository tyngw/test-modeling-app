(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[974],{1469:(e,t,i)=>{Promise.resolve().then(i.bind(i,2192))},2192:(e,t,i)=>{"use strict";i.d(t,{default:()=>ev});var n=i(5155);let l={dropChildElement:"子要素にドロップすることはできません",noSelect:"要素を選択してから実行してください",dragError:"ドラッグ操作中にエラーが発生しました",aiError:"AI処理に失敗しました",noApiKey:"APIキーが設定されていません",noPrompt:"入力情報(プロンプト)が設定されていません",clipboardEmpty:"クリップボードにテキストがありません",clipboardReadError:"クリップボードの読み取りに失敗しました"};var r=i(2115);let o=(0,r.createContext)(void 0),s=e=>{let{children:t,state:i,dispatch:l}=e,s=(0,r.useMemo)(()=>({state:i,dispatch:l}),[i,l]);return(0,n.jsx)(o.Provider,{value:s,children:t})},a=()=>{let e=(0,r.useContext)(o);if(!e)throw Error("useCanvas must be used within a CanvasProvider");return e};var d=i(6924);let h=()=>{let e=document.createElement("canvas").getContext("2d");return e.font=`${d.gI}px ${d.zs}`,e},c=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,i=h();return Math.ceil(e.split("\n").reduce((e,n)=>Math.max(e,i.measureText(n).width+2*t),0))},u=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,i=e.reduce((e,i)=>Math.max(e,c(i||"",t)),0);return Math.min(d.SK.WIDTH.MAX,Math.max(d.SK.WIDTH.MIN,i))},x=function(e,t){arguments.length>2&&void 0!==arguments[2]?arguments[2]:d.mU;let i=h(),n=e.split("\n"),l=[];return n.forEach(e=>{if(""===e.trim()){l.push("");return}let n="",r=0;for(let o of e.split(/(\s+)/).filter(e=>""!==e)){let e=i.measureText(o).width;if(r+e>t){if(""!==n&&(l.push(n),n="",r=0),e>t)for(let e of o){let o=i.measureText(e).width;r+o>t&&(l.push(n),n="",r=0),n+=e,r+=o}else n=o,r=e}else n+=o,r+=e}""!==n&&l.push(n)}),l},p=(0,r.memo)(e=>{let{x:t,y:i,width:l,height:o,text:s,zoomRatio:a,onHeightChange:h}=e,[c,u]=(0,r.useState)({width:0,height:0}),[p,E]=(0,r.useState)(!1),m=(0,r.useRef)(null),g=(0,r.useRef)({width:0,height:0}),f=(0,r.useRef)(s);return((0,r.useEffect)(()=>{let e;return E(!0),p&&(s!==f.current||l!==g.current.width||o!==g.current.height)&&(e=requestAnimationFrame(()=>{if(!m.current)return;let e=x(s||"",l,a),t=d.gI*d.RZ*a,i=Math.max(d.SK.SECTION_HEIGHT*a,(t+d.rF.VERTICAL)*a),n=Math.max(e.length*t,i)+d.rF.VERTICAL*a,r=Math.abs(l-g.current.width)>1,o=Math.abs(n-g.current.height)>1;(r||o)&&(u({width:l,height:n}),h(n/a),g.current={width:l,height:n})}),f.current=s),()=>cancelAnimationFrame(e)},[s,l,o,a,h,p]),p)?(0,n.jsx)("foreignObject",{x:t,y:i,width:c.width,height:c.height/a,pointerEvents:"none",children:(0,n.jsx)("div",{ref:m,className:"text-display-area",style:{fontSize:`${d.gI}px`,lineHeight:d.RZ,fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',width:`${c.width-d.rF.HORIZONTAL}px`,minHeight:`${d.SK.SECTION_HEIGHT}px`,padding:`${d.rF.VERTICAL/2}px ${d.rF.HORIZONTAL/2}px`,overflow:"hidden",whiteSpace:"pre-wrap",wordWrap:"break-word",boxSizing:"content-box"},children:s})}):null});var E=i(6670),m=i(840),g=i(9605),f=i(6624),y=i(2226);let v=(e,t,i)=>((e,t)=>{if(!e.tentative)return!1;let i=Math.min(...t.filter(t=>t.parentId===e.parentId&&t.tentative).map(e=>e.order));return e.order===i})(e,i)?(0,n.jsxs)("g",{transform:`translate(${e.x+1.1*e.width},${e.y})`,onClick:e=>e.stopPropagation(),style:{cursor:"pointer",pointerEvents:"all"},children:[(0,n.jsxs)("g",{children:[(0,n.jsx)("rect",{x:"0",y:"0",width:"24",height:"24",rx:"4",fill:"white",stroke:"#e0e0e0",strokeWidth:"1"}),(0,n.jsx)("foreignObject",{x:"4",y:"4",width:"16",height:"16",children:(0,n.jsx)(m.A,{sx:{color:"#4CAF50","&:hover":{color:"#388E3C"},transition:"color 0.2s ease-in-out"},style:{width:"100%",height:"100%"},onClick:()=>t({type:"CONFIRM_TENTATIVE_ELEMENTS",payload:e.parentId})})})]}),(0,n.jsxs)("g",{transform:"translate(30, 0)",children:[(0,n.jsx)("rect",{x:"0",y:"0",width:"24",height:"24",rx:"4",fill:"white",stroke:"#e0e0e0",strokeWidth:"1"}),(0,n.jsx)("foreignObject",{x:"4",y:"4",width:"16",height:"16",children:(0,n.jsx)(g.A,{sx:{color:"#F44336","&:hover":{color:"#D32F2F"},transition:"color 0.2s ease-in-out"},style:{width:"100%",height:"100%"},onClick:()=>t({type:"CANCEL_TENTATIVE_ELEMENTS",payload:e.parentId})})})]})]}):null,w=e=>{let{element:t,isHovered:i}=e;return"true"===y.Ar.getItem("__debugMode__")&&i?(0,n.jsx)("foreignObject",{x:t.x+t.width+10,y:t.y-10,width:"340",height:"150",style:{backgroundColor:"white",border:"1px solid black",padding:"5px",zIndex:1e3,borderRadius:"5px"},children:(0,n.jsxs)("div",{style:{fontSize:"12px",color:"black"},children:[(0,n.jsxs)("div",{children:["id: ",t.id]}),(0,n.jsxs)("div",{children:["parentID: ",t.parentId]}),(0,n.jsxs)("div",{children:["order: ",t.order]}),(0,n.jsxs)("div",{children:["depth: ",t.depth]}),(0,n.jsxs)("div",{children:["children: ",t.children]}),(0,n.jsxs)("div",{children:["editing: ",t.editing?"true":"false"]}),(0,n.jsxs)("div",{children:["selected: ",t.selected?"true":"false"]}),(0,n.jsxs)("div",{children:["visible: ",t.visible?"true":"false"]}),(0,n.jsxs)("div",{children:["width: ",t.width]}),(0,n.jsxs)("div",{children:["height: ",t.width]})]})}):null},j=r.memo(e=>{let{element:t,currentDropTarget:i,dropPosition:l,draggingElement:o,handleMouseDown:s}=e,{state:h,dispatch:c}=a(),[m,g]=(0,r.useState)(!1);h.elements[t.parentId];let y=i?.id||-1,[j,b]=(0,r.useState)(!1);(0,r.useEffect)(()=>{g(!0)},[]),(0,r.useEffect)(()=>{if(t.editing)return;let{newWidth:e,newHeight:i,sectionHeights:n}=(()=>{let e=u(t.texts,d.rF.HORIZONTAL),i=t.texts.map(t=>{let i=x(t||"",e,h.zoomRatio).length;return Math.max(d.SK.SECTION_HEIGHT*h.zoomRatio,i*d.gI*d.RZ+d.rF.VERTICAL*h.zoomRatio)});return{newWidth:e,newHeight:i.reduce((e,t)=>e+t,0),sectionHeights:i}})();(e!==t.width||i!==t.height)&&c({type:"UPDATE_ELEMENT_SIZE",payload:{id:t.id,width:e,height:i,sectionHeights:n}})},[t.editing,t.texts,t.width,t.height,c,t.id,h.zoomRatio]);let C=(0,r.useMemo)(()=>Object.values(h.elements).filter(e=>e.parentId===t.id&&!e.visible),[h.elements,t.id]),A=!!o&&(o.id===t.id||(0,f.K9)(h.elements,o.id,t.id)),T=(0,r.useCallback)((e,i)=>{let n=t.sectionHeights[e];if(null!==n&&Math.abs(i-n)>1){let n=[...t.sectionHeights];n[e]=i;let l=u(t.texts,d.rF.HORIZONTAL),r=n.reduce((e,t)=>e+t,0);c({type:"UPDATE_ELEMENT_SIZE",payload:{id:t.id,width:l,height:r,sectionHeights:n}})}},[c,t]);return m?(0,n.jsx)(r.Fragment,{children:(0,n.jsxs)("g",{opacity:A?.3:1,children:[v(t,c,Object.values(h.elements)),C.length>0&&(0,n.jsxs)(n.Fragment,{children:[t.texts.length>1?(0,n.jsx)("rect",{x:t.x+d.N,y:t.y+d.N,width:t.width,height:t.height,rx:d.iC.RX,fill:"none",stroke:d.iC.SHADDOW.COLOR,strokeWidth:d.iC.STROKE},`shadow-${t.id}`):(0,n.jsx)("line",{x1:t.x+d.N,y1:t.y+t.height+d.N,x2:t.x+t.width+d.N,y2:t.y+t.height+d.N,stroke:d.iC.SHADDOW.COLOR,strokeWidth:d.iC.STROKE},`shadow-line-${t.id}`),(0,n.jsxs)("g",{transform:`translate(${t.x+1.1*t.width},${t.y})`,onClick:e=>{e.stopPropagation(),c({type:"SELECT_ELEMENT",payload:t.id}),c({type:"EXPAND_ELEMENT"})},style:{cursor:"pointer"},children:[(0,n.jsx)("rect",{x:"0",y:"0",width:"24",height:"24",rx:"4",fill:"white",stroke:"#e0e0e0",strokeWidth:"1"}),(0,n.jsx)("svg",{x:"4",y:"4",width:"16",height:"16",viewBox:"0 0 24 24",children:(0,n.jsx)(E.A,{sx:{color:"#666666"},style:{width:"100%",height:"100%"}})})]})]}),(0,n.jsx)("defs",{children:(0,n.jsx)("filter",{id:"boxShadow",x:"-20%",y:"-20%",width:"140%",height:"140%",children:(0,n.jsx)("feDropShadow",{dx:"2",dy:"2",stdDeviation:"3",floodColor:"gray"})})}),(0,n.jsx)("rect",{x:t.x,y:t.y,width:t.width,height:t.height,rx:d.iC.RX,strokeWidth:d.iC.STROKE,stroke:t.texts.length>1?t.selected?d.iC.SELECTED.STROKE_COLOR:t.tentative?"#9E9E9E":d.iC.NORMAL.STROKE_COLOR:"transparent",strokeDasharray:t.tentative?"4 2":"none",onClick:e=>{e.stopPropagation(),c({type:"SELECT_ELEMENT",payload:t.id})},onDoubleClick:()=>c({type:"EDIT_ELEMENT"}),onMouseDown:e=>s(e,t),onMouseEnter:()=>b(!0),onMouseLeave:()=>b(!1),style:{fill:t.id===y&&"child"===l?d.iC.DRAGGING.COLOR:d.iC.NORMAL.COLOR,strokeOpacity:t.tentative?.6:1,pointerEvents:"all",cursor:j?"pointer":"default",filter:t.selected&&t.texts.length>1?"url(#boxShadow)":"none"}}),1===t.texts.length&&m&&(0,n.jsxs)(n.Fragment,{children:[t.selected&&(0,n.jsx)("line",{x1:t.x+2,y1:t.y+t.height+2,x2:t.x+t.width+1,y2:t.y+t.height+2,stroke:"rgba(0,0,255,0.2)",strokeWidth:d.iC.STROKE,strokeLinecap:"round",pointerEvents:"none"}),(0,n.jsx)("line",{x1:t.x,y1:t.y+t.height,x2:t.x+t.width,y2:t.y+t.height,stroke:t.selected?d.iC.SELECTED.STROKE_COLOR:t.tentative?"#9E9E9E":d.iC.NORMAL.STROKE_COLOR,strokeWidth:d.iC.STROKE,strokeDasharray:t.tentative?"4 2":"none",pointerEvents:"none"})]}),i?.id===t.id&&o&&"child"!==l&&(0,n.jsx)("rect",{className:"drop-preview",x:t.x,y:"before"===l?t.y-o.height-d.e$.Y:t.y+.5*t.height+d.e$.Y,width:o.width,height:o.height,fill:d.iC.DRAGGING.COLOR,rx:d.iC.RX,stroke:d.iC.DRAGGING.COLOR,strokeWidth:d.iC.STROKE,style:{pointerEvents:"none"}}),t.texts.map((e,i)=>(0,n.jsxs)(r.Fragment,{children:[(0,n.jsx)(p,{x:t.x,y:t.y+t.sectionHeights.slice(0,i).reduce((e,t)=>e+t,0),width:t.width,height:t.sectionHeights[i],text:e,fontSize:d.gI,zoomRatio:h.zoomRatio,onHeightChange:e=>T(i,e)}),i<t.texts.length-1&&(0,n.jsx)("line",{x1:t.x,y1:t.y+t.sectionHeights.slice(0,i+1).reduce((e,t)=>e+t,0),x2:t.x+t.width,y2:t.y+t.sectionHeights.slice(0,i+1).reduce((e,t)=>e+t,0),stroke:d.iC.NORMAL.STROKE_COLOR,strokeWidth:"1"})]},`${t.id}-section-${i}`)),(0,n.jsx)(w,{element:t,isHovered:j})]})},t.id):null}),b=e=>{let{element:t,onEndEditing:i}=e,{dispatch:l,state:o}=a(),s=(0,r.useRef)([]);if(!t)return null;t.width=u(t.texts,d.rF.HORIZONTAL);let h=(e,n)=>{if("Tab"===e.key){if(e.preventDefault(),n===t.texts.length-1)l({type:"END_EDITING"}),i?.();else{let e=n+1;s.current[e]?.focus()}}if("Enter"===e.key&&e.shiftKey){e.preventDefault();let i=e.currentTarget.selectionStart,r=e.currentTarget.value.substring(0,i)+"\n"+e.currentTarget.value.substring(i);l({type:"UPDATE_TEXT",payload:{id:t.id,index:n,value:r}})}("Escape"===e.key||"Enter"===e.key&&(e.ctrlKey||e.metaKey))&&(e.preventDefault(),l({type:"END_EDITING"}))};return(0,n.jsx)(n.Fragment,{children:t.texts.map((e,i)=>{let r=0;for(let e=0;e<i;e++)r+=t.sectionHeights[e];return(0,n.jsx)("textarea",{ref:e=>{s.current[i]=e},value:e,onChange:e=>l({type:"UPDATE_TEXT",payload:{id:t.id,index:i,value:e.target.value}}),onKeyDown:e=>h(e,i),className:`editable editable-${i}`,style:{position:"absolute",left:`${t.x*o.zoomRatio}px`,top:`${(t.y+r)*o.zoomRatio}px`,width:`${t.width*o.zoomRatio-2}px`,height:`${t.sectionHeights[i]*o.zoomRatio-2}px`,margin:"1px 1px",fontSize:`${d.gI*o.zoomRatio}px`,lineHeight:`${d.RZ}em`,padding:"0",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',boxSizing:"border-box",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale",overflow:"hidden",whiteSpace:"pre-wrap",wordWrap:"break-word",resize:"none",zIndex:"0"},autoFocus:0===i},i)})})},C=e=>{let t=Object.values(e),i=Math.max(...t.map(e=>e.x+e.width)),n=Math.max(...t.map(e=>e.y+e.height));return{width:i+d.e$.X,height:n+d.SK.SECTION_HEIGHT*d.zX}},A=e=>{let{setCanvasSize:t,setDisplayArea:i,state:n}=e;(0,r.useEffect)(()=>{let e=C(n.elements),l=window.innerHeight-2*d.JY;e.width=Math.max(e.width,window.innerWidth),e.height=Math.max(e.height,l);let r={width:e.width,height:e.height};e.width*=n.zoomRatio,e.height*=n.zoomRatio,t(e),i(`0 0 ${r.width} ${r.height}`)},[n.elements,n.zoomRatio,t,i])},T={"Ctrl+z":"UNDO","Ctrl+Shift+z":"REDO",ArrowUp:"ARROW_UP",ArrowDown:"ARROW_DOWN",ArrowRight:"ARROW_RIGHT","Ctrl+ArrowRight":"EXPAND_ELEMENT",ArrowLeft:"ARROW_LEFT","Ctrl+ArrowLeft":"COLLAPSE_ELEMENT","Ctrl+x":"CUT_ELEMENT","Ctrl+c":"COPY_ELEMENT","Ctrl+v":"PASTE_ELEMENT",Tab:"ADD_ELEMENT","Shift+Tab":"ADD_SIBLING_ELEMENT",Delete:"DELETE_ELEMENT",Backspace:"DELETE_ELEMENT",Enter:"EDIT_ELEMENT"},S=(e,t)=>{let{dispatch:i}=a();(0,r.useEffect)(()=>{let n=e.current,l=e=>{e.target instanceof SVGElement&&"svg"===e.target.tagName&&(i({type:"DESELECT_ALL"}),t&&i({type:"END_EDITING"}))};return n?.addEventListener("mousedown",l),()=>{n?.removeEventListener("mousedown",l)}},[e,t,i])};var O=i(3147);let N=e=>"touches"in e,k=()=>{let{state:e,dispatch:t}=a(),{addToast:i}=(0,O.d)(),[n,o]=(0,r.useState)(null),[s,h]=(0,r.useState)({x:0,y:0}),[c,u]=(0,r.useState)({x:0,y:0}),[x,p]=(0,r.useState)(null),E=(0,r.useCallback)(t=>{let i,n;return N(t)?(i=t.touches[0].clientX+window.scrollX,n=t.touches[0].clientY+window.scrollY):(i=t.clientX+window.scrollX,n=t.clientY+window.scrollY),{x:i/e.zoomRatio,y:(n-d.uF)/e.zoomRatio}},[e.zoomRatio]),m=(0,r.useCallback)((e,t)=>{let i;if(!t.parentId)return;e.stopPropagation(),e.nativeEvent instanceof TouchEvent&&e.preventDefault();let n=E(e.nativeEvent);o(t),h({x:n.x-t.x,y:n.y-t.y}),u({x:t.x,y:t.y})},[E]),g=(0,r.useCallback)(async()=>{if(n)try{let r=()=>{t({type:"MOVE_ELEMENT",payload:{id:n.id,...c}})};if(x){let{element:s,position:a}=x;if((0,f.K9)(e.elements,n.id,s.id)){r(),o(null),i(l.dropChildElement,"warn");return}"child"===a?(e=>{t({type:"SNAPSHOT"}),t({type:"DROP_ELEMENT",payload:{id:n.id,oldParentId:n.parentId,newParentId:e.id,newOrder:e.children,depth:e.depth+1}})})(s):((e,i)=>{let l="before"===i?e.order:e.order+1,r=e.parentId;t({type:"SNAPSHOT"}),t({type:"DROP_ELEMENT",payload:{id:n.id,oldParentId:n.parentId,newParentId:r,newOrder:l,depth:e.depth}})})(s,a)}else r()}catch(e){console.error("Drag error:",e),i(l.dragError,"warn")}finally{o(null),p(null)}},[n,x,c,e.elements,t,i]);return(0,r.useEffect)(()=>{if(!n)return;let i=t=>{let i=E(t),o=i.x,s=i.y,a=Object.values(e.elements).filter(e=>e.visible&&e.id!==n?.id&&l(e,o)),d=null,h=1/0;for(let e of a){let{position:t,distanceSq:i}=r(e,o,s);i<h&&(h=i,d={element:e,position:t})}return d},l=(e,t)=>t>e.x&&t<e.x+e.width,r=(e,t,i)=>{let n=e.y,l=e.y+e.height,r=.1*e.height,o="child";i<n+r?o="before":i>l-r&&(o="after");let s=e.x+e.width/2,a=n+e.height/2,d=t-s,h=i-a;return{position:o,distanceSq:d*d+h*h}},o=e=>{e instanceof TouchEvent&&1===e.touches.length&&e.preventDefault(),p(i(e));let l=E(e),r={x:l.x-s.x,y:l.y-s.y};t({type:"MOVE_ELEMENT",payload:{id:n.id,...r}})},a=e=>o(e),d=e=>{1===e.touches.length&&o(e)},h=()=>g(),c=()=>g();return document.addEventListener("mousemove",a),document.addEventListener("touchmove",d,{passive:!1}),document.addEventListener("mouseup",h),document.addEventListener("touchend",c),()=>{document.removeEventListener("mousemove",a),document.removeEventListener("touchmove",d),document.removeEventListener("mouseup",h),document.removeEventListener("touchend",c)}},[n,s,e.elements,E,t,g]),{handleMouseDown:m,handleMouseUp:g,currentDropTarget:x?.element||null,dropPosition:x?.position||null,draggingElement:n}},I=r.memo(e=>{let{isHelpOpen:t,toggleHelp:i}=e,o=(0,r.useRef)(null),[s,h]=(0,r.useState)(!1),{state:c,dispatch:u}=a(),{elements:x,zoomRatio:p}=c,{addToast:E}=(0,O.d)(),[m,g]=(0,r.useState)({width:0,height:0}),[y,v]=(0,r.useState)("0 0 0 0"),[w,C]=(0,r.useState)(!1),[N,I]=(0,r.useState)(0),[R,L]=(0,r.useState)({x:0,y:0}),M=Object.values(x).find(e=>e.editing);(0,r.useEffect)(()=>{M||o.current?.focus()},[M]),(0,r.useEffect)(()=>{h(!0),g({width:window.innerWidth,height:window.innerHeight}),v(`0 0 ${window.innerWidth} ${window.innerHeight-d.JY}`)},[]),(0,r.useEffect)(()=>{g({width:window.innerWidth,height:window.innerHeight}),v(`0 0 ${window.innerWidth} ${window.innerHeight-d.JY}`)},[]),A({setCanvasSize:g,setDisplayArea:v,state:c}),S(o,!!M);let{handleMouseDown:D,handleMouseUp:_,currentDropTarget:$,dropPosition:H,draggingElement:P}=k(),F=(0,r.useCallback)(async e=>{e.preventDefault();let t=T[`${e.ctrlKey||e.metaKey?"Ctrl+":""}${e.shiftKey?"Shift+":""}${e.key}`];if("PASTE_ELEMENT"===t){if(c.cutElements&&Object.keys(c.cutElements).length>0)u({type:t});else try{let e=await navigator.clipboard.readText(),t=Object.values(c.elements).find(e=>e.selected);if(!t){E(l.noSelect);return}if(e){let i=e.split("\n").filter(e=>""!==e.trim());if(0===i.length){E(l.clipboardEmpty);return}u({type:"ADD_ELEMENTS_SILENT",payload:{parentId:t.id,texts:i}})}else E(l.clipboardEmpty)}catch(e){console.error("クリップボード読み取りエラー:",e),E(l.clipboardReadError)}}else t&&u({type:t})},[u,c.cutElements,c.elements,E]),W=(0,r.useCallback)(e=>{if(2===e.touches.length){C(!0);let t=e.touches[0],i=e.touches[1];I(Math.hypot(i.clientX-t.clientX,i.clientY-t.clientY)),L({x:window.scrollX,y:window.scrollY})}else if(1===e.touches.length){e.preventDefault();let t=e.touches[0],i=document.elementFromPoint(t.clientX,t.clientY);if(i instanceof SVGRectElement){let e=new MouseEvent("mousedown",{clientX:t.clientX,clientY:t.clientY,bubbles:!0});i.dispatchEvent(e)}}},[]),z=(0,r.useCallback)(e=>{if(w&&2===e.touches.length){e.preventDefault();let t=e.touches[0],i=e.touches[1],n=Math.hypot(i.clientX-t.clientX,i.clientY-t.clientY),l=t.clientX-i.clientX,r=Math.atan2(t.clientY-i.clientY,l),o=n/N,s=(t.clientX+i.clientX)/2,a=(t.clientY+i.clientY)/2;window.scrollTo({left:R.x+s*(o-1)*Math.cos(r),top:R.y+a*(o-1)*Math.sin(r),behavior:"auto"})}else 1===e.touches.length&&e.preventDefault()},[w,N,R]),G=(0,r.useCallback)(()=>{C(!1),I(0),L({x:0,y:0})},[]),K=function(e,t){let i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:d.lB.COLOR,l=arguments.length>3&&void 0!==arguments[3]?arguments[3]:d.lB.STROKE;if(!e)return null;let r=t.height,o=`M ${e.x+e.width+d._v.OFFSET},${e.y+e.height/2} C ${e.x+e.width+d.mO},${e.y+e.height/2} ${t.x-d.mO},${t.y+r/2} ${t.x},${t.y+r/2}`;return(0,n.jsx)("path",{d:o,stroke:i,strokeWidth:l,fill:"none",markerStart:"url(#arrowhead)"},`connection-${t.id}-${t.parentId}`)};return(0,n.jsx)(n.Fragment,{children:(0,n.jsxs)("div",{style:{position:"absolute",top:d.uF,left:0,overflow:"auto",touchAction:w?"none":"manipulation"},children:[s&&(0,n.jsxs)("svg",{"data-testid":"view-area",ref:o,width:m.width,height:m.height,viewBox:y,tabIndex:0,onKeyDown:F,onTouchStart:W,onTouchMove:z,onTouchEnd:G,style:{outline:"none",touchAction:w?"none":"manipulation",userSelect:"none",WebkitUserSelect:"none"},className:"svg-element",children:[Object.values(x).filter(e=>e.visible).map(e=>(0,n.jsx)(r.Fragment,{children:(0,n.jsx)(j,{element:e,currentDropTarget:$,dropPosition:H,draggingElement:P,handleMouseDown:D,handleMouseUp:_})},e.id)),Object.values(x).filter(e=>e.visible&&!!e.parentId).map(e=>{let t=c.elements[e.parentId];return P&&(e.id===P.id||(0,f.K9)(c.elements,P.id,e.id))?null:K(t,e)}),$&&P&&(()=>{let e="child"===H?$:$.parentId?c.elements[$.parentId]:null,t=c.elements[P.id];return e&&t&&K(e,t,d.lB.DRAGGING_COLOR,d.lB.STROKE)})()]}),(0,n.jsx)(b,{element:M,onEndEditing:()=>o.current?.focus()})]})})});var R=i(5857),L=i(2554),M=i(7040),D=i(2152),_=i(2397),$=i(5194),H=i(1311),P=i(1496),F=i(6597),W=i(9691),z=i(1081),G=i(8694),K=i(1401),X=i(5833),Y=i(5785),U=i(8283),V=i(514);let Z={NEW:"新規作成",OPEN:"ファイルを開く",SAVE:"保存（JSON形式）",SAVE_SVG:"SVG画像で保存",ADD:"新しい要素の追加",DELETE:"要素の削除",AI:"AI機能",EXPAND:"展開",COLLAPSE:"折りたたみ",UNDO:"元に戻す",REDO:"やり直す",ZOOM_IN:"ズームイン",ZOOM_OUT:"ズームアウト",HELP:"ヘルプを表示",SETTINGS:"設定"};var B=i(1386);let J=e=>{let{saveSvg:t,loadElements:i,saveElements:l,toggleHelp:o,toggleSettings:s,onAIClick:h}=e,{dispatch:c}=a(),{addTab:u}=(0,B.u)(),x=(0,r.useRef)(null),p=(0,r.useRef)(null),E=e=>()=>{c({type:e})};return(0,n.jsx)("div",{style:{position:"fixed",width:"100%",height:d.JY,overflowX:"auto",WebkitOverflowScrolling:"touch"},ref:p,children:(0,n.jsxs)("div",{style:{display:"flex",justifyContent:"left",alignItems:"center",height:"100%",backgroundColor:"#f1f1f1",padding:"0 20px",minWidth:"max-content"},children:[(0,n.jsx)("input",{type:"file",ref:x,onChange:i,style:{display:"none"}}),(0,n.jsx)(V.A,{title:Z.NEW,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:u,children:(0,n.jsx)(W.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(V.A,{title:Z.OPEN,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:()=>{x.current?.click()},children:(0,n.jsx)($.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(V.A,{title:Z.SAVE,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:l,children:(0,n.jsx)(H.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(V.A,{title:Z.SAVE_SVG,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:t,children:(0,n.jsx)(P.A,{sx:{color:"#666666"}})})}),(0,n.jsx)("div",{style:{width:"10px"}}),(0,n.jsx)(V.A,{title:Z.ADD,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:E("ADD_ELEMENT"),children:(0,n.jsx)(z.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(V.A,{title:Z.DELETE,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:E("DELETE_ELEMENT"),children:(0,n.jsx)(G.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(V.A,{title:Z.AI,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:h,children:(0,n.jsx)(U.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(V.A,{title:Z.EXPAND,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:E("EXPAND_ELEMENT"),children:(0,n.jsx)(X.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(V.A,{title:Z.COLLAPSE,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:E("COLLAPSE_ELEMENT"),children:(0,n.jsx)(K.A,{sx:{color:"#666666"}})})}),(0,n.jsx)("div",{style:{width:"10px"}}),(0,n.jsx)(V.A,{title:Z.UNDO,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:E("UNDO"),children:(0,n.jsx)(L.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(V.A,{title:Z.REDO,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:E("REDO"),children:(0,n.jsx)(M.A,{sx:{color:"#666666"}})})}),(0,n.jsx)("div",{style:{width:"10px"}}),(0,n.jsx)(V.A,{title:Z.ZOOM_IN,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:E("ZOOM_IN"),children:(0,n.jsx)(D.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(V.A,{title:Z.ZOOM_OUT,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:E("ZOOM_OUT"),children:(0,n.jsx)(_.A,{sx:{color:"#666666"}})})}),(0,n.jsx)("div",{style:{width:"10px"}}),(0,n.jsx)(V.A,{title:Z.HELP,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:o,children:(0,n.jsx)(F.A,{sx:{color:"#666666"}})})}),(0,n.jsx)(V.A,{title:Z.SETTINGS,children:(0,n.jsx)(R.A,{variant:"text",className:"iconbar-button",onClick:s,children:(0,n.jsx)(Y.A,{sx:{color:"#666666"}})})})]})})},q=r.memo(e=>{let{tab:t,isCurrent:i,closeTab:l,switchTab:o}=e,[s,a]=(0,r.useState)(!1);return((0,r.useEffect)(()=>{a(!0)},[]),s)?(0,n.jsxs)("div",{style:{padding:"8px",marginRight:"4px",backgroundColor:i?"#fff":"#ddd",borderBottom:i?"3px solid #87CEFA":"none",paddingBottom:"3px",borderRadius:"5px 5px 0 0",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center"},onClick:()=>o(t.id),children:[(0,n.jsx)("span",{children:t.name}),(0,n.jsx)("button",{onClick:e=>{e.stopPropagation(),l(t.id)},style:{marginLeft:"8px",border:"0",backgroundColor:"transparent",fontSize:"16px",color:"#666",fontWeight:"bold",cursor:"pointer"},children:"\xd7"})]}):null}),Q=r.memo(e=>{let{tabs:t,currentTabId:i,addTab:l,closeTab:r,switchTab:o}=e;return(0,n.jsxs)("div",{style:{display:"flex",alignItems:"center",backgroundColor:"#f0f0f0",width:"100%",height:d.FM,marginTop:d.JY,position:"fixed"},children:[t.map(e=>(0,n.jsx)(q,{tab:e,isCurrent:i===e.id,closeTab:r,switchTab:o},e.id)),(0,n.jsx)("button",{onClick:l,style:{marginLeft:"8px"},children:"+"})]})}),ee=e=>{let{isOpen:t,onClose:i,children:l}=e;return t?(0,n.jsx)("div",{style:{position:"fixed",top:0,left:0,width:"100%",height:"100%",backgroundColor:"rgba(0, 0, 0, 0.5)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:1e6},children:(0,n.jsx)("div",{style:{backgroundColor:"#fff",padding:"40px 24px 24px",borderRadius:"10px",width:"80%",maxWidth:"500px",overflow:"hidden",position:"relative",zIndex:1000001},children:(0,n.jsxs)("div",{style:{maxHeight:"80vh",overflow:"auto"},children:[(0,n.jsx)("button",{onClick:i,style:{position:"absolute",right:10,top:10,background:"transparent",border:"none",fontSize:"1.5em"},children:"\xd7"}),(0,n.jsx)("div",{style:{flex:1,overflow:"auto",paddingRight:"8px"},children:l})]})})}):null};var et=i(5358),ei=i(5055),en=i(460),el=i(8893),er=i(8346),eo=i(3025),es=i(7498),ea=i(7298),ed=i(9439),eh=i(4512),ec=i(8410);let eu=e=>{let{isOpen:t,onClose:i}=e,[l,o]=(0,r.useState)(0),[s,a]=(0,r.useState)("3"),[d,h]=(0,r.useState)(""),[c,u]=(0,r.useState)(""),[x,p]=(0,r.useState)(""),[E,m]=(0,r.useState)(!1);(0,r.useEffect)(()=>{(async()=>{t&&(a((0,y.X0)().toString()),h(await (0,y.CG)()),u((0,y.XH)()),p((0,y.k0)()))})()},[t]);let g=async()=>{let e=Math.max(1,Math.min(10,parseInt(s,10)));(0,y.jE)(e),await (0,y.wt)(d),(0,y.bJ)(c),(0,y.mF)(x),i()};return(0,n.jsxs)(ee,{isOpen:t,onClose:i,children:[(0,n.jsx)(et.A,{variant:"h6",gutterBottom:!0,children:"Preference"}),(0,n.jsxs)(ei.A,{value:l,onChange:(e,t)=>o(t),children:[(0,n.jsx)(en.A,{label:"Elements Setting"}),(0,n.jsx)(en.A,{label:"API Setting"}),(0,n.jsx)(en.A,{label:"Prompt"})]}),(0,n.jsxs)(el.A,{sx:{mt:2,minHeight:300},children:[0===l&&(0,n.jsxs)(el.A,{children:[(0,n.jsx)(er.A,{label:"Number of sections",type:"number",value:s,onChange:e=>{let t=e.target.value;a(t);let i=parseInt(t,10);m(""===t||isNaN(i)||i<1||i>10)},fullWidth:!0,margin:"normal",inputProps:{min:1,max:10},error:E}),(0,n.jsx)(eo.A,{error:E,children:E?"1から10の数値を入力してください":"同時に表示するセクションの数（1〜10）"})]}),1===l&&(0,n.jsxs)(el.A,{children:[(0,n.jsxs)(es.A,{component:"fieldset",fullWidth:!0,children:[(0,n.jsx)(ea.A,{component:"legend",children:"Select Model"}),(0,n.jsx)(ed.A,{children:(0,n.jsx)(eh.A,{value:"Gemini-1.5-flash",control:(0,n.jsx)(ec.A,{checked:!0}),label:"Gemini-1.5-flash"})})]}),(0,n.jsx)(er.A,{label:"Gemini API Key",type:"password",value:d,onChange:e=>h(e.target.value),fullWidth:!0,margin:"normal",helperText:"入力されたキーは暗号化してlocalStorageに保存されます。サーバに送信されることはありません。"})]}),2===l&&(0,n.jsxs)(el.A,{children:[(0,n.jsx)(er.A,{label:"inputText",value:c,onChange:e=>u(e.target.value),fullWidth:!0,margin:"normal",multiline:!0,rows:6,variant:"outlined"}),(0,n.jsx)(er.A,{label:"SystemPromptTemplate",value:x,onChange:e=>p(e.target.value),fullWidth:!0,margin:"normal",multiline:!0,rows:6,variant:"outlined"})]})]}),(0,n.jsxs)(el.A,{sx:{mt:2,display:"flex",justifyContent:"flex-end",gap:1},children:[(0,n.jsx)(R.A,{variant:"outlined",onClick:i,children:"Cancel"}),(0,n.jsx)(R.A,{variant:"contained",onClick:g,color:"primary",disabled:E||""===s,children:"OK"})]})]})},ex=e=>{let{showCloseConfirm:t,setShowCloseConfirm:i,tabToClose:l,closeTab:r}=e;return t?(0,n.jsx)(ee,{isOpen:t,onClose:()=>i(!1),children:(0,n.jsxs)("div",{style:{padding:"20px"},children:[(0,n.jsx)("p",{style:{marginBottom:"20px"},children:"タブを閉じてよろしいですか？"}),(0,n.jsxs)("div",{style:{display:"flex",justifyContent:"flex-end",gap:"10px"},children:[(0,n.jsx)(R.A,{variant:"outlined",onClick:()=>i(!1),children:"いいえ"}),(0,n.jsx)(R.A,{variant:"contained",color:"primary",onClick:()=>{l&&r(l),i(!1)},children:"はい"})]})]})}):null},ep=`
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
`;var eE=i(4098),em=i(3464);let eg=async(e,t)=>{try{console.log("prompt: \n",e);let i=`${(0,y.G6)()}?key=${t}`,n=await em.A.post(i,{contents:[{parts:[{text:e}]}]},{headers:{"Content-Type":"application/json"}}),l=n.data.candidates?.[0]?.content?.parts?.[0]?.text||"";return console.log(l),l}catch(e){throw console.error("Gemini API Error:",e),Error("API呼び出しに失敗しました")}},ef=(e,t)=>{let i={};Object.values(e).forEach(e=>{i[e.id]={id:e.id,text:e.texts[0]||"",parentId:e.parentId,depth:e.depth}});let n=(e,l)=>Object.values(i).filter(t=>t.parentId===e).sort((e,t)=>e.depth-t.depth).flatMap(e=>{let i="  ".repeat(e.depth-1);return[`${i}- ${e.text}${e.id===t?" (selected)":""}`,...n(e.id,l+1)]});return n(null,0).join("\n")},ey=e=>{let{structureText:t,inputText:i}=e;return(0,y.k0)().replace("{{structureText}}",t).replace("{{inputText}}",i)},ev=()=>{let{tabs:e,currentTabId:t,addTab:i,closeTab:o,switchTab:a,updateTabState:d,updateTabName:h}=(0,B.u)(),c=(0,r.useMemo)(()=>e.find(e=>e.id===t),[e,t]),[u,x]=(0,r.useState)(!1),[p,E]=(0,r.useState)(!1),[m,g]=(0,r.useState)(null),[v,w]=(0,r.useState)(!1),{addToast:j}=(0,O.d)(),b=(0,r.useCallback)(()=>x(e=>!e),[]),C=(0,r.useCallback)(()=>E(e=>!e),[]),A=(0,r.useCallback)(e=>{d(t,t=>(0,f.Ff)(t,e))},[t,d]),T=t=>{e.find(e=>e.id===t),g(t),w(!0)},S=(0,r.useCallback)(async()=>{if(!c)return;let e=Object.values(c.state.elements).find(e=>e.selected);if(!e){j(l.noSelect);return}let t=await (0,y.CG)();if(!t){j(l.noApiKey,"warn");return}let i=localStorage.getItem("prompt")||"";if(!i){j(l.noPrompt);return}try{let n=ef(c.state.elements,e.id),l=ey({structureText:n,inputText:i}),r=await eg(l,t),o=[];Array.isArray(r)?o=r:"string"==typeof r&&(o=(r.match(/```[\s\S]*?```/g)||[]).flatMap(e=>e.replace(/```/g,"").split("\n").map(e=>e.trim()).filter(e=>e.length>0))),A({type:"ADD_ELEMENTS_SILENT",payload:{parentId:e.id,texts:o,tentative:!0}})}catch(e){j(e instanceof Error?`${l.aiError}: ${e.message}`:l.aiError)}},[c,A,j]),N=(0,r.useMemo)(()=>c?(0,n.jsxs)(s,{state:c.state,dispatch:A,children:[(0,n.jsx)(I,{isHelpOpen:u,toggleHelp:b}),(0,n.jsx)(Q,{tabs:e,currentTabId:t,addTab:i,closeTab:T,switchTab:a}),(0,n.jsx)(J,{saveSvg:()=>(0,eE.Sz)(document.querySelector(".svg-element"),"download.svg"),loadElements:e=>(0,eE.wl)(e.nativeEvent).then(e=>{let{elements:i,fileName:n}=e;A({type:"LOAD_ELEMENTS",payload:i}),h(t,n.replace(".json",""))}).catch(e=>j(e.message)),saveElements:()=>(0,eE.$r)(Object.values(c.state.elements),c.name),toggleHelp:b,toggleSettings:C,onAIClick:S})]}):null,[c,A,b,u,t,h,C,j,S]);return(0,n.jsxs)("div",{children:[N,(0,n.jsx)(ex,{showCloseConfirm:v,setShowCloseConfirm:w,tabToClose:m,closeTab:o}),(0,n.jsx)(eu,{isOpen:p,onClose:C}),(0,n.jsx)(ee,{isOpen:u,onClose:b,children:(0,n.jsx)("div",{dangerouslySetInnerHTML:{__html:ep}})})]})}}},e=>{var t=t=>e(e.s=t);e.O(0,[217,255,441,684,358],()=>t(1469)),_N_E=e.O()}]);