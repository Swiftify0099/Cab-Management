/**
 * Partner Training & Certification — stitch: partner_training_certification
 */
import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'

const COURSES = [
  { title: 'Safe Driving Fundamentals',   duration: '45 min',  progress: 100, cert: true,  icon: 'steering',      color: '#10B981' },
  { title: 'Customer Service Excellence', duration: '30 min',  progress: 80,  cert: false, icon: 'account-heart', color: '#3B82F6' },
  { title: 'Emergency Procedures',        duration: '60 min',  progress: 60,  cert: false, icon: 'ambulance',     color: '#EF4444' },
  { title: 'Vehicle Maintenance Basics',  duration: '50 min',  progress: 35,  cert: false, icon: 'tools',         color: '#F59E0B' },
  { title: 'Night Driving Safety',        duration: '40 min',  progress: 0,   cert: false, icon: 'weather-night', color: '#6366F1' },
  { title: 'Digital Tools & App Usage',   duration: '25 min',  progress: 100, cert: true,  icon: 'cellphone',     color: '#06B6D4' },
]

export default function TrainingScreen() {
  const completed = COURSES.filter(c => c.progress === 100).length
  const total = COURSES.length

  return (
    <View style={{ flex: 1, backgroundColor: '#E0F2FE' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={{ backgroundColor: '#FFFFFF' }} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="chevron-left" size={28} color="#0F172A" /></TouchableOpacity>
          <Text style={s.title}>Training & Certification</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={s.subHeader}>
          <MaterialCommunityIcons name="school" size={18} color="#FFFFFF" />
          <Text style={s.subHeaderText}>{completed}/{total} Courses Completed</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Progress Banner */}
        <View style={s.progressBanner}>
          <Text style={s.progressLabel}>Your Learning Progress</Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${(completed / total) * 100}%` }]} />
          </View>
          <Text style={s.progressPct}>{Math.round((completed / total) * 100)}% Complete</Text>
        </View>

        {/* Certificates Earned */}
        <View style={s.certRow}>
          <MaterialCommunityIcons name="certificate" size={28} color="#EAB308" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.certTitle}>{completed} Certificates Earned</Text>
            <Text style={s.certSub}>Complete all courses to unlock Gold Driver badge</Text>
          </View>
          <TouchableOpacity style={s.certViewBtn}><Text style={s.certViewText}>View</Text></TouchableOpacity>
        </View>

        {/* Courses */}
        <Text style={s.sectionTitle}>All Courses</Text>
        {COURSES.map((course, i) => (
          <TouchableOpacity key={i} style={s.courseCard}>
            <View style={[s.courseIcon, { backgroundColor: course.color + '20' }]}>
              <MaterialCommunityIcons name={course.icon as any} size={24} color={course.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.courseTitleRow}>
                <Text style={s.courseTitle}>{course.title}</Text>
                {course.cert && <MaterialCommunityIcons name="certificate" size={18} color="#EAB308" />}
              </View>
              <Text style={s.courseDuration}>{course.duration}</Text>
              <View style={s.courseTrack}>
                <View style={[s.courseFill, { width: `${course.progress}%`, backgroundColor: course.color }]} />
              </View>
            </View>
            <Text style={[s.coursePct, { color: course.color }]}>{course.progress}%</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, borderBottomColor:'#F1F5F9' },
  title: { fontSize:17, fontWeight:'800', color:'#0F172A' },
  subHeader: { backgroundColor:'#3B82F6', flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:10, gap:8 },
  subHeaderText: { color:'#FFFFFF', fontWeight:'700' },
  progressBanner: { backgroundColor:'#FFFFFF', borderRadius:20, padding:20, marginBottom:14, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:8, elevation:2 },
  progressLabel: { color:'#0F172A', fontWeight:'800', fontSize:16, marginBottom:12 },
  progressTrack: { height:10, backgroundColor:'#E0F2FE', borderRadius:5, overflow:'hidden', marginBottom:8 },
  progressFill: { height:'100%', backgroundColor:'#3B82F6', borderRadius:5 },
  progressPct: { color:'#3B82F6', fontWeight:'700', textAlign:'right' },
  certRow: { backgroundColor:'#FFFFFF', borderRadius:18, padding:16, flexDirection:'row', alignItems:'center', marginBottom:16, borderWidth:1, borderColor:'#FEF9C3', shadowColor:'#EAB308', shadowOpacity:0.1, shadowRadius:8, elevation:2 },
  certTitle: { color:'#0F172A', fontWeight:'800', fontSize:15 },
  certSub: { color:'#6B7280', fontSize:12, marginTop:3 },
  certViewBtn: { backgroundColor:'#EFF6FF', borderRadius:16, paddingHorizontal:14, paddingVertical:8 },
  certViewText: { color:'#1D4ED8', fontWeight:'700' },
  sectionTitle: { fontSize:18, fontWeight:'800', color:'#0F172A', marginBottom:12 },
  courseCard: { backgroundColor:'#FFFFFF', borderRadius:16, padding:16, marginBottom:10, flexDirection:'row', alignItems:'center', gap:14, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  courseIcon: { width:48, height:48, borderRadius:14, alignItems:'center', justifyContent:'center' },
  courseTitleRow: { flexDirection:'row', alignItems:'center', gap:6, marginBottom:4 },
  courseTitle: { flex:1, color:'#0F172A', fontWeight:'700', fontSize:14 },
  courseDuration: { color:'#94A3B8', fontSize:12, marginBottom:8 },
  courseTrack: { height:4, backgroundColor:'#F1F5F9', borderRadius:2, overflow:'hidden' },
  courseFill: { height:'100%', borderRadius:2 },
  coursePct: { fontWeight:'800', fontSize:14 },
})
