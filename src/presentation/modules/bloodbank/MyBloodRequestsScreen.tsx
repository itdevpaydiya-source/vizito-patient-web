import VizitoDialog from '../../components/dialogs/VizitoDialog';
import { payOnline } from "../../../services/razorpayCheckout";
import type {ReactNode} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Droplets, RotateCcw, X } from "lucide-react";
import {
  bloodError,
  bloodCentresApi,
  myBloodRequestApi,
  cancelBloodRequestApi,
  myBloodRequestsPageApi,
  newIdempotencyKey,
  payBloodRequestApi,
  type MyBloodRequest,
} from "../../../services/bloodbankHelper";

import { BankMark, useBloodBankLogos } from "./BloodVisuals";
import { componentLabel } from "./FindBloodScreen";
import "./bloodbank.css";
import VizitoPagination from "../../components/navigation/VizitoPagination";

// My blood requests: plain status, the processing charge (never a price for blood), pay online,
// cancel before issue. No unit or donor details are ever shown here.
const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const tone = (r: MyBloodRequest) =>
  ["ISSUED", "CLOSED"].includes(r.status) ||
  (r.status === "READY" && ["PAID", "CASH_RECORDED"].includes(r.payment_status))
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : ["REJECTED", "CANCELLED"].includes(r.status)
      ? "bg-slate-100 border-slate-200 text-slate-600"
      : r.status === "READY"
        ? "bg-rose-50 border-rose-200 text-rose-800"
        : "bg-sky-50 border-sky-200 text-sky-800";
const statusLabel = (r: MyBloodRequest) =>
  r.status === "READY" && ["PAID", "CASH_RECORDED"].includes(r.payment_status)
    ? "Ready — paid, collect from the blood bank"
    : r.status_label;

const COMPONENT: Record<string, string> = {
  WHOLE_BLOOD: "whole blood",
  PLATELETS: "platelets",
  PRBC: "red blood cells",
  WB: "whole blood",
  FFP: "plasma",
  PLT: "platelets",
  RDP: "platelets",
  SDP: "platelets",
  CRYO: "cryoprecipitate",
};

const date = (s: string) =>
  new Date(s).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const category = (r: MyBloodRequest) =>
  ["ISSUED", "CLOSED"].includes(r.status)
    ? "Completed"
    : ["CANCELLED", "REJECTED"].includes(r.status)
      ? "Cancelled"
      : "Ongoing";
