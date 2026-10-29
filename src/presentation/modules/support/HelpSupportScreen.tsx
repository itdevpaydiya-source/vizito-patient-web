import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search,
  CalendarDays,
  CreditCard,
  Pill,
  FlaskConical,
  Ambulance,
  Droplet,
  UserRound,
  ChevronDown,
  ChevronRight,
  Plus,
  Headphones,
} from "lucide-react";
import {
  ticketPageApi,
  faqVotesApi,
  voteFaqApi,
  profileError,
  type TicketPage,
} from "../../../services/profileHelpHelper";
import { HELP_TOPICS, HELP_ARTICLES, type HelpArticle } from "./helpContent";
import { TicketForm, TicketThread, ticketStatus } from "./TicketFlows";
import { phDate } from "../profile/ProfileUi";
import "../profile/profileHelp.css";
import VizitoPagination from "../../components/navigation/VizitoPagination";
const topicIcons = {
  calendar: CalendarDays,
  card: CreditCard,
  pill: Pill,
  flask: FlaskConical,
  ambulance: Ambulance,
  drop: Droplet,
  user: UserRound,
};
export default function HelpSupportScreen() {
  const [params, setParams] = useSearchParams();
  const topic = params.get("topic"),
    article = params.get("article"),
    view = params.get("view"),
    ticket = params.get("ticket");
  const [search, setSearch] = useState(params.get("q") || ""),
    [kind, setKind] = useState("All"),
    [openFaq, setOpenFaq] = useState<string | null>(null),
    [showAllFaq, setShowAllFaq] = useState(false),
    [tickets, setTickets] = useState<TicketPage | null>(null),
    [tab, setTab] = useState("all"),
    [ticketSearch, setTicketSearch] = useState(""),
    [page, setPage] = useState(() => Math.max(1, Number(params.get("page")) || 1)),
    [pageSize, setPageSize] = useState<10 | 20>(() => params.get("pageSize") === "20" ? 20 : 10),
    [votes, setVotes] = useState<Record<string, boolean>>({}),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [voting, setVoting] = useState(false),
    [voteNotice, setVoteNotice] = useState("");
  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const result = await ticketPageApi({
        tab: view === "tickets" ? tab : "all",
        search: view === "tickets" ? ticketSearch : "",
        page: view === "tickets" ? page : 1,
        page_size: view === "tickets" ? pageSize : 3,
      });
      if (version !== requestVersion.current) return;
      setTickets(result);
      setError("");
    } catch (e) {
      if (version === requestVersion.current) setError(profileError(e));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [view, tab, ticketSearch, page, pageSize]);
  useEffect(() => {
    void load();
    return () => {
      requestVersion.current++;
    };
  }, [load]);
  useEffect(() => {
    faqVotesApi()
      .then((rows) =>
        setVotes(
          Object.fromEntries(rows.map((v) => [v.article_id, v.helpful])),
        ),
      )
      .catch((e) => setError(profileError(e)));
  }, []);
  const go = (p: Record<string, string>) => {
    setParams(p);
    setOpenFaq(null);
    setSearch(p.q || "");
    setVoteNotice("");
  };
  const results = useMemo(
    () =>
      HELP_ARTICLES.filter(
        (a) =>
          (!topic || a.topic === topic) &&
          (!search.trim() ||
            `${a.question} ${a.answer}`
              .toLowerCase()
              .includes(search.toLowerCase().trim())) &&
          (kind === "All" || a.kind === kind),
      ),
    [search, topic, kind],
  );
  const chosen = HELP_ARTICLES.find((a) => a.id === article);
  const topicData = HELP_TOPICS.find((t) => t.id === topic);
  const vote = async (helpful: boolean) => {
    if (!chosen) return;
    setVoting(true);
    try {
      await voteFaqApi(chosen.id, helpful);
      setVotes((old) => ({ ...old, [chosen.id]: helpful }));
      setVoteNotice("Thank you. Your feedback has been saved.");
      setError("");
    } catch (e) {
      setError(profileError(e));
    } finally {
      setVoting(false);
    }
  };
  const faq = (a: HelpArticle) => (
    <article className="ph-faq" key={a.id}>
      <button
        aria-expanded={openFaq === a.id}
        onClick={() => setOpenFaq(openFaq === a.id ? null : a.id)}
      >
        {a.question}
        <ChevronDown size={15} />
      </button>
      {openFaq === a.id && (
        <div>
          <p>{a.answer}</p>
          <button className="ph-link" onClick={() => go({ article: a.id })}>
            Read article & feedback →
          </button>
        </div>
      )}
    </article>
  );
  const ticketCards = () =>
    tickets?.items.map((t) => (
      <button
        key={t.id}
        className="ph-ticket"
        onClick={() => go({ ticket: t.id })}
      >
        <div className="ph-row">
          <b>{t.ticket_number}</b>
          <span className="ph-badge" data-status={t.status}>
            {ticketStatus(t.status)}
          </span>
        </div>
        <p style={{ marginTop: 5 }}>{t.subject}</p>
        <small>
          {t.category} · {phDate(t.created_at)}
        </small>
      </button>
    ));
  return (
    <div className="ph-page ph-stack">
      <header>
        <h1 className="ph-title">
          <UserRound />
          Help & support
        </h1>
        <p className="ph-sub">
          Find answers, get help with your bookings or contact our support team.
        </p>
      </header>
      {ticket ? (
        <TicketThread
          key={ticket}
          id={ticket}
          onBack={() => go({ view: "tickets" })}
        />
      ) : view === "raise" || params.get("booking") ? (
        <>
          <button className="ph-link" onClick={() => go({})}>
            ← Back to Help & support
          </button>
          <TicketForm
            booking={params.get("booking")}
            onCancel={() => go({})}
            onCreated={(t) => {
              go({ ticket: t.id });
              void load();
            }}
          />
        </>
      ) : chosen ? (
        <section className="ph-card ph-stack">
          <button
            className="ph-link"
            onClick={() => go({ topic: chosen.topic })}
          >
            ← Help & support ›{" "}
            {HELP_TOPICS.find((t) => t.id === chosen.topic)?.name}
          </button>
          <h1>{chosen.question}</h1>
          <p style={{ lineHeight: 1.9, fontSize: 14 }}>{chosen.answer}</p>
          {chosen.link && (
            <Link className="ph-btn" to={chosen.link.to}>
              {chosen.link.label}
            </Link>
          )}
          <div className="ph-row" style={{ justifyContent: "flex-start" }}>
            <b>Was this helpful?</b>
            {[true, false].map((v) => (
              <button
                className="ph-btn"
                key={String(v)}
                aria-pressed={votes[chosen.id] === v}
                disabled={voting}
                onClick={() => vote(v)}
                style={
                  votes[chosen.id] === v
                    ? { background: "#e8f9f2", borderColor: "#29a78c" }
                    : {}
                }
              >
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
          {voteNotice && (
            <p className="ph-success" role="status">
              {voteNotice}
            </p>
          )}
          <h2>Related questions</h2>
          {chosen.related
            .map((id) => HELP_ARTICLES.find((a) => a.id === id))
            .filter((a): a is HelpArticle => !!a)
            .map((a) => (
              <button
                key={a.id}
                className="ph-ticket ph-row"
                onClick={() => go({ article: a.id })}
              >
                {a.question}
                <ChevronRight size={15} />
              </button>
            ))}
        </section>
      ) : view === "tickets" ? (
        <section className="ph-card ph-stack">
          <div className="ph-row">
            <h1>All tickets</h1>
            <button
              className="ph-btn ph-primary"
              onClick={() => go({ view: "raise" })}
            >
              <Plus size={14} />
              Raise a support ticket
            </button>
          </div>
          <div className="ph-tabs" role="tablist" aria-label="Ticket status">
            {["all", "open", "resolved"].map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => {
                  setTab(t);
                  setPage(1);
                }}
              >
                {t === "all" ? "All" : t === "open" ? "Open" : "Resolved"} (
                {tickets?.counts[t as keyof TicketPage["counts"]] || 0})
              </button>
            ))}
          </div>
          <label className="ph-search portal-help-search">
            <Search />
            <input
              className="ph-input"
              type="search"
              aria-label="Search tickets"
              value={ticketSearch}
              onChange={(e) => {
                setTicketSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tickets…"
            />
          </label>
          {loading ? (
            <p role="status">Loading tickets…</p>
          ) : tickets?.items.length ? (
            ticketCards()
          ) : (
            <p className="ph-empty">No tickets found.</p>
          )}
          <button className="ph-link" onClick={() => go({})}>
            Back to Help & support
          </button>
          <VizitoPagination
            page={tickets?.page || page}
            pageSize={pageSize}
            total={tickets?.total || 0}
            label="support tickets"
            onPageChange={(next) => { setPage(next); setParams(current => { const copy = new URLSearchParams(current); copy.set("page", String(next)); return copy; }); }}
            onPageSizeChange={(next) => { setPageSize(next); setPage(1); setParams(current => { const copy = new URLSearchParams(current); copy.set("pageSize", String(next)); copy.delete("page"); return copy; }); }}
          />
        </section>
      ) : (
        <>
          {topic && (
            <button className="ph-link" onClick={() => go({})}>
              ← Help & support
            </button>
          )}
          {topicData && (
            <header>
              <h1>{topicData.name}</h1>
              <p className="ph-sub">{topicData.description}</p>
            </header>
          )}
          <label className="ph-search portal-help-search">
            <Search />
            <input
              className="ph-input"
              aria-label="Search help"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setKind("All");
              }}
              placeholder="Search for help (e.g. refund, lab report, prescription, address change)"
            />
            {search && (
              <button className="ph-link" onClick={() => setSearch("")}>
                Clear
              </button>
            )}
          </label>
          {!topic && !search && (
            <section className="ph-card ph-stack">
              <h2>Browse help topics</h2>
              <div className="ph-topics">
                {HELP_TOPICS.map((t) => {
                  const Icon = topicIcons[t.icon];
                  return (
                    <button
                      className="ph-topic"
                      data-topic={t.icon}
                      key={t.id}
                      onClick={() => go({ topic: t.id })}
                    >
                      <span>
                        <Icon />
                      </span>
                      <span>
                        <b>{t.name}</b>
                        <small>{t.description}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          {search ? (
            <section className="ph-card ph-stack">
              <h2>Search results</h2>
              <div
                className="ph-tabs"
                role="tablist"
                aria-label="Search result types"
              >
                {["All", "FAQ", "Article"].map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={kind === t}
                    onClick={() => setKind(t)}
                  >
                    {t === "FAQ" ? "FAQs" : t === "Article" ? "Articles" : t} (
                    {
                      HELP_ARTICLES.filter(
                        (a) =>
                          (!topic || a.topic === topic) &&
                          `${a.question} ${a.answer}`
                            .toLowerCase()
                            .includes(search.toLowerCase().trim()) &&
                          (t === "All" || a.kind === t),
                      ).length
                    }
                    )
                  </button>
                ))}
              </div>
              {results.length ? (
                results.map((a) => (
                  <button
                    key={a.id}
                    className="ph-ticket ph-row"
                    onClick={() => go({ article: a.id })}
                  >
                    <span>
                      <b>{a.question}</b>
                      <small style={{ display: "block" }}>
                        {HELP_TOPICS.find((t) => t.id === a.topic)?.name}
                      </small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))
              ) : (
                <div className="ph-empty">
                  <h3>No results found</h3>
                  <p>We couldn't find answers for “{search}”.</p>
                  <p>Try different keywords or check the spelling.</p>
                  <button className="ph-btn" onClick={() => go({})}>
                    Browse help topics
                  </button>
                </div>
              )}
            </section>
          ) : (
            <div className="ph-split">
              <section className="ph-card ph-stack">
                <div className="ph-row">
                  <h2>
                    {topic
                      ? "Questions about " + topicData?.name
                      : "Frequently asked questions"}
                  </h2>
                  {!topic && (
                    <button
                      className="ph-link"
                      onClick={() => setShowAllFaq((v) => !v)}
                    >
                      {showAllFaq ? "View fewer" : "View all"}
                    </button>
                  )}
                </div>
                {(topic || showAllFaq
                  ? results
                  : results.filter((a) => a.kind === "FAQ").slice(0, 6)
                ).map(faq)}
                {topic && (
                  <div className="ph-info ph-row">
                    <div>
                      <h3>Still need help?</h3>
                      <p>
                        Raise a support ticket and our team will get back to
                        you.
                      </p>
                    </div>
                    <button
                      className="ph-btn ph-primary"
                      onClick={() => go({ view: "raise" })}
                    >
                      Raise a ticket
                    </button>
                  </div>
                )}
              </section>
              <aside className="ph-stack">
                <section className="ph-emergency">
                  <h2 className="ph-title">
                    <Ambulance />
                    Medical emergency?
                  </h2>
                  <p className="ph-muted">
                    For life-threatening emergencies, call
                  </p>
                  <strong>108</strong>
                  <a href="tel:108" className="ph-btn ph-danger">
                    Call 108
                  </a>
                </section>
                <section className="ph-info ph-stack">
                  <h3 className="ph-title">
                    <Headphones size={19} />
                    Need help?
                  </h3>
                  <p>Send a support ticket and follow the conversation here.</p>
                  <button
                    className="ph-btn"
                    onClick={() => go({ view: "raise" })}
                  >
                    Contact support
                  </button>
                </section>
              </aside>
            </div>
          )}
          {!topic && !search && (
            <section className="ph-card ph-stack">
              <div className="ph-row">
                <h2>My support tickets</h2>
                <div className="ph-row">
                  <button
                    className="ph-link"
                    onClick={() => go({ view: "tickets" })}
                  >
                    View all tickets
                  </button>
                  <button
                    className="ph-btn ph-primary"
                    onClick={() => go({ view: "raise" })}
                  >
                    <Plus size={14} />
                    Raise a support ticket
                  </button>
                </div>
              </div>
              {loading ? (
                <p role="status">Loading tickets…</p>
              ) : tickets?.items.length ? (
                <div className="ph-mobile-scroll">
                  <table className="ph-data ph-ticket-table">
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Category</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Created on</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.items.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <button
                              className="ph-link"
                              onClick={() => go({ ticket: t.id })}
                            >
                              {t.ticket_number}
                            </button>
                          </td>
                          <td>{t.category}</td>
                          <td>
                            <button
                              className="ph-link"
                              onClick={() => go({ ticket: t.id })}
                            >
                              {t.subject}
                            </button>
                          </td>
                          <td>
                            <span className="ph-badge" data-status={t.status}>
                              {ticketStatus(t.status)}
                            </span>
                          </td>
                          <td>{phDate(t.created_at).split(",")[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="ph-empty">No support tickets yet.</p>
              )}
            </section>
          )}
        </>
      )}
      {error && (
        <div role="alert" className="ph-error">
          {error}
          <button className="ph-btn" onClick={load}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
