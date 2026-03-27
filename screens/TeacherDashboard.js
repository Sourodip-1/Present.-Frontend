import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import BleAdvertiser from 'react-native-ble-advertiser';

export default function TeacherDashboard({ route, navigation }) {
  const { phone } = route?.params || { phone: '9999999998' }; 
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
    setYear(inst.year || '');
    setSemester(inst.semester);
    setSection(inst.section || '');
    setClassroom(inst.classroom);
    setRollStart(inst.rollStart?.toString() || '');
    setRollEnd(inst.rollEnd?.toString() || '');
    Alert.alert('Instance Selected', `Ready to start ${inst.subjectName}`);
  }

  async function saveInstance() {
    if (!subjectName || !department || !semester || !section || !year || !classroom || !rollStart || !rollEnd) {
      Alert.alert('Error', 'Fill all fields.');
      return;
    }
    
    // Android Polyfill: Alert.prompt silently fails on Android! Instantly generating smart preset name instead.
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
            year, 
            semester, 
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
      Alert.alert('Error', 'All fields are required');
      return;
    }

    try {
      const response = await fetch('http://10.189.118.185:3000/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone, 
          subjectName, 
          department, 
          year, 
          semester, 
          section,
          classroom, 
          rollStart: parseInt(rollStart), 
          rollEnd: parseInt(rollEnd),
          classInstanceId: activeInstanceId,
          broadcastId: CLASS_UUID 
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error('Cloud Registry Failed');

      setActiveSessionId(data._id);
      setIsLive(true);
      setStatusText(`LIVE: ${subjectName}`);

      BleAdvertiser.setCompanyId(0xFF); 
      await BleAdvertiser.broadcast(CLASS_UUID, [data.hardwareMajor, 1], {});

      // Start 10-minute Heartbeat Reminder Failsafe
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        Alert.alert(
          'Class Still Running? ⏱️',
          'Your class has been broadcasting for 10 minutes. Do you want to end the session or keep attendance open?',
          [
            { text: 'Keep Going', style: 'cancel' },
            { text: 'Stop Broadcast', onPress: endAttendance, style: 'destructive' }
          ]
        );
      }, 10 * 60 * 1000); // 600,000 milliseconds = 10 minutes

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
    Alert.alert('Attendance Completed', 'The session is closed.');
  }

  useEffect(() => {
    fetchInstances();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Professor Control</Text>
      <View style={[styles.banner, { backgroundColor: isLive ? '#34C759' : '#007AFF' }]}>
        <Text style={styles.bannerText}>{statusText}</Text>
      </View>

      {!isLive ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Class Details</Text>
          <TextInput style={styles.input} value={subjectName} onChangeText={setSubjectName} placeholder="Subject Name" placeholderTextColor="#8E8E93"/>
          
          <View style={{flexDirection:'row', gap:10}}>
             <TextInput style={[styles.input, {flex:1}]} value={department} onChangeText={setDepartment} placeholder="Dept" placeholderTextColor="#8E8E93"/>
             <TextInput style={[styles.input, {flex:1}]} value={section} onChangeText={setSection} placeholder="Sec (A)" autoCapitalize="characters" maxLength={1} placeholderTextColor="#8E8E93"/>
             <TextInput style={[styles.input, {flex:1}]} value={semester} onChangeText={setSemester} placeholder="Sem" placeholderTextColor="#8E8E93"/>
          </View>

          <View style={{flexDirection:'row', gap:10}}>
             <TextInput style={[styles.input, {flex:1}]} value={year} onChangeText={setYear} placeholder="Year" keyboardType="numeric" maxLength={4} placeholderTextColor="#8E8E93"/>
             <TextInput style={[styles.input, {flex:1}]} value={classroom} onChangeText={setClassroom} placeholder="Room" placeholderTextColor="#8E8E93"/>
          </View>

          <View style={{flexDirection:'row', gap:10}}>
             <TextInput style={[styles.input, {flex:1}]} value={rollStart} onChangeText={setRollStart} placeholder="Roll From (001)" keyboardType="numeric" maxLength={3} placeholderTextColor="#8E8E93"/>
             <TextInput style={[styles.input, {flex:1}]} value={rollEnd} onChangeText={setRollEnd} placeholder="Roll To (060)" keyboardType="numeric" maxLength={3} placeholderTextColor="#8E8E93"/>
          </View>

          <View style={{flexDirection:'row', gap:10, marginBottom: 20}}>
            <TouchableOpacity style={styles.btnStart} onPress={startAttendance}><Text style={styles.btnTxt}>GO LIVE</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnSave} onPress={saveInstance}><Text style={styles.btnTxt}>SAVE PRESET</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Quick Load Preset:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 25}}>
            {savedInstances.map(i => (
              <TouchableOpacity key={i._id} style={styles.preset} onPress={() => selectInstance(i)}>
                <Text style={styles.pTitle} numberOfLines={1}>{i.instanceName}</Text>
                <Text style={styles.pSub}>{i.subjectName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Recent Class Reports:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 40}}>
             {savedInstances.map(i => (
               <TouchableOpacity 
                 key={i._id} 
                 style={styles.report} 
                 onPress={() => navigation.navigate('ClassHistory', { 
                   instanceId: i._id, 
                   instanceName: i.instanceName 
                 })}
               >
                 <Text style={styles.rTxt}>{i.instanceName}</Text>
                 <Text style={styles.rSub}>View History</Text>
               </TouchableOpacity>
             ))}
          </ScrollView>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
           <Text style={styles.liveSubtitle}>Broadcasting Attendance Signal...</Text>
           <TouchableOpacity style={styles.btnEnd} onPress={endAttendance}>
             <Text style={styles.btnTxt}>STOP CLASS BROADCAST</Text>
           </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, backgroundColor: '#F8F9FA', marginTop: 30 },
  header: { fontSize: 26, fontWeight: '900', color: '#1C1C1E', marginBottom: 20 },
  banner: { padding: 18, borderRadius: 12, marginBottom: 20, elevation: 3 },
  bannerText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#8E8E93', marginBottom: 8, marginTop: 10, textTransform: 'uppercase' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E5EA', fontSize: 16 },
  btnStart: { flex: 1.5, backgroundColor: '#34C759', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnSave: { flex: 1, backgroundColor: '#5856D6', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnEnd: { backgroundColor: '#FF3B30', padding: 25, borderRadius: 20, alignItems: 'center', elevation: 5 },
  btnTxt: { color: '#fff', fontWeight: '900', fontSize: 16 },
  preset: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginRight: 12, borderWidth: 1, borderColor: '#E5E5EA', width: 140 },
  pTitle: { fontWeight: 'bold', color: '#007AFF', fontSize: 14 },
  pSub: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  report: { backgroundColor: '#E5E5EA', padding: 15, borderRadius: 15, marginRight: 12, width: 140 },
  rTxt: { fontWeight: '700', color: '#1C1C1E', fontSize: 14 },
  rSub: { fontSize: 10, color: '#8E8E93', marginTop: 2 },
  liveSubtitle: { textAlign: 'center', color: '#8E8E93', marginBottom: 30, fontSize: 16, fontStyle: 'italic' }
});
