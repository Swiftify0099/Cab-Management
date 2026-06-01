/**
 * Admin Themes Page — Customize brand colors, fonts, and platform appearance.
 */
import { useState } from 'react'
import { Save, Palette, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const PRESET_THEMES = [
  { id: 'blue', name: 'Ocean Blue', primary: '#3B82F6', secondary: '#1E40AF', accent: '#DBEAFE', bg: '#F8FAFC' },
  { id: 'violet', name: 'Royal Violet', primary: '#8B5CF6', secondary: '#6D28D9', accent: '#EDE9FE', bg: '#FAFAF9' },
  { id: 'emerald', name: 'Emerald Green', primary: '#10B981', secondary: '#047857', accent: '#D1FAE5', bg: '#F0FDF4' },
  { id: 'rose', name: 'Rose Pink', primary: '#F43F5E', secondary: '#BE123C', accent: '#FFE4E6', bg: '#FFF1F2' },
  { id: 'amber', name: 'Sunset Amber', primary: '#F59E0B', secondary: '#B45309', accent: '#FEF3C7', bg: '#FFFBEB' },
  { id: 'slate', name: 'Dark Slate', primary: '#475569', secondary: '#1E293B', accent: '#E2E8F0', bg: '#F8FAFC' },
]

const FONT_OPTIONS = [
  { id: 'inter', name: 'Inter', class: 'font-sans', preview: 'The quick brown fox' },
  { id: 'outfit', name: 'Outfit', class: 'font-sans', preview: 'The quick brown fox' },
  { id: 'poppins', name: 'Poppins', class: 'font-sans', preview: 'The quick brown fox' },
  { id: 'roboto', name: 'Roboto', class: 'font-sans', preview: 'The quick brown fox' },
]

export function ThemesPage() {
  const [selectedTheme, setSelectedTheme] = useState('blue')
  const [selectedFont, setSelectedFont] = useState('inter')
  const [darkMode, setDarkMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customColors, setCustomColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#DBEAFE',
    sidebar_bg: '#0F172A',
    sidebar_text: '#FFFFFF',
  })

  const activeTheme = PRESET_THEMES.find(t => t.id === selectedTheme) || PRESET_THEMES[0]

  const handleThemeSelect = (theme: typeof PRESET_THEMES[0]) => {
    setSelectedTheme(theme.id)
    setCustomColors(c => ({
      ...c,
      primary: theme.primary,
      secondary: theme.secondary,
      accent: theme.accent,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    toast.success('Theme applied successfully!')
    setSaving(false)
  }

  const handleReset = () => {
    handleThemeSelect(PRESET_THEMES[0])
    setSelectedFont('inter')
    setDarkMode(false)
    toast.success('Theme reset to defaults')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Theme & Appearance</h1>
          <p className="text-sm text-slate-400 mt-0.5">Customize the look and feel of your admin panel</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={14} /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? 'Applying...' : 'Apply Theme'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="col-span-2 space-y-5">
          {/* Preset Themes */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={18} className="text-slate-600" />
              <h2 className="font-bold text-slate-900">Preset Themes</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                    selectedTheme === theme.id
                      ? 'border-blue-500 shadow-md shadow-blue-100'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {/* Color swatches */}
                  <div className="flex gap-1.5 mb-3">
                    <div className="w-6 h-6 rounded-md shadow-sm" style={{ backgroundColor: theme.primary }} />
                    <div className="w-6 h-6 rounded-md shadow-sm" style={{ backgroundColor: theme.secondary }} />
                    <div className="w-6 h-6 rounded-md shadow-sm border border-slate-100" style={{ backgroundColor: theme.accent }} />
                  </div>
                  <div className="text-xs font-bold text-slate-800">{theme.name}</div>
                  {selectedTheme === theme.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 mb-4">Custom Colors</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'primary', label: 'Primary Color', desc: 'Buttons, links, highlights' },
                { key: 'secondary', label: 'Secondary Color', desc: 'Hover states, dark variants' },
                { key: 'accent', label: 'Accent Background', desc: 'Badges, subtle highlights' },
                { key: 'sidebar_bg', label: 'Sidebar Background', desc: 'Navigation panel color' },
                { key: 'sidebar_text', label: 'Sidebar Text', desc: 'Navigation text color' },
              ].map(field => (
                <div key={field.key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-xl shadow-sm border border-slate-200 cursor-pointer"
                      style={{ backgroundColor: (customColors as any)[field.key] }}
                    />
                    <input
                      type="color"
                      className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10"
                      value={(customColors as any)[field.key]}
                      onChange={e => setCustomColors(c => ({ ...c, [field.key]: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700">{field.label}</div>
                    <div className="text-xs text-slate-400">{field.desc}</div>
                    <div className="font-mono text-xs text-slate-500 mt-0.5">{(customColors as any)[field.key]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-900 mb-4">Typography</h2>
            <div className="grid grid-cols-2 gap-3">
              {FONT_OPTIONS.map(font => (
                <button
                  key={font.id}
                  onClick={() => setSelectedFont(font.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedFont === font.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{font.name}</div>
                  <div className="text-base font-medium text-slate-800">{font.preview}</div>
                  <div className="text-xs text-slate-400 mt-1">Aa Bb Cc 123</div>
                </button>
              ))}
            </div>
          </div>

          {/* Dark Mode */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Dark Mode</h2>
                <p className="text-sm text-slate-400 mt-0.5">Enable dark theme for the admin panel</p>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`relative w-14 h-7 rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-6">
            <h2 className="font-bold text-slate-900 mb-4">Live Preview</h2>
            {/* Mini admin panel preview */}
            <div className="rounded-xl overflow-hidden border border-slate-200" style={{ backgroundColor: activeTheme.bg }}>
              {/* Topbar */}
              <div className="px-3 py-2 border-b border-slate-100 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md" style={{ backgroundColor: customColors.primary }} />
                  <span className="text-xs font-bold text-slate-800">Swiftify Admin</span>
                </div>
                <div className="w-5 h-5 rounded-full bg-slate-200" />
              </div>

              <div className="flex" style={{ minHeight: '160px' }}>
                {/* Sidebar preview */}
                <div className="w-20 py-3 px-2 space-y-1" style={{ backgroundColor: customColors.sidebar_bg }}>
                  {['Dashboard', 'Drivers', 'Trips', 'Finance'].map((item, i) => (
                    <div
                      key={item}
                      className="px-2 py-1.5 rounded-md text-xs transition-colors"
                      style={{
                        color: i === 0 ? customColors.primary : customColors.sidebar_text,
                        backgroundColor: i === 0 ? customColors.accent : 'transparent',
                        opacity: i === 0 ? 1 : 0.7,
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                {/* Content preview */}
                <div className="flex-1 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {['1,247', '342', '28', '156'].map((val, i) => (
                      <div key={i} className="bg-white rounded-lg p-2 shadow-sm">
                        <div className="text-xs font-black" style={{ color: customColors.primary }}>{val}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Metric {i + 1}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="h-2 rounded-full mb-1" style={{ backgroundColor: customColors.accent }}>
                      <div className="h-2 rounded-full w-2/3" style={{ backgroundColor: customColors.primary }} />
                    </div>
                    <div className="text-xs text-slate-400">Revenue chart preview</div>
                  </div>
                  <button
                    className="w-full py-1.5 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: customColors.primary, color: '#fff' }}
                  >
                    Sample Button
                  </button>
                </div>
              </div>
            </div>

            {/* Selected info */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Theme</span>
                <span className="font-semibold text-slate-700">{activeTheme.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Font</span>
                <span className="font-semibold text-slate-700 capitalize">{selectedFont}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Mode</span>
                <span className="font-semibold text-slate-700">{darkMode ? '🌙 Dark' : '☀️ Light'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
