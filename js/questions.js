// ============================================
// 질문 데이터 (Q8 제거 - 제품군은 고민 기반으로 자동 추천)
// ============================================
const QUESTIONS = [
  {
    id: "q1",
    text: "반갑습니다! 오늘도 올리브영입니다~ 고객님! 맞춤 추천을 위해 먼저 여쭤볼게요 😊",
    hint: "",
    multi: false,
    options: [
      { label: "여성이에요", value: "female" },
      { label: "남성이에요", value: "male" },
    ],
  },
  {
    id: "q2",
    text: "세수하고 아무것도 안 발랐을 때 피부가 어떠세요?",
    hint: "",
    multi: false,
    options: [
      { label: "얼굴 전체가 심하게 당겨요", value: "dry2" },
      { label: "볼은 당기는데 T존은 괜찮아요", value: "combo2" },
      { label: "딱히 당기지도 번들거리지도 않아요", value: "neutral" },
      { label: "금방 번들거리기 시작해요", value: "oily2" },
    ],
  },
  {
    id: "q3",
    text: "하루 보내다 보면 얼굴이 번들거린다고 느끼실 때 있으세요?",
    hint: "",
    multi: false,
    options: [
      { label: "거울 볼 때마다 번들거려요", value: "oily2" },
      { label: "가끔 이마나 코만 번들거려요", value: "oily1" },
      { label: "번들거리는데 속은 당기는 느낌이에요", value: "subji" },
      { label: "번들거림은 거의 없어요", value: "neutral" },
      { label: "번들거림보다 푸석함·각질이 먼저 느껴져요", value: "dry2" },
    ],
  },
  {
    id: "q4",
    text: "피부가 자극에 예민하게 반응한 적 있으세요? (따가움, 붉어짐, 트러블 같은 것들이요)",
    hint: "",
    multi: false,
    options: [
      { label: "자주 있어요 — 새 화장품, 날씨 변화, 마스크에도 예민해져요", value: "sens2" },
      { label: "가끔 있어요 — 컨디션 나쁠 때나 특정 제품에서만요", value: "sens1" },
      { label: "거의 없어요 — 웬만한 화장품은 다 잘 맞아요", value: "sens0" },
    ],
  },
  {
    id: "q5",
    text: "요즘 겪고 있는 여름 피부 고민을 모두 골라주세요",
    hint: "복수 선택 가능해요",
    multi: true,
    options: [
      { label: "트러블·여드름", value: "trouble" },
      { label: "과도한 번들거림", value: "sebum" },
      { label: "모공", value: "pore" },
      { label: "푸석함·각질", value: "flaky" },
    ],
  },
  {
    id: "q6",
    text: "그중 가장 급한 고민은 무엇인가요?",
    hint: "나머지 고민도 결과에 함께 담아드릴게요",
    multi: false,
    dynamic: "fromQ5",
    options: [],
  },
  {
    id: "q7",
    text: "마지막 질문이에요. 기초템 하나에 어느 정도까지 생각하세요?",
    hint: "",
    multi: false,
    dynamic: "budgetPlusAllinone",
    baseOptions: [
      { label: "1~3만원대", value: "budget_mid" },
      { label: "3만원 이상", value: "budget_high" },
    ],
    maleOnlyOption: { label: "올인원으로 추천해주세요 (간편하게 하나로 끝)", value: "allinone_only" },
  },
];

// 고민 값 → 표시용 라벨
const CONCERN_LABELS = {
  trouble: "트러블·여드름",
  sebum: "과도한 번들거림",
  innerdry: "속건조",
  pore: "모공",
  uv: "자외선·색소침착",
  flaky: "푸석함·각질",
};

// 제품군 값 → 표시 라벨
const CATEGORY_LABELS = {
  toner: "토너",
  serum: "세럼",
  ampoule: "앰플",
  cream: "크림",
  suncream: "선크림",
  allinone: "올인원",
};
const CATEGORY_ORDER = ["toner", "serum", "allinone", "ampoule", "cream", "suncream"];

// 항상 포함되는 기본 루틴 (세안 후 정돈 + 마무리 보습 + 자외선차단)
const BASE_CATEGORIES = ["toner", "serum", "ampoule", "cream", "suncream"];

// 강도 조절이 필요한 4개 고민: 1순위면 앰플(집중), 부수 고민이면 세럼(꾸준 관리)
const INTENSITY_CONCERNS = ["trouble", "pore"];

