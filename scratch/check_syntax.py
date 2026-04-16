
import sys

def check_js_syntax(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    brace_count = 0
    paren_count = 0
    line_num = 1
    col_num = 1
    
    in_single_quote = False
    in_double_quote = False
    in_template_literal = False
    in_comment_line = False
    in_comment_block = False
    
    for i, char in enumerate(content):
        if char == '\n':
            line_num += 1
            col_num = 1
            in_comment_line = False
        else:
            col_num += 1

        # Handle comments
        if in_comment_line:
            continue
        if in_comment_block:
            if char == '*' and i + 1 < len(content) and content[i+1] == '/':
                in_comment_block = False
            continue
        
        # Handle strings
        if not in_single_quote and not in_double_quote and not in_template_literal:
            if char == '/' and i + 1 < len(content):
                if content[i+1] == '/':
                    in_comment_line = True
                    continue
                if content[i+1] == '*':
                    in_comment_block = True
                    continue
            
            if char == "'": in_single_quote = True
            elif char == '"': in_double_quote = True
            elif char == '`': in_template_literal = True
            elif char == '{': brace_count += 1
            elif char == '}': brace_count -= 1
            elif char == '(': paren_count += 1
            elif char == ')': paren_count -= 1
            
            if brace_count < 0:
                print(f"ERROR: Extra closing brace at Line {line_num}, Col {col_num}")
                brace_count = 0
            if paren_count < 0:
                print(f"ERROR: Extra closing parenthesis at Line {line_num}, Col {col_num}")
                paren_count = 0
        else:
            # Inside a string
            if in_single_quote and char == "'" and content[i-1] != '\\': in_single_quote = False
            elif in_double_quote and char == '"' and content[i-1] != '\\': in_double_quote = False
            elif in_template_literal and char == '`' and content[i-1] != '\\': in_template_literal = False

    print(f"Final Count - Braces: {brace_count}, Parentheses: {paren_count}")

if __name__ == "__main__":
    check_js_syntax('assets/js/app.js')
