"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { useLocaleText } from "../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";
import styles from "./page.module.css";

type CollaborationTab =
  | "messenger"
  | "meeting"
  | "mail"
  | "drive"
  | "notes"
  | "board"
  | "calendar"
  | "contacts"
  | "clients"
  | "tax"
  | "knowledge";

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  createdAt: string;
}

interface MeetingItem {
  id: string;
  title: string;
  startsAt: string;
  location: string;
}

interface MailItem {
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  unread: boolean;
}

interface NoteItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface BoardPost {
  id: string;
  category: string;
  title: string;
  author: string;
  createdAt: string;
}

interface MessageItem {
  id: string;
  author: string;
  body: string;
  at: string;
}

interface CalendarItem {
  id: string;
  title: string;
  startsAt: string;
  owner: string;
}

interface ContactItem {
  id: string;
  name: string;
  department: string;
  email: string;
  phone: string;
}

interface ClientItem {
  id: string;
  name: string;
  owner: string;
  status: string;
  updatedAt: string;
}

interface TaxInvoiceItem {
  id: string;
  invoiceNo: string;
  partner: string;
  amount: number;
  status: string;
  issuedAt: string;
}

interface GuideItem {
  id: string;
  category: string;
  title: string;
  target: CollaborationTab;
  owner: string;
  updatedAt: string;
}

const DEFAULT_MEETINGS: MeetingItem[] = [
  {
    id: "meeting-1",
    title: "주간 운영 점검",
    startsAt: "2026-03-17T10:00:00",
    location: "화상회의 링크"
  },
  {
    id: "meeting-2",
    title: "인사/근태 정책 리뷰",
    startsAt: "2026-03-18T14:00:00",
    location: "회의실 A"
  }
];

const DEFAULT_MAILS: MailItem[] = [
  {
    id: "mail-1",
    subject: "결재 대기 문서 안내",
    sender: "workflow@urimodu.local",
    receivedAt: "2026-03-16T08:42:00",
    unread: true
  },
  {
    id: "mail-2",
    subject: "근태 이상 패턴 리포트",
    sender: "attendance@urimodu.local",
    receivedAt: "2026-03-16T07:15:00",
    unread: true
  },
  {
    id: "mail-3",
    subject: "경비 청구 승인 완료",
    sender: "finance@urimodu.local",
    receivedAt: "2026-03-15T18:22:00",
    unread: false
  }
];

const DEFAULT_BOARD_POSTS: BoardPost[] = [
  {
    id: "board-1",
    category: "공지",
    title: "v0.1.1-alpha.1 안정화 릴리스 안내",
    author: "관리자",
    createdAt: "2026-03-16T09:00:00"
  },
  {
    id: "board-2",
    category: "운영",
    title: "근태 정정 신청 처리 SLA 공유",
    author: "인사팀",
    createdAt: "2026-03-15T16:20:00"
  }
];

const DEFAULT_MESSAGES: Record<string, MessageItem[]> = {
  general: [
    { id: "m-1", author: "관리자", body: "오늘 결재 대기 건 우선 처리 부탁드립니다.", at: "09:10" },
    { id: "m-2", author: "인사담당자", body: "근태 정정 건 2건 확인 중입니다.", at: "09:14" }
  ],
  hr: [{ id: "m-3", author: "HR", body: "신규 입사자 온보딩 체크리스트 공유합니다.", at: "10:02" }],
  finance: [{ id: "m-4", author: "재무", body: "영수증 누락 건 재업로드 요청했습니다.", at: "10:31" }]
};

const DEFAULT_CALENDAR: CalendarItem[] = [
  {
    id: "cal-1",
    title: "급여 마감 일정",
    startsAt: "2026-03-20T14:00:00",
    owner: "재무팀"
  },
  {
    id: "cal-2",
    title: "근태 정정 점검",
    startsAt: "2026-03-21T10:00:00",
    owner: "인사팀"
  }
];

const DEFAULT_CONTACTS: ContactItem[] = [
  {
    id: "contact-1",
    name: "김민수",
    department: "인사팀",
    email: "hr-manager@acme.local",
    phone: "010-2222-3333"
  },
  {
    id: "contact-2",
    name: "박서연",
    department: "재무팀",
    email: "finance-lead@acme.local",
    phone: "010-1234-5678"
  }
];

