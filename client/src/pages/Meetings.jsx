import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import {
  Plus, X, Video, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Check, MapPin, RefreshCw, Settings, Clock, Info, Pencil,
  Users as UsersIcon, User, AlignLeft, ChevronDown,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const START_HOUR  = 7;
const END_HOUR    = 20;
const SLOT_H      = 64;
const T_PUR       = '#6264A7';
const T_PUR_LT    = '#7B83EB';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const REPEAT_OPTS = ['Does not repeat','Every day','Every week','Every month','Every year'];
const TZ_LABEL    = '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi';
const VIEW_MODES  = [{ key:'day',label:'Day' },{ key:'workweek',label:'Work week' },{ key:'week',label:'Week' }];

// 30-min time slots in 12h format
const TIME_SLOTS = (() => {
  const s = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 30) {
      const p = h < 12 ? 'AM' : 'PM', h12 = h===0?12:h>12?h-12:h;
      s.push({ val:`${pad(h)}:${pad(m)}`, label:`${h12}:${pad(m)} ${p}` });
    }
  return s;
})();

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2,'0'); }
const toDateStr  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const isToday    = d => toDateStr(d) === toDateStr(new Date());
const addDays    = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const getMondayOf = d => { const r=new Date(d); r.setHours(0,0,0,0); const dy=r.getDay(); r.setDate(r.getDate()-(dy===0?6:dy-1)); return r; };
const parseMinutes = ts => { if(!ts)return null; const [h,m]=ts.split(':').map(Number); return h*60+(m||0); };
const fmt12h = h => h===0?'12 AM':h===12?'12 PM':h<12?`${h} AM`:`${h-12} PM`;
const getNowMins = () => { const n=new Date(); return n.getHours()*60+n.getMinutes(); };
const evtColor = t => t==='google_meet'?{bg:'rgba(71,112,198,0.85)',border:'#4770C6'}:{bg:'rgba(52,168,83,0.85)',border:'#34A853'};

const calcDuration = (s,e) => {
  const sm=parseMinutes(s), em=parseMinutes(e);
  if(!sm||!em||em<=sm) return '';
  const d=em-sm, h=Math.floor(d/60), m=d%60;
  return m?(h?`${h}h ${m}m`:`${m}m`):`${h}h`;
};

const roundNext30 = () => {
  const n=new Date(); const mins=n.getMinutes();
  const m=mins<30?30:0, h=mins<30?n.getHours():(n.getHours()+1)%24;
  return `${pad(h)}:${pad(m)}`;
};

const defaultNewMtg = () => {
  const start=roundNext30(), sm=parseMinutes(start)||0, em=sm+30;
  return {
    title:'', attendees:[],
    startDate:toDateStr(new Date()), startTime:start,
    endDate:toDateStr(new Date()), endTime:`${pad(Math.floor(em/60)%24)}:${pad(em%60)}`,
    allDay:false, repeat:'Does not repeat',
    type:'google_meet', link:'', location:'', description:'',
    advanced:{ lobbyBypass:'invited', whoCanPresent:'everyone', allowReactions:true, allowChat:true },
  };
};

