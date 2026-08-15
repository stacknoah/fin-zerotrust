/* 살피 근거 데이터 — SaaS 5종 × 6항목. 2026.8 각 벤더 공개 관리자 문서 조사.
   워크벤치(등재 판정)와 통합 앱이 공유한다. */
window.SALPI_EVIDENCE = [
 {
  "saas": "Microsoft 365 (Teams·SharePoint·OneDrive·Copilot)",
  "entries": [
   {
    "layer": "L1",
    "feature": "필드 단위 고객정보 기능: Microsoft Forms 외부인 대상 폼, Outlook/Exchange 연락처, Microsoft Lists",
    "exists": "yes",
    "control": "Microsoft 365 관리센터 > 설정 > 조직 설정 > Microsoft Forms의 External sharing 옵션 4개(외부인 응답 수집, 외부인과 공동 편집, 템플릿 공유, 결과 요약 공유)가 기본 켜짐 상태이며, 관리자가 해제하면 외부인 대상 폼 수집이 차단됨. Forms 자체를 사용자별 라이선스 해제 또는 조직 전체 단위로 완전 비활성화하는 것도 가능. Outlook 연락처·Lists는 기능 자체를 끄는 설정이 없고 접근 권한·라이선스로 관리",
    "control_availability": "builtin",
    "plan_note": "관리센터 조직 설정에 포함되어 추가 비용 없음. 단 해당 문서 상단에 'Administrator settings are only available for Office 365 Education and Microsoft 365 Apps for business customers'라는 주석이 있어 엔터프라이즈(E3/E5) 테넌트에서의 노출 위치는 테넌트에서 재확인 권장",
    "source_url": "https://learn.microsoft.com/en-us/microsoft-forms/administrator-settings-microsoft-forms",
    "source_quote": "You can control whether or not external users are allowed to collaborate with users in your organization on a form or quiz.",
    "confidence": "high"
   },
   {
    "layer": "L2",
    "feature": "네이티브 DLP: Microsoft Purview Data Loss Prevention (Exchange·SharePoint·OneDrive·Teams 메시지)",
    "exists": "yes",
    "control": "Purview 포털에서 DLP 정책을 만들어 주민등록번호 등 민감정보 유형이 포함된 Teams 채팅·채널 메시지를 전송 즉시 자동 삭제(차단)하고 정책 팁으로 사용자에게 경고 가능. 문서 공유는 SharePoint·OneDrive 위치를 정책에 포함하면 열람 자체가 차단됨. 정책 위치에 'Teams chat and channel messages'를 추가하는 방식",
    "control_availability": "higher_tier",
    "plan_note": "Exchange·SharePoint·OneDrive(Teams로 공유되는 파일 포함) DLP는 Office 365/Microsoft 365 E3부터 포함. Teams 채팅·채널 메시지 본문 DLP는 E5(E5/A5/G5 또는 E5 Compliance·Information Protection and Governance 애드온) 필요",
    "source_url": "https://learn.microsoft.com/en-us/purview/dlp-microsoft-teams",
    "source_quote": "Support for DLP protection in Teams Chat requires an E5 license.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "검색 색인·콘텐츠 인덱싱 노출 제한 (SharePoint 검색·Copilot 참조 범위)",
    "exists": "yes",
    "control": "세 가지 수단. (1) 사이트 설정의 'Allow this site to appear in Search results'를 끄면 해당 사이트 콘텐츠가 조직 전체 검색과 사이트 내 검색 모두에서 제외. (2) SharePoint 관리센터 Remove Search Results로 특정 URL을 즉시 제거(다음 크롤 전까지 임시). (3) Restricted SharePoint Search를 켜면 조직 전체 검색과 Copilot 응답이 참조할 수 있는 사이트를 관리자가 만든 허용 목록(최대 100개 사이트)으로 제한. 단 RSS는 권한 자체를 바꾸는 보안 경계는 아니며, 사용자가 소유·최근 접근한 콘텐츠는 계속 노출됨",
    "control_availability": "builtin",
    "plan_note": "사이트 단위 검색 노출 차단과 Remove Search Results는 추가 라이선스 없음. Restricted SharePoint Search는 2026-07-31부터 신규 활성화가 차단되며(은퇴 예정), 후속 수단인 Restricted Content Discovery는 SharePoint Advanced Management 라이선스 필요",
    "source_url": "https://learn.microsoft.com/en-us/sharepoint/restricted-sharepoint-search",
    "source_quote": "This feature lets you as an administrator decide which SharePoint sites appear in search results across your organization and Copilot chat or agentic experiences.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "Teams 회의 자동 녹음·전사·AI 요약의 조직 단위 비활성화",
    "exists": "yes",
    "control": "Teams 관리센터 > 회의 > 회의 정책에서 Global(조직 전체) 정책의 Meeting recording 토글과 Transcription 토글을 Off로 설정 가능(둘 다 기본값 On). PowerShell로는 Set-CsTeamsMeetingPolicy -Identity Global -AllowCloudRecording $false -AllowTranscription $false. 웨비나·타운홀은 이벤트 정책(-RecordingForWebinar, -TranscriptionForTownhall 등)으로 별도 차단. 참가자 명시 동의 요구(-ExplicitRecordingConsent)도 정책으로 설정 가능. Copilot 회의 요약은 조직자가 Copilot을 끄면 녹음·전사도 함께 꺼지는 구조",
    "control_availability": "builtin",
    "plan_note": "회의 정책의 녹음·전사 토글은 기본 Teams 라이선스에 포함. 회의 옵션에서 조직자가 녹음·전사 가능자를 세밀하게 지정하는 기능과 번역 전사 등은 Teams Premium, AI 요약(recap)·Copilot은 별도 애드온",
    "source_url": "https://learn.microsoft.com/en-us/microsoftteams/meeting-recording",
    "source_quote": "You can use the Microsoft Teams admin center or PowerShell to control whether your users can record meetings and events.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "AI 기능(Microsoft 365 Copilot)의 고객 데이터 모델 학습 여부",
    "exists": "yes",
    "control": "Microsoft 공식 입장: 프롬프트·응답·Microsoft Graph를 통해 접근한 조직 데이터는 파운데이션 LLM 학습에 사용되지 않음. 기본값이 '학습 미사용'이라 별도 옵트아웃 설정 자체가 존재하지 않는 구조(계약상 커밋). 저장되는 상호작용 기록(프롬프트·응답)은 관리자가 Purview 보존 정책·콘텐츠 검색으로 관리하고 사용자가 직접 삭제 가능. Azure OpenAI의 사람 검토 기반 남용 모니터링도 Copilot 서비스는 옵트아웃된 상태",
    "control_availability": "builtin",
    "plan_note": "Copilot 자체는 Microsoft 365 Copilot 애드온 라이선스 필요. 학습 미사용 커밋은 요금제와 무관하게 기본 적용",
    "source_url": "https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-privacy",
    "source_quote": "Prompts, responses, and data accessed through Microsoft Graph aren't used to train foundation LLMs, including those used by Microsoft 365 Copilot.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "데이터 보존기간 관리자 설정·단축 (Microsoft Purview 보존 정책·보존 레이블)",
    "exists": "yes",
    "control": "Purview 포털에서 관리자가 Exchange 메일, SharePoint·OneDrive 문서, Teams·Viva Engage 메시지, Copilot 상호작용에 대해 보존 정책을 만들 수 있음. 보존만(retain-only), 기간 경과 후 영구삭제(delete-only), 보존 후 삭제(retain and then delete) 세 방식 모두 지원하므로 보존기간 단축·기간 후 자동 영구삭제 설정 가능. 항목 단위로 다른 기간이 필요하면 보존 레이블 사용",
    "control_availability": "builtin",
    "plan_note": "조직·위치 단위 보존 정책은 Microsoft 365 E3/A3/G3·Office 365 E3 이상과 Business Premium에 포함(Microsoft Purview service description 기준). 적응형 정책 범위(adaptive scope), 학습 가능 분류기 기반 자동 적용 등은 E5 계열 필요. Teams 메시지 위치는 일부 하위 플랜에서 보존·삭제 기간이 30일 초과여야 하는 조건 있음",
    "source_url": "https://learn.microsoft.com/en-us/purview/retention",
    "source_quote": "Retain and then delete: Retain content for a specified period of time and then permanently delete it.",
    "confidence": "high"
   }
  ]
 },
 {
  "saas": "Slack",
  "entries": [
   {
    "layer": "L1",
    "feature": "리스트(Slack Lists) 커스텀 필드",
    "exists": "yes",
    "control": "Slack에는 CRM식 고객 연락처 DB나 외부인 대상 폼 수집 기능은 없고, 필드 단위 정형 데이터 접점은 리스트 기능이 대표적. 담당자·상태 등 커스텀 필드(열)를 가진 표를 만들 수 있어 직원이 고객 명단을 필드 단위로 넣을 수 있음. 소유자·관리자가 워크스페이스 설정에서 리스트 기능 자체를 비활성화할 수 있고, 공유 권한을 리스트 소유자로 제한할 수도 있음",
    "control_availability": "builtin",
    "plan_note": "리스트는 유료 요금제(Pro·Business+·Enterprise 계열) 제공, 관리자 비활성화 설정 포함",
    "source_url": "https://slack.com/help/articles/28932867593875-Manage-list-settings-in-Slack",
    "source_quote": "Owners and admins can disable lists and limit sharing permissions to list owners only.",
    "confidence": "high"
   },
   {
    "layer": "L2",
    "feature": "네이티브 DLP(메시지·파일·캔버스 스캔)",
    "exists": "yes",
    "control": "조직 설정 > Security > Data loss prevention에서 관리자가 사전 정의 규칙 또는 PCRE 정규식 기반 커스텀 규칙을 만들어 메시지·텍스트 파일·캔버스를 스캔. 위반 시 대시보드 알림만 표시, 작성자에게 경고 표시, 또는 검토 전까지 메시지·파일 숨김(tombstone) 처리 중 선택 가능. Slack Connect 채널에도 적용됨",
    "control_availability": "higher_tier",
    "plan_note": "Enterprise 계열 요금제 전용(도움말 원문 표기 \"Available on Enterprise plans\"). Free·Pro·Business+에는 네이티브 DLP 없음: 해당 요금제에서는 서드파티 DLP 연동 필요",
    "source_url": "https://slack.com/help/articles/12914005852819-Slack-data-loss-prevention",
    "source_quote": "With data loss prevention (DLP) for Slack, you can reduce the risk of sharing confidential, malicious, or personally identifiable information in your Slack organization.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "검색 색인(메시지·파일 전문 검색)",
    "exists": "yes",
    "control": "워크스페이스 내 메시지·파일은 기본적으로 전부 검색 색인됨. 관리자가 특정 채널·데이터를 색인에서 제외하거나 색인을 제한하는 조직 단위 설정은 공식 문서에서 확인되지 않음. 존재하는 것은 개인 사용자가 자기 검색 결과에서 특정 채널을 제외하는 개인 환경설정뿐이며, 이는 색인 자체를 막는 게 아니라 본인 검색 결과만 걸러내는 기능",
    "control_availability": "none",
    "plan_note": "관리자용 색인 제외 기능은 요금제 무관하게 확인되지 않음(개인 설정만 존재)",
    "source_url": "https://slack.com/help/articles/4402305240723-Set-your-search-preferences",
    "source_quote": "From either the desktop app or Slack in your browser, you can exclude certain channels from search results.",
    "confidence": "medium"
   },
   {
    "layer": "L3",
    "feature": "허들 AI 노트(자동 녹취·전사·요약)",
    "exists": "yes",
    "control": "허들의 AI 노트(전사 포함)는 기본 꺼짐: 참가자가 켜야 동작(원문: \"By default, someone in a huddle needs to turn AI notes on.\"). 관리자는 워크스페이스 설정 > Roles & permissions > Feature access > AI에서 허들 노트 등 AI 기능별로 사용 대상을 지정할 수 있고, Enterprise 조직 관리자는 'No one'으로 지정해 조직 전체 비활성화 가능",
    "control_availability": "builtin",
    "plan_note": "AI 허들 노트는 유료 요금제(Pro·Business+·Enterprise+) 제공, 관리자 접근 통제 설정 포함",
    "source_url": "https://slack.com/help/articles/28244420881555-Manage-access-to-AI-features-in-Slack",
    "source_quote": "Next to the AI feature you'd like to manage, click Edit and choose who can use it — No one, Only specific people and groups, Everyone except specific people and groups, or Everyone.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "AI·ML 모델의 고객 데이터 학습",
    "exists": "yes",
    "control": "생성형 AI(LLM) 학습에는 고객 데이터를 쓰지 않는 것이 기본이며, 고객이 명시적으로 옵트인하지 않는 한 사용 안 함. 반면 검색 순위·채널·이모지 추천용 전통 ML '글로벌 모델'에는 고객 데이터가 기본으로 사용되고, 제외하려면 조직·워크스페이스 소유자가 feedback@slack.com에 'Slack Global model opt-out request' 제목으로 이메일을 보내 옵트아웃해야 함(관리 콘솔 토글 아님). AI 기능 자체는 관리자가 언제든 끌 수 있음",
    "control_availability": "builtin",
    "plan_note": "프라이버시 원칙은 전 요금제 공통 적용(글로벌 모델 옵트아웃은 이메일 요청 방식)",
    "source_url": "https://slack.com/trust/data-management/privacy-principles",
    "source_quote": "Slack will not use Customer Data to train generative AI models unless Customer provides affirmative opt-in consent.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "메시지·파일 보존기간 설정",
    "exists": "yes",
    "control": "워크스페이스 소유자(Enterprise는 조직 소유자가 조직 정책으로) 데이터 보존기간을 설정 가능: 무기한 보존(수정·삭제 이력 저장 여부 선택), 지정 일수 경과 후 자동 삭제(커스텀 기간). 설정은 메시지·파일·캔버스·리스트·클립에 적용되고, 보존 설정에 따라 삭제된 데이터는 영구 삭제됨",
    "control_availability": "builtin",
    "plan_note": "전 요금제에서 설정 가능하나 옵션이 다름: Free는 90일/1년 선택, Pro·Business+·Enterprise 계열은 무기한·커스텀 기간 및 대화별 재정의 허용 설정 제공",
    "source_url": "https://slack.com/help/articles/203457187-Customize-data-retention-in-Slack",
    "source_quote": "Workspace Owners can choose from the following options when setting message retention for conversations.",
    "confidence": "high"
   }
  ]
 },
 {
  "saas": "Notion",
  "entries": [
   {
    "layer": "L1",
    "feature": "연락처성 데이터베이스·외부 대상 폼(Notion Forms)",
    "exists": "yes",
    "control": "데이터베이스에 이메일·전화 등 속성으로 고객정보를 필드 단위로 담을 수 있고, 폼 기능은 워크스페이스 밖의 외부인에게도 링크로 공개해 응답을 데이터베이스로 수집함. 필드 단위 차단 기능은 없고, Enterprise 보안 설정의 공개 게시 차단(Disable publishing sites, forms and public links / Disable public page sharing)으로 외부 대상 폼·공개 페이지 자체를 조직 단위로 막는 것이 실질적 통제 수단",
    "control_availability": "higher_tier",
    "plan_note": "폼·데이터베이스 기능 자체는 전 요금제 제공(\"All members on all Notion plans can create and use forms\"). 공개 게시 차단 등 워크스페이스 보안 설정은 Enterprise 요금제 전용",
    "source_url": "https://www.notion.com/help/forms",
    "source_quote": "Forms make it easy to collect information from others, even if those people aren't part of your Notion workspace or don't use Notion at all.",
    "confidence": "high"
   },
   {
    "layer": "L2",
    "feature": "네이티브 DLP·입력 필터링",
    "exists": "no",
    "control": "Notion 자체 제공 DLP나 입력 시점 키워드 필터는 없음. Nightfall AI 등 서드파티 DLP 솔루션을 보안·컴플라이언스 연동으로 설치해 민감정보(카드번호·PII 등) 탐지, 알림, 자동 조치(내용 마스킹·접근 제한)를 하는 방식. AI 프롬프트·AI 생성 결과에 대해서도 DLP 알림 트리거 가능",
    "control_availability": "third_party",
    "plan_note": "워크스페이스 전체 대상 보안·컴플라이언스 연동(서드파티 DLP 포함)은 Enterprise 요금제 워크스페이스 소유자만 설치 가능",
    "source_url": "https://www.notion.com/help/add-security-and-compliance-integrations",
    "source_quote": "Only Enterprise workspace owners can install workspace-wide security and compliance connections.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "검색 색인·검색 노출 제어",
    "exists": "yes",
    "control": "관리자가 특정 콘텐츠를 색인에서 조직 단위로 제외하는 전용 설정은 확인되지 않음. 검색은 권한 기반이라 사용자는 접근 권한 있는 페이지만 검색됨: teamspace·페이지 권한을 좁히는 것이 사실상의 검색 노출 통제. 페이지 단위로는 공유 메뉴의 Hide in search 토글로 (링크 없이) 검색으로 발견되는 것을 막을 수 있음",
    "control_availability": "builtin",
    "plan_note": "권한 기반 검색·Hide in search 토글에 대한 요금제 조건 미확인 (문서에 별도 제한 명시 없음)",
    "source_url": "https://www.notion.com/help/sharing-and-permissions",
    "source_quote": "Open the dropdown next to `Everyone at {your workspace}` and toggle on `Hide in search` to hide this page from search results for any users who haven't visited the page before or don't already have the link to the page.",
    "confidence": "medium"
   },
   {
    "layer": "L3",
    "feature": "자동 녹취·전사·요약(AI Meeting Notes)",
    "exists": "yes",
    "control": "워크스페이스 소유자가 Settings → Notion AI에서 Workspace availability 토글을 꺼 AI Meeting Notes를 조직 전체에서 비활성화 가능. 추가로 전 구성원 대상 녹음 동의 강제 설정(Enforce consent for all workspace members)과, Enterprise에서는 전사본 자동 삭제 스케줄(Automatic transcript deletion) 설정 가능",
    "control_availability": "builtin",
    "plan_note": "AI Meeting Notes 기능 자체는 Business·Enterprise 요금제 전용. 조직 단위 비활성화 토글은 해당 요금제의 워크스페이스 소유자 설정, 전사본 자동 삭제 스케줄은 Enterprise 전용",
    "source_url": "https://www.notion.com/help/ai-meeting-notes",
    "source_quote": "If you are a workspace owner and do not want the AI Meeting Notes feature available to members of your workspace, you may opt-out your workspace at any time by going to Settings → Notion AI and toggling off Workspace availability.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "AI 기능의 고객 데이터 모델 학습",
    "exists": "no",
    "control": "기본값으로 Notion과 AI 하위처리자(LLM 제공사) 모두 고객 데이터를 모델 학습에 사용하지 않으며, 하위처리자와의 계약으로 학습 사용을 금지. 별도 옵트아웃 조작 불필요(기본이 비학습). LLM 제공사 측 데이터 보존은 Enterprise 워크스페이스는 zero data retention(저장 없음), 비Enterprise는 30일 이내 보존 후 삭제. 데이터를 보존하는 LLM은 관리자가 명시적으로 켜기 전까지 기본 꺼짐",
    "control_availability": "builtin",
    "plan_note": "학습 미사용은 전 요금제 공통 기본값. LLM 제공사 zero data retention은 Enterprise 요금제, 그 외 요금제는 30일 이내 보존 후 삭제",
    "source_url": "https://www.notion.com/help/notion-ai-security-practices",
    "source_quote": "By default, Notion and its AI Subprocessors do not use Customer Data to train any models.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "데이터 보존기간(휴지통 보존·영구삭제 시점) 설정",
    "exists": "yes",
    "control": "Enterprise 워크스페이스 소유자가 삭제된 페이지가 휴지통에 머무는 기간을 1일~10년 사이로 직접 설정해 영구삭제 시점을 단축·연장 가능(기본 30일). 페이지 버전 기록 보존은 요금제 고정(Free 7일, Plus 30일, Business 90일, Enterprise 무제한)으로 별도 단축 설정은 확인되지 않음. 회의 전사본은 별도로 Enterprise에서 자동 삭제 스케줄 설정 가능",
    "control_availability": "higher_tier",
    "plan_note": "커스텀 데이터 보존(휴지통 보존기간) 설정은 Enterprise 요금제 전용",
    "source_url": "https://www.notion.com/help/custom-data-retention-settings",
    "source_quote": "As an Enterprise workspace owner, you can decide how long a page stays in Trash before it's permanently deleted and no longer accessible to users.",
    "confidence": "high"
   }
  ]
 },
 {
  "saas": "Zoom",
  "entries": [
   {
    "layer": "L1",
    "feature": "미팅·웨비나 등록 폼 (외부인 개인정보 필드 수집)",
    "exists": "yes",
    "control": "회의·웨비나에 등록 기능을 켜면 참석자에게 이름·이메일을 필수로 수집하고, 커스텀 질문으로 추가 개인정보도 받을 수 있다. 등록은 회의별로 호스트가 켜는 선택 기능이라 안 켜면 수집이 없지만, 관리자가 조직 전체에서 등록 기능 자체를 강제 차단하는 설정은 공식 문서에서 확인하지 못했다. Zoom이 등록 질문으로 신용카드번호·주민번호류 수집을 약관상 금지하고 있긴 하나 기술적 차단은 아니다.",
    "control_availability": "unclear",
    "plan_note": "등록 기능은 Pro, Business, Education, Enterprise 계정부터. 조직 단위 차단 설정의 요금제 조건 미확인",
    "source_url": "https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0065026",
    "source_quote": "First Name and Email Address are always enabled and required.",
    "confidence": "high"
   },
   {
    "layer": "L2",
    "feature": "채팅 키워드 필터(Chat Etiquette Tool) 및 서드파티 DLP 연동",
    "exists": "yes",
    "control": "네이티브로는 Chat Etiquette Tool이 있다. 관리자가 키워드·정규식(계좌번호, 주민번호 패턴 등) 정책을 만들면 미팅 채팅·웨비나 채팅·Q&A·Team Chat에서 해당 패턴 발송 시 경고 또는 차단한다. 다만 이것은 키워드 기반 필터 수준이고, 본격적인 DLP(콘텐츠 검사·차단·삭제)는 Zoom DLP API를 지원하는 서드파티 DLP 파트너 연동 + Zoom 지원팀에 기능 활성화 요청이 필요하다.",
    "control_availability": "builtin",
    "plan_note": "Chat Etiquette Tool은 Pro, Business, Education, Enterprise 계정. 서드파티 DLP 연동의 요금제 조건 미확인(Zoom Support 요청 필요)",
    "source_url": "https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0066482",
    "source_quote": "When a user sends a message that triggers a policy, the message will be blocked or a warning prompt will be displayed for the user to confirm that they want to send the message, depending on what the admin set.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "Team Chat 클라우드 저장·검색 색인",
    "exists": "yes",
    "control": "검색 색인만 따로 제외하는 전용 설정은 없다. 대신 관리자가 Team Chat의 클라우드 저장(Cloud Storage)을 끄면 메시지·파일이 Zoom 클라우드에 저장되지 않아 클라우드 기반 검색·이력 조회 대상에서 빠진다. 저장을 켠 경우에도 보존기간을 설정해 검색 가능한 이력 범위를 줄일 수 있다.",
    "control_availability": "builtin",
    "plan_note": "Team Chat 관리자 설정은 유료 계정에서 제공. 세부 요금제 조건 미확인",
    "source_url": "https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0058688",
    "source_quote": "Enable this setting to store messages and files in Zoom's cloud. If disabled, messages and files are not stored in Zoom's cloud, but messages sent to offline users can be received for up to 7 days",
    "confidence": "medium"
   },
   {
    "layer": "L3",
    "feature": "클라우드 녹화·자동 전사·AI 미팅 요약",
    "exists": "yes",
    "control": "관리자가 조직 단위로 끄고 잠글 수 있다. 클라우드 녹화는 계정 설정 > Recording에서 비활성화 후 잠금하면 전 계정에서 녹화·전사(오디오 트랜스크립트 포함)가 막힌다. AI Companion 미팅 요약은 Admin Center > Settings > Zoom AI에서 'Meeting summary with AI' 토글을 끄고, 잠금 아이콘으로 잠그면 사용자·그룹이 다시 켤 수 없다.",
    "control_availability": "builtin",
    "plan_note": "클라우드 녹화 관리는 Pro, Business, Enterprise 계정. AI Companion 미팅 요약은 Zoom Workplace Pro 이상 유료 플랜에 포함",
    "source_url": "https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0057960",
    "source_quote": "click the lock icon next to a setting, and then click Lock to confirm the setting",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "AI Companion의 고객 데이터 모델 학습",
    "exists": "no",
    "control": "2023년 약관 논란 이후 Zoom이 공식 입장으로 못박았다. 고객의 오디오·비디오·채팅·화면공유·첨부파일 등 커뮤니케이션 콘텐츠를 Zoom 자체 모델이든 서드파티(OpenAI, Anthropic 등) 모델이든 학습에 사용하지 않는다. 기본값이 학습 미사용이라 별도 옵트아웃 절차가 없고, AI Companion 기능 자체를 관리자가 계정 단위로 비활성화·잠금할 수 있다.",
    "control_availability": "builtin",
    "plan_note": "학습 미사용 정책은 전 요금제 공통",
    "source_url": "https://news.zoom.com/zoom-ai-companion/",
    "source_quote": "it does not use any customer audio, video, chat, screen-sharing, attachments, or other communications-like customer content (such as poll results, whiteboards, or reactions) to train Zoom's or third-party artificial intelligence models.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "클라우드 녹화 보존기간 자동 삭제 설정",
    "exists": "yes",
    "control": "관리자가 계정·그룹 단위로 클라우드 녹화를 생성일 기준 지정 일수 경과 후 자동 삭제하도록 설정할 수 있다. 삭제된 녹화는 휴지통에 30일 보관 후 영구 삭제된다. Team Chat 쪽도 별도로 클라우드 저장 보존기간과 로컬 기기 보존기간을 관리자가 설정할 수 있어, 녹화·채팅 모두 보존기간 단축이 가능하다.",
    "control_availability": "builtin",
    "plan_note": "Pro, Business, Enterprise 계정에서 제공",
    "source_url": "https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0065362",
    "source_quote": "Delete cloud recordings after a specified number of days: Delete cloud recordings after the specified amount of days from their creation date.",
    "confidence": "high"
   }
  ]
 },
 {
  "saas": "NHN Dooray(두레이)",
  "entries": [
   {
    "layer": "L1",
    "feature": "주소록·설문 폼 (고객/거래처 연락처 필드, 외부 공개 폼 수집)",
    "exists": "yes",
    "control": "고객·거래처 연락처를 필드 단위로 저장하는 주소록 서비스와, 외부 고객에게 공개해 응답을 수집하는 폼(설문) 서비스가 있다. 통제 수단: Admin > 조직 서비스 관리 > 서비스 사용 및 제한에서 주소록을 포함한 서비스별 접근을 플랫폼(웹/모바일)·IP·계정 단위로 차단할 수 있다. 폼은 Admin > 공유 관리에서 외부 공유된 폼 콘텐츠를 확인하고 공유 URL 생성 정책을 설정할 수 있다. DLP(추가 구독)를 FORM·주소록 관련 서비스에 적용해 고유식별정보 입력을 차단하는 것도 가능하다.",
    "control_availability": "builtin",
    "plan_note": "서비스별 접근 제한(ACL)은 관리자 기본 기능으로 안내됨. 이 기능 자체의 요금제 조건 미확인",
    "source_url": "https://dooray.com/main/service/form/",
    "source_quote": "외부 전체 공개용 폼 작성도 가능합니다. 필요에 따라 조직 내부 혹은 외부 고객의 데이터를 손쉽게 수집할 수 있습니다.",
    "confidence": "high"
   },
   {
    "layer": "L2",
    "feature": "고유식별정보(DLP) 게시물 필터",
    "exists": "yes",
    "control": "주민등록번호 등 고유식별정보 입력을 걸러내는 DLP 필터를 제공하지만 기본 내장이 아니라 별도 솔루션(추가 구독)이다. 게시물 필터 > 개인정보 DLP > 정책 관리에서 필터 정책을 등록하고, 홈게시판(BOARD)·업무(TASK)·메일(MAIL)·캘린더·위키·드라이브·결재·메신저(MESSENGER)·AI(CHAT_GPT)·폼(FORM)·승인(APPROVAL) 등 서비스별로 정책을 다르게 적용할 수 있다. 운영모드는 차단모드로 설정해 입력 자체를 차단하며, 실제 차단/탐지 동작은 Dooray! Admin에서 설정한다. 테넌트의 신뢰 도메인은 DLP 적용 시 내부 도메인으로 간주된다.",
    "control_availability": "higher_tier",
    "plan_note": "기본 플랜 미포함. 추가 구독 필요: 정확한 요금제 단계는 문서에 없고 help@dooray.com 문의로 안내",
    "source_url": "https://helpdesk.dooray.com/share/pages/9wWo-xwiR66BO5LGshgVTg/4377713768868346809",
    "source_quote": "추가 구독이 필요한 기능으로 자세한 내용은 help@dooray.com으로 문의해 주세요. 우리 조직의 일부 서비스만 고유식별정보(DLP) 필터 정책을 다르게 적용할 수 있습니다. (중략) 운영모드는 반드시 '차단모드'로 설정되어 있어야 합니다.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "통합 검색 색인 (관리자의 색인 제외/제한)",
    "exists": "yes",
    "control": "업무·위키·메일 등 전 서비스를 대상으로 한 통합 검색이 존재한다(조직이 달라도 검색·멘션은 테넌트 전체에서 동작). 그러나 관리자가 특정 프로젝트·문서를 검색 색인에서 제외하거나 색인 자체를 제한하는 설정은 공식 문서에서 확인되지 않았다. 우회 수단은 서비스 사용 및 제한(ACL)으로 특정 계정·IP의 서비스 접근 자체를 막는 것뿐이며, 색인 단위 통제와는 다르다.",
    "control_availability": "unclear",
    "plan_note": "요금제 조건 미확인 (색인 통제 기능 자체가 문서에 없음)",
    "source_url": "https://helpdesk.dooray.com/share/pages/9wWo-xwiR66BO5LGshgVTg/2895664991100104876",
    "source_quote": "조직이 달라도 Dooray!모든 서비스를 함께 사용할 수 있습니다. (검색,멘션 등)",
    "confidence": "low"
   },
   {
    "layer": "L3",
    "feature": "화상회의 자동 녹취·전사·요약",
    "exists": "no",
    "control": "화상회의에 자동 녹취·전사·AI 요약 기능은 공식 문서상 없다. 호스트가 수동으로 [녹화] 버튼을 눌러야 녹화되며, 녹화물은 호스트 메일로 다운로드 링크가 전송되고 14일 후 자동 삭제된다. 회의 채팅은 회의 종료 시 저장 없이 즉시 삭제된다. 녹화 기능만 따로 끄는 관리자 설정은 문서에서 확인되지 않았고(공공기관용은 KISA 보안 권고에 따라 녹화 기능 자체가 제외됨), 대신 테넌트 관리 > 메신저 > 화상 회의에서 화상회의 생성 기능 자체의 사용 여부를 조직 단위로 설정할 수 있다.",
    "control_availability": "builtin",
    "plan_note": "화상회의 기능 사용 여부 설정의 요금제 조건 미확인. 공공기관 상품은 녹화 기능 제외",
    "source_url": "https://helpdesk.dooray.com/share/pages/9wWo-xwiR66BO5LGshgVTg/2909492230597375249",
    "source_quote": "호스트는 화면 하단 [녹화]를 클릭 하여 회의를 녹화할 수 있습니다. (중략) ※녹화된 자료는 녹화된 날로부터 14일까지 보관되고 이후에는 삭제됩니다. 필요한 경우 다운로드/ 보관 부탁드립니다.",
    "confidence": "medium"
   },
   {
    "layer": "L3",
    "feature": "Dooray! AI의 입력 데이터 모델 학습 활용",
    "exists": "no",
    "control": "입력 데이터는 암호화되며 AI 모델 학습에 사용되지 않는다고 공식 가이드에 명시돼 있어, 학습 미사용이 기본값이고 별도 옵트아웃 절차가 필요 없다. Dooray! AI 자체가 Business 플랜 이상에서 추가 구독하는 부가상품이라 미구독 시 AI 기능이 아예 없으며, 구독하더라도 구성원별 AI 라이센스를 내부 관리자가 직접 부여·관리하므로 사용 대상을 통제할 수 있다. 관리자는 구성원의 AI 사용 내역을 로그로 확인할 수 있다. 단, 가이드에 개인정보·금융정보 등 민감정보 입력 금지 문구가 있는 만큼 입력 차단은 DLP(AI 서비스 CHAT_GPT 대상 적용 가능)와 병행해야 한다.",
    "control_availability": "builtin",
    "plan_note": "Dooray! AI는 Business 플랜 이상 구독 시 추가 구독 가능한 부가상품. 학습 미사용 방침은 구독 시 기본 적용",
    "source_url": "https://helpdesk.dooray.com/share/pages/9wWo-xwiR66BO5LGshgVTg/3921845293385786920",
    "source_quote": "입력한 데이터는 암호화되며, AI 모델 학습에 사용되지 않습니다. 개인정보,금융정보 등 민감한 정보는 입력하지 마세요.",
    "confidence": "high"
   },
   {
    "layer": "L3",
    "feature": "데이터 보존기간 설정 (휴지통 자동 삭제, 첨부파일 보관 기간)",
    "exists": "yes",
    "control": "부분적인 보존기간 통제만 제공된다. 드라이브 휴지통은 조직별로 일정 기간 후 자동 영구 삭제를 설정할 수 있고(유료 플랜은 5/10/15/30일 중 선택, Free는 5일 고정), 메일 휴지통도 관리자가 자동 삭제를 설정하면 구성원 개인 설정보다 우선 적용된다. 메신저 첨부파일은 보관 기간을 설정할 수 있으며(Business 플랜 이상), 내부 발송 메일에는 기밀 설정으로 일정 기간 후 자동 삭제를 걸 수 있다. 반면 업무·위키·메신저 대화 본문 등 원본 데이터 전체에 대한 보존기간 설정·단축 기능은 공식 문서에서 확인되지 않았다.",
    "control_availability": "builtin",
    "plan_note": "드라이브 휴지통: Free 5일 고정, 유료 플랜 5/10/15/30일 선택. 메신저 첨부파일 보관 기간: Business 플랜 이상. 본문 데이터 보존기간 설정은 미확인",
    "source_url": "https://helpdesk.dooray.com/share/pages/9wWo-xwiR66BO5LGshgVTg/2896232119805738090",
    "source_quote": "조직별로 개인/프로젝트 드라이브 휴지통의 파일을 일정 기간 후 자동으로 영구 삭제하도록 설정하는 기능입니다. 영구 삭제 이후 복구할 수 없습니다. Free 플랜은 5일로 고정되며, 유료 플랜은 5일, 10일, 15일, 30일 중 선택할 수 있습니다.",
    "confidence": "medium"
   }
  ]
 }
];
