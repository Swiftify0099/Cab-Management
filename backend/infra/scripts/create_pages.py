import os

pages = [
    ('Drivers', 'DriversPage', 'Car', 'Manage and monitor all drivers'),
    ('Customers', 'CustomersPage', 'Users', 'Customer management and profiles'),
    ('Trips', 'TripsPage', 'Map', 'All intercity trips'),
    ('Parcels', 'ParcelsPage', 'Package', 'Parcel bookings and tracking'),
    ('Hotels', 'HotelsPage', 'Hotel', 'Hotel and lodge management'),
    ('Finance', 'FinancePage', 'DollarSign', 'Revenue, settlements, and refunds'),
    ('Coupons', 'CouponsPage', 'Tag', 'Coupon and referral management'),
    ('Themes', 'ThemesPage', 'Palette', 'Theme engine and customization'),
    ('KYC', 'KYCPage', 'BadgeCheck', 'Driver KYC document review'),
    ('Analytics', 'AnalyticsPage', 'BarChart3', 'Advanced analytics and BI'),
    ('Settings', 'SettingsPage', 'Settings2', 'Platform configuration'),
    ('NotFound', 'NotFoundPage', 'AlertCircle', 'Page not found'),
]

base = r'c:\Users\panka\OneDrive\Desktop\CabBooking\apps\admin-web\src\pages'

template = """import {{ motion }} from 'framer-motion'
import {{ {icon} }} from 'lucide-react'

export function {component}() {{
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{folder}</h1>
          <p className="text-slate-500 text-sm">{desc}</p>
        </div>
      </div>
      <motion.div
        initial={{{{ opacity: 0, y: 20 }}}}
        animate={{{{ opacity: 1, y: 0 }}}}
        className="card p-12 flex flex-col items-center justify-center text-center"
      >
        <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
          <{icon} className="w-8 h-8 text-primary-500" />
        </div>
        <h2 className="text-xl font-display font-semibold text-slate-800 dark:text-white mb-2">{folder} Module</h2>
        <p className="text-slate-400 text-sm max-w-sm">
          Full implementation in the corresponding phase.
        </p>
        <span className="mt-4 badge badge-primary">Phase Implementation Pending</span>
      </motion.div>
    </div>
  )
}}
"""

for folder, component, icon, desc in pages:
    path = os.path.join(base, folder)
    os.makedirs(path, exist_ok=True)
    filepath = os.path.join(path, f'{component}.tsx')
    if not os.path.exists(filepath):
        content = template.format(icon=icon, component=component, folder=folder, desc=desc)
        with open(filepath, 'w') as f:
            f.write(content)
        print(f'Created {component}')
    else:
        print(f'Skip {component} (exists)')

print('DONE')
