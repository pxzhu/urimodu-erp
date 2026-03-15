"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent
} from "react";

import { useLocaleText, useUiShell } from "../components/ui-shell-provider";
import styles from "./page.module.css";

interface HeroKpi {
  id: string;
  label: string;
  value: number;
  unit: "%" | "h";
  hint: string;
}

interface StoryBlock {
  id: string;
  title: string;
  description: string;
  previewTitle: string;
  previewItems: string[];
}

interface ParallaxModule {
  id: string;
  label: string;
  summary: string;
  badge: string;
  x: number;
  y: number;
  depth: number;
}

interface InteractiveCard {
  id: string;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  helper: string;
  featured?: boolean;
}

const FALLBACK_INTERACTIVE_CARD: InteractiveCard = {
  id: "fallback",
  title: "Module",
  description: "",
  metricLabel: "",
  metricValue: "",
  helper: ""
};

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

export default function HomePage() {
  const t = useLocaleText();
  const { locale, toggleLocale, theme, toggleTheme } = useUiShell();
  const prefersReducedMotion = usePrefersReducedMotion();

  const heroKpis: HeroKpi[] = [
    {
      id: "hiring-velocity",
      label: t("채용 속도", "Hiring Velocity"),
      value: 38,
      unit: "%",
      hint: t("전월 대비", "vs previous month")
    },
    {
      id: "onboarding-completion",
      label: t("온보딩 완료율", "Onboarding Completion"),
      value: 92,
      unit: "%",
      hint: t("입사 14일 이내", "within first 14 days")
    },
    {
      id: "approval-time",
      label: t("평균 결재 소요", "Avg Approval Time"),
      value: 6,
      unit: "h",
      hint: t("AI 우선순위 적용", "AI-prioritized")
    }
  ];

  const storyBlocks: StoryBlock[] = [
    {
      id: "hire-faster",
      title: "Hire Faster",
      description: t(
        "후보자 풀, 인터뷰 흐름, 채용 상태를 하나의 파이프라인으로 연결해 병목을 줄입니다.",
        "Connect candidate pools, interview flow, and hiring states into one pipeline to remove bottlenecks."
      ),
      previewTitle: t("채용 파이프라인", "Candidate Pipeline"),
      previewItems: [
        t("서류합격 24건", "24 shortlisted"),
        t("면접대기 12건", "12 interviews pending"),
        t("오퍼 협의 5건", "5 offers in negotiation")
      ]
    },
    {
      id: "onboard-smoothly",
      title: "Onboard Smoothly",
      description: t(
        "문서 제출, 체크리스트, 권한 부여를 자동으로 이어 신규 인력의 적응 시간을 단축합니다.",
        "Automate documents, checklists, and access grants to shorten time-to-productivity."
      ),
      previewTitle: t("온보딩 플로우", "Onboarding Flow"),
      previewItems: [
        t("입사서류 완료 81%", "81% paperwork complete"),
        t("권한 프로비저닝 6건", "6 access grants"),
        t("팀 소개 미팅 4건", "4 team-intro sessions")
      ]
    },
    {
      id: "workforce-intelligence",
      title: "See Workforce Intelligence",
      description: t(
        "근태, 성과, 결재 데이터를 통합 분석해 리스크와 다음 액션을 먼저 제안합니다.",
        "Unify attendance, performance, and approval data to surface risks and next-best actions."
      ),
      previewTitle: t("워크포스 인사이트", "Workforce Insights"),
      previewItems: [
        t("주의 필요 팀 2개", "2 teams need attention"),
        t("연장근무 급증 1개 부서", "1 department with overtime spike"),
        t("추천 액션 5건", "5 recommended actions")
      ]
    }
  ];

  const parallaxModules: ParallaxModule[] = [
    {
      id: "recruiting",
      label: "Recruiting",
      summary: t("채용 파이프라인", "Hiring pipeline"),
      badge: t("실시간", "Live"),
      x: 16,
      y: 22,
      depth: 0.42
    },
    {
      id: "onboarding",
      label: "Onboarding",
      summary: t("입사 체크리스트", "Entry checklist"),
      badge: t("자동화", "Auto"),
      x: 29,
      y: 73,
      depth: 0.28
    },
    {
      id: "attendance",
      label: "Attendance",
      summary: t("근태 이상 탐지", "Anomaly detection"),
      badge: t("AI 알림", "AI alert"),
      x: 50,
      y: 15,
      depth: 0.54
    },
    {
      id: "performance",
      label: "Performance",
      summary: t("평가 진행률", "Review progress"),
      badge: t("분석", "Analytics"),
      x: 74,
      y: 28,
      depth: 0.33
    },
    {
      id: "payroll-sync",
      label: "Payroll Sync",
      summary: t("정산 연동", "Finance sync"),
      badge: t("연결", "Connected"),
      x: 82,
      y: 68,
      depth: 0.49
    },
    {
      id: "service-desk",
      label: "Service Desk",
      summary: t("요청/헬프데스크", "Requests & support"),
      badge: t("대기 3건", "3 queued"),
      x: 52,
      y: 86,
      depth: 0.22
    }
  ];

  const interactiveCards: InteractiveCard[] = [
    {
      id: "ai-copilot",
      title: "AI Copilot for HR",
      description: t(
        "인사/운영 맥락을 이해해 다음 액션, 결재 우선순위, 리스크 알림을 제안합니다.",
        "Understands HR operations context and recommends next actions, priorities, and risk alerts."
      ),
      metricLabel: t("오늘 제안", "Suggestions today"),
      metricValue: "14",
      helper: t("우선순위 높은 승인 4건", "4 high-priority approvals"),
      featured: true
    },
    {
      id: "recruitment",
      title: "Recruitment",
      description: t("후보자 전환률을 추적", "Track candidate conversion"),
      metricLabel: t("전환률", "Conversion"),
      metricValue: "31%",
      helper: t("면접 일정 자동 제안", "Interview slots auto-suggested")
    },
    {
      id: "employee-profile",
      title: "Employee Profile",
      description: t("핵심 인력 데이터 허브", "Unified employee profile"),
      metricLabel: t("프로필 완성도", "Profile completeness"),
      metricValue: "96%",
      helper: t("누락 항목 자동 감지", "Missing fields auto-detected")
    },
    {
      id: "attendance-leave",
      title: "Attendance & Leave",
      description: t("근태/휴가 리스크 사전 감지", "Early attendance risk detection"),
      metricLabel: t("이상 알림", "Alerts"),
      metricValue: "7",
      helper: t("야간/교대 패턴 집중 모니터링", "Night-shift pattern watch")
    },
    {
      id: "performance-review",
      title: "Performance Review",
      description: t("조직 단위 평가 진행 가시화", "Review cycle visibility"),
      metricLabel: t("완료율", "Completion"),
      metricValue: "78%",
      helper: t("지연 리뷰 자동 리마인드", "Auto reminder for overdue reviews")
    },
    {
      id: "approvals-workflow",
      title: "Approvals & Workflow",
      description: t("결재 병목을 흐름 단위로 해소", "Clear bottlenecks by flow"),
      metricLabel: t("평균 처리", "Avg turnaround"),
      metricValue: "5.6h",
      helper: t("지연 단계 AI 라우팅 제안", "AI routing for delayed steps")
    }
  ];

  const timelineItems = [
    t("09:12 신규 후보자 3명 자동 분류", "09:12 Auto-classified 3 new candidates"),
    t("10:05 온보딩 문서 누락 알림 전송", "10:05 Sent onboarding document reminder"),
    t("11:20 결재 병목 단계 우선순위 상향", "11:20 Elevated stalled approval priority"),
    t("13:45 근태 이상 패턴 감지", "13:45 Detected attendance anomaly pattern")
  ];

  const quickActions = [
    t("채용 브리프 생성", "Generate hiring brief"),
    t("온보딩 체크리스트 실행", "Run onboarding checklist"),
    t("결재 대기 정리", "Clear approval queue")
  ];

  const firstInteractiveCard = interactiveCards[0] ?? FALLBACK_INTERACTIVE_CARD;

  const [kpiValues, setKpiValues] = useState<number[]>(() => heroKpis.map(() => 0));
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState(firstInteractiveCard.id);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const [parallaxScrollShift, setParallaxScrollShift] = useState(0);

  const storyRefs = useRef<Array<HTMLElement | null>>([]);

  const selectedCard =
    interactiveCards.find((card) => card.id === selectedCardId) ?? firstInteractiveCard;

  useEffect(() => {
    if (prefersReducedMotion) {
      setKpiValues(heroKpis.map((metric) => metric.value));
      return;
    }

    let rafId = 0;
    const duration = 1300;
    const startAt = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setKpiValues(heroKpis.map((metric) => metric.value * eased));

      if (progress < 1) {
        rafId = window.requestAnimationFrame(animate);
      }
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [locale, prefersReducedMotion]);

  useEffect(() => {
    let rafId = 0;

    const updateScrollState = () => {
      const anchor = window.innerHeight * 0.4;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      storyRefs.current.forEach((node, index) => {
        if (!node) {
          return;
        }

        const rect = node.getBoundingClientRect();
        const center = rect.top + rect.height * 0.42;
        const distance = Math.abs(center - anchor);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      setActiveStoryIndex((current) => (current === nearestIndex ? current : nearestIndex));

      const nextShift = prefersReducedMotion ? 0 : Math.min(96, window.scrollY * 0.06);
      setParallaxScrollShift((current) =>
        Math.abs(current - nextShift) < 0.35 ? current : nextShift
      );
    };

    const onScrollOrResize = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }

      rafId = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      window.cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  function formatKpi(metric: HeroKpi, currentValue: number) {
    const rounded = Math.round(currentValue);

    if (metric.unit === "h") {
      return `${rounded}h`;
    }

    return `${rounded}%`;
  }

  function handleParallaxPointerMove(event: MouseEvent<HTMLElement>) {
    if (prefersReducedMotion) {
      return;
    }

    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5;

    setParallaxOffset({
      x: relativeX * 22,
      y: relativeY * 16
    });
  }

  function handleParallaxPointerLeave() {
    setParallaxOffset({ x: 0, y: 0 });
  }

  const sceneStyle = {
    ["--parallax-x" as "--parallax-x"]: `${parallaxOffset.x}px`,
    ["--parallax-y" as "--parallax-y"]: `${parallaxOffset.y}px`,
    ["--parallax-scroll" as "--parallax-scroll"]: `${parallaxScrollShift}px`
  } as CSSProperties;

  return (
    <main className={`container ${styles.page}`}>
      <div className={styles.auroraLayer} aria-hidden />

      <header className={styles.utilityBar}>
        <div className={styles.brandGroup}>
          <span className={styles.brandMark}>URIMODU ERP</span>
          <span className={styles.versionChip}>2026 AI-Native</span>
        </div>

        <div className={styles.utilityActions}>
          <button type="button" onClick={toggleLocale} className={styles.ghostControl}>
            {locale === "ko" ? "EN" : "KO"}
          </button>
          <button type="button" onClick={toggleTheme} className={styles.ghostControl}>
            {theme === "dark" ? t("라이트", "Light") : t("다크", "Dark")}
          </button>
          <Link href="/login" className={styles.inlineLink}>
            {t("로그인", "Login")}
          </Link>
        </div>
      </header>

      <section className={styles.heroSection}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>AI-Powered HR Operations</p>
          <h1 className={styles.heroTitle}>{t("ERP System 2026. 인사와 운영을 하나의 흐름으로.", "ERP System 2026. One flow for people and operations.")}</h1>
          <p className={styles.heroBody}>
            {t(
              "채용, 온보딩, 근태, 평가, 승인, 인사이트까지 AI가 맥락을 이해하고 다음 액션을 제안합니다.",
              "From recruiting and onboarding to attendance, reviews, approvals, and insights, AI understands context and suggests what to do next."
            )}
          </p>

          <div className={styles.heroCtas}>
            <Link href="/login" className={`${styles.ctaButton} ${styles.ctaPrimary}`}>
              {t("데모 요청하기", "Request Demo")}
            </Link>
            <a href="#workflow-story" className={`${styles.ctaButton} ${styles.ctaSecondary}`}>
              {t("모듈 살펴보기", "Explore Modules")}
            </a>
          </div>

          <ul className={styles.trustList}>
            <li>{t("모듈형 모놀리스 기반의 안정적인 운영", "Stable operations on a modular-monolith core")}</li>
            <li>{t("감사로그/결재흐름 중심의 엔터프라이즈 신뢰성", "Enterprise trust with audit-first workflows")}</li>
            <li>{t("Self-hosted + Web-native 경험", "Self-hosted with web-native experience")}</li>
          </ul>
        </div>

        <div className={styles.dashboardFrame} aria-label={t("AI 운영 대시보드 미리보기", "AI operations dashboard preview")}>
          <div className={styles.frameTopBar}>
            <div className={styles.frameDots}>
              <span />
              <span />
              <span />
            </div>
            <span className={styles.frameTitle}>AI HR Command Center</span>
          </div>

          <div className={styles.dashboardBody}>
            <aside className={styles.dashboardSidebar}>
              <span>{t("개요", "Overview")}</span>
              <span>{t("채용", "Recruiting")}</span>
              <span>{t("온보딩", "Onboarding")}</span>
              <span>{t("근태", "Attendance")}</span>
              <span>{t("승인", "Approvals")}</span>
            </aside>

            <div className={styles.dashboardMain}>
              <div className={styles.copilotBar}>
                <span className={styles.copilotLabel}>AI Copilot</span>
                <input
                  readOnly
                  value={t("이번 주 인사 운영 리스크 요약해줘", "Summarize this week's HR operation risks")}
                  aria-label={t("AI 코파일럿 검색", "AI copilot search")}
                />
              </div>

              <div className={styles.kpiGrid}>
                {heroKpis.map((metric, index) => (
                  <article key={metric.id} className={styles.kpiCard}>
                    <p>{metric.label}</p>
                    <strong>{formatKpi(metric, kpiValues[index] ?? metric.value)}</strong>
                    <span>{metric.hint}</span>
                  </article>
                ))}
              </div>

              <div className={styles.dashboardPanels}>
                <section className={styles.activityPanel}>
                  <h3>{t("실시간 운영 타임라인", "Live Operations Timeline")}</h3>
                  <ul>
                    {timelineItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className={styles.chartPanel}>
                  <h3>{t("Workforce Intelligence", "Workforce Intelligence")}</h3>
                  <div className={styles.chartBars}>
                    {[42, 58, 64, 51, 73, 68].map((bar, index) => {
                      const barStyle = {
                        ["--bar-height" as "--bar-height"]: `${bar}%`,
                        ["--bar-delay" as "--bar-delay"]: `${index * 80}ms`
                      } as CSSProperties;

                      return <span key={`workforce-bar-${bar}-${index}`} style={barStyle} />;
                    })}
                  </div>
                  <div className={styles.quickChips}>
                    {quickActions.map((action) => (
                      <span key={action}>{action}</span>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow-story" className={styles.scrollStorySection}>
        <div className={styles.storyStickyColumn}>
          <p className={styles.sectionTag}>{t("Workflow Story", "Workflow Story")}</p>
          <h2>{t("기능 나열이 아닌, 업무 흐름 단순화.", "Not feature lists, but streamlined workflows.")}</h2>
          <p>
            {t(
              "AI가 채용부터 조직 인사이트까지 흐름을 이어주며 다음 액션을 안내합니다.",
              "AI connects recruiting to workforce insights and guides the next action across the workflow."
            )}
          </p>

          <ol className={styles.storyProgress}>
            {storyBlocks.map((block, index) => (
              <li
                key={block.id}
                className={index === activeStoryIndex ? styles.storyProgressActive : undefined}
                aria-current={index === activeStoryIndex ? "step" : undefined}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{block.title}</strong>
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.storyBlocksColumn}>
          {storyBlocks.map((block, index) => (
            <article
              key={block.id}
              ref={(node) => {
                storyRefs.current[index] = node;
              }}
              className={`${styles.storyBlock} ${index === activeStoryIndex ? styles.storyBlockActive : ""}`}
            >
              <div className={styles.storyBlockHeader}>
                <h3>{block.title}</h3>
                <p>{block.description}</p>
              </div>

              <div className={styles.storyPreviewCard}>
                <p>{block.previewTitle}</p>
                <ul>
                  {block.previewItems.map((previewItem) => (
                    <li key={previewItem}>{previewItem}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.parallaxSection}>
        <div className={styles.parallaxHeader}>
          <p className={styles.sectionTag}>{t("Connected Platform", "Connected Platform")}</p>
          <h2>{t("AI HR Core를 중심으로 모든 부서 흐름을 연결합니다.", "Connect every department workflow around an AI HR Core.")}</h2>
        </div>

        <div
          className={styles.parallaxScene}
          style={sceneStyle}
          onMouseMove={handleParallaxPointerMove}
          onMouseLeave={handleParallaxPointerLeave}
        >
          <div className={styles.sceneGridLayer} aria-hidden />
          <div className={styles.sceneConnectorLayer} aria-hidden />

          <div className={styles.sceneCore}>
            <span>AI HR Core</span>
            <small>{t("데이터 + 워크플로우 + 가이드", "Data + Workflow + Guidance")}</small>
          </div>

          {parallaxModules.map((module) => {
            const moduleStyle = {
              left: `${module.x}%`,
              top: `${module.y}%`,
              transform: `translate(-50%, -50%) translate(${parallaxOffset.x * module.depth}px, ${parallaxOffset.y * module.depth - parallaxScrollShift * module.depth * 0.12}px)`
            } as CSSProperties;

            return (
              <article key={module.id} className={styles.moduleCard} style={moduleStyle}>
                <strong>{module.label}</strong>
                <p>{module.summary}</p>
                <span>{module.badge}</span>
              </article>
            );
          })}

          <div className={styles.sceneFloatingMeta} aria-hidden>
            <span>{t("승인 대기 6건", "6 approvals waiting")}</span>
            <span>{t("팀 건강도 87", "Team health 87")}</span>
            <span>{t("온보딩 체크리스트 12건", "12 onboarding checklists")}</span>
          </div>
        </div>
      </section>

      <section className={styles.cardsSection}>
        <div className={styles.cardsHeader}>
          <p className={styles.sectionTag}>{t("Interactive Modules", "Interactive Modules")}</p>
          <h2>{t("주요 HR/ERP 기능을 직접 탐색해보세요.", "Explore critical HR/ERP modules directly.")}</h2>
        </div>

        <div className={styles.cardGrid}>
          {interactiveCards.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`${styles.interactiveCard} ${card.featured ? styles.interactiveCardFeatured : ""} ${card.id === selectedCardId ? styles.interactiveCardActive : ""}`}
              onClick={() => setSelectedCardId(card.id)}
              aria-pressed={card.id === selectedCardId}
            >
              <div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
              <div className={styles.cardMeta}>
                <span>{card.metricLabel}</span>
                <strong>{card.metricValue}</strong>
              </div>
              <small>{card.helper}</small>
            </button>
          ))}
        </div>

        <aside className={styles.cardDetailPanel}>
          <p>{t("선택된 모듈", "Selected module")}</p>
          <h3>{selectedCard.title}</h3>
          <p>{selectedCard.description}</p>
          <div className={styles.detailStats}>
            <span>
              {selectedCard.metricLabel}: <strong>{selectedCard.metricValue}</strong>
            </span>
            <span>{selectedCard.helper}</span>
          </div>
        </aside>
      </section>

      <section className={styles.finalCtaSection}>
        <div className={styles.finalVisualEcho} aria-hidden>
          <div className={styles.finalVisualChip}>AI HR Core</div>
          <div className={styles.finalVisualChip}>{t("승인/근태/인사이트 연결", "Approvals/attendance/insights connected")}</div>
        </div>

        <div className={styles.finalCtaContent}>
          <p className={styles.sectionTag}>{t("Smooth Transition", "Smooth Transition")}</p>
          <h2>{t("복잡한 HR 운영을 더 단순하게.", "Make complex HR operations simpler.")}</h2>
          <p>
            {t(
              "ERP System 2026 데모를 통해 실제 워크플로와 인사이트 경험을 확인해보세요.",
              "Experience real workflows and AI-driven insights with an ERP System 2026 demo."
            )}
          </p>

          <div className={styles.heroCtas}>
            <Link href="/login" className={`${styles.ctaButton} ${styles.ctaPrimary}`}>
              {t("무료 데모 요청", "Request Free Demo")}
            </Link>
            <a href="#" className={`${styles.ctaButton} ${styles.ctaSecondary}`}>
              {t("브로슈어 다운로드", "Download Brochure")}
            </a>
          </div>
        </div>
      </section>

      <span className={styles.srOnly}>{t("모든 인터랙션은 키보드 접근성과 모션 축소 설정을 지원합니다.", "All interactions support keyboard access and reduced-motion preferences.")}</span>
    </main>
  );
}