const MyBloodRequestsScreen = () => {
  const logos = useBloodBankLogos();
  const [phones, setPhones] = useState<Record<string, string | null>>({});
  useEffect(() => {
    bloodCentresApi()
      .then((r) =>
        setPhones(
          Object.fromEntries(r.centres.map((b) => [b.partner_id, b.phone])),
        ),
      )
      .catch(() => undefined);
  }, []);
  const [params, setParams] = useSearchParams(),
    navigate = useNavigate();
  const [rows, setRows] = useState<MyBloodRequest[] | null>(null),
    [detail, setDetail] = useState<MyBloodRequest | null>(null),
    [error, setError] = useState(""),
    [detailError, setDetailError] = useState("");
  const tab = ["All","Ongoing","Completed","Cancelled"].includes(params.get("bloodTab")||"") ? params.get("bloodTab")! : "All";
  const page=Math.max(1,Number(params.get("bloodRequestsPage"))||1),pageSize=params.get("bloodRequestsPageSize")==="20"?20 as const:10 as const;
  const [total,setTotal]=useState(0),[counts,setCounts]=useState<Record<string,number>>({All:0,Ongoing:0,Completed:0,Cancelled:0});
  const statusFor=(value:string)=>value==="Ongoing"?"SUBMITTED,ACCEPTED,SAMPLE_RECEIVED,CROSSMATCHED,READY":value==="Completed"?"ISSUED,CLOSED":value==="Cancelled"?"CANCELLED,REJECTED":undefined;
  const id = params.get("open");
  const detailVersion = useRef(0);
  const load = useCallback(async () => {
    try {
      const values=["All","Ongoing","Completed","Cancelled"];
      const [current,...totals]=await Promise.all([myBloodRequestsPageApi({page,page_size:pageSize,status:statusFor(tab)}),...values.map(value=>myBloodRequestsPageApi({page:1,page_size:10,status:statusFor(value)}))]);
      setRows(current.items);setTotal(current.total);setCounts(Object.fromEntries(values.map((value,index)=>[value,totals[index].total])));
      setError("");
    } catch (e) {
      setError(bloodError(e, "Could not load your requests."));
    }
  }, [page,pageSize,tab]);
  const loadDetail = useCallback(async () => {
    const version = ++detailVersion.current;
    if (!id) {
      setDetail(null);
      return;
    }
    try {
      const r = await myBloodRequestApi(id);
      if (version !== detailVersion.current) return;
      setDetail(r);
      setDetailError("");
    } catch (e) {
      if (version === detailVersion.current)
        setDetailError(bloodError(e, "Could not load request details."));
    }
  }, [id]);
  useEffect(() => {
    void load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {
    setDetail(null);
    void loadDetail();
    const t = setInterval(loadDetail, 20000);
    return () => {
      detailVersion.current++;
      clearInterval(t);
    };
  }, [loadDetail]);
  return (
    <div className="bb-page bb-requests bb-stack">
      <nav className="bb-crumb">
        <a href="/dashboard">Dashboard</a> &rsaquo;{" "}
        <a href="/find-blood">Blood Bank</a> &rsaquo; My requests
      </nav>
      <div className="bb-row">
        <h1>My blood requests</h1>
        <button className="bb-btn" onClick={() => navigate("/find-blood")}>
          Find blood
        </button>
      </div>
      <div className="bb-tabs" role="tablist" aria-label="Blood request status">
        {["All", "Ongoing", "Completed", "Cancelled"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className="bb-chip"
            aria-pressed={tab === t}
            onClick={() => {
              setParams(current=>{const next=new URLSearchParams(current);t==="All"?next.delete("bloodTab"):next.set("bloodTab",t);next.delete("bloodRequestsPage");return next;});
            }}
          >
            {t} (
            {counts[t] || 0})
          </button>
        ))}
      </div>
      {error ? (
        <div role="alert" className="bb-error">
          {error}{" "}
          <button className="bb-btn" onClick={load}>
            Retry
          </button>
        </div>
      ) : !rows ? (
        <p role="status">Loading requests...</p>
      ) : !rows.length ? (
        <div className="bb-card">
          No {tab === "All" ? "blood" : tab.toLowerCase()} requests yet.
        </div>
      ) : (
        rows
          .map((r) => (
            <article className="bb-card bb-stack" key={r.id}>
              <button
                className="bb-row"
                style={{ width: "100%", textAlign: "left" }}
                aria-expanded={id === r.id}
                onClick={() => setParams(current => { const next=new URLSearchParams(current);id===r.id?next.delete("open"):next.set("open",r.id);return next; })}
              >
                <span className="bb-muted">
                  Request ID{" "}
                  <b style={{ color: "#112557" }}>{r.request_number}</b>
                </span>
                <span className="bb-chips">
                  {!r.is_emergency && (
                    <span className="bb-badge">
                      {r.urgency === "URGENT" ? "Within 24 hours" : "Planned"}
                    </span>
                  )}
                  {r.is_emergency && (
                    <span
                      className="bb-badge"
                      style={{ background: "#ffe8ed", color: "#e21a3c" }}
                    >
                      Emergency
                    </span>
                  )}
                  <span className="bb-badge">
                    {(
                      {
                        SUBMITTED: "Submitted",
                        ACCEPTED: "Requisition verified",
                        SAMPLE_RECEIVED: "Matching in progress",
                        CROSSMATCHED: "Cross-match done",
                        READY: "Ready for pickup",
                        ISSUED: "Issued",
                        CLOSED: "Completed",
                        REJECTED: "Requisition rejected",
                        CANCELLED: "Cancelled",
                      } as Record<string, string>
                    )[r.status] || r.status_label}
                  </span>
                  <span>{id === r.id ? "Close" : "Expand"}</span>
                </span>
              </button>
              <div className="bb-bank">
                <BankMark
                  name={r.bloodbank_name || "Blood bank"}
                  src={logos[r.bloodbank_partner_id]}
                />
                <div>
                  <h2>{r.bloodbank_name}</h2>
                  <p className="bb-muted">For {r.patient_name}</p>
                  {phones[r.bloodbank_partner_id] && (
                    <a
                      className="bb-link"
                      href={`tel:${phones[r.bloodbank_partner_id]}`}
                    >
                      {phones[r.bloodbank_partner_id]}
                    </a>
                  )}
                </div>
              </div>
              <div className="bb-request-facts">
                <span>
                  Blood group <b>{r.requested_group}</b>
                </span>
                <span>
                  Component <b>{componentLabel(r.component_code)}</b>
                </span>
                <span>
                  Units <b>{r.quantity}</b>
                </span>
                <span>
                  Requested on <b>{date(r.created_at)}</b>
                </span>
              </div>
              {id === r.id &&
                (detailError ? (
                  <div role="alert" className="bb-error">
                    {detailError}
                    <button onClick={loadDetail} className="bb-btn">
                      Retry details
                    </button>
                  </div>
                ) : detail ? (
                  <RequestSheet
                    key={detail.id}
                    r={detail}
                    embedded
                    onClose={() => setParams({})}
                    onChanged={() => {
                      void load();
                      void loadDetail();
                    }}
                  />
                ) : (
                  <p role="status">Loading request details...</p>
                ))}
            </article>
          ))
      )}
      {!!rows && <VizitoPagination page={page} pageSize={pageSize} total={total} onPageChange={value=>setParams(current=>{const next=new URLSearchParams(current);value===1?next.delete("bloodRequestsPage"):next.set("bloodRequestsPage",String(value));return next;})} onPageSizeChange={value=>setParams(current=>{const next=new URLSearchParams(current);next.set("bloodRequestsPageSize",String(value));next.delete("bloodRequestsPage");return next;})} label="blood requests" />}
      {id && rows && !rows.some((r) => r.id === id) && (
        <div className="bb-error">Request not found.</div>
      )}
    </div>
  );
};

