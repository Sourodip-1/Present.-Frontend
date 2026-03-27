import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, StyleSheet, Dimensions,
  ScrollView, Animated, Platform, PermissionsAndroid, StatusBar, Modal,
  Image, PanResponder, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BleManager } from 'react-native-ble-plx';
import * as LocalAuthentication from 'expo-local-authentication';

const { width, height } = Dimensions.get('window');
const bleManager = new BleManager();
const CLASS_UUID = '94f275e7-a7eb-436f-8dc8-0524ba3bbf05';

// ─── Design System & Palette ────────────────────────────────────────────────
const COLORS = {
  bgStart: '#FDFBF7', bgEnd: '#E6F4F1', primaryStart: '#10B981', primaryEnd: '#059669',
  accentBlue: '#3B82F6', accentRed: '#F43F5E', textDark: '#0F172A',
  textGray: '#64748B', textLight: '#94A3B8', white: '#FFFFFF',
};

// ─── Shared Components ──────────────────────────────────────────────────────
const DotGrid = () => {
  const dotSpacing = 35;
  const cols = Math.ceil(width / dotSpacing) + 1;
  const rows = Math.ceil(height / dotSpacing) + 1;
  const dots = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      dots.push(
        <View key={`${i}-${j}`} style={{ position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.textLight, opacity: 0.15, left: j * dotSpacing + (i % 2 === 0 ? 0 : dotSpacing / 2), top: i * dotSpacing }} />
      );
    }
  }
  return <View style={StyleSheet.absoluteFill}>{dots}</View>;
};

