"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { useLocaleText } from "../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";
import styles from "./page.module.css";

type CollaborationTab = "messenger" | "meeting" | "mail" | "drive" | "notes" | "board";

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

const CHANNELS = [
  { key: "general", ko: "전체", en: "General" },
  { key: "hr", ko: "인사", en: "HR" },
  { key: "finance", ko: "재무", en: "Finance" }
] as const;

function asTab(value: string | null): CollaborationTab {
  if (value === "messenger" || value === "meeting" || value === "mail" || value === "drive" || value === "notes" || value === "board") {
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
    { id: "notes", labelKo: "노트", labelEn: "Notes" },
    { id: "board", labelKo: "게시판", labelEn: "Board" }
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
                "WEHAGO 리플릿의 협업 영역(메신저, 회의, 메일, 드라이브, 노트, 게시판)을 ERP 내부 허브로 구성했습니다.",
                "Built an in-product collaboration hub inspired by WEHAGO's messenger, meetings, mail, drive, notes, and board sections."
              )}
            </p>
          </div>
          <div className={styles.headerBadge}>
            <strong>{t("운영 모드", "Operating mode")}</strong>
            <span>{t("한국어 기본 / 영어 전환 가능", "Korean default / English switch available")}</span>
          </div>
        </header>

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
