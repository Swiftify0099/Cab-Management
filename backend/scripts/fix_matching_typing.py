import os

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))
matching_api_path = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")

with open(matching_api_path, "r", encoding="utf-8") as f:
    content = f.read()

if "from typing import" in content:
    content = content.replace("from typing import", "from typing import List, ")
else:
    content = "from typing import List, Optional\n" + content

# Also replace in the Feature 6 section
content = content.replace("class RadarMatchRequestSchema(BaseModel):\n    selected_ride_ids: List[str]", "from typing import List, Optional\n\nclass RadarMatchRequestSchema(BaseModel):\n    selected_ride_ids: list[str]")

with open(matching_api_path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] Fixed List typing in matching.py")