const DEFAULT_CLIENTS: ClientItem[] = [
  {
    id: "client-1",
    name: "한빛솔루션",
    owner: "영업1팀",
    status: "진행중",
    updatedAt: "2026-03-16T09:10:00"
  },
  {
    id: "client-2",
    name: "새봄커머스",
    owner: "영업2팀",
    status: "견적완료",
    updatedAt: "2026-03-15T14:40:00"
  }
];

const DEFAULT_TAX_INVOICES: TaxInvoiceItem[] = [
  {
    id: "tax-1",
    invoiceNo: "TX-2026-0316-01",
    partner: "한빛솔루션",
    amount: 1320000,
    status: "발행완료",
    issuedAt: "2026-03-16T13:20:00"
  },
  {
    id: "tax-2",
    invoiceNo: "TX-2026-0315-03",
    partner: "새봄커머스",
    amount: 550000,
    status: "대기",
    issuedAt: "2026-03-15T10:05:00"
  }
];

const GUIDE_LIBRARY: GuideItem[] = [
  {
    id: "guide-hr-1",
    category: "인사관리",
    title: "입사자 등록과 조직 배치 체크리스트",
    target: "contacts",
    owner: "인사팀",
    updatedAt: "2026-03-15T09:40:00"
  },
  {
    id: "guide-hr-2",
    category: "인사관리",
    title: "직원 프로필 업데이트 표준 흐름",
    target: "contacts",
    owner: "인사팀",
    updatedAt: "2026-03-14T17:10:00"
  },
  {
    id: "guide-att-1",
    category: "근태·휴가",
    title: "근태 정정 요청 접수 및 처리 가이드",
    target: "calendar",
    owner: "운영팀",
    updatedAt: "2026-03-16T13:00:00"
  },
  {
    id: "guide-att-2",
    category: "근태·휴가",
    title: "휴가 신청 전 검증 항목",
    target: "calendar",
    owner: "운영팀",
    updatedAt: "2026-03-13T11:22:00"
  },
  {
    id: "guide-wf-1",
    category: "전자결재",
    title: "결재 문서 작성부터 승인 완료까지",
    target: "board",
    owner: "결재지원",
    updatedAt: "2026-03-15T14:32:00"
  },
  {
    id: "guide-fn-1",
    category: "재무·세무",
    title: "거래처 등록 후 세금 문서 발행 절차",
    target: "tax",
    owner: "재무팀",
    updatedAt: "2026-03-16T10:15:00"
  },
  {
    id: "guide-fn-2",
    category: "재무·세무",
    title: "영수증 첨부 기반 경비 정산 점검표",
    target: "drive",
    owner: "재무팀",
    updatedAt: "2026-03-12T15:45:00"
  },
  {
    id: "guide-op-1",
    category: "운영·보안",
    title: "문서 보관 정책과 열람 권한 기준",
    target: "drive",
    owner: "운영보안",
    updatedAt: "2026-03-11T16:05:00"
  },
  {
    id: "guide-collab-1",
    category: "협업·커뮤니케이션",
    title: "공지/회의/메신저 연동 운영법",
    target: "meeting",
    owner: "협업TF",
    updatedAt: "2026-03-10T12:18:00"
  }
];

const CHANNELS = [
  { key: "general", ko: "전체", en: "General" },
  { key: "hr", ko: "인사", en: "HR" },
  { key: "finance", ko: "재무", en: "Finance" }
] as const;