const GlassCard = ({ children, style, onPress, onLongPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => { if (onPress || onLongPress) Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start(); };
  const handlePressOut = () => { if (onPress || onLongPress) Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start(); };
  const CardContent = (<Animated.View style={[{ transform: [{ scale }] }, styles.bentoCard, style]}>{children}</Animated.View>);
  return onPress || onLongPress ? (<Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} onLongPress={onLongPress}>{CardContent}</Pressable>) : CardContent;
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function StudentDashboard({ route }) {
  const { phone } = route?.params || { phone: '9999999999' };
  const insets = useSafeAreaInsets();

  // States
  const [profile, setProfile] = useState({ name: 'Loading...', universityRoll: '---', year: 1, semester: 1 });
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ attendancePercentage: '0', streak: 0, classesAttended: 0 });
  const [isScanning, setIsScanning] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [nearbyDevices, setNearbyDevices] = useState([]);
  const [radarLoop, setRadarLoop] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Calendar State
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const calCells = [];
  for (let i = 0; i < firstDay; i++) calCells.push(null);
  for (let i = 1; i <= daysInMonth; i++) calCells.push(i);

  const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  // Data Fetching
  async function fetchMyRecords() {
    try {
      const pRes = await fetch(`http://10.189.118.185:3000/api/users/${phone}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProfile(pData);
      }
      
      const rRes = await fetch(`http://10.189.118.185:3000/api/records/student/${phone}`);
      if (rRes.ok) {
        const data = await rRes.json();
        setHistory(data.history || []);
        
        let attendedCount = data.history ? data.history.length : 0;
        let streakCount = data.history ? Math.min(attendedCount, 12) : 0; 
        let pct = attendedCount > 0 ? '100' : '0'; 

        setStats({
          attendancePercentage: pct,
          streak: streakCount,
          classesAttended: attendedCount
        });
      }
    } catch (err) { console.log('Data fetch error', err); }
  }

  useEffect(() => {
    fetchMyRecords();
  }, []);

  const ATTENDED_DAYS = history
    .filter(h => new Date(h.timestamp).getMonth() === currentMonth && new Date(h.timestamp).getFullYear() === currentYear)
    .map(h => new Date(h.timestamp).getDate());

  // Fixed Mock data for visual parity
  const MISSED_DAYS = [4, 12, 18];


  // Scanner Sheet State & PanResponder
  const sheetY = useRef(new Animated.Value(height)).current;
  const lastSheetY = useRef(height);
  const snapPoints = { closed: height, half: height * 0.3, full: 0 };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        let newY = lastSheetY.current + gesture.dy;
        if (newY < snapPoints.full) newY = snapPoints.full;
        if (newY > snapPoints.closed) newY = snapPoints.closed;
        sheetY.setValue(newY);
      },
      onPanResponderRelease: (_, gesture) => {
        let target = snapPoints.half;
        if (gesture.dy < -100 || (lastSheetY.current === snapPoints.half && gesture.dy < -20)) target = snapPoints.full;
        else if (gesture.dy > 100 || (lastSheetY.current === snapPoints.full && gesture.dy > 20)) target = snapPoints.half;
        lastSheetY.current = target;
        Animated.spring(sheetY, { toValue: target, useNativeDriver: true, tension: 60, friction: 10 }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (showScanner) {
      lastSheetY.current = snapPoints.half;
      Animated.spring(sheetY, { toValue: snapPoints.half, useNativeDriver: true, tension: 50, friction: 8 }).start();
    } else {
      lastSheetY.current = snapPoints.closed;
      Animated.timing(sheetY, { toValue: snapPoints.closed, duration: 300, useNativeDriver: true }).start();
      if (isScanning) {
        if (radarLoop) radarLoop.stop();
        bleManager.stopDeviceScan();
        setIsScanning(false);
      }
    }
  }, [showScanner]);

  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseOpac1 = useRef(new Animated.Value(0.5)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseOpac2 = useRef(new Animated.Value(0.5)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const radarScale = useRef(new Animated.Value(1)).current;
  const radarOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    const p1 = Animated.loop(Animated.parallel([Animated.timing(pulseAnim1, { toValue: 1.8, duration: 2000, useNativeDriver: true }), Animated.timing(pulseOpac1, { toValue: 0, duration: 2000, useNativeDriver: true })]));
    p1.start();
    let p2;
    setTimeout(() => {
      p2 = Animated.loop(Animated.parallel([Animated.timing(pulseAnim2, { toValue: 1.8, duration: 2000, useNativeDriver: true }), Animated.timing(pulseOpac2, { toValue: 0, duration: 2000, useNativeDriver: true })]));
      p2.start();
    }, 1000);
    return () => { p1.stop(); if (p2) p2.stop(); bleManager.stopDeviceScan(); };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android' && Platform.Version < 31) {
      const g = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      return g === PermissionsAndroid.RESULTS.GRANTED;
    } else if (Platform.OS === 'android') {
      const res = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(res).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
    }
    return true;
  };

  const handleScanInit = async () => {
    if (attendanceMarked || isScanning) return;
    const granted = await requestPermissions();
    if (!granted) return;

    // Wait for BT
    const state = await bleManager.state();
    if (state !== 'PoweredOn') {
      Alert.alert('Bluetooth Off', 'Turn Bluetooth on to scan for classes.');
      return;
    }

    setShowScanner(true);
    setIsScanning(true);
    setNearbyDevices([]);

    const radar = Animated.loop(
      Animated.parallel([
        Animated.timing(radarScale, { toValue: 2.5, duration: 1500, useNativeDriver: true }),
        Animated.timing(radarOpacity, { toValue: 0, duration: 1500, useNativeDriver: true })
      ])
    );
    radarScale.setValue(1);
    radarOpacity.setValue(1);
    radar.start();
    setRadarLoop(radar);

    // Deep REAL BLE Scan
    bleManager.startDeviceScan([CLASS_UUID], null, async (error, device) => {
      if (error) { console.log('Scan Error:', error); return; }
      if (device) {
        bleManager.stopDeviceScan();
        try {
          const res = await fetch(`http://10.189.118.185:3000/api/sessions/active`);
          if (res.ok) {
            const authorizedClasses = await res.json();
            // Match the student's year/sem or just display all active 
            setNearbyDevices(authorizedClasses.map(session => ({
              id: session._id,
              name: session.subjectName,
              teacher: session.teacherName,
              sessionId: session._id,
            })));
          }
        } catch(err) {}
      }
    });

    // Auto-stop radar after 8s
    setTimeout(() => {
      if (isScanning) {
        bleManager.stopDeviceScan();
        setIsScanning(false);
        if (radarLoop) radarLoop.stop();
      }
    }, 8000);
  };

  const handleDeviceSelect = async (device) => {
    if (radarLoop) radarLoop.stop();
    bleManager.stopDeviceScan();
    setIsScanning(false);

    // Bio Auth
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify Identity for Attendance',
      fallbackLabel: 'Use Passcode',
    });

    if (!auth.success) return;

    // Secure Register Post
    const apiRes = await fetch('http://10.189.118.185:3000/api/attendance/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: device.sessionId, studentPhone: phone })
    });

    if (apiRes.ok) {
      setAttendanceMarked(true);
      setTimeout(() => setShowScanner(false), 2000);
      fetchMyRecords();
    } else {
      const err = await apiRes.json();
      Alert.alert('Attendance Failed', err.error || 'Server rejected');
      setShowScanner(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bgStart }]}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1, overflow: 'hidden', paddingTop: insets.top }}>
        <DotGrid />

        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.studentName}>{profile.name}</Text>
            <Text style={styles.studentUUID}>{profile.universityRoll} • Year {profile.year} • Sem {profile.semester}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <MaterialCommunityIcons name="cog-outline" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarBtn}>
              <Image source={{ uri: 'https://i.pravatar.cc/150?u=sourodip' }} style={styles.avatar} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>

          <View style={styles.ctaContainer}>
            <View style={styles.scanWrapper}>
              {!attendanceMarked && (
                <>
                  <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim1 }], opacity: pulseOpac1 }]} />
                  <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim2 }], opacity: pulseOpac2 }]} />
                </>
              )}
              <Pressable
                onPress={handleScanInit}
                style={({ pressed }) => [{ transform: [{ scale: pressed && !attendanceMarked ? 0.94 : 1 }] }]}
              >
                <View style={[styles.scanBtn, attendanceMarked && styles.scanBtnDone]}>
                  <MaterialCommunityIcons name={attendanceMarked ? 'check-decagram' : 'bluetooth-connect'} size={50} color={COLORS.white} />
                  <Text style={styles.scanBtnText}>{attendanceMarked ? 'Marked ✓' : 'Scan'}</Text>
                </View>
              </Pressable>
            </View>
            <Text style={styles.ctaSub}>Tap to start Hardware Scan</Text>
          </View>

          <View style={styles.statsLayout}>
            <View style={styles.statsLeft}>
              <GlassCard style={styles.mainStatCard}>
                <View style={[styles.statIconWrap, { backgroundColor: '#D1FAE5' }]}>
                  <MaterialCommunityIcons name="chart-arc" size={26} color={COLORS.primaryStart} />
                </View>
                <View>
                  <Text style={styles.mainStatValue}>{stats.attendancePercentage}%</Text>
                  <Text style={styles.statLabel}>Attendance</Text>
                </View>
                <View style={styles.trendBadge}>
                  <MaterialCommunityIcons name="trending-up" size={14} color={COLORS.primaryStart} />
                  <Text style={styles.trendText}>Up-to-Date</Text>
                </View>
              </GlassCard>
            </View>

            <View style={styles.statsRight}>
              <GlassCard style={styles.miniStatCard}>
                <View style={[styles.miniIconWrap, { backgroundColor: '#FFE4E6' }]}>
                  <MaterialCommunityIcons name="fire" size={24} color={COLORS.accentRed} />
                </View>
                <View style={styles.miniStatContent}>
                  <Text style={styles.miniStatValue}>{stats.streak} Days</Text>
                  <Text style={styles.miniStatLabel}>Streak</Text>
                </View>
              </GlassCard>

              <GlassCard style={styles.miniStatCard}>
                <View style={[styles.miniIconWrap, { backgroundColor: '#DBEAFE' }]}>
                  <MaterialCommunityIcons name="file-document-outline" size={24} color={COLORS.accentBlue} />
                </View>
                <View style={styles.miniStatContent}>
                  <Text style={styles.miniStatValue}>{stats.classesAttended}</Text>
                  <Text style={styles.miniStatLabel}>Classes</Text>
                </View>
              </GlassCard>
            </View>
          </View>

          <GlassCard style={styles.calendarCard}>
            <View style={styles.calHeaderRow}>
              <Text style={styles.calMonthTitle}>{monthName} {currentYear}</Text>
              <View style={styles.calChevrons}>
                <TouchableOpacity onPress={handlePrevMonth}><MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.textDark} /></TouchableOpacity>
                <TouchableOpacity onPress={handleNextMonth}><MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textDark} /></TouchableOpacity>
              </View>
            </View>

            <View style={styles.calGrid}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((wd, i) => (<Text key={i} style={styles.calWdLabel}>{wd}</Text>))}
              {calCells.map((d, i) => {
                const isAttended = d && ATTENDED_DAYS.includes(d);
                const isMissed = d && MISSED_DAYS.includes(d);
                const isToday = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                return (
                  <View key={i} style={styles.calCellContainer}>
                    {d && (
                      <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={() => setSelectedDate(d)}
                        style={[styles.calCell, isAttended && styles.calAttended, isMissed && styles.calMissed, isToday && styles.calToday]}
                      >
                        <Text style={[styles.calCellText, isAttended && styles.calAttendedTxt, isMissed && styles.calMissedTxt, isToday && styles.calTodayTxt]}>{d}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard style={styles.subjectsCard}>
            <Text style={styles.subjectsTitle}>Subjects Breakdown</Text>
            {[
              { name: 'Mathematics', pct: 82, color: COLORS.accentBlue },
              { name: 'Physics', pct: 74, color: COLORS.primaryStart },
              { name: 'Chemistry', pct: 91, color: '#8B5CF6' },
              { name: 'Programming', pct: 67, color: '#F59E0B' },
            ].map((subj, i) => (
              <View key={i} style={styles.subjRow}>
                <Text style={styles.subjName}>{subj.name}</Text>
                <View style={styles.subjTrack}>
                  <View style={[styles.subjFill, { width: `${subj.pct}%`, backgroundColor: subj.color }]} />
                </View>
                <Text style={[styles.subjPct, { color: subj.color }]}>{subj.pct}%</Text>
              </View>
            ))}
          </GlassCard>

        </ScrollView>
      </View>

      <Animated.View pointerEvents={showScanner ? 'auto' : 'none'} style={[styles.scannerSheet, { transform: [{ translateY: sheetY }] }]}>
        <Animated.View style={[styles.sheetBackdrop, { opacity: sheetY.interpolate({ inputRange: [snapPoints.full, snapPoints.half, snapPoints.closed], outputRange: [1, 1, 0], extrapolate: 'clamp' }) }]}>
          <Pressable style={{ flex: 1 }} onPress={() => !isScanning && setShowScanner(false)} />
        </Animated.View>
        
        <View style={[styles.scannerContent, { paddingBottom: insets.bottom + 20 }]}>
          <View {...panResponder.panHandlers} style={styles.dragHandleContainer}><View style={styles.dragHandle} /></View>

          {!attendanceMarked ? (
            <>
              <View style={styles.scannerHeader}>
                <View>
                  <Text style={styles.scannerTitle}>Finding Beacon</Text>
                  <Text style={styles.scannerSub}>Stay nearby to mark your presence.</Text>
                </View>
                <MaterialCommunityIcons name="bluetooth-audio" size={28} color={COLORS.primaryEnd} />
              </View>

              <View style={styles.radarContainer}>
                <Animated.View style={[styles.radarCircle, { transform: [{ scale: radarScale }], opacity: radarOpacity }]} />
                <Animated.View style={[styles.radarCircle, { transform: [{ scale: radarScale.interpolate({ inputRange: [1, 2.5], outputRange: [1, 2]}) }], opacity: radarOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5]}) }]} />
                <View style={styles.radarCore}><MaterialCommunityIcons name="antenna" size={32} color={COLORS.primaryEnd} /></View>
              </View>

              {nearbyDevices.length === 0 ? (
                <View style={styles.emptyDeviceList}><Text style={styles.scanningText}>{isScanning ? 'Listening via Bluetooth...' : 'Scan Timeout.'}</Text></View>
              ) : (
                <ScrollView style={styles.deviceList} showsVerticalScrollIndicator={false}>
                  {nearbyDevices.map((device, i) => (
                    <TouchableOpacity key={i} style={styles.deviceItem} onPress={() => handleDeviceSelect(device)}>
                      <View style={[styles.deviceIcon, { backgroundColor: '#D1FAE5' }]}><MaterialCommunityIcons name="bluetooth" size={20} color={COLORS.primaryEnd} /></View>
                      <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>{device.name}</Text>
                        <Text style={styles.deviceRssi}>Prof. {device.teacher}</Text>
                      </View>
                      <MaterialCommunityIcons name="fingerprint" size={24} color={COLORS.primaryEnd} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <View style={styles.successState}>
              <View style={styles.successIconWrap}><MaterialCommunityIcons name="check-all" size={60} color={COLORS.white} /></View>
              <Text style={styles.successTitle}>Verified on Server!</Text>
              <Text style={styles.successSub}>You are officially marked Present.</Text>
            </View>
          )}
        </View>
      </Animated.View>

      <Modal visible={!!selectedDate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedDate(null)} />
          <View style={[styles.infoModal, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.infoModalTitle}>{monthName} {selectedDate}, {currentYear}</Text>
            <GlassCard style={styles.infoCard}>
              <View style={styles.infoRow}><MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.textGray} /><Text style={styles.infoText}>09:00 AM - 11:00 AM</Text></View>
              <View style={styles.infoRow}><MaterialCommunityIcons name="book-open-outline" size={20} color={COLORS.textGray} /><Text style={styles.infoText}>Advanced Algorithms (CS304)</Text></View>
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{ATTENDED_DAYS.includes(selectedDate) ? 'PRESENT' : MISSED_DAYS.includes(selectedDate) ? 'ABSENT' : 'UPCOMING'}</Text>
              </View>
            </GlassCard>
            <TouchableOpacity style={styles.closeModalBtn} activeOpacity={0.8} onPress={() => setSelectedDate(null)}>
              <Text style={styles.closeModalTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 10 },
  bentoCard: { borderRadius: 28, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 2, padding: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 15 },
  greeting: { fontSize: 13, color: COLORS.textGray, fontWeight: '700' },
  studentName: { fontSize: 24, fontWeight: '900', color: COLORS.textDark, marginTop: 2, letterSpacing: -0.5 },
  studentUUID: { fontSize: 13, color: COLORS.textGray, marginTop: 4, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  avatarBtn: { width: 48, height: 48, borderRadius: 24, padding: 2, backgroundColor: COLORS.white },
  avatar: { width: '100%', height: '100%', borderRadius: 22 },
  ctaContainer: { alignItems: 'center', marginVertical: 35 },
  scanWrapper: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  scanBtn: { width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.primaryStart, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primaryStart, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  scanBtnDone: { opacity: 0.9 },
  scanBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
  glowRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.primaryStart, opacity: 0.5 },
  ctaSub: { fontSize: 14, color: COLORS.textGray, fontWeight: '600' },
  statsLayout: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  statsLeft: { flex: 1 },
  statsRight: { flex: 1, gap: 15, justifyContent: 'space-between' },
  mainStatCard: { flex: 1, minHeight: 180, justifyContent: 'space-between' },
  statIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  mainStatValue: { fontSize: 36, fontWeight: '900', color: COLORS.textDark, letterSpacing: -1 },
  statLabel: { fontSize: 13, color: COLORS.textGray, fontWeight: '600', marginTop: 2 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginTop: 15 },
  trendText: { color: COLORS.primaryEnd, fontSize: 12, fontWeight: '700', marginLeft: 4 },
  miniStatCard: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 18 },
  miniIconWrap: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  miniStatContent: { flex: 1 },
  miniStatValue: { fontSize: 20, fontWeight: '900', color: COLORS.textDark },
  miniStatLabel: { fontSize: 13, color: COLORS.textGray, marginTop: 2, fontWeight: '700' },
  calendarCard: { marginBottom: 20, padding: 24 },
  calHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  calMonthTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textDark },
  calChevrons: { flexDirection: 'row', gap: 20 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  calCellContainer: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calWdLabel: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 13, fontWeight: '800', color: COLORS.textLight, paddingBottom: 20 },
  calCell: { width: '85%', height: '85%', alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  calCellText: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  calAttended: { backgroundColor: '#D1FAE5' },
  calAttendedTxt: { color: COLORS.primaryEnd, fontWeight: '800' },
  calMissed: { backgroundColor: '#FFE4E6' },
  calMissedTxt: { color: COLORS.accentRed, fontWeight: '800' },
  calToday: { backgroundColor: COLORS.accentBlue, shadowColor: COLORS.accentBlue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  calTodayTxt: { color: COLORS.white, fontWeight: '800' },
  subjectsCard: { marginBottom: 20 },
  subjectsTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 18 },
  subjRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  subjName: { width: 100, fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  subjTrack: { flex: 1, height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
  subjFill: { height: '100%', borderRadius: 5 },
  subjPct: { width: 45, textAlign: 'right', fontSize: 13, fontWeight: '800', color: COLORS.textDark },
  scannerSheet: { position: 'absolute', left: 0, right: 0, top: 0, height: height, zIndex: 1000 },
  sheetBackdrop: { position: 'absolute', top: -height, left: 0, right: 0, height: height * 2, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  scannerContent: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height, backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  dragHandleContainer: { width: '100%', height: 40, alignItems: 'center', justifyContent: 'center', marginTop: -10, marginBottom: 5 },
  dragHandle: { width: 60, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  scannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  scannerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textDark },
  scannerSub: { fontSize: 13, color: COLORS.textGray, marginTop: 4, fontWeight: '600' },
  radarContainer: { height: 180, alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  radarCircle: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: '#10B98133', backgroundColor: '#10B98111' },
  radarCore: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#10B981', shadowOpacity: 0.2, shadowRadius: 10 },
  emptyDeviceList: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanningText: { fontSize: 14, color: COLORS.textLight, fontWeight: '600' },
  deviceList: { flex: 1, marginTop: 5 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  deviceIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deviceInfo: { flex: 1, marginLeft: 14 },
  deviceName: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  deviceRssi: { fontSize: 13, color: COLORS.textGray, marginTop: 3, fontWeight: '500' },
  successState: { alignItems: 'center', justifyContent: 'center', height: 300 },
  successIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primaryStart, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: COLORS.primaryStart, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 12 },
  successTitle: { fontSize: 26, fontWeight: '900', color: COLORS.textDark, letterSpacing: -0.5 },
  successSub: { fontSize: 15, color: COLORS.textGray, marginTop: 8, fontWeight: '500', textAlign: 'center', paddingHorizontal: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  infoModal: { backgroundColor: COLORS.white, borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingHorizontal: 30, paddingTop: 30 },
  infoModalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textDark, marginBottom: 20 },
  infoCard: { padding: 20, marginBottom: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  infoText: { fontSize: 15, color: COLORS.textDark, fontWeight: '600' },
  infoBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E2E8F0', marginTop: 10 },
  infoBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.textDark, letterSpacing: 1 },
  closeModalBtn: { backgroundColor: COLORS.textDark, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  closeModalTxt: { color: COLORS.white, fontSize: 16, fontWeight: '800' }
});
