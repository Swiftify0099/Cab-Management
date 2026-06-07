import urllib.request, json
from urllib.error import HTTPError

data = {
    "phone": "+917755995615",
    "otp_code": "123456",
    "role": "driver"
}
req = urllib.request.Request(
    'http://localhost:8001/api/v1/auth/otp/verify',
    data=json.dumps(data).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    response = urllib.request.urlopen(req)
    print("SUCCESS", response.read().decode())
except HTTPError as e:
    print("HTTP ERROR:", e.code)
    print(e.read().decode())
