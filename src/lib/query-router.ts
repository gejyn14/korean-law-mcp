/**
 * Smart Query Router
 * 자연어 질의를 분석하여 최적의 도구/체인으로 라우팅
 *
 * 패턴 매칭 기반으로 의도를 파악하고, 필요한 파라미터를 자동 추출
 */

export interface RouteResult {
  /** 실행할 도구 이름 */
  tool: string
  /** 도구에 전달할 파라미터 */
  params: Record<string, unknown>
  /** 라우팅 근거 설명 */
  reason: string
  /** 후속 실행이 필요한 도구 (파이프라인) */
  pipeline?: Array<{ tool: string; params: Record<string, unknown> }>
}

interface Pattern {
  /** 패턴 이름 */
  name: string
  /** 매칭 정규식 배열 (OR 조건) */
  patterns: RegExp[]
  /** 매칭 시 실행할 도구 */
  tool: string
  /** 파라미터 추출 함수 */
  extract: (query: string, match: RegExpMatchArray | null) => Record<string, unknown>
  /** 라우팅 설명 */
  reason: string
  /** 우선순위 (낮을수록 우선) */
  priority: number
}

// ────────────────────────────────────────
// 조문 번호 추출 헬퍼
// ────────────────────────────────────────

function extractArticleNumber(query: string): string | undefined {
  const match = query.match(/제(\d+)조(?:의(\d+))?/)
  if (!match) return undefined
  return match[0] // "제38조" or "제10조의2"
}

function extractLawName(query: string): string {
  // 제X조, 별표, 판례 등 수식어 제거하여 순수 법령명 추출
  return query
    .replace(/제\d+조(?:의\d+)?/g, "")
    .replace(/별표\s*\d*/g, "")
    .replace(/서식\s*\d*/g, "")
    .replace(/판례|판결|사례|대법원|헌재|행정심판/g, "")
    .replace(/해석례?|유권해석|질의회신/g, "")
    .replace(/개정|이력|변경|연혁|신구대조/g, "")
    .replace(/3단비교|위임|인용|체계/g, "")
    .replace(/영문|영어|English/gi, "")
    .replace(/별표|서식|양식|신청서/g, "")
    .replace(/조례|규칙/g, (m) => m) // 조례/규칙은 유지
    .replace(/검색|조회|확인|알려줘|찾아줘|보여줘/g, "")
    .replace(/의\s*$/, "")
    .trim()
}

function hasRegionPrefix(query: string): boolean {
  return /서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주/.test(query)
}

// ────────────────────────────────────────
// 패턴 정의
// ────────────────────────────────────────

