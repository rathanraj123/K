import os
import re

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "frontend", "src")

for root, dirs, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            if 'new Date(' in content and 'safeDate(' not in content:
                # Except in utils.ts itself
                if file == "utils.ts":
                    continue
                    
                # Replace new Date( with safeDate(
                new_content = re.sub(r'new Date\(', r'safeDate(', content)
                
                # Check if import exists
                if "import { cn }" in new_content or "import { cn," in new_content:
                    new_content = re.sub(r'import\s+{\s*cn\s*}', r'import { cn, safeDate }', new_content)
                elif "import { safeDate }" not in new_content:
                    # Find last import
                    import_idx = new_content.rfind('import ')
                    if import_idx != -1:
                        end_import = new_content.find('\n', import_idx)
                        new_content = new_content[:end_import] + "\nimport { safeDate } from '@/lib/utils';" + new_content[end_import:]
                    else:
                        new_content = "import { safeDate } from '@/lib/utils';\n" + new_content

                if content != new_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {file}")
