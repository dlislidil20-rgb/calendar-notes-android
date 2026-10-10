"""Offline Korean public holidays. Regenerate with: pip install holidays==0.106"""
import json
from pathlib import Path
import holidays

calendar = holidays.KR(years=range(2000, 2051), language='ko')
# Korean public holidays only (no BANK-category May Day before 2026).
values = {d.isoformat(): name.replace('신정연휴', '신정').replace('대체 휴일', '대체공휴일')
          for d, name in sorted(calendar.items())}
Path('www/holidays.js').write_text(
    '// Generated offline data; see HOLIDAYS.md. No network requests.\n'
    'window.KOREAN_HOLIDAYS = ' + json.dumps(values, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print(len(values), 'public holidays saved (2000–2050)')
