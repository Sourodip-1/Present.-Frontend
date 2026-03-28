import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, StyleSheet, Dimensions,
  ScrollView, Animated, Platform, PermissionsAndroid, StatusBar, Modal,
  Image, PanResponder, Alert, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeStorage from '../utils/storage';
import API_URL from '../config';
// import { BleManager } from 'react-native-ble-plx';
// import * as LocalAuthentication from 'expo-local-authentication';

const { width, height } = Dimensions.get('window');
let bleManager;
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
export default function StudentDashboard({ route, navigation }) {
  const { email } = route?.params || { email: 'student@university.edu' };
  const insets = useSafeAreaInsets();

  // States
  const [profile, setProfile] = useState({ name: 'Loading...', universityRoll: '---', year: 1, semester: 1 });
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ attendancePercentage: '0', streak: 0, classesAttended: 0 });
  const [isScanning, setIsScanning] = useState(false);
  const [isFetchingSessions, setIsFetchingSessions] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [nearbyDevices, setNearbyDevices] = useState([]);
  const [radarLoop, setRadarLoop] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [subjectStats, setSubjectStats] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [missedDatesStore, setMissedDatesStore] = useState([]);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  async function fetchMyRecords() {
    try {
      const pRes = await fetch(`${API_URL}/api/users/${email}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.role === 'student' && pData.studentProfile) {
          const semester = pData.studentProfile.semester || '--';
          let derivedYear = '--';
          if (semester !== '--') {
            derivedYear = Math.ceil(parseInt(semester) / 2).toString();
          }
          setProfile({
            name: pData.studentProfile.fullName || 'No Name',
            universityRoll: pData.studentProfile.universityRoll || '---',
            semester: semester,
            section: pData.studentProfile.section || '--',
            year: derivedYear
          });
        }
      }

      const rRes = await fetch(`${API_URL}/api/records/student/${email}`);
      if (rRes.ok) {
        const data = await rRes.json();
        setHistory(data.history || []);
        if (data.missedDates) setMissedDatesStore(data.missedDates);

        setStats({
          attendancePercentage: data.overallPct || '0',
          streak: data.streakCount || 0,
          classesAttended: data.totalAttended || 0
        });

        if (data.subjectStats && Array.isArray(data.subjectStats)) {
          const colors = [COLORS.accentBlue, COLORS.primaryStart, '#8B5CF6', '#F59E0B', '#EF4444', '#10B981'];
          const breakdown = data.subjectStats.map((subj, i) => {
             return { ...subj, color: colors[i % colors.length] };
          });
          setSubjectStats(breakdown);
        }
      }
    } catch (err) { console.log('Data fetch error', err); }
  }

  useEffect(() => { fetchMyRecords(); }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchMyRecords();
    setRefreshing(false);
  }, []);

  const ATTENDED_DAYS = history
    .filter(h => new Date(h.timestamp).getMonth() === currentMonth && new Date(h.timestamp).getFullYear() === currentYear)
    .map(h => new Date(h.timestamp).getDate());

  const MISSED_DAYS = missedDatesStore
    .filter(d => new Date(d).getMonth() === currentMonth && new Date(d).getFullYear() === currentYear)
    .map(d => new Date(d).getDate());

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
        if (gesture.dy < -60) target = snapPoints.full;
        else if (gesture.dy > 60) {
           if (lastSheetY.current === snapPoints.half) {
              setShowScanner(false);
              return;
           }
           target = snapPoints.half;
        }
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
        if (bleManager) bleManager.stopDeviceScan();
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
    return () => { p1.stop(); if (p2) p2.stop(); if (bleManager) bleManager.stopDeviceScan(); };
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
    if (isScanning) return;
    if (attendanceMarked) {
      setAttendanceMarked(false);
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

    let bleAvailable = false;
    if (!bleManager) {
      try {
        const { BleManager } = require('react-native-ble-plx');
        bleManager = new BleManager();
        const state = await bleManager.state();
        if (state === 'PoweredOn') bleAvailable = true;
      } catch (e) { console.log('[BLE] Module not available'); }
    } else {
      try { const state = await bleManager.state(); if (state === 'PoweredOn') bleAvailable = true; } catch (e) { }
    }

    if (bleAvailable) {
      const granted = await requestPermissions();
      if (granted) {
        let foundBeacon = false;
        bleManager.startDeviceScan(null, { allowDuplicates: false }, async (error, device) => {
          if (error) return;
          if (device) {
            const hasClassUUID = device.serviceUUIDs && device.serviceUUIDs.includes(CLASS_UUID);
            const isTargetBeacon = hasClassUUID || (device.localName && device.localName.includes('Present'));
            if (isTargetBeacon && !foundBeacon) {
              foundBeacon = true;
              bleManager.stopDeviceScan();
              await fetchActiveSessions(radar);
            }
          }
        });
        setTimeout(async () => {
          if (bleManager) bleManager.stopDeviceScan();
          if (!foundBeacon) await fetchActiveSessions(radar);
        }, 8000);
      } else { await fetchActiveSessions(radar); }
    } else { await fetchActiveSessions(radar); }
  };

  const fetchActiveSessions = async (radar) => {
    setIsFetchingSessions(true);
    try {
      const res = await fetch(`${API_URL}/api/sessions/active`);
      if (res.ok) {
        const activeSessions = await res.json();
        if (activeSessions.length === 0) {
          setNearbyDevices([]);
          setIsScanning(false);
          setIsFetchingSessions(false);
          radar?.stop();
          return;
        }
        setNearbyDevices(activeSessions.map(session => ({
          id: session._id,
          name: session.subjectName,
          teacher: session.teacherName,
          sessionId: session._id,
          department: session.department,
          section: session.section,
        })));
        setIsFetchingSessions(false);
        setIsScanning(false);
        radar?.stop();
      } else {
        setIsFetchingSessions(false);
        setIsScanning(false);
        radar?.stop();
      }
    } catch (err) {
      setIsFetchingSessions(false);
      setIsScanning(false);
      radar?.stop();
    }
  };

  const handleDeviceSelect = async (device) => {
    if (radarLoop) radarLoop.stop();
    if (bleManager) bleManager.stopDeviceScan();
    setIsScanning(false);
    let authResult = { success: true };
    try {
      const LocalAuthentication = require('expo-local-authentication');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        authResult = await LocalAuthentication.authenticateAsync({ promptMessage: 'Verify Identity', fallbackLabel: 'Use Passcode' });
      }
    } catch (e) { console.log('Auth error', e); }

    if (!authResult.success) return;

    const apiRes = await fetch(`${API_URL}/api/attendance/mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: device.sessionId, studentEmail: email })
    });

    if (apiRes.ok) {
      setAttendanceMarked(true);
      fetchMyRecords();
    } else {
      Alert.alert('Attendance Failed', 'Server rejected request');
      setShowScanner(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bgStart }]}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1, overflow: 'hidden', paddingTop: insets.top }}>
        <DotGrid />

        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Hello, {profile?.name?.split(' ')[0] || 'Student'} 👋</Text>
              <Text style={styles.subtitle}>Ready for class?</Text>
            </View>
            <TouchableOpacity style={styles.profileBtn} onPress={() => setShowProfile(true)} activeOpacity={0.8}>
              <Image source={{ uri: `https://api.dicebear.com/7.x/notionists/png?seed=${email}` }} style={styles.profileImg} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView 
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryStart]} tintColor={COLORS.primaryStart} />}
        >
          <View style={styles.ctaContainer}>
            <View style={styles.scanWrapper}>
              {!attendanceMarked && (
                <>
                  <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim1 }], opacity: pulseOpac1 }]} />
                  <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim2 }], opacity: pulseOpac2 }]} />
                </>
              )}
              <Pressable onPress={handleScanInit} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
                <View style={[styles.scanBtn, attendanceMarked && styles.scanBtnDone]}>
                  <MaterialCommunityIcons name={attendanceMarked ? 'check-decagram' : 'bluetooth-connect'} size={50} color={COLORS.white} />
                  <Text style={styles.scanBtnText}>{attendanceMarked ? 'Marked ✓' : 'Scan'}</Text>
                </View>
              </Pressable>
            </View>
            <Text style={styles.ctaSub}>{attendanceMarked ? 'Tap to scan for next class' : 'Tap to start Hardware Scan'}</Text>
          </View>

          <View style={styles.statsLayout}>
            <View style={styles.statsLeft}>
              <GlassCard style={styles.mainStatCard} onPress={() => setShowStatsModal(true)}>
                <View style={[styles.statIconWrap, { backgroundColor: '#D1FAE5' }]}>
                  <MaterialCommunityIcons name="chart-arc" size={26} color={COLORS.primaryStart} />
                </View>
                <View>
                  <Text style={styles.mainStatValue}>{stats.attendancePercentage}%</Text>
                  <Text style={styles.statLabel}>Attendance</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  <MaterialCommunityIcons name="gesture-tap" size={14} color={COLORS.textLight} />
                  <Text style={{ fontSize: 11, color: COLORS.textLight, fontWeight: '600' }}>Tap for details</Text>
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
                        style={[
                          styles.calCell, 
                          isToday && styles.calToday, 
                          isMissed && styles.calMissed, 
                          isAttended && styles.calAttended // Green > Pink
                        ]}
                      >
                        <Text style={[
                          styles.calCellText, 
                          isToday && styles.calTodayTxt, 
                          isMissed && styles.calMissedTxt, 
                          isAttended && styles.calAttendedTxt
                        ]}>{d}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard style={styles.subjectsCard}>
            <Text style={styles.subjectsTitle}>Subjects Breakdown</Text>
            {subjectStats.map((subj, i) => (
              <View key={i} style={styles.subjRow}>
                <Text style={styles.subjName} numberOfLines={1}>{subj.name}</Text>
                <View style={styles.subjTrack}>
                  <View style={[styles.subjFill, { width: `${subj.percentage}%`, backgroundColor: subj.color }]} />
                </View>
                <Text style={[styles.subjPct, { color: subj.color }]}>{subj.percentage}%</Text>
              </View>
            ))}
          </GlassCard>
        </ScrollView>
      </View>

      <Animated.View pointerEvents={showScanner ? 'auto' : 'none'} style={[styles.scannerSheet, { transform: [{ translateY: sheetY }] }]}>
        <Animated.View style={[styles.sheetBackdrop, { opacity: sheetY.interpolate({ inputRange: [snapPoints.full, snapPoints.half, snapPoints.closed], outputRange: [1, 1, 0], extrapolate: 'clamp' }) }]}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowScanner(false)} />
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
                <View style={styles.radarCore}><MaterialCommunityIcons name="antenna" size={32} color={COLORS.primaryEnd} /></View>
              </View>
              <ScrollView style={styles.deviceList}>
                {nearbyDevices.map((device, i) => (
                  <TouchableOpacity key={i} style={styles.deviceItem} onPress={() => handleDeviceSelect(device)}>
                    <View style={[styles.deviceIcon, { backgroundColor: '#D1FAE5' }]}><MaterialCommunityIcons name="bluetooth" size={20} color={COLORS.primaryEnd} /></View>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{device.name}</Text>
                      <Text style={styles.deviceRssi}>Prof. {device.teacher}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={styles.successState}>
              <View style={styles.successIconWrap}><MaterialCommunityIcons name="check-decagram" size={60} color="#FFFFFF" /></View>
              <Text style={styles.successHead}>You're Marked Present!</Text>
              <Text style={styles.successSub}>Your attendance for the current class is synced.</Text>
              <TouchableOpacity style={styles.scanBtnSecondary} onPress={handleScanInit}>
                <Text style={styles.scanBtnSecondaryText}>Scan Next Class</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>

      <Modal visible={showProfile} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowProfile(false)} />
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, paddingBottom: 50 }}>
             <View style={{ width: 50, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 25 }} />
             <View style={{ alignItems: 'center', marginBottom: 30 }}>
                <Image source={{ uri: `https://api.dicebear.com/7.x/notionists/png?seed=${email}` }} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 15, backgroundColor: '#F8FAFC' }} />
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#1E293B' }}>{profile?.name || 'Student'}</Text>
                <Text style={{ fontSize: 15, color: '#64748B', fontWeight: '500', marginTop: 4 }}>{email}</Text>
             </View>
             <View style={{ backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 12, marginBottom: 12 }}>
                   <Text style={{ color: '#64748B', fontWeight: '600' }}>University Roll</Text>
                   <Text style={{ color: '#1E293B', fontWeight: '800' }}>{profile?.universityRoll}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 12, marginBottom: 12 }}>
                   <Text style={{ color: '#64748B', fontWeight: '600' }}>Year & Sem</Text>
                   <Text style={{ color: '#1E293B', fontWeight: '800' }}>Year {profile?.year} • Sem {profile?.semester}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                   <Text style={{ color: '#64748B', fontWeight: '600' }}>Class Section</Text>
                   <Text style={{ color: '#1E293B', fontWeight: '800' }}>Sec {profile?.section}</Text>
                </View>
             </View>
             <TouchableOpacity 
                style={{ backgroundColor: '#FEF2F2', padding: 18, borderRadius: 16, marginTop: 25, alignItems: 'center' }} 
                onPress={async () => {
                  await SafeStorage.clear();
                  navigation.replace('Login');
                }}
             >
                <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 16 }}>Sign Out</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Info Modal */}
      <Modal visible={!!selectedDate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedDate(null)} />
          <View style={[styles.infoModal, { paddingBottom: insets.bottom + 30, maxHeight: height * 0.8 }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.infoModalTitle}>{monthName} {selectedDate}, {currentYear}</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {(() => {
                const dayLogs = history.filter(h => new Date(h.timestamp).getDate() === selectedDate && new Date(h.timestamp).getMonth() === currentMonth);
                if (dayLogs.length === 0) {
                  return <Text style={{ color: COLORS.textGray, textAlign: 'center', marginVertical: 40 }}>No sessions attended on this day.</Text>;
                }
                return dayLogs.map((log, i) => (
                  <GlassCard key={i} style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.textGray} />
                      <Text style={styles.infoText}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="book-open-outline" size={20} color={COLORS.textGray} />
                      <Text style={styles.infoText}>{log.sessionId?.subjectName || 'General Class'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="account-tie-outline" size={20} color={COLORS.textGray} />
                      <Text style={styles.infoText}>Prof. {log.sessionId?.teacherName || 'Unknown'}</Text>
                    </View>
                    <View style={styles.infoBadge}><Text style={styles.infoBadgeText}>PRESENT</Text></View>
                  </GlassCard>
                ));
              })()}
            </ScrollView>
            
            <TouchableOpacity style={styles.closeModalBtn} activeOpacity={0.8} onPress={() => setSelectedDate(null)}>
              <Text style={styles.closeModalTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Attendance Stats Detail Modal */}
      <Modal visible={showStatsModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowStatsModal(false)} />
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 28, paddingBottom: insets.bottom + 30, maxHeight: height * 0.82 }}>
            <View style={{ width: 50, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 22 }} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#1E293B', marginBottom: 6 }}>📊 Attendance Breakdown</Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 24, fontWeight: '600' }}>Updated weekly — refreshes every Monday</Text>

              {/* Overall */}
              <View style={{ backgroundColor: '#F0FDF4', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#BBF7D0' }}>
                <Text style={{ fontSize: 12, color: '#059669', fontWeight: '800', letterSpacing: 1, marginBottom: 4 }}>OVERALL ATTENDANCE</Text>
                <Text style={{ fontSize: 52, fontWeight: '900', color: '#059669', letterSpacing: -2 }}>{stats.attendancePercentage}%</Text>
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '600' }}>{stats.classesAttended} total classes attended</Text>
              </View>

              {/* This Week */}
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 14 }}>This Week</Text>
              {(() => {
                const now = new Date();
                const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
                const weekLogs = history.filter(h => new Date(h.timestamp) >= startOfWeek);
                const weekDays = [...new Set(weekLogs.map(h => new Date(h.timestamp).toDateString()))];
                return (
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                      <Text style={{ color: '#64748B', fontWeight: '700' }}>Classes This Week</Text>
                      <Text style={{ color: '#1E293B', fontWeight: '900', fontSize: 20 }}>{weekLogs.length}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {['S','M','T','W','T','F','S'].map((day, idx) => {
                        const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + idx);
                        const attended = weekDays.includes(d.toDateString());
                        const isToday = d.toDateString() === now.toDateString();
                        return (
                          <View key={idx} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: attended ? '#10B981' : isToday ? '#DBEAFE' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: isToday && !attended ? 2 : 0, borderColor: '#3B82F6' }}>
                              <MaterialCommunityIcons name={attended ? 'check' : 'minus'} size={16} color={attended ? '#FFF' : '#94A3B8'} />
                            </View>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isToday ? '#3B82F6' : '#94A3B8' }}>{day}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })()}

              {/* This Month */}
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 14 }}>This Month — {new Date().toLocaleString('default', { month: 'long' })}</Text>
              {(() => {
                const now = new Date();
                const monthLogs = history.filter(h => { const d = new Date(h.timestamp); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
                const pct = stats.classesAttended > 0 ? Math.min(100, Math.round((monthLogs.length / stats.classesAttended) * 100)) : 0;
                return (
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 18, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text style={{ color: '#64748B', fontWeight: '700' }}>Monthly Classes</Text>
                      <Text style={{ color: '#1E293B', fontWeight: '900', fontSize: 20 }}>{monthLogs.length}</Text>
                    </View>
                    <View style={{ height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
                      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: '#10B981', borderRadius: 5 }} />
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>{monthLogs.length} of {stats.classesAttended} total classes this month ({pct}%)</Text>
                  </View>
                );
              })()}
            </ScrollView>
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
  header: { paddingHorizontal: 24, paddingBottom: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 13, color: COLORS.textGray, fontWeight: '700' },
  subtitle: { fontSize: 24, fontWeight: '900', color: COLORS.textDark, marginTop: 2 },
  profileBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9' },
  profileImg: { width: '100%', height: '100%', borderRadius: 24 },
  ctaContainer: { alignItems: 'center', marginVertical: 35 },
  scanWrapper: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  scanBtn: { width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.primaryStart, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primaryStart, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  scanBtnDone: { opacity: 0.9 },
  scanBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  scanBtnSecondary: { marginTop: 20, backgroundColor: '#F1F5F9', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  scanBtnSecondaryText: { color: '#3B82F6', fontWeight: '700', fontSize: 15 },
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
  calToday: { backgroundColor: COLORS.accentBlue, shadowColor: COLORS.accentBlue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  calTodayTxt: { color: COLORS.white, fontWeight: '800' },
  calAttended: { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  calAttendedTxt: { color: COLORS.white, fontWeight: '800' },
  calMissed: { backgroundColor: '#FFE4E6' },
  calMissedTxt: { color: COLORS.accentRed, fontWeight: '800' },
  subjectsCard: { marginBottom: 20 },
  subjectsTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 18 },
  subjRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  subjName: { width: 70, fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  subjTrack: { flex: 1, height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
  subjFill: { height: '100%', borderRadius: 5 },
  subjPct: { width: 42, textAlign: 'right', fontSize: 13, fontWeight: '800' },
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
  infoBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#D1FAE5', marginTop: 10 },
  infoBadgeText: { fontSize: 12, fontWeight: '800', color: '#059669', letterSpacing: 1 },
  closeModalBtn: { backgroundColor: COLORS.textDark, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  closeModalTxt: { color: COLORS.white, fontSize: 16, fontWeight: '800' }
});
