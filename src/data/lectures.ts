export type Lecture = {
  id: string;
  slug: string;
  number: number;
  title: string;
  summary: string;
  body: string[];
  youtubeId: string;
  thumbnail: string;
  students: string;
  duration: string;
};

export const lectures: Lecture[] = [
  {
    id: "01",
    slug: "lecture01",
    number: 1,
    title: "본문만큼 중요한 서론(디스크립션) 작성방법",
    summary:
      "검색엔진 봇(Bot)이 내 글을 가져 갈 때 제일 먼저 보는 본문 첫 3줄, 어떻게 작성하는게 가장 좋을지 제 경험을 공유해보겠습니다.",
    body: [
      "블로그 글을 작성할 때 첫 3줄을 통해 이 글이 어떤 글인지 검색엔진 봇(Bot)과 검색자들에게 어필해야 합니다.",
      "본문에 집중해야지 라는 생각에 서론을 대충 작성해버린다면 상위노출로 가는 길을 돌아가게 될지도 모릅니다.",
      "이번 영상을 통해서 상위노출을 위한 본문 첫 3줄을 어떻게 작성할지 생각해보는 계기가 되셨으면 좋겠습니다.",
    ],
    youtubeId: "Mdqp52AW8k4",
    thumbnail: "images/lectures/lecture-01.webp",
    students: "1.3k+",
    duration: "10 min",
  },
  {
    id: "02",
    slug: "lecture02",
    number: 2,
    title: "구글 서치콘솔, 애널리틱스 사용방법",
    summary:
      "서치콘솔과 애널리틱스의 차이점을 알고 계신가요? 무작정 내 글을 상위노출 시키기보다 웹 분석도구를 활용하면 보다 쉽게 트래픽과 수익을 잡을 수 있습니다.",
    body: [
      "서치콘솔과 애널리틱스는 비슷해 보이지만 역할이 다릅니다.",
      "검색 노출·클릭 데이터와 실제 방문 행동을 함께 보면, 어떤 글을 고치고 어디에 힘을 줄지 훨씬 빠르게 판단할 수 있습니다.",
      "이번 강의에서 두 도구를 어떻게 연결하고 읽는지 핵심만 정리합니다.",
    ],
    youtubeId: "KMzYvtv56to",
    thumbnail: "images/lectures/lecture-02.webp",
    students: "1.4k+",
    duration: "11 min",
  },
  {
    id: "03",
    slug: "lecture03",
    number: 3,
    title: "워드프레스 전문블 만들기",
    summary:
      "티스토리, 네이버 블로그에 다양한 키워드를 작성해서 인기 키워드를 워드프레스에 담고 계신가요? 그 방법 외에 또 다른 무료블로그를 이용한 워드프레스 전문블 만들기에 대해 알려드리겠습니다.",
    body: [
      "전문 블로그는 ‘이것만 다루는 사이트’라는 신호를 검색엔진에 줍니다.",
      "무료 블로그를 활용해 키워드를 검증하고, 검증된 주제를 워드프레스로 옮기는 흐름을 정리합니다.",
      "초보도 따라 할 수 있는 전문블 세팅 포인트를 공유합니다.",
    ],
    youtubeId: "SCwUmYzpMes",
    thumbnail: "images/lectures/lecture-03.webp",
    students: "1.2k+",
    duration: "12 min",
  },
  {
    id: "04",
    slug: "lecture04",
    number: 4,
    title: "황금 키워드 찾는 방법",
    summary:
      "뻔하디 뻔한 블랙키위, 키워드 마스터와 같은 검색량 대비 문서 발행수로 찾는 황금키워드가 아닌 구글(Google) 검색엔진에서 글 개수가 적은 키워드를 찾아내서 상위노출을 노릴수 있는 방법에 대해 알아보겠습니다.",
    body: [
      "검색량만 보고 고르면 경쟁만 센 키워드에 막히기 쉽습니다.",
      "구글에서 실제로 문서가 적고 승산이 있는 키워드를 찾는 관점을 알려드립니다.",
      "도구에만 의존하지 않는 실전 키워드 발굴법을 다룹니다.",
    ],
    youtubeId: "o7ECSQf-gOc",
    thumbnail: "images/lectures/lecture-04.webp",
    students: "1.5k+",
    duration: "13 min",
  },
  {
    id: "05",
    slug: "lecture05",
    number: 5,
    title: "소제목(H1-H2-H3) 태그 사용방법",
    summary:
      "소제목은 글의 목차와도 같습니다. 구글은 하루에도 수천, 수만 건의 글에 대한 색인을 진행합니다. 모든 글을 다 읽을 수 없기 때문에 소제목을 통해 글의 구조와 구성을 확인하게 되니 정말 중요한 내용입니다.",
    body: [
      "소제목은 독자와 검색엔진 모두에게 글의 지도를 보여줍니다.",
      "H1–H2–H3를 어떻게 나누느냐에 따라 가독성과 색인 품질이 달라집니다.",
      "워드프레스에서 바로 적용할 수 있는 태그 사용 원칙을 정리합니다.",
    ],
    youtubeId: "A31n2a4oVvY",
    thumbnail: "images/lectures/lecture-05.webp",
    students: "1.3k+",
    duration: "10 min",
  },
  {
    id: "06",
    slug: "lecture06",
    number: 6,
    title: "애드센스 광고 배치 방법",
    summary:
      "애드센스 광고 클릭률이 가장 높은 위치는 어디일까요? 그리고 어떻게 해야 광고 클릭률을 높일수 있을지 마지막 특강 6강에서 함께 알아보도록 하겠습니다.",
    body: [
      "광고는 많이 넣는 것보다 ‘읽기 흐름을 해치지 않는 자리’가 중요합니다.",
      "클릭률이 높은 배치와 피해야 할 패턴을 사례 중심으로 설명합니다.",
      "승인 이후 수익을 키우기 위한 마지막 특강입니다.",
    ],
    youtubeId: "ihH_5Cab7aQ",
    thumbnail: "images/lectures/lecture-06.webp",
    students: "1.6k+",
    duration: "11 min",
  },
];

export function getLecture(slug: string): Lecture | undefined {
  return lectures.find((l) => l.slug === slug);
}

export function getAdjacent(slug: string): { prev?: Lecture; next?: Lecture } {
  const idx = lectures.findIndex((l) => l.slug === slug);
  if (idx < 0) return {};
  return {
    prev: idx > 0 ? lectures[idx - 1] : undefined,
    next: idx < lectures.length - 1 ? lectures[idx + 1] : undefined,
  };
}
