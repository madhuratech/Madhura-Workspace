import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Platform, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, Check } from 'lucide-react-native';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../context/AuthContext';
import { cachedGet } from '../utils/api';

const PRIMARY = '#1b2b4c';
const AVAILABLE_TYPES = ['Software', 'Website', 'SaaS', 'PaaS', 'Digital Marketing', 'SEO'];

export default function CreateProjectScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectTypes, setProjectTypes] = useState(['Software']);
  const [coordinator, setCoordinator] = useState(user?._id);
  const [workflowTeams, setWorkflowTeams] = useState({
    uiux: null, tech: null, test: null, devops: null,
    digitalMarketing: null, seo: null
  });
  
  const [loading, setLoading] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [workspaceTeams, setWorkspaceTeams] = useState([]);

  // Modals for selection
  const [coordModal, setCoordModal] = useState(false);
  const [teamModal, setTeamModal] = useState({ visible: false, stageKey: null });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const ws = await cachedGet('/workspaces');
      if (ws && ws.length > 0) {
        const [memRes, teamRes] = await Promise.all([
          cachedGet(`/workspaces/${ws[0]._id}/projects/members`),
          cachedGet(`/workspaces/${ws[0]._id}/teams`)
        ]);
        if (Array.isArray(memRes)) setWorkspaceMembers(memRes.map(m => m.user).filter(Boolean));
        if (Array.isArray(teamRes)) setWorkspaceTeams(teamRes);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleType = (type) => {
    if (projectTypes.includes(type)) {
      if (projectTypes.length > 1) {
        setProjectTypes(projectTypes.filter(t => t !== type));
      }
    } else {
      setProjectTypes([...projectTypes, type]);
    }
  };

  const hasSoftware = projectTypes.some(t => ['Software', 'Website', 'SaaS', 'PaaS'].includes(t));
  const hasDM = projectTypes.includes('Digital Marketing');
  const hasSEO = projectTypes.includes('SEO');

  const requiredStages = [];
  if (hasSoftware) {
    requiredStages.push(
      { key: 'uiux', label: 'UI/UX' },
      { key: 'tech', label: 'TECH' },
      { key: 'test', label: 'TEST' },
      { key: 'devops', label: 'DEVOPS' }
    );
  }
  if (hasDM) requiredStages.push({ key: 'digitalMarketing', label: 'DIGITAL MKTG' });
  if (hasSEO) requiredStages.push({ key: 'seo', label: 'SEO' });

  const handleCreate = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Project name is required' });
      return;
    }
    
    // Check if required stages have teams assigned
    for (const stage of requiredStages) {
      if (!workflowTeams[stage.key]) {
        Toast.show({ type: 'error', text1: 'Missing Pipeline', text2: `Please assign a team for ${stage.label}` });
        return;
      }
    }

    setLoading(true);
    try {
      const ws = await cachedGet('/workspaces');
      if (ws && ws.length > 0) {
        const workspaceId = ws[0]._id;
        
        await axios.post(`/workspaces/${workspaceId}/projects`, {
          title: name,
          name: name,
          description,
          projectType: projectTypes,
          coordinator: coordinator,
          workflowTeams: workflowTeams,
          members: [user?._id] // Creator added, others usually added through teams automatically on backend if needed, or web just uses teams
        });
        Toast.show({ type: 'success', text1: 'Success', text2: 'Project created successfully' });
        navigation.goBack();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No active workspace found' });
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Creation Failed', text2: error.response?.data?.message || 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  const getCoordinatorName = () => {
    const coord = workspaceMembers.find(m => m._id === coordinator);
    return coord ? coord.name : '-- Select Coordinator --';
  };

  const getTeamName = (stageKey) => {
    const teamId = workflowTeams[stageKey];
    if (!teamId) return '-- Assign Team --';
    const t = workspaceTeams.find(t => t._id === teamId);
    return t ? t.name : '-- Assign Team --';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Project</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Basic Info */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>PROJECT TITLE</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Website Redesign"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>PROJECT TYPE (SELECT MULTIPLE)</Text>
          <View style={styles.chipsContainer}>
            {AVAILABLE_TYPES.map(type => {
              const active = projectTypes.includes(type);
              return (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleType(type)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Brief project overview..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Workflow Setup */}
        <View style={styles.workflowCard}>
          <Text style={styles.workflowTitle}>Workflow Setup</Text>
          
          <Text style={styles.label}>PROJECT COORDINATOR</Text>
          <TouchableOpacity style={styles.dropdownBtn} onPress={() => setCoordModal(true)}>
            <Text style={styles.dropdownText}>{getCoordinatorName()}</Text>
            <ChevronDown color="#64748B" size={20} />
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 24 }]}>PIPELINE SETUP (REQUIRED)</Text>
          <View style={styles.pipelineGrid}>
            {requiredStages.map((stage, idx) => (
              <View key={stage.key} style={styles.pipelineCard}>
                <View style={styles.pipelineHeader}>
                  <View style={styles.pipelineNumber}>
                    <Text style={styles.pipelineNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.pipelineStageName}>{stage.label}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.dropdownBtnSmall}
                  onPress={() => setTeamModal({ visible: true, stageKey: stage.key })}
                >
                  <Text style={styles.dropdownTextSmall} numberOfLines={1}>{getTeamName(stage.key)}</Text>
                  <ChevronDown color="#64748B" size={16} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
        
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, (!name.trim() || loading) && styles.submitBtnDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Create Project</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <Modal visible={coordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Coordinator</Text>
              <TouchableOpacity onPress={() => setCoordModal(false)}><Text style={styles.modalCloseText}>Close</Text></TouchableOpacity>
            </View>
            <FlatList
              data={workspaceMembers}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalItemRow}
                  onPress={() => { setCoordinator(item._id); setCoordModal(false); }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {coordinator === item._id && <Check color={PRIMARY} size={20} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={teamModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Team</Text>
              <TouchableOpacity onPress={() => setTeamModal({ visible: false, stageKey: null })}><Text style={styles.modalCloseText}>Close</Text></TouchableOpacity>
            </View>
            <FlatList
              data={workspaceTeams}
              keyExtractor={item => item._id}
              ListEmptyComponent={<Text style={{ padding: 20, textAlign: 'center', color: '#94A3B8' }}>No teams found</Text>}
              renderItem={({ item }) => {
                const isSelected = teamModal.stageKey && workflowTeams[teamModal.stageKey] === item._id;
                return (
                  <TouchableOpacity 
                    style={styles.modalItemRow}
                    onPress={() => {
                      setWorkflowTeams(prev => ({ ...prev, [teamModal.stageKey]: item._id }));
                      setTeamModal({ visible: false, stageKey: null });
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    {isSelected && <Check color={PRIMARY} size={20} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 10, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E2E8F0'
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  workflowCard: {
    backgroundColor: '#fff', padding: 20, borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', marginTop: 10, marginBottom: 20
  },
  workflowTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 20 },
  
  dropdownBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12
  },
  dropdownText: { fontSize: 15, color: '#111827' },

  pipelineGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  pipelineCard: {
    width: '48%', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, backgroundColor: '#FAFAFA'
  },
  pipelineHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pipelineNumber: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  pipelineNumberText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  pipelineStageName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  
  dropdownBtnSmall: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#fff'
  },
  dropdownTextSmall: { fontSize: 12, color: '#475569', flex: 1, marginRight: 4 },

  footer: {
    padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  submitBtn: {
    backgroundColor: PRIMARY, borderRadius: 12, height: 54,
    justifyContent: 'center', alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalCloseText: { fontSize: 16, color: PRIMARY, fontWeight: '600' },
  modalItemRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemText: { fontSize: 15, color: '#111827' },
});
