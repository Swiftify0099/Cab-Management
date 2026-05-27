import '../global.css'
import { Slot } from 'expo-router'
import { useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'

export default function RootLayout() {
  return <Slot />
}
