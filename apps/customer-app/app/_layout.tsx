import { Slot } from 'expo-router'
import { useEffect } from 'react'
import { useAuthStore } from '../src/store/auth.store'

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [])

  return <Slot />
}