export const RequestSheet = ({
  r,
  onClose,
  onChanged,
  embedded = false,
}: {
  r: MyBloodRequest;
  onClose: () => void;
  onChanged: () => void;
  embedded?: boolean;
}) => {
  const [mode, setMode] = useState<"UPI" | "CARD">("UPI");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState({ last4: "", name: "" });
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const payKey = useMemo(() => newIdempotencyKey(), [r.id]);
  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setErr(bloodError(e, fallback));
    } finally {
      setBusy(false);
    }
  };
  const bank = r.bloodbank_name || "the blood bank";
  const paid = ["PAID", "CASH_RECORDED"].includes(r.payment_status);
  const ended = ["REJECTED", "CANCELLED"].includes(r.status);

  // What the patient should do now, in plain words.
  const todo: Record<string, { title: string; body: string }> = {
    SUBMITTED: {
      title: "Waiting for the blood bank",
      body: `${bank} is checking your request and doctor’s note. You’ll be notified when they accept it. Nothing to do yet.`,
    },
    ACCEPTED: {
      title: "Visit the blood bank to give a blood sample",
      body: `Go to ${bank} with the patient (or a sample drawn at the hospital). Show request number ${r.request_number}. They test the sample to find blood that safely matches. No payment needed now.`,
    },
    SAMPLE_RECEIVED: {
      title: "Your sample is being tested",
      body: `${bank} is matching your sample with their blood. You’ll be notified when the blood is ready.`,
    },
    CROSSMATCHED: {
      title: "Blood matched — being prepared",
      body: "You’ll be notified shortly when it’s ready to collect.",
    },
    READY: paid
      ? {
          title: "Paid — collect your blood",
          body: `Go to ${bank} and show request number ${r.request_number} to collect.`,
        }
      : {
          title: "Blood is ready — pay and collect",
          body: r.processing_charge
            ? `Pay the processing charge below (or at the counter), then collect from ${bank}. The blood is held for you for a limited time.`
            : `Pay the processing charge at the ${bank} counter and collect. The blood is held for you for a limited time.`,
        },
    ISSUED: { title: "Blood collected", body: "This request is complete." },
    CLOSED: { title: "Completed", body: "This request is complete." },
    REJECTED: {
      title: "Request not accepted",
      body: r.status_reason || `${bank} could not accept this request.`,
    },
    CANCELLED: {
      title: "Request cancelled",
      body: r.status_reason || "This request was cancelled.",
    },
  };
  const now = todo[r.status] || { title: statusLabel(r), body: "" };
  const [askCancel, setAskCancel] = useState(false);

  return (
    <BloodRequestShell embedded={embedded} onClose={onClose}>
      <div
        className={
          embedded
            ? "space-y-4"
            : "bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        }
      >
        {!embedded && (
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-black">
                {r.quantity} unit{r.quantity === 1 ? "" : "s"} ·{" "}
                {r.requested_group}{" "}
                {COMPONENT[r.component_code] || r.component_code}
              </h2>
              <p className="text-xs text-slate-500">
                {bank} · for {r.patient_name || "you"}
              </p>
            </div>
            <button aria-label="Close" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <ol aria-label="Status timeline" className="bb-timeline">
          {[
            ["REQUEST_SUBMITTED", "Submitted"],
            ["REQUEST_ACCEPTED", "Requisition verified"],
            ["REQUEST_CROSSMATCHED", "Cross-match done"],
            ["REQUEST_READY", "Ready for pickup"],
            ["REQUEST_ISSUED", "Issued"],
          ].map(([code, label]) => {
            const event = r.timeline?.find((e) => e.code === code);
            return (
              <li key={code} data-done={!!event}>
                <b>{label}</b>
                <br />
                {event ? (
                  <time dateTime={event.at}>{date(event.at)}</time>
                ) : (
                  <span className="bb-muted">Pending</span>
                )}
              </li>
            );
          })}
        </ol>
        {ended && (
          <p className="bb-error">
            {r.status_label}: {r.status_reason}
            {r.timeline
              ?.filter((e) =>
                ["REQUEST_CANCELLED", "REQUEST_REJECTED"].includes(e.code),
              )
              .map((e) => (
                <time key={e.code} dateTime={e.at}>
                  {" "}
                  - {date(e.at)}
                </time>
              ))}
          </p>
        )}
        {r.status === "READY" && (
          <section className="bb-ready">
            <h2>Your blood is ready for pickup</h2>
            <p>Please carry a valid ID and hospital documents.</p>
            {r.reserved_until && <p>Collect by {date(r.reserved_until)}</p>}
          </section>
        )}
        <section className="bb-info bb-stack" aria-label="Pickup details">
          <h2>Pickup details</h2>
          <p>
            <b>{bank}</b>
            <br />
            {r.bloodbank?.address || "Contact the blood bank for its address."}
          </p>
          {r.bloodbank?.phone && (
            <a className="bb-link" href={`tel:${r.bloodbank.phone}`}>
              {r.bloodbank.phone}
            </a>
          )}
          {r.bloodbank?.latitude != null && r.bloodbank.longitude != null && (
            <a
              className="bb-btn"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${r.bloodbank.latitude},${r.bloodbank.longitude}`}
            >
              Get directions
            </a>
          )}
          <p>
            Timing:{" "}
            {r.bloodbank?.hours.length === 7 &&
            r.bloodbank.hours.every(
              (h) =>
                !h.closed &&
                h.open === "00:00" &&
                ["23:59", "00:00"].includes(h.close || ""),
            )
              ? "Open 24 x 7"
              : r.bloodbank?.hours.length
                ? r.bloodbank.hours
                    .map(
                      (h) =>
                        `${h.day}: ${h.closed ? "Closed" : `${h.open}-${h.close}`}`,
                    )
                    .join(" / ")
                : "Contact the blood bank for opening hours."}
          </p>
        </section>
        <section className="bb-info">
          <h2>What to bring</h2>
          <ul className="list-disc pl-5">
            <li>Patient's ID proof</li>
            <li>Doctor's requisition form (original)</li>
            <li>Hospital documents / admission slip</li>
            <li>Payment receipt (if paid online)</li>
          </ul>
        </section>
        <section
          aria-label="What to do now"
          hidden={embedded && r.status === "READY"}
          className={`rounded-xl border p-3 space-y-1 ${tone(r)}`}
        >
          <p className="text-sm font-black">{now.title}</p>
          {now.body && (
            <p className="text-sm font-normal text-slate-700">{now.body}</p>
          )}
        </section>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500">
            Request number — show this at the counter
          </span>
          <span className="font-mono text-sm font-black">
            {r.request_number}
          </span>
        </div>

        {r.processing_charge && (
          <p className="text-sm">
            Processing charge: <b>{money(r.processing_charge.total)}</b>{" "}
            {r.quantity > 1 && (
              <span className="text-slate-500">
                ({money(r.processing_charge.per_unit)} per unit)
              </span>
            )}{" "}
            ·{" "}
            {r.payment_status === "PAID"
              ? "paid online"
              : r.payment_status === "CASH_RECORDED"
                ? "paid at the counter"
                : r.payment_status === "REFUNDED"
                  ? "refunded"
                  : "pay when ready"}
          </p>
        )}
        {!r.processing_charge && !ended && !paid && (
          <p className="text-xs text-slate-500">
            You pay only a processing charge, after the blood is matched and
            ready. Blood itself is never sold.
          </p>
        )}

        {r.can_pay &&
          r.payment_preference !== "AT_BANK" &&
          r.processing_charge && (
            <section
              aria-label="Pay processing charge"
              className="rounded-xl border border-slate-200 p-3 space-y-2"
            >
              <p className="text-xs text-slate-500">
                Pay securely with UPI, card, net banking or wallet in the Razorpay window.
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const paid = await payOnline({
                      amount: Number(r.processing_charge!.total),
                      purpose: "blood_request",
                      description: `Blood processing charge · ${r.request_number}`,
                    });
                    try {
                      await payBloodRequestApi(r.id, { ...paid }, payKey);
                    } catch (e) {
                      throw new Error(`${(e as Error)?.message || "Payment failed."} If money was taken it will be refunded automatically.`);
                    }
                  }, "Payment failed.")
                }
                className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy
                  ? "Paying…"
                  : `Pay processing charge ${money(r.processing_charge.total)}`}
              </button>
            </section>
          )}
        {r.can_cancel && !askCancel && (
          <button onClick={() => setAskCancel(true)} className="bb-btn">
            Cancel request
          </button>
        )}
        {r.can_cancel && askCancel && (
          <section
            aria-label="Cancel request"
            className="rounded-xl border border-slate-200 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-black">Cancel this request?</p>
              <button
                aria-label="Keep request"
                onClick={() => setAskCancel(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {bank} will stop working on it
              {r.status === "READY"
                ? " and the blood kept for you goes back to stock"
                : ""}
              .
              {r.payment_status === "PAID"
                ? " Your online payment will be refunded."
                : ""}
            </p>
            <input
              aria-label="Reason for cancelling"
              placeholder="Why are you cancelling?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAskCancel(false)}
                className="rounded-xl border border-slate-300 py-2 text-sm font-bold text-slate-700"
              >
                Keep request
              </button>
              <button
                disabled={busy || !reason.trim()}
                onClick={() =>
                  run(
                    () => cancelBloodRequestApi(r.id, reason),
                    "Could not cancel.",
                  )
                }
                className="rounded-xl bg-rose-700 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Yes, cancel
              </button>
            </div>
          </section>
        )}
        {err && (
          <p role="alert" className="text-sm font-semibold text-rose-700">
            {err}
          </p>
        )}
      </div>
    </BloodRequestShell>
  );
};

export default MyBloodRequestsScreen;

function BloodRequestShell({embedded,onClose,children}:{embedded?:boolean;onClose:()=>void;children:ReactNode}){return embedded?<>{children}</>:<VizitoDialog title="Blood request" onClose={onClose}>{children}</VizitoDialog>;}
