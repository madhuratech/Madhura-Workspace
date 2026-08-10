import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import {
  Plus, X, Video, Users as UsersIcon, Link as LinkIcon, Info,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────
const START_HOUR  = 7;   // 7 AM
const END_HOUR    = 20;  // 8 PM
const SLOT_H      = 64;  // px per 1-hour slot
const T_PURPLE    = '#6264A7';
const T_PURPLE_LT = '#7B83EB';
const MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── Helpers ──────────────────────────────────────────────────
const pad        = n => String(n).padStart(2, '0');
const toDateStr  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const isToday    = d => toDateStr(d) === toDateStr(new Date());
const addDays    = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const getMondayOf = d => {
  const r = new Date(d); r.setHours(0,0,0,0);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
};

const parseMinutes = ts => {
  if (!ts) return null;
  const [h, m] = ts.split(':').map(Number);
  return h * 60 + (m || 0);
};

const fmt12h = h =>
  h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;

const getNowMins = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

// ─── View definitions ─────────────────────────────────────────
const VIEW_MODES = [
  { key: 'day',      label: 'Day',       icon: '▣' },
  { key: 'workweek', label: 'Work week', icon: '▤' },
  { key: 'week',     label: 'Week',      icon: '▦' },
];

// ─── Event colours ────────────────────────────────────────────
const evtColor = type => type === 'google_meet'
  ? { bg: 'rgba(71,112,198,0.85)', border: '#4770C6' }
  : { bg: 'rgba(52,168,83,0.85)',  border: '#34A853' };

// ─── Inline style helpers (uses CSS vars so theme-aware) ───────
const inputStyle = {
  width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
  borderRadius: 6, padding: '9px 12px', color: 'var(--text-primary)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
};

// ═════════════════════════════════════════════════════════════
const Meetings = () => {
  const { user }           = useContext(AuthContext);
  const { showToast }      = useContext(ToastContext);

  /* ── backend data ── */
  const [workspace, setWorkspace] = useState(null);
  const [meetings,  setMeetings]  = useState([]);
  const [members,   setMembers]   = useState([]);
  const [teams,     setTeams]     = useState([]);
  const [loading,   setLoading]   = useState(true);

  /* ── UI state ── */
  const [viewMode,       setViewMode]       = useState('workweek');
  const [weekStart,      setWeekStart]      = useState(getMondayOf(new Date()));
  const [selectedDay,    setSelectedDay]    = useState(new Date());
  const [showViewMenu,   setShowViewMenu]   = useState(false);
  const [showMiniCal,    setShowMiniCal]    = useState(false);
  const [miniCalMonth,   setMiniCalMonth]   = useState(new Date());
  const [nowMins,        setNowMins]        = useState(getNowMins());
  const [activeTab,      setActiveTab]      = useState('calendar');

  /* ── modal state ── */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '', date: '', time: '', type: 'direct_meet', link: '',
    description: '', participantType: 'all', selectedTeam: '',
    selectedRole: 'employee', selectedMembers: [],
  });

  const scrollRef   = useRef(null);
  const viewMenuRef = useRef(null);
  const miniCalRef  = useRef(null);

  /* ── tick every minute for red time line ── */
  useEffect(() => {
    const id = setInterval(() => setNowMins(getNowMins()), 60000);
    return () => clearInterval(id);
  }, []);

  /* ── auto-scroll to current time ── */
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const pos = ((nowMins - START_HOUR * 60) / 60) * SLOT_H - 120;
      scrollRef.current.scrollTop = Math.max(0, pos);
    }
  }, [loading]);

  /* ── click-outside close ── */
  useEffect(() => {
    const h = e => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target)) setShowViewMenu(false);
      if (miniCalRef.current  && !miniCalRef.current.contains(e.target))  setShowMiniCal(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── fetch data ── */
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        setWorkspace(ws);
        const [mRes, dRes, tRes] = await Promise.all([
          axios.get(`/workspaces/${ws._id}/meetings`).catch(() => ({ data: [] })),
          axios.get(`/workspaces/${ws._id}`).catch(() => ({ data: {} })),
          axios.get(`/workspaces/${ws._id}/teams`).catch(() => ({ data: [] })),
        ]);
        setMeetings(mRes.data || []);
        setMembers((dRes.data?.members || []).filter(m => m.user));
        setTeams(tRes.data || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  /* ── which days to display ── */
  const getDays = () => {
    if (viewMode === 'day')      return [selectedDay];
    if (viewMode === 'workweek') return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
    const sun = addDays(weekStart, -1);
    return Array.from({ length: 7 }, (_, i) => addDays(sun, i));
  };
  const days = getDays();

  const isCurrentWeek = () => toDateStr(weekStart) === toDateStr(getMondayOf(new Date()));

  /* ── navigation ── */
  const goToday = () => {
    const n = new Date();
    setWeekStart(getMondayOf(n)); setSelectedDay(n); setMiniCalMonth(n);
  };
  const navigate = dir => {
    if (viewMode === 'day') {
      const next = addDays(selectedDay, dir);
      setSelectedDay(next); setWeekStart(getMondayOf(next));
    } else {
      const delta = viewMode === 'week' ? 7 : 5;
      setWeekStart(prev => addDays(prev, dir * delta));
    }
  };

  /* ── header label ── */
  const headerLabel = () => {
    if (viewMode === 'day')
      return `${MONTHS[selectedDay.getMonth()]} ${selectedDay.getFullYear()}`;
    const first = days[0], last = days[days.length - 1];
    if (first.getMonth() === last.getMonth())
      return `${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
    return `${MONTHS[first.getMonth()]} – ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
  };

  /* ── red time-line top (px) ── */
  const timeLineTop = (() => {
    const s = START_HOUR * 60, e = END_HOUR * 60;
    if (nowMins < s || nowMins >= e) return null;
    return ((nowMins - s) / 60) * SLOT_H;
  })();
  const todayVisible = days.some(d => isToday(d));

  /* ── event helpers ── */
  const dayMeetings = dateStr => meetings.filter(m => new Date(m.date).toISOString().split('T')[0] === dateStr);

  const evtStyle = m => {
    const mins = parseMinutes(m.time);
    if (mins === null) return null;
    if (mins < START_HOUR * 60 || mins >= END_HOUR * 60) return null;
    return { top: ((mins - START_HOUR * 60) / 60) * SLOT_H + 2, height: SLOT_H - 6 };
  };

  /* ── form helpers ── */
  const resetForm = (date = '', time = '') =>
    setFormData({ title:'', date, time, type:'direct_meet', link:'', description:'',
      participantType:'all', selectedTeam:'', selectedRole:'employee', selectedMembers:[] });

  const openModal = (date = '', time = '') => {
    resetForm(date || toDateStr(new Date()), time);
    setIsModalOpen(true);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!workspace) return;
    let ids = [];
    if (formData.participantType === 'all')          ids = members.map(m => m.user._id);
    else if (formData.participantType === 'team')    { const t = teams.find(t => t._id === formData.selectedTeam); if (t) ids = [...t.members.map(m => m._id||m), t.leader._id||t.leader]; }
    else if (formData.participantType === 'role')    ids = members.filter(m => m.role === formData.selectedRole).map(m => m.user._id);
    else if (formData.participantType === 'specific') ids = formData.selectedMembers;
    if (!ids.includes(user._id)) ids.push(user._id);
    try {
      await axios.post(`/workspaces/${workspace._id}/meetings`, {
        title: formData.title, date: formData.date, time: formData.time,
        type: formData.type, link: formData.link, description: formData.description,
        participants: ids,
      });
      showToast('Meeting scheduled!', 'success');
      fetchData(); setIsModalOpen(false);
    } catch (err) { showToast(err.response?.data?.message || 'Error', 'error'); }
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  /* ── Mini Calendar ─────────────────────────────────────────── */
  const MiniCal = () => {
    const year  = miniCalMonth.getFullYear();
    const month = miniCalMonth.getMonth();
    const firstDow    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);

    const visibleSet = new Set(days.map(d => toDateStr(d)));
    const todayStr   = toDateStr(new Date());

    return (
      <div style={{
        position:'absolute', top:'100%', left:0, marginTop:6, zIndex:1000,
        background:'#252525', border:'1px solid rgba(255,255,255,0.14)',
        borderRadius:8, padding:14, width:248,
        boxShadow:'0 12px 32px rgba(0,0,0,0.55)',
      }}>
        {/* month nav */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontWeight:700, fontSize:14, color:'white' }}>{MONTHS[month]} {year}</span>
          <div style={{ display:'flex', gap:2 }}>
            {['‹','›'].map((ch, i) => (
              <button key={i} onClick={() => setMiniCalMonth(new Date(year, month + (i ? 1 : -1), 1))}
                style={{ background:'none', border:'none', color:'rgba(255,255,255,0.55)', cursor:'pointer', fontSize:16, padding:'2px 6px', borderRadius:4 }}
                onMouseEnter={e => e.currentTarget.style.color='white'}
                onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.55)'}
              >{ch}</button>
            ))}
          </div>
        </div>
        {/* S M T W T F S */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
          {['S','M','T','W','T','F','S'].map((d,i) => (
            <div key={i} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', paddingBottom:4 }}>{d}</div>
          ))}
        </div>
        {/* days grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const dt    = new Date(year, month, d);
            const dtStr = toDateStr(dt);
            const inWk  = visibleSet.has(dtStr);
            const isTd  = dtStr === todayStr;
            const prevInWk = i > 0 && cells[i-1] && visibleSet.has(toDateStr(new Date(year, month, cells[i-1])));
            const nextInWk = i < cells.length-1 && cells[i+1] && visibleSet.has(toDateStr(new Date(year, month, cells[i+1])));
            const isFirst  = inWk && !prevInWk;
            const isLast   = inWk && !nextInWk;
            return (
              <div key={i}
                onClick={() => {
                  if (viewMode === 'day') { setSelectedDay(dt); }
                  else { setWeekStart(getMondayOf(dt)); }
                  setShowMiniCal(false);
                }}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'center',
                  padding:'3px 0', cursor:'pointer',
                  background: inWk ? 'rgba(98,100,167,0.4)' : 'transparent',
                  borderRadius: isFirst && isLast ? 20 : isFirst ? '20px 0 0 20px' : isLast ? '0 20px 20px 0' : 0,
                }}
              >
                <span style={{
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  width:26, height:26, borderRadius:'50%', fontSize:12,
                  fontWeight: isTd ? 700 : 400,
                  background: isTd ? T_PURPLE : 'transparent',
                  color: isTd ? 'white' : inWk ? 'white' : 'rgba(255,255,255,0.65)',
                }}>
                  {d}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ══════════════ RENDER ════════════════════════════════════ */
  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary h-full">
      <div className="w-12 h-12 border-4 border-border border-t-accent-blue rounded-full animate-spin mb-4" />
      <p className="text-text-secondary font-medium">Loading calendar…</p>
    </div>
  );
  if (!workspace) return <div className="p-8 text-danger">Please create a workspace first.</div>;

  /* ─── shared nav-button style ─── */
  const navBtn = (extra = {}) => ({
    display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:4,
    border:'1px solid var(--border-color)', background:'transparent', cursor:'pointer',
    color:'var(--text-primary)', fontSize:13, transition:'background 0.12s', ...extra,
  });

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'inherit' }}>

      {/* ══ TOP BAR ══════════════════════════════════════════ */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'10px 16px', background:'var(--bg-sidebar)', color:'white',
        borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ background:T_PURPLE, borderRadius:6, padding:'5px 6px', display:'flex', alignItems:'center' }}>
            <CalendarIcon size={17} color="white" />
          </div>
          <span style={{ fontWeight:700, fontSize:18, color:'white' }}>Calendar</span>
        </div>

        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* Meet now */}
          <button onClick={() => openModal()}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:4, border:'1px solid rgba(255,255,255,0.25)', background:'rgba(255,255,255,0.08)', color:'white', cursor:'pointer', fontSize:13, fontWeight:500 }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.16)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
          >
            <Video size={14} /> Meet now
          </button>
          {/* New meeting */}
          <button onClick={() => openModal()}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:4, background:T_PURPLE, border:'none', color:'white', cursor:'pointer', fontSize:13, fontWeight:600 }}
            onMouseEnter={e => e.currentTarget.style.background=T_PURPLE_LT}
            onMouseLeave={e => e.currentTarget.style.background=T_PURPLE}
          >
            <Plus size={14} /> New meeting
          </button>
        </div>
      </div>

      {/* ══ TAB BAR ══════════════════════════════════════════ */}
      <div style={{ display:'flex', background:'var(--bg-sidebar)', padding:'0 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
        {[{ k:'calendar', l:'Calendar' }, { k:'logs', l:'Meeting Logs' }].map(({ k, l }) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            padding:'8px 18px', border:'none', background:'none', cursor:'pointer',
            color: activeTab === k ? T_PURPLE_LT : 'rgba(255,255,255,0.5)',
            fontWeight: activeTab === k ? 600 : 400, fontSize:13,
            borderBottom: activeTab === k ? `2px solid ${T_PURPLE_LT}` : '2px solid transparent',
            marginBottom:-1, transition:'all 0.15s',
          }}>{l}</button>
        ))}
      </div>

      {/* ══ MEETING LOGS ══════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div style={{ flex:1, overflow:'auto', padding:24 }}>
          <div style={{ background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--bg-primary)' }}>
                  {['Date & Time','Title','Type','Participants'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-secondary)', borderBottom:'1px solid var(--border-color)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {meetings.length === 0
                  ? <tr><td colSpan={4} style={{ padding:'40px', textAlign:'center', color:'var(--text-secondary)' }}>No meetings scheduled yet.</td></tr>
                  : [...meetings].sort((a,b) => new Date(b.date)-new Date(a.date)).map(m => (
                    <tr key={m._id} style={{ borderBottom:'1px solid var(--border-color)', transition:'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
                      <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-secondary)' }}>
                        {new Date(m.date).toLocaleDateString()}
                        {m.time && <span style={{ color:'var(--text-primary)', marginLeft:8, fontWeight:600 }}>{m.time}</span>}
                      </td>
                      <td style={{ padding:'12px 16px', fontWeight:600, fontSize:14, color:'var(--text-primary)' }}>{m.title}</td>
                      <td style={{ padding:'12px 16px' }}>
                        {m.type === 'google_meet'
                          ? <div style={{ display:'flex', alignItems:'center', gap:6, color:'#4770C6', fontSize:13 }}>
                              <Video size={13} /> Online meeting
                              {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft:8, fontSize:11, padding:'3px 10px', borderRadius:4, background:T_PURPLE, color:'white', textDecoration:'none' }}>Join</a>}
                            </div>
                          : <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text-secondary)', fontSize:13 }}>
                              <UsersIcon size={13} /> In Person
                            </div>
                        }
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-secondary)' }}>{m.participants?.length || 0} members</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ CALENDAR VIEW ══════════════════════════════════════ */}
      {activeTab === 'calendar' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* ── Nav bar ── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', borderBottom:'1px solid var(--border-color)', background:'var(--bg-secondary)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {/* Today */}
              <button onClick={goToday} style={navBtn()}>Today</button>
              {/* Prev */}
              <button onClick={() => navigate(-1)} style={navBtn({ padding:'5px 7px' })}><ChevronLeft size={16} /></button>
              {/* Next */}
              <button onClick={() => navigate(1)}  style={navBtn({ padding:'5px 7px' })}><ChevronRight size={16} /></button>
              {/* Month-year + mini calendar */}
              <div style={{ position:'relative' }} ref={miniCalRef}>
                <button onClick={() => setShowMiniCal(v => !v)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'transparent', border:'none', cursor:'pointer', color:T_PURPLE_LT, fontWeight:700, fontSize:15 }}>
                  {headerLabel()}
                  <span style={{ fontSize:11, opacity:0.7 }}>▾</span>
                </button>
                {showMiniCal && <MiniCal />}
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {isCurrentWeek() && (
                <span style={{ fontSize:12, color:'var(--text-secondary)', fontStyle:'italic' }}>You're up to date!</span>
              )}
              {/* View selector */}
              <div style={{ position:'relative' }} ref={viewMenuRef}>
                <button onClick={() => setShowViewMenu(v => !v)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 12px', borderRadius:4, border:'1px solid var(--border-color)', background:'transparent', color:'var(--text-primary)', cursor:'pointer', fontSize:13 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="0" y="0" width="5" height="14" rx="1" fill="currentColor" opacity="0.65"/>
                    <rect x="7" y="0" width="7" height="6"  rx="1" fill="currentColor" opacity="0.65"/>
                    <rect x="7" y="8" width="7" height="6"  rx="1" fill="currentColor" opacity="0.65"/>
                  </svg>
                  {VIEW_MODES.find(v => v.key === viewMode)?.label}
                  <span style={{ fontSize:10, opacity:0.6 }}>▾</span>
                </button>
                {showViewMenu && (
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 4px)', background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:6, padding:4, minWidth:160, boxShadow:'0 8px 24px rgba(0,0,0,0.3)', zIndex:100 }}>
                    {VIEW_MODES.map(v => (
                      <button key={v.key}
                        onClick={() => { setViewMode(v.key); setShowViewMenu(false); }}
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'9px 14px', border:'none', borderRadius:4, background: viewMode === v.key ? 'var(--bg-primary)' : 'transparent', color:'var(--text-primary)', cursor:'pointer', fontSize:13 }}
                        onMouseEnter={e => { if (viewMode !== v.key) e.currentTarget.style.background='var(--bg-primary)'; }}
                        onMouseLeave={e => { if (viewMode !== v.key) e.currentTarget.style.background='transparent'; }}
                      >
                        {v.label}
                        {viewMode === v.key && <Check size={13} color={T_PURPLE_LT} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Day column headers ── */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--border-color)', background:'var(--bg-secondary)', flexShrink:0 }}>
            <div style={{ width:60, flexShrink:0 }} />
            {days.map((day, i) => {
              const td = isToday(day);
              const dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day.getDay()];
              return (
                <div key={i} style={{ flex:1, padding:'10px 0 6px', textAlign:'center', borderLeft:'1px solid var(--border-color)' }}>
                  <div style={{ fontSize: td ? 26 : 22, fontWeight:700, color: td ? T_PURPLE : 'var(--text-primary)', lineHeight:1.1 }}>{day.getDate()}</div>
                  <div style={{ fontSize:11, fontWeight:500, color: td ? T_PURPLE_LT : 'var(--text-secondary)', marginTop:2 }}>{dn}</div>
                  {td && <div style={{ height:2, background:T_PURPLE, margin:'4px auto 0', width:'55%', borderRadius:1 }} />}
                </div>
              );
            })}
          </div>

          {/* ── Scrollable time grid ── */}
          <div ref={scrollRef} style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
            <div style={{ display:'flex', position:'relative', minHeight: (END_HOUR - START_HOUR) * SLOT_H }}>

              {/* Time gutter */}
              <div style={{ width:60, flexShrink:0, background:'var(--bg-secondary)', zIndex:2 }}>
                {hours.map(h => (
                  <div key={h} style={{ height:SLOT_H, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:10, boxSizing:'border-box' }}>
                    <span style={{ fontSize:10, color:'var(--text-secondary)', transform:'translateY(-7px)', whiteSpace:'nowrap', userSelect:'none' }}>
                      {fmt12h(h)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              <div style={{ flex:1, display:'flex', position:'relative' }}>
                {days.map((day, di) => {
                  const dateStr  = toDateStr(day);
                  const evts     = dayMeetings(dateStr);
                  const isTodayC = isToday(day);
                  return (
                    <div key={di} style={{ flex:1, borderLeft:'1px solid var(--border-color)', position:'relative', background: isTodayC ? `${T_PURPLE}08` : 'transparent' }}>
                      {/* Hour rows (click to create) */}
                      {hours.map(h => (
                        <div key={h}
                          onClick={() => openModal(dateStr, `${pad(h)}:00`)}
                          style={{ height:SLOT_H, borderBottom:'1px solid var(--border-color)', cursor:'pointer', boxSizing:'border-box', transition:'background 0.1s', opacity:0.5 }}
                          onMouseEnter={e => { e.currentTarget.style.background=`${T_PURPLE}12`; e.currentTarget.style.opacity='1'; }}
                          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.opacity='0.5'; }}
                        />
                      ))}

                      {/* Events */}
                      {evts.map(m => {
                        const s = evtStyle(m);
                        if (!s) return null;
                        const c = evtColor(m.type);
                        return (
                          <div key={m._id} style={{
                            position:'absolute', top:s.top, left:3, right:3, height:s.height,
                            background:c.bg, borderLeft:`3px solid ${c.border}`, borderRadius:4,
                            padding:'3px 7px', overflow:'hidden', zIndex:3, cursor:'pointer',
                            boxShadow:'0 1px 5px rgba(0,0,0,0.25)',
                          }}>
                            <div style={{ fontSize:12, fontWeight:600, color:'white', lineHeight:1.3 }}>{m.title}</div>
                            {m.time && <div style={{ fontSize:10, color:'rgba(255,255,255,0.8)', marginTop:1 }}>{m.time}</div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* ── Current time red line ── */}
                {timeLineTop !== null && todayVisible && (
                  <div style={{ position:'absolute', top:timeLineTop, left:0, right:0, zIndex:10, pointerEvents:'none' }}>
                    <div style={{ height:2, background:'#E8353B', position:'relative' }}>
                      <div style={{ position:'absolute', left:-1, top:'50%', transform:'translateY(-50%)', width:10, height:10, borderRadius:'50%', background:'#E8353B' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ NEW MEETING MODAL ══════════════════════════════════ */}
      {isModalOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:16 }}>
          <div style={{ background:'var(--bg-secondary)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, width:'100%', maxWidth:520, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.55)', overflow:'hidden' }}>
            {/* header */}
            <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center', background:`linear-gradient(135deg,${T_PURPLE}22,${T_PURPLE}08)` }}>
              <div>
                <h3 style={{ margin:0, fontWeight:700, fontSize:18, color:'var(--text-primary)' }}>New Meeting</h3>
                <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--text-secondary)' }}>Schedule a time to connect with your team.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', padding:4, borderRadius:6 }}
                onMouseEnter={e => e.currentTarget.style.color='#E8353B'}
                onMouseLeave={e => e.currentTarget.style.color='var(--text-secondary)'}
              ><X size={20} /></button>
            </div>

            {/* body */}
            <div style={{ flex:1, overflowY:'auto', padding:24 }}>
              <form id="mtg-form" onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

                <div>
                  <label style={labelStyle}>Meeting Title</label>
                  <input type="text" required value={formData.title}
                    onChange={e => setFormData({...formData, title:e.target.value})}
                    placeholder="e.g. Weekly Standup" style={inputStyle}
                    onFocus={e => e.target.style.borderColor=T_PURPLE}
                    onBlur={e => e.target.style.borderColor='var(--border-color)'}
                  />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                  <div>
                    <label style={labelStyle}>Date</label>
                    <input type="date" required min={new Date().toISOString().split('T')[0]}
                      value={formData.date} onChange={e => setFormData({...formData, date:e.target.value})}
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor=T_PURPLE}
                      onBlur={e => e.target.style.borderColor='var(--border-color)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Time</label>
                    <input type="time" value={formData.time}
                      onChange={e => setFormData({...formData, time:e.target.value})}
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor=T_PURPLE}
                      onBlur={e => e.target.style.borderColor='var(--border-color)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type:e.target.value})} style={inputStyle}
                      onFocus={e => e.target.style.borderColor=T_PURPLE}
                      onBlur={e => e.target.style.borderColor='var(--border-color)'}
                    >
                      <option value="direct_meet">In Person</option>
                      <option value="google_meet">Online meeting</option>
                    </select>
                  </div>
                </div>

                {formData.type === 'google_meet' && (
                  <div>
                    <label style={labelStyle}>Meeting Link</label>
                    <input type="url" value={formData.link}
                      onChange={e => setFormData({...formData, link:e.target.value})}
                      placeholder="https://meet.google.com/xxx-xxxx-xxx" style={inputStyle}
                      onFocus={e => e.target.style.borderColor=T_PURPLE}
                      onBlur={e => e.target.style.borderColor='var(--border-color)'}
                    />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Description (Optional)</label>
                  <textarea value={formData.description}
                    onChange={e => setFormData({...formData, description:e.target.value})}
                    rows={2} style={{ ...inputStyle, resize:'none' }}
                    onFocus={e => e.target.style.borderColor=T_PURPLE}
                    onBlur={e => e.target.style.borderColor='var(--border-color)'}
                  />
                </div>

                <div style={{ background:'var(--bg-primary)', border:'1px solid var(--border-color)', borderRadius:8, padding:16 }}>
                  <p style={{ margin:'0 0 10px', fontWeight:600, fontSize:13, color:'var(--text-primary)' }}>Add Participants By</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:12 }}>
                    {[
                      { val:'all',      label:'All Members'       },
                      { val:'team',     label:'Specific Team'     },
                      { val:'role',     label:'Specific Role'     },
                      { val:'specific', label:'Select Individuals'},
                    ].map(opt => (
                      <label key={opt.val} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer', color:'var(--text-secondary)' }}>
                        <input type="radio" name="pType" value={opt.val}
                          checked={formData.participantType === opt.val}
                          onChange={() => setFormData({...formData, participantType:opt.val})}
                          style={{ accentColor:T_PURPLE }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>

                  {formData.participantType === 'team' && (
                    <select value={formData.selectedTeam} onChange={e => setFormData({...formData, selectedTeam:e.target.value})} required
                      style={{ ...inputStyle, background:'var(--bg-secondary)' }}>
                      <option value="">— Choose Team —</option>
                      {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                  )}

                  {formData.participantType === 'role' && (
                    <select value={formData.selectedRole} onChange={e => setFormData({...formData, selectedRole:e.target.value})} required
                      style={{ ...inputStyle, background:'var(--bg-secondary)' }}>
                      <option value="super_admin">MD (Managing Director)</option>
                      <option value="hr">HR</option>
                      <option value="team_leader">Team Leaders</option>
                      <option value="employee">Employees</option>
                    </select>
                  )}

                  {formData.participantType === 'specific' && (
                    <div style={{ maxHeight:140, overflowY:'auto', border:'1px solid var(--border-color)', borderRadius:6, padding:8, background:'var(--bg-secondary)' }}>
                      {members.filter(m => m.user._id !== user._id).map(m => (
                        <label key={m.user._id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 8px', borderRadius:4, cursor:'pointer' }}>
                          <input type="checkbox"
                            checked={formData.selectedMembers.includes(m.user._id)}
                            onChange={e => {
                              if (e.target.checked) setFormData({...formData, selectedMembers:[...formData.selectedMembers, m.user._id]});
                              else setFormData({...formData, selectedMembers:formData.selectedMembers.filter(id => id !== m.user._id)});
                            }}
                            style={{ accentColor:T_PURPLE }}
                          />
                          <div>
                            <div style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>{m.user.name}</div>
                            <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{m.role.replace('_',' ')}</div>
                          </div>
                        </label>
                      ))}
                      {members.length <= 1 && <p style={{ fontSize:12, color:'var(--text-secondary)', padding:4 }}>No other members available.</p>}
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* footer */}
            <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border-color)', display:'flex', justifyContent:'flex-end', gap:10, background:'var(--bg-primary)' }}>
              <button type="button" onClick={() => setIsModalOpen(false)}
                style={{ padding:'8px 18px', border:'1px solid var(--border-color)', borderRadius:6, background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:13 }}>
                Cancel
              </button>
              <button type="submit" form="mtg-form"
                style={{ padding:'8px 22px', border:'none', borderRadius:6, background:T_PURPLE, color:'white', cursor:'pointer', fontSize:13, fontWeight:600, boxShadow:`0 2px 10px ${T_PURPLE}55` }}
                onMouseEnter={e => e.currentTarget.style.background=T_PURPLE_LT}
                onMouseLeave={e => e.currentTarget.style.background=T_PURPLE}
              >
                Schedule Meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meetings;
