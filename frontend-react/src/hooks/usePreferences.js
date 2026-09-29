import { usePreferencesInternal } from "../contexts/PreferencesContext";

export const usePreferences = () => {
  const ctx = usePreferencesInternal();
  if (!ctx) {
    throw new Error(
      "usePreferences phải dùng bên trong <PreferencesProvider>. " +
      "Kiểm tra main.jsx đã wrap <PreferencesProvider> quanh <App /> chưa."
    );
  }
  return ctx;
};

export default usePreferences;