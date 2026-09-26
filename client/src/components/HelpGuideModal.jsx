import React, { useState } from 'react';
import { 
  X, ShieldCheck, GitBranch, Clock, HelpCircle, CheckCircle2, 
  Users, FolderKanban, Calendar, MessageSquare, 
  FileText, Sparkles, CheckSquare, Search, 
  UserCheck, Shield, Award, RefreshCw, ArrowRight
} from 'lucide-react';

const HelpGuideModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('roles');
  const [selectedRole, setSelectedRole] = useState('super_admin');
  const [selectedWorkflow, setSelectedWorkflow] = useState('project');

  if (!isOpen) return null;

  const rolesData = [
    {
      id: 'super_admin',
      name: 'Super Admin (MD / Director)',
      shortName: 'Super Admin',
      tag: 'Full Authority',
      accentColor: '#f59e0b',
      icon: ShieldCheck,
      summary: 'Executive leadership with unrestricted access to workspace governance, stage rollbacks, audit logs, and strategic provisioning.',
      capabilities: [
        'Create, configure, and delete client workspaces',
        'Assign, update, and manage roles across all team members',
        'Authorize or decline project stage rollback requests',
        'Publish company-wide announcements and notice board bulletins',
        'Inspect full system audit trails and user activity logs',
        'Access all projects, analytics reports, and organization metrics'
      ],
      responsibilities: [
        'Strategic governance and workspace resource management',
        'Final gatekeeper for production releases and rollback approvals',
        'Executive oversight of employee disputes and escalated tickets'
      ]
    },
    {
      id: 'hr',
      name: 'Human Resources (HR)',
      shortName: 'Human Resources',
      tag: 'People & Operations',
      accentColor: '#a855f7',
      icon: Users,
      summary: 'Manages team operations, employee life cycles, attendance audits, leave authorizations, and workplace grievances.',
      capabilities: [
        'Manage employee profiles, designations, and department teams',
        'Review and authorize employee leave and early exit requests',
        'Audit daily attendance logs and late punch-in reports (9:40 AM IST cutoff)',
        'Broadcast organization bulletins and event notices',
        'Investigate and resolve internal helpdesk & grievance tickets',
        'Issue workspace invitations and onboard new hires'
      ],
      responsibilities: [
        'Daily attendance verification and punctuality management',
        'Timely review of leave applications',
        'Policy enforcement and employee support'
      ]
    },
    {
      id: 'team_leader',
      name: 'Team Leader (TL / Coordinator)',
      shortName: 'Team Leader',
      tag: 'Project & Sprint Lead',
      accentColor: '#3b82f6',
      icon: Award,
      summary: 'Drives project execution, coordinates sprint deliverables, assigns tasks, reviews quality, and manages workflow stages.',
      capabilities: [
        'Create projects, define milestones, and breakdown sprint tasks',
        'Assign tasks with priority levels, estimates, and deadlines',
        'Advance project workflow stages (Planning → Dev → Review → Staging → Live)',
        'Submit stage rollback requests with audit reasoning for MD approval',
        'Schedule sprint syncs and client video meetings',
        'Endorse team member early leave applications'
      ],
      responsibilities: [
        'Daily sprint coordination and roadblock removal',
        'Deliverable quality review before advancing project phases',
        'Monitoring team member burndown and task progress'
      ]
    },
    {
      id: 'employee',
      name: 'Employee / Developer / Designer',
      shortName: 'Employee',
      tag: 'Execution & Tasks',
      accentColor: '#10b981',
      icon: UserCheck,
      summary: 'Executes assigned tasks, maintains daily punctuality, collaborates across channels, and logs progress.',
      capabilities: [
        'Daily Punch-In & Punch-Out (Punctual cutoff: 9:40 AM IST)',
        'Track and update assigned tasks (To Do → In Progress → Review → Done)',
        'Submit leave and early exit applications with reasons',
        'Join Google Meet and direct in-app video calls',
        'Communicate via team channels and direct messaging',
        'Raise support and IT grievance tickets'
      ],
      responsibilities: [
        'Timely daily check-in and presence status updates',
        'Completing task deliverables within sprint deadlines',
        'Proactive communication on blockers or leaves'
      ]
    }
  ];

  const workflows = [
    {
      id: 'project',
      title: 'Project Lifecycle & Stage Rollback Flow',
      desc: 'Quality gates governing project stage progression and controlled rollback requests.',
      steps: [
        {
          num: '1',
          title: 'Project Setup & Scoping',
          actor: 'Super Admin / HR / Lead',
          desc: 'Project is created with title, timeline, team assignments, and target milestones.'
        },
        {
          num: '2',
          title: 'Sprint Breakdown & Tasks',
          actor: 'Team Leader',
          desc: 'Features are decomposed into individual prioritized tasks assigned to developers and designers.'
        },
        {
          num: '3',
          title: 'Development & Execution',
          actor: 'Employees / Devs',
          desc: 'Team implements features and transitions tasks to Review status upon completion.'
        },
        {
          num: '4',
          title: 'Quality Review & Stage Advance',
          actor: 'Team Leader',
          desc: 'TL validates acceptance criteria and advances project stage toward Staging / Live.'
        },
        {
          num: '5',
          title: 'Controlled Rollback (If needed)',
          actor: 'TL Request ➔ MD Approval',
          desc: 'If issues emerge in staging/production, TL requests a rollback. MD reviews and approves with full audit logging.'
        }
      ]
    },
    {
      id: 'attendance',
      title: 'Daily Attendance & Punctuality Policy',
      desc: 'Automated 9:40 AM IST cutoff tracking, late-minute logging, and presence statuses.',
      steps: [
        {
          num: '1',
          title: 'Morning Punch-In (Cutoff 9:40 AM IST)',
          actor: 'All Team Members',
          desc: 'Punch in before 9:40 AM IST to be marked "On Time" with 100% punctuality score.'
        },
        {
          num: '2',
          title: 'Automated Late Tracking',
          actor: 'System Automated',
          desc: 'Check-ins after 9:40 AM automatically compute late minutes and log in HR reports.'
        },
        {
          num: '3',
          title: 'Live Presence Status',
          actor: 'Team Member',
          desc: 'Set presence (Active, Busy, Break, Lunch, Away, Leave) from the top-right profile menu.'
        },
        {
          num: '4',
          title: 'Evening Punch-Out',
          actor: 'Team Member',
          desc: 'Punch out at shift end to record working hours and update monthly metrics.'
        }
      ]
    },
    {
      id: 'leave',
      title: 'Leave & Early Exit Approval Hierarchy',
      desc: 'Structured multi-stage approval ensuring seamless workload continuity.',
      steps: [
        {
          num: '1',
          title: 'Application Submission',
          actor: 'Employee',
          desc: 'Submit leave dates, category (Casual/Sick/Emergency/Early Exit), and explanation.'
        },
        {
          num: '2',
          title: 'Team Leader Endorsement',
          actor: 'Team Leader',
          desc: 'TL assesses sprint impact and endorses or adjusts the request.'
        },
        {
          num: '3',
          title: 'HR / MD Final Decision',
          actor: 'HR / Super Admin',
          desc: 'HR or MD formally authorizes the application. Attendance calendar automatically syncs.'
        }
      ]
    },
    {
      id: 'tickets',
      title: 'Internal Helpdesk & Grievance Routing',
      desc: 'Transparent issue resolution for IT, HR, Administration, and Management.',
      steps: [
        {
          num: '1',
          title: 'Ticket Raised',
          actor: 'Employee',
          desc: 'Submit ticket with priority level and target department (HR, IT, Admin).'
        },
        {
          num: '2',
          title: 'Investigation & Resolution',
          actor: 'Assigned Resolver',
          desc: 'Resolver investigates, updates ticket status, and posts comment updates.'
        },
        {
          num: '3',
          title: 'Resolution & Closure',
          actor: 'Resolver & Employee',
          desc: 'Issue is marked Resolved and permanently archived in audit history.'
        }
      ]
    }
  ];

  const quickTips = [
    {
      title: 'Workspace Management',
      icon: FolderKanban,
      tip: 'Only the Managing Director (Super Admin) can create or switch workspaces via the dashboard badge.'
    },
    {
      title: 'Global Search',
      icon: Search,
      tip: 'Use the top search bar to instantly find projects, tasks, or team members across your workspace.'
    },
    {
      title: 'Quick Scratchpad',
      icon: FileText,
      tip: 'Click the Sticky Note icon in the header for a personal scratchpad that saves automatically.'
    },
    {
      title: '1-Click Video Meetings',
      icon: Calendar,
      tip: 'Launch Google Meet or direct in-app video calls directly from the Meetings module.'
    },
    {
      title: 'Punctuality Cutoff (9:40 AM)',
      icon: Clock,
      tip: 'Punch in before 9:40 AM IST every working day to maintain a 100% on-time attendance rating.'
    },
    {
      title: 'Controlled Stage Rollback',
      icon: RefreshCw,
      tip: 'Team Leaders can request project stage rollbacks with audit justification for MD approval.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-bg-primary border border-border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* ── MINIMALIST HEADER ── */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-bg-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-blue/10 text-accent-blue flex items-center justify-center border border-accent-blue/20">
              <HelpCircle size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary leading-tight font-outfit">
                Knowledge Transfer &amp; Help Center
              </h2>
              <p className="text-[11px] text-text-secondary">Role permissions, workflow hierarchies &amp; daily operations</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── MINIMALIST SEGMENTED TABS ── */}
        <div className="px-6 py-2.5 border-b border-border bg-bg-secondary/20 flex items-center gap-1.5 overflow-x-auto shrink-0 custom-scrollbar">
          {[
            { id: 'roles', label: 'Role Permissions', icon: ShieldCheck },
            { id: 'workflows', label: 'Workflow Maps', icon: GitBranch },
            { id: 'daily', label: 'Daily Attendance', icon: Clock },
            { id: 'cheatsheet', label: 'Quick Tips', icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-accent-blue text-white shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── BODY CONTENT ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar space-y-4">

          {/* ════════ TAB 1: ROLES & PERMISSIONS ════════ */}
          {activeTab === 'roles' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Minimalist Role Pill Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {rolesData.map(role => {
                  const isSel = selectedRole === role.id;
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSel 
                          ? 'bg-bg-secondary border-accent-blue shadow-sm ring-1 ring-accent-blue/30' 
                          : 'bg-bg-secondary/30 border-border/60 hover:bg-bg-secondary hover:border-border text-text-secondary'
                      }`}
                    >
                      <Icon size={16} style={{ color: role.accentColor }} className="shrink-0" />
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isSel ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {role.shortName}
                        </p>
                        <p className="text-[10px] text-text-secondary truncate">{role.tag}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Minimalist Role Detail */}
              {(() => {
                const current = rolesData.find(r => r.id === selectedRole) || rolesData[0];
                return (
                  <div className="p-4 sm:p-5 rounded-xl bg-bg-secondary/40 border border-border space-y-4">
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-text-primary">{current.name}</h3>
                        <p className="text-xs text-text-secondary mt-0.5">{current.summary}</p>
                      </div>
                      <span 
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ml-2"
                        style={{ background: `${current.accentColor}15`, color: current.accentColor, border: `1px solid ${current.accentColor}30` }}
                      >
                        {current.tag}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 pt-1">
                      {/* Permissions */}
                      <div>
                        <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          Key Permissions &amp; Capabilities
                        </h4>
                        <ul className="space-y-1.5">
                          {current.capabilities.map((cap, i) => (
                            <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-accent-blue shrink-0 mt-1.5"></span>
                              <span>{cap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Responsibilities */}
                      <div>
                        <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Shield size={13} className="text-amber-500" />
                          Core Responsibilities
                        </h4>
                        <ul className="space-y-1.5">
                          {current.responsibilities.map((resp, i) => (
                            <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-purple-500 shrink-0 mt-1.5"></span>
                              <span>{resp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ════════ TAB 2: WORKFLOWS ════════ */}
          {activeTab === 'workflows' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Minimal workflow pills */}
              <div className="flex items-center gap-1.5 border-b border-border pb-2.5 overflow-x-auto custom-scrollbar">
                {workflows.map(wf => (
                  <button
                    key={wf.id}
                    onClick={() => setSelectedWorkflow(wf.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      selectedWorkflow === wf.id 
                        ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/30 font-bold' 
                        : 'text-text-secondary hover:text-text-primary bg-bg-secondary/40 border border-border/60'
                    }`}
                  >
                    {wf.title.split(' & ')[0]}
                  </button>
                ))}
              </div>

              {(() => {
                const current = workflows.find(w => w.id === selectedWorkflow) || workflows[0];
                return (
                  <div className="p-4 rounded-xl bg-bg-secondary/40 border border-border space-y-3">
                    <div className="border-b border-border/50 pb-2">
                      <h3 className="text-sm font-bold text-text-primary">{current.title}</h3>
                      <p className="text-xs text-text-secondary">{current.desc}</p>
                    </div>

                    <div className="space-y-2 pt-1">
                      {current.steps.map((s, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-bg-primary/50 border border-border/40">
                          <span className="w-5 h-5 rounded-md bg-accent-blue/10 text-accent-blue text-xs font-bold flex items-center justify-center shrink-0 border border-accent-blue/20">
                            {s.num}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-xs font-bold text-text-primary">{s.title}</h5>
                              <span className="text-[10px] text-text-secondary font-medium bg-bg-secondary px-2 py-0.5 rounded border border-border/60 shrink-0">
                                {s.actor}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ════════ TAB 3: DAILY ROUTINE ════════ */}
          {activeTab === 'daily' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-bg-secondary/40 border border-emerald-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">On-Time Punch In</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Before 9:40 AM IST</span>
                  </div>
                  <p className="text-xs text-text-secondary">Marked as Present (On Time) contributing 100% to monthly punctuality score.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-bg-secondary/40 border border-amber-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Late Punch In</span>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">After 9:40 AM IST</span>
                  </div>
                  <p className="text-xs text-text-secondary">Automatically calculates late minutes from the 9:40 AM cutoff for HR review.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg-secondary/40 border border-border space-y-2">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2">Daily Schedule</h4>
                {[
                  { time: '09:30 AM', title: 'Punch-In & Active Status', desc: 'Punch in on Dashboard and set presence to Active.' },
                  { time: '10:00 AM', title: 'Task Priorities Sync', desc: 'Check My Priorities on Dashboard and synchronize with Team Leader.' },
                  { time: '01:30 PM', title: 'Lunch Status Toggle', desc: 'Set presence status to Lunch in the profile menu.' },
                  { time: '06:30 PM', title: 'Evening Wrap-up & Punch-Out', desc: 'Move completed tasks to Done and punch out.' }
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-bg-primary/40 border border-border/30 text-xs">
                    <span className="font-bold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded text-[11px] shrink-0">{r.time}</span>
                    <span className="font-semibold text-text-primary shrink-0">{r.title}:</span>
                    <span className="text-text-secondary truncate">{r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ TAB 4: CHEATSHEET ════════ */}
          {activeTab === 'cheatsheet' && (
            <div className="grid sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
              {quickTips.map((tip, i) => {
                const Icon = tip.icon;
                return (
                  <div key={i} className="p-3.5 rounded-xl bg-bg-secondary/40 border border-border space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-accent-blue" />
                      <h4 className="text-xs font-bold text-text-primary">{tip.title}</h4>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{tip.tip}</p>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* ── MINIMALIST FOOTER ── */}
        <div className="px-6 py-3 border-t border-border bg-bg-secondary/40 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-text-secondary">Madhura Enterprise Workspace</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-accent-blue hover:bg-accent-indigo text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};

export default HelpGuideModal;
