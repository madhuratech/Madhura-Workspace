import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView, Animated, Modal, TextInput, Linking, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Clock, Circle, Calendar, Check, X, Paperclip, Download, Flag } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:5000'; // Default, might need adjusting based on env

const FILTERS = ['All', 'To Do', 'In Progress', 'Done'];

const STATUS_CONFIG = {
  'To Do':       { icon: Circle,        color: '#94A3B8' },
  'In Progress': { icon: Clock,         color: '#1b2b4c' },
  'Done':        { icon: CheckCircle2,  color: '#10B981' },
};

const PRIORITY_CONFIG = {
  High:   { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  Medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' },
  Low:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' },
};

const getValidStages = (project) => {
  const types = project?.projectType || ['Software'];
  const hasSoftware = types.some(t => ['Software', 'Website', 'SaaS', 'PaaS'].includes(t));
  let validStages = ['Proposal'];
  if (hasSoftware) validStages.push('Team 1', 'Team 2', 'Team 3', 'Team 4');
  if (types.includes('Digital Marketing')) validStages.push('Team 5');
  if (types.includes('SEO')) validStages.push('Team 6');
  validStages.push('Completed');
  return [...new Set(validStages)];
};

export default function ProjectDetailsScreen({ route, navigation }) {
  const { projectId } = route.params;
  const { user } = useContext(AuthContext);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [workspaceTeams, setWorkspaceTeams] = useState([]);
  const [workspaceId, setWorkspaceId] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  // Modals
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [handoffData, setHandoffData] = useState({ link: '', notes: '', file: null });
  
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);
  const [rollbackData, setRollbackData] = useState({ reason: '', targetStage: '' });
  
  const [stagePopupVisible, setStagePopupVisible] = useState(false);
  const [advancedStageName, setAdvancedStageName] = useState('');

  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    initData();
  }, []);

  const initData = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const wsId = wsRes.data[0]._id;
        setWorkspaceId(wsId);
        await fetchData(wsId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchData = async (wsId) => {
    try {
      const [projRes, tasksRes, teamsRes] = await Promise.all([
        axios.get(`/workspaces/${wsId}/projects/${projectId}`),
        axios.get(`/workspaces/${wsId}/projects/${projectId}/tasks`),
        axios.get(`/workspaces/${wsId}/teams`).catch(() => ({ data: [] }))
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data);
      setWorkspaceTeams(teamsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTaskStatus = async (task) => {
    const cycle = { 'To Do': 'In Progress', 'In Progress': 'Done', 'Done': 'To Do' };
    const newStatus = cycle[task.status] || 'To Do';
    setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: newStatus } : t));
    try {
      await axios.put(`/tasks/${task._id}`, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task', err);
      if (workspaceId) fetchData(workspaceId);
    }
  };

  // --- Pipeline / Workflow Permissions ---
  const getActiveTeamId = () => {
    if (!project || !project.workflowTeams) return null;
    const validStages = getValidStages(project);
    let currentStage = project.stage;
    if (!validStages.includes(currentStage)) currentStage = validStages[0];

    const stageToKey = {
      'Team 1': 'uiux', 'Team 2': 'tech', 'Team 3': 'test', 'Team 4': 'devops',
      'Team 5': 'digitalMarketing', 'Team 6': 'seo',
      'UI/UX': 'uiux', 'Tech': 'tech', 'Test': 'test', 'DevOps': 'devops',
      'Digital Marketing': 'digitalMarketing', 'SEO': 'seo'
    };
    const stageKey = stageToKey[currentStage];
    if (!stageKey) return null;
    return project.workflowTeams[stageKey]?._id || project.workflowTeams[stageKey];
  };

  const isUserActiveTL = () => {
    if (!project || !workspaceTeams.length) return false;
    const activeTeamId = getActiveTeamId();
    if (!activeTeamId) return false;
    const team = workspaceTeams.find(t => String(t._id) === String(activeTeamId));
    if (!team) return false;
    return String(team.leader?._id || team.leader) === String(user?._id);
  };

  const isUserAnyTL = () => {
    if (!project || !workspaceTeams.length) return false;
    for (const key in project.workflowTeams) {
      const teamId = project.workflowTeams[key]?._id || project.workflowTeams[key];
      if (teamId) {
        const team = workspaceTeams.find(t => String(t._id) === String(teamId));
        if (team && String(team.leader?._id || team.leader) === String(user?._id)) return true;
      }
    }
    return false;
  };

  // --- Handoff Logic ---
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (result.assets && result.assets.length > 0) {
        setHandoffData({ ...handoffData, file: result.assets[0] });
      }
    } catch (err) {
      console.log('Document picking cancelled', err);
    }
  };

  const handleAdvanceStageSubmit = async () => {
    setIsUploading(true);
    try {
      let fileUrl = null;
      let fileName = null;

      if (handoffData.file) {
        const formData = new FormData();
        formData.append('file', {
          uri: Platform.OS === 'ios' ? handoffData.file.uri.replace('file://', '') : handoffData.file.uri,
          name: handoffData.file.name,
          type: handoffData.file.mimeType || 'application/octet-stream',
        });
        const uploadRes = await axios.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fileUrl = uploadRes.data.url;
        fileName = uploadRes.data.fileName;
      }

      const res = await axios.put(`/workspaces/${workspaceId}/projects/${projectId}/advance`, {
        deliverableLink: handoffData.link,
        deliverableNotes: handoffData.notes,
        deliverableFileUrl: fileUrl,
        deliverableFileName: fileName
      });
      setProject(res.data);
      setAdvancedStageName(res.data.stage);
      setIsHandoffModalOpen(false);
      setHandoffData({ link: '', notes: '', file: null });
      setStagePopupVisible(true);
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Failed to advance stage' });
    } finally {
      setIsUploading(false);
    }
  };

  // --- Rollback Logic ---
  const handleRollbackRequest = async () => {
    try {
      const res = await axios.post(`/workspaces/${workspaceId}/projects/${projectId}/rollback`, rollbackData);
      setProject(res.data);
      setIsRollbackModalOpen(false);
      setRollbackData({ reason: '', targetStage: '' });
      Toast.show({ type: 'success', text1: 'Rollback requested successfully' });
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Failed to request rollback' });
    }
  };

  const handleRollbackApprove = async (approved) => {
    try {
      const res = await axios.post(`/workspaces/${workspaceId}/projects/${projectId}/rollback/approve`, { approved });
      setProject(res.data);
      Toast.show({ type: 'success', text1: `Rollback ${approved ? 'approved' : 'rejected'}` });
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Failed to process rollback' });
    }
  };

  // Computed stats for tasks
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'Done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const progress = totalTasks > 0 ? doneTasks / totalTasks : 0;
  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

  const renderTask = ({ item, index }) => {
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['To Do'];
    const StatusIcon = statusCfg.icon;
    const priorityCfg = PRIORITY_CONFIG[item.priority];
    const isDone = item.status === 'Done';

    return (
      <View style={[styles.taskCard, isDone && styles.taskCardDone]}>
        <TouchableOpacity onPress={() => toggleTaskStatus(item)} style={styles.statusBtn}>
          <StatusIcon color={statusCfg.color} size={24} />
        </TouchableOpacity>
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.taskBadges}>
            {priorityCfg && (
              <View style={[styles.badge, { backgroundColor: priorityCfg.bg, borderColor: priorityCfg.border }]}>
                <Text style={[styles.badgeText, { color: priorityCfg.text }]}>{item.priority}</Text>
              </View>
            )}
            {item.dueDate && (
              <View style={styles.dateRow}>
                <Calendar color="#94A3B8" size={12} />
                <Text style={styles.dateText}>
                  {new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderPipeline = () => {
    if (!project) return null;
    let stages = getValidStages(project);
    if (stages.length === 0) stages.push('Completed');
    let currentStage = project?.stage;
    if (!stages.includes(currentStage)) currentStage = stages[0];

    return (
      <View style={styles.pipelineContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pipelineScroll}>
          {stages.map((s, i, arr) => {
            const isActive = currentStage === s;
            const isPast = arr.indexOf(currentStage) > i;
            const isLast = i === arr.length - 1;

            return (
              <View key={s} style={styles.pipelineStageWrapper}>
                <View style={styles.pipelineStageInner}>
                  <View style={[styles.pipelineDot, isActive ? styles.pipelineDotActive : isPast ? styles.pipelineDotPast : {}]}>
                    {isPast ? <Check size={14} color="#fff" strokeWidth={3} /> : <Text style={[styles.pipelineDotText, isActive && {color: '#fff'}]}>{i + 1}</Text>}
                  </View>
                  <Text style={[styles.pipelineStageText, isActive && styles.pipelineStageTextActive, isPast && styles.pipelineStageTextPast]}>{s}</Text>
                </View>
                {!isLast && (
                  <View style={styles.pipelineLine}>
                    <View style={[styles.pipelineLineFill, isPast && {width: '100%'}]} />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const hasAccessToActions = isUserAnyTL() || String(project?.coordinator?._id || project?.coordinator) === String(user?._id) || ['super_admin', 'hr'].includes(user?.role);
  const canAdvanceStage = isUserActiveTL() || String(project?.coordinator?._id || project?.coordinator) === String(user?._id) || ['super_admin', 'hr'].includes(user?.role);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────── */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#1b2b4c" size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {project?.title || 'Loading…'}
          </Text>
          <Text style={styles.headerSub}>{project?.description || 'Track project progress.'}</Text>
        </View>
      </Animated.View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1b2b4c" />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item._id}
          renderItem={renderTask}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); initData(); }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Pipeline Tracker */}
              {['super_admin', 'hr', 'team_leader'].includes(user?.role) && renderPipeline()}

              {/* Action Buttons */}
              {project?.stage !== 'Completed' && hasAccessToActions && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={() => setIsRollbackModalOpen(true)} style={[styles.actionBtn, {borderColor: '#ef4444', backgroundColor: '#FEF2F2'}]}>
                    <Text style={[styles.actionBtnText, {color: '#ef4444'}]}>Block / Rollback</Text>
                  </TouchableOpacity>
                  {canAdvanceStage && (
                    <TouchableOpacity onPress={() => setIsHandoffModalOpen(true)} style={[styles.actionBtn, {borderColor: '#10B981', backgroundColor: '#F0FDF4', flex: 1.5}]}>
                      <Flag size={14} color="#10B981" />
                      <Text style={[styles.actionBtnText, {color: '#10B981', marginLeft: 6}]}>Complete Stage</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Rollback Request Banner */}
              {project?.rollbackRequest?.isRequested && (
                <View style={styles.rollbackBanner}>
                  <View style={{flex: 1}}>
                    <Text style={styles.rollbackBannerTitle}><X size={14} color="#ef4444" /> Project Blocked</Text>
                    <Text style={styles.rollbackBannerText}><Text style={{fontWeight: '700'}}>Reason:</Text> {project.rollbackRequest.reason}</Text>
                    <Text style={styles.rollbackBannerText}><Text style={{fontWeight: '700'}}>Target:</Text> {project.rollbackRequest.targetStage}</Text>
                  </View>
                  {hasAccessToActions && (
                    <View style={styles.rollbackBannerActions}>
                      <TouchableOpacity onPress={() => handleRollbackApprove(false)} style={styles.rollbackBtnReject}>
                        <Text style={styles.rollbackBtnRejectText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRollbackApprove(true)} style={styles.rollbackBtnApprove}>
                        <Text style={styles.rollbackBtnApproveText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Deliverables Display */}
              {project?.deliverables && project.deliverables.length > 0 && (
                <View style={styles.deliverablesContainer}>
                  <Text style={styles.deliverablesTitle}>Handoff Deliverables</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight: 16}}>
                    {project.deliverables.map((del, i) => (
                      <View key={i} style={styles.deliverableCard}>
                        <View style={styles.deliverableHeader}>
                          <View style={styles.deliverableStageBadge}><Text style={styles.deliverableStageText}>{del.stage}</Text></View>
                          <Text style={styles.deliverableDate}>{new Date(del.submittedAt).toLocaleDateString()}</Text>
                        </View>
                        {del.fileUrl && (
                          <TouchableOpacity style={styles.deliverableBtn} onPress={() => Linking.openURL(`${API_URL}${del.fileUrl}`)}>
                            <Download size={14} color="#fff" />
                            <Text style={styles.deliverableBtnText} numberOfLines={1}>{del.fileName || 'Download File'}</Text>
                          </TouchableOpacity>
                        )}
                        {del.link && (
                          <TouchableOpacity onPress={() => Linking.openURL(del.link)}>
                            <Text style={styles.deliverableLink} numberOfLines={1}>{del.link}</Text>
                          </TouchableOpacity>
                        )}
                        {del.notes && <Text style={styles.deliverableNotes} numberOfLines={2}>{del.notes}</Text>}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Progress bar */}
              {totalTasks > 0 && (
                <Animated.View style={[styles.progressCard, { opacity: headerFade }]}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Task Progress</Text>
                    <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                  </View>
                </Animated.View>
              )}

              {/* Filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                {FILTERS.map(f => (
                  <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
                    <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {filteredTasks.length === 0 && (
                <View style={styles.emptyBox}>
                  <CheckCircle2 color="#CBD5E1" size={44} />
                  <Text style={styles.emptyTitle}>No {filter === 'All' ? '' : `"${filter}" `}tasks</Text>
                </View>
              )}
            </>
          }
        />
      )}

      {/* Modals */}
      <Modal visible={isHandoffModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stage Handoff</Text>
              <TouchableOpacity onPress={() => setIsHandoffModalOpen(false)}><X size={20} color="#64748B" /></TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Provide necessary links or notes for the next team.</Text>
            
            <Text style={styles.inputLabel}>Upload File</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
              <Paperclip size={20} color="#64748B" />
              <Text style={styles.uploadBtnText} numberOfLines={1}>{handoffData.file ? handoffData.file.name : 'Tap to select a file'}</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Deliverable Link</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              value={handoffData.link}
              onChangeText={t => setHandoffData({...handoffData, link: t})}
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
              placeholder="Instructions..."
              multiline
              value={handoffData.notes}
              onChangeText={t => setHandoffData({...handoffData, notes: t})}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setIsHandoffModalOpen(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleAdvanceStageSubmit} disabled={isUploading}>
                {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Complete Stage</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isRollbackModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: '#ef4444'}]}>Request Rollback</Text>
              <TouchableOpacity onPress={() => setIsRollbackModalOpen(false)}><X size={20} color="#64748B" /></TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Reason for Rollback</Text>
            <TextInput
              style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
              placeholder="Explain why this project cannot proceed..."
              multiline
              value={rollbackData.reason}
              onChangeText={t => setRollbackData({...rollbackData, reason: t})}
            />

            <Text style={styles.inputLabel}>Target Stage (Type name)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. UI/UX"
              value={rollbackData.targetStage}
              onChangeText={t => setRollbackData({...rollbackData, targetStage: t})}
            />
            <Text style={{fontSize: 11, color: '#94A3B8', marginTop: 4, marginBottom: 16}}>Valid: {getValidStages(project).filter(s => s !== 'Completed' && s !== project?.stage).join(', ')}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setIsRollbackModalOpen(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnSubmit, {backgroundColor: '#ef4444'}]} onPress={handleRollbackRequest}>
                <Text style={styles.modalBtnSubmitText}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={stagePopupVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {alignItems: 'center'}]}>
            <View style={{width: 60, height: 60, borderRadius: 30, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 16}}>
              <Check size={32} color="#10B981" />
            </View>
            <Text style={[styles.modalTitle, {marginBottom: 8}]}>Stage Completed!</Text>
            <Text style={{fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24}}>
              The project advanced to the <Text style={{fontWeight: '700', color: '#1b2b4c'}}>{advancedStageName}</Text> stage.
            </Text>
            <TouchableOpacity style={[styles.modalBtnSubmit, {width: '100%', paddingVertical: 14}]} onPress={() => setStagePopupVisible(false)}>
              <Text style={styles.modalBtnSubmitText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1b2b4c' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 120 },

  pipelineContainer: {
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  pipelineScroll: { paddingHorizontal: 16, alignItems: 'center' },
  pipelineStageWrapper: { flexDirection: 'row', alignItems: 'center' },
  pipelineStageInner: { alignItems: 'center', width: 64 },
  pipelineDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC',
    borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 6
  },
  pipelineDotActive: { backgroundColor: '#1b2b4c', borderColor: '#1b2b4c' },
  pipelineDotPast: { backgroundColor: '#10B981', borderColor: '#10B981' },
  pipelineDotText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  pipelineStageText: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  pipelineStageTextActive: { color: '#1b2b4c' },
  pipelineStageTextPast: { color: '#10B981' },
  pipelineLine: { width: 30, height: 2, backgroundColor: '#E2E8F0', marginTop: -18, marginHorizontal: -5 },
  pipelineLineFill: { height: '100%', backgroundColor: '#10B981', width: '0%' },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  rollbackBanner: {
    backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 12,
    padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center'
  },
  rollbackBannerTitle: { fontSize: 13, fontWeight: '700', color: '#ef4444', marginBottom: 4 },
  rollbackBannerText: { fontSize: 12, color: '#1b2b4c' },
  rollbackBannerActions: { marginLeft: 10, gap: 6 },
  rollbackBtnReject: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#fff' },
  rollbackBtnRejectText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  rollbackBtnApprove: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#ef4444' },
  rollbackBtnApproveText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  deliverablesContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 16, paddingRight: 0, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  deliverablesTitle: { fontSize: 14, fontWeight: '700', color: '#1b2b4c', marginBottom: 12 },
  deliverableCard: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', width: 220, marginRight: 12 },
  deliverableHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  deliverableStageBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  deliverableStageText: { fontSize: 10, fontWeight: '700', color: '#2563EB', textTransform: 'uppercase' },
  deliverableDate: { fontSize: 10, color: '#94A3B8' },
  deliverableBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1b2b4c', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 6 },
  deliverableBtnText: { color: '#fff', fontSize: 11, fontWeight: '600', marginLeft: 6, flex: 1 },
  deliverableLink: { fontSize: 12, color: '#2563EB', marginBottom: 4 },
  deliverableNotes: { fontSize: 11, color: '#64748B' },

  // Progress card
  progressCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  progressPct: { fontSize: 13, fontWeight: '700', color: '#1b2b4c' },
  progressTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#1b2b4c', borderRadius: 4 },

  // Filter
  filterRow: { marginBottom: 14 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#1b2b4c', borderColor: '#1b2b4c' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  filterTextActive: { color: '#fff', fontWeight: '700' },

  // Task cards
  taskCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  taskCardDone: { backgroundColor: '#F8FAFC' },
  statusBtn: { marginRight: 12, marginTop: 2 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#1b2b4c', lineHeight: 21, marginBottom: 4 },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#94A3B8' },
  taskDesc: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 8 },
  taskBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: '#94A3B8' },

  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#94A3B8', marginTop: 12 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#fff', width: '100%', borderRadius: 20, padding: 20, elevation: 10, shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.1, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1b2b4c' },
  modalSub: { fontSize: 13, color: '#64748B', marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1b2b4c', marginBottom: 16 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', borderRadius: 10, padding: 14, marginBottom: 16 },
  uploadBtnText: { marginLeft: 10, fontSize: 14, color: '#64748B', flex: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  modalBtnCancel: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F1F5F9' },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  modalBtnSubmit: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#1b2b4c', alignItems: 'center', justifyContent: 'center' },
  modalBtnSubmitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
