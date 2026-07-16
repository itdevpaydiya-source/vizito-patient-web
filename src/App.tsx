import AppNavigator from './navigation/AppNavigator';
import { RoleProvider } from './store/role/RoleContext';
import { LanguageProvider } from './store/language/LanguageContext';

export default function App() {
  return (
    <LanguageProvider>
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>
    </LanguageProvider>
  );
}
