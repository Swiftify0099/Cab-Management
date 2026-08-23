path1 = r"d:\cub\Cab-Management\backend\matching-service\app\services\ride_start_service.py"
with open(path1, "r", encoding="utf-8") as f:
    c1 = f.read()

old_c_res = """        # Customer details (sanitized)
        c_res = await self.db.execute(select(User).where(User.id == ride.customer_id))
        cust_user = c_res.scalar_one_or_none()
        customer_name = (cust_user.email.split('@')[0].capitalize() if cust_user and cust_user.email else "Passenger")"""

new_c_res = """        # Customer / Actual Rider details (sanitized)
        if getattr(ride, "is_booked_for_other", False) and getattr(ride, "rider_name", None):
            customer_name = f"{ride.rider_name} ({ride.rider_type.replace('_', ' ').capitalize()})"
        else:
            c_res = await self.db.execute(select(User).where(User.id == ride.customer_id))
            cust_user = c_res.scalar_one_or_none()
            customer_name = (cust_user.email.split('@')[0].capitalize() if cust_user and cust_user.email else "Passenger")"""

if old_c_res in c1:
    c1 = c1.replace(old_c_res, new_c_res)
    with open(path1, "w", encoding="utf-8") as f:
        f.write(c1)
    print("ride_start_service.py updated with actual rider resolution!")
