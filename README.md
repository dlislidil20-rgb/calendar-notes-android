# 달력기록 v4.1 — Android

기존 HTML/CSS/JavaScript + Capacitor 7 소스를 유지한 오프라인 기록 앱입니다.
패키지 ID는 `com.local.weeklyjournal`입니다. Android 6 이상에 설치하며 Android 16 기기에서도 사용할 수 있도록 Android 15 대상 SDK와 화면 여백 처리를 사용합니다.

## 유지된 기능
- 주간 / 일간 / 설정, 날짜별 여러 줄 기록과 주간 전체 표시
- 작성·수정·삭제, 전날·다음날 이동, 편집 영역 밖 좌우 스와이프
- 안드로이드 시간 선택기, 두 번째 이후 시간 앞 빈 줄, `[가게이름]` 삽입, 시간순 정렬
- 음식 항목 계산: 시간만 있는 줄, 대괄호 가게명 줄, 빈 줄 제외
- 0–2 Excellent / 3–4 Good / 5–6 Hmm... / 7 이상 Bad
- 0개 회색, 1–8개 파스텔 노랑→빨강, 8개 이상 같은 색, 라이트·다크 동일 카드색
- 기기/라이트/다크 테마, 가운데/왼쪽 정렬, 10–26px 글자 크기
- 입력 즉시 기기 내부 저장, JSON 백업·복원 (기존 v1 형식 호환)
- 광고·로그인·분석 SDK 없음. INTERNET 권한과 Android 자동 클라우드 백업을 사용하지 않음

## APK 다운로드와 설치
이 저장소 **Actions → Build Android APK → 성공한 실행 → Artifacts → calendar-notes-v4.1-apk**에서 ZIP을 다운로드합니다.
압축을 풀어 `calendar-notes-v4.1.apk`를 갤럭시에 옮기고 실행합니다. 파일을 여는 앱에 대해 '이 출처 허용'이 필요할 수 있습니다.
이 빌드는 개인 설치용 debug 서명 APK입니다. Play 스토어 배포용 release 서명은 아닙니다.
자동 빌드 간 서명키가 달라질 수 있으므로 다른 빌드로 교체 전 JSON을 백업하세요. 서명이 다르면 기존 앱을 제거해야 할 수 있습니다.

## 개발 / 빌드
Node 22, Java 21, Android SDK 35가 필요합니다.

```sh
npm ci
npm test
npx cap sync android
cd android
./gradlew assembleDebug lintDebug
```

`main` 푸시 또는 Actions 수동 실행으로 테스트 → 동기화 → APK 빌드·lint → APK 서명 및 인터넷 권한 검사 → 다운로드 파일 업로드를 진행합니다.
웹 변경 후 `npx cap sync android`가 필요합니다. `npx cap add android`는 이미 포함된 네이티브 프로젝트를 다시 생성하므로 실행하지 않습니다.

## 저장과 백업
- 원래 저장 키 `calendar-notes-v1`, `calendar-settings-v2`와 원래 앱 ID를 유지합니다.
- 안드로이드 JSON 내보내기는 시스템 파일 저장 선택창을 사용합니다. 로컬 폴더를 선택하면 네트워크 없이 저장됩니다.
- 가져오기는 선택한 백업으로 기존 기록을 교체하며 먼저 확인을 받습니다.
- 앱 삭제 또는 앱 데이터 초기화 시 기록이 삭제됩니다. JSON 파일을 별도로 보관하세요.
- 기기 실행 여부와 빌드 검증 결과는 해당 Actions 로그 및 제공된 작업 결과를 참고하세요.

## v4.1 수정
- 네이티브 WebView에 존재하지 않는 `Capacitor.registerPlugin` 호출을 제거하고 실제 주입되는 `Capacitor.Plugins.Journal`을 사용합니다. 초기 화면이 비고 모든 버튼이 동작하지 않던 시작 오류를 수정했습니다.
- 웹 테스트에 Android 네이티브 브리지 환경을 추가해 같은 오류를 재현하고 수정 후 통과를 확인합니다.
- Android 16(API 36) 에뮬레이터에서 앱 실행, 실제 좌표 터치, 날짜 편집·저장·이동, 네이티브 시간 선택기, 다크 모드, Activity 재생성을 검사합니다. APK 업로드는 해당 테스트 성공 후에만 진행합니다.
- 사용자가 입력한 줄바꿈은 유지하고, 긴 음식명은 강제 줄바꿈하지 않습니다. 설정의 글자 크기를 줄이거나 가로로 스크롤할 수 있습니다.
