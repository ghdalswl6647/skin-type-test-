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
    text: "고객님, 세수하고 아무것도 안 발랐을 때 피부가 어떠세요?",
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
    text: "고객님 피부, 자극에 예민하게 반응한 적 있으세요? (따가움·붉어짐·가려움 같은 거요!)",
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
    text: "요즘 여름 피부 고민, 있는 대로 다 골라주세요! 하나도 빠짐없이 챙겨드릴게요!",
    hint: "복수 선택 가능해요",
    multi: true,
    options: [
      { label: "트러블·여드름", value: "trouble" },
      { label: "과도한 번들거림", value: "sebum" },
      { label: "겉은 번들, 속은 당김 (속건조)", value: "innerdry" },
      { label: "모공", value: "pore" },
      { label: "자외선·색소침착", value: "uv" },
      { label: "푸석함·각질", value: "flaky" },
    ],
  },
  {
    id: "q6",
    text: "고객님, 그중에 제일 급한 고민부터 잡아드릴게요! 뭐가 제일 시급하세요?",
    hint: "걱정 마세요, 나머지 고민도 결과에 싹 담아드립니다",
    multi: false,
    dynamic: "fromQ5",
    options: [],
  },
  {
    id: "q7",
    text: "마지막이에요! 기초템 하나에 어느 정도까지 생각하세요?",
    hint: "",
    multi: false,
    dynamic: "budgetPlusAllinone",
    baseOptions: [
      { label: "1~3만원대 (실속 있게)", value: "budget_mid" },
      { label: "3만원 이상 (피부에 아낌없이)", value: "budget_high" },
      { label: "상관없어요 (좋은 걸로 추천해주세요)", value: "budget_any" },
    ],
    maleOnlyOption: { label: "올인원으로 추천해주세요 (간편하게 하나로 끝!)", value: "allinone_only" },
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
const CATEGORY_ORDER = ["toner", "serum", "ampoule", "cream", "allinone", "suncream"];

// 항상 포함되는 기본 루틴 (세안 후 정돈 + 마무리 보습 + 자외선차단)
const BASE_CATEGORIES = ["toner", "cream", "suncream"];

// 고민별 가장 효과적인 제품군 (사용자가 직접 고르지 않고 알고리즘이 자동 판단)
const CONCERN_TO_BEST_CATEGORY = {
  trouble: "ampoule",   // 트러블엔 고농축 진정 앰플이 가장 직접적
  sebum: "toner",       // 번들거림은 피지 밸런싱 토너로 기본 관리 (이미 기본 포함)
  innerdry: "serum",    // 속건조는 세럼으로 속수분 집중 보충
  pore: "serum",        // 모공은 타겟 세럼(나이아신아마이드 등)이 효과적
  uv: "suncream",       // 자외선은 선크림이 필수 (이미 기본 포함)
  flaky: "cream",       // 푸석함·각질은 크림 보습이 핵심 (이미 기본 포함)
};

// 제품군이 커버하는 고민 목록 (결과지에서 "이 제품이 어떤 고민에 도움되는지" 표시용)
const CATEGORY_CONCERN_MAP = {
  toner: ["innerdry", "sebum", "flaky"],
  serum: ["innerdry", "flaky", "uv", "trouble", "pore"],
  ampoule: ["trouble", "pore", "innerdry"],
  cream: ["flaky", "innerdry"],
  suncream: ["uv"],
  allinone: [],
};

// 사용자가 고른 고민을 바탕으로 추천 제품군을 자동 구성
// (남성은 간편 올인원을 별도 보너스 팁으로 추가)
function buildRecommendedCategories(concerns) {
  const set = new Set(BASE_CATEGORIES);
  (concerns || []).forEach((c) => {
    const cat = CONCERN_TO_BEST_CATEGORY[c];
    if (cat) set.add(cat);
  });
  return CATEGORY_ORDER.filter((c) => set.has(c));
}
