import React,{useEffect,useState,createContext,useContext,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {defineRegistry,Renderer,JSONUIProvider} from '@json-render/react';
import {catalog,type Workspace,type View,type FieldValues} from './schema.ts';
import './style.css';
const id=new URLSearchParams(location.search).get('harnessSession');
const api=new URL('./api/harness/',location.href).pathname+encodeURIComponent(id??'')+'/workspace';
const Context=createContext<{view:View;change:(field:string,value:string|string[])=>Promise<void>}|null>(null);
function useView(){const ctx=useContext(Context);if(!ctx)throw new Error('Missing view');return ctx;}
function Panel({title,children}:{title:string;children:React.ReactNode}){return <section><h2>{title}</h2>{children}</section>}
function TextInput({title,field,placeholder,multiline}:{title:string;field:string;placeholder?:string;multiline?:boolean}){
 const {view,change}=useView();const external=String(view.fields[field]??'');const [value,setValue]=useState(external);const focused=useRef(false);
 useEffect(()=>{if(!focused.current)setValue(external)},[external]);
 const props={id:field,value,placeholder,onFocus:()=>{focused.current=true},onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setValue(e.target.value),onBlur:()=>{focused.current=false;if(value!==external)void change(field,value)}};
 return <section><label htmlFor={field}>{title}</label>{multiline?<textarea {...props}/>:<input {...props}/>}<small>Saved when you leave the field</small></section>
}
const {registry}=defineRegistry(catalog,{components:{
 Workspace:({children})=><div className="grid">{children}</div>,
 Text:({props})=><Panel title={props.title}><p>{props.body}</p></Panel>,
 Metric:({props})=><Panel title={props.title}><strong className="metric">{props.value}</strong><p>{props.detail}</p></Panel>,
 Table:({props})=><Panel title={props.title}><div className="scroll"><table><thead><tr>{props.columns.map((c,i)=><th key={i}>{c}</th>)}</tr></thead><tbody>{props.rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div></Panel>,
 Input:({props})=><TextInput {...props}/>,
 Select:({props})=>{const {view,change}=useView();return <section><label htmlFor={props.field}>{props.title}</label><select id={props.field} value={String(view.fields[props.field]??'')} onChange={e=>void change(props.field,e.target.value)}><option value="">Choose…</option>{props.options.map(o=><option key={o}>{o}</option>)}</select></section>},
 Checklist:({props})=>{const {view,change}=useView();const val=view.fields[props.field];const selected=Array.isArray(val)?val:[];return <Panel title={props.title}>{props.items.map(item=><label className="check" key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={e=>void change(props.field,e.target.checked?[...selected,item.id]:selected.filter(x=>x!==item.id))}/>{item.label}</label>)}</Panel>},
 BarChart:({props})=>{const max=Math.max(1,...props.items.map(i=>i.value));return <Panel title={props.title}>{props.items.map((item,i)=><div className="bar" key={i}><span>{item.label}</span><progress max={max} value={item.value}/><b>{item.value}</b></div>)}</Panel>},
}});
function App(){
 const [state,setState]=useState<Workspace>();const [error,setError]=useState('');const busy=useRef(false);
 const refresh=async()=>{if(busy.current)return;try{const r=await fetch(api);if(!r.ok)throw new Error('Unable to load workspace');setState(await r.json())}catch(e){setError(String(e))}};
 useEffect(()=>{if(!id)return;void refresh();const t=setInterval(()=>void refresh(),1500);return()=>clearInterval(t)},[]);
 const view=state?.views.find(v=>v.id===state.activeView);
 async function update(v:View,patch:{fields?:FieldValues;activate?:boolean}){if(busy.current){setError('An edit is saving; please try again');return;}busy.current=true;try{const r=await fetch(api,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({viewId:v.id,revision:v.revision,...patch})});const result=await r.json();if(!r.ok)throw new Error(result.error);setState(result);setError('')}catch(e){setError(String(e))}finally{busy.current=false}}
 return <main><header><small>ADAPTIVE WORKSPACE</small><h1>{view?.title??'A view for the work'}</h1><p>The assistant can reshape this space as your task evolves.</p></header>{error&&<p role="alert">{error}</p>}{(state?.views.length??0)>1&&<nav>{state!.views.map(v=><button key={v.id} aria-pressed={v.id===view?.id} onClick={()=>void update(v,{activate:true})}>{v.title}</button>)}</nav>}{view?<Context.Provider value={{view,change:(field,value)=>update(view,{fields:{[field]:value}})}}><JSONUIProvider registry={registry}><Renderer spec={view.spec} registry={registry}/></JSONUIProvider></Context.Provider>:<section><h2>Start with the conversation</h2><p>Ask for a research comparison, a planning board, a review checklist, or a task-specific dashboard. The assistant will build a view here using json-render.</p></section>}</main>
}
createRoot(document.getElementById('root')!).render(<App/>);
