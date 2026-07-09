// ============================================
// 피부 타입 계산 로직 (확정된 판정 순서)
//   1순위. Q3 = 수부지 응답 → 속건조 수부지형
//   2순위. Q2+Q3 유분 점수 → 건조/번들/혼합
//   3순위. Q4 민감 +2 → 예민 트러블형 전환 / +1 → 유지 + 민감 안내
//   4순위. 전부 중립 + 민감 없음 → 순한 피부형
// ※ baseType: 민감보정으로 typeId가 "sensitive"로 바뀌기 "전"의 원래 유분 판정
//    (Q5 선택지 필터링처럼, 민감도와 무관하게 "원래 피부 성질"이 필요한 곳에 사용)
// ============================================
function calculateSkinType(answers) {
  let dry = 0, oily = 0, combo = 0;
  const subjiFlag = answers.q3 === "subji";

  // Q2 점수
  switch (answers.q2) {
    case "dry2": dry += 2; break;
    case "combo2": combo += 2; break;
    case "oily2": oily += 2; break;
  }
  // Q3 점수
  switch (answers.q3) {
    case "oily2": oily += 2; break;
    case "oily1": oily += 1; combo += 1; break;
    case "dry2": dry += 2; break;
  }

  // 1~2순위: 기본 타입
  let baseType;
  if (subjiFlag) {
    baseType = "subji";
  } else if (dry === 0 && oily === 0 && combo === 0) {
    baseType = "neutral";
  } else if (dry > 0 && oily > 0) {
    baseType = "combo"; // 건조·유분 신호 공존 → 복합
  } else if (combo >= dry && combo >= oily) {
    baseType = "combo";
  } else if (dry > oily) {
    baseType = "dry";
  } else {
    baseType = "oily";
  }

  // 3순위: 민감 보정 (typeId는 바뀔 수 있지만 baseType은 원래 값 그대로 보존)
  let typeId = baseType;
  let sensitiveNote = false;
  if (answers.q4 === "sens2") {
    typeId = "sensitive"; // 민감 강함 → 타입 전환 (baseType은 유지)
  } else if (answers.q4 === "sens1") {
    sensitiveNote = true; // 타입 유지 + 안내 배너
  }

  return { typeId, sensitiveNote, baseType };
}
