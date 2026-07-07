// ============================================
// 피부 타입 계산 로직 (확정된 판정 순서)
//   1순위. Q3 = 수부지 응답 → 속건조 수부지형
//   2순위. Q2+Q3 유분 점수 → 건조/번들/혼합
//   3순위. Q4 민감 +2 → 예민 트러블형 전환 / +1 → 유지 + 민감 안내
//   4순위. 전부 중립 + 민감 없음 → 순한 피부형
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
  let typeId;
  if (subjiFlag) {
    typeId = "subji";
  } else if (dry === 0 && oily === 0 && combo === 0) {
    typeId = "neutral";
  } else if (dry > 0 && oily > 0) {
    typeId = "combo"; // 건조·유분 신호 공존 → 복합
  } else if (combo >= dry && combo >= oily) {
    typeId = "combo";
  } else if (dry > oily) {
    typeId = "dry";
  } else {
    typeId = "oily";
  }

  // 3순위: 민감 보정
  let sensitiveNote = false;
  if (answers.q4 === "sens2") {
    typeId = "sensitive"; // 민감 강함 → 타입 전환
  } else if (answers.q4 === "sens1") {
    sensitiveNote = true; // 타입 유지 + 안내 배너
  }

  return { typeId, sensitiveNote };
}
