import { useEffect, useId, useState } from "react";
import MediaImage from "../../components/MediaImage";
import { getProvidersApi } from "../../../services/patientHelper";

export const bloodGroupOrder = [
  "A+",
  "A-",
  "B+",
  "B-",
  "O+",
  "O-",
  "AB+",
  "AB-",
];
export const orderedGroups = <T extends { code: string }>(groups: T[]) =>
  [...groups].sort(
    (a, b) => bloodGroupOrder.indexOf(a.code) - bloodGroupOrder.indexOf(b.code),
  );
export function useBloodBankLogos() {
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  useEffect(() => {
    let active = true;
    getProvidersApi("bloodbank")
      .then((rows) => {
        if (active)
          setLogos(Object.fromEntries(rows.map((p) => [p.id, p.logo || null])));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return logos;
}
export function BankMark({ name, src }: { name: string; src?: string | null }) {
  return (
    <MediaImage
      src={src}
      name={name}
      kind="business"
      businessType="bloodbank"
      className="bb-bank-mark"
    />
  );
}
export function BloodBagIllustration() {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      className="bb-bag-art"
      viewBox="0 0 210 180"
      role="img"
      aria-label="Blood bag illustration"
    >
      <defs>
        <linearGradient id={`${id}-bag`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff" stopOpacity=".96" />
          <stop offset="1" stopColor="#c6d9e4" stopOpacity=".8" />
        </linearGradient>
        <linearGradient id={`${id}-blood`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#f52c4a" />
          <stop offset="1" stopColor="#8f1237" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="162" rx="63" ry="10" fill="#cbdde9" opacity=".55" />
      <path
        d="M101 26V12q0-8 9-8h22q9 0 9 8v16"
        fill="none"
        stroke="#9db7c9"
        strokeWidth="4"
      />
      <g transform="rotate(9 120 90)">
        <path
          d="M83 27h70q12 0 13 14l5 91q1 17-16 20H82q-17-3-16-20l5-91q1-14 12-14Z"
          fill={`url(#${id}-bag)`}
          stroke="#9eb7c8"
          strokeWidth="2"
        />
        <path
          d="M74 67q21-6 43 0t45-1l3 65q1 13-13 14H84q-13-1-12-14Z"
          fill={`url(#${id}-blood)`}
        />
        <path
          d="M81 41h72M83 48h18"
          stroke="#fff"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <rect x="88" y="78" width="57" height="48" rx="5" fill="#fff9fa" />
        <path
          d="M112 87h10v10h10v10h-10v10h-10v-10h-10V97h10Z"
          fill="#ed284d"
        />
        <path d="M101 152v14m33-14v10" stroke="#b1c8d5" strokeWidth="5" />
        <path
          d="M101 166c-30 27-57-2-50-30s-8-40-25-32"
          fill="none"
          stroke="#d65471"
          strokeWidth="3"
        />
      </g>
      <path
        d="M181 25c-12 18-17 22-17 30a17 17 0 0 0 34 0c0-8-5-12-17-30Z"
        fill="#ee3354"
        opacity=".8"
      />
    </svg>
  );
}
export function DonationIllustration() {
  return (
    <svg
      className="bb-donation-art"
      viewBox="0 0 220 160"
      role="img"
      aria-label="Hand holding a heart illustration"
    >
      <path d="M183 15h37v140h-55l-21-44 15-56Z" fill="#aecbdc" />
      <path
        d="m181 75-26 8-28 34-39 6-39-23q-15-8-22 1t9 20l43 29q9 6 22 4l52-7q14-2 22-13l30-41Z"
        fill="#f0bda8"
        stroke="#d59785"
        strokeWidth="2"
      />
      <path
        d="m81 122 42-6q16-4 12-16t-19-6l-29 8-29-5"
        fill="#f7caba"
        stroke="#d59785"
        strokeWidth="2"
      />
      <path
        d="M111 83 78 53C49 25 87 5 111 29c25-24 61-4 33 24Z"
        fill="#e92b4e"
      />
      <path
        d="M92 34q-12-7-18 4"
        fill="none"
        stroke="#ff8d9d"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BloodDropIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 3C15 13 6 24 6 32a14 14 0 0 0 28 0C34 24 25 13 20 3Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M12 30c-2 6 2 10 7 11"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
