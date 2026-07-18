(() => {
  const root = document.querySelector("[data-calculator]");
  if (!root) return;

  const slug = root.getAttribute("data-calculator");
  const form = root.querySelector("[data-calc-form]");
  const out = root.querySelector("[data-calc-out]");
  if (!form || !out) return;

  const won = (n) =>
    `${Math.round(n).toLocaleString("ko-KR")}원`;

  const num = (name) => {
    const el = form.elements.namedItem(name);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return 0;
    return Number(String(el.value).replace(/,/g, "")) || 0;
  };

  const val = (name) => {
    const el = form.elements.namedItem(name);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return "";
    return el.value;
  };

  function render(mainLabel, mainValue, rows, note) {
    out.innerHTML = `
      <div class="calc-result-main">
        <strong>${mainLabel}</strong>
        <b>${mainValue}</b>
      </div>
      <div class="calc-rows">
        ${rows
          .map(
            ([k, v]) =>
              `<div class="calc-row"><span>${k}</span><span>${v}</span></div>`,
          )
          .join("")}
      </div>
      <p class="calc-note">${note}</p>
    `;
  }

  // --- calculators ---
  function salary() {
    const annual = num("annual");
    const monthly = annual / 12;
    // 2025 approximate employee rates / caps (simplified)
    const pensionBase = Math.min(Math.max(monthly, 0), 6_180_000);
    const pension = pensionBase * 0.045;
    const health = monthly * 0.03545;
    const longTerm = health * 0.1295;
    const employ = monthly * 0.009;
    // simplified progressive monthly income tax estimate
    const taxableApprox = Math.max(monthly - 150_000 - pension - health - longTerm - employ, 0);
    let tax = 0;
    const brackets = [
      [1_200_000, 0.06],
      [4_600_000, 0.15],
      [8_800_000, 0.24],
      [15_000_000, 0.35],
      [30_000_000, 0.38],
      [50_000_000, 0.4],
      [Infinity, 0.42],
    ];
    let remain = taxableApprox;
    let prev = 0;
    for (const [limit, rate] of brackets) {
      const slice = Math.min(remain, limit - prev);
      if (slice <= 0) break;
      tax += slice * rate;
      remain -= slice;
      prev = limit;
    }
    const localTax = tax * 0.1;
    const totalDeduct = pension + health + longTerm + employ + tax + localTax;
    const net = monthly - totalDeduct;
    render(
      "예상 월 실수령액",
      won(net),
      [
        ["월 급여(세전)", won(monthly)],
        ["국민연금", won(pension)],
        ["건강보험", won(health)],
        ["장기요양", won(longTerm)],
        ["고용보험", won(employ)],
        ["소득세(간이)", won(tax)],
        ["지방소득세", won(localTax)],
        ["공제 합계", won(totalDeduct)],
        ["연 실수령 환산", won(net * 12)],
      ],
      "참고용 간이 계산입니다. 부양가족·비과세·상여·회사 규정에 따라 실제 실수령액과 달라질 수 있습니다.",
    );
  }

  function incomeTax() {
    const base = num("taxBase");
    const withLocal = val("local") === "yes";
    const brackets = [
      [14_000_000, 0.06, 0],
      [50_000_000, 0.15, 1_260_000],
      [88_000_000, 0.24, 5_760_000],
      [150_000_000, 0.35, 15_440_000],
      [300_000_000, 0.38, 19_940_000],
      [500_000_000, 0.4, 25_940_000],
      [1_000_000_000, 0.42, 35_940_000],
      [Infinity, 0.45, 65_940_000],
    ];
    let tax = 0;
    let prev = 0;
    for (const [limit, rate, ded] of brackets) {
      if (base <= limit) {
        tax = base * rate - ded;
        break;
      }
      prev = limit;
    }
    tax = Math.max(tax, 0);
    const local = withLocal ? tax * 0.1 : 0;
    render(
      "예상 종합소득세",
      won(tax + local),
      [
        ["과세표준", won(base)],
        ["종합소득세", won(tax)],
        ["지방소득세(10%)", withLocal ? won(local) : "미포함"],
        ["합계", won(tax + local)],
      ],
      "누진공제 기본 세율표 기준 참고용입니다. 세액공제·감면·가산세는 반영하지 않습니다.",
    );
  }

  function capitalGains() {
    const sell = num("sell");
    const buy = num("buy");
    const expense = num("expense");
    const gain = Math.max(sell - buy - expense, 0);
    const basicDeduction = Math.min(gain, 2_500_000);
    const taxBase = Math.max(gain - basicDeduction, 0);
    // simplified: use general progressive-like flat estimate 20% / 6% local of tax for illustration when under 300m else 30%
    const rate = taxBase > 300_000_000 ? 0.3 : 0.2;
    const tax = taxBase * rate;
    const local = tax * 0.1;
    render(
      "예상 양도소득세(간이)",
      won(tax + local),
      [
        ["양도차익", won(gain)],
        ["기본공제", won(basicDeduction)],
        ["과세표준", won(taxBase)],
        ["적용세율(간이)", `${(rate * 100).toFixed(0)}%`],
        ["양도소득세", won(tax)],
        ["지방소득세", won(local)],
      ],
      "1세대1주택 비과세, 보유·거주 기간 공제, 중과 등은 반영하지 않은 초간단 참고용입니다.",
    );
  }

  function acquisitionTax() {
    const price = num("price");
    const type = val("type"); // house85 / houseOver / other
    let rate = 0.01;
    if (type === "house85") rate = 0.01;
    else if (type === "houseOver") rate = 0.01; // simplified base; actual tiers vary by price
    else rate = 0.04;
    // very rough housing tier bump
    if (type.startsWith("house") && price > 600_000_000) rate = 0.02;
    if (type.startsWith("house") && price > 900_000_000) rate = 0.03;
    const acquisition = price * rate;
    const rural = type === "other" ? price * 0.002 : 0;
    const edu = acquisition * 0.2;
    render(
      "예상 취득세 등",
      won(acquisition + rural + edu),
      [
        ["취득가액", won(price)],
        ["취득세", won(acquisition)],
        ["농어촌특별세", won(rural)],
        ["지방교육세", won(edu)],
      ],
      "주택 유상취득 세율은 가액·면적·다주택 여부에 따라 달라집니다. 참고용 간이 계산입니다.",
    );
  }

  function giftTax() {
    const amount = num("amount");
    const relation = val("relation");
    const dedMap = {
      spouse: 600_000_000,
      lineal: 50_000_000,
      minor: 20_000_000,
      other: 10_000_000,
    };
    const ded = dedMap[relation] ?? 10_000_000;
    const taxBase = Math.max(amount - ded, 0);
    const brackets = [
      [100_000_000, 0.1, 0],
      [500_000_000, 0.2, 10_000_000],
      [1_000_000_000, 0.3, 60_000_000],
      [3_000_000_000, 0.4, 160_000_000],
      [Infinity, 0.5, 460_000_000],
    ];
    let tax = 0;
    for (const [limit, rate, d] of brackets) {
      if (taxBase <= limit) {
        tax = taxBase * rate - d;
        break;
      }
    }
    tax = Math.max(tax, 0);
    render(
      "예상 증여세",
      won(tax),
      [
        ["증여재산가액", won(amount)],
        ["관계별 공제", won(ded)],
        ["과세표준", won(taxBase)],
        ["산출세액", won(tax)],
      ],
      "10년 합산·감정가·채무인수 등은 반영하지 않은 참고용 계산입니다.",
    );
  }

  function severance() {
    const avgDaily = num("avgDaily");
    const years = num("years");
    const days = years * 30; // simplified: 30일분 × 근속연수
    const amount = avgDaily * 30 * years;
    render(
      "예상 퇴직금",
      won(amount),
      [
        ["1일 평균임금", won(avgDaily)],
        ["근속연수", `${years}년`],
        ["산식", "평균임금 × 30일 × 근속연수"],
        ["예상 퇴직금", won(amount)],
      ],
      "법정 퇴직금 원칙(계속근로 1년 이상)의 단순 산식입니다. DC/DB·평균임금 산정 방식에 따라 달라질 수 있습니다.",
    );
  }

  function brokerage() {
    const deal = num("deal");
    const kind = val("kind"); // sale / rent
    // Seoul upper-limit style simplified tiers
    let rate = 0.005;
    let cap = Infinity;
    if (kind === "sale") {
      if (deal < 50_000_000) {
        rate = 0.006;
        cap = 250_000;
      } else if (deal < 200_000_000) {
        rate = 0.005;
        cap = 800_000;
      } else if (deal < 900_000_000) {
        rate = 0.004;
      } else if (deal < 1_200_000_000) {
        rate = 0.005;
      } else if (deal < 1_500_000_000) {
        rate = 0.006;
      } else {
        rate = 0.007;
      }
    } else {
      if (deal < 50_000_000) {
        rate = 0.005;
        cap = 200_000;
      } else if (deal < 100_000_000) {
        rate = 0.004;
        cap = 300_000;
      } else if (deal < 600_000_000) {
        rate = 0.003;
      } else if (deal < 1_200_000_000) {
        rate = 0.004;
      } else if (deal < 1_500_000_000) {
        rate = 0.005;
      } else {
        rate = 0.006;
      }
    }
    const fee = Math.min(deal * rate, cap);
    const vat = fee * 0.1;
    render(
      "예상 중개보수(상한)",
      won(fee),
      [
        ["거래금액", won(deal)],
        ["적용 요율", `${(rate * 100).toFixed(1)}%`],
        ["상한 중개보수", won(fee)],
        ["부가세(별도)", won(vat)],
        ["합계(부가세 포함)", won(fee + vat)],
      ],
      "서울시 주택 중개보수 상한 요율을 단순화한 참고용입니다. 협의·지역 조례에 따라 달라질 수 있습니다.",
    );
  }

  function insurance() {
    const monthly = num("monthly");
    const pensionBase = Math.min(Math.max(monthly, 0), 6_180_000);
    const pensionEmp = pensionBase * 0.045;
    const pensionCo = pensionBase * 0.045;
    const healthEmp = monthly * 0.03545;
    const healthCo = monthly * 0.03545;
    const longEmp = healthEmp * 0.1295;
    const longCo = healthCo * 0.1295;
    const employEmp = monthly * 0.009;
    const employCo = monthly * 0.0115; // simplified employer side incl. some employment stability
    const industrial = monthly * 0.01; // rough placeholder employer-only
    const empTotal = pensionEmp + healthEmp + longEmp + employEmp;
    const coTotal = pensionCo + healthCo + longCo + employCo + industrial;
    render(
      "근로자 부담 합계",
      won(empTotal),
      [
        ["국민연금(근로자)", won(pensionEmp)],
        ["건강보험(근로자)", won(healthEmp)],
        ["장기요양(근로자)", won(longEmp)],
        ["고용보험(근로자)", won(employEmp)],
        ["근로자 합계", won(empTotal)],
        ["사업주 합계(참고)", won(coTotal)],
      ],
      "요율·상한은 시기별로 달라집니다. 산재요율은 업종별로 크게 다르므로 참고용입니다.",
    );
  }

  const runners = {
    salary,
    "income-tax": incomeTax,
    "capital-gains": capitalGains,
    "acquisition-tax": acquisitionTax,
    "gift-tax": giftTax,
    severance,
    brokerage,
    insurance,
  };

  const run = runners[slug];
  if (!run) return;

  const onCalc = (e) => {
    e?.preventDefault?.();
    run();
  };

  form.addEventListener("submit", onCalc);
  form.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", () => run());
    el.addEventListener("change", () => run());
  });
  run();
})();
