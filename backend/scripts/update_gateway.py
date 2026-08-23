gateway_path = r"d:\cub\Cab-Management\backend\local_gateway.py"
with open(gateway_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update import line
old_import = "from app.api.v1 import auth_router, admin_auth_router, profile_router, driver_router"
new_import = "from app.api.v1 import auth_router, admin_auth_router, profile_router, driver_router, family_router, emergency_router, customer_settings_router"
content = content.replace(old_import, new_import)

# Update mount block
old_mount = """if _auth_ok:
    app.include_router(auth_router,       prefix="/api/v1/auth",       tags=["Auth"])
    app.include_router(admin_auth_router, prefix="/api/v1/admin/auth", tags=["Admin Auth"])
    app.include_router(profile_router,    prefix="/api/v1/profile",    tags=["Profile"])
    app.include_router(driver_router,     prefix="/api/v1/driver",     tags=["Driver"])"""

new_mount = """if _auth_ok:
    app.include_router(auth_router,       prefix="/api/v1/auth",       tags=["Auth"])
    app.include_router(admin_auth_router, prefix="/api/v1/admin/auth", tags=["Admin Auth"])
    app.include_router(profile_router,    prefix="/api/v1/profile",    tags=["Profile"])
    app.include_router(driver_router,     prefix="/api/v1/driver",     tags=["Driver"])
    app.include_router(family_router,     prefix="/api/v1/family",     tags=["Family"])
    app.include_router(emergency_router,  prefix="/api/v1/customer/emergency-contacts", tags=["Emergency Contacts"])
    app.include_router(customer_settings_router, prefix="/api/v1/customer", tags=["Customer Settings"])"""

content = content.replace(old_mount, new_mount)

with open(gateway_path, "w", encoding="utf-8") as f:
    f.write(content)
print("local_gateway.py updated with new routers!")
