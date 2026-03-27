import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';

export default function AttendanceReport({ route, navigation }) {
  const { sessionId } = route.params;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('present'); // 'present' or 'absent'

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const response = await fetch(`http://10.189.118.185:3000/api/sessions/${sessionId}/report`);
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
    } catch (err) {
      console.log('Report Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} color="#007AFF" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Class Report</Text>
      
      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{report?.stats.percentage}%</Text>
          <Text style={styles.statLabel}>Attended</Text>
        </View>
        <View style={styles.statDetails}>
          <Text style={styles.detailText}>Present: {report?.stats.presentCount}</Text>
          <Text style={[styles.detailText, { color: '#FF3B30' }]}>Absent: {report?.absentees.length}</Text>
          <Text style={styles.detailText}>Total Class: {report?.stats.totalExpected}</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setViewMode('present')} style={[styles.tab, viewMode === 'present' && styles.activeTab]}>
          <Text style={[styles.tabText, viewMode === 'present' && styles.activeTabText]}>PRESENT</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode('absent')} style={[styles.tab, viewMode === 'absent' && styles.activeTab]}>
          <Text style={[styles.tabText, viewMode === 'absent' && styles.activeTabText]}>ABSENT</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'present' ? (
        <FlatList
          data={report?.presentStudents}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.studentRow}>
              <Text style={styles.rollNo}>#{item.rollNo.toString().slice(-3)}</Text>
              <Text style={styles.name}>{item.name}</Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={report?.absentees}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <View style={[styles.studentRow, { borderLeftColor: '#FF3B30', borderLeftWidth: 4 }]}>
              <Text style={[styles.rollNo, { color: '#FF3B30' }]}>#{item}</Text>
              <Text style={styles.name}>Unknown (Did not join)</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, backgroundColor: '#F8F9FA' },
  header: { fontSize: 24, fontWeight: '900', color: '#1C1C1E', marginBottom: 20, marginTop: 20 },
  statsCard: { 
    backgroundColor: '#fff', padding: 20, borderRadius: 20, 
    flexDirection: 'row', alignItems: 'center', marginBottom: 25,
    borderWidth: 1, borderColor: '#E5E5EA', elevation: 3
  },
  statBox: { backgroundColor: '#007AFF', width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  statNum: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  statLabel: { color: '#fff', fontSize: 10, textTransform: 'uppercase' },
  statDetails: { marginLeft: 20 },
  detailText: { fontSize: 15, fontWeight: '700', marginBottom: 4, color: '#3A3A3C' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#E5E5EA', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  tabText: { fontWeight: '700', color: '#8E8E93', fontSize: 12 },
  activeTabText: { color: '#007AFF' },
  studentRow: { 
    backgroundColor: '#fff', padding: 16, borderRadius: 12, 
    flexDirection: 'row', marginBottom: 10, borderWidth: 1, borderColor: '#E5E5EA' 
  },
  rollNo: { width: 60, fontWeight: 'bold', color: '#007AFF', fontSize: 16 },
  name: { fontSize: 16, color: '#1C1C1E', fontWeight: '500' }
});
