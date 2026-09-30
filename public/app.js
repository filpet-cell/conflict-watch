// ConflictWatch frontend: renders the world map, conflict pins, and per-conflict
// dropdowns of source links. Polls the server every 5 minutes.

const POLL_MS = 2 * 60 * 1000;

// ---------------------------------------------------------------------------
// i18n — full UI translation; article links open via Google Translate when a
// non-English language is selected.
// ---------------------------------------------------------------------------

const I18N = {
  en: {
    tagline: "Open-source conflict monitor", hint: "Expand a region to show its pins on the map",
    byRegion: "Conflicts by region", liveTV: "Live TV", liveStreams: "Live news streams",
    sourcesLive: "%n sources live", updatedTpl: "Updated %t", justNow: "just now", agoTpl: "%t ago",
    waiting: "Waiting for first fetch…", connError: "Connection error — retrying…",
    reports: "reports", quiet: "quiet", suggestedN: "%n suggested",
    corroborated: "corroborated", lowActivity: "low activity", activeConflict: "active conflict",
    potentialFlashpoint: "potential flashpoint", civilUnrest: "civil unrest", autoUnrest: "Auto-detected unrest",
    unconfirmedSingle: "unconfirmed — single source", corrSourcesN: "corroborated — %n sources",
    reportingSources: "Reporting sources (48h):", noActivity: "No source activity in the last 48h",
    risk: "Risk assessment:", liveCoverage: "Live coverage:", latestReports: "Latest reports",
    linkedEntities: "Linked entities & commercial actors",
    entityDisclaimer: "Compiled from public sanctions lists and official reports — follow the source links to verify. Entity descriptions are in English.",
    sourceLabel: "Source:", noReports: "No reports matched in the current feed window.",
    translateNote: "Articles open auto-translated via Google Translate.",
    autoSingleNote: "Only one source so far — treat as unverified until other outlets corroborate.",
    autoCorrNote: "Multiple independent sources are reporting — still auto-detected, verify via the reports below.",
    unrestFromS: "Unrest-related reporting from %s (48h)",
    unconfirmedRow: "unconfirmed — 1 source", corrRowN: "corroborated by %n sources",
    detected1: "Detected, 1 source", detectedCorr: "Detected, corroborated",
    corrExplain: "= reported by 2+ independent sources in the last 48 hours", about: "About the data",
    langCaveat: "Curated names and descriptions are written in English. In other languages, articles open machine-translated (imperfect) — the original is always one click away via the source name.",
    regions: {}, tags: {},
  },
  es: {
    tagline: "Monitor de conflictos de código abierto", hint: "Expande una región para mostrar sus marcadores en el mapa",
    byRegion: "Conflictos por región", liveTV: "TV en directo", liveStreams: "Transmisiones en directo",
    sourcesLive: "%n fuentes activas", updatedTpl: "Actualizado %t", justNow: "ahora mismo", agoTpl: "hace %t",
    waiting: "Esperando la primera carga…", connError: "Error de conexión — reintentando…",
    reports: "informes", quiet: "sin actividad", suggestedN: "%n sugeridos",
    corroborated: "corroborado", lowActivity: "actividad baja", activeConflict: "conflicto activo",
    potentialFlashpoint: "foco potencial", civilUnrest: "disturbios civiles", autoUnrest: "Disturbios autodetectados",
    unconfirmedSingle: "sin confirmar — una fuente", corrSourcesN: "corroborado — %n fuentes",
    reportingSources: "Fuentes que informan (48h):", noActivity: "Sin actividad de fuentes en las últimas 48h",
    risk: "Evaluación de riesgo:", liveCoverage: "Cobertura en directo:", latestReports: "Últimos informes",
    linkedEntities: "Entidades vinculadas y actores comerciales",
    entityDisclaimer: "Recopilado de listas públicas de sanciones e informes oficiales — verifique mediante los enlaces. Las descripciones están en inglés.",
    sourceLabel: "Fuente:", noReports: "Ningún informe coincide en la ventana actual.",
    translateNote: "Los artículos se abren traducidos automáticamente con Google Translate.",
    autoSingleNote: "Solo una fuente por ahora — trátelo como no verificado hasta que otros medios lo corroboren.",
    autoCorrNote: "Varias fuentes independientes informan — aun así autodetectado; verifique con los informes.",
    unrestFromS: "Informes de disturbios de %s (48h)",
    unconfirmedRow: "sin confirmar — 1 fuente", corrRowN: "corroborado por %n fuentes",
    detected1: "Detectado, 1 fuente", detectedCorr: "Detectado, corroborado",
    corrExplain: "= informado por 2+ fuentes independientes en las últimas 48 horas", about: "Acerca de los datos",
    langCaveat: "Los nombres y descripciones curados están en inglés. Los artículos se abren con traducción automática (imperfecta) — el original está siempre a un clic mediante el nombre de la fuente.",
    regions: { "Middle East": "Oriente Medio", "Europe": "Europa", "Africa": "África", "Asia": "Asia", "Americas": "América" },
    tags: { "monetary support": "apoyo financiero", "weapons deals": "venta de armas", "weapons manufacturing": "fabricación de armas", "weapons & tech": "armas y tecnología", "military support": "apoyo militar", "military & monetary support": "apoyo militar y financiero", "strategic tech": "tecnología estratégica", "resource extraction": "extracción de recursos", "resource funding": "financiación por recursos" },
  },
  fr: {
    tagline: "Moniteur de conflits open source", hint: "Développez une région pour afficher ses repères sur la carte",
    byRegion: "Conflits par région", liveTV: "TV en direct", liveStreams: "Chaînes d'info en direct",
    sourcesLive: "%n sources actives", updatedTpl: "Mis à jour %t", justNow: "à l'instant", agoTpl: "il y a %t",
    waiting: "En attente du premier chargement…", connError: "Erreur de connexion — nouvelle tentative…",
    reports: "rapports", quiet: "calme", suggestedN: "%n suggérés",
    corroborated: "corroboré", lowActivity: "activité faible", activeConflict: "conflit actif",
    potentialFlashpoint: "point chaud potentiel", civilUnrest: "troubles civils", autoUnrest: "Troubles autodétectés",
    unconfirmedSingle: "non confirmé — source unique", corrSourcesN: "corroboré — %n sources",
    reportingSources: "Sources (48h) :", noActivity: "Aucune activité de source ces dernières 48h",
    risk: "Évaluation des risques :", liveCoverage: "Couverture en direct :", latestReports: "Derniers rapports",
    linkedEntities: "Entités liées et acteurs commerciaux",
    entityDisclaimer: "Compilé à partir de listes de sanctions publiques et de rapports officiels — vérifiez via les liens. Les descriptions sont en anglais.",
    sourceLabel: "Source :", noReports: "Aucun rapport ne correspond à la fenêtre actuelle.",
    translateNote: "Les articles s'ouvrent traduits automatiquement via Google Translate.",
    autoSingleNote: "Une seule source pour l'instant — à considérer comme non vérifié tant que d'autres médias ne corroborent pas.",
    autoCorrNote: "Plusieurs sources indépendantes en parlent — toujours autodétecté, vérifiez via les rapports ci-dessous.",
    unrestFromS: "Signalements de troubles de %s (48h)",
    unconfirmedRow: "non confirmé — 1 source", corrRowN: "corroboré par %n sources",
    detected1: "Détecté, 1 source", detectedCorr: "Détecté, corroboré",
    corrExplain: "= rapporté par 2+ sources indépendantes au cours des dernières 48 heures", about: "À propos des données",
    langCaveat: "Les noms et descriptions édités sont en anglais. Les articles s'ouvrent en traduction automatique (imparfaite) — l'original reste à un clic via le nom de la source.",
    regions: { "Middle East": "Moyen-Orient", "Europe": "Europe", "Africa": "Afrique", "Asia": "Asie", "Americas": "Amériques" },
    tags: { "monetary support": "soutien financier", "weapons deals": "ventes d'armes", "weapons manufacturing": "fabrication d'armes", "weapons & tech": "armes et technologie", "military support": "soutien militaire", "military & monetary support": "soutien militaire et financier", "strategic tech": "technologie stratégique", "resource extraction": "extraction de ressources", "resource funding": "financement par les ressources" },
  },
  pt: {
    tagline: "Monitor de conflitos de código aberto", hint: "Expanda uma região para mostrar os seus marcadores no mapa",
    byRegion: "Conflitos por região", liveTV: "TV ao vivo", liveStreams: "Canais de notícias ao vivo",
    sourcesLive: "%n fontes ativas", updatedTpl: "Atualizado %t", justNow: "agora mesmo", agoTpl: "há %t",
    waiting: "A aguardar o primeiro carregamento…", connError: "Erro de ligação — a tentar novamente…",
    reports: "relatórios", quiet: "sem atividade", suggestedN: "%n sugeridos",
    corroborated: "corroborado", lowActivity: "atividade baixa", activeConflict: "conflito ativo",
    potentialFlashpoint: "foco potencial", civilUnrest: "agitação civil", autoUnrest: "Agitação autodetetada",
    unconfirmedSingle: "não confirmado — fonte única", corrSourcesN: "corroborado — %n fontes",
    reportingSources: "Fontes a reportar (48h):", noActivity: "Sem atividade de fontes nas últimas 48h",
    risk: "Avaliação de risco:", liveCoverage: "Cobertura ao vivo:", latestReports: "Últimos relatórios",
    linkedEntities: "Entidades ligadas e atores comerciais",
    entityDisclaimer: "Compilado de listas públicas de sanções e relatórios oficiais — verifique através das ligações. As descrições estão em inglês.",
    sourceLabel: "Fonte:", noReports: "Nenhum relatório corresponde à janela atual.",
    translateNote: "Os artigos abrem traduzidos automaticamente via Google Translate.",
    autoSingleNote: "Apenas uma fonte até agora — trate como não verificado até outros meios corroborarem.",
    autoCorrNote: "Várias fontes independentes estão a reportar — ainda autodetetado; verifique nos relatórios abaixo.",
    unrestFromS: "Relatos de agitação de %s (48h)",
    unconfirmedRow: "não confirmado — 1 fonte", corrRowN: "corroborado por %n fontes",
    detected1: "Detetado, 1 fonte", detectedCorr: "Detetado, corroborado",
    corrExplain: "= reportado por 2+ fontes independentes nas últimas 48 horas", about: "Sobre os dados",
    langCaveat: "Os nomes e descrições curados estão em inglês. Os artigos abrem com tradução automática (imperfeita) — o original está sempre a um clique através do nome da fonte.",
    regions: { "Middle East": "Médio Oriente", "Europe": "Europa", "Africa": "África", "Asia": "Ásia", "Americas": "Américas" },
    tags: { "monetary support": "apoio financeiro", "weapons deals": "negócios de armas", "weapons manufacturing": "fabrico de armas", "weapons & tech": "armas e tecnologia", "military support": "apoio militar", "military & monetary support": "apoio militar e financeiro", "strategic tech": "tecnologia estratégica", "resource extraction": "extração de recursos", "resource funding": "financiamento por recursos" },
  },
  de: {
    tagline: "Open-Source-Konfliktmonitor", hint: "Region aufklappen, um ihre Markierungen auf der Karte anzuzeigen",
    byRegion: "Konflikte nach Region", liveTV: "Live-TV", liveStreams: "Live-Nachrichtensender",
    sourcesLive: "%n Quellen aktiv", updatedTpl: "Aktualisiert %t", justNow: "gerade eben", agoTpl: "vor %t",
    waiting: "Warte auf ersten Abruf…", connError: "Verbindungsfehler — neuer Versuch…",
    reports: "Berichte", quiet: "ruhig", suggestedN: "%n vorgeschlagen",
    corroborated: "bestätigt", lowActivity: "geringe Aktivität", activeConflict: "aktiver Konflikt",
    potentialFlashpoint: "potenzieller Krisenherd", civilUnrest: "zivile Unruhen", autoUnrest: "Automatisch erkannte Unruhen",
    unconfirmedSingle: "unbestätigt — eine Quelle", corrSourcesN: "bestätigt — %n Quellen",
    reportingSources: "Berichtende Quellen (48h):", noActivity: "Keine Quellenaktivität in den letzten 48h",
    risk: "Risikoeinschätzung:", liveCoverage: "Live-Berichterstattung:", latestReports: "Neueste Berichte",
    linkedEntities: "Verknüpfte Organisationen und Unternehmen",
    entityDisclaimer: "Zusammengestellt aus öffentlichen Sanktionslisten und offiziellen Berichten — bitte über die Quellenlinks prüfen. Beschreibungen auf Englisch.",
    sourceLabel: "Quelle:", noReports: "Keine passenden Berichte im aktuellen Zeitfenster.",
    translateNote: "Artikel öffnen sich automatisch übersetzt über Google Translate.",
    autoSingleNote: "Bisher nur eine Quelle — als unbestätigt betrachten, bis andere Medien es bestätigen.",
    autoCorrNote: "Mehrere unabhängige Quellen berichten — dennoch automatisch erkannt; bitte anhand der Berichte prüfen.",
    unrestFromS: "Unruhe-Berichte von %s (48h)",
    unconfirmedRow: "unbestätigt — 1 Quelle", corrRowN: "bestätigt durch %n Quellen",
    detected1: "Erkannt, 1 Quelle", detectedCorr: "Erkannt, bestätigt",
    corrExplain: "= von 2+ unabhängigen Quellen in den letzten 48 Stunden berichtet", about: "Über die Daten",
    langCaveat: "Kuratierte Namen und Beschreibungen sind auf Englisch. Artikel öffnen sich maschinell übersetzt (nicht perfekt) — das Original ist über den Quellennamen einen Klick entfernt.",
    regions: { "Middle East": "Naher Osten", "Europe": "Europa", "Africa": "Afrika", "Asia": "Asien", "Americas": "Amerika" },
    tags: { "monetary support": "finanzielle Unterstützung", "weapons deals": "Waffengeschäfte", "weapons manufacturing": "Waffenproduktion", "weapons & tech": "Waffen & Technologie", "military support": "militärische Unterstützung", "military & monetary support": "militärische & finanzielle Unterstützung", "strategic tech": "strategische Technologie", "resource extraction": "Rohstoffförderung", "resource funding": "Rohstofffinanzierung" },
  },
  ar: {
    tagline: "مرصد مفتوح المصدر للنزاعات", hint: "وسّع منطقة لعرض مواقعها على الخريطة",
    byRegion: "النزاعات حسب المنطقة", liveTV: "بث مباشر", liveStreams: "قنوات إخبارية مباشرة",
    sourcesLive: "%n مصادر نشطة", updatedTpl: "حُدّث %t", justNow: "الآن", agoTpl: "قبل %t",
    waiting: "بانتظار التحميل الأول…", connError: "خطأ في الاتصال — إعادة المحاولة…",
    reports: "تقارير", quiet: "هادئ", suggestedN: "%n مقترحة",
    corroborated: "مؤكد من مصادر متعددة", lowActivity: "نشاط منخفض", activeConflict: "نزاع نشط",
    potentialFlashpoint: "بؤرة توتر محتملة", civilUnrest: "اضطرابات مدنية", autoUnrest: "اضطرابات مكتشفة تلقائيًا",
    unconfirmedSingle: "غير مؤكد — مصدر واحد", corrSourcesN: "مؤكد — %n مصادر",
    reportingSources: "المصادر (48 ساعة):", noActivity: "لا نشاط للمصادر خلال 48 ساعة",
    risk: "تقييم المخاطر:", liveCoverage: "تغطية مباشرة:", latestReports: "أحدث التقارير",
    linkedEntities: "كيانات مرتبطة وجهات تجارية",
    entityDisclaimer: "مُجمّع من قوائم العقوبات العامة والتقارير الرسمية — تحقّق عبر روابط المصادر. الأوصاف بالإنجليزية.",
    sourceLabel: "المصدر:", noReports: "لا توجد تقارير مطابقة حاليًا.",
    translateNote: "تُفتح المقالات مترجمة تلقائيًا عبر ترجمة Google.",
    autoSingleNote: "مصدر واحد فقط حتى الآن — اعتبره غير مؤكد حتى تؤكده وسائل أخرى.",
    autoCorrNote: "عدة مصادر مستقلة تُبلغ — لا يزال مكتشفًا تلقائيًا؛ تحقّق من التقارير أدناه.",
    unrestFromS: "تقارير اضطرابات من %s (خلال 48 ساعة)",
    unconfirmedRow: "غير مؤكد — مصدر واحد", corrRowN: "مؤكد من %n مصادر",
    detected1: "مكتشف، مصدر واحد", detectedCorr: "مكتشف، مؤكد",
    corrExplain: "= أورده مصدران مستقلان أو أكثر خلال آخر 48 ساعة", about: "حول البيانات",
    langCaveat: "الأسماء والأوصاف المنسّقة بالإنجليزية. تُفتح المقالات بترجمة آلية (غير كاملة) — والنص الأصلي على بُعد نقرة عبر اسم المصدر.",
    regions: { "Middle East": "الشرق الأوسط", "Europe": "أوروبا", "Africa": "أفريقيا", "Asia": "آسيا", "Americas": "الأمريكتان" },
    tags: { "monetary support": "دعم مالي", "weapons deals": "صفقات أسلحة", "weapons manufacturing": "تصنيع أسلحة", "weapons & tech": "أسلحة وتقنية", "military support": "دعم عسكري", "military & monetary support": "دعم عسكري ومالي", "strategic tech": "تقنية استراتيجية", "resource extraction": "استخراج موارد", "resource funding": "تمويل من الموارد" },
  },
  ja: {
    tagline: "オープンソース紛争モニター", hint: "地域を展開すると地図上にピンが表示されます",
    byRegion: "地域別の紛争", liveTV: "ライブTV", liveStreams: "ライブニュース配信",
    sourcesLive: "%n ソース稼働中", updatedTpl: "%tに更新", justNow: "たった今", agoTpl: "%t前",
    waiting: "初回読み込み待ち…", connError: "接続エラー — 再試行中…",
    reports: "件の報道", quiet: "動きなし", suggestedN: "%n 件の候補",
    corroborated: "複数ソース確認済み", lowActivity: "低活動", activeConflict: "進行中の紛争",
    potentialFlashpoint: "潜在的火種", civilUnrest: "市民騒乱", autoUnrest: "自動検出された騒乱",
    unconfirmedSingle: "未確認 — 単一ソース", corrSourcesN: "確認済み — %n ソース",
    reportingSources: "報道ソース（48時間）:", noActivity: "過去48時間のソース活動なし",
    risk: "リスク評価:", liveCoverage: "ライブ報道:", latestReports: "最新の報道",
    linkedEntities: "関連組織・企業",
    entityDisclaimer: "公開制裁リストと公式報告書に基づく — ソースリンクで確認してください。説明は英語です。",
    sourceLabel: "出典:", noReports: "現在のフィードに該当する報道はありません。",
    translateNote: "記事はGoogle翻訳で自動翻訳されて開きます。",
    autoSingleNote: "現時点で単一ソースのみ — 他媒体の確認まで未検証として扱ってください。",
    autoCorrNote: "複数の独立ソースが報道中 — 自動検出のため下記の報道で確認してください。",
    unrestFromS: "%s による騒乱報道（48時間）",
    unconfirmedRow: "未確認 — 1 ソース", corrRowN: "%n ソースが確認",
    detected1: "検出、1ソース", detectedCorr: "検出、確認済み",
    corrExplain: "= 過去48時間に2つ以上の独立ソースが報道", about: "データについて",
    langCaveat: "編集された名称・説明は英語です。記事は機械翻訳（不完全）で開きます — 原文はソース名からワンクリックで確認できます。",
    regions: { "Middle East": "中東", "Europe": "ヨーロッパ", "Africa": "アフリカ", "Asia": "アジア", "Americas": "南北アメリカ" },
    tags: { "monetary support": "資金支援", "weapons deals": "武器取引", "weapons manufacturing": "武器製造", "weapons & tech": "武器・技術", "military support": "軍事支援", "military & monetary support": "軍事・資金支援", "strategic tech": "戦略技術", "resource extraction": "資源採掘", "resource funding": "資源による資金調達" },
  },
  ko: {
    tagline: "오픈소스 분쟁 모니터", hint: "지역을 펼치면 지도에 핀이 표시됩니다",
    byRegion: "지역별 분쟁", liveTV: "라이브 TV", liveStreams: "실시간 뉴스 채널",
    sourcesLive: "%n개 소스 활성", updatedTpl: "%t 업데이트됨", justNow: "방금", agoTpl: "%t 전",
    waiting: "첫 로딩 대기 중…", connError: "연결 오류 — 재시도 중…",
    reports: "건의 보도", quiet: "조용함", suggestedN: "%n건 제안됨",
    corroborated: "교차 확인됨", lowActivity: "낮은 활동", activeConflict: "진행 중인 분쟁",
    potentialFlashpoint: "잠재적 분쟁 지역", civilUnrest: "시민 소요", autoUnrest: "자동 감지된 소요",
    unconfirmedSingle: "미확인 — 단일 소스", corrSourcesN: "확인됨 — %n개 소스",
    reportingSources: "보도 소스(48시간):", noActivity: "지난 48시간 동안 소스 활동 없음",
    risk: "위험 평가:", liveCoverage: "실시간 보도:", latestReports: "최신 보도",
    linkedEntities: "연관 단체 및 기업",
    entityDisclaimer: "공개 제재 목록과 공식 보고서 기반 — 출처 링크로 확인하세요. 설명은 영어입니다.",
    sourceLabel: "출처:", noReports: "현재 피드에 일치하는 보도가 없습니다.",
    translateNote: "기사는 Google 번역으로 자동 번역되어 열립니다.",
    autoSingleNote: "아직 단일 소스 — 다른 매체가 확인할 때까지 미검증으로 간주하세요.",
    autoCorrNote: "여러 독립 소스가 보도 중 — 자동 감지이므로 아래 보도로 확인하세요.",
    unrestFromS: "%s의 소요 관련 보도(48시간)",
    unconfirmedRow: "미확인 — 1개 소스", corrRowN: "%n개 소스 확인",
    detected1: "감지됨, 1개 소스", detectedCorr: "감지됨, 확인됨",
    corrExplain: "= 지난 48시간 동안 2개 이상의 독립 소스가 보도", about: "데이터 정보",
    langCaveat: "큐레이션된 이름과 설명은 영어로 작성됩니다. 기사는 기계 번역(불완전)으로 열리며 — 원문은 소스 이름을 통해 클릭 한 번이면 볼 수 있습니다.",
    regions: { "Middle East": "중동", "Europe": "유럽", "Africa": "아프리카", "Asia": "아시아", "Americas": "아메리카" },
    tags: { "monetary support": "자금 지원", "weapons deals": "무기 거래", "weapons manufacturing": "무기 제조", "weapons & tech": "무기·기술", "military support": "군사 지원", "military & monetary support": "군사·자금 지원", "strategic tech": "전략 기술", "resource extraction": "자원 채굴", "resource funding": "자원 기반 자금" },
  },
  zh: {
    tagline: "开源冲突监测", hint: "展开区域以在地图上显示其标记",
    byRegion: "按地区划分的冲突", liveTV: "直播电视", liveStreams: "实时新闻频道",
    sourcesLive: "%n 个信源在线", updatedTpl: "更新于%t", justNow: "刚刚", agoTpl: "%t前",
    waiting: "等待首次加载…", connError: "连接错误 — 正在重试…",
    reports: "条报道", quiet: "平静", suggestedN: "%n 条建议",
    corroborated: "多方证实", lowActivity: "活动较少", activeConflict: "进行中的冲突",
    potentialFlashpoint: "潜在爆发点", civilUnrest: "民间骚乱", autoUnrest: "自动检测的骚乱",
    unconfirmedSingle: "未证实 — 单一信源", corrSourcesN: "已证实 — %n 个信源",
    reportingSources: "报道信源（48小时）:", noActivity: "过去48小时无信源活动",
    risk: "风险评估:", liveCoverage: "实时报道:", latestReports: "最新报道",
    linkedEntities: "关联实体与商业行为者",
    entityDisclaimer: "汇编自公开制裁名单与官方报告 — 请通过来源链接核实。描述为英文。",
    sourceLabel: "来源:", noReports: "当前时间窗内无匹配报道。",
    translateNote: "文章将通过 Google 翻译自动翻译打开。",
    autoSingleNote: "目前仅有一个信源 — 在其他媒体证实前请视为未经核实。",
    autoCorrNote: "多个独立信源正在报道 — 仍为自动检测，请通过下方报道核实。",
    unrestFromS: "来自 %s 的骚乱报道（48小时）",
    unconfirmedRow: "未证实 — 1 个信源", corrRowN: "%n 个信源证实",
    detected1: "已检测，1 个信源", detectedCorr: "已检测，已证实",
    corrExplain: "= 过去48小时内有2个以上独立信源报道", about: "关于数据",
    langCaveat: "策展的名称与描述为英文。文章以机器翻译（并不完美）打开 — 通过信源名称一键即可查看原文。",
    regions: { "Middle East": "中东", "Europe": "欧洲", "Africa": "非洲", "Asia": "亚洲", "Americas": "美洲" },
    tags: { "monetary support": "资金支持", "weapons deals": "武器交易", "weapons manufacturing": "武器制造", "weapons & tech": "武器与技术", "military support": "军事支持", "military & monetary support": "军事与资金支持", "strategic tech": "战略技术", "resource extraction": "资源开采", "resource funding": "资源融资" },
  },
};

