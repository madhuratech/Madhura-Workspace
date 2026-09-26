import React, { useState } from 'react';
import { 
  X, ShieldCheck, GitBranch, Clock, HelpCircle, CheckCircle2, 
  ArrowRight, Users, FolderKanban, Calendar, MessageSquare, 
  FileText, Sparkles, CheckSquare, Search, AlertCircle, 
  UserCheck, Shield, Award, CornerDownRight, RefreshCw, Send, Lock
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
      tag: 'Full Authority',
      color: 'from-amber-500/20 to-orange-500/20',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-500',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      icon: ShieldCheck,
      summary: 'Executive leadership with unrestricted access to workspace settings, project rollbacks, audit logs, and strategic decisions.',
      capabilities: [
        'Create, edit, and delete workspaces',
        'Assign and modify user roles across the organization',
        'Approve or reject project stage rollback requests',
        'Broadcast company-wide announcements',
        'Review complete audit logs & activity history',
        'Access all projects, financial metrics, and executive dashboards',
        'Final decision authority on escalated leaves and tickets'
      ],
      responsibilities: [
        'Strategic oversight and governance',
        'Final review of production milestone releases',
        'Workspace resource allocation & user provisioning'
      ]
    },
    {
      id: 'hr',
      name: 'Human Resources (HR)',
      tag: 'People & Operations',
      color: 'from-purple-500/20 to-pink-500/20',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-500',
      badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      icon: Users,
      summary: 'Manages team operations, employee life cycles, attendance audits, leave approvals, and grievance resolution.',
      capabilities: [
        'Manage employee profiles, designations, and teams',
        'Review & approve employee leave and early leave requests',
        'Track daily attendance logs and late punch-in reports (9:40 AM IST cutoff)',
        'Create organization announcements and event schedules',
        'Resolve internal grievances and support tickets',
        'Manage workspace invitations and onboarding',
        'Generate attendance and workforce reports'
      ],
      responsibilities: [
        'Daily attendance verification & punctuality tracking',
        'Timely review of leave requests',
        'Employee grievance handling and policy enforcement'
      ]
    },
    {
      id: 'team_leader',
      name: 'Team Leader (TL / Coordinator)',
      tag: 'Project & Sprint Lead',
      color: 'from-blue-500/20 to-indigo-500/20',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-500',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: Award,
      summary: 'Drives project execution, coordinates sprints, assigns tasks, reviews code/deliverables, and initiates stage progressions.',
      capabilities: [
        'Create projects, define milestones, and breakdown tasks',
        'Assign tasks with priority, estimations, and deadlines',
        'Advance project workflow stages (Planning → Dev → Review → Staging → Live)',
        'Request stage rollbacks with documented reasons for MD approval',
        'Schedule sprint and client meetings',
        'Recommend early leave requests for team members',
        'Monitor team productivity and task burndown'
      ],
      responsibilities: [
        'Daily sprint coordination and roadblock removal',
        'Quality review before promoting project stages',
        'Mentoring team members and tracking deliverables'
      ]
    },
    {
      id: 'employee',
      name: 'Employee / Developer / Designer',
      tag: 'Execution & Deliverables',
      color: 'from-emerald-500/20 to-teal-500/20',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-500',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: UserCheck,
      summary: 'Executes assigned tasks, collaborates across channels, maintains daily punctuality, and submits workflow updates.',
      capabilities: [
        'Daily Punch-In & Punch-Out (Punctual cutoff: 9:40 AM IST)',
        'View and update assigned tasks (To Do → In Progress → Review → Done)',
        'Submit Leave and Early Leave applications with reasons',
        'Participate in Google Meet & Direct video calls',
        'Collaborate via Channel discussions and Direct Messages',
        'Raise support/grievance tickets to HR or IT',
        'Create personal and shared quick notes'
      ],
      responsibilities: [
        'Timely daily check-in and presence status updates',
        'Delivering assigned tasks within sprint deadlines',
        'Proactive communication on blockers or leaves'
      ]
    }
  ];

  const workflows = [
    {
      id: 'project',
      title: 'Project Lifecycle & Stage Rollback Workflow',
      desc: 'How projects progress through quality gates and how rollbacks are governed.',
      steps: [
        {
          num: '01',
          title: 'Project Creation & Scoping',
          actor: 'Super Admin / HR / Coordinator',
          badge: 'Initiation',
          desc: 'Project is created with title, description, team assignments, and deadline.'
        },
        {
          num: '02',
          title: 'Task Breakdown & Assignment',
          actor: 'Team Leader',
          badge: 'Sprint Planning',
          desc: 'Features are broken down into prioritized tasks assigned to specific employees.'
        },
        {
          num: '03',
          title: 'Development & Implementation',
          actor: 'Employees / Dev Team',
          badge: 'Execution',
          desc: 'Tasks are moved from In Progress to Review. Code and deliverables are completed.'
        },
        {
          num: '04',
          title: 'Quality Review & Advancement',
          actor: 'Team Leader',
          badge: 'Stage Promotion',
          desc: 'TL verifies acceptance criteria and advances project stage (Dev → QA → Staging → Live).'
        },
        {
          num: '05',
          title: 'Emergency Rollback Loop (Optional)',
          actor: 'TL Request ➔ MD Approval',
          badge: 'Controlled Rollback',
          desc: 'If defects occur in Staging/Production, TL requests a rollback with audit justification. MD gives final approval.'
        }
      ]
    },
    {
      id: 'attendance',
      title: 'Daily Attendance & Punctuality Policy',
      desc: 'Automatic IST cutoff calculations, late-minute logging, and presence statuses.',
      steps: [
        {
          num: '01',
          title: 'Daily Punch-In (Cutoff 9:40 AM IST)',
          actor: 'All Employees & Staff',
          badge: 'On-Time Tracking',
          desc: 'Punch in from Dashboard or Attendance screen before 9:40 AM IST to be marked "On Time".'
        },
        {
          num: '02',
          title: 'Automatic Late Logging',
          actor: 'System Automated',
          badge: 'Late Policy',
          desc: 'Punch-ins after 9:40 AM IST automatically record the exact minutes late and notify HR.'
        },
        {
          num: '03',
          title: 'Live Presence Status Updates',
          actor: 'User / Teams Dropdown',
          badge: 'Realtime Presence',
          desc: 'Update presence status (Active, Busy, Break, Lunch, Away, Leave) to keep teams informed.'
        },
        {
          num: '04',
          title: 'Evening Punch-Out & Summary',
          actor: 'Employee',
          badge: 'Daily Wrap-up',
          desc: 'Punch out at end of shift. Total working hours and monthly on-time rate update dynamically.'
        }
      ]
    },
    {
      id: 'leave',
      title: 'Leave & Early Leave Approval Hierarchy',
      desc: 'Multi-level approval process ensuring seamless team coverage.',
      steps: [
        {
          num: '01',
          title: 'Application Submission',
          actor: 'Employee',
          badge: 'Request',
          desc: 'Employee submits leave date range, reason, and type (Casual, Sick, Emergency, Early Exit).'
        },
        {
          num: '02',
          title: 'Team Leader Endorsement',
          actor: 'Team Leader',
          badge: 'Workload Check',
          desc: 'TL checks sprint deliverables and endorses or adjusts the request.'
        },
        {
          num: '03',
          title: 'HR & MD Final Approval',
          actor: 'HR / Super Admin',
          badge: 'Final Authorization',
          desc: 'HR/MD formally approves the request. System updates attendance calendar automatically.'
        },
        {
          num: '04',
          title: 'Notification & Calender Sync',
          actor: 'System Automated',
          badge: 'Sync',
          desc: 'Employee receives instant notification toast and status badge changes to "Leave Approved".'
        }
      ]
    },
    {
      id: 'tickets',
      title: 'Internal Helpdesk & Grievance Workflow',
      desc: 'Transparent ticket routing for IT, HR, Administration, and Management.',
      steps: [
        {
          num: '01',
          title: 'Ticket Creation',
          actor: 'Employee / Staff',
          badge: 'Submission',
          desc: 'Submit ticket with priority (Low/Medium/High/Urgent) and target department.'
        },
        {
          num: '02',
          title: 'Assignment & Investigation',
          actor: 'Assigned Resolver (HR/IT/Admin)',
          badge: 'In Progress',
          desc: 'Responsible authority picks up ticket, responds via comments, and works on resolution.'
        },
        {
          num: '03',
          title: 'Resolution & Confirmation',
          actor: 'Resolver & Employee',
          badge: 'Closed',
          desc: 'Issue is marked Resolved. Employee verifies and ticket is archived in audit history.'
        }
      ]
    }
  ];

  const quickTips = [
    {
      title: 'Creating & Switching Workspaces',
      icon: FolderKanban,
      tip: 'Click the workspace badge in the top header to switch between client workspaces or create a new workspace.'
    },
    {
      title: 'Global Search (Search bar)',
      icon: Search,
      tip: 'Use the top search bar to instantly jump to projects, tasks, or colleagues by name or keyword.'
    },
    {
      title: 'Scratchpad Quick Notes',
      icon: FileText,
      tip: 'Click the Sticky Note icon in the header for a quick scratchpad that saves your personal notes automatically.'
    },
    {
      title: 'Instant Video Meetings',
      icon: Calendar,
      tip: 'Launch Google Meet or 1-click in-app Direct Video meetings directly from the Meetings module.'
    },
    {
      title: 'Punctuality Cutoff (9:40 AM)',
      icon: Clock,
      tip: 'Remember to punch in before 9:40 AM IST each working day to maintain a 100% on-time monthly attendance score.'
    },
    {
      title: 'Stage Rollback Protection',
      icon: RefreshCw,
      tip: 'Accidentally pushed a project stage? Team Leaders can submit a rollback request which the Managing Director can review and approve.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-bg-secondary border border-border/80 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden glass relative animate-in zoom-in-95 duration-200">
        
        {/* ── HEADER ── */}
        <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between shrink-0 bg-bg-primary/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-blue/15 text-accent-blue flex items-center justify-center border border-accent-blue/20 shadow-sm">
              <HelpCircle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-text-primary font-outfit">Knowledge Transfer & Help Center</h2>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                  KT Guide
                </span>
              </div>
              <p className="text-xs text-text-secondary">Official handbook for role hierarchies, approval workflows, and daily operations.</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors border border-transparent hover:border-border"
            title="Close Guide"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── NAVIGATION TABS ── */}
        <div className="px-6 py-2.5 border-b border-border/50 bg-bg-secondary/80 flex items-center justify-between gap-2 overflow-x-auto shrink-0 custom-scrollbar">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'roles', label: 'Role Permissions & Matrix', icon: ShieldCheck },
              { id: 'workflows', label: 'Interactive Workflows', icon: GitBranch },
              { id: 'daily', label: 'Daily Routine & Attendance', icon: Clock },
              { id: 'cheatsheet', label: 'Quick Start & Cheatsheet', icon: Sparkles }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/60'
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── BODY CONTENT ── */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-bg-primary/20">

          {/* ════════ TAB 1: ROLES & PERMISSIONS MATRIX ════════ */}
          {activeTab === 'roles' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {rolesData.map(role => {
                  const Icon = role.icon;
                  const isSel = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        isSel 
                          ? `bg-bg-secondary ${role.borderColor} shadow-lg ring-2 ring-accent-blue/20` 
                          : 'bg-bg-secondary/50 border-border/40 hover:border-border hover:bg-bg-secondary'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${role.badgeBg}`}>
                        <Icon size={18} />
                      </div>
                      <h4 className="text-xs font-bold text-text-primary leading-snug">{role.name.split(' (')[0]}</h4>
                      <p className="text-[10px] text-text-secondary mt-1">{role.tag}</p>
                    </button>
                  );
                })}
              </div>

              {/* Selected Role Detail Card */}
              {(() => {
                const current = rolesData.find(r => r.id === selectedRole) || rolesData[0];
                const Icon = current.icon;
                return (
                  <div className={`p-6 rounded-3xl bg-bg-secondary border ${current.borderColor} shadow-soft relative overflow-hidden`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${current.badgeBg}`}>
                          <Icon size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-text-primary font-outfit">{current.name}</h3>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${current.badgeBg}`}>
                            {current.tag}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-text-secondary leading-relaxed mb-6 bg-bg-primary/40 p-4 rounded-2xl border border-border/40">
                      {current.summary}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500" /> Key Permissions & Powers
                        </h4>
                        <ul className="space-y-2">
                          {current.capabilities.map((cap, idx) => (
                            <li key={idx} className="text-xs text-text-secondary flex items-start gap-2 bg-bg-primary/30 p-2.5 rounded-xl border border-border/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent-blue shrink-0 mt-1.5"></span>
                              <span>{cap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Shield size={14} className="text-amber-500" /> Core Responsibilities
                        </h4>
                        <ul className="space-y-2">
                          {current.responsibilities.map((resp, idx) => (
                            <li key={idx} className="text-xs text-text-secondary flex items-start gap-2 bg-bg-primary/30 p-2.5 rounded-xl border border-border/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5"></span>
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

          {/* ════════ TAB 2: INTERACTIVE WORKFLOW FLOWCHARTS ════════ */}
          {activeTab === 'workflows' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Workflow Selector Tabs */}
              <div className="flex items-center gap-2 border-b border-border/40 pb-3 overflow-x-auto custom-scrollbar">
                {workflows.map(wf => (
                  <button
                    key={wf.id}
                    onClick={() => setSelectedWorkflow(wf.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedWorkflow === wf.id 
                        ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30 shadow-sm' 
                        : 'text-text-secondary hover:text-text-primary bg-bg-secondary hover:bg-bg-primary border border-border/40'
                    }`}
                  >
                    {wf.title.split(' & ')[0]}
                  </button>
                ))}
              </div>

              {/* Selected Workflow Flowchart */}
              {(() => {
                const current = workflows.find(w => w.id === selectedWorkflow) || workflows[0];
                return (
                  <div className="p-6 rounded-3xl bg-bg-secondary border border-border/60 shadow-soft">
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-text-primary font-outfit">{current.title}</h3>
                      <p className="text-xs text-text-secondary mt-1">{current.desc}</p>
                    </div>

                    {/* Flowchart Diagram */}
                    <div className="space-y-4 relative">
                      {current.steps.map((step, idx) => (
                        <div key={idx} className="relative">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-bg-primary/50 border border-border/40 hover:border-accent-blue/40 transition-all group">
                            {/* Step Number Circle */}
                            <div className="w-10 h-10 rounded-xl bg-accent-blue/10 text-accent-blue font-black flex items-center justify-center shrink-0 border border-accent-blue/20 group-hover:scale-105 transition-transform font-outfit">
                              {step.num}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h4 className="text-sm font-bold text-text-primary">{step.title}</h4>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                                  {step.badge}
                                </span>
                              </div>
                              <p className="text-xs text-text-secondary leading-relaxed">{step.desc}</p>
                            </div>

                            {/* Actor Badge */}
                            <div className="shrink-0 sm:text-right">
                              <span className="text-[11px] font-bold text-text-primary/80 bg-bg-secondary px-3 py-1 rounded-lg border border-border/60 inline-flex items-center gap-1.5">
                                <Users size={12} className="text-accent-blue" />
                                {step.actor}
                              </span>
                            </div>
                          </div>

                          {/* Connecting Arrow (if not last) */}
                          {idx < current.steps.length - 1 && (
                            <div className="flex justify-center my-1.5">
                              <div className="w-0.5 h-4 bg-border/80"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ════════ TAB 3: DAILY ROUTINE & ATTENDANCE ════════ */}
          {activeTab === 'daily' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-transparent border border-emerald-500/20 shadow-soft">
                <div className="flex items-center gap-3 mb-2">
                  <Clock size={22} className="text-emerald-500" />
                  <h3 className="text-lg font-bold text-text-primary font-outfit">Official Working Hours & Punctuality Policy</h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Madhura Workspace uses automatic Asia/Kolkata (IST) cutoff tracking to ensure transparency and accountability.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-bg-secondary border border-border/60">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <h4 className="text-sm font-bold text-text-primary">On-Time Punch In</h4>
                    <span className="ml-auto text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Before 9:40 AM IST</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Punch in before 9:40 AM IST. Your record is marked as <strong>Present (On Time)</strong> and reflects positively on your monthly attendance metric.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-bg-secondary border border-border/60">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <h4 className="text-sm font-bold text-text-primary">Late Punch In</h4>
                    <span className="ml-auto text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">After 9:40 AM IST</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Punching in past 9:40 AM automatically calculates late minutes from the cutoff and logs it in HR reports.
                  </p>
                </div>
              </div>

              {/* Step-by-step Daily Routine */}
              <div className="p-6 rounded-3xl bg-bg-secondary border border-border/60">
                <h4 className="text-sm font-bold text-text-primary font-outfit mb-4">Recommended Daily Routine</h4>
                
                <div className="space-y-3">
                  {[
                    { time: '09:30 AM', title: 'Punch-in & Status Activation', desc: 'Punch in on Dashboard and set presence status to Active.' },
                    { time: '10:00 AM', title: 'Daily Standup / Tasks Sync', desc: 'Check My Priorities on Dashboard and synchronize with Team Leader.' },
                    { time: '01:30 PM', title: 'Lunch Status Toggle', desc: 'Switch presence status to "Lunch" to avoid unexpected meeting requests.' },
                    { time: '06:30 PM', title: 'Evening Wrap-up & Punch-out', desc: 'Move completed tasks to Done, post sprint notes, and complete daily punch-out.' }
                  ].map((r, i) => (
                    <div key={i} className="flex items-start gap-4 p-3.5 rounded-xl bg-bg-primary/40 border border-border/30">
                      <span className="text-xs font-bold text-accent-blue bg-accent-blue/10 px-2.5 py-1 rounded-lg shrink-0 border border-accent-blue/20">
                        {r.time}
                      </span>
                      <div>
                        <h5 className="text-xs font-bold text-text-primary">{r.title}</h5>
                        <p className="text-[11px] text-text-secondary mt-0.5">{r.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════ TAB 4: CHEATSHEET & FAQ ════════ */}
          {activeTab === 'cheatsheet' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid sm:grid-cols-2 gap-4">
                {quickTips.map((tip, i) => {
                  const Icon = tip.icon;
                  return (
                    <div key={i} className="p-5 rounded-2xl bg-bg-secondary border border-border/60 hover:border-accent-blue/30 transition-colors shadow-soft">
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-8 h-8 rounded-xl bg-accent-blue/10 text-accent-blue flex items-center justify-center border border-accent-blue/20">
                          <Icon size={16} />
                        </div>
                        <h4 className="text-xs font-bold text-text-primary">{tip.title}</h4>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed bg-bg-primary/40 p-3 rounded-xl border border-border/30">
                        {tip.tip}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Frequently Asked Questions */}
              <div className="p-6 rounded-3xl bg-bg-secondary border border-border/60">
                <h4 className="text-sm font-bold text-text-primary font-outfit mb-4">Frequently Asked Questions</h4>
                
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-bg-primary/40 border border-border/30">
                    <h5 className="text-xs font-bold text-text-primary mb-1">Q: How do I request an Early Leave on an urgent situation?</h5>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Go to the Attendance module, click "Request Early Leave", select departure time and reason. Your Team Leader will endorse and HR will issue approval.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-bg-primary/40 border border-border/30">
                    <h5 className="text-xs font-bold text-text-primary mb-1">Q: How do stage rollbacks protect production?</h5>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      If a bug is identified in QA or Staging, Team Leaders can request a rollback to the previous safe phase. The Managing Director receives instant notification to approve the rollback.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-bg-primary/40 border border-border/30">
                    <h5 className="text-xs font-bold text-text-primary mb-1">Q: Can I collaborate across multiple client workspaces?</h5>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Yes! Click the Workspace dropdown in the top header or dashboard to seamlessly switch between all workspaces you have been invited to.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── FOOTER ── */}
        <div className="px-6 py-3.5 border-t border-border/60 bg-bg-primary/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Madhura Tech Enterprise Workspace v2.0</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-indigo text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Got it, Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};

export default HelpGuideModal;
