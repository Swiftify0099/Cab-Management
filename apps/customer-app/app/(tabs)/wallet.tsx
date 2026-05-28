import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function WalletTab() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Wallet</Text>
        <Text style={styles.subtitle}>Wallet and payments — Phase 6</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
})
