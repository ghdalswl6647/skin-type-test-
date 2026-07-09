// ============================================
// 앱 컨트롤러 (매장 사진 고정 헤더 + 대화창이 그 아래로 자연스럽게 이어지는 구조)
// 오버레이 없음, 아바타 없음 — 콘텐츠 길이에 상관없이 항상 안전하게 표시됨
// step -1: 인트로, 0..6: 질문(7개), 7: 결과
// Q8(제품군 선택)은 제거 — 고민에 맞는 최적 제품군을 자동으로 구성
// ============================================
(function () {
  const el = {
    progress: document.getElementById("progress"),
    studTrack: document.getElementById("stud-track"),
    progressLabel: document.getElementById("progress-label"),
    panel: document.getElementById("panel-content"),
    btnPrev: document.getElementById("btn-prev"),
    btnNext: document.getElementById("btn-next"),
    toast: document.getElementById("toast"),
    gameCard: document.getElementById("game-card"),
  };

  const TOTAL_Q = QUESTIONS.length; // 7
  let step = -1;
  const answers = {};
  let lastResult = null;
  let forcedType = null;
  let forcedSensitive = null;

  // srcdoc 미리보기 등 일부 샌드박스 환경에서는 history API가 막혀있을 수 있어
  // 에러 없이 조용히 넘어가도록 감싸줌 (실제 배포 사이트에서는 정상 동작)
  function safeReplaceState(url) {
    try {
      history.replaceState(null, "", url);
    } catch (e) {
      /* 미리보기 샌드박스 등에서는 무시 */
    }
  }

  buildStuds();

  function buildStuds() {
    el.studTrack.innerHTML = "";
    QUESTIONS.forEach(() => {
      const s = document.createElement("span");
      s.className = "stud";
      el.studTrack.appendChild(s);
    });
  }
  function updateProgress() {
    if (step === -1) {
      [...el.studTrack.children].forEach((s) => s.classList.remove("filled", "current"));
      el.progressLabel.textContent = "진단을 시작해볼까요?";
      return;
    }
    if (step >= TOTAL_Q) {
      [...el.studTrack.children].forEach((s) => { s.classList.add("filled"); s.classList.remove("current"); });
      el.progressLabel.textContent = "진단 완료!";
      return;
    }
    [...el.studTrack.children].forEach((s, i) => {
      s.classList.toggle("filled", i < step);
      s.classList.toggle("current", i === step);
    });
    el.progressLabel.textContent = `${step + 1} / ${TOTAL_Q}`;
  }

  function hasAnswer(q) {
    const a = answers[q.id];
    return q.multi ? Array.isArray(a) && a.length > 0 : !!a;
  }

  // ---------- 인트로 ----------
  function renderIntro() {
    el.panel.innerHTML = `
      <p class="q-text">올영 알바하며 느꼈어요, 다들 뭘 사야 할지 모른다는 걸!</p>
      <h1 class="intro-title">내 여름 피부, <span class="hl">무슨 타입?</span></h1>
      <p class="intro-subtitle">고민만 고르면 기초템 알아서 척척!</p>
    `;
    el.btnPrev.disabled = true;
    el.btnNext.disabled = false;
    el.btnNext.textContent = "진단 시작하기 →";
  }

  // ---------- 질문 ----------
  function renderQuestion(idx) {
    const q = QUESTIONS[idx];
    let opts = q.options;
    if (q.id === "q5" && answers.q2 && answers.q3 && answers.q4) {
      // Q2~4가 이미 답변된 시점이면 예비 진단을 돌려서, 논리적으로 모순되는
      // 선택지(예: 건성인데 "번들거림")를 미리 숨긴다. (민감도 전환과 무관하게
      // baseType으로 판단 — 민감성으로 바뀌어도 원래 유분 성질은 유지되므로)
      const { baseType } = calculateSkinType(answers);
      if (baseType === "dry") {
        opts = opts.filter((o) => o.value !== "sebum");
      }
    }
    if (q.dynamic === "fromQ5") {
      const picked = answers.q5 || [];
      opts = picked.map((v) => ({ label: CONCERN_LABELS[v], value: v }));
      if (answers.q6 && !picked.includes(answers.q6)) delete answers.q6;
      if (picked.length === 1) answers.q6 = picked[0];
    } else if (q.dynamic === "budgetPlusAllinone") {
      opts = [...q.baseOptions];
      if (answers.q1 === "male") opts.push(q.maleOnlyOption);
    }

    el.panel.innerHTML = `
      <p class="q-text">${q.text}</p>
      <p class="q-hint">${q.hint || ""}</p>
      <div class="options" id="options-box"></div>
    `;
    const optionsBox = document.getElementById("options-box");
    opts.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.type = "button";
      btn.textContent = opt.label;
      const saved = answers[q.id];
      const isSelected = q.multi
        ? Array.isArray(saved) && saved.includes(opt.value)
        : saved === opt.value;
      if (isSelected) btn.classList.add("selected");
      btn.addEventListener("click", () => {
        if (q.multi) {
          const list = answers[q.id] || [];
          if (list.includes(opt.value)) {
            answers[q.id] = list.filter((v) => v !== opt.value);
            btn.classList.remove("selected");
          } else {
            answers[q.id] = [...list, opt.value];
            btn.classList.add("selected");
          }
        } else {
          answers[q.id] = opt.value;
          [...optionsBox.children].forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
        }
        el.btnNext.disabled = !hasAnswer(q);
      });
      optionsBox.appendChild(btn);
    });

    el.btnPrev.disabled = false;
    el.btnNext.disabled = !hasAnswer(q);
    el.btnNext.textContent = idx === TOTAL_Q - 1 ? "결과 보기" : "다음 →";
  }

  // ---------- 결과 ----------
  function renderResultPanel() {
    const canCalculate = answers.q2 && answers.q3 && answers.q4;
    const { typeId, sensitiveNote } =
      canCalculate || !forcedType
        ? calculateSkinType(answers)
        : { typeId: forcedType, sensitiveNote: forcedSensitive };

    const concerns = answers.q5 || [];
    const primary = answers.q6 || concerns[0];
    const wantsAllinoneOnly = answers.q7 === "allinone_only";
    const rawBudget = wantsAllinoneOnly ? "budget_mid" : (answers.q7 || "budget_mid");
    const budget = rawBudget === "budget_any" ? "budget_mid" : rawBudget;
    const gender = answers.q1;

    // 카테고리 자동 구성: 1순위 고민은 앰플로, 나머지 강도조절 대상 고민은 세럼으로 포함
    const categories = wantsAllinoneOnly
      ? ["allinone", "ampoule", "suncream"] // 올인원(기초) + 1순위 고민 앰플(부스터) + 선크림
      : buildRecommendedCategories(concerns, primary);
    lastResult = { typeId, sensitiveNote, concerns, primary, budget: rawBudget, categories };

    const r = RESULTS[typeId];

    const chipsHtml = concerns
      .map((v) => {
        const isPrimary = v === primary;
        const isProduct = INTENSITY_CONCERNS.includes(v);
        const howBadge = isProduct ? "제품 추천" : "관리법 안내";
        return `<span class="chip${isPrimary ? " primary" : ""}">${CONCERN_LABELS[v] || v}${isPrimary ? " (1순위)" : ""}<span class="chip-how">${howBadge}</span></span>`;
      })
      .join("");

    // 1순위 고민에 맞춰 "피부 특징" 칸에 타입별 관리법 추가 (제품 구성은 5종 고정)
    const CARE_TIP_SETS = { trouble: TROUBLE_CARE_TIPS, pore: PORE_CARE_TIPS, sebum: SEBUM_CARE_TIPS, flaky: FLAKY_CARE_TIPS };
    const tipSet = CARE_TIP_SETS[primary];
    const careTipText = tipSet ? tipSet[typeId] || tipSet.neutral : "";
    const careTipHtml = careTipText
      ? `<p class="care-tip-block">💡 <strong>${CONCERN_LABELS[primary]} 관리법</strong> — ${careTipText}</p>`
      : "";

    // 트러블·모공 1순위 전용 앰플 (피부타입별로 실제 지정된 제품)
    const DEDICATED_AMPOULE = { trouble: TROUBLE_AMPOULE, pore: PORE_AMPOULE };

    // 부수 고민(2·3순위)도 짧게라도 언급 — product형(트러블·모공)은 전용 제품을 한 줄로,
    // habit형(번들거림·각질)은 관리법 텍스트를 재사용
    const otherConcerns = concerns.filter((c) => c !== primary);
    const otherConcernsHtml = otherConcerns.length
      ? `<div class="other-concerns-block">
          <p class="other-concerns-title">📌 그 외에 고르신 고민도 챙겨드려요</p>
          ${otherConcerns
            .map((c) => {
              const isProductType = INTENSITY_CONCERNS.includes(c);
              const dedicated = isProductType && DEDICATED_AMPOULE[c] ? DEDICATED_AMPOULE[c][typeId] : null;
              const line = dedicated
                ? `${dedicated.name} (${dedicated.price}) — ${dedicated.why}`
                : (CARE_TIP_SETS[c] && (CARE_TIP_SETS[c][typeId] || CARE_TIP_SETS[c].neutral)) || "";
              return `<p class="other-concern-line">· <strong>${CONCERN_LABELS[c]}</strong> — ${line}</p>`;
            })
            .join("")}
        </div>`
      : "";

    // 1순위가 트러블·모공이면 앰플 자리를 전용 제품으로 완전히 교체 (타입 기본 앰플 대신)
    const primaryDedicatedAmpoule = DEDICATED_AMPOULE[primary] ? DEDICATED_AMPOULE[primary][typeId] : null;
    const showAmpouleUsage = !!primaryDedicatedAmpoule;
    const ampoultUsageTip = primaryDedicatedAmpoule && primaryDedicatedAmpoule.usageTip
      ? `<p class="usage-tip">💡 사용 TIP — ${primaryDedicatedAmpoule.usageTip}</p>`
      : "";

    // 민감도가 "가끔"(sens1) 수준이면 타입은 유지하되, 카테고리별로 저자극 버전으로 교체
    // 단, 1순위 고민(트러블·모공)이 배정한 앰플 자리는 예외 — "제일 급한 고민은 확실히,
    // 나머지는 순하게"라는 원칙으로, 앰플만 민감보정 적용에서 제외
    const useSensitiveAlt = sensitiveNote && typeId !== "sensitive";
    const ampouleExemptFromSensitiveAlt = INTENSITY_CONCERNS.includes(primary);

    const cats = CATEGORY_ORDER.filter((c) => categories.includes(c) && r.products[c]);
    const productsHtml = cats
      .map((cat, i) => {
        const skipSensitiveAlt = cat === "ampoule" && ampouleExemptFromSensitiveAlt;
        const p =
          cat === "ampoule" && primaryDedicatedAmpoule
            ? primaryDedicatedAmpoule
            : useSensitiveAlt && !skipSensitiveAlt && SENSITIVE_ALT[cat] && SENSITIVE_ALT[cat][budget]
            ? SENSITIVE_ALT[cat][budget]
            : (r.products[cat] && r.products[cat][budget]) || r.products[cat].budget_mid;
        // 제품이 실제로 언급한 고민(covers) ∩ 이 카테고리가 원래 담당할 수 있는 고민(CATEGORY_CONCERN_MAP)
        // 둘 다 만족해야만 태그 노출 — "선크림인데 번들거림 케어" 같은 근거 없는 태그 방지
        const allowedForCat = CATEGORY_CONCERN_MAP[cat] || [];
        const matched = concerns.filter((c) => (p.covers || []).includes(c) && allowedForCat.includes(c));
        const careTagsHtml = matched.length
          ? `<div class="care-tags">${matched.map((c) => `<span class="care-tag">${CONCERN_LABELS[c] || c} 케어</span>`).join("")}</div>`
          : `<div class="care-tags"><span class="care-tag care-tag-general">데일리 컨디션 케어</span></div>`;
        const usageHtml = cat === "ampoule" && showAmpouleUsage ? ampoultUsageTip : "";
        return `<li class="product">
          <p class="product-step">${CATEGORY_LABELS[cat]}</p>
          <p class="product-name">${p.name}</p>
          <p class="product-price">${p.price}</p>
          <p class="product-why">${p.why}</p>
          ${careTagsHtml}
          ${usageHtml}
        </li>`;
      })
      .join("");
    const primaryIsHabitType = primary === "sebum" || primary === "flaky";
    const orderNote = cats.length
      ? primaryIsHabitType
        ? `${CONCERN_LABELS[primary]}은 위 관리법이 핵심이에요. 아래는 피부 타입에 맞춘 데일리 기본 루틴이니, 위에서부터 순서대로 발라주세요.`
        : `고객님 고민에 맞춰 가장 효과적인 걸로 골라봤어요! 위에서부터 순서대로 발라주세요.`
      : "";

    // 남성이면 올인원 간편템도 별도로 살짝 제안 (단, 이미 올인원을 메인으로 골랐으면 중복이니 생략)
    const allinoneP = gender === "male" && !wantsAllinoneOnly && r.products.allinone
      ? (r.products.allinone[budget] || r.products.allinone.budget_mid)
      : null;
    const allinoneHtml = allinoneP
      ? `<div class="allinone-tip">
          <p class="allinone-tip-title">바쁜 날엔 이거 하나로 끝!</p>
          <p class="product-name">${allinoneP.name}</p>
          <p class="product-price">${allinoneP.price}</p>
          <p class="product-why">${allinoneP.why}</p>
        </div>`
      : "";

    const tagMatch = (tag) =>
      (tag === "자외선" && concerns.includes("uv")) ||
      (tag === "트러블" && concerns.includes("trouble")) ||
      (tag === "속건조" && concerns.includes("innerdry")) ||
      (tag === "번들거림" && concerns.includes("sebum")) ||
      (tag === "모공" && concerns.includes("pore")) ||
      (tag === "푸석함" && concerns.includes("flaky"));

    const routineHtml = (items) =>
      items.map((it) => `<li>${it.text}${it.tag && tagMatch(it.tag) ? `<span class="step-tag">${it.tag} 케어</span>` : ""}</li>`).join("");

    el.panel.innerHTML = `
      <div class="result-hero">
        <p class="result-eyebrow">고객님의 여름 피부 타입은</p>
        <div class="result-emoji">${r.emoji}</div>
        <h2 class="result-type">${r.name}</h2>
        <div><span class="base-type-badge">피부과학적 분류: ${r.baseType}</span></div>
        <p class="result-tag">${r.tag}</p>
        ${sensitiveNote ? `<p class="result-sensitive">민감도가 높은 편이라 저자극 위주로 추천해드렸어요</p>` : ""}
      </div>

      <div class="result-card">
        ${r.habitTip ? `<p class="habit-tip-block">🧴 <strong>평소 관리 습관</strong> — ${r.habitTip}</p>` : ""}
        ${careTipHtml}
        ${otherConcernsHtml}
      </div>

      <div class="result-card">
        <h3 class="rc-title"><span class="rc-stud"></span>고객님이 고른 고민</h3>
        <div class="concern-chips">${chipsHtml}</div>
      </div>

      <div class="result-card highlight">
        <h3 class="rc-title"><span class="rc-stud"></span>올영 추천 기초템</h3>
        <p class="step-note">${orderNote}</p>
        <ol class="product-timeline">${productsHtml}</ol>
        ${allinoneHtml}
        <p class="price-note">* 가격은 대략적인 정가 기준이에요. 온라인·매장 가격이 다르거나 기획전으로 달라질 수 있으니 구매 전 앱에서 확인해주세요!</p>
      </div>

      <div class="result-card">
        <h3 class="rc-title"><span class="rc-stud"></span>아침 루틴</h3>
        <ol class="routine">${routineHtml(r.routineAM)}</ol>
        <p class="routine-tip">${r.tipAM || ""}</p>
      </div>

      <div class="result-card">
        <h3 class="rc-title"><span class="rc-stud"></span>저녁 루틴</h3>
        <ol class="routine">${routineHtml(r.routinePM)}</ol>
        <p class="routine-tip">${r.tipPM || ""}</p>
      </div>

      <div class="result-actions">
        <button class="brick-btn btn-share" id="btn-share">결과 공유하기</button>
      </div>
      <p class="disclaimer">* 본 결과는 자가진단 기반 참고용이며, 피부 질환은 전문의와 상담하세요.</p>
    `;

    document.getElementById("btn-share").addEventListener("click", shareResult);

    el.btnPrev.disabled = false;
    el.btnNext.disabled = false;
    el.btnNext.textContent = "처음부터 다시 진단하기";

    safeReplaceState(buildShareUrl());
  }

  function render() {
    updateProgress();
    el.gameCard.classList.toggle("result-mode", step >= TOTAL_Q);
    if (step === -1) renderIntro();
    else if (step < TOTAL_Q) renderQuestion(step);
    else renderResultPanel();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNext() {
    if (step === -1) {
      step = 0;
    } else if (step < TOTAL_Q - 1) {
      if (!hasAnswer(QUESTIONS[step])) return;
      step++;
    } else if (step === TOTAL_Q - 1) {
      if (!hasAnswer(QUESTIONS[step])) return;
      step = TOTAL_Q;
    } else {
      restart();
      return;
    }
    render();
  }
  function goPrev() {
    if (step <= -1) return;
    step--;
    render();
  }
  function restart() {
    step = -1;
    Object.keys(answers).forEach((k) => delete answers[k]);
    lastResult = null;
    forcedType = null;
    forcedSensitive = null;
    safeReplaceState(location.pathname);
    render();
  }

  function buildShareUrl() {
    if (!lastResult) return location.href;
    const p = new URLSearchParams({
      t: lastResult.typeId,
      s: lastResult.sensitiveNote ? "1" : "0",
      c: lastResult.concerns.join("."),
      m: lastResult.primary || "",
      b: lastResult.budget === "budget_high" ? "h" : "m",
      g: answers.q1 || "",
    });
    return location.origin + location.pathname + "?" + p.toString();
  }
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    setTimeout(() => el.toast.classList.remove("show"), 2200);
  }
  async function shareResult() {
    const url = buildShareUrl();
    const shareData = { title: "내 여름 피부, 무슨 타입?", text: "나의 여름 피부 타입 진단 결과를 확인해보세요!", url };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch (e) {}
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("링크가 복사되었어요!");
    } catch (e) {
      prompt("아래 링크를 복사해주세요", url);
    }
  }
  function loadFromUrl() {
    const p = new URLSearchParams(location.search);
    const t = p.get("t");
    if (!t || !RESULTS[t]) return false;
    const concerns = (p.get("c") || "").split(".").filter(Boolean);
    answers.q1 = p.get("g") || "";
    answers.q5 = concerns;
    answers.q6 = p.get("m") || concerns[0];
    answers.q7 = p.get("b") === "h" ? "budget_high" : "budget_mid";
    forcedType = t;
    forcedSensitive = p.get("s") === "1";
    step = TOTAL_Q;
    render();
    return true;
  }

  el.btnNext.addEventListener("click", goNext);
  el.btnPrev.addEventListener("click", goPrev);

  if (!loadFromUrl()) render();
})();