let lang = localStorage.getItem("cw-lang") || "en";
let lastData = null;

function t(key, vars) {
  const pack = I18N[lang] || I18N.en;
  let s = key in pack ? pack[key] : I18N.en[key];
  if (s === undefined) s = key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace("%" + k, v);
  return s;
}

function tRegion(name) {
  return (I18N[lang] && I18N[lang].regions && I18N[lang].regions[name]) || name;
}

function tTag(tag) {
  return (I18N[lang] && I18N[lang].tags && I18N[lang].tags[tag]) || tag;
}

// Languages with a fully translated UI (hand-written dictionaries above)
const FULL_LANGS = [
  ["en", "English"], ["es", "Español"], ["fr", "Français"], ["pt", "Português"],
  ["de", "Deutsch"], ["ar", "العربية"], ["ja", "日本語"], ["ko", "한국어"], ["zh", "中文"],
];

// Languages where article links open auto-translated but the UI stays in
// English (Google Translate supports 100+ target languages)
const EXTRA_LANGS = [
  ["ru", "Русский"], ["uk", "Українська"], ["it", "Italiano"], ["nl", "Nederlands"],
  ["pl", "Polski"], ["tr", "Türkçe"], ["el", "Ελληνικά"], ["ro", "Română"],
  ["hu", "Magyar"], ["cs", "Čeština"], ["sk", "Slovenčina"], ["bg", "Български"],
  ["sr", "Српски"], ["hr", "Hrvatski"], ["sv", "Svenska"], ["da", "Dansk"],
  ["no", "Norsk"], ["fi", "Suomi"], ["fa", "فارسی"], ["ur", "اردو"],
  ["he", "עברית"], ["ps", "پښتو"], ["hi", "हिन्दी"], ["bn", "বাংলা"],
  ["ta", "தமிழ்"], ["ne", "नेपाली"], ["si", "සිංහල"], ["my", "မြန်မာ"],
  ["th", "ไทย"], ["vi", "Tiếng Việt"], ["id", "Bahasa Indonesia"], ["ms", "Bahasa Melayu"],
  ["tl", "Filipino"], ["sw", "Kiswahili"], ["am", "አማርኛ"], ["ha", "Hausa"],
  ["yo", "Yorùbá"], ["zu", "isiZulu"], ["so", "Soomaali"], ["az", "Azərbaycan"],
  ["ka", "ქართული"], ["hy", "Հայերեն"], ["kk", "Қазақша"], ["uz", "Oʻzbekcha"],
];

