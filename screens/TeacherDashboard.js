import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView, Dimensions, StatusBar, KeyboardAvoidingView } from 'react-native';
import BleAdvertiser from 'react-native-ble-advertiser';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { phone } = route?.params || { phone: '9999999998' }; 
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
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeInstanceId, setActiveInstanceId] = useState(null);
  const timerRef = useRef(null);
  
  const CLASS_UUID = '94f275e7-a7eb-436f-8dc8-0524ba3bbf05';

  async function fetchInstances() {
    try {
      const response = await fetch(`http://10.189.118.185:3000/api/instances/${phone}`);
      const data = await response.json();
      if (response.ok) setSavedInstances(data);
    } catch (err) { console.log('Fetch Instances Error'); }
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
    Alert.alert('Preset Loaded ✅', `Ready to broadcast ${inst.subjectName}`);
  }

  async function saveInstance() {
    if (!subjectName || !department || !semester || !section || !year || !classroom || !rollStart || !rollEnd) {
      Alert.alert('Error', 'Please fill all class details.');
      return;
    }
    
    const autoName = `${subjectName} - ${department} ${section} (Sem ${semester}, Room ${classroom})`;
    
    try {
        const response = await fetch('http://10.189.118.185:3000/api/instances/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phone, 
            instanceName: autoName, 
            subjectName, 
            department, 
            year: parseInt(year), 
            semester: parseInt(semester), 
            section,
            classroom, 
            rollStart: parseInt(rollStart), 
            rollEnd: parseInt(rollEnd) 
          })
        });
        if (response.ok) {
            Alert.alert('Preset Saved! 💾', `Class profile successfully stored in the cloud.`);
            fetchInstances();
        } else {
            const result = await response.json();
            Alert.alert('Server Error', result.error || 'Failed to push to database.');
        }
    } catch (err) {
        Alert.alert('Network Error', 'Could not reach the database.');
    }
  }

  async function startAttendance() {
    if (!subjectName || !department || !semester || !section || !year || !classroom || !rollStart || !rollEnd) {
      Alert.alert('Error', 'All fields are required to start a session.');
      return;
    }

    if (Platform.OS === 'android') {
      const g = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
      if (g !== PermissionsAndroid.RESULTS.GRANTED && Platform.Version >= 31) {
        Alert.alert('Permissions Error', 'Teacher advertising requires Bluetooth permissions.');
        return;
      }
    }

    try {
      const response = await fetch('http://10.189.118.185:3000/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone, subjectName, department, 
          year: parseInt(year), semester: parseInt(semester), section,
          classroom, rollStart: parseInt(rollStart), rollEnd: parseInt(rollEnd),
          classInstanceId: activeInstanceId, broadcastId: CLASS_UUID 
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error('Cloud Registry Failed');

      setActiveSessionId(data._id);
      setIsLive(true);
      setStatusText(`LIVE: ${subjectName} (${section})`);

      BleAdvertiser.setCompanyId(0xFF); 
      await BleAdvertiser.broadcast(CLASS_UUID, [data.hardwareMajor || 12, 1], {});

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        Alert.alert('Class Still Running? ⏱️', 'Your class has been broadcasting for 10 minutes.', [
            { text: 'Keep Going', style: 'cancel' },
            { text: 'Stop Broadcast', onPress: endAttendance, style: 'destructive' }
          ]
        );
      }, 10 * 60 * 1000); 

    } catch (err) {
      Alert.alert('Hardware Error', 'Ensure Bluetooth is ON.');
    }
  }

  async function endAttendance() {
    if (activeSessionId) {
      await fetch(`http://10.189.118.185:3000/api/sessions/${activeSessionId}/end`, { method: 'PUT' });
    }
    await BleAdvertiser.stopBroadcast();
    setIsLive(false);
    setStatusText('Off-Air');
    setActiveSessionId(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    Alert.alert('Attendance Completed', 'The session is closed and synchronized.');
  }

  useEffect(() => { fetchInstances(); }, []);

  return (
    <View style={styles.container}>
      <MeshGradient />
      <DotGrid />
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.headerSection, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.header}>Professor Control</Text>
          <View style={[styles.banner, { backgroundColor: isLive ? '#10B981' : '#0F172A' }]}>
             <MaterialCommunityIcons name={isLive ? "broadcast" : "broadcast-off"} size={24} color="#FFF" style={{marginRight: 10}} />
            <Text style={styles.bannerText}>{statusText}</Text>
          </View>
        </View>

        {!isLive ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.bentoCard}>
              <Text style={styles.label}>CLASS CONFIGURATION</Text>
              
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="book-open-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput style={styles.input} value={subjectName} onChangeText={setSubjectName} placeholder="Subject Name" placeholderTextColor="#8E8E93"/>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, {flex: 1}]}><TextInput style={styles.input} value={department} onChangeText={setDepartment} placeholder="Dept (CS)" placeholderTextColor="#8E8E93"/></View>
                <View style={[styles.inputContainer, {width: 70}]}><TextInput style={styles.input} value={section} onChangeText={setSection} placeholder="Sec" autoCapitalize="characters" maxLength={1} placeholderTextColor="#8E8E93"/></View>
                <View style={[styles.inputContainer, {width: 70}]}><TextInput style={styles.input} value={semester} onChangeText={setSemester} placeholder="Sem" keyboardType="numeric" maxLength={1} placeholderTextColor="#8E8E93"/></View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, {flex: 1}]}><MaterialCommunityIcons name="calendar-outline" size={20} color="#64748B" style={styles.inputIcon}/><TextInput style={styles.input} value={year} onChangeText={setYear} placeholder="Year" keyboardType="numeric" maxLength={4} placeholderTextColor="#8E8E93"/></View>
                <View style={[styles.inputContainer, {flex: 1}]}><MaterialCommunityIcons name="map-marker-outline" size={20} color="#64748B" style={styles.inputIcon}/><TextInput style={styles.input} value={classroom} onChangeText={setClassroom} placeholder="Room Code" placeholderTextColor="#8E8E93"/></View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, {flex: 1}]}><MaterialCommunityIcons name="account-group-outline" size={20} color="#64748B" style={styles.inputIcon}/><TextInput style={styles.input} value={rollStart} onChangeText={setRollStart} placeholder="Roll From" keyboardType="numeric" maxLength={3} placeholderTextColor="#8E8E93"/></View>
                <View style={[styles.inputContainer, {flex: 1}]}><MaterialCommunityIcons name="format-horizontal-align-right" size={20} color="#64748B" style={styles.inputIcon}/><TextInput style={styles.input} value={rollEnd} onChangeText={setRollEnd} placeholder="Roll To" keyboardType="numeric" maxLength={3} placeholderTextColor="#8E8E93"/></View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.btnStart} onPress={startAttendance} activeOpacity={0.8}>
                  <Text style={styles.btnTxt}>GO LIVE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSave} onPress={saveInstance} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="content-save" size={24} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionLabel}>QUICK LOAD PRESET</Text>
            {savedInstances.length === 0 ? (
               <Text style={styles.emptyText}>No presets saved yet.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                {savedInstances.map(i => (
                  <TouchableOpacity key={i._id} style={styles.presetCard} onPress={() => selectInstance(i)} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="bookmark-multiple-outline" size={24} color="#10B981" />
                    <View style={{marginTop: 8}}>
                      <Text style={styles.pTitle} numberOfLines={1}>{i.instanceName}</Text>
                      <Text style={styles.pSub}>{i.subjectName} • Sem {i.semester}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.sectionLabel}>CLASS REGISTRY REPORTS</Text>
            {savedInstances.length === 0 ? (
               <Text style={styles.emptyText}>No classes registered yet.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.hScroll, {marginBottom: 40}]}>
                {savedInstances.map(i => (
                  <TouchableOpacity 
                    key={i._id} 
                    style={[styles.presetCard, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]} 
                    onPress={() => navigation.navigate('ClassHistory', { instanceId: i._id, instanceName: i.instanceName })}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="chart-box-outline" size={24} color="#3B82F6" />
                    <View style={{marginTop: 8}}>
                      <Text style={[styles.pTitle, {color: '#0F172A'}]} numberOfLines={2}>{i.instanceName}</Text>
                      <Text style={styles.pSub}>View Attendance Report</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </ScrollView>
        ) : (
          <View style={styles.liveContainer}>
             <Animated.View style={styles.livePulseRing}>
                <MaterialCommunityIcons name="bluetooth-audio" size={80} color="#10B981" />
             </Animated.View>
             <Text style={styles.liveTitle}>Broadcasting via Bluetooth</Text>
             <Text style={styles.liveSubtitle}>Students can now scan and verify their presence locally.</Text>
             <TouchableOpacity style={styles.btnEnd} onPress={endAttendance}>
               <MaterialCommunityIcons name="stop-circle-outline" size={24} color="#FFF" style={{marginRight: 8}}/>
               <Text style={styles.btnTxt}>STOP CLASS BROADCAST</Text>
             </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  headerSection: { paddingHorizontal: 25 },
  header: { fontSize: 32, fontWeight: '900', color: '#0F172A', marginBottom: 20 },
  banner: { flexDirection: 'row', padding: 18, borderRadius: 16, marginBottom: 25, elevation: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, alignItems: 'center', justifyContent: 'center' },
  bannerText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  scroll: { paddingHorizontal: 20 },
  bentoCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 2, marginBottom: 30 },
  label: { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 15 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', letterSpacing: 1.5, marginBottom: 15, marginLeft: 5 },
  row: { flexDirection: 'row', gap: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, height: 55, paddingHorizontal: 15, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0F172A' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btnStart: { flex: 1, backgroundColor: '#0F172A', height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  btnSave: { width: 60, height: 60, backgroundColor: '#E2E8F0', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  btnEnd: { flexDirection: 'row', backgroundColor: '#F43F5E', paddingVertical: 20, paddingHorizontal: 30, borderRadius: 20, alignItems: 'center', elevation: 8, shadowColor: '#F43F5E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4 },
  btnTxt: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  hScroll: { marginBottom: 30, overflow: 'visible' },
  presetCard: { backgroundColor: '#FFF', width: 160, padding: 18, borderRadius: 20, marginRight: 15, borderWidth: 1, borderColor: '#10B98144', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, elevation: 1 },
  pTitle: { fontWeight: '800', color: '#10B981', fontSize: 15, marginBottom: 4 },
  pSub: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  emptyText: { color: '#94A3B8', fontStyle: 'italic', marginBottom: 25, marginLeft: 5 },
  liveContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  livePulseRing: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 30, shadowColor: '#10B981', shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.5, shadowRadius: 30, elevation: 10 },
  liveTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 10 },
  liveSubtitle: { textAlign: 'center', color: '#64748B', fontSize: 16, fontWeight: '500', marginBottom: 50, paddingHorizontal: 20 }
});
