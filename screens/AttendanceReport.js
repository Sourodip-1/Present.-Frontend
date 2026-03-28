import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API_URL from '../config';
import MeshGradient from '../components/MeshGradient';

const { width, height } = Dimensions.get('window');

const DotGrid = () => {
  const dotSpacing = 35;
  const cols = Math.ceil(width / dotSpacing) + 1;
  const rows = Math.ceil(height / dotSpacing) + 1;
  const dots = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      dots.push(<View key={`${i}-${j}`} style={{ position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', opacity: 0.15, left: j * dotSpacing + (i % 2 === 0 ? 0 : dotSpacing / 2), top: i * dotSpacing }} />);
    }
  }
  return <View style={StyleSheet.absoluteFill}>{dots}</View>;
};

export default function AttendanceReport({ route, navigation }) {
  const { sessionId = 'dummy', subjectName = 'Computer Networks' } = route.params || {};
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('present'); // 'present' or 'absent'
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/report`);
      const data = await response.json();
      
      // --- SMART ABSENTEE CALCULATION ---
      const presentRolls = data.presentStudents.map(s => parseInt(s.rollNo.toString().slice(-3)));
      const absentees = [];
      
      const start = data.sessionInfo.rollStart;
      const end = data.sessionInfo.rollEnd;

      for (let i = start; i <= end; i++) {
        if (!presentRolls.includes(i)) {
          absentees.push(i.toString().padStart(3, '0')); // Format as 001, 045, etc
        }
      }
      data.absentees = absentees;

      setReport(data);
      setReport(data);
    } catch (err) {
      console.log('Report Error:', err);
      // Removed dummy data fallback entirely to ensure all data is from the database.
      setReport({ error: true });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: '#FFF' }} color="#2563EB" />;
  if (report?.error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#64748B' }}>Could not load attendance report.</Text>
        <TouchableOpacity style={{ marginTop: 20, padding: 12, backgroundColor: '#2563EB', borderRadius: 8 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MeshGradient />
      <DotGrid />
      <StatusBar barStyle="dark-content" />

      <View style={[styles.headerSection, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerSub}>ATTENDANCE REPORT</Text>
          <Text style={styles.headerTitle}>{report?.sessionInfo?.subjectName || 'Class Report'}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>
      
      <View style={styles.statsCard}>
        <View style={styles.statsLeft}>
          <View style={styles.circularProgress}>
            <Text style={styles.progressTxt}>{report?.stats.percentage}%</Text>
            <Text style={styles.progressLabel}>ATTENDED</Text>
          </View>
        </View>
        <View style={styles.statsRight}>
          <View style={styles.statRow}>
            <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.statDetailLabel}>Present</Text>
            <Text style={styles.statDetailVal}>{report?.stats.presentCount}</Text>
          </View>
          <View style={styles.statRow}>
            <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.statDetailLabel}>Absent</Text>
            <Text style={styles.statDetailVal}>{report?.absentees.length}</Text>
          </View>
          <View style={[styles.statRow, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#F1F5F9' }]}>
            <MaterialCommunityIcons name="account-group" size={14} color="#94A3B8" />
            <Text style={[styles.statDetailLabel, { color: '#64748B', marginLeft: 6 }]}>Total Students</Text>
            <Text style={[styles.statDetailVal, { color: '#1E293B' }]}>{report?.stats.totalExpected}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setViewMode('present')} style={[styles.tab, viewMode === 'present' && styles.activeTab]}>
          <Text style={[styles.tabText, viewMode === 'present' && styles.activeTabText]}>PRESENT</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode('absent')} style={[styles.tab, viewMode === 'absent' && styles.activeTab]}>
          <Text style={[styles.tabText, viewMode === 'absent' && { color: '#EF4444' }]}>ABSENT</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={viewMode === 'present' ? report?.presentStudents : report?.absentees}
        keyExtractor={(item, idx) => idx.toString()}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const isPresent = viewMode === 'present';
          const roll = isPresent ? `#${item.rollNo.toString().slice(-3)}` : `#${item}`;
          const name = isPresent ? item.name : 'Unknown (Did not join)';
          return (
            <View style={styles.studentRow}>
              <View style={[styles.statusIndicator, { backgroundColor: isPresent ? '#DCFCE7' : '#FEE2E2' }]}>
                <MaterialCommunityIcons name={isPresent ? 'check' : 'close'} size={18} color={isPresent ? '#10B981' : '#EF4444'} />
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{name}</Text>
                <Text style={styles.studentRoll}>Roll {roll}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  headerSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 25 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  headerTitles: { alignItems: 'center' },
  headerSub: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B', letterSpacing: 0.5 },
  
  statsCard: { 
    marginHorizontal: 25, backgroundColor: '#FFF', borderRadius: 30, padding: 25, 
    flexDirection: 'row', alignItems: 'center', marginBottom: 25,
    borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#1E293B', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.08, shadowRadius: 25, elevation: 8
  },
  statsLeft: { alignItems: 'center', marginRight: 25 },
  circularProgress: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  progressTxt: { color: '#FFF', fontSize: 26, fontWeight: '900' },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '800', marginTop: 2, letterSpacing: 1 },
  
  statsRight: { flex: 1 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  statDetailLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#64748B' },
  statDetailVal: { fontSize: 16, fontWeight: '800', color: '#1E293B' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 6, marginHorizontal: 25, marginBottom: 25 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  tabText: { fontWeight: '800', color: '#94A3B8', fontSize: 13, letterSpacing: 1 },
  activeTabText: { color: '#10B981' },

  studentRow: { 
    marginHorizontal: 25, backgroundColor: '#FFF', padding: 18, borderRadius: 20, 
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, 
    borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, elevation: 1
  },
  statusIndicator: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, color: '#1E293B', fontWeight: '800', marginBottom: 4 },
  studentRoll: { fontSize: 13, color: '#64748B', fontWeight: '600' }
});
