export const HELP_TOPICS = [
  {
    id: "bookings",
    name: "Bookings",
    description: "Appointments, reschedule, cancel",
    icon: "calendar",
  },
  {
    id: "payments",
    name: "Payments & refunds",
    description: "Payment methods, invoices, refunds",
    icon: "card",
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    description: "Orders, delivery, prescriptions",
    icon: "pill",
  },
  {
    id: "labs",
    name: "Lab tests",
    description: "Reports, home collection, samples",
    icon: "flask",
  },
  {
    id: "ambulance",
    name: "Ambulance",
    description: "Emergency booking, transfers",
    icon: "ambulance",
  },
  {
    id: "blood",
    name: "Blood bank",
    description: "Find and donate blood",
    icon: "drop",
  },
  {
    id: "account",
    name: "Account",
    description: "Profile, family members, security",
    icon: "user",
  },
] as const;
export interface HelpArticle {
  id: string;
  topic: string;
  question: string;
  answer: string;
  kind: "FAQ" | "Article";
  related: string[];
  link?: { to: string; label: string };
}
export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "reschedule-appointment",
    topic: "bookings",
    question: "How do I reschedule a doctor appointment?",
    answer:
      "Open Bookings and select your appointment. If rescheduling is available, choose Reschedule and select one of the available dates and slots. Check the updated appointment details before confirming. Availability and permitted changes are shown for your booking.",
    kind: "FAQ",
    related: ["cancel-booking", "book-family"],
    link: { to: "/bookings", label: "Open Bookings" },
  },
  {
    id: "cancel-booking",
    topic: "bookings",
    question: "How can I cancel a booking and get a refund?",
    answer:
      "Open the booking details and check whether Cancel booking is available. The confirmation screen explains the applicable cancellation and refund information. Confirm only after reviewing it. Contact support with the booking reference if you cannot find the action or need help.",
    kind: "FAQ",
    related: ["refund-timeline", "payment-methods"],
    link: { to: "/bookings", label: "Open Bookings" },
  },
  {
    id: "refund-timeline",
    topic: "payments",
    question: "How do I get a refund?",
    answer:
      "Check the payment and refund status in the relevant booking or order. Refunds depend on that service and the state of the booking or order; do not cancel solely to request a refund without reading its confirmation. If the status is unclear or your refund has not arrived, raise a support ticket with the booking reference and payment details. Never include card PINs, OTPs or passwords.",
    kind: "Article",
    related: ["refund-status", "cancel-booking", "payment-methods"],
  },
  {
    id: "refund-status",
    topic: "payments",
    question: "How long does a refund take?",
    answer:
      "Use the refund status and any timing shown on your booking or order. Processing can depend on the payment provider and your bank. Contact support with your booking reference for an update; we cannot promise a fixed refund period for every service.",
    kind: "FAQ",
    related: ["refund-timeline", "cancel-booking"],
  },
  {
    id: "payment-methods",
    topic: "payments",
    question: "What payment methods are supported?",
    answer:
      "Choose from the methods offered during checkout. Some services allow payment at the provider, while others require online payment. Blood bank processing charges are paid only after the bank has matched blood and marked it ready. Use the options shown for the specific request.",
    kind: "FAQ",
    related: ["refund-timeline", "blood-request"],
  },
  {
    id: "lab-report",
    topic: "labs",
    question: "How will I receive my lab test report?",
    answer:
      "Open your lab booking and look for the report once the laboratory has published it. Medical Records also provides access to records available in your account. Report availability depends on the lab completing and releasing the test. Raise a ticket linked to the booking if you need help finding it.",
    kind: "FAQ",
    related: ["home-collection", "download-records"],
    link: { to: "/my-records", label: "Open Medical Records" },
  },
  {
    id: "home-collection",
    topic: "labs",
    question: "Is home sample collection available in my area?",
    answer:
      "Choose your service location and check the collection options offered by the laboratory when booking. Home collection is available only when the lab offers it for your area and the selected tests. Confirm your address and map pin before submitting.",
    kind: "FAQ",
    related: ["lab-report", "saved-addresses"],
    link: { to: "/lab-tests", label: "Find lab tests" },
  },
  {
    id: "pharmacy-prescription",
    topic: "pharmacy",
    question: "Can I order medicines without a prescription?",
    answer:
      "Use Pharmacy to select a pharmacy and submit your medicine request, or send a prescription from Medical Records. The pharmacist reviews the order and may require a valid prescription before dispensing medicines. Check the order details for pickup or delivery options and updates.",
    kind: "FAQ",
    related: ["pharmacy-pickup", "download-records"],
    link: { to: "/pharmacy-orders/new", label: "Open Pharmacy" },
  },
  {
    id: "pharmacy-pickup",
    topic: "pharmacy",
    question: "How do I collect a pharmacy order?",
    answer:
      "Open your order and wait for the pharmacy to confirm it is ready. Follow the pickup details, address and instructions shown by the pharmacy. Bring the prescription and identification when requested. Use the order contact action if you need directions or clarification.",
    kind: "Article",
    related: ["pharmacy-prescription"],
  },
  {
    id: "ambulance-emergency",
    topic: "ambulance",
    question: "What should I do in a medical emergency?",
    answer:
      "Call 108 for a life-threatening emergency. The ambulance booking flow shows the service options and availability offered in Vizito. Do not wait for a support ticket reply to seek urgent medical help.",
    kind: "FAQ",
    related: ["cancel-booking"],
    link: { to: "/book-ambulance", label: "Open Ambulance" },
  },
  {
    id: "blood-request",
    topic: "blood",
    question: "How do I request blood?",
    answer:
      "Choose your location, blood group and component in Blood Bank. Select a bank, enter the patient details and upload the doctor’s requisition. The blood bank reviews the request, checks the sample and cross-matches before issue. Sending a request does not itself reserve blood. Pay the processing charge only when the blood bank marks the request ready.",
    kind: "Article",
    related: ["payment-methods"],
    link: { to: "/find-blood", label: "Find blood" },
  },
  {
    id: "book-family",
    topic: "account",
    question: "How do I add a family member?",
    answer:
      "Open Family Members and use Add family member. Follow the choices offered to add or link the member, then choose them as the patient in a supported booking flow. Check their details before confirming a booking.",
    kind: "FAQ",
    related: ["saved-addresses", "change-contact"],
    link: { to: "/family-profiles", label: "Open Family Members" },
  },
  {
    id: "saved-addresses",
    topic: "account",
    question: "How do I update my saved address?",
    answer:
      "Open Profile & settings, then Saved addresses. Add or edit the address, confirm the map pin and contact details, and choose whether it is your default. Check the selected address again when arranging a visit, delivery or sample collection.",
    kind: "FAQ",
    related: ["home-collection", "book-family"],
    link: { to: "/profile?section=addresses", label: "Manage addresses" },
  },
  {
    id: "change-contact",
    topic: "account",
    question: "How do I change my mobile number or email?",
    answer:
      "Open Profile & settings and choose Change beside your contact details. Enter the new number or email and verify the OTP sent there. Your contact does not change until the verification succeeds. Keep your password and OTP private.",
    kind: "Article",
    related: ["download-records", "saved-addresses"],
    link: { to: "/profile", label: "Open Profile & settings" },
  },
  {
    id: "download-records",
    topic: "account",
    question: "Where are my prescriptions and reports?",
    answer:
      "Open Medical Records to view the prescriptions and reports available in your account. Use the record’s download or print option to save a copy. Download my data in Profile includes account data; prescriptions and reports remain available separately through Medical Records.",
    kind: "FAQ",
    related: ["lab-report", "pharmacy-prescription"],
    link: { to: "/my-records", label: "Open Medical Records" },
  },
];
