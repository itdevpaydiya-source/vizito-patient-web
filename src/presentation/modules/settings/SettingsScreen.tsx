import ThemedSelect from '../../components/forms/ThemedSelect';
﻿import { Link } from "react-router-dom";
import { NotificationCard } from "../profile/AccountPanels";
import {
  useLanguage,
  type Language,
} from "../../../store/language/LanguageContext";
import "../profile/profileHelp.css";
export default function SettingsScreen() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="ph-page ph-stack">
      <header>
        <h1>Settings</h1>
        <p className="ph-sub">Notifications, language and account settings.</p>
      </header>
      <NotificationCard />
      <section className="ph-card ph-stack">
        <h2>Language</h2>
        <label>
          Display language
          <ThemedSelect
            className="ph-input"
            aria-label="Display language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="te">Telugu</option>
          </ThemedSelect>
        </label>
      </section>
      <Link className="ph-btn" to="/profile">
        Profile, security & privacy settings
      </Link>
    </div>
  );
}
