import ThemedSelect from '../../components/forms/ThemedSelect';
﻿import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Paperclip, Send, FileText } from "lucide-react";
import {
  createTicketApi,
  getTicketApi,
  replyTicketApi,
  closeTicketApi,
  readFileAsDataUrl,
  SUPPORT_CATEGORIES,
  type SupportTicket,
} from "../../../services/supportHelper";
import {
  relatedSupportBookingsApi,
  profileError,
  type RelatedSupportBooking,
} from "../../../services/profileHelpHelper";
import {
  getPatientProfileApi,
  type PatientProfileData,
} from "../../../services/patientHelper";
import { phDate } from "../profile/ProfileUi";
export const ticketStatus = (s: string) =>
  ({
    OPEN: "Open",
    IN_PROGRESS: "In progress",
    AWAITING_YOU: "Waiting for you",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
  })[s] || s;
export function TicketForm({
  booking,
  onCancel,
  onCreated,
}: {
  booking?: string | null;
  onCancel: () => void;
  onCreated: (ticket: SupportTicket) => void;
}) {
  const [profile, setProfile] = useState<PatientProfileData | null>(null),
    [bookings, setBookings] = useState<RelatedSupportBooking[]>([]),
    [category, setCategory] = useState<string>(SUPPORT_CATEGORIES[0]),
    [reference, setReference] = useState(booking || ""),
    [subject, setSubject] = useState(""),
    [description, setDescription] = useState(""),
    [contact, setContact] = useState<"PHONE" | "EMAIL" | "">(""),
    [file, setFile] = useState<File | null>(null),
    [fileData, setFileData] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([getPatientProfileApi(), relatedSupportBookingsApi()])
      .then(([p, b]) => {
        if (!active) return;
        setProfile(p);
        setBookings(b);
        setContact(p?.email ? "EMAIL" : p?.phone ? "PHONE" : "");
        setLoaded(true);
        setError("");
        if (reference && !b.some((r) => r.reference === reference))
          setReference("");
      })
      .catch((e) => {
        if (active) setError(profileError(e));
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const chooseFile = async (f?: File) => {
    if (!f) return;
    if (
      !["image/png", "image/jpeg", "application/pdf"].includes(f.type) ||
      f.size > 2 * 1024 * 1024
    ) {
      setError("Attach a PDF, JPG or PNG up to 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const data = await readFileAsDataUrl(f);
      setFileData(data);
      setFile(f);
      setError("");
    } catch (e) {
      setError(profileError(e));
    } finally {
      setBusy(false);
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loaded) return;
    setBusy(true);
    setError("");
    try {
      const t = await createTicketApi({
        kind: "ISSUE",
        category,
        subject: subject.trim(),
        description: description.trim(),
        booking_reference: reference || undefined,
        attachment_name: file?.name,
        attachment_data: fileData || undefined,
        preferred_contact: contact || undefined,
      });
      onCreated(t);
    } catch (e) {
      setError(profileError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="ph-card ph-stack">
      <h1>Raise a support ticket</h1>
      {!loaded && !error && (
        <p role="status">Loading your contact details and bookings…</p>
      )}
      <form className="ph-stack" onSubmit={submit}>
        <div className="ph-grid">
          <label>
            Category
            <ThemedSelect
              required
              className="ph-input"
              aria-label="Ticket category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {SUPPORT_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </ThemedSelect>
          </label>
          <label>
            Related booking (optional)
            <ThemedSelect
              className="ph-input"
              aria-label="Related booking"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            >
              <option value="">Not related to a booking</option>
              {bookings.map((b) => (
                <option key={`${b.service_type}-${b.id}`} value={b.reference}>
                  {b.service_label} · {b.reference} ·{" "}
                  {b.starts_at ? phDate(b.starts_at) : "Date not recorded"}
                </option>
              ))}
            </ThemedSelect>
          </label>
        </div>
        <label>
          Subject
          <input
            className="ph-input"
            required
            aria-label="Ticket subject"
            minLength={5}
            maxLength={150}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            className="ph-input"
            required
            aria-label="Ticket description"
            minLength={15}
            maxLength={4000}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="ph-upload">
          <Paperclip size={20} style={{ display: "inline" }} /> Attach file
          (optional)
          <input
            type="file"
            aria-label="Ticket attachment"
            accept="image/png,image/jpeg,application/pdf"
            onChange={(e) => {
              void chooseFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <span className="ph-muted" style={{ display: "block" }}>
            PDF, JPG, PNG — max 2 MB
          </span>
        </label>
        {file && (
          <div className="ph-row ph-info">
            <span>
              {file.name} · {file.size.toLocaleString("en-IN")} bytes
            </span>
            <button
              type="button"
              aria-label="Remove ticket attachment"
              className="ph-link"
              onClick={() => {
                setFile(null);
                setFileData("");
              }}
            >
              ×
            </button>
          </div>
        )}
        <fieldset className="ph-stack">
          <legend style={{ fontWeight: 700, fontSize: 12 }}>
            Preferred contact method
          </legend>
          {profile?.email && (
            <label>
              <input
                type="radio"
                name="ticket-contact"
                value="EMAIL"
                checked={contact === "EMAIL"}
                onChange={() => setContact("EMAIL")}
              />
              Email ({profile.email})
            </label>
          )}
          {profile?.phone && (
            <label>
              <input
                type="radio"
                name="ticket-contact"
                value="PHONE"
                checked={contact === "PHONE"}
                onChange={() => setContact("PHONE")}
              />
              Phone ({profile.phone})
            </label>
          )}
          {loaded && !profile?.phone && !profile?.email && (
            <p className="ph-muted">
              You can follow replies in your ticket thread.
            </p>
          )}
        </fieldset>
        {error && (
          <div role="alert" className="ph-error">
            {error}
            {!loaded && (
              <button
                type="button"
                className="ph-btn"
                onClick={() => setRetry((n) => n + 1)}
              >
                Retry
              </button>
            )}
          </div>
        )}
        <div className="ph-row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="ph-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="ph-btn ph-primary" disabled={busy || !loaded}>
            {busy ? "Sending…" : "Submit ticket"}
          </button>
        </div>
      </form>
    </section>
  );
}
export function TicketThread({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null),
    [error, setError] = useState(""),
    [reply, setReply] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setTicket(await getTicketApi(id));
      setError("");
    } catch (e) {
      setError(profileError(e));
    }
  }, [id]);
  useEffect(() => {
    void load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setTicket(await replyTicketApi(id, reply.trim()));
      setReply("");
      setError("");
    } catch (e) {
      setError(profileError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="ph-card ph-stack">
      <button className="ph-link" onClick={onBack}>
        ← Back to all tickets
      </button>
      {error && (
        <div className="ph-error" role="alert">
          {error}
          <button className="ph-btn" onClick={load}>
            Retry
          </button>
        </div>
      )}
      {!ticket && !error && <p role="status">Loading ticket…</p>}
      {ticket && (
        <>
          <div className="ph-row">
            <h1>{ticket.ticket_number}</h1>
            <span className="ph-badge">{ticketStatus(ticket.status)}</span>
          </div>
          <p className="ph-muted">Created {phDate(ticket.created_at)}</p>
          <h2>{ticket.subject}</h2>
          <p className="ph-muted">
            {ticket.category}
            {ticket.booking_reference ? ` · ${ticket.booking_reference}` : ""}
            {ticket.preferred_contact
              ? ` · Preferred contact: ${ticket.preferred_contact === "PHONE" ? "Phone" : "Email"}`
              : ""}
          </p>
          <ol className="ph-timeline" aria-label="Ticket status timeline">
            {ticket.events?.map((event, i) => (
              <li key={i}>
                <b>{ticketStatus(event.to_status)}</b>
                <br />
                <time dateTime={event.at}>{phDate(event.at)}</time>
                <span className="ph-muted">
                  {" "}
                  ·{" "}
                  {event.actor === "requester"
                    ? "You"
                    : event.actor === "support"
                      ? "Support team"
                      : "System"}
                </span>
              </li>
            ))}
          </ol>
          <section aria-label="Ticket conversation">
            <h3>Conversation</h3>
            <div className="ph-message" data-author="requester">
              <div className="ph-row">
                <b>You</b>
                <time className="ph-muted">{phDate(ticket.created_at)}</time>
              </div>
              <p>{ticket.description}</p>
              {ticket.has_attachment && ticket.attachment_data && (
                <a
                  className="ph-btn"
                  href={ticket.attachment_data}
                  download={ticket.attachment_name || "attachment"}
                >
                  <FileText size={15} />
                  {ticket.attachment_name}
                </a>
              )}
            </div>
            {ticket.messages?.map((m) => (
              <div
                key={m.id}
                className="ph-message"
                data-author={m.author_type}
              >
                <div className="ph-row">
                  <b>
                    {m.author_type === "requester"
                      ? "You"
                      : m.author_name || "Support team"}
                  </b>
                  <time className="ph-muted">{phDate(m.created_at)}</time>
                </div>
                <p>{m.body}</p>
              </div>
            ))}
          </section>
          {ticket.status !== "CLOSED" ? (
            <form onSubmit={submit} className="ph-stack">
              <label>
                Reply
                <textarea
                  required
                  className="ph-input"
                  aria-label="Ticket reply"
                  minLength={2}
                  maxLength={4000}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Type your reply…"
                />
              </label>
              <div className="ph-row">
                <button
                  type="button"
                  className="ph-btn"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      setTicket(await closeTicketApi(id));
                      setError("");
                    } catch (e) {
                      setError(profileError(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Close ticket
                </button>
                <button
                  className="ph-btn ph-primary"
                  disabled={busy || reply.trim().length < 2}
                >
                  <Send size={14} />
                  {busy ? "Sending…" : "Send reply"}
                </button>
              </div>
            </form>
          ) : (
            <p className="ph-info">
              This ticket is closed. Raise a new ticket if you need more help.
            </p>
          )}
        </>
      )}
    </section>
  );
}
