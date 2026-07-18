export const KADENCE_CSS = `/* 배경 및 카드 입체감 강화 */
body {
    background-color: #f8f9fa !important; /* 배경색을 명확히 분리 */
}

.site-main article.entry {
    background: #ffffff !important;
    border: none !important; /* 테두리 대신 그림자로 입체감 */
    border-radius: 15px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
    transition: all 0.3s ease !important;
}

/* 마우스 올리면 카드가 부드럽게 떠오름 */
.site-main article.entry:hover {
    transform: translateY(-5px) !important;
    box-shadow: 0 12px 24px rgba(0,0,0,0.1) !important;
}

/* 헤더(로고 영역) 디자인 */
.site-header {
    background: #ffffff !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05) !important;
    border-bottom: none !important;
}

/* 사이드바 검색창 스타일 (둥글게) */
.search-form {
    display: flex !important;
    border-radius: 50px !important;
    overflow: hidden !important;
    border: 1px solid #ddd !important;
    background: #fff !important;
}

.search-field {
    border: none !important;
    padding: 10px 20px !important;
    outline: none !important;
    width: 100% !important;
}

.search-submit {
    background-color: #3366ff !important;
    color: #fff !important;
    border: none !important;
    padding: 0 20px !important;
    cursor: pointer !important;
}

/* 사이드바 위젯 강조 */
.widget-title {
    font-weight: 800 !important;
    position: relative !important;
    padding-left: 15px !important;
    border-left: 5px solid #3366ff !important; /* 제목 옆 파란색 바 */
}

/* 텍스트 포인트 컬러 */
.site-main article.entry .entry-title a:hover {
    color: #3366ff !important;
}

/* 카드 전체의 상하 여백을 동일하게 교정 */
.site-main article.entry {
    padding-top: 5px !important;
    padding-left: 5px !important;
    padding-bottom: 5px !important; /* 하단 문구 아래에 생길 여백 */
    height: auto !important;
}

/* 카드 내부 마지막 요소의 하단 여백 제거 */
.site-main article.entry > *:last-child,
.site-main article.entry .entry-content-wrap > *:last-child {
    padding-top: 5px !important;    /* 상단 여백 */
}

/* 문구를 감싸는 영역의 불필요한 하단 마진 제거 */
.site-main article.entry .entry-content-wrap {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
}

.more-link-wrap {
    margin-top: 0 !important;      /* 위쪽 공백 완전 제거 */
    margin-bottom: 0 !important;   /* 아래쪽 공백 완전 제거 */
    padding: 0 !important;
    line-height: 1 !important;     /* 행간을 줄여 본문에 밀착 */
}

/* 모든 형태의 밑줄을 시원한 민트색으로 강제 치환 */
u, 
span[style*="underline"], 
.highlight {
    /* 기존 밑줄 완전 박멸 */
    text-decoration: none !important;
    text-decoration-line: none !important;
    
    /* 형광펜 효과 (민트색 rgba 0, 255, 200) */
    /* 45% 두께로 글자 하단에 배치 */
    background: linear-gradient(to top, rgba(0, 255, 200, 0.4) 45%, transparent 45%) !important;
    
    /* 레이아웃 미세 조정 */
    padding: 0 2px !important;
    display: inline !important;
    
    /* 가독성을 위해 글자색은 검정 유지 */
    color: inherit !important;
}

/* 포스트 그리드 제목 글자 제한 및 말줄임표 표시 */
.entry-title a, .post-item-title a {
    display: -webkit-box;
    -webkit-line-clamp: 1; /* 표시하고 싶은 줄 수 (예: 2줄) */
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-all;
    min-height: 1em; /* 줄 수에 맞춰 높이를 고정하면 정렬이 더 깔끔합니다 */
}

/* 인용구 설정 */
blockquote.wp-block-quote {
    border-left: none;
    border: 1px solid #e2e8f0;

    /* 박스 모양 및 여백 */
    background-color: #f8fafc;
    border-radius: 15px;
    padding: 25px 30px;

    /* 위치 및 그림자 (선택 사항) */
    margin: 1.5em 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

/* 인용문 내부 텍스트 정렬 */
blockquote.wp-block-quote p {
    font-style: normal;
    line-height: 1.7;
    margin: 0;
    color: #334155;
}

/* 썸네일 이미지 1.05배 확대 (테두리 겹침 방지) */
.site-main article.entry .post-thumbnail img,
.site-main article.entry .wp-post-image {
    transform: scale(1.05) !important;
}

/* 썸네일이 확대되면서 카드 둥근 모서리 밖으로 삐져나오는 것을 방지 */
.site-main article.entry .post-thumbnail {
    overflow: hidden !important;
}
`;

export const KADENCE_CSS_VIDEO_ID = "f3R_Ox4S4x0";
