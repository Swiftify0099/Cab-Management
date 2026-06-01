import os
import re

files_to_fix = [
    r"app\vehicle\health.tsx",
    r"app\vehicle\alerts.tsx",
    r"app\kyc\status.tsx",
    r"app\kyc\vehicle.tsx",
    r"app\kyc\step3.tsx",
    r"app\kyc\step2.tsx",
    r"app\kyc\step1.tsx",
    r"app\kyc\selfie.tsx",
    r"app\kyc\documents.tsx"
]

pattern = re.compile(r'style=\{([^}]+)\}\s+borderRadius=\{([^}]+)\}')

for file_path in files_to_fix:
    full_path = os.path.join(os.getcwd(), file_path)
    if not os.path.exists(full_path):
        continue
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to replace `style={X} borderRadius={Y}` with `style={[X, { borderRadius: Y }]}`
    # Notice that `style` could already be an array if it was `style={[X, Y]}`
    # But in my generation I used `style={StyleSheet.absoluteFill}` or `style={styles.proceedBtn}`
    # so they are simple expressions.
    
    def repl(match):
        style_expr = match.group(1)
        br_val = match.group(2)
        return f"style={{[{style_expr}, {{ borderRadius: {br_val} }}]}}"
        
    new_content = pattern.sub(repl, content)
    
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Fixed {file_path}")
