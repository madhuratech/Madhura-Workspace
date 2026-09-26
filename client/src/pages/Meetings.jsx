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
const T_PRIMARY   = 'var(--accent-color)';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const VIEW_MODES  = [{ key:'day',label:'Day' },{ key:'workweek',label:'Work week' },{ key:'week',label:'Week' }];

const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const offset = -new Date().getTimezoneOffset();
const sign = offset >= 0 ? '+' : '-';
const padTz = (num) => String(Math.abs(num)).padStart(2, '0');
const TZ_LABEL = `(UTC${sign}${padTz(Math.floor(Math.abs(offset) / 60))}:${padTz(Math.abs(offset) % 60)}) ${userTimeZone}`;

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
    allDay:false,
    type:'google_meet', link:'', location:'', description:'',
  };
};

// ─── Shared style objects ─────────────────────────────────────────────────────
const teamsField = { width:'100%', background:'transparent', border:'none', color:'var(--text-primary)', fontSize:15, outline:'none', padding:'12px 8px', fontFamily:'inherit', boxSizing:'border-box' };
const darkInput   = (focus=false) => ({ background:'var(--bg-primary)', border:`1px solid ${focus?T_PRIMARY:'var(--border-color)'}`, borderRadius:4, padding:'6px 10px', color:'var(--text-primary)', fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' });
const fieldRow    = { display:'flex', alignItems:'flex-start', gap:14, borderBottom:'1px solid var(--border-color)', minHeight:48 };
const iconCol     = { paddingTop:15, paddingLeft:8, color:'var(--text-secondary)', flexShrink:0, width:28 };
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
    setNewMtg({...base, startDate:dateStr||base.startDate, startTime:timeStr||base.startTime, endDate:dateStr||base.endDate, attendees:[]});
    setAttSearch(''); setView('new-meeting');
  };

  // ── save meeting ──
  const saveMeeting=async()=>{
    if(!newMtg.title.trim()){ showToast('Please add a title','error'); return; }
    if(!workspace) return;
    let ids = [...newMtg.attendees];
    if(user?._id && !ids.includes(user._id)) ids.push(user._id);
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
      <div style={{position:'absolute',top:'100%',left:0,marginTop:6,zIndex:1000,background:'var(--bg-secondary)',border:'1px solid var(--border-color)',borderRadius:8,padding:14,width:248,boxShadow:'0 12px 32px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{MONTHS[month]} {year}</span>
          <div style={{display:'flex',gap:2}}>{['‹','›'].map((ch,i)=>(
            <button key={i} onClick={()=>setMiniCalMo(new Date(year,month+(i?1:-1),1))}
              style={{background:'none',border:'none',color:'var(--text-secondary)',cursor:'pointer',fontSize:16,padding:'2px 6px',borderRadius:4}}
              onMouseEnter={e=>e.currentTarget.style.color='var(--text-primary)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-secondary)'}>{ch}</button>
          ))}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:4}}>
          {['S','M','T','W','T','F','S'].map((d,i)=><div key={i} style={{textAlign:'center',fontSize:11,fontWeight:600,color:'var(--text-tertiary)',paddingBottom:4}}>{d}</div>)}
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
                style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'3px 0',cursor:'pointer',background:inWk?'rgba(59, 130, 246, 0.08)':'transparent',borderRadius:isF&&isL?20:isF?'20px 0 0 20px':isL?'0 20px 20px 0':0}}>
                <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:26,height:26,borderRadius:'50%',fontSize:12,fontWeight:isTd?700:400,background:isTd?T_PRIMARY:'transparent',color:isTd?'var(--accent-text)':inWk?'var(--text-primary)':'var(--text-secondary)'}}>{d}</span>
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
    <div style={{height:'100%',width:'100%',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'inherit',background:'var(--bg-primary)'}}>

      {/* ══════════════════ NEW MEETING FULL-PAGE FORM ════════════════════════ */}
      {view==='new-meeting'&&(
        <div style={{height:'100%',width:'100%',display:'flex',flexDirection:'column',background:'var(--bg-primary)',overflow:'hidden'}}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:px-5 sm:py-3 bg-bg-secondary border-b border-border shrink-0 gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <div style={{background:T_PRIMARY,borderRadius:6,padding:'5px 6px',display:'flex'}}><CalendarIcon size={17} color="var(--accent-text)"/></div>
              <span className="font-bold text-[17px] text-text-primary">New meeting</span>
              <div className="w-px h-5 bg-border mx-1 hidden sm:block"/>
              <button className="bg-transparent border-none text-[var(--accent-color)] font-semibold text-sm cursor-default border-b-2 border-[var(--accent-color)] pb-[2px] hidden sm:block">Details</button>
            </div>
            <div className="flex gap-2.5 w-full sm:w-auto">
              <button onClick={()=>setView('calendar')}
                className="flex-1 sm:flex-none py-1.5 px-4 rounded border border-border bg-transparent text-text-primary text-[13px] hover:bg-bg-secondary transition-colors"
              >Discard</button>
              <button onClick={saveMeeting}
                className="flex-1 sm:flex-none py-1.5 px-6 rounded border-none bg-[var(--accent-color)] text-[var(--accent-text)] text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >Save</button>
            </div>
          </div>

          {/* Form body */}
          <div style={{flex:1,overflowY:'auto',background:'var(--bg-primary)'}}>
            {/* Info banner */}
            <div className="mx-4 md:mx-[60px] my-3 p-3 flex items-center gap-2.5 bg-bg-secondary border border-border rounded-md">
              <Info size={15} color="var(--text-tertiary)" className="shrink-0" />
              <span style={{fontSize:13,color:'var(--text-secondary)'}}>Meetings are shared in real time with all invited participants across the workspace.</span>
            </div>

            <div className="px-4 md:px-[60px] pb-10">

              {/* ── Title ── */}
              <div style={{...fieldRow,alignItems:'center',marginBottom:0}}>
                <div style={iconCol}><Pencil size={16}/></div>
                <input value={newMtg.title} onChange={e=>setNewMtg(p=>({...p,title:e.target.value}))}
                  placeholder="Add title" autoFocus
                  style={{...teamsField,fontSize:22,fontWeight:600,letterSpacing:'-0.02em',padding:'14px 8px'}}
                />
              </div>

              {/* ── Attendees ── */}
              <div style={{...fieldRow,flexDirection:'column',padding:'8px 0'}}>
                <div style={{display:'flex',gap:14,width:'100%',alignItems:'flex-start'}}>
                  <div style={{...iconCol,paddingTop:8}}><UsersIcon size={16}/></div>
                  <div style={{flex:1}}>
                    {/* Selected Attendees chips */}
                    {newMtg.attendees.length>0 && (
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:6}}>
                        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                          {newMtg.attendees.map(id=>{
                            const mem=members.find(m=>m.user?._id===id);
                            if(!mem) return null;
                            return (
                              <span key={id} style={{
                                display:'inline-flex',
                                alignItems:'center',
                                gap:6,
                                padding:'3px 10px 3px 6px',
                                background:'var(--bg-secondary)',
                                border:`1px solid var(--border-color)`,
                                borderRadius:16,
                                fontSize:12,
                                fontWeight:500,
                                color:'var(--text-primary)'
                              }}>
                                <span style={{
                                  width:18,
                                  height:18,
                                  borderRadius:'50%',
                                  background:T_PRIMARY,
                                  color:'var(--accent-text)',
                                  fontSize:10,
                                  fontWeight:700,
                                  display:'inline-flex',
                                  alignItems:'center',
                                  justifyContent:'center'
                                }}>
                                  {mem.user.name?.charAt(0).toUpperCase()}
                                </span>
                                <span>{mem.user.name}</span>
                                <button 
                                  type="button"
                                  onClick={()=>removeAtt(id)} 
                                  style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',padding:0,display:'flex',marginLeft:2}}
                                  onMouseEnter={e=>e.currentTarget.style.color='var(--accent-red)'} 
                                  onMouseLeave={e=>e.currentTarget.style.color='var(--text-secondary)'}
                                  title="Remove attendee"
                                >
                                  <X size={12}/>
                                </button>
                              </span>
                            );
                          })}
                        </div>
                        {newMtg.attendees.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNewMtg(p => ({ ...p, attendees: [] }))}
                            style={{
                              background:'none',
                              border:'none',
                              color:'var(--text-secondary)',
                              fontSize:11,
                              cursor:'pointer',
                              textDecoration:'underline'
                            }}
                            onMouseEnter={e=>e.currentTarget.style.color='var(--accent-red)'}
                            onMouseLeave={e=>e.currentTarget.style.color='var(--text-secondary)'}
                          >
                            Clear all ({newMtg.attendees.length})
                          </button>
                        )}
                      </div>
                    )}
                    {/* Search & dropdown */}
                    <div style={{position:'relative'}}>
                      <input 
                        ref={attInputRef} 
                        value={attSearch}
                        onChange={e=>{setAttSearch(e.target.value);setShowAttDrop(true);}}
                        onFocus={()=>setShowAttDrop(true)}
                        placeholder="Type name or email to add attendees..."
                        style={{...teamsField,fontSize:13,padding:'8px 0'}}
                      />
                      {showAttDrop && (
                        <div ref={attDropRef} style={{
                          position:'absolute',
                          top:'100%',
                          left:0,
                          right:0,
                          background:'var(--bg-primary)',
                          border:'1px solid var(--border-color)',
                          borderRadius:8,
                          zIndex:200,
                          maxHeight:220,
                          overflowY:'auto',
                          boxShadow:'0 10px 30px rgba(0,0,0,0.2)'
                        }}>
                          {filteredAtts.length === 0 ? (
                            <div style={{padding:'12px 16px',color:'var(--text-secondary)',fontSize:12}}>
                              {attSearch ? 'No matching members found' : 'All workspace members are already added'}
                            </div>
                          ) : (
                            filteredAtts.slice(0, 8).map(m => (
                              <div 
                                key={m.user._id} 
                                onClick={()=>addAtt(m.user._id)}
                                style={{
                                  display:'flex',
                                  alignItems:'center',
                                  justifyContent:'space-between',
                                  padding:'8px 12px',
                                  cursor:'pointer',
                                  borderBottom:'1px solid var(--border-color)',
                                  transition:'background 0.12s ease'
                                }}
                                onMouseEnter={e=>e.currentTarget.style.background='var(--bg-secondary)'}
                                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                              >
                                <div style={{display:'flex',alignItems:'center',gap:10}}>
                                  <div style={{
                                    width:28,
                                    height:28,
                                    borderRadius:'50%',
                                    background:T_PRIMARY,
                                    display:'flex',
                                    alignItems:'center',
                                    justifyContent:'center',
                                    fontSize:12,
                                    fontWeight:700,
                                    color:'var(--accent-text)',
                                    flexShrink:0
                                  }}>
                                    {m.user.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{color:'var(--text-primary)',fontSize:13,fontWeight:500}}>{m.user.name}</div>
                                    <div style={{color:'var(--text-secondary)',fontSize:11}}>{m.user.email}</div>
                                  </div>
                                </div>
                                <span style={{
                                  fontSize:10,
                                  textTransform:'capitalize',
                                  padding:'2px 6px',
                                  borderRadius:4,
                                  background:'var(--bg-secondary)',
                                  border:'1px solid var(--border-color)',
                                  color:'var(--text-secondary)'
                                }}>
                                  {m.role?.replace('_', ' ') || 'member'}
                                </span>
                              </div>
                            ))
                          )}
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
                    onFocus={e=>e.target.style.borderColor=T_PRIMARY} onBlur={e=>e.target.style.borderColor='var(--border-color)'}
                  />
                  <select value={newMtg.startTime}
                    onChange={e=>{const st=e.target.value,sm=parseMinutes(st)||0,em=sm+30;setNewMtg(p=>({...p,startTime:st,endTime:`${pad(Math.floor(em/60)%24)}:${pad(em%60)}`}));}}
                    style={{...darkInput(),paddingRight:6}}
                    onFocus={e=>e.target.style.borderColor=T_PRIMARY} onBlur={e=>e.target.style.borderColor='var(--border-color)'}
                  >{TIME_SLOTS.map(s=><option key={s.val} value={s.val}>{s.label}</option>)}</select>
                  <span style={{color:'var(--text-secondary)',fontSize:18}}>→</span>
                  <input type="date" value={newMtg.endDate} min={newMtg.startDate}
                    onChange={e=>setNewMtg(p=>({...p,endDate:e.target.value}))}
                    style={darkInput()}
                    onFocus={e=>e.target.style.borderColor=T_PRIMARY} onBlur={e=>e.target.style.borderColor='var(--border-color)'}
                  />
                  <select value={newMtg.endTime}
                    onChange={e=>setNewMtg(p=>({...p,endTime:e.target.value}))}
                    style={{...darkInput(),paddingRight:6}}
                    onFocus={e=>e.target.style.borderColor=T_PRIMARY} onBlur={e=>e.target.style.borderColor='var(--border-color)'}
                  >{TIME_SLOTS.map(s=><option key={s.val} value={s.val}>{s.label}</option>)}</select>
                  {calcDuration(newMtg.startTime,newMtg.endTime)&&(
                    <span style={{fontSize:13,color:'var(--text-secondary)'}}>{calcDuration(newMtg.startTime,newMtg.endTime)}</span>
                  )}
                  {/* All day toggle */}
                  <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',marginLeft:4}}>
                    <div onClick={()=>setNewMtg(p=>({...p,allDay:!p.allDay}))}
                      style={{width:36,height:20,borderRadius:10,background:newMtg.allDay?T_PRIMARY:'var(--bg-primary)',border:'1px solid var(--border-color)',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                      <div style={{position:'absolute',top:1,left:newMtg.allDay?17:2,width:16,height:16,borderRadius:'50%',background:'var(--accent-text)',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                    </div>
                    <span style={{fontSize:13,color:'var(--text-secondary)'}}>All day</span>
                  </label>
                </div>
              </div>

              {/* ── Meeting type + link ── */}
              <div style={{...fieldRow,alignItems:'flex-start',padding:'6px 0'}}>
                <div style={iconCol}><Video size={16}/></div>
                <div style={{flex:1}}>
                  <select value={newMtg.type} onChange={e=>setNewMtg(p=>({...p,type:e.target.value}))}
                    style={{background:'transparent',border:'none',color:'var(--text-primary)',fontSize:14,cursor:'pointer',outline:'none',padding:'8px 0',fontFamily:'inherit'}}>
                    <option value="google_meet">Online meeting</option>
                    <option value="direct_meet">In Person</option>
                  </select>
                  {newMtg.type==='google_meet'&&(
                    <input value={newMtg.link} onChange={e=>setNewMtg(p=>({...p,link:e.target.value}))}
                      placeholder="Paste meeting link (Zoom, Meet, Teams…)"
                      style={{display:'block',width:'100%',background:'transparent',border:'none',borderBottom:'1px solid var(--border-color)',color:'var(--text-primary)',fontSize:13,outline:'none',padding:'6px 0',fontFamily:'inherit',boxSizing:'border-box',marginTop:2}}
                      onFocus={e=>e.target.style.borderBottomColor=T_PRIMARY}
                      onBlur={e=>e.target.style.borderBottomColor='var(--border-color)'}
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
              <div style={{borderTop:'1px solid var(--border-color)',marginTop:4}}>
                {/* Toolbar */}
                <div style={{display:'flex',alignItems:'center',gap:2,padding:'8px 14px',borderBottom:'1px solid var(--border-color)',flexWrap:'wrap',background:'var(--bg-secondary)'}}>
                  {[{l:'B',cmd:'bold'},{l:'I',cmd:'italic'},{l:'U',cmd:'underline'},{l:'S',cmd:'strikeThrough'}].map(({l,cmd})=>(
                    <button key={cmd} onMouseDown={e=>{e.preventDefault();document.execCommand(cmd,false,null);descRef.current?.focus();}}
                      style={{padding:'3px 8px',background:'transparent',border:'none',cursor:'pointer',color:'var(--text-secondary)',fontSize:13,borderRadius:3,fontWeight:l==='B'?700:400,fontStyle:l==='I'?'italic':'normal',textDecoration:l==='U'?'underline':l==='S'?'line-through':'none'}}
                      onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-primary)';e.currentTarget.style.color='var(--text-primary)';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--text-secondary)';}}
                    >{l}</button>
                  ))}
                  <div style={{width:1,height:18,background:'var(--border-color)',margin:'0 4px'}}/>
                  {['≡','•','1.','«','🔗'].map(l=>(
                    <button key={l} style={{padding:'3px 8px',background:'transparent',border:'none',cursor:'pointer',color:'var(--text-secondary)',fontSize:13,borderRadius:3}}
                      onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-primary)';e.currentTarget.style.color='var(--text-primary)';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--text-secondary)';}}
                    >{l}</button>
                  ))}
                </div>
                {/* Editor area */}
                <div style={{position:'relative'}}>
                  <div ref={descRef} contentEditable suppressContentEditableWarning
                    onFocus={()=>setDescFocus(true)} onBlur={()=>setDescFocus(false)}
                    style={{minHeight:130,padding:'14px 16px',color:'var(--text-primary)',fontSize:14,outline:'none',lineHeight:1.6,fontFamily:'inherit'}}
                  />
                  {!descFocus&&descRef.current&&!descRef.current.textContent&&(
                    <div style={{position:'absolute',top:14,left:16,color:'var(--text-tertiary)',fontSize:14,pointerEvents:'none',userSelect:'none'}}>
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
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',background:'var(--bg-primary)',borderBottom:'1px solid var(--border-color)',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{background:T_PRIMARY,borderRadius:6,padding:'5px 6px',display:'flex',alignItems:'center'}}><CalendarIcon size={17} color="var(--accent-text)"/></div>
              <span style={{fontWeight:700,fontSize:18,color:'var(--text-primary)'}}>Calendar</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              {/* New meeting – opens full-page form */}
              <button onClick={()=>openNewMeeting()}
                style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:4,background:T_PRIMARY,border:'none',color:'var(--accent-text)',cursor:'pointer',fontSize:13,fontWeight:600}}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.9'}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'}
              ><Plus size={14}/> New meeting</button>
            </div>
          </div>

          {/* TAB BAR */}
          <div style={{display:'flex',background:'var(--bg-primary)',padding:'0 16px',borderBottom:'1px solid var(--border-color)',flexShrink:0}}>
            {[{k:'calendar',l:'Calendar'},{k:'logs',l:'Meeting Logs'}].map(({k,l})=>(
              <button key={k} onClick={()=>setView(k)}
                className="relative"
                style={{padding:'12px 18px',border:'none',background:'none',cursor:'pointer',color:view===k?T_PRIMARY:'var(--text-secondary)',fontWeight:view===k?600:500,fontSize:14,transition:'all 0.15s',opacity:view===k?1:0.7}}
              >
                {l}
                {view===k && (
                  <div style={{position:'absolute',bottom:-1,left:0,width:'100%',height:3,backgroundColor:T_PRIMARY,borderRadius:'3px 3px 0 0'}} />
                )}
              </button>
            ))}
          </div>

          {/* MEETING LOGS */}
          {view==='logs'&&(
            <div className="flex-1 overflow-auto p-4 md:p-6 bg-bg-primary">
              <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table style={{width:'100%',borderCollapse:'collapse',minWidth:'600px'}}>
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
                                    {m.link&&<a href={m.link} target="_blank" rel="noopener noreferrer" style={{marginLeft:8,fontSize:11,padding:'3px 10px',borderRadius:4,background:T_PRIMARY,color:'var(--accent-text)',textDecoration:'none'}}>Join</a>}
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
            </div>
          )}

          {/* CALENDAR GRID */}
          {view==='calendar'&&(
            <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg-primary)'}}>
              {/* Nav bar */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px',borderBottom:'1px solid var(--border-color)',background:'var(--bg-secondary)',flexShrink:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <button onClick={goToday} style={navBtnBase}>Today</button>
                  <button onClick={()=>navigate(-1)} style={{...navBtnBase,padding:'5px 7px'}}><ChevronLeft size={16}/></button>
                  <button onClick={()=>navigate(1)}  style={{...navBtnBase,padding:'5px 7px'}}><ChevronRight size={16}/></button>
                  <div style={{position:'relative'}} ref={miniCalRef}>
                    <button onClick={()=>setShowMiniCal(v=>!v)}
                      style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:'transparent',border:'none',cursor:'pointer',color:T_PRIMARY,fontWeight:700,fontSize:15}}>
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
                      <div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:'var(--bg-secondary)',border:'1px solid var(--border-color)',borderRadius:6,padding:4,minWidth:160,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',zIndex:100}}>
                        {VIEW_MODES.map(v=>(
                          <button key={v.key} onClick={()=>{setViewMode(v.key);setShowViewMenu(false);}}
                            style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'9px 14px',border:'none',borderRadius:4,background:viewMode===v.key?'var(--bg-primary)':'transparent',color:'var(--text-primary)',cursor:'pointer',fontSize:13}}
                            onMouseEnter={e=>{if(viewMode!==v.key)e.currentTarget.style.background='var(--bg-primary)';}}
                            onMouseLeave={e=>{if(viewMode!==v.key)e.currentTarget.style.background='transparent';}}
                          >{v.label}{viewMode===v.key&&<Check size={13} color={T_PRIMARY}/>}</button>
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
                      <div style={{fontSize:td?26:22,fontWeight:700,color:td?T_PRIMARY:'var(--text-primary)',lineHeight:1.1}}>{day.getDate()}</div>
                      <div style={{fontSize:11,fontWeight:500,color:td?T_PRIMARY:'var(--text-secondary)',marginTop:2}}>{dn}</div>
                      {td&&<div style={{height:2,background:T_PRIMARY,margin:'4px auto 0',width:'55%',borderRadius:1}}/>}
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
                        <div key={di} style={{flex:1,borderLeft:'1px solid var(--border-color)',position:'relative',background:isTodayC?'rgba(59, 130, 246, 0.08)':'transparent'}}>
                          {hours.map(h=>(
                            <div key={h} onClick={()=>openNewMeeting(dateStr,`${pad(h)}:00`)}
                              style={{height:SLOT_H,borderBottom:'1px solid var(--border-color)',cursor:'pointer',boxSizing:'border-box',opacity:0.5,transition:'all 0.1s'}}
                              onMouseEnter={e=>{e.currentTarget.style.background='rgba(59, 130, 246, 0.08)';e.currentTarget.style.opacity='1';}}
                              onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.opacity='0.5';}}
                            />
                          ))}
                          {evts.map(m=>{const s=evtStyle(m);if(!s)return null;const c=evtColor(m.type);const isShort=s.height<=30;
                            return(
                              <div key={m._id} style={{position:'absolute',top:s.top,left:3,right:3,height:s.height,background:c.bg,borderLeft:`3px solid ${c.border}`,borderRadius:4,padding:isShort?'2px 6px':'4px 8px',overflow:'hidden',zIndex:3,cursor:'pointer',boxShadow:'0 1px 5px rgba(0,0,0,0.1)',display:'flex',flexDirection:isShort?'row':'column',gap:isShort?6:1,alignItems:isShort?'center':'flex-start'}}>
                                <div style={{fontSize:12,fontWeight:600,color:'#fff',lineHeight:1.2,whiteSpace:'nowrap',textOverflow:'ellipsis',overflow:'hidden'}}>{m.title}</div>
                                {m.time&&<div style={{fontSize:10,color:'rgba(255,255,255,0.9)',whiteSpace:'nowrap'}}>{m.time}</div>}
                              </div>
                            );
                          })}
                          {/* Red Line specifically on today's column */}
                          {timeLineTop!==null&&isTodayC&&(
                            <div style={{position:'absolute',top:timeLineTop,left:0,right:0,zIndex:2,pointerEvents:'none'}}>
                              <div style={{height:2,background:'#E8353B',position:'relative'}}>
                                <div style={{position:'absolute',left:-5,top:'50%',transform:'translateY(-50%)',width:10,height:10,borderRadius:'50%',background:'#E8353B'}}/>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Meetings;