const RTL_LANGS = new Set(["ar", "fa", "ur", "he", "ps"]);
const GT_LANG = { zh: "zh-CN" }; // Google Translate code overrides

// Article links open through Google Translate for non-English readers
function articleUrl(link) {
  if (lang === "en") return link;
  return `https://translate.google.com/translate?sl=auto&tl=${GT_LANG[lang] || lang}&u=${encodeURIComponent(link)}`;
}

const map = L.map("map", {
  worldCopyJump: true,
  minZoom: 2,
  maxBounds: [[-75, -200], [85, 200]],
}).setView([22, 15], 2);

// Esri dark canvas (no API key required); labels come from its reference layer
L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ", maxZoom: 16 }
).addTo(map);
L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 16 }
).addTo(map);

// Nearby pins collapse into a neutral cluster bubble at world zoom and split
// apart once zoomed in past level 5.
const clusterGroup = L.markerClusterGroup({
  maxClusterRadius: 32,
  disableClusteringAtZoom: 5,
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: false,
  iconCreateFunction: (cluster) => {
    const n = cluster.getChildCount();
    return L.divIcon({
      className: "",
      html: `<div class="cluster-bubble">${n}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  },
});
map.addLayer(clusterGroup);

function focusMarker(m) {
  // The pin's region is open (its sidebar row was clicked), but make sure the
  // marker is on the map before zooming to it
  if (!clusterGroup.hasLayer(m)) clusterGroup.addLayer(m);
  clusterGroup.zoomToShowLayer(m, () => m.openPopup());
}

// Phone layout: the sidebar is a slide-out drawer toggled from the header
const sidebarEl = document.getElementById("sidebar");
const menuToggle = document.getElementById("menu-toggle");
const isMobile = () => window.matchMedia("(max-width: 760px)").matches;

menuToggle.addEventListener("click", () => {
  const open = sidebarEl.classList.toggle("open");
  menuToggle.classList.toggle("on", open);
});

function closeSidebarOnMobile() {
  if (isMobile()) {
    sidebarEl.classList.remove("open");
    menuToggle.classList.remove("on");
  }
}

map.on("click", closeSidebarOnMobile);

const markers = new Map(); // conflict id -> Leaflet marker
const suggestionMarkers = new Map(); // country name -> Leaflet marker
const conflictRegions = new Map(); // conflict id -> region name
const openRegions = new Set(); // region names the user has expanded
let defaultRegionSeeded = false; // most active region opens once, on first render

// Pins only appear on the map while their region is expanded in the sidebar
// ("__suggested" gates the auto-detected unrest pins).
function syncPinVisibility() {
  for (const [id, m] of markers) {
    const show = openRegions.has(conflictRegions.get(id));
    if (show && !clusterGroup.hasLayer(m)) clusterGroup.addLayer(m);
    else if (!show && clusterGroup.hasLayer(m)) clusterGroup.removeLayer(m);
  }
  const showSuggested = openRegions.has("__suggested");
  for (const [, m] of suggestionMarkers) {
    if (showSuggested && !clusterGroup.hasLayer(m)) clusterGroup.addLayer(m);
    else if (!showSuggested && clusterGroup.hasLayer(m)) clusterGroup.removeLayer(m);
  }
}

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t("justNow");
  const span =
    mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;
  return t("agoTpl", { t: span });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function popupHtml(c) {
  const statusBadge =
    c.status === "potential"
      ? `<span class="badge potential-badge">${escapeHtml(t("potentialFlashpoint"))}</span>`
      : c.status === "unrest"
        ? `<span class="badge unrest-badge">${escapeHtml(t("civilUnrest"))}</span>`
        : `<span class="badge active-badge">${escapeHtml(t("activeConflict"))}</span>`;
  const badge = c.verified
    ? `<span class="badge verified-badge">${escapeHtml(t("corroborated"))}</span>`
    : `<span class="badge quiet-badge">${escapeHtml(t("lowActivity"))}</span>`;
  const assessment = c.assessment
    ? `<div class="popup-sources">${escapeHtml(t("risk"))} <a href="${escapeHtml(c.assessment.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.assessment.label)}</a></div>`
    : "";
  const liveLinks = (c.live || []).length
    ? `<div class="popup-live">
        <span class="live-dot"></span>${escapeHtml(t("liveCoverage"))}
        ${c.live
          .map(
            (l) => `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`
          )
          .join(" · ")}
      </div>`
    : "";

  const links = c.articles.length
    ? `<details class="popup-links" open>
        <summary>${escapeHtml(t("latestReports"))} (${c.articles.length}) ▾</summary>
        ${lang !== "en" ? `<div class="meta translate-note">${escapeHtml(t("translateNote"))}</div>` : ""}
        <ul>
          ${c.articles
            .map(
              (a) => `<li>
                <a href="${escapeHtml(articleUrl(a.link))}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.title)}</a>
                <div class="meta">${escapeHtml(a.source)} · ${timeAgo(a.publishedAt)}</div>
              </li>`
            )
            .join("")}
        </ul>
      </details>`
    : `<div class="empty-note">${escapeHtml(t("noReports"))}</div>`;

  const entities = (c.entities || []).length
    ? `<details class="popup-links popup-entities">
        <summary>${escapeHtml(t("linkedEntities"))} (${c.entities.length}) ▾</summary>
        <ul>
          ${c.entities
            .map(
              (e) => `<li>
                <div class="entity-name">
                  ${
                    e.website
                      ? `<a href="${escapeHtml(e.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(e.name)} ↗</a>`
                      : escapeHtml(e.name)
                  }
                  ${e.connection ? `<span class="badge connection-tag">${escapeHtml(tTag(e.connection))}</span>` : ""}
                </div>
                <div class="entity-role">${escapeHtml(e.role)}</div>
                <div class="meta"><a href="${escapeHtml(e.source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("sourceLabel"))} ${escapeHtml(e.source.label)}</a></div>
              </li>`
            )
            .join("")}
        </ul>
        <div class="entity-disclaimer">${escapeHtml(t("entityDisclaimer"))}</div>
      </details>`
    : "";

  return `
    <div class="popup-title">${escapeHtml(c.name)}</div>
    <div class="popup-badges">${statusBadge} ${badge}</div>
    <div class="popup-sub">${escapeHtml(c.country)}</div>
    <div class="popup-sources">${
      c.recentSources.length
        ? `${escapeHtml(t("reportingSources"))} ${c.recentSources.map(escapeHtml).join(", ")}`
        : escapeHtml(t("noActivity"))
    }</div>
    ${assessment}
    ${liveLinks}
    ${links}
    ${entities}
  `;
}

function markerIcon(c) {
  // Small colour-coded dots: darker red = active conflict, orange = potential
  // flashpoint. Report counts live in the hover tooltip, not on the map.
  const size = c.recentCount ? 15 : 11;
  return L.divIcon({
    className: "",
    html: `<div class="conflict-marker ${c.status} ${c.recentCount === 0 ? "quiet" : ""}"
             style="width:${size}px;height:${size}px"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function render(data) {
  document.getElementById("last-updated").textContent = data.updatedAt
    ? t("updatedTpl", { t: timeAgo(data.updatedAt) })
    : t("waiting");
  document.getElementById("source-status").textContent = data.sourcesOk.length
    ? t("sourcesLive", { n: data.sourcesOk.length })
    : "";

  // Sidebar: conflicts grouped into collapsible region dropdowns,
  // regions and conflicts both ordered by recent activity
  const byRegion = new Map();
  for (const c of data.conflicts) {
    if (!byRegion.has(c.region)) byRegion.set(c.region, []);
    byRegion.get(c.region).push(c);
  }
  const regions = [...byRegion.entries()]
    .map(([name, conflicts]) => ({
      name,
      conflicts: conflicts.sort((a, b) => b.recentCount - a.recentCount),
      total: conflicts.reduce((s, c) => s + c.recentCount, 0),
    }))
    .sort((a, b) => b.total - a.total);

  if (!defaultRegionSeeded && regions.length) {
    openRegions.add(regions[0].name);
    defaultRegionSeeded = true;
  }

  const list = document.getElementById("conflict-list");
  list.innerHTML = "";
  regions.forEach((region) => {
    const details = document.createElement("details");
    details.className = "region-group";
    // Keep whatever the user opened/closed across re-renders
    details.open = openRegions.has(region.name);

    const summary = document.createElement("summary");
    summary.innerHTML = `
      <span class="region-name">${escapeHtml(tRegion(region.name))}</span>
      <span class="region-meta">
        <span class="badge ${region.total ? "count-badge" : "quiet-badge"}">
          ${region.total ? `${region.total} ${escapeHtml(t("reports"))}` : escapeHtml(t("quiet"))}
        </span>
        <span class="chevron">▾</span>
      </span>`;
    details.appendChild(summary);

    details.addEventListener("toggle", () => {
      if (details.open) openRegions.add(region.name);
      else openRegions.delete(region.name);
      syncPinVisibility();
    });

    const ul = document.createElement("ul");
    for (const c of region.conflicts) {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="conflict-row">
          <div>
            <div class="conflict-name"><span class="status-dot ${c.status}"></span>${escapeHtml(c.name)}</div>
            <div class="conflict-country">${escapeHtml(c.country)}</div>
          </div>
          <span class="badge ${c.recentCount ? "count-badge" : "quiet-badge"}">
            ${c.recentCount || "—"}
          </span>
        </div>`;
      li.addEventListener("click", () => {
        closeSidebarOnMobile();
        const m = markers.get(c.id);
        if (m) focusMarker(m);
      });
      ul.appendChild(li);
    }
    details.appendChild(ul);
    list.appendChild(details);
  });

  renderSuggestions(data.suggestions || [], list);
  syncPinVisibility();

  // Map markers
  for (const c of data.conflicts) {
    conflictRegions.set(c.id, c.region);
    let m = markers.get(c.id);
    if (!m) {
      m = L.marker([c.lat, c.lng], { icon: markerIcon(c) });
      markers.set(c.id, m); // added to the map by syncPinVisibility
    } else {
      m.setIcon(markerIcon(c));
    }
    m.bindPopup(popupHtml(c), { maxWidth: 360 });
    m.bindTooltip(
      `${c.name} — ${c.recentCount} report${c.recentCount === 1 ? "" : "s"} (48h)`,
      { direction: "top", offset: [0, -8] }
    );
  }
}

function suggestionPopupHtml(s) {
  const badge = s.corroborated
    ? `<span class="badge corr-badge">${escapeHtml(t("corrSourcesN", { n: s.sources.length }))}</span>`
    : `<span class="badge single-badge">${escapeHtml(t("unconfirmedSingle"))}</span>`;
  return `
    <div class="popup-title">${escapeHtml(s.country)}</div>
    <div class="popup-badges"><span class="badge suggested-badge">${escapeHtml(t("autoUnrest"))}</span> ${badge}</div>
    <div class="popup-sources">${escapeHtml(t("unrestFromS", { s: s.sources.join(", ") }))}</div>
    <div class="popup-sources">${escapeHtml(s.corroborated ? t("autoCorrNote") : t("autoSingleNote"))}</div>
    <details class="popup-links" open>
      <summary>${escapeHtml(t("latestReports"))} (${s.articles.length}) ▾</summary>
      ${lang !== "en" ? `<div class="meta translate-note">${escapeHtml(t("translateNote"))}</div>` : ""}
      <ul>
        ${s.articles
          .map(
            (a) => `<li>
              <a href="${escapeHtml(articleUrl(a.link))}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.title)}</a>
              <div class="meta">${escapeHtml(a.source)} · ${timeAgo(a.publishedAt)}</div>
            </li>`
          )
          .join("")}
      </ul>
    </details>`;
}

function renderSuggestions(suggestions, listEl) {
  // Map markers (dashed yellow = suggested, not curated)
  const seen = new Set();
  for (const s of suggestions) {
    seen.add(s.country);
    const tier = s.corroborated ? "corr" : "single";
    const icon = L.divIcon({
      className: "",
      html: `<div class="conflict-marker suggested ${tier}" style="width:13px;height:13px"></div>`,
      iconSize: [13, 13],
      iconAnchor: [6.5, 6.5],
    });
    let m = suggestionMarkers.get(s.country);
    if (!m) {
      m = L.marker([s.lat, s.lng], { icon });
      suggestionMarkers.set(s.country, m); // added to the map by syncPinVisibility
    } else {
      m.setIcon(icon); // re-tint when a single-source report gets corroborated
    }
    m.bindPopup(suggestionPopupHtml(s), { maxWidth: 360 });
    m.bindTooltip(
      `${s.country} — auto-detected unrest, ${s.corroborated ? `corroborated (${s.sources.length} sources)` : "unconfirmed (1 source)"}`,
      { direction: "top", offset: [0, -8] }
    );
  }
  for (const [country, m] of suggestionMarkers) {
    if (!seen.has(country)) {
      clusterGroup.removeLayer(m);
      suggestionMarkers.delete(country);
    }
  }

  // Sidebar section
  if (!suggestions.length) return;
  const details = document.createElement("details");
  details.className = "region-group suggested-group";
  details.open = openRegions.has("__suggested");
  details.addEventListener("toggle", () => {
    if (details.open) openRegions.add("__suggested");
    else openRegions.delete("__suggested");
    syncPinVisibility();
  });

  const summary = document.createElement("summary");
  summary.innerHTML = `
    <span class="region-name">${escapeHtml(t("autoUnrest"))}</span>
    <span class="region-meta">
      <span class="badge unrest-badge">${escapeHtml(t("suggestedN", { n: suggestions.length }))}</span>
      <span class="chevron">▾</span>
    </span>`;
  details.appendChild(summary);

  const ul = document.createElement("ul");
  for (const s of suggestions) {
    const li = document.createElement("li");
    const tier = s.corroborated ? "corr" : "single";
    li.innerHTML = `
      <div class="conflict-row">
        <div>
          <div class="conflict-name"><span class="status-dot suggested ${tier}"></span>${escapeHtml(s.country)}</div>
          <div class="conflict-country">${
            escapeHtml(s.corroborated ? t("corrRowN", { n: s.sources.length }) : t("unconfirmedRow"))
          }</div>
        </div>
        <span class="badge ${s.corroborated ? "corr-badge" : "single-badge"}">${s.recentCount}</span>
      </div>`;
    li.addEventListener("click", () => {
      closeSidebarOnMobile();
      const m = suggestionMarkers.get(s.country);
      if (m) focusMarker(m);
    });
    ul.appendChild(li);
  }
  details.appendChild(ul);
  listEl.appendChild(details);
}

async function load() {
  try {
    const res = await fetch("/api/data");
    const data = await res.json();
    if (data.updatedAt) {
      lastData = data;
      render(data);
    } else {
      // Server hasn't finished its first feed fetch yet — retry shortly
      setTimeout(load, 3000);
    }
  } catch (e) {
    document.getElementById("last-updated").textContent = t("connError");
    setTimeout(load, 5000);
  }
}

load();
setInterval(load, POLL_MS);

// ---------------------------------------------------------------------------
// Live TV: embedded 24/7 news streams from credible broadcasters
// ---------------------------------------------------------------------------

const STREAMS = [
  { name: "Al Jazeera English", channel: "UCNye-wNBqNL5ZzHSJj3l8Bg", watch: "https://www.youtube.com/@aljazeeraenglish/live" },
  { name: "DW News", channel: "UCknLrEdhRCp1aegoMqRaCZg", watch: "https://www.youtube.com/@dwnews/live" },
  { name: "France 24 English", channel: "UCQfwfsi5VrQ8yKZ-UWmAEFg", watch: "https://www.youtube.com/@FRANCE24English/live" },
  { name: "Sky News", channel: "UCoMdktPbSTixAyNGwb-UYkQ", watch: "https://www.youtube.com/@SkyNews/live" },
];

const liveToggle = document.getElementById("live-tv-toggle");
const livePanel = document.getElementById("live-tv-panel");
const liveFrame = document.getElementById("live-tv-frame");
const liveTabs = document.getElementById("live-tv-tabs");
const liveWatch = document.getElementById("live-tv-watch");

function selectStream(i) {
  const s = STREAMS[i];
  liveFrame.src = `https://www.youtube.com/embed/live_stream?channel=${s.channel}&autoplay=1&mute=1`;
  liveWatch.href = s.watch;
  [...liveTabs.children].forEach((b, j) => b.classList.toggle("on", i === j));
}

STREAMS.forEach((s, i) => {
  const btn = document.createElement("button");
  btn.textContent = s.name;
  btn.addEventListener("click", () => selectStream(i));
  liveTabs.appendChild(btn);
});

liveToggle.addEventListener("click", () => {
  const open = livePanel.classList.toggle("open");
  liveToggle.classList.toggle("on", open);
  if (open && !liveFrame.src) selectStream(0);
  if (!open) liveFrame.src = ""; // stop playback when closed
});

document.getElementById("live-tv-close").addEventListener("click", () => {
  livePanel.classList.remove("open");
  liveToggle.classList.remove("on");
  liveFrame.src = "";
});

// ---------------------------------------------------------------------------
// Language dropdown
// ---------------------------------------------------------------------------

function applyStaticI18n() {
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
  document.querySelector(".brand .tagline").textContent = t("tagline");
  document.getElementById("sidebar-title").textContent = t("byRegion");
  document.getElementById("sidebar-hint").textContent = t("hint");
  liveToggle.textContent = "▶ " + t("liveTV");
  document.querySelector("#live-tv-panel .live-tv-head span").innerHTML =
    `<span class="live-dot"></span>${escapeHtml(t("liveStreams"))}`;
  document.getElementById("legend-main").innerHTML =
    `<span class="status-dot active"></span> ${escapeHtml(t("activeConflict"))}
     <span class="status-dot potential"></span> ${escapeHtml(t("potentialFlashpoint"))}
     <span class="status-dot unrest"></span> ${escapeHtml(t("civilUnrest"))}`;
  document.getElementById("legend-detect").innerHTML =
    `<span class="status-dot suggested single"></span> ${escapeHtml(t("detected1"))}
     <span class="status-dot suggested corr"></span> ${escapeHtml(t("detectedCorr"))}`;
  document.getElementById("corr-explain").innerHTML =
    `<span class="badge verified-badge">${escapeHtml(t("corroborated"))}</span> ${escapeHtml(t("corrExplain"))}`;
  document.getElementById("about-summary").textContent = t("about");
  document.getElementById("lang-caveat").textContent = t("langCaveat");
}

const langSelect = document.getElementById("lang-select");
{
  const gFull = document.createElement("optgroup");
  gFull.label = "Full translation";
  for (const [code, name] of FULL_LANGS) {
    gFull.appendChild(new Option(name, code));
  }
  const gExtra = document.createElement("optgroup");
  gExtra.label = "Articles translated (UI in English)";
  for (const [code, name] of EXTRA_LANGS) {
    gExtra.appendChild(new Option(name, code));
  }
  langSelect.appendChild(gFull);
  langSelect.appendChild(gExtra);
}
if (![...FULL_LANGS, ...EXTRA_LANGS].some(([c]) => c === lang)) lang = "en";
langSelect.value = lang;
langSelect.addEventListener("change", () => {
  lang = langSelect.value;
  localStorage.setItem("cw-lang", lang);
  applyStaticI18n();
  if (lastData) render(lastData);
});
applyStaticI18n();
