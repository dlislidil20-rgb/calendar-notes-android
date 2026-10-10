# 대한민국 공휴일 데이터

2000–2050년의 한국 공휴일 날짜를 앱 내부 `www/holidays.js`에 포함합니다.
오프라인으로 동작하며 기록을 서버에 보내거나 공휴일 API를 호출하지 않습니다.
`holidays==0.106`의 KR PUBLIC 달력을 `scripts/generate_holidays.py`로 생성합니다.
미래 연도는 현재 규정에 따른 계산값입니다. 추가로 지정되는 임시공휴일과
법령 변경은 다음 앱 업데이트에서 반영해야 합니다. 범위 밖에서는 주말만 표시합니다.

2026년 주요 날짜(설 2/16–18, 부처님오신날 5/24 및 대체 5/25,
선거일 6/3, 추석 9/24–26, 개천절 대체 10/5)를 천문연구원 자료와 대조했습니다.
2026년부터 적용되는 노동절 5/1·제헌절 7/17과 대체공휴일은 개정 규정을 반영합니다.

출처:
- 국가법령정보센터 제2조: https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1033028569
- 제3조: https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1027161473
- 한국천문연구원: https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2026
- 인사혁신처: https://www.mpm.go.kr/mpm/comm/newsPress/newsPressRelease/?boardId=bbs_0000000000000029&cntId=4250&mode=view
- 생성기: https://github.com/vacanza/holidays (MIT License)
