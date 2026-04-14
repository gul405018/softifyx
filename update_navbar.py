import re
import os

file_path = r'components\navbar.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find menu-item blocks and their dropdowns
menu_blocks = re.split(r'(<div class="menu-item"[^>]*>)', content)

def sanitize_filename(name):
    name = re.sub(r'[^a-zA-Z0-9_\s]', '', name)
    name = name.strip().lower()
    return re.sub(r'\s+', '_', name) + '.html'

updated_content = menu_blocks[0]

current_menu = ""

for i in range(1, len(menu_blocks)):
    part = menu_blocks[i]
    if part.startswith('<div class="menu-item"'):
        current_menu = ""
        # try to extract id as menu name or next text
        updated_content += part
    else:
        # Part contains the menu text and dropdowns
        # Extract the menu name from the text right after <div class="menu-item">
        match_menu_text = re.search(r'^\s*([a-zA-Z\s]+)', part)
        if match_menu_text:
            current_menu = match_menu_text.group(1).strip()
        
        # Now find all dropdown-items and nested-items that DONT have has-nested class
        def replace_dropdown(m):
            cls = m.group(1)
            attrs = m.group(2)
            text = m.group(3)
            
            # Skip if it's just the wrapper for nested
            if 'has-nested' in cls:
                return m.group(0)
            
            file_name = sanitize_filename(text.split('<')[0])
            folder_name = current_menu.replace(' ', '')
            
            # If already has data-target, don't add again
            if 'data-target' in attrs:
                return m.group(0)
                
            data_target = f'Navigation/{folder_name}/{file_name}'
            
            # Don't add data-target to Exit
            if text.strip() == 'Exit':
                return m.group(0)
                
            return f'<div class="{cls}" {attrs} data-target="{data_target}">{text}</div>'
            
        part_updated = re.sub(r'<div class="(dropdown-item|nested-item)[^"]*"\s*([^>]*)>(.*?)</div>', replace_dropdown, part, flags=re.DOTALL)
        
        updated_content += part_updated

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(updated_content)

print("Updated navbar.html with data-target attributes.")
