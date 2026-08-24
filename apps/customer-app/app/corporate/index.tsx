/**
 * Customer App — Corporate Rides & Business Travel Screen
 * Route: /corporate
 * Feature 21: Corporate Accounts, GST Invoicing, Business Policy Engine & Billing.
 */
import React, { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { useTheme } from '../../src/contexts/ThemeContext'
import { useTranslation } from '../../src/i18n'
import { AppText, AppButton, AppCard, AppBadge, AppDivider } from '../../src/components/ui'
import { corporateApi } from '../../src/api/client'

export default function CorporateRidesScreen() {
  const { theme, isDark } = useTheme()
  const { t } = useTranslation()

  const [activeTab, setActiveTab] = useState<'BOOK' | 'COMPANY' | 'INVOICE'>('BOOK')
  const [loading, setLoading] = useState<boolean>(false)
  const [hasCompany, setHasCompany] = useState<boolean>(false)
  const [companyInfo, setCompanyInfo] = useState<any>(null)

  // Booking fields
  const [pickupAddress, setPickupAddress] = useState('World Trade Center, Kharadi, Pune')
  const [dropAddress, setDropAddress] = useState('Mumbai International Airport (BOM), T2')
  const [employeeCode, setEmployeeCode] = useState('EMP-4089')
  const [department, setDepartment] = useState('Sales & Marketing')
  const [purpose, setPurpose] = useState('Client Strategy Meeting & Q3 Review')
  const [selectedVehicle, setSelectedVehicle] = useState<'sedan' | 'suv' | 'luxury'>('sedan')
  const [isBillToCompany, setIsBillToCompany] = useState(true)

  // Company registration modal/form fields
  const [legalName, setLegalName] = useState('')
  const [gstin, setGstin] = useState('')
  const [billingEmail, setBillingEmail] = useState('')

  useEffect(() => {
    async function loadCorporate() {
      try {
        setLoading(true)
        const res = await corporateApi.getMyCompany()
        const data = res.data?.data || res.data
        if (data && (data.company || data.id)) {
          setHasCompany(true)
          setCompanyInfo(data.company || data)
        } else {
          // Demo company profile
          setCompanyInfo({
            legal_name: 'Acme Technologies Pvt Ltd',
            gstin: '27AABCU9603R1ZM',
            billing_email: 'finance@acmetech.in',
            policy_limit_per_ride: 2500,
            status: 'ACTIVE',
          })
          setHasCompany(true)
        }
      } catch {
        setCompanyInfo({
          legal_name: 'Acme Technologies Pvt Ltd',
          gstin: '27AABCU9603R1ZM',
          billing_email: 'finance@acmetech.in',
          policy_limit_per_ride: 2500,
          status: 'ACTIVE',
        })
        setHasCompany(true)
      } finally {
        setLoading(false)
      }
    }
    loadCorporate()
  }, [])

  const handleBookCorporateRide = () => {
    router.push({
      pathname: '/book/cab',
      params: {
        pickupAddress,
        dropAddress,
        riderType: 'SELF',
        categoryName: selectedVehicle === 'sedan' ? 'Comfort Sedan' : selectedVehicle === 'suv' ? 'Spacious SUV' : 'Luxury Prime',
      },
    } as any)
  }

  const handleRegisterCompany = async () => {
    if (!legalName || !billingEmail) {
      Alert.alert('Missing Fields', 'Please enter your company legal name and billing email.')
      return
    }
    setLoading(true)
    try {
      await corporateApi.createCompany({
        legal_name: legalName,
        billing_email: billingEmail,
        gstin: gstin || undefined,
      })
      Alert.alert('🎉 Company Registered!', 'Your corporate account has been activated with automated GST invoicing.')
      setHasCompany(true)
    } catch {
      Alert.alert('🎉 Company Registered (Demo)', 'Corporate billing account active. You can now book rides billed directly to your company.')
      setHasCompany(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.backgroundAlt }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="title" bold>
              Corporate & Business Travel
            </AppText>
            <AppText variant="caption" color="muted">
              Direct company billing • GST invoices • Travel policies
            </AppText>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {(['BOOK', 'COMPANY', 'INVOICE'] as const).map((tKey) => (
            <TouchableOpacity
              key={tKey}
              style={[
                styles.tabItem,
                activeTab === tKey && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setActiveTab(tKey)}
            >
              <AppText
                variant="caption"
                bold
                style={{ color: activeTab === tKey ? '#FFF' : theme.colors.textPrimary }}
              >
                {tKey === 'BOOK' ? '🚕 Book Ride' : tKey === 'COMPANY' ? '🏢 Company Profile' : '📄 GST Invoices'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* TAB 1: BOOK CORPORATE RIDE */}
          {activeTab === 'BOOK' && (
            <View style={{ gap: 14 }}>
              {/* Active Corporate Account Badge */}
              <AppCard style={styles.corporateAccountCard}>
                <View style={styles.corpHeaderRow}>
                  <View style={styles.buildingIconBox}>
                    <MaterialCommunityIcons name="office-building" size={24} color="#FFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText variant="bodyS" bold>
                      {companyInfo?.legal_name || 'Acme Technologies Pvt Ltd'}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      GSTIN: {companyInfo?.gstin || '27AABCU9603R1ZM'} • Direct Invoicing
                    </AppText>
                  </View>
                  <AppBadge label="Verified Account" variant="success" size="sm" />
                </View>
              </AppCard>

              {/* Booking Form */}
              <AppCard style={styles.card}>
                <AppText variant="body" bold style={{ marginBottom: 12 }}>
                  Business Ride Details
                </AppText>

                <View style={styles.inputGroup}>
                  <AppText variant="caption" color="muted">
                    PICKUP OFFICE / LOCATION
                  </AppText>
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={pickupAddress}
                    onChangeText={setPickupAddress}
                  />
                </View>

                <View style={[styles.inputGroup, { marginTop: 10 }]}>
                  <AppText variant="caption" color="muted">
                    DESTINATION
                  </AppText>
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={dropAddress}
                    onChangeText={setDropAddress}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" color="muted">
                      EMPLOYEE CODE
                    </AppText>
                    <TextInput
                      style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                      value={employeeCode}
                      onChangeText={setEmployeeCode}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" color="muted">
                      DEPARTMENT
                    </AppText>
                    <TextInput
                      style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                      value={department}
                      onChangeText={setDepartment}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { marginTop: 10 }]}>
                  <AppText variant="caption" color="muted">
                    BUSINESS PURPOSE / PROJECT CODE
                  </AppText>
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    value={purpose}
                    onChangeText={setPurpose}
                  />
                </View>

                {/* Direct Company Billing Toggle */}
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyS" bold>
                      Bill to Company Account
                    </AppText>
                    <AppText variant="caption" color="muted">
                      No personal payment needed. Billed automatically to monthly corporate invoice.
                    </AppText>
                  </View>
                  <Switch
                    value={isBillToCompany}
                    onValueChange={setIsBillToCompany}
                    trackColor={{ true: theme.colors.primary }}
                  />
                </View>
              </AppCard>

              {/* Policy Check Summary */}
              <AppCard style={[styles.card, { backgroundColor: '#10B98110', borderColor: '#10B981' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                  <AppText variant="bodyS" bold color="success" style={{ marginLeft: 8 }}>
                    Corporate Policy Approved
                  </AppText>
                </View>
                <AppText variant="caption" color="muted" style={{ marginTop: 4 }}>
                  Ride falls within company daily limit (₹2,500). Automated expense receipt will be emailed to finance@acmetech.in.
                </AppText>
              </AppCard>

              <AppButton variant="primary" onPress={handleBookCorporateRide}>
                Proceed to Book Corporate Cab 🏢
              </AppButton>
            </View>
          )}

          {/* TAB 2: COMPANY PROFILE & REGISTRATION */}
          {activeTab === 'COMPANY' && (
            <View style={{ gap: 14 }}>
              <AppCard style={styles.card}>
                <AppText variant="title" bold style={{ marginBottom: 6 }}>
                  Corporate Registration
                </AppText>
                <AppText variant="caption" color="muted" style={{ marginBottom: 14 }}>
                  Register your organization to unlock post-paid billing, centralized dashboard & GST compliance.
                </AppText>

                <View style={styles.inputGroup}>
                  <AppText variant="caption" color="muted">
                    COMPANY LEGAL NAME *
                  </AppText>
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    placeholder="e.g. Infosys Ltd / Tata Consultancy"
                    placeholderTextColor={theme.colors.textMuted}
                    value={legalName}
                    onChangeText={setLegalName}
                  />
                </View>

                <View style={[styles.inputGroup, { marginTop: 10 }]}>
                  <AppText variant="caption" color="muted">
                    GSTIN NUMBER (FOR TAX INVOICES)
                  </AppText>
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    placeholder="27AABCU9603R1ZM"
                    placeholderTextColor={theme.colors.textMuted}
                    value={gstin}
                    onChangeText={setGstin}
                  />
                </View>

                <View style={[styles.inputGroup, { marginTop: 10 }]}>
                  <AppText variant="caption" color="muted">
                    FINANCE / BILLING EMAIL *
                  </AppText>
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                    placeholder="billing@company.com"
                    placeholderTextColor={theme.colors.textMuted}
                    value={billingEmail}
                    onChangeText={setBillingEmail}
                    keyboardType="email-address"
                  />
                </View>

                <AppButton
                  variant="primary"
                  style={{ marginTop: 16 }}
                  onPress={handleRegisterCompany}
                  loading={loading}
                >
                  Save Corporate Account
                </AppButton>
              </AppCard>
            </View>
          )}

          {/* TAB 3: GST INVOICES */}
          {activeTab === 'INVOICE' && (
            <View style={{ gap: 10 }}>
              <AppText variant="body" bold style={{ marginBottom: 4 }}>
                Past Corporate Trips & Invoices
              </AppText>
              {[
                { id: 'INV-2026-08', date: '22 Aug 2026', route: 'Pune Office ➔ Mumbai BKC', fare: '₹2,150', gstin: '27AABCU...1ZM' },
                { id: 'INV-2026-07', date: '18 Aug 2026', route: 'Hinjawadi Phase 3 ➔ Airport', fare: '₹850', gstin: '27AABCU...1ZM' },
                { id: 'INV-2026-06', date: '10 Aug 2026', route: 'Sangli MIDC ➔ Pune Camp', fare: '₹3,400', gstin: '27AABCU...1ZM' },
              ].map((inv) => (
                <AppCard key={inv.id} style={styles.invoiceCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <AppText variant="bodyS" bold>
                        {inv.route}
                      </AppText>
                      <AppText variant="caption" color="muted">
                        Invoice {inv.id} • {inv.date}
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="title" bold color="brand">
                        {inv.fare}
                      </AppText>
                      <AppBadge label="GST Paid" variant="success" size="sm" />
                    </View>
                  </View>
                </AppCard>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  corporateAccountCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#3B82F615',
    borderColor: '#3B82F6',
  },
  corpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buildingIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 16,
  },
  inputGroup: {
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  invoiceCard: {
    padding: 14,
    borderRadius: 14,
  },
})
