import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  PermissionsAndroid,
  Platform,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Animated,
  Modal,
  FlatList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SafeStorage from '../utils/storage';
import MeshGradient from '../components/MeshGradient';

const { width, height } = Dimensions.get('window');

const DotGrid = () => {
  const dotSpacing = 35;
  const cols = Math.ceil(width / dotSpacing) + 1;
  const rows = Math.ceil(height / dotSpacing) + 1;
  const dots = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      dots.push(
        <View key={`${i}-${j}`} style={{ position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', opacity: 0.15, left: j * dotSpacing + (i % 2 === 0 ? 0 : dotSpacing / 2), top: i * dotSpacing }} />
      );
    }
  }
  return <View style={StyleSheet.absoluteFill}>{dots}</View>;
};

export default function TeacherDashboard({ route, navigation }) {
  const { email } = route?.params || { email: 'teacher@university.edu' };
  const insets = useSafeAreaInsets();

  const [subjectName, setSubjectName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [classroom, setClassroom] = useState('');
  const [rollStart, setRollStart] = useState('');
  const [rollEnd, setRollEnd] = useState('');
  const [statusText, setStatusText] = useState('Off-Air');
  const [isLive, setIsLive] = useState(false);
  const [savedInstances, setSavedInstances] = useState([]);
  const [professorName, setProfessorName] = useState('Professor');
  const [classHistory, setClassHistory] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeInstanceId, setActiveInstanceId] = useState(null);
  const timerRef = useRef(null);
  
  // Custom Picker State
  const [pickerConfig, setPickerConfig] = useState({ visible: false, type: '', options: [], title: '' });
  
  // Custom Premium Alert Modal State
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'success', buttons: [] });
  // Custom Premium Action Sheet State
  const [actionSheetConfig, setActionSheetConfig] = useState({ visible: false, title: '', options: [] });

  const openPicker = (type, title, options) => {
    setPickerConfig({ visible: true, type, title, options });
  };

  const handleSelectOption = (item) => {
    if (pickerConfig.type === 'year') setYear(item.toString());
    if (pickerConfig.type === 'semester') setSemester(item.toString());
    setPickerConfig({ ...pickerConfig, visible: false });
  };

  // Animation refs for the pulse effect
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseOpac1 = useRef(new Animated.Value(0.5)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseOpac2 = useRef(new Animated.Value(0.5)).current;

  const CLASS_UUID = '94f275e7-a7eb-436f-8dc8-0524ba3bbf05';

  useEffect(() => {
    fetchInstances();

    // Independent endless pulse loops
    const p1 = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim1, { toValue: 2.2, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulseOpac1, { toValue: 0, duration: 2400, useNativeDriver: true })
      ])
    );
    p1.start();

    setTimeout(() => {
      const p2 = Animated.loop(
        Animated.parallel([
          Animated.timing(pulseAnim2, { toValue: 2.2, duration: 2400, useNativeDriver: true }),
          Animated.timing(pulseOpac2, { toValue: 0, duration: 2400, useNativeDriver: true })
        ])
      );
      p2.start();
    }, 1200);
  }, []);

  async function fetchInstances() {
    try {
      // 1. Fetch Teacher Profile
      const pRes = await fetch(`http://10.43.242.77:3000/api/users/${email}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData && pData.teacherProfile) {
          setProfessorName(pData.teacherProfile.fullName || 'Professor');
        }
      }

      // 2. Fetch Class Presets
      const response = await fetch(`http://10.43.242.77:3000/api/instances/${email}`);
      const data = await response.json();
      if (response.ok) {
        setSavedInstances(data || []);

        // 3. Fetch history for each instance to build a combined history list
        const allHistory = [];
        for (const inst of (data || [])) {
          try {
            const hRes = await fetch(`http://10.43.242.77:3000/api/instances/${inst._id}/history`);
            if (hRes.ok) {
              const sessions = await hRes.json();
              sessions.forEach(s => allHistory.push({
                _id: s._id,
                date: new Date(s.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                subjectName: s.subjectName,
                section: s.section,
                present: s.presentCount || 0,
                total: (s.rollEnd - s.rollStart) + 1
              }));
            }
          } catch (_) {}
        }
        // Sort by most recent first
        allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        setClassHistory(allHistory);
      } else {
        setSavedInstances([]);
      }
    } catch (err) { 
      console.log('Fetch Data Error', err); 
      setSavedInstances([]);
    }
  }

  function selectInstance(inst) {
    setActiveInstanceId(inst._id);
    setSubjectName(inst.subjectName);
    setDepartment(inst.department);
    setYear(inst.year?.toString() || '');
    setSemester(inst.semester?.toString() || '');
    setSection(inst.section || '');
    setClassroom(inst.classroom || '');
    setRollStart(inst.rollStart?.toString() || '');
    setRollEnd(inst.rollEnd?.toString() || '');
    setAlertConfig({ visible: true, title: 'Preset Loaded', message: `Ready to broadcast ${inst.subjectName}`, type: 'success', buttons: [{text: 'Awesome'}] });
  }

  async function saveInstance() {
    if (!subjectName || !department || !semester || !section || !year || !classroom || !rollStart || !rollEnd) {
      setAlertConfig({ visible: true, title: 'Missing Fields', message: 'Please fill all class details to save as preset.', type: 'error', buttons: [{text: 'Got it'}] });
      return;
    }
    const autoName = `${subjectName} - ${department} ${section} (Sem ${semester}, Room ${classroom})`;
    try {
      const response = await fetch('http://10.43.242.77:3000/api/instances/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, instanceName: autoName, subjectName, department,
          year: parseInt(year), semester: parseInt(semester), section,
          classroom, rollStart: parseInt(rollStart), rollEnd: parseInt(rollEnd)
        })
      });
      if (response.ok) {
        setAlertConfig({ visible: true, title: 'Preset Saved!', message: 'Class profile successfully stored in the cloud.', type: 'success', buttons: [{text: 'Done'}] });
        fetchInstances();
      } else {
        const result = await response.json();
        setAlertConfig({ visible: true, title: 'Server Error', message: result.error || 'Failed to push to database.', type: 'error', buttons: [{text: 'OK'}] });
      }
    } catch (err) {
      setAlertConfig({ visible: true, title: 'Network Error', message: 'Could not reach the database.', type: 'error', buttons: [{text: 'OK'}] });
    }
  }

  function deleteInstance(id) {
    setAlertConfig({
      visible: true,
      title: 'Delete Preset',
      message: 'Are you sure you want to permanently delete this template?',
      type: 'error',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`http://10.43.242.77:3000/api/instances/${id}`, { method: 'DELETE' });
            if (res.ok) {
              fetchInstances();
              if (activeInstanceId === id) {
                 setActiveInstanceId(null);
                 setSubjectName(''); setDepartment(''); setYear(''); setSemester(''); setSection(''); setClassroom(''); setRollStart(''); setRollEnd('');
              }
            }
          } catch (e) { }
        }}
      ]
    });
  }

  const openPresetOptions = (preset) => {
    setActionSheetConfig({
      visible: true,
      title: `${preset.subjectName} Options`,
      options: [
        { text: 'Load Details', icon: 'file-download-outline', onPress: () => selectInstance(preset) },
        { text: 'View History', icon: 'clock-outline', onPress: () => navigation.navigate('ClassHistory', { instanceId: preset._id, instanceName: preset.subjectName }) },
        { text: 'Delete Template', icon: 'trash-can-outline', destructive: true, onPress: () => deleteInstance(preset._id) }
      ]
    });
  };

  async function startAttendance() {
    if (!subjectName || !department || !semester || !section || !year || !classroom || !rollStart || !rollEnd) {
      setAlertConfig({ visible: true, title: 'Missing Fields', message: 'All fields are required to start a broadcasting session.', type: 'error', buttons: [{text: 'OK'}] });
      return;
    }
    if (Platform.OS === 'android') {
      const g = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
      if (g !== PermissionsAndroid.RESULTS.GRANTED && Platform.Version >= 31) {
        setAlertConfig({ visible: true, title: 'Permissions Error', message: 'Teacher advertising requires Bluetooth permissions.', type: 'error', buttons: [{text: 'OK'}] });
        return;
      }
    }
    try {
      const response = await fetch('http://10.43.242.77:3000/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, subjectName, department,
          year: parseInt(year), semester: parseInt(semester), section,
          classroom, rollStart: parseInt(rollStart), rollEnd: parseInt(rollEnd),
          classInstanceId: activeInstanceId, broadcastId: CLASS_UUID
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error('Cloud Registry Failed');
      setActiveSessionId(data._id);
      setIsLive(true);
      setStatusText(`LIVE: ${subjectName}`);
      let advertiser;
      try { advertiser = require('react-native-ble-advertiser').default; } catch (e) { }
      if (advertiser && typeof advertiser.setCompanyId === 'function') {
        advertiser.setCompanyId(0xFF);
        await advertiser.broadcast(CLASS_UUID, [data.hardwareMajor || 12, 1], {});
      }
    } catch (err) { setAlertConfig({ visible: true, title: 'Hardware Error', message: 'Ensure Bluetooth is ON to broadcast clearly.', type: 'error', buttons: [{text: 'OK'}] }); }
  }

  async function endAttendance() {
    if (activeSessionId) await fetch(`http://10.43.242.77:3000/api/sessions/${activeSessionId}/end`, { method: 'PUT' });
    let advertiser;
    try { advertiser = require('react-native-ble-advertiser').default; } catch (e) { }
    if (advertiser && typeof advertiser.stopBroadcast === 'function') await advertiser.stopBroadcast(CLASS_UUID);
    setIsLive(false);
    setStatusText('Off-Air');
    setActiveSessionId(null);
    setAlertConfig({ visible: true, title: 'Session Closed', message: 'The session has successfully ended and attendance logs are saved.', type: 'success', buttons: [{text: 'Done'}] });
  }

  return (
    <View style={styles.container}>
      <MeshGradient />
      <DotGrid />
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.headerSection, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greetingText}>Good Morning,</Text>
              <Text style={styles.professorName}>{professorName}</Text>
            </View>
            <TouchableOpacity style={styles.profileIcon} onPress={async () => {
              await SafeStorage.clear();
              navigation.replace('Login');
            }}>
              <MaterialCommunityIcons name="logout" size={28} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {!isLive ? (
            <>
              {/* Circular Start Button Section */}
              <View style={styles.startSection}>
                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim1 }], opacity: pulseOpac1 }]} />
                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim2 }], opacity: pulseOpac2 }]} />

                <View style={styles.ringOuter}>
                  <View style={styles.ringInner}>
                    <TouchableOpacity
                      style={styles.btnStartCircular}
                      onPress={startAttendance}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.startTxt}>START</Text>
                      <Text style={styles.attendanceTxt}>ATTENDANCE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {activeSessionId && (
                  <TouchableOpacity 
                    style={styles.viewReportAction} 
                    onPress={() => {
                      if (activeSessionId) {
                        navigation.navigate('AttendanceReport', { sessionId: activeSessionId, subjectName });
                      } else {
                        setAlertConfig({ visible: true, title: 'No Session', message: 'Start an attendance session first to generate a live report.', type: 'error', buttons: [{text: 'Got it'}] });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="chart-box-outline" size={20} color="#2563EB" />
                    <Text style={styles.viewReportActionTxt}>View Report</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Class Configuration Card */}
              <View style={styles.configCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.configLabel}>CLASS REGISTRATION</Text>
                  <View style={styles.headerLine} />
                </View>

                <View style={styles.inputStack}>
                  <View style={styles.inputLabelGroup}>
                    <MaterialCommunityIcons name="book-edit" size={16} color="#2563EB" />
                    <Text style={styles.fieldLabel}>Subject Information</Text>
                  </View>
                  <View style={styles.premiumInput}>
                    <TextInput style={styles.textInputMain} value={subjectName} onChangeText={setSubjectName} placeholder="E.g. Computer Networks" placeholderTextColor="#94A3B8" />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.fieldLabelSmall}>Department</Text>
                      <View style={styles.smallInput}><TextInput style={styles.textInputSm} value={department} onChangeText={setDepartment} placeholder="CSE" placeholderTextColor="#94A3B8" /></View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabelSmall}>Year</Text>
                      <TouchableOpacity 
                        style={styles.smallInput} 
                        onPress={() => openPicker('year', 'Select Year', [1, 2, 3, 4])}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.textInputSm, !year && { color: '#94A3B8' }]}>
                          {year || "Select"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabelSmall}>Semester</Text>
                      <TouchableOpacity 
                        style={styles.smallInput} 
                        onPress={() => openPicker('semester', 'Select Semester', [1, 2, 3, 4, 5, 6, 7, 8])}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.textInputSm, !semester && { color: '#94A3B8' }]}>
                          {semester || "Select"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabelSmall}>Section</Text>
                      <View style={styles.smallInput}><TextInput style={styles.textInputSm} value={section} onChangeText={setSection} placeholder="2,3" autoCapitalize="characters" placeholderTextColor="#94A3B8" /></View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabelSmall}>Room</Text>
                      <View style={styles.smallInput}><TextInput style={styles.textInputSm} value={classroom} onChangeText={setClassroom} placeholder="402" placeholderTextColor="#94A3B8" /></View>
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabelSmall}>Roll Range (Start)</Text>
                      <View style={styles.smallInput}><TextInput style={styles.textInputSm} value={rollStart} onChangeText={setRollStart} placeholder="01" keyboardType="numeric" placeholderTextColor="#94A3B8" /></View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabelSmall}>Roll Range (End)</Text>
                      <View style={styles.smallInput}><TextInput style={styles.textInputSm} value={rollEnd} onChangeText={setRollEnd} placeholder="60" keyboardType="numeric" placeholderTextColor="#94A3B8" /></View>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.saveBtnPremium} onPress={saveInstance} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="cloud-check" size={22} color="#FFF" />
                  <Text style={styles.saveBtnText}>SAVE AS PRESET</Text>
                </TouchableOpacity>
              </View>

              {/* Presets Grid */}
              <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>QUICK PRESETS (LONG PRESS)</Text></View>
              <View style={styles.cardsGrid}>
                {savedInstances.length === 0 ? <Text style={styles.emptyText}>No presets found</Text> :
                  savedInstances.map(i => {
                    const isActive = activeInstanceId === i._id;
                    return (
                      <TouchableOpacity 
                        key={i._id} 
                        style={[styles.compactCard, isActive && styles.activeCompactCard]} 
                        onLongPress={() => openPresetOptions(i)}
                        onPress={() => selectInstance(i)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <View style={[styles.cardIndicator, isActive && { backgroundColor: '#FFF', marginBottom: 0 }]} />
                          
                          {isActive && (
                            <View style={styles.activeCheck}>
                              <MaterialCommunityIcons name="check-circle" size={16} color="#FFF" />
                            </View>
                          )}
                          
                          <TouchableOpacity onPress={() => openPresetOptions(i)} style={{ padding: 4 }}>
                            <MaterialCommunityIcons name="dots-horizontal" size={22} color={isActive ? '#FFF' : '#94A3B8'} />
                          </TouchableOpacity>
                        </View>
                        
                        <Text style={[styles.cardTitle, isActive && { color: '#FFF' }]} numberOfLines={1}>{i.subjectName}</Text>
                        <Text style={[styles.cardSub, isActive && { color: 'rgba(255,255,255,0.8)' }]}>{i.section} • Sem {i.semester}</Text>
                      </TouchableOpacity>
                    );
                  })
                }
              </View>

              {/* CLASS HISTORY — Live from DB */}
              <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>CLASS HISTORY</Text></View>
              <View style={styles.historyContainer}>
                {classHistory.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                    <MaterialCommunityIcons name="history" size={40} color="#CBD5E1" />
                    <Text style={{ color: '#94A3B8', marginTop: 10, fontSize: 14 }}>No class sessions recorded yet.</Text>
                  </View>
                ) : (
                  classHistory.map((h) => (
                    <View key={h._id} style={styles.historyCard}>
                      <View style={styles.historyLeft}>
                        <View style={styles.historyDot} />
                        <View style={styles.historyLine} />
                      </View>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyDate}>{h.date}</Text>
                        <View style={styles.historyBody}>
                          <View>
                            <Text style={styles.historySubject}>{h.subjectName}</Text>
                            <Text style={styles.historySection}>Section {h.section}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.historyStats}
                            onPress={() => navigation.navigate('AttendanceReport', { sessionId: h._id, subjectName: h.subjectName })}
                          >
                            <Text style={styles.historyStatTxt}>{h.present}/{h.total}</Text>
                            <Text style={styles.historyStatLabel}>Present</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
              <View style={{ height: 100 }} />
            </>
          ) : (
            <View style={styles.liveContainer}>
              <View style={styles.liveStatusBadge}><View style={styles.liveDot} /><Text style={styles.liveStatusText}>LIVE BROADCASTING</Text></View>
              <View style={styles.liveVisual}><MaterialCommunityIcons name="access-point" size={100} color="#2563EB" /></View>
              <Text style={styles.liveSubject}>{subjectName}</Text>
              <Text style={styles.liveDetails}>{department} Section {section} • Room {classroom}</Text>
              <TouchableOpacity style={styles.btnEndSession} onPress={endAttendance}><Text style={styles.btnEndTxt}>CLOSE ATTENDANCE SESSION</Text></TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Premium Alert Modal */}
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.modalOverlayFlexCenter}>
          <View style={styles.premiumAlertBox}>
            <View style={[styles.alertIconWrap, alertConfig.type === 'error' ? styles.alertIconError : styles.alertIconSuccess]}>
               <MaterialCommunityIcons name={alertConfig.type === 'error' ? 'alert' : 'check'} size={40} color="#FFF" />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <View style={styles.alertBtnStack}>
              {alertConfig.buttons.map((btn, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.alertBtn, btn.style === 'destructive' && styles.alertBtnDestructive, btn.style === 'cancel' && styles.alertBtnCancel]} 
                  onPress={() => { setAlertConfig({ ...alertConfig, visible: false }); if(btn.onPress) btn.onPress(); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.alertBtnTxt, btn.style === 'destructive' && styles.alertBtnTxtDestructive, btn.style === 'cancel' && styles.alertBtnTxtCancel]}>{btn.text}</Text>
                </TouchableOpacity>
              ))}
              {alertConfig.buttons.length === 0 && (
                <TouchableOpacity style={styles.alertBtn} onPress={() => setAlertConfig({ ...alertConfig, visible: false })} activeOpacity={0.8}>
                  <Text style={styles.alertBtnTxt}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Premium Action Sheet */}
      <Modal visible={actionSheetConfig.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setActionSheetConfig({...actionSheetConfig, visible: false})} />
          <View style={[styles.actionSheetContent, { paddingBottom: insets.bottom + 30 }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.actionSheetTitle}>{actionSheetConfig.title}</Text>
            
            {actionSheetConfig.options.map((opt, i) => (
              <TouchableOpacity 
                key={i} 
                style={styles.actionSheetOption} 
                onPress={() => {
                  setActionSheetConfig({...actionSheetConfig, visible: false});
                  if(opt.onPress) opt.onPress();
                }}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons name={opt.icon} size={26} color={opt.destructive ? '#EF4444' : '#1E293B'} />
                <Text style={[styles.actionSheetOptionTxt, opt.destructive && {color: '#EF4444'}]}>{opt.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Custom Picker Modal */}
      <Modal visible={pickerConfig.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setPickerConfig({ ...pickerConfig, visible: false })} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalTitle}>{pickerConfig.title}</Text>
            <View style={styles.optionsGrid}>
              {pickerConfig.options.map((opt) => (
                <TouchableOpacity 
                  key={opt} 
                  style={[
                    styles.optionBtn, 
                    ((pickerConfig.type === 'year' && parseInt(year) === opt) || 
                     (pickerConfig.type === 'semester' && parseInt(semester) === opt)) 
                     && styles.optionBtnSelected
                  ]} 
                  onPress={() => handleSelectOption(opt)}
                >
                  <Text style={[
                    styles.optionTxt,
                    ((pickerConfig.type === 'year' && parseInt(year) === opt) || 
                     (pickerConfig.type === 'semester' && parseInt(semester) === opt)) 
                     && styles.optionTxtSelected
                  ]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerSection: { paddingHorizontal: 25, marginBottom: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetingText: { fontSize: 16, fontWeight: '500', color: '#64748B' },
  professorName: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
  profileIcon: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20 },
  startSection: { alignItems: 'center', marginVertical: 45, justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(37, 99, 235, 0.3)' },
  ringOuter: { width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(37, 99, 235, 0.04)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(37, 99, 235, 0.08)' },
  ringInner: { width: 165, height: 165, borderRadius: 82.5, backgroundColor: 'rgba(37, 99, 235, 0.08)', justifyContent: 'center', alignItems: 'center' },
  btnStartCircular: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 15 },
  startTxt: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  attendanceTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  configCard: {
    backgroundColor: '#FFFFFF', borderRadius: 32, padding: 25,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1E293B', shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.08, shadowRadius: 25, elevation: 8,
    marginBottom: 40
  },
  cardHeader: { alignItems: 'center', marginBottom: 25 },
  configLabel: { fontSize: 13, fontWeight: '900', color: '#1E293B', letterSpacing: 3, opacity: 0.8 },
  headerLine: { width: 40, height: 4, backgroundColor: '#2563EB', borderRadius: 2, marginTop: 8 },

  inputStack: { gap: 15 },
  inputLabelGroup: { flexDirection: 'row', alignItems: 'center', marginBottom: -5 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginLeft: 8 },
  fieldLabelSmall: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 6, marginLeft: 10, textTransform: 'uppercase' },

  premiumInput: {
    backgroundColor: '#F8FAFC', borderRadius: 18, height: 58,
    paddingHorizontal: 20, justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#F1F5F9'
  },
  smallInput: {
    backgroundColor: '#F8FAFC', borderRadius: 15, height: 52,
    paddingHorizontal: 15, justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#F1F5F9'
  },
  textInputMain: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  textInputSm: { fontSize: 15, fontWeight: '600', color: '#1E293B' },

  inputRow: { flexDirection: 'row', gap: 12 },

  saveBtnPremium: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2563EB', borderRadius: 18, height: 60, marginTop: 25,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4, shadowRadius: 15, elevation: 10
  },
  saveBtnText: { color: '#FFF', fontWeight: '900', marginLeft: 10, fontSize: 15, letterSpacing: 1 },
  sectionHeader: { marginBottom: 15, paddingLeft: 5 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5 },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
  compactCard: { width: (width - 52) / 2, backgroundColor: '#FFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, elevation: 1 },
  activeCompactCard: { backgroundColor: '#2563EB', borderColor: '#2563EB', shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 10 },
  cardIndicator: { width: 30, height: 4, backgroundColor: '#2563EB', borderRadius: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  activeCheck: { position: 'absolute', top: 6, right: '40%' },
  emptyText: { color: '#94A3B8', fontStyle: 'italic', fontSize: 13, marginLeft: 5 },
  
  viewReportAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DBEAFE', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginTop: 25 },
  viewReportActionTxt: { color: '#2563EB', fontWeight: '800', marginLeft: 8, fontSize: 14 },

  historyContainer: { paddingLeft: 5, paddingRight: 5, marginBottom: 20 },
  historyCard: { flexDirection: 'row', marginBottom: 20 },
  historyLeft: { alignItems: 'center', marginRight: 15 },
  historyDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2563EB', borderWidth: 3, borderColor: '#DBEAFE', zIndex: 2 },
  historyLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: -2, zIndex: 1 },
  historyContent: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 15, elevation: 2 },
  historyDate: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  historyBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historySubject: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  historySection: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  historyStats: { alignItems: 'flex-end', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  historyStatTxt: { fontSize: 16, fontWeight: '800', color: '#10B981' },
  historyStatLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 2 },
  liveContainer: { flex: 1, alignItems: 'center', paddingTop: 60 },
  liveStatusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 40 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 8 },
  liveStatusText: { color: '#10B981', fontWeight: '800', fontSize: 12 },
  liveVisual: { marginBottom: 30 },
  liveSubject: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  liveDetails: { fontSize: 16, color: '#64748B', fontWeight: '500', marginBottom: 60 },
  btnEndSession: { backgroundColor: '#EF4444', paddingHorizontal: 30, paddingVertical: 18, borderRadius: 16, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  btnEndTxt: { color: '#FFF', fontWeight: '800', letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 20, textAlign: 'center' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  optionBtn: { width: '22%', backgroundColor: '#F8FAFC', paddingVertical: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  optionBtnSelected: { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
  optionTxt: { fontSize: 18, fontWeight: '700', color: '#64748B' },
  optionTxtSelected: { color: '#2563EB' },
  
  modalOverlayFlexCenter: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  premiumAlertBox: { width: '100%', backgroundColor: '#FFF', borderRadius: 32, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.15, shadowRadius: 35, elevation: 15 },
  alertIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  alertIconSuccess: { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  alertIconError: { backgroundColor: '#EF4444', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  alertTitle: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  alertMessage: { fontSize: 16, color: '#64748B', fontWeight: '500', textAlign: 'center', marginBottom: 35, lineHeight: 24 },
  alertBtnStack: { width: '100%', gap: 12 },
  alertBtn: { width: '100%', backgroundColor: '#2563EB', paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  alertBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  alertBtnCancel: { backgroundColor: '#F1F5F9', shadowOpacity: 0, elevation: 0 },
  alertBtnTxtCancel: { color: '#64748B' },
  alertBtnDestructive: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', shadowOpacity: 0, elevation: 0 },
  alertBtnTxtDestructive: { color: '#EF4444' },

  actionSheetContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
  dragHandle: { width: 50, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 25 },
  actionSheetTitle: { fontSize: 13, fontWeight: '900', color: '#64748B', marginBottom: 20, textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' },
  actionSheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  actionSheetOptionTxt: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginLeft: 16 }
});