// ─── Shared style objects ─────────────────────────────────────────────────────
const teamsField = { width:'100%', background:'transparent', border:'none', color:'var(--text-primary)', fontSize:15, outline:'none', padding:'12px 8px', fontFamily:'inherit', boxSizing:'border-box' };
const darkInput   = (focus=false) => ({ background:'#2a2a2a', border:`1px solid ${focus?T_PUR:'rgba(255,255,255,0.15)'}`, borderRadius:4, padding:'6px 10px', color:'white', fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' });
const fieldRow    = { display:'flex', alignItems:'flex-start', gap:14, borderBottom:'1px solid rgba(255,255,255,0.07)', minHeight:48 };
const iconCol     = { paddingTop:15, paddingLeft:8, color:'rgba(255,255,255,0.4)', flexShrink:0, width:28 };
const navBtnBase  = { display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:4, border:'1px solid var(--border-color)', background:'transparent', cursor:'pointer', color:'var(--text-primary)', fontSize:13 };

// ═════════════════════════════════════════════════════════════════════════════
const Meetings = () => {
  const { user, socket } = useContext(AuthContext);
  const { showToast }    = useContext(ToastContext);

  // ── backend ──
  const [workspace, setWorkspace] = useState(null);
  const [meetings,  setMeetings]  = useState([]);
  const [members,   setMembers]   = useState([]);
  const [teams,     setTeams]     = useState([]);
  const [loading,   setLoading]   = useState(true);

  // ── view: 'calendar' | 'new-meeting' | 'logs' ──
  const [view,         setView]        = useState('calendar');
  const [showMeetNow,  setShowMeetNow] = useState(false);
  const [showAdvanced, setShowAdv]     = useState(false);
  const [advTab,       setAdvTab]      = useState('access');

  // ── calendar ──
  const [viewMode,    setViewMode]    = useState('workweek');
  const [weekStart,   setWeekStart]   = useState(getMondayOf(new Date()));
  const [selDay,      setSelDay]      = useState(new Date());
  const [showViewMenu,setShowViewMenu]= useState(false);
  const [showMiniCal, setShowMiniCal] = useState(false);
  const [miniCalMo,   setMiniCalMo]   = useState(new Date());
  const [nowMins,     setNowMins]     = useState(getNowMins());

  // ── new meeting form ──
  const [newMtg,    setNewMtg]    = useState(defaultNewMtg());
  const [attSearch, setAttSearch] = useState('');
  const [showAttDrop,setShowAttDrop] = useState(false);
  const [meetNow,   setMeetNow]   = useState({ title:'', mode:'all' });
  const [descFocus, setDescFocus] = useState(false);

  const descRef    = useRef(null);
  const attInputRef= useRef(null);
  const attDropRef = useRef(null);
  const scrollRef  = useRef(null);
  const viewMenuRef= useRef(null);
  const miniCalRef = useRef(null);

  // ── 60s tick for red line ──
  useEffect(()=>{ const id=setInterval(()=>setNowMins(getNowMins()),60000); return()=>clearInterval(id); },[]);

  // ── auto-scroll to now ──
  useEffect(()=>{ if(!loading&&scrollRef.current) scrollRef.current.scrollTop=Math.max(0,((nowMins-START_HOUR*60)/60)*SLOT_H-120); },[loading]);

  // ── click-outside ──
  useEffect(()=>{
    const h=e=>{
      if(viewMenuRef.current&&!viewMenuRef.current.contains(e.target)) setShowViewMenu(false);
      if(miniCalRef.current &&!miniCalRef.current.contains(e.target))  setShowMiniCal(false);
      if(attDropRef.current &&!attDropRef.current.contains(e.target)&&
         attInputRef.current&&!attInputRef.current.contains(e.target)) setShowAttDrop(false);
    };
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[]);

  // ── fetch + real-time ──
  useEffect(()=>{ fetchData(); },[]);
  useEffect(()=>{
    if(!socket) return;
    const refresh=()=>fetchData();
    socket.on('meeting_created',refresh);
    socket.on('new_notification',refresh);
    return()=>{ socket.off('meeting_created',refresh); socket.off('new_notification',refresh); };
  },[socket]);
  useEffect(()=>{
    if(!workspace) return;
    const id=setInterval(fetchData,30000); // polling fallback
    return()=>clearInterval(id);
  },[workspace]);

  const fetchData = async () => {
    try {
      if(!workspace&&!loading) return;
      const wsRes=await axios.get('/workspaces');
      if(wsRes.data.length>0){
        const ws=wsRes.data[0]; setWorkspace(ws);
        const [mR,dR,tR]=await Promise.all([
          axios.get(`/workspaces/${ws._id}/meetings`).catch(()=>({data:[]})),
          axios.get(`/workspaces/${ws._id}`).catch(()=>({data:{}})),
          axios.get(`/workspaces/${ws._id}/teams`).catch(()=>({data:[]})),
        ]);
        setMeetings(mR.data||[]); setMembers((dR.data?.members||[]).filter(m=>m.user)); setTeams(tR.data||[]);
      }
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  };

  // ── open new meeting form ──
  const openNewMeeting=(dateStr='',timeStr='')=>{
    const base=defaultNewMtg();
    setNewMtg({...base, startDate:dateStr||base.startDate, startTime:timeStr||base.startTime, endDate:dateStr||base.endDate, attendees:members.map(m=>m.user._id)});
    setAttSearch(''); setView('new-meeting');
  };

  // ── save meeting ──
  const saveMeeting=async()=>{
    if(!newMtg.title.trim()){ showToast('Please add a title','error'); return; }
    if(!workspace) return;
    let ids=newMtg.attendees.length>0?[...newMtg.attendees]:members.map(m=>m.user._id);
    if(!ids.includes(user._id)) ids.push(user._id);
    const desc=descRef.current?.innerHTML||newMtg.description;
    const fullDesc=newMtg.location?`📍 ${newMtg.location}\n\n${desc}`:desc;
    try{
      await axios.post(`/workspaces/${workspace._id}/meetings`,{
        title:newMtg.title, date:newMtg.startDate, time:newMtg.startTime,
        type:newMtg.type, link:newMtg.link, description:fullDesc, participants:ids,
      });
      showToast('Meeting scheduled successfully!','success');
      fetchData(); setView('calendar');
    } catch(err){ showToast(err.response?.data?.message||'Error creating meeting','error'); }
  };

  // ── start meet now ──
  const startMeetNow=async()=>{
    if(!workspace) return;
    const n=new Date();
    let ids=meetNow.mode==='all'?members.map(m=>m.user._id):[user._id];
    if(!ids.includes(user._id)) ids.push(user._id);
    try{
      await axios.post(`/workspaces/${workspace._id}/meetings`,{
        title:meetNow.title||`Meet now – ${n.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`,
        date:toDateStr(n), time:`${pad(n.getHours())}:${pad(n.getMinutes())}`,
        type:'direct_meet', description:'Instant meeting', participants:ids,
      });
      showToast('Instant meeting started!','success');
      fetchData(); setShowMeetNow(false);
    } catch{ showToast('Error starting meeting','error'); }
  };

  // ── attendees ──
  const filteredAtts=members.filter(m=>!newMtg.attendees.includes(m.user._id)&&(
    m.user.name?.toLowerCase().includes(attSearch.toLowerCase())||m.user.email?.toLowerCase().includes(attSearch.toLowerCase())
  ));
  const addAtt=id=>{ setNewMtg(p=>({...p,attendees:[...p.attendees,id]})); setAttSearch(''); setShowAttDrop(false); };
  const removeAtt=id=>setNewMtg(p=>({...p,attendees:p.attendees.filter(a=>a!==id)}));

  // ── calendar helpers ──
  const getDays=()=>{
    if(viewMode==='day') return[selDay];
    if(viewMode==='workweek') return Array.from({length:5},(_,i)=>addDays(weekStart,i));
    return Array.from({length:7},(_,i)=>addDays(addDays(weekStart,-1),i));
  };
  const days=getDays();
  const isCurrentWeek=()=>toDateStr(weekStart)===toDateStr(getMondayOf(new Date()));
  const goToday=()=>{ const n=new Date(); setWeekStart(getMondayOf(n)); setSelDay(n); setMiniCalMo(n); };
  const navigate=dir=>{ if(viewMode==='day'){ const nx=addDays(selDay,dir); setSelDay(nx); setWeekStart(getMondayOf(nx)); } else setWeekStart(p=>addDays(p,dir*(viewMode==='week'?7:5))); };
  const headerLabel=()=>{ if(viewMode==='day') return`${MONTHS[selDay.getMonth()]} ${selDay.getFullYear()}`; const f=days[0],l=days[days.length-1]; return f.getMonth()===l.getMonth()?`${MONTHS[f.getMonth()]} ${f.getFullYear()}`:`${MONTHS[f.getMonth()]} – ${MONTHS[l.getMonth()]} ${l.getFullYear()}`; };
  const timeLineTop=(()=>{ const s=START_HOUR*60,e=END_HOUR*60; if(nowMins<s||nowMins>=e)return null; return((nowMins-s)/60)*SLOT_H; })();
  const todayVisible=days.some(d=>isToday(d));
  const dayMeetings=ds=>meetings.filter(m=>new Date(m.date).toISOString().split('T')[0]===ds);
  const evtStyle=m=>{ const mins=parseMinutes(m.time); if(!mins||mins<START_HOUR*60||mins>=END_HOUR*60)return null; return{top:((mins-START_HOUR*60)/60)*SLOT_H+2,height:SLOT_H-6}; };
  const hours=Array.from({length:END_HOUR-START_HOUR},(_,i)=>START_HOUR+i);

  // ── Mini Calendar ──────────────────────────────────────────────────────────
  const MiniCal=()=>{
    const year=miniCalMo.getFullYear(),month=miniCalMo.getMonth();
    const fdow=new Date(year,month,1).getDay(),dim=new Date(year,month+1,0).getDate();
    const cells=[]; for(let i=0;i<fdow;i++)cells.push(null); for(let d=1;d<=dim;d++)cells.push(d);
    while(cells.length%7)cells.push(null);
    const vis=new Set(days.map(d=>toDateStr(d))), todS=toDateStr(new Date());
    return(
      <div style={{position:'absolute',top:'100%',left:0,marginTop:6,zIndex:1000,background:'#252525',border:'1px solid rgba(255,255,255,0.14)',borderRadius:8,padding:14,width:248,boxShadow:'0 12px 32px rgba(0,0,0,0.55)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontWeight:700,fontSize:14,color:'white'}}>{MONTHS[month]} {year}</span>
          <div style={{display:'flex',gap:2}}>{['‹','›'].map((ch,i)=>(
            <button key={i} onClick={()=>setMiniCalMo(new Date(year,month+(i?1:-1),1))}
              style={{background:'none',border:'none',color:'rgba(255,255,255,0.55)',cursor:'pointer',fontSize:16,padding:'2px 6px',borderRadius:4}}
              onMouseEnter={e=>e.currentTarget.style.color='white'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.55)'}>{ch}</button>
          ))}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:4}}>
          {['S','M','T','W','T','F','S'].map((d,i)=><div key={i} style={{textAlign:'center',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.4)',paddingBottom:4}}>{d}</div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
          {cells.map((d,i)=>{
            if(!d) return<div key={i}/>;
            const dt=new Date(year,month,d),dtS=toDateStr(dt),inWk=vis.has(dtS),isTd=dtS===todS;
            const pInWk=i>0&&cells[i-1]&&vis.has(toDateStr(new Date(year,month,cells[i-1])));
            const nInWk=i<cells.length-1&&cells[i+1]&&vis.has(toDateStr(new Date(year,month,cells[i+1])));
            const isF=inWk&&!pInWk,isL=inWk&&!nInWk;
            return(
              <div key={i} onClick={()=>{viewMode==='day'?setSelDay(dt):setWeekStart(getMondayOf(dt));setShowMiniCal(false);}}
                style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'3px 0',cursor:'pointer',background:inWk?'rgba(98,100,167,0.4)':'transparent',borderRadius:isF&&isL?20:isF?'20px 0 0 20px':isL?'0 20px 20px 0':0}}>
                <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:26,height:26,borderRadius:'50%',fontSize:12,fontWeight:isTd?700:400,background:isTd?T_PUR:'transparent',color:isTd?'white':inWk?'white':'rgba(255,255,255,0.65)'}}>{d}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if(loading) return(
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary h-full">
      <div className="w-12 h-12 border-4 border-border border-t-accent-blue rounded-full animate-spin mb-4"/>
      <p className="text-text-secondary font-medium">Loading calendar…</p>
    </div>
  );
  if(!workspace) return<div className="p-8 text-danger">Please create a workspace first.</div>;

  // ─────────────────────────────────────────────────────────────────────────
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'inherit'}}>

      {/* ══════════════════ NEW MEETING FULL-PAGE FORM ════════════════════════ */}
      {view==='new-meeting'&&(
        <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#1a1a1a',overflow:'hidden'}}>
          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',background:'#1f1f1f',borderBottom:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{background:T_PUR,borderRadius:6,padding:'5px 6px',display:'flex'}}><CalendarIcon size={17} color="white"/></div>
              <span style={{fontWeight:700,fontSize:17,color:'white'}}>New meeting</span>
              <div style={{width:1,height:20,background:'rgba(255,255,255,0.2)',margin:'0 4px'}}/>
              <button style={{background:'none',border:'none',color:T_PUR_LT,fontWeight:600,fontSize:14,cursor:'default',borderBottom:`2px solid ${T_PUR_LT}`,paddingBottom:2}}>Details</button>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setView('calendar')}
                style={{padding:'7px 18px',borderRadius:4,border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:13}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >Discard</button>
              <button onClick={saveMeeting}
                style={{padding:'7px 24px',borderRadius:4,border:'none',background:T_PUR,color:'white',cursor:'pointer',fontSize:13,fontWeight:600}}
                onMouseEnter={e=>e.currentTarget.style.background=T_PUR_LT}
                onMouseLeave={e=>e.currentTarget.style.background=T_PUR}
              >Save</button>
            </div>
          </div>

          {/* Form body */}
          <div style={{flex:1,overflowY:'auto',background:'#1a1a1a'}}>
            {/* Timezone */}
            <div style={{display:'flex',alignItems:'center',gap:5,padding:'10px 60px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <span style={{fontSize:13,color:T_PUR_LT,cursor:'default'}}>Time zone: {TZ_LABEL}</span>
              <ChevronDown size={13} color={T_PUR_LT}/>
            </div>
            {/* Info banner */}
            <div style={{display:'flex',alignItems:'center',gap:10,margin:'12px 60px',padding:'10px 14px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6}}>
              <Info size={15} color="rgba(255,255,255,0.4)"/>
              <span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>Meetings are shared in real time with all invited participants across the workspace.</span>
            </div>

            <div style={{padding:'0 60px 40px'}}>

              {/* ── Title ── */}
              <div style={{...fieldRow,alignItems:'center',marginBottom:0}}>
                <div style={iconCol}><Pencil size={16}/></div>
                <input value={newMtg.title} onChange={e=>setNewMtg(p=>({...p,title:e.target.value}))}
                  placeholder="Add title" autoFocus
                  style={{...teamsField,fontSize:22,fontWeight:600,letterSpacing:'-0.02em',padding:'14px 8px'}}
                />
              </div>

              {/* ── Attendees ── */}
              <div style={{...fieldRow,flexDirection:'column',padding:'6px 0'}}>
                <div style={{display:'flex',gap:14,width:'100%',alignItems:'flex-start'}}>
                  <div style={{...iconCol,paddingTop:10}}><UsersIcon size={16}/></div>
                  <div style={{flex:1}}>
                    {/* chips */}
                    {newMtg.attendees.length>0&&(
                      <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8,marginTop:8}}>
                        {newMtg.attendees.map(id=>{
                          const mem=members.find(m=>m.user._id===id); if(!mem) return null;
                          return(
                            <span key={id} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 8px 3px 10px',background:'rgba(98,100,167,0.25)',border:`1px solid ${T_PUR}55`,borderRadius:20,fontSize:13,color:T_PUR_LT}}>
                              {mem.user.name}
                              <button onClick={()=>removeAtt(id)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',padding:0,display:'flex'}}
                                onMouseEnter={e=>e.currentTarget.style.color='white'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.4)'}
                              ><X size={11}/></button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {/* search */}
                    <div style={{position:'relative'}}>
                      <input ref={attInputRef} value={attSearch}
                        onChange={e=>{setAttSearch(e.target.value);setShowAttDrop(true);}}
                        onFocus={()=>setShowAttDrop(true)}
                        placeholder="Enter name or e-mail"
                        style={{...teamsField,fontSize:14,padding:'10px 0'}}
                      />
                      {showAttDrop&&(
                        <div ref={attDropRef} style={{position:'absolute',top:'100%',left:0,right:0,background:'#252525',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,zIndex:200,maxHeight:220,overflowY:'auto',boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}>
                          {filteredAtts.length===0
                            ?<div style={{padding:'12px 16px',color:'rgba(255,255,255,0.4)',fontSize:13}}>{attSearch?'No results found':'All workspace members already added'}</div>
                            :filteredAtts.slice(0,8).map(m=>(
                              <div key={m.user._id} onClick={()=>addAtt(m.user._id)}
                                style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)',transition:'background 0.1s'}}
                                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}
                                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                              >
                                <div style={{width:32,height:32,borderRadius:'50%',background:T_PUR,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'white',flexShrink:0}}>
                                  {m.user.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{color:'white',fontSize:13,fontWeight:500}}>{m.user.name}</div>
                                  <div style={{color:'rgba(255,255,255,0.4)',fontSize:11}}>{m.user.email}</div>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Date & Time ── */}
              <div style={{...fieldRow,alignItems:'center',padding:'10px 0',flexWrap:'wrap',gap:8}}>
                <div style={{...iconCol,paddingTop:0}}><Clock size={16}/></div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',flex:1}}>
                  <input type="date" value={newMtg.startDate}
                    onChange={e=>setNewMtg(p=>({...p,startDate:e.target.value,endDate:e.target.value}))}
                    style={darkInput()}
                    onFocus={e=>e.target.style.borderColor=T_PUR} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.15)'}
                  />
                  <select value={newMtg.startTime}
                    onChange={e=>{const st=e.target.value,sm=parseMinutes(st)||0,em=sm+30;setNewMtg(p=>({...p,startTime:st,endTime:`${pad(Math.floor(em/60)%24)}:${pad(em%60)}`}));}}
                    style={{...darkInput(),paddingRight:6}}
                    onFocus={e=>e.target.style.borderColor=T_PUR} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.15)'}
                  >{TIME_SLOTS.map(s=><option key={s.val} value={s.val}>{s.label}</option>)}</select>
                  <span style={{color:'rgba(255,255,255,0.4)',fontSize:18}}>→</span>
                  <input type="date" value={newMtg.endDate} min={newMtg.startDate}
                    onChange={e=>setNewMtg(p=>({...p,endDate:e.target.value}))}
                    style={darkInput()}
                    onFocus={e=>e.target.style.borderColor=T_PUR} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.15)'}
                  />
                  <select value={newMtg.endTime}
                    onChange={e=>setNewMtg(p=>({...p,endTime:e.target.value}))}
                    style={{...darkInput(),paddingRight:6}}
                    onFocus={e=>e.target.style.borderColor=T_PUR} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.15)'}
                  >{TIME_SLOTS.map(s=><option key={s.val} value={s.val}>{s.label}</option>)}</select>
                  {calcDuration(newMtg.startTime,newMtg.endTime)&&(
                    <span style={{fontSize:13,color:'rgba(255,255,255,0.45)'}}>{calcDuration(newMtg.startTime,newMtg.endTime)}</span>
                  )}
                  {/* All day toggle */}
                  <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',marginLeft:4}}>
                    <div onClick={()=>setNewMtg(p=>({...p,allDay:!p.allDay}))}
                      style={{width:36,height:20,borderRadius:10,background:newMtg.allDay?T_PUR:'rgba(255,255,255,0.15)',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                      <div style={{position:'absolute',top:2,left:newMtg.allDay?17:2,width:16,height:16,borderRadius:'50%',background:'white',transition:'left 0.2s'}}/>
                    </div>
                    <span style={{fontSize:13,color:'rgba(255,255,255,0.65)'}}>All day</span>
                  </label>
                </div>
              </div>

              {/* ── Repeat ── */}
              <div style={{...fieldRow,alignItems:'center',padding:'6px 0'}}>
                <div style={{...iconCol,paddingTop:0}}><RefreshCw size={16}/></div>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <select value={newMtg.repeat} onChange={e=>setNewMtg(p=>({...p,repeat:e.target.value}))}
                    style={{background:'transparent',border:'none',color:T_PUR_LT,fontSize:14,cursor:'pointer',outline:'none',padding:'8px 0',fontFamily:'inherit'}}>
                    {REPEAT_OPTS.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown size={13} color={T_PUR_LT}/>
                </div>
              </div>

              {/* ── Advanced options ── */}
              <div style={{...fieldRow,alignItems:'center',padding:'10px 0'}}>
                <div style={{...iconCol,paddingTop:0}}><Settings size={16}/></div>
                <button onClick={()=>setShowAdv(true)}
                  style={{background:'transparent',border:'1px solid rgba(255,255,255,0.3)',borderRadius:4,padding:'6px 16px',color:'white',cursor:'pointer',fontSize:13,fontWeight:500}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >Advanced options</button>
              </div>

              {/* ── Meeting type + link ── */}
              <div style={{...fieldRow,alignItems:'flex-start',padding:'6px 0'}}>
                <div style={iconCol}><Video size={16}/></div>
                <div style={{flex:1}}>
                  <select value={newMtg.type} onChange={e=>setNewMtg(p=>({...p,type:e.target.value}))}
                    style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.7)',fontSize:14,cursor:'pointer',outline:'none',padding:'8px 0',fontFamily:'inherit'}}>
                    <option value="google_meet">Online meeting</option>
                    <option value="direct_meet">In Person</option>
                  </select>
                  {newMtg.type==='google_meet'&&(
                    <input value={newMtg.link} onChange={e=>setNewMtg(p=>({...p,link:e.target.value}))}
                      placeholder="Paste meeting link (Zoom, Meet, Teams…)"
                      style={{display:'block',width:'100%',background:'transparent',border:'none',borderBottom:'1px solid rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.6)',fontSize:13,outline:'none',padding:'6px 0',fontFamily:'inherit',boxSizing:'border-box',marginTop:2}}
                      onFocus={e=>e.target.style.borderBottomColor=T_PUR}
                      onBlur={e=>e.target.style.borderBottomColor='rgba(255,255,255,0.15)'}
                    />
                  )}
                </div>
              </div>

              {/* ── Location ── */}
              <div style={{...fieldRow,alignItems:'center'}}>
                <div style={{...iconCol,paddingTop:0}}><MapPin size={16}/></div>
                <input value={newMtg.location} onChange={e=>setNewMtg(p=>({...p,location:e.target.value}))}
                  placeholder="Add location"
                  style={{...teamsField,fontSize:15}}
                />
              </div>

              {/* ── Description / Rich text ── */}
              <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',marginTop:4}}>
                {/* Toolbar */}
                <div style={{display:'flex',alignItems:'center',gap:2,padding:'8px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexWrap:'wrap',background:'rgba(255,255,255,0.02)'}}>
                  {[{l:'B',cmd:'bold'},{l:'I',cmd:'italic'},{l:'U',cmd:'underline'},{l:'S',cmd:'strikeThrough'}].map(({l,cmd})=>(
                    <button key={cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(cmd,false,null);descRef.current?.focus();}}
                      style={{padding:'3px 8px',background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.5)',fontSize:13,borderRadius:3,fontWeight:l==='B'?700:400,fontStyle:l==='I'?'italic':'normal',textDecoration:l==='U'?'underline':l==='S'?'line-through':'none'}}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color='white';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,0.5)';}}
                    >{l}</button>
                  ))}
                  <div style={{width:1,height:18,background:'rgba(255,255,255,0.15)',margin:'0 4px'}}/>
                  {['≡','•','1.','«','🔗'].map(l=>(
                    <button key={l} style={{padding:'3px 8px',background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.5)',fontSize:13,borderRadius:3}}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color='white';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,0.5)';}}
                    >{l}</button>
                  ))}
                </div>
                {/* Editor area */}
                <div style={{position:'relative'}}>
                  <div ref={descRef} contentEditable suppressContentEditableWarning
                    onFocus={()=>setDescFocus(true)} onBlur={()=>setDescFocus(false)}
                    style={{minHeight:130,padding:'14px 16px',color:'rgba(255,255,255,0.8)',fontSize:14,outline:'none',lineHeight:1.6,fontFamily:'inherit'}}
                  />
                  {!descFocus&&descRef.current&&!descRef.current.textContent&&(
                    <div style={{position:'absolute',top:14,left:16,color:'rgba(255,255,255,0.3)',fontSize:14,pointerEvents:'none',userSelect:'none'}}>
                      Type details for this new meeting
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ CALENDAR / LOGS ══════════════════════════════════ */}
      {view!=='new-meeting'&&(
        <>
          {/* TOP BAR */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',background:'var(--bg-sidebar)',color:'white',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{background:T_PUR,borderRadius:6,padding:'5px 6px',display:'flex',alignItems:'center'}}><CalendarIcon size={17} color="white"/></div>
              <span style={{fontWeight:700,fontSize:18,color:'white'}}>Calendar</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              {/* Meet now – DIFFERENT from new meeting */}
              <button onClick={()=>{setMeetNow({title:'',mode:'all'});setShowMeetNow(true);}}
                style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:4,border:'1px solid rgba(255,255,255,0.25)',background:'rgba(255,255,255,0.08)',color:'white',cursor:'pointer',fontSize:13,fontWeight:500}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.16)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
              ><Video size={14}/> Meet now</button>
              {/* New meeting – opens full-page form */}
              <button onClick={()=>openNewMeeting()}
                style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:4,background:T_PUR,border:'none',color:'white',cursor:'pointer',fontSize:13,fontWeight:600}}
                onMouseEnter={e=>e.currentTarget.style.background=T_PUR_LT}
                onMouseLeave={e=>e.currentTarget.style.background=T_PUR}
              ><Plus size={14}/> New meeting</button>
            </div>
          </div>

          {/* TAB BAR */}
          <div style={{display:'flex',background:'var(--bg-sidebar)',padding:'0 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
            {[{k:'calendar',l:'Calendar'},{k:'logs',l:'Meeting Logs'}].map(({k,l})=>(
              <button key={k} onClick={()=>setView(k)}
                style={{padding:'8px 18px',border:'none',background:'none',cursor:'pointer',color:view===k?T_PUR_LT:'rgba(255,255,255,0.5)',fontWeight:view===k?600:400,fontSize:13,borderBottom:view===k?`2px solid ${T_PUR_LT}`:'2px solid transparent',marginBottom:-1,transition:'all 0.15s'}}>{l}</button>
            ))}
          </div>

          {/* MEETING LOGS */}
          {view==='logs'&&(
            <div style={{flex:1,overflow:'auto',padding:24}}>
              <div style={{background:'var(--bg-secondary)',border:'1px solid var(--border-color)',borderRadius:12,overflow:'hidden'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'var(--bg-primary)'}}>
                      {['Date & Time','Title','Type','Participants'].map(h=>(
                        <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-secondary)',borderBottom:'1px solid var(--border-color)'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.length===0
                      ?<tr><td colSpan={4} style={{padding:'40px',textAlign:'center',color:'var(--text-secondary)'}}>No meetings scheduled yet.</td></tr>
                      :[...meetings].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(m=>(
                        <tr key={m._id} style={{borderBottom:'1px solid var(--border-color)',transition:'background 0.1s'}}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--bg-primary)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                        >
                          <td style={{padding:'12px 16px',fontSize:13,color:'var(--text-secondary)'}}>
                            {new Date(m.date).toLocaleDateString()}
                            {m.time&&<span style={{color:'var(--text-primary)',marginLeft:8,fontWeight:600}}>{m.time}</span>}
                          </td>
                          <td style={{padding:'12px 16px',fontWeight:600,fontSize:14,color:'var(--text-primary)'}}>{m.title}</td>
                          <td style={{padding:'12px 16px'}}>
                            {m.type==='google_meet'
                              ?<div style={{display:'flex',alignItems:'center',gap:6,color:'#4770C6',fontSize:13}}>
                                  <Video size={13}/> Online
                                  {m.link&&<a href={m.link} target="_blank" rel="noopener noreferrer" style={{marginLeft:8,fontSize:11,padding:'3px 10px',borderRadius:4,background:T_PUR,color:'white',textDecoration:'none'}}>Join</a>}
                                </div>
                              :<div style={{display:'flex',alignItems:'center',gap:6,color:'var(--text-secondary)',fontSize:13}}><UsersIcon size={13}/> In Person</div>
                            }
                          </td>
                          <td style={{padding:'12px 16px',fontSize:13,color:'var(--text-secondary)'}}>{m.participants?.length||0} members</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CALENDAR GRID */}
          {view==='calendar'&&(
            <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
              {/* Nav bar */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px',borderBottom:'1px solid var(--border-color)',background:'var(--bg-secondary)',flexShrink:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <button onClick={goToday} style={navBtnBase}>Today</button>
                  <button onClick={()=>navigate(-1)} style={{...navBtnBase,padding:'5px 7px'}}><ChevronLeft size={16}/></button>
                  <button onClick={()=>navigate(1)}  style={{...navBtnBase,padding:'5px 7px'}}><ChevronRight size={16}/></button>
                  <div style={{position:'relative'}} ref={miniCalRef}>
                    <button onClick={()=>setShowMiniCal(v=>!v)}
                      style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:'transparent',border:'none',cursor:'pointer',color:T_PUR_LT,fontWeight:700,fontSize:15}}>
                      {headerLabel()} <span style={{fontSize:11,opacity:0.7}}>▾</span>
                    </button>
                    {showMiniCal&&<MiniCal/>}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  {isCurrentWeek()&&<span style={{fontSize:12,color:'var(--text-secondary)',fontStyle:'italic'}}>You're up to date!</span>}
                  <div style={{position:'relative'}} ref={viewMenuRef}>
                    <button onClick={()=>setShowViewMenu(v=>!v)}
                      style={{...navBtnBase,gap:7}}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="5" height="14" rx="1" fill="currentColor" opacity=".65"/><rect x="7" y="0" width="7" height="6" rx="1" fill="currentColor" opacity=".65"/><rect x="7" y="8" width="7" height="6" rx="1" fill="currentColor" opacity=".65"/></svg>
                      {VIEW_MODES.find(v=>v.key===viewMode)?.label} <span style={{fontSize:10,opacity:0.6}}>▾</span>
                    </button>
                    {showViewMenu&&(
                      <div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:'var(--bg-secondary)',border:'1px solid var(--border-color)',borderRadius:6,padding:4,minWidth:160,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',zIndex:100}}>
                        {VIEW_MODES.map(v=>(
                          <button key={v.key} onClick={()=>{setViewMode(v.key);setShowViewMenu(false);}}
                            style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'9px 14px',border:'none',borderRadius:4,background:viewMode===v.key?'var(--bg-primary)':'transparent',color:'var(--text-primary)',cursor:'pointer',fontSize:13}}
                            onMouseEnter={e=>{if(viewMode!==v.key)e.currentTarget.style.background='var(--bg-primary)';}}
                            onMouseLeave={e=>{if(viewMode!==v.key)e.currentTarget.style.background='transparent';}}
                          >{v.label}{viewMode===v.key&&<Check size={13} color={T_PUR_LT}/>}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Day headers */}
              <div style={{display:'flex',borderBottom:'1px solid var(--border-color)',background:'var(--bg-secondary)',flexShrink:0}}>
                <div style={{width:60,flexShrink:0}}/>
                {days.map((day,i)=>{
                  const td=isToday(day),dn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day.getDay()];
                  return(
                    <div key={i} style={{flex:1,padding:'10px 0 6px',textAlign:'center',borderLeft:'1px solid var(--border-color)'}}>
                      <div style={{fontSize:td?26:22,fontWeight:700,color:td?T_PUR:'var(--text-primary)',lineHeight:1.1}}>{day.getDate()}</div>
                      <div style={{fontSize:11,fontWeight:500,color:td?T_PUR_LT:'var(--text-secondary)',marginTop:2}}>{dn}</div>
                      {td&&<div style={{height:2,background:T_PUR,margin:'4px auto 0',width:'55%',borderRadius:1}}/>}
                    </div>
                  );
                })}
              </div>
              {/* Time grid */}
              <div ref={scrollRef} style={{flex:1,overflowY:'auto',overflowX:'hidden'}}>
                <div style={{display:'flex',position:'relative',minHeight:(END_HOUR-START_HOUR)*SLOT_H}}>
                  <div style={{width:60,flexShrink:0,background:'var(--bg-secondary)',zIndex:2}}>
                    {hours.map(h=>(
                      <div key={h} style={{height:SLOT_H,display:'flex',alignItems:'flex-start',justifyContent:'flex-end',paddingRight:10,boxSizing:'border-box'}}>
                        <span style={{fontSize:10,color:'var(--text-secondary)',transform:'translateY(-7px)',whiteSpace:'nowrap',userSelect:'none'}}>{fmt12h(h)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{flex:1,display:'flex',position:'relative'}}>
                    {days.map((day,di)=>{
                      const dateStr=toDateStr(day),evts=dayMeetings(dateStr),isTodayC=isToday(day);
                      return(
                        <div key={di} style={{flex:1,borderLeft:'1px solid var(--border-color)',position:'relative',background:isTodayC?`${T_PUR}08`:'transparent'}}>
                          {hours.map(h=>(
                            <div key={h} onClick={()=>openNewMeeting(dateStr,`${pad(h)}:00`)}
                              style={{height:SLOT_H,borderBottom:'1px solid var(--border-color)',cursor:'pointer',boxSizing:'border-box',opacity:0.5,transition:'all 0.1s'}}
                              onMouseEnter={e=>{e.currentTarget.style.background=`${T_PUR}12`;e.currentTarget.style.opacity='1';}}
                              onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.opacity='0.5';}}
                            />
                          ))}
                          {evts.map(m=>{const s=evtStyle(m);if(!s)return null;const c=evtColor(m.type);
                            return(
                              <div key={m._id} style={{position:'absolute',top:s.top,left:3,right:3,height:s.height,background:c.bg,borderLeft:`3px solid ${c.border}`,borderRadius:4,padding:'3px 7px',overflow:'hidden',zIndex:3,cursor:'pointer',boxShadow:'0 1px 5px rgba(0,0,0,0.25)'}}>
                                <div style={{fontSize:12,fontWeight:600,color:'white',lineHeight:1.3}}>{m.title}</div>
                                {m.time&&<div style={{fontSize:10,color:'rgba(255,255,255,0.8)',marginTop:1}}>{m.time}</div>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    {timeLineTop!==null&&todayVisible&&(
                      <div style={{position:'absolute',top:timeLineTop,left:0,right:0,zIndex:10,pointerEvents:'none'}}>
                        <div style={{height:2,background:'#E8353B',position:'relative'}}>
                          <div style={{position:'absolute',left:-1,top:'50%',transform:'translateY(-50%)',width:10,height:10,borderRadius:'50%',background:'#E8353B'}}/>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════ MEET NOW MODAL ══════════════════════════════════════ */}
      {showMeetNow&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
          <div style={{background:'#1f1f1f',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,width:420,padding:28,boxShadow:'0 20px 60px rgba(0,0,0,0.6)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:22}}>
              <div style={{background:T_PUR,borderRadius:8,padding:'7px 8px',display:'flex'}}><Video size={18} color="white"/></div>
              <div>
                <h3 style={{margin:0,color:'white',fontSize:17,fontWeight:700}}>Meet now</h3>
                <p style={{margin:0,color:'rgba(255,255,255,0.45)',fontSize:12}}>Start an instant meeting</p>
              </div>
              <button onClick={()=>setShowMeetNow(false)} style={{marginLeft:'auto',background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.color='white'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.4)'}
              ><X size={18}/></button>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.45)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Meeting name (optional)</label>
              <input value={meetNow.title} onChange={e=>setMeetNow(p=>({...p,title:e.target.value}))}
                placeholder={`Meet now – ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`}
                style={{width:'100%',background:'#2a2a2a',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,padding:'9px 12px',color:'white',fontSize:14,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}
                onFocus={e=>e.target.style.borderColor=T_PUR} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.15)'}
              />
            </div>
            <div style={{marginBottom:24}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.45)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Invite</label>
              {[{v:'all',l:'All workspace members'},{v:'me',l:'Just me (private)'}].map(({v,l})=>(
                <label key={v} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,cursor:'pointer',color:'rgba(255,255,255,0.75)',fontSize:13}}>
                  <input type="radio" name="mnMode" value={v} checked={meetNow.mode===v}
                    onChange={()=>setMeetNow(p=>({...p,mode:v}))} style={{accentColor:T_PUR}}/>{l}
                </label>
              ))}
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowMeetNow(false)}
                style={{padding:'8px 18px',borderRadius:4,border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:13}}>Cancel</button>
              <button onClick={startMeetNow}
                style={{padding:'8px 24px',borderRadius:4,border:'none',background:T_PUR,color:'white',cursor:'pointer',fontSize:13,fontWeight:600}}
                onMouseEnter={e=>e.currentTarget.style.background=T_PUR_LT} onMouseLeave={e=>e.currentTarget.style.background=T_PUR}
              >Start meeting</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ ADVANCED OPTIONS MODAL ═════════════════════════════ */}
      {showAdvanced&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#1f1f1f',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,width:640,maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.7)',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 24px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700,color:'white'}}>Meeting options</h2>
              <button onClick={()=>setShowAdv(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.color='white'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.4)'}
              ><X size={20}/></button>
            </div>
            <div style={{display:'flex',flex:1,overflow:'hidden'}}>
              {/* sidebar */}
              <div style={{width:200,borderRight:'1px solid rgba(255,255,255,0.1)',padding:'16px 8px',flexShrink:0}}>
                {[
                  {k:'access',l:'Meeting access',icon:<UsersIcon size={14}/>},
                  {k:'roles', l:'Roles',          icon:<User size={14}/>},
                  {k:'participation',l:'Participation',icon:<AlignLeft size={14}/>},
                ].map(({k,l,icon})=>(
                  <button key={k} onClick={()=>setAdvTab(k)}
                    style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'9px 12px',background:advTab===k?`${T_PUR}40`:'transparent',border:'none',borderRadius:6,color:advTab===k?T_PUR_LT:'rgba(255,255,255,0.55)',cursor:'pointer',fontSize:13,fontWeight:advTab===k?600:400,textAlign:'left',borderLeft:advTab===k?`3px solid ${T_PUR_LT}`:'3px solid transparent'}}>
                    {icon}{l}
                  </button>
                ))}
              </div>
              {/* content */}
              <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
                {advTab==='access'&&(
                  <div>
                    <h3 style={{color:'white',margin:'0 0 4px',fontSize:16,fontWeight:700}}>Meeting access</h3>
                    <div style={{height:1,background:'rgba(255,255,255,0.1)',margin:'16px 0'}}/>
                    <p style={{color:'rgba(255,255,255,0.8)',fontWeight:600,fontSize:13,margin:'0 0 6px'}}>Who can bypass the lobby?</p>
                    <p style={{color:'rgba(255,255,255,0.4)',fontSize:12,margin:'0 0 14px',lineHeight:1.6}}>Based on your meeting policy, people joining without an account, people from untrusted orgs, and people dialing in, may wait in the lobby.</p>
                    <select value={newMtg.advanced.lobbyBypass}
                      onChange={e=>setNewMtg(p=>({...p,advanced:{...p.advanced,lobbyBypass:e.target.value}}))}
                      style={{width:'100%',background:'#2a2a2a',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,padding:'10px 14px',color:'white',fontSize:14,outline:'none'}}>
                      <option value="everyone">Everyone</option>
                      <option value="invited">People who were invited</option>
                      <option value="organizer">Only the organizer</option>
                    </select>
                  </div>
                )}
                {advTab==='roles'&&(
                  <div>
                    <h3 style={{color:'white',margin:'0 0 4px',fontSize:16,fontWeight:700}}>Roles</h3>
                    <div style={{height:1,background:'rgba(255,255,255,0.1)',margin:'16px 0'}}/>
                    <p style={{color:'rgba(255,255,255,0.8)',fontWeight:600,fontSize:13,margin:'0 0 12px'}}>Who can present?</p>
                    <select value={newMtg.advanced.whoCanPresent}
                      onChange={e=>setNewMtg(p=>({...p,advanced:{...p.advanced,whoCanPresent:e.target.value}}))}
                      style={{width:'100%',background:'#2a2a2a',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,padding:'10px 14px',color:'white',fontSize:14,outline:'none'}}>
                      <option value="everyone">Everyone</option>
                      <option value="organizer">Only me (organizer)</option>
                      <option value="workspace">Workspace members only</option>
                    </select>
                  </div>
                )}
                {advTab==='participation'&&(
                  <div>
                    <h3 style={{color:'white',margin:'0 0 4px',fontSize:16,fontWeight:700}}>Participation</h3>
                    <div style={{height:1,background:'rgba(255,255,255,0.1)',margin:'16px 0'}}/>
                    {[{key:'allowReactions',label:'Allow reactions'},{key:'allowChat',label:'Allow meeting chat'}].map(({key,label})=>(
                      <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                        <span style={{color:'rgba(255,255,255,0.85)',fontSize:14}}>{label}</span>
                        <div onClick={()=>setNewMtg(p=>({...p,advanced:{...p.advanced,[key]:!p.advanced[key]}}))}
                          style={{width:40,height:22,borderRadius:11,background:newMtg.advanced[key]?T_PUR:'rgba(255,255,255,0.15)',cursor:'pointer',position:'relative',transition:'background 0.2s'}}>
                          <div style={{position:'absolute',top:3,left:newMtg.advanced[key]?19:3,width:16,height:16,borderRadius:'50%',background:'white',transition:'left 0.2s'}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{padding:'12px 24px',borderTop:'1px solid rgba(255,255,255,0.1)',display:'flex',justifyContent:'flex-end',gap:10,background:'rgba(255,255,255,0.02)'}}>
              <button onClick={()=>setShowAdv(false)}
                style={{padding:'8px 20px',borderRadius:4,border:'none',background:'#3a3a3a',color:'white',cursor:'pointer',fontSize:13,fontWeight:500}}
                onMouseEnter={e=>e.currentTarget.style.background='#4a4a4a'} onMouseLeave={e=>e.currentTarget.style.background='#3a3a3a'}
              >Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meetings;
