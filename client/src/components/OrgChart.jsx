import React from 'react';
import Avatar from './Avatar';

const OrgChart = ({ members, teams }) => {
  // Identify the hierarchy
  // 1. MDs (Super Admins)
  const mds = members.filter(m => m.role === 'super_admin');
  
  // 2. HRs and Team Leaders
  const hrAndLeaders = members.filter(m => m.role === 'hr' || m.role === 'team_leader');
  
  // 3. Employees not in the above
  const regularEmployees = members.filter(m => m.role === 'employee');

  // Let's organize into a tree structure
  // Root: The main MD (we'll just take the first one or create a dummy "Board" if none)
  const mainMd = mds.length > 0 ? mds[0] : null;
  const otherMds = mds.length > 1 ? mds.slice(1) : [];

  // Find direct reports to MD
  // For simplicity, all HRs and Team Leaders report to MD.
  // Also any employees who are not in any team.
  
  // Map members to their teams
  const memberToTeamMap = {};
  teams.forEach(team => {
    if (team.members) {
      team.members.forEach(tm => {
        const id = tm._id || tm;
        memberToTeamMap[id] = team;
      });
    }
  });

  const getRoleLabel = (role) => {
    if (role === 'super_admin') return 'MD';
    if (role === 'hr') return 'HR Manager';
    if (role === 'team_leader') return 'Team Lead';
    return 'Employee';
  };

  const getRoleColor = (role) => {
    if (role === 'super_admin') return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
    if (role === 'hr') return 'text-accent-blue bg-accent-blue/10 border-accent-blue/20';
    if (role === 'team_leader') return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    return 'text-success bg-success/10 border-success/20';
  };

  const OrgNode = ({ member, isRoot }) => {
    if (!member) return null;
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-bg-primary border border-border hover:border-accent-blue/50 rounded-2xl shadow-sm transition-all min-w-[160px] max-w-[180px] z-10 bg-white dark:bg-bg-secondary">
        <Avatar user={member.user} size="h-12 w-12" textClass="text-lg" showStatus={false} className="mb-3 border-2 border-bg-secondary shadow-sm" />
        <h3 className="font-bold text-text-primary text-sm text-center line-clamp-1 w-full" title={member.user.name}>{member.user.name || 'Pending User'}</h3>
        <span className={`mt-2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleColor(member.role)}`}>
          {getRoleLabel(member.role)}
        </span>
        {member.user.designation && (
          <p className="text-xs text-text-secondary mt-1.5 text-center line-clamp-1 w-full" title={member.user.designation}>
            {member.user.designation}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full overflow-auto bg-bg-secondary p-8 custom-scrollbar relative">
      <style>{`
        .org-tree ul {
          padding-top: 20px;
          position: relative;
          transition: all 0.5s;
          display: flex;
          justify-content: center;
        }
        .org-tree li {
          float: left;
          text-align: center;
          list-style-type: none;
          position: relative;
          padding: 20px 10px 0 10px;
          transition: all 0.5s;
        }
        /* Connectors */
        .org-tree li::before, .org-tree li::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 1.5px solid var(--border);
          width: 50%;
          height: 20px;
        }
        .org-tree li::after {
          right: auto;
          left: 50%;
          border-left: 1.5px solid var(--border);
        }
        /* Remove connectors from singular elements */
        .org-tree li:only-child::after, .org-tree li:only-child::before {
          display: none;
        }
        .org-tree li:only-child {
          padding-top: 0;
        }
        /* Remove left/right connectors from first/last child */
        .org-tree li:first-child::before, .org-tree li:last-child::after {
          border: 0 none;
        }
        /* Add back vertical connectors */
        .org-tree li:last-child::before {
          border-right: 1.5px solid var(--border);
          border-radius: 0 8px 0 0;
        }
        .org-tree li:first-child::after {
          border-radius: 8px 0 0 0;
        }
        /* Vertical connector down from parents */
        .org-tree ul ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 1.5px solid var(--border);
          width: 0;
          height: 20px;
          transform: translateX(-50%);
        }
      `}</style>

      <div className="org-tree inline-block min-w-full flex justify-center">
        <ul>
          <li>
            {mainMd ? (
              <>
                <OrgNode member={mainMd} isRoot />
                <ul>
                  {/* Other MDs if any */}
                  {otherMds.map(md => (
                    <li key={md.user._id}>
                      <OrgNode member={md} />
                    </li>
                  ))}
                  
                  {/* Teams / Leaders */}
                  {teams.map(team => {
                    const leaderMember = members.find(m => m.user._id === (team.leader?._id || team.leader));
                    const teamMembers = members.filter(m => 
                      team.members.some(tm => (tm._id || tm) === m.user._id)
                    );
                    
                    if (!leaderMember && teamMembers.length === 0) return null;
                    
                    return (
                      <li key={team._id}>
                        {leaderMember ? (
                          <OrgNode member={leaderMember} />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 bg-bg-primary border border-dashed border-border rounded-2xl min-w-[160px]">
                            <p className="text-xs font-bold text-text-secondary uppercase">{team.name}</p>
                            <p className="text-[10px] text-text-secondary mt-1">No Leader</p>
                          </div>
                        )}
                        
                        {teamMembers.length > 0 && (
                          <ul>
                            {teamMembers.map(m => (
                              <li key={m.user._id}>
                                <OrgNode member={m} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                  
                  {/* Independent HRs and floating employees */}
                  {hrAndLeaders.filter(hr => !teams.some(t => (t.leader?._id || t.leader) === hr.user._id)).map(hr => (
                    <li key={hr.user._id}>
                      <OrgNode member={hr} />
                    </li>
                  ))}
                  
                  {regularEmployees.filter(emp => !memberToTeamMap[emp.user._id]).map(emp => (
                    <li key={emp.user._id}>
                      <OrgNode member={emp} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="p-8 text-text-secondary text-center">
                <p>No Managing Director (MD) found to root the organization chart.</p>
              </div>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default OrgChart;
