import os

base = r'c:\Users\panka\OneDrive\Desktop\CabBooking\apps\customer-web\src\pages'

pages = [
    ('Trips', 'TripsPage', 'My Trips', 'trips'),
    ('Wallet', 'WalletPage', 'Wallet', 'wallet'),
    ('Profile', 'ProfilePage', 'My Profile', 'profile'),
    ('Tracking', 'TrackingPage', 'Live Tracking', 'tracking'),
    ('Hotels', 'HotelsPage', 'Hotels', 'hotels'),
    ('Parcels', 'ParcelsPage', 'Parcels', 'parcels'),
]

template = '''import {{ motion }} from 'framer-motion'

export function {comp}() {{
  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">Phase 3+  coming soon</p>
        </div>
        <motion.div
          initial={{{{ opacity: 0, y: 16 }}}}
          animate={{{{ opacity: 1, y: 0 }}}}
          className="card p-12 text-center"
        >
          <div className="text-5xl mb-4">[START]</div>
          <h3 className="font-semibold text-slate-700 mb-1">{title} Module</h3>
          <p className="text-slate-400 text-sm">Full implementation in Phase 3+</p>
          <span className="mt-4 inline-block badge badge-blue">Coming Soon</span>
        </motion.div>
      </div>
    </div>
  )
}}
'''

for folder, comp, title, _ in pages:
    dir_path = os.path.join(base, folder)
    os.makedirs(dir_path, exist_ok=True)
    fp = os.path.join(dir_path, f'{comp}.tsx')
    if not os.path.exists(fp):
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(template.format(comp=comp, title=title))
        print(f'Created {comp}')
    else:
        print(f'Skip {comp}')

print('DONE')
