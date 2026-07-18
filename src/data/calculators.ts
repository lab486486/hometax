export type Calculator = {
  slug: string;
  title: string;
  short: string;
  description: string;
  popular: boolean;
};

export const calculators: Calculator[] = [
  {
    slug: "salary",
    title: "연봉 실수령액 계산기",
    short: "세금·4대보험 공제 후 실수령액",
    description:
      "연봉을 입력하면 국민연금·건강보험·고용보험·소득세(간이)를 반영한 월 실수령액을 대략 계산합니다.",
    popular: true,
  },
  {
    slug: "income-tax",
    title: "종합소득세 계산기",
    short: "소득세 예상 세액 계산",
    description:
      "과세표준을 입력하면 누진공제 방식의 종합소득세 대략 세액을 계산합니다. (지방소득세 포함 옵션)",
    popular: true,
  },
  {
    slug: "capital-gains",
    title: "양도소득세 계산기",
    short: "부동산·주식 양도차익 세금",
    description:
      "양도가액·취득가액·필요경비를 입력해 양도차익과 기본 세율을 적용한 예상 세액을 봅니다. (1주택 비과세 등 특례는 미반영)",
    popular: true,
  },
  {
    slug: "acquisition-tax",
    title: "취득세 계산기",
    short: "부동산 매수 시 취득세",
    description:
      "취득가액과 주택 유형·면적 조건을 선택해 취득세·농특세·지방교육세를 대략 계산합니다.",
    popular: true,
  },
  {
    slug: "gift-tax",
    title: "증여세 계산기",
    short: "증여재산 세금 계산",
    description:
      "증여재산가액과 관계별 공제를 적용해 증여세 대략 금액을 계산합니다.",
    popular: true,
  },
  {
    slug: "severance",
    title: "퇴직금 계산기",
    short: "퇴직금 예상액 산출",
    description:
      "평균임금과 근속연수로 법정 퇴직금(계속근로 1년 이상) 예상액을 계산합니다.",
    popular: true,
  },
  {
    slug: "brokerage",
    title: "부동산 중개수수료 계산기",
    short: "매매·전세 중개보수",
    description:
      "거래종류·금액에 따른 법정 상한 요율을 기준으로 중개보수를 계산합니다. (서울 기준 상한)",
    popular: true,
  },
  {
    slug: "insurance",
    title: "4대보험 계산기",
    short: "국민연금·건보·고용보험",
    description:
      "월 급여를 기준으로 근로자·사업주 부담 4대보험료를 대략 계산합니다.",
    popular: true,
  },
];

export function getCalculator(slug: string): Calculator | undefined {
  return calculators.find((c) => c.slug === slug);
}

export function popularCalculators(): Calculator[] {
  return calculators.filter((c) => c.popular);
}