function asTab(value: string | null): CollaborationTab {
  if (
    value === "messenger" ||
    value === "meeting" ||
    value === "mail" ||
    value === "drive" ||
    value === "notes" ||
    value === "board" ||
    value === "calendar" ||
    value === "contacts" ||
    value === "clients" ||
    value === "tax" ||
    value === "knowledge"
  ) {
    return value;
  }
  return "messenger";
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export default function CollaborationPage() {
  const router = useRouter();
  const t = useLocaleText();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [activeTab, setActiveTab] = useState<CollaborationTab>("messenger");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedChannel, setSelectedChannel] = useState<(typeof CHANNELS)[number]["key"]>("general");
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, MessageItem[]>>(DEFAULT_MESSAGES);
  const [messageDraft, setMessageDraft] = useState("");

  const [meetings, setMeetings] = useState<MeetingItem[]>(DEFAULT_MEETINGS);
  const [meetingDraft, setMeetingDraft] = useState({
    title: "",
    startsAt: "",
    location: ""
  });

  const [mails, setMails] = useState<MailItem[]>(DEFAULT_MAILS);
  const [mailUnreadOnly, setMailUnreadOnly] = useState(false);

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [noteDraft, setNoteDraft] = useState({ title: "", body: "" });

  const [posts, setPosts] = useState<BoardPost[]>(DEFAULT_BOARD_POSTS);
  const [postDraft, setPostDraft] = useState({ category: "일반", title: "", author: "" });

  const [driveQuery, setDriveQuery] = useState("");
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>(DEFAULT_CALENDAR);
  const [calendarDraft, setCalendarDraft] = useState({ title: "", startsAt: "", owner: "" });
  const [contacts, setContacts] = useState<ContactItem[]>(DEFAULT_CONTACTS);
  const [contactDraft, setContactDraft] = useState({ name: "", department: "", email: "", phone: "" });
  const [clients, setClients] = useState<ClientItem[]>(DEFAULT_CLIENTS);
  const [clientDraft, setClientDraft] = useState({ name: "", owner: "", status: "진행중" });
  const [taxInvoices, setTaxInvoices] = useState<TaxInvoiceItem[]>(DEFAULT_TAX_INVOICES);
  const [taxDraft, setTaxDraft] = useState({ partner: "", amount: "", status: "대기" });
  const [guideQuery, setGuideQuery] = useState("");
  const [selectedGuideCategory, setSelectedGuideCategory] = useState("전체");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function syncTabFromUrl() {
      const params = new URLSearchParams(window.location.search);
      setActiveTab(asTab(params.get("tab")));
    }

    syncTabFromUrl();
    window.addEventListener("popstate", syncTabFromUrl);
    return () => window.removeEventListener("popstate", syncTabFromUrl);
  }, []);

  useEffect(() => {
    async function run() {
      const loaded = loadSession();
      if (!loaded) {
        router.push("/login");
        return;
      }

      setSession(loaded);
      setLoadingFiles(true);
      setError(null);
      try {
        const fileRows = await apiRequest<FileItem[]>("/files", {
          token: loaded.token,
          companyId: requireCompanyId(loaded)
        });
        setFiles(fileRows);
      } catch (loadError) {
        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError(t("협업 허브 데이터를 불러오지 못했습니다.", "Failed to load collaboration hub data."));
        }
      } finally {
        setLoadingFiles(false);
      }
    }

    void run();
  }, [router, t]);

  const activeMessages = useMemo(() => messagesByChannel[selectedChannel] ?? [], [messagesByChannel, selectedChannel]);
  const filteredMails = useMemo(
    () => (mailUnreadOnly ? mails.filter((mail) => mail.unread) : mails),
    [mailUnreadOnly, mails]
  );
  const filteredFiles = useMemo(() => {
    const normalizedQuery = driveQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return files;
    }
    return files.filter((file) => file.originalName.toLowerCase().includes(normalizedQuery));
  }, [driveQuery, files]);
  const guideCategories = useMemo(() => {
    const categories = Array.from(new Set(GUIDE_LIBRARY.map((item) => item.category)));
    return [t("전체", "All"), ...categories];
  }, [t]);
  const filteredGuides = useMemo(() => {
    const normalizedQuery = guideQuery.trim().toLowerCase();
    return GUIDE_LIBRARY.filter((guide) => {
      const categoryMatches =
        selectedGuideCategory === t("전체", "All") || guide.category === selectedGuideCategory;
      if (!categoryMatches) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const searchable = `${guide.category} ${guide.title} ${guide.owner}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [guideQuery, selectedGuideCategory, t]);

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextBody = messageDraft.trim();
    if (!nextBody) {
      return;
    }

    setMessagesByChannel((current) => ({
      ...current,
      [selectedChannel]: [
        ...(current[selectedChannel] ?? []),
        {
          id: createId("msg"),
          author: t("나", "Me"),
          body: nextBody,
          at: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
        }
      ]
    }));
    setMessageDraft("");
  }

  function submitMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!meetingDraft.title.trim() || !meetingDraft.startsAt.trim()) {
      return;
    }
    setMeetings((current) => [
      {
        id: createId("meeting"),
        title: meetingDraft.title.trim(),
        startsAt: meetingDraft.startsAt,
        location: meetingDraft.location.trim() || t("미정", "TBD")
      },
      ...current
    ]);
    setMeetingDraft({ title: "", startsAt: "", location: "" });
  }

  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteDraft.title.trim()) {
      return;
    }
    setNotes((current) => [
      {
        id: createId("note"),
        title: noteDraft.title.trim(),
        body: noteDraft.body.trim(),
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
    setNoteDraft({ title: "", body: "" });
  }

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!postDraft.title.trim()) {
      return;
    }
    setPosts((current) => [
      {
        id: createId("post"),
        category: postDraft.category.trim() || t("일반", "General"),
        title: postDraft.title.trim(),
        author: postDraft.author.trim() || t("익명", "Anonymous"),
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
    setPostDraft({ category: "일반", title: "", author: "" });
  }

  function submitCalendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!calendarDraft.title.trim() || !calendarDraft.startsAt.trim()) {
      return;
    }
    setCalendarItems((current) => [
      {
        id: createId("cal"),
        title: calendarDraft.title.trim(),
        startsAt: calendarDraft.startsAt,
        owner: calendarDraft.owner.trim() || t("미지정", "Unassigned")
      },
      ...current
    ]);
    setCalendarDraft({ title: "", startsAt: "", owner: "" });
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contactDraft.name.trim()) {
      return;
    }
    setContacts((current) => [
      {
        id: createId("contact"),
        name: contactDraft.name.trim(),
        department: contactDraft.department.trim() || t("미지정", "Unassigned"),
        email: contactDraft.email.trim() || "-",
        phone: contactDraft.phone.trim() || "-"
      },
      ...current
    ]);
    setContactDraft({ name: "", department: "", email: "", phone: "" });
  }

  function submitClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientDraft.name.trim()) {
      return;
    }
    setClients((current) => [
      {
        id: createId("client"),
        name: clientDraft.name.trim(),
        owner: clientDraft.owner.trim() || t("미지정", "Unassigned"),
        status: clientDraft.status.trim() || t("진행중", "In progress"),
        updatedAt: new Date().toISOString()
      },
      ...current
    ]);
    setClientDraft({ name: "", owner: "", status: "진행중" });
  }

  function submitTaxInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taxDraft.partner.trim() || !taxDraft.amount.trim()) {
      return;
    }
    const amount = Number(taxDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    setTaxInvoices((current) => [
      {
        id: createId("tax"),
        invoiceNo: `TX-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(current.length + 1).padStart(2, "0")}`,
        partner: taxDraft.partner.trim(),
        amount,
        status: taxDraft.status.trim() || t("대기", "Pending"),
        issuedAt: new Date().toISOString()
      },
      ...current
    ]);
    setTaxDraft({ partner: "", amount: "", status: "대기" });
  }

  function toggleMailRead(mailId: string) {
    setMails((current) =>
      current.map((mail) =>
        mail.id === mailId
          ? {
              ...mail,
              unread: !mail.unread
            }
          : mail
      )
    );
  }

  function changeTab(tabId: CollaborationTab) {
    if (tabId === activeTab) {
      return;
    }

    setActiveTab(tabId);
    const nextParams = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    nextParams.set("tab", tabId);
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `/collaboration?${nextQuery}` : "/collaboration", { scroll: false });
  }

  const tabs: Array<{ id: CollaborationTab; labelKo: string; labelEn: string }> = [
    { id: "messenger", labelKo: "메신저", labelEn: "Messenger" },
    { id: "meeting", labelKo: "회의", labelEn: "Meetings" },
    { id: "mail", labelKo: "메일", labelEn: "Mail" },
    { id: "drive", labelKo: "드라이브", labelEn: "Drive" },
    { id: "calendar", labelKo: "일정", labelEn: "Calendar" },
    { id: "contacts", labelKo: "연락처", labelEn: "Contacts" },
    { id: "clients", labelKo: "거래처", labelEn: "Clients" },
    { id: "tax", labelKo: "세금계산", labelEn: "Tax Invoice" },
    { id: "knowledge", labelKo: "업무 가이드", labelEn: "Work Guide" },
    { id: "notes", labelKo: "노트", labelEn: "Notes" },
    { id: "board", labelKo: "게시판", labelEn: "Board" }
  ];

  const guideRows: Array<{ titleKo: string; titleEn: string; tab: CollaborationTab; hintKo: string; hintEn: string }> = [
    {
      titleKo: "1단계. 기본 협업 채널 열기",
      titleEn: "Step 1. Open collaboration channels",
      tab: "messenger",
      hintKo: "팀 공지/질문을 먼저 메신저 채널로 정리합니다.",
      hintEn: "Start with messenger channels for announcements and Q&A."
    },
    {
      titleKo: "2단계. 일정과 회의 연결",
      titleEn: "Step 2. Connect schedule and meetings",
      tab: "calendar",
      hintKo: "일정 등록 후 회의 탭에서 세부 정보를 완성합니다.",
      hintEn: "Register schedule first, then finalize details in meetings."
    },
    {
      titleKo: "3단계. 거래처/세금문서 정리",
      titleEn: "Step 3. Manage clients and tax docs",
      tab: "clients",
      hintKo: "거래처 상태와 세금계산 발행 상태를 함께 확인합니다.",
      hintEn: "Track client status alongside tax invoice status."
    },
    {
      titleKo: "4단계. 업무 가이드 확인",
      titleEn: "Step 4. Review operation guides",
      tab: "knowledge",
      hintKo: "카테고리별 문서를 검색해 바로 해당 모듈로 이동합니다.",
      hintEn: "Search categorized docs and jump to the related module."
    }
  ];

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className={`app-shell-content ${styles.collabContent}`}>
        <header className={styles.header}>
          <div>
            <h1>{t("협업 허브", "Collaboration Hub")}</h1>
            <p>
              {t(
                "협업 영역(메신저, 회의, 메일, 드라이브, 노트, 게시판)을 ERP 내부 허브로 구성했습니다.",
                "Built an in-product collaboration hub with messenger, meetings, mail, drive, notes, and board sections."
              )}
            </p>
          </div>
          <div className={styles.headerBadge}>
            <strong>{t("운영 모드", "Operating mode")}</strong>
            <span>{t("한국어 기본 / 영어 전환 가능", "Korean default / English switch available")}</span>
          </div>
        </header>

        <section className={styles.guideBoard}>
          <h2>{t("운영 가이드 흐름", "Operational guide flow")}</h2>
          <div className={styles.guideGrid}>
            {guideRows.map((row) => (
              <button
                key={row.titleKo}
                type="button"
                className={styles.guideCard}
                onClick={() => changeTab(row.tab)}
              >
                <strong>{t(row.titleKo, row.titleEn)}</strong>
                <span>{t(row.hintKo, row.hintEn)}</span>
              </button>
            ))}
          </div>
        </section>

        <div className={styles.tabs} role="tablist" aria-label={t("협업 탭", "Collaboration tabs")}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
              onClick={() => changeTab(tab.id)}
            >
              {t(tab.labelKo, tab.labelEn)}
            </button>
          ))}
        </div>

        {activeTab === "messenger" ? (
          <section className={styles.panel}>
            <div className={styles.twoColumn}>
              <aside className={styles.subPanel}>
                <h2>{t("채널", "Channels")}</h2>
                <div className={styles.channelList}>
                  {CHANNELS.map((channel) => (
                    <button
                      key={channel.key}
                      type="button"
                      className={`${styles.channelButton} ${selectedChannel === channel.key ? styles.channelButtonActive : ""}`}
                      onClick={() => setSelectedChannel(channel.key)}
                    >
                      #{t(channel.ko, channel.en)}
                    </button>
                  ))}
                </div>
              </aside>
              <div className={styles.subPanel}>
                <h2>{t("대화", "Conversation")}</h2>
                <div className={styles.messageList}>
                  {activeMessages.map((message) => (
                    <article key={message.id} className={styles.messageItem}>
                      <strong>{message.author}</strong>
                      <p>{message.body}</p>
                      <span>{message.at}</span>
                    </article>
                  ))}
                </div>
                <form className={styles.inlineForm} onSubmit={submitMessage}>
                  <input
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    placeholder={t("메시지를 입력하세요", "Type a message")}
                  />
                  <button type="submit">{t("전송", "Send")}</button>
                </form>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "meeting" ? (
          <section className={styles.panel}>
            <h2>{t("회의 일정", "Meeting schedule")}</h2>
            <form className={styles.formGrid} onSubmit={submitMeeting}>
              <label>
                {t("회의명", "Meeting title")}
                <input
                  value={meetingDraft.title}
                  onChange={(event) => setMeetingDraft((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label>
                {t("시작 시각", "Start time")}
                <input
                  type="datetime-local"
                  value={meetingDraft.startsAt}
                  onChange={(event) => setMeetingDraft((current) => ({ ...current, startsAt: event.target.value }))}
                />
              </label>
              <label>
                {t("장소/링크", "Location / link")}
                <input
                  value={meetingDraft.location}
                  onChange={(event) => setMeetingDraft((current) => ({ ...current, location: event.target.value }))}
                />
              </label>
              <button type="submit">{t("회의 추가", "Add meeting")}</button>
            </form>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("회의명", "Title")}</th>
                  <th>{t("시작", "Starts at")}</th>
                  <th>{t("장소", "Location")}</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((meeting) => (
                  <tr key={meeting.id}>
                    <td>{meeting.title}</td>
                    <td>{new Date(meeting.startsAt).toLocaleString()}</td>
                    <td>{meeting.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {activeTab === "mail" ? (
          <section className={styles.panel}>
            <div className="inline-actions">
              <h2>{t("메일함", "Inbox")}</h2>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={mailUnreadOnly}
                  onChange={(event) => setMailUnreadOnly(event.target.checked)}
                />
                {t("안읽은 메일만", "Unread only")}
              </label>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("상태", "State")}</th>
                  <th>{t("제목", "Subject")}</th>
                  <th>{t("보낸사람", "Sender")}</th>
                  <th>{t("수신일", "Received")}</th>
                  <th>{t("동작", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMails.map((mail) => (
                  <tr key={mail.id}>
                    <td>{mail.unread ? t("안읽음", "Unread") : t("읽음", "Read")}</td>
                    <td>{mail.subject}</td>
                    <td>{mail.sender}</td>
                    <td>{new Date(mail.receivedAt).toLocaleString()}</td>
                    <td>
                      <button type="button" onClick={() => toggleMailRead(mail.id)}>
                        {mail.unread ? t("읽음 처리", "Mark read") : t("안읽음 처리", "Mark unread")}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMails.length === 0 ? (
                  <tr>
                    <td colSpan={5}>{t("표시할 메일이 없습니다.", "No messages to display.")}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        ) : null}

        {activeTab === "drive" ? (
          <section className={styles.panel}>
            <div className={styles.driveHeader}>
              <h2>{t("드라이브 (파일 연동)", "Drive (file integration)")}</h2>
              <input
                value={driveQuery}
                onChange={(event) => setDriveQuery(event.target.value)}
                placeholder={t("파일명 검색", "Search file name")}
                aria-label={t("파일명 검색", "Search file name")}
              />
            </div>
            {loadingFiles ? <p className="empty-note">{t("파일 목록 로딩 중...", "Loading files...")}</p> : null}
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("파일명", "File name")}</th>
                  <th>{t("형식", "Type")}</th>
                  <th>{t("등록일", "Created")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file) => (
                  <tr key={file.id}>
                    <td>{file.originalName}</td>
                    <td>{file.mimeType}</td>
                    <td>{new Date(file.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={3}>{t("검색된 파일이 없습니다.", "No matching files.")}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        ) : null}

        {activeTab === "calendar" ? (
          <section className={styles.panel}>
            <h2>{t("일정 관리", "Calendar management")}</h2>
            <form className={styles.formGrid} onSubmit={submitCalendar}>
              <label>
                {t("일정명", "Schedule title")}
                <input
                  value={calendarDraft.title}
                  onChange={(event) => setCalendarDraft((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label>
                {t("시작 시각", "Start time")}
                <input
                  type="datetime-local"
                  value={calendarDraft.startsAt}
                  onChange={(event) => setCalendarDraft((current) => ({ ...current, startsAt: event.target.value }))}
                />
              </label>
              <label>
                {t("담당", "Owner")}
                <input
                  value={calendarDraft.owner}
                  onChange={(event) => setCalendarDraft((current) => ({ ...current, owner: event.target.value }))}
                />
              </label>
              <button type="submit">{t("일정 추가", "Add schedule")}</button>
            </form>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("일정", "Schedule")}</th>
                  <th>{t("시작", "Starts")}</th>
                  <th>{t("담당", "Owner")}</th>
                </tr>
              </thead>
              <tbody>
                {calendarItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{new Date(item.startsAt).toLocaleString()}</td>
                    <td>{item.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {activeTab === "contacts" ? (
          <section className={styles.panel}>
            <h2>{t("연락처", "Contacts")}</h2>
            <form className={styles.formGrid} onSubmit={submitContact}>
              <label>
                {t("이름", "Name")}
                <input
                  value={contactDraft.name}
                  onChange={(event) => setContactDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                {t("부서", "Department")}
                <input
                  value={contactDraft.department}
                  onChange={(event) => setContactDraft((current) => ({ ...current, department: event.target.value }))}
                />
              </label>
              <label>
                {t("이메일", "Email")}
                <input
                  value={contactDraft.email}
                  onChange={(event) => setContactDraft((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                {t("전화번호", "Phone")}
                <input
                  value={contactDraft.phone}
                  onChange={(event) => setContactDraft((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <button type="submit">{t("연락처 등록", "Add contact")}</button>
            </form>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("이름", "Name")}</th>
                  <th>{t("부서", "Department")}</th>
                  <th>{t("이메일", "Email")}</th>
                  <th>{t("전화번호", "Phone")}</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>{contact.name}</td>
                    <td>{contact.department}</td>
                    <td>{contact.email}</td>
                    <td>{contact.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {activeTab === "clients" ? (
          <section className={styles.panel}>
            <h2>{t("거래처 관리", "Client management")}</h2>
            <form className={styles.formGrid} onSubmit={submitClient}>
              <label>
                {t("거래처명", "Client name")}
                <input
                  value={clientDraft.name}
                  onChange={(event) => setClientDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                {t("담당 조직", "Owner team")}
                <input
                  value={clientDraft.owner}
                  onChange={(event) => setClientDraft((current) => ({ ...current, owner: event.target.value }))}
                />
              </label>
              <label>
                {t("상태", "Status")}
                <input
                  value={clientDraft.status}
                  onChange={(event) => setClientDraft((current) => ({ ...current, status: event.target.value }))}
                />
              </label>
              <button type="submit">{t("거래처 등록", "Add client")}</button>
            </form>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("거래처", "Client")}</th>
                  <th>{t("담당", "Owner")}</th>
                  <th>{t("상태", "Status")}</th>
                  <th>{t("갱신", "Updated")}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>{client.owner}</td>
                    <td>{client.status}</td>
                    <td>{new Date(client.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {activeTab === "tax" ? (
          <section className={styles.panel}>
            <h2>{t("세금 문서 관리", "Tax document management")}</h2>
            <form className={styles.formGrid} onSubmit={submitTaxInvoice}>
              <label>
                {t("거래처", "Partner")}
                <input
                  value={taxDraft.partner}
                  onChange={(event) => setTaxDraft((current) => ({ ...current, partner: event.target.value }))}
                />
              </label>
              <label>
                {t("금액", "Amount")}
                <input
                  type="number"
                  min={0}
                  value={taxDraft.amount}
                  onChange={(event) => setTaxDraft((current) => ({ ...current, amount: event.target.value }))}
                />
              </label>
              <label>
                {t("상태", "Status")}
                <select
                  value={taxDraft.status}
                  onChange={(event) => setTaxDraft((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value={t("대기", "Pending")}>{t("대기", "Pending")}</option>
                  <option value={t("발행완료", "Issued")}>{t("발행완료", "Issued")}</option>
                  <option value={t("취소", "Canceled")}>{t("취소", "Canceled")}</option>
                </select>
              </label>
              <button type="submit">{t("문서 등록", "Create record")}</button>
            </form>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("문서번호", "Invoice no.")}</th>
                  <th>{t("거래처", "Partner")}</th>
                  <th>{t("금액", "Amount")}</th>
                  <th>{t("상태", "Status")}</th>
                  <th>{t("발행시각", "Issued at")}</th>
                </tr>
              </thead>
              <tbody>
                {taxInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNo}</td>
                    <td>{invoice.partner}</td>
                    <td>{invoice.amount.toLocaleString()}</td>
                    <td>{invoice.status}</td>
                    <td>{new Date(invoice.issuedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {activeTab === "knowledge" ? (
          <section className={styles.panel}>
            <div className={styles.driveHeader}>
              <h2>{t("업무 가이드 라이브러리", "Operational guide library")}</h2>
              <input
                value={guideQuery}
                onChange={(event) => setGuideQuery(event.target.value)}
                placeholder={t("가이드 검색 (예: 결재, 근태, 세금)", "Search guides (e.g., approvals, attendance, tax)")}
                aria-label={t("가이드 검색", "Search guides")}
              />
            </div>
            <div className={styles.knowledgeLayout}>
              <aside className={styles.knowledgeCategories}>
                {guideCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`${styles.knowledgeCategoryButton} ${selectedGuideCategory === category ? styles.knowledgeCategoryButtonActive : ""}`}
                    onClick={() => setSelectedGuideCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </aside>
              <div className={styles.knowledgeDocs}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("카테고리", "Category")}</th>
                      <th>{t("문서 제목", "Guide title")}</th>
                      <th>{t("관리 조직", "Owner")}</th>
                      <th>{t("최근 수정", "Updated")}</th>
                      <th>{t("동작", "Action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuides.map((guide) => (
                      <tr key={guide.id}>
                        <td>{guide.category}</td>
                        <td>{guide.title}</td>
                        <td>{guide.owner}</td>
                        <td>{new Date(guide.updatedAt).toLocaleString()}</td>
                        <td>
                          <button type="button" onClick={() => changeTab(guide.target)}>
                            {t("연결 모듈 열기", "Open linked module")}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredGuides.length === 0 ? (
                      <tr>
                        <td colSpan={5}>{t("검색 결과가 없습니다.", "No matching guides found.")}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "notes" ? (
          <section className={styles.panel}>
            <h2>{t("노트", "Notes")}</h2>
            <form className={styles.formGrid} onSubmit={submitNote}>
              <label>
                {t("제목", "Title")}
                <input
                  value={noteDraft.title}
                  onChange={(event) => setNoteDraft((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label>
                {t("내용", "Body")}
                <textarea
                  value={noteDraft.body}
                  onChange={(event) => setNoteDraft((current) => ({ ...current, body: event.target.value }))}
                  rows={3}
                />
              </label>
              <button type="submit">{t("노트 저장", "Save note")}</button>
            </form>
            <div className={styles.noteList}>
              {notes.map((note) => (
                <article key={note.id} className={styles.noteCard}>
                  <strong>{note.title}</strong>
                  <p>{note.body || t("내용 없음", "No content")}</p>
                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                </article>
              ))}
              {notes.length === 0 ? <p className="empty-note">{t("작성된 노트가 없습니다.", "No notes yet.")}</p> : null}
            </div>
          </section>
        ) : null}

        {activeTab === "board" ? (
          <section className={styles.panel}>
            <h2>{t("게시판", "Board")}</h2>
            <form className={styles.formGrid} onSubmit={submitPost}>
              <label>
                {t("분류", "Category")}
                <input
                  value={postDraft.category}
                  onChange={(event) => setPostDraft((current) => ({ ...current, category: event.target.value }))}
                />
              </label>
              <label>
                {t("제목", "Title")}
                <input
                  value={postDraft.title}
                  onChange={(event) => setPostDraft((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label>
                {t("작성자", "Author")}
                <input
                  value={postDraft.author}
                  onChange={(event) => setPostDraft((current) => ({ ...current, author: event.target.value }))}
                />
              </label>
              <button type="submit">{t("게시글 등록", "Create post")}</button>
            </form>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("분류", "Category")}</th>
                  <th>{t("제목", "Title")}</th>
                  <th>{t("작성자", "Author")}</th>
                  <th>{t("등록일", "Created")}</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>{post.category}</td>
                    <td>{post.title}</td>
                    <td>{post.author}</td>
                    <td>{new Date(post.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}