const routePatterns: Pattern[] = [
  // ── 1. 특정 조문 조회 (최고 우선) ──
  {
    name: "specific_article",
    patterns: [
      /(.+?)\s*제(\d+)조(?:의(\d+))?\s*$/,
      /제(\d+)조(?:의(\d+))?\s*(.+)/,
    ],
    tool: "get_law_text",
    extract: (query) => {
      const jo = extractArticleNumber(query)
      const lawName = extractLawName(query)
      return { _searchQuery: lawName, jo, _needsMst: true }
    },
    reason: "법령명 + 조문번호 → 해당 조문 직접 조회",
    priority: 1,
  },

  // ── 2. 조례/자치법규 검색 ──
  {
    name: "ordinance",
    patterns: [
      /조례/,
      /(시|군|구|도|특별시|광역시)\s+.+/,
    ],
    tool: "search_ordinance",
    extract: (query) => ({ query: extractLawName(query) || query }),
    reason: "조례/자치법규 키워드 → 자치법규 검색",
    priority: 5,
  },

  // ── 3. 개정 이력/신구대조 ──
  {
    name: "amendment",
    patterns: [
      /개정|신구대조|변경\s*이력|연혁/,
    ],
    tool: "chain_amendment_track",
    extract: (query) => ({ query: extractLawName(query) || query }),
    reason: "개정/이력 키워드 → 개정추적 체인",
    priority: 10,
  },

  // ── 4. 3단비교/법체계 ──
  {
    name: "law_system",
    patterns: [
      /3단\s*비교|위임\s*조문|인용\s*조문|법\s*체계|시행령\s*비교/,
    ],
    tool: "chain_law_system",
    extract: (query) => ({ query: extractLawName(query) || query }),
    reason: "법체계/3단비교 키워드 → 법체계 체인",
    priority: 10,
  },

  // ── 5. 별표/서식 조회 ──
  {
    name: "annex",
    patterns: [
      /별표|서식|양식|별지|신청서/,
    ],
    tool: "get_annexes",
    extract: (query) => ({ lawName: extractLawName(query) || query }),
    reason: "별표/서식 키워드 → 별표 조회",
    priority: 10,
  },

  // ── 6. 판례 검색 ──
  {
    name: "precedent",
    patterns: [
      /판례|판결|대법원\s*판/,
    ],
    tool: "search_precedents",
    extract: (query) => ({
      query: query.replace(/판례|판결|대법원|검색|조회/g, "").trim(),
    }),
    reason: "판례 키워드 → 판례 검색",
    priority: 10,
  },

  // ── 7. 해석례 ──
  {
    name: "interpretation",
    patterns: [
      /해석례?|유권\s*해석|질의\s*회신/,
    ],
    tool: "search_interpretations",
    extract: (query) => ({
      query: query.replace(/해석례?|유권해석|질의회신|검색|조회/g, "").trim(),
    }),
    reason: "해석례 키워드 → 해석례 검색",
    priority: 10,
  },

  // ── 8. 헌재 결정례 ──
  {
    name: "constitutional",
    patterns: [
      /헌재|헌법재판|위헌/,
    ],
    tool: "search_constitutional_decisions",
    extract: (query) => ({
      query: query.replace(/헌재|헌법재판소?|결정례?|검색|조회/g, "").trim(),
    }),
    reason: "헌재 키워드 → 헌재 결정례 검색",
    priority: 10,
  },

  // ── 9. 행정심판 ──
  {
    name: "admin_appeal",
    patterns: [
      /행정심판|행심/,
    ],
    tool: "search_admin_appeals",
    extract: (query) => ({
      query: query.replace(/행정심판례?|행심|검색|조회/g, "").trim(),
    }),
    reason: "행정심판 키워드 → 행정심판례 검색",
    priority: 10,
  },

  // ── 10. 조세심판 ──
  {
    name: "tax_tribunal",
    patterns: [
      /조세\s*심판|세금\s*심판/,
    ],
    tool: "search_tax_tribunal_decisions",
    extract: (query) => ({
      query: query.replace(/조세심판원?|세금심판|결정례?|검색|조회/g, "").trim(),
    }),
    reason: "조세심판 키워드 → 조세심판 결정례 검색",
    priority: 10,
  },

  // ── 11. 영문 법령 ──
  {
    name: "english_law",
    patterns: [
      /영문|영어|English/i,
    ],
    tool: "search_english_law",
    extract: (query) => ({
      query: query.replace(/영문|영어|English|법령|검색|조회/gi, "").trim(),
    }),
    reason: "영문 키워드 → 영문법령 검색",
    priority: 10,
  },

  // ── 12. 법령용어 ──
  {
    name: "legal_terms",
    patterns: [
      /법률?\s*용어|법령\s*용어|용어\s*정의|용어\s*뜻|뭐야$|뜻이?$/,
    ],
    tool: "search_legal_terms",
    extract: (query) => ({
      query: query.replace(/법률?용어|법령용어|용어정의|뜻이?|뭐야|검색|조회|의$/g, "").trim(),
    }),
    reason: "용어 키워드 → 법령용어 검색",
    priority: 10,
  },

  // ── 13. 처분/허가 근거 (분쟁/쟁송 전) ──
  {
    name: "action_basis",
    patterns: [
      /허가|인가|등록|신고|처분|취소\s*사유|거부\s*근거|요건/,
    ],
    tool: "chain_action_basis",
    extract: (query) => ({ query }),
    reason: "처분/허가 키워드 → 처분근거 체인",
    priority: 15,
  },

  // ── 14. 쟁송/분쟁 대비 ──
  {
    name: "dispute",
    patterns: [
      /불복|소송|쟁송|항고|이의\s*신청|감경|취소\s*소송/,
    ],
    tool: "chain_dispute_prep",
    extract: (query) => ({ query }),
    reason: "분쟁/쟁송 키워드 → 쟁송대비 체인",
    priority: 15,
  },

  // ── 15. 절차/비용/수수료 ──
  {
    name: "procedure",
    patterns: [
      /절차|방법|수수료|과태료|비용|신청\s*방법|어떻게/,
    ],
    tool: "chain_procedure_detail",
    extract: (query) => ({ query }),
    reason: "절차/비용 키워드 → 절차상세 체인",
    priority: 15,
  },

  // ── 16. 행정규칙 ──
  {
    name: "admin_rule",
    patterns: [
      /훈령|예규|고시|지침|내규/,
    ],
    tool: "search_admin_rule",
    extract: (query) => ({ query }),
    reason: "행정규칙 키워드 → 행정규칙 검색",
    priority: 4, // 조례보다 먼저 매칭 (고시 vs 조례 충돌 방지)
  },

  // ── 17. 지역명 + 키워드 (조례) ──
  {
    name: "region_ordinance",
    patterns: [
      /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/,
    ],
    tool: "search_ordinance",
    extract: (query) => ({ query }),
    reason: "지역명 시작 → 자치법규 검색",
    priority: 20,
  },

  // ── 18. 명시적 법령명 (법, 령, 규칙으로 끝나는) ──
  {
    name: "explicit_law",
    patterns: [
      /(법|령|규칙|규정)$/,
      /^[가-힣]+(법|령|규칙|규정)\s*$/,
    ],
    tool: "search_law",
    extract: (query) => ({ query: query.trim() }),
    reason: "법령명 패턴 → 법령 검색",
    priority: 25,
  },
]

