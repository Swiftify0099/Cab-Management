import os

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))
fare_engine_path = os.path.join(backend_root, "matching-service", "app", "services", "ride_fare_engine.py")

with open(fare_engine_path, "r", encoding="utf-8") as f:
    content = f.read()

old_func = '''def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return max(R * c, 0.5)'''

new_func = '''def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float, min_km: float = 0.0) -> float:
    """Haversine distance in km with optional minimum floor."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return max(R * c, min_km)'''

content = content.replace(old_func, new_func)

with open(fare_engine_path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] Updated haversine_distance_km with min_km=0.0 default")
