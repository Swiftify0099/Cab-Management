import os

auth_file = r'c:\Users\panka\OneDrive\Desktop\CabBooking\backend\auth-service\app\api\v1\auth.py'
with open(auth_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if 'Real Dove SMS Gateway Integration' in line:
        skip = True
        new_lines.append('    # Real Dove SMS Gateway Integration (Matched exactly to working PhoneAuth.java template)\n')
        new_lines.append('    try:\n')
        new_lines.append('        import httpx\n')
        new_lines.append('        cleaned = "".join(filter(str.isdigit, phone))[-10:]\n')
        new_lines.append('        sms_user = os.getenv("SMS_USERNAME", "Experts")\n')
        new_lines.append('        sms_key = os.getenv("SMS_AUTH_KEY", "ba9dcdcdfcXX")\n')
        new_lines.append('        sms_sender = os.getenv("SMS_SENDER_ID", "EXTSKL")\n')
        new_lines.append('        sms_accusage = os.getenv("SMS_ACCUSAGE", "1")\n')
        new_lines.append('        msg = f"Your Verification Code for login is {otp_code}. - Expertskill Technology."\n')
        new_lines.append('        encoded_msg = msg.replace(" ", "%20")\n')
        new_lines.append('        gateway_url = (\n')
        new_lines.append('            "https://mobicomm.dove-sms.com//submitsms.jsp?"\n')
        new_lines.append('            + "user=" + sms_user\n')
        new_lines.append('            + "&key=" + sms_key\n')
        new_lines.append('            + "&mobile=+91" + cleaned\n')
        new_lines.append('            + "&message=" + encoded_msg\n')
        new_lines.append('            + "&accusage=" + sms_accusage\n')
        new_lines.append('            + "&senderid=" + sms_sender\n')
        new_lines.append('        )\n')
        new_lines.append('        async with httpx.AsyncClient(timeout=8.0) as client:\n')
        new_lines.append('            resp = await client.get(gateway_url)\n')
        new_lines.append('            logger.info("Dove SMS gateway sent from backend", status=resp.status_code, response=resp.text)\n')
        new_lines.append('    except Exception as sms_err:\n')
        new_lines.append('        logger.warning("Dove SMS dispatch error in backend", error=str(sms_err))\n\n')
    elif 'logger.info("OTP sent"' in line:
        skip = False
        new_lines.append(line)
    elif not skip:
        new_lines.append(line)

with open(auth_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('AUTH.PY PATCHED SUCCESSFULLY!')