// 4개 고민이 1순위일 때: "피부 특징" 칸에 타입별 관리법 설명 (제품 구성은 항상 5종 고정)
const TROUBLE_CARE_TIPS = {
  dry: "건성인데 트러블이 나면 피부 장벽이 약해져 있는 경우가 많아요. 보습·진정을 챙기면서 아래 스팟케어 제품으로 트러블 부위만 집중 케어해보세요.",
  oily: "지성 피부는 과다 피지가 트러블의 주 원인이에요. 트러블이 난 부위엔 아래 스팟케어 제품을 콕 찍어 발라주시고, 세안을 놓치지 않는 게 중요해요.",
  combo: "복합성은 T존 위주로 트러블이 나기 쉬워요. 전체가 아니라 트러블 난 부위 위주로 아래 스팟케어 제품을 발라 국소적으로 케어해보세요.",
  subji: "수부지는 속건조로 인한 피지 과다 분비가 트러블로 이어지기 쉬워요. 속수분을 채우면서 아래 스팟케어 제품으로 트러블 부위를 진정시켜주세요.",
  sensitive: "민감성 피부의 트러블은 자극에 대한 반응인 경우가 많아요. 새 제품을 한꺼번에 바꾸지 말고, 아래 앰플처럼 진정 성분 위주로 최소한만 발라주세요.",
  neutral: "평소엔 트러블이 적은 편인데 요즘 났다면 컨디션 저하나 자극 때문인 경우가 많아요. 아래 스팟케어 제품으로 해당 부위만 가볍게 케어하고 며칠 지켜봐주세요.",
};
const PORE_CARE_TIPS = {
  dry: "건성 피부의 모공은 탄력 저하로 늘어져 보이는 경우가 많아요. 보습과 함께 아래 추천 앰플로 꾸준히 탄력 케어를 해주시면 도움이 돼요.",
  oily: "지성 피부의 모공은 과다 피지로 넓어지기 쉬워요. 아래 앰플로 피지·모공 케어를 함께 하시고 이중세안을 놓치지 마세요.",
  combo: "복합성은 T존 모공이 특히 신경 쓰이실 텐데, 아래 앰플을 T존 위주로 발라주시면 효과적이에요.",
  subji: "수부지는 속건조로 인한 유분 과다가 모공 확장으로 이어질 수 있어요. 속수분을 채우면서 아래 앰플로 모공을 함께 관리해주세요.",
  sensitive: "민감성 피부는 자극이 모공을 더 도드라져 보이게 할 수 있어요. 아래 앰플처럼 순한 성분으로 자극 없이 꾸준히 관리하는 게 중요해요.",
  neutral: "지금 좋은 밸런스를 유지하면서 아래 앰플로 모공 관리까지 더하면 앞으로도 좋은 피부를 유지하실 수 있어요.",
};
const SEBUM_CARE_TIPS = {
  dry: "건성인데도 번들거림이 고민이시라면, 보통 T존 등 특정 부위에만 유분이 몰리는 경우가 많아요. 전체적으로는 보습을 유지하면서 번들거리는 부위만 가볍게 눌러 정리해주세요. 피지 조절 제품을 얼굴 전체에 쓰면 오히려 건조한 부위가 더 당길 수 있어요.",
  oily: "지성 피부의 번들거림은 과도한 피지 분비가 원인이에요. 하루 2번 세안은 지키되 과도한 세안은 피하고, 가벼운 수분 제품으로 피지·수분 밸런스를 맞춰주는 게 핵심이에요.",
  combo: "복합성은 T존만 유독 번들거리는 경우가 많아요. T존은 가볍게, 볼은 조금 더 촉촉하게 — 부위별로 다르게 관리해주시면 훨씬 효과적이에요.",
  subji: "수부지는 겉은 번들거려도 속은 건조한 상태라, 유분만 잡으려 하면 오히려 피지가 더 늘어나는 악순환이 생겨요. 산뜻한 제형으로 속수분부터 채워주는 게 먼저예요.",
  sensitive: "민감성 피부의 번들거림은 자극으로 인한 과다 피지 분비인 경우가 많아요. 피지 조절보다 진정 성분 위주로 자극을 줄이면 유분도 자연스럽게 안정돼요.",
  neutral: "평소엔 번들거림이 적은 편인데 요즘 유독 그렇다면 냉방·자외선 같은 외부 요인 때문인 경우가 많아요. 가벼운 제형으로 바꿔보시고 컨디션 변화를 좀 더 지켜봐주세요.",
};
const FLAKY_CARE_TIPS = {
  dry: "건성 피부의 각질·푸석함은 수분 부족이 근본 원인이에요. 각질 제거보다 보습을 충분히 채워주면 자연스럽게 결이 부드러워져요. 스크럽 등 물리적 각질 제거는 피하는 게 좋아요.",
  oily: "지성인데 각질이 있다면 피지와 각질이 뒤엉켜 모공을 막을 수 있어요. PHA처럼 순한 각질케어 성분을 주 1~2회 정도로 가볍게 시작해보세요.",
  combo: "복합성은 건조한 볼 쪽에 각질이 몰리는 경우가 많아요. 얼굴 전체 각질 제거보다 건조한 부위만 부분적으로 보습을 강화해주세요.",
  subji: "수부지의 각질은 속건조가 원인인 경우가 많아요. 각질을 벗겨내기보다 속수분을 채우는 게 먼저예요.",
  sensitive: "민감성 피부의 각질은 장벽 손상 신호인 경우가 많아요. 각질제거 성분은 피하고 진정·보습 위주로 장벽부터 회복시켜주세요.",
  neutral: "에어컨·자외선 같은 계절 요인으로 일시적 각질이 생긴 경우가 많아요. 평소보다 보습을 한 단계만 더해주시면 금방 회복돼요.",
};

// 제품군이 커버하는 고민 목록 (결과지에서 "이 제품이 어떤 고민에 도움되는지" 표시용)
const CATEGORY_CONCERN_MAP = {
  toner: ["innerdry", "sebum", "flaky"],
  serum: ["innerdry", "flaky", "uv", "trouble", "pore"],
  ampoule: ["trouble", "pore", "innerdry", "uv", "flaky"],
  cream: ["flaky", "innerdry"],
  suncream: ["uv"],
  allinone: [],
};

// 기본 5종(토너·세럼·앰플·크림·선크림)은 고민과 무관하게 항상 고정 추천
// 고민(concerns/primary)은 이제 제품 구성이 아니라 "피부 특징" 칸의 관리법 설명에 반영됨
function buildRecommendedCategories(concerns, primary) {
  return CATEGORY_ORDER.filter((c) => BASE_CATEGORIES.includes(c));
}
