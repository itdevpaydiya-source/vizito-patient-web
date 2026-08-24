import AppNavigator from './navigation/AppNavigator';
import { RoleProvider } from './store/role/RoleContext';
import { LanguageProvider } from './store/language/LanguageContext';
import { NotificationsProvider } from './store/notifications/NotificationsContext';

export default function App() {
  return (
    <LanguageProvider>
      <RoleProvider>
        <NotificationsProvider>
          <AppNavigator />
        </NotificationsProvider>
      </RoleProvider>
    </LanguageProvider>
  );
}
