import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Calendar, Clock, CheckCircle, XCircle, FileText, Check, X, LogIn, LogOut } from 'lucide-react';

const AttendanceLeave = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('employee');
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'leave'
  
  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);

  // Leave State
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveData, setLeaveData] = useState({ type: 'Sick', startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const fetchWorkspaceData = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const currentWs = wsRes.data[0];
        setWorkspace(currentWs);
        
        const detailRes = await axios.get(`/workspaces/${currentWs._id}`);
        const validMembers = (detailRes.data.members || []).filter(m => m.user);
        
        const me = validMembers.find(m => m.user._id === user._id);
        if (me) {
          setCurrentUserRole(me.role);
        }
        
        fetchAttendance(currentWs._id);
        fetchLeaves(currentWs._id);
      }
    } catch (error) {
      console.error('Error fetching workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (wsId) => {
    try {
      const res = await axios.get(`/workspaces/${wsId}/attendance`);
      setAttendanceRecords(res.data);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRecord = res.data.find(r => r.date === todayStr && r.user?._id === user._id);
      
      if (todayRecord) {
        setIsCheckedIn(true);
        if (todayRecord.checkOut) {
          setIsCheckedOut(true);
        }
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchLeaves = async (wsId) => {
    try {
      const res = await axios.get(`/workspaces/${wsId}/leaves`);
      setLeaveRecords(res.data);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      await axios.post(`/workspaces/${workspace._id}/attendance/checkin`);
      showToast('Checked in successfully!', 'success');
      setIsCheckedIn(true);
      fetchAttendance(workspace._id);
    } catch (error) {
      showToast(error.response?.data?.message || 'Check-in failed', 'error');
    }
  };

  const handleCheckOut = async () => {
    try {
      await axios.put(`/workspaces/${workspace._id}/attendance/checkout`);
      showToast('Checked out successfully!', 'success');
      setIsCheckedOut(true);
      fetchAttendance(workspace._id);
    } catch (error) {
      showToast(error.response?.data?.message || 'Check-out failed', 'error');
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!workspace) return;
    try {
      await axios.post(`/workspaces/${workspace._id}/leaves`, leaveData);
      showToast('Leave applied successfully!', 'success');
      setIsLeaveModalOpen(false);
      setLeaveData({ type: 'Sick', startDate: '', endDate: '', reason: '' });
      fetchLeaves(workspace._id);
    } catch (error) {
      showToast(error.response?.data?.message || 'Error applying for leave', 'error');
    }
  };

  const handleLeaveStatus = async (leaveId, status) => {
    try {
      await axios.put(`/workspaces/${workspace._id}/leaves/${leaveId}/status`, { status });
      showToast(`Leave ${status.toLowerCase()} successfully`, 'success');
      fetchLeaves(workspace._id);
    } catch (error) {
      showToast(error.response?.data?.message || 'Error updating status', 'error');
    }
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary h-full animate-fade-in">
      <div className="w-12 h-12 border-4 border-border border-t-accent-blue rounded-full animate-spin mb-4"></div>
      <p className="text-text-secondary font-medium">Loading workspace...</p>
    </div>
  );
  if (!workspace) return <div className="p-8 text-danger">Please create a workspace first.</div>;

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">Attendance & Leave</h1>
          <p className="text-text-secondary mt-1">Manage your attendance and leave requests.</p>
        </div>
        <div className="flex space-x-3">
          {activeTab === 'leave' && (
            <button onClick={() => setIsLeaveModalOpen(true)} className="bg-[#4285f4] text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-colors text-sm font-semibold flex items-center shadow-md">
              <span>Apply Leave</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-border mb-6">
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'attendance' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Attendance Log
        </button>
        <button 
          onClick={() => setActiveTab('leave')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'leave' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Leave Requests
        </button>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto flex-1 p-4">
          {activeTab === 'attendance' ? (
            <div className="flex flex-col h-full">
              {/* Modern Check In / Check Out Area */}
              <div className="bg-bg-primary rounded-2xl border border-border p-6 mb-6 flex flex-col md:flex-row items-center justify-between shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Today's Attendance</h3>
                  <p className="text-sm text-text-secondary">Log your daily working hours.</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                  {isCheckedIn ? (
                    <div className="flex items-center space-x-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Status</p>
                        <p className="text-sm text-success font-medium flex items-center justify-end"><CheckCircle size={14} className="mr-1"/> Checked In</p>
                      </div>
                      {!isCheckedOut ? (
                        <button onClick={handleCheckOut} className="bg-orange-500 text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-all font-semibold flex items-center shadow-lg hover:shadow-orange-500/25 active:scale-95">
                          <LogOut size={18} className="mr-2" />
                          Check Out
                        </button>
                      ) : (
                        <div className="bg-bg-secondary border border-border px-6 py-3 rounded-xl text-text-secondary font-medium flex items-center">
                          <CheckCircle size={18} className="mr-2" />
                          Checked Out
                        </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={handleCheckIn} className="bg-[#4285f4] text-white px-8 py-3 rounded-xl hover:bg-blue-600 transition-all font-semibold flex items-center shadow-lg hover:shadow-blue-500/25 active:scale-95">
                      <LogIn size={18} className="mr-2" />
                      Check In Now
                    </button>
                  )}
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th className="text-left w-48">DATE</th>
                    <th className="text-left">EMPLOYEE</th>
                    <th className="text-left w-32">STATUS</th>
                    <th className="text-left w-32">CHECK IN</th>
                    <th className="text-left w-32">CHECK OUT</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map(record => (
                    <tr key={record._id}>
                      <td className="font-medium text-text-primary">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td className="text-text-secondary">{record.user?.name}</td>
                      <td>
                        <span className="px-2 py-1 rounded text-xs font-medium text-success bg-success/10">
                          {record.status}
                        </span>
                      </td>
                      <td className="text-text-secondary">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="text-text-secondary">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    </tr>
                  ))}
                  {attendanceRecords.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-text-secondary">No attendance records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-8 p-2">
              <div>
                <h3 className="text-lg font-bold text-text-primary mb-4 px-2">My Leaves</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="text-left w-32">TYPE</th>
                      <th className="text-left">DURATION</th>
                      <th className="text-left w-32">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRecords.filter(l => l.user?._id === user._id).map(leave => (
                      <tr key={leave._id}>
                        <td className="font-medium text-text-primary">{leave.type}</td>
                        <td className="text-text-secondary">
                          {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                          <br />
                          <span className="text-xs opacity-70">{leave.reason}</span>
                        </td>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            leave.status === 'Approved' ? 'text-success bg-success/10' :
                            leave.status === 'Rejected' ? 'text-danger bg-danger/10' :
                            'text-orange-500 bg-orange-500/10'
                          }`}>
                            {leave.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {leaveRecords.filter(l => l.user?._id === user._id).length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center py-8 text-text-secondary">No leave requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {(currentUserRole === 'super_admin' || currentUserRole === 'hr' || currentUserRole === 'team_leader') && (
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-4 px-2">Team Leave Requests</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="text-left w-48">EMPLOYEE</th>
                        <th className="text-left w-32">TYPE</th>
                        <th className="text-left">DURATION</th>
                        <th className="text-left w-32">STATUS</th>
                        <th className="text-right w-32">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRecords.filter(l => l.user?._id !== user._id).map(leave => (
                        <tr key={leave._id}>
                          <td className="font-medium text-text-primary">{leave.user?.name}</td>
                          <td className="text-text-secondary">{leave.type}</td>
                          <td className="text-text-secondary">
                            {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                            <br />
                            <span className="text-xs opacity-70">{leave.reason}</span>
                          </td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              leave.status === 'Approved' ? 'text-success bg-success/10' :
                              leave.status === 'Rejected' ? 'text-danger bg-danger/10' :
                              'text-orange-500 bg-orange-500/10'
                            }`}>
                              {leave.status}
                            </span>
                          </td>
                          <td className="text-right space-x-2 whitespace-nowrap">
                            {leave.status === 'Pending' ? (
                              <>
                                <button onClick={() => handleLeaveStatus(leave._id, 'Approved')} className="text-success hover:bg-success/10 p-1.5 rounded transition-colors" title="Approve"><Check size={18} /></button>
                                <button onClick={() => handleLeaveStatus(leave._id, 'Rejected')} className="text-danger hover:bg-danger/10 p-1.5 rounded transition-colors" title="Reject"><X size={18} /></button>
                              </>
                            ) : (
                              <span className="text-xs text-text-secondary">By: {leave.approvedBy?.name}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {leaveRecords.filter(l => l.user?._id !== user._id).length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-text-secondary">No team leave requests found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E5E7EB] p-6 rounded-3xl w-full max-w-[420px] shadow-2xl relative">
            <button onClick={() => setIsLeaveModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-[#111827] mb-6">Apply for Leave</h3>
            
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-[#6B7280] text-sm font-medium mb-1.5">Leave Type</label>
                <select 
                  value={leaveData.type} onChange={e => setLeaveData({...leaveData, type: e.target.value})}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] text-sm focus:outline-none focus:border-[#4285f4] focus:ring-1 focus:ring-[#4285f4] transition-all appearance-none bg-no-repeat"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23111827%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundPosition: 'right 1rem center', backgroundSize: '0.65em auto' }}
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Earned">Earned Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#6B7280] text-sm font-medium mb-1.5">Start Date</label>
                  <input 
                    type="date" required 
                    value={leaveData.startDate} onChange={e => setLeaveData({...leaveData, startDate: e.target.value})}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] text-sm focus:outline-none focus:border-[#4285f4] focus:ring-1 focus:ring-[#4285f4] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[#6B7280] text-sm font-medium mb-1.5">End Date</label>
                  <input 
                    type="date" required 
                    value={leaveData.endDate} onChange={e => setLeaveData({...leaveData, endDate: e.target.value})}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] text-sm focus:outline-none focus:border-[#4285f4] focus:ring-1 focus:ring-[#4285f4] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#6B7280] text-sm font-medium mb-1.5">Reason</label>
                <textarea 
                  required rows="3"
                  value={leaveData.reason} onChange={e => setLeaveData({...leaveData, reason: e.target.value})}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm focus:outline-none focus:border-[#4285f4] focus:ring-1 focus:ring-[#4285f4] transition-all resize-none placeholder-gray-400"
                  placeholder="Reason for taking leave..."
                ></textarea>
              </div>
              <div className="flex justify-end items-center space-x-6 pt-4">
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="text-[#6B7280] hover:text-[#111827] font-semibold text-sm transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-[#4285f4] text-white rounded-xl hover:bg-blue-600 font-semibold text-sm shadow-sm transition-colors">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceLeave;