// ────────────────────────────────────────
// 라우터 본체
// ────────────────────────────────────────

/**
 * 자연어 질의를 분석하여 최적의 도구로 라우팅
 */
export function routeQuery(query: string): RouteResult {
  const q = query.trim()

  // 빈 쿼리
  if (!q) {
    return {
      tool: "search_all",
      params: { query: "" },
      reason: "빈 쿼리 → 통합검색",
    }
  }

  // 패턴 매칭 (우선순위 순)
  const sortedPatterns = [...routePatterns].sort((a, b) => a.priority - b.priority)

  for (const pattern of sortedPatterns) {
    for (const regex of pattern.patterns) {
      const match = q.match(regex)
      if (match) {
        const params = pattern.extract(q, match)

        // _needsMst 플래그: 법령 검색이 먼저 필요한 경우 파이프라인 구성
        if (params._needsMst) {
          const searchQuery = (params._searchQuery as string) || q
          delete params._needsMst
          delete params._searchQuery

          return {
            tool: "search_law",
            params: { query: searchQuery },
            reason: `${pattern.reason} (법령 검색 → 조문 조회 자동 연결)`,
            pipeline: [
              {
                tool: pattern.tool,
                params: { jo: params.jo },
              },
            ],
          }
        }

        return {
          tool: pattern.tool,
          params,
          reason: pattern.reason,
        }
      }
    }
  }

  // 기본 폴백: 종합 리서치 체인
  // 자연어 질의가 어떤 패턴에도 매칭되지 않으면
  // AI 검색 + 법령 + 판례 + 해석례 병렬 수집
  return {
    tool: "chain_full_research",
    params: { query: q },
    reason: "패턴 미매칭 → 종합 리서치 (AI검색+법령+판례+해석례 병렬)",
  }
}

/**
 * 쿼리 의도 분석 결과 (디버깅/로깅용)
 */
export function explainRoute(query: string): string {
  const result = routeQuery(query)
  let explanation = `질의: "${query}"\n`
  explanation += `도구: ${result.tool}\n`
  explanation += `근거: ${result.reason}\n`
  explanation += `파라미터: ${JSON.stringify(result.params, null, 2)}\n`

  if (result.pipeline) {
    explanation += `파이프라인:\n`
    for (const step of result.pipeline) {
      explanation += `  → ${step.tool}(${JSON.stringify(step.params)})\n`
    }
  }

  return explanation
}
