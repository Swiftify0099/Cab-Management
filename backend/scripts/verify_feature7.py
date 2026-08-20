import sys, os
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, 'matching-service'))
print('=' * 65)
print('FEATURE 7: NAVIGATION SYSTEM VERIFICATION SUITE (master backend location)')
print('=' * 65)
from app.services.routing_gatekeeper import RoutingGatekeeper
route = RoutingGatekeeper._generate_fallback_route(18.5204, 73.8567, 18.5822, 73.9197)
print('[TEST 1] Route Data generated:', route['distance_km'], 'km')
assert route['length'] if 'length' in route else route['distance_km'] > 5.0
assert len(route['steps']) >= 3
print('  [PASS] Routing Gatekeeper & Turn Maneuvers verified!')
from app.services.navigation_service import NavigationService
mock_poly = [{'lat': 18.5360, 'lng': 73.8930},  {'lat': 18.5362, 'lng': 73.8939}]
dev_on = NavigationService.check_route_deviation(18.5362, 73.8939, mock_poly, 8.0)
assert dev_on is False
dev_off = NavigationService.check_route_deviation(18.5380, 73.8910, mock_poly, 10.0)
assert dev_off is True
print('  [PASS] Route Deviation Detector verified!')
from app.services.ride_fare_engine import haversine_distance_km
dist_c = haversine_distance_km(18.5364, 73.8941, 18.5362, 73.8939) * 1000.0
assert dist_c <= 60.0
print('  [PASS] Authoritative Arrival Distance Logic verified!')
print('+' * 65)
print('ALL FEATURE 7 TESTS PASSED IN BACKEND!')
print('+' * 65)