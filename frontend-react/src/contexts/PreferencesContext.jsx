import React, {
  createContext, useContext, useState, useEffect,
  useCallback, useMemo, useRef,
} from "react";
import apiClient from "../utils/apiClient";

const PreferencesContext = createContext(null);

const DEFAULT_PREFS = {
  theme:       "system",      
  accentColor: "indigo",       
  density:     "normal", 
  language:    "vi",           
  dateFormat:  "DD/MM/YYYY",   
  timeFormat:  "24h",          
};

const applyThemeClass = (theme) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldDark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", shouldDark);
};

export const PreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  const prefsRef = useRef(preferences);
  useEffect(() => { prefsRef.current = preferences; }, [preferences]);

  const fetchPreferences = useCallback(async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setLoading(false);
      applyThemeClass(DEFAULT_PREFS.theme);
      return;
    }

    try {
      const res = await apiClient.get("/users/preferences");
      const merged = { ...DEFAULT_PREFS, ...(res.data || {}) };
      setPreferences(merged);
      localStorage.setItem("wf_theme", patch.theme);
      applyThemeClass(merged.theme);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error("[Preferences] fetch failed:", err);
      }
      applyThemeClass(DEFAULT_PREFS.theme);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPreferences(); }, [fetchPreferences]);

  useEffect(() => {
    if (preferences.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyThemeClass("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preferences.theme]);

  const updatePreference = useCallback(async (patch) => {
    const prev = prefsRef.current;
    const next = { ...prev, ...patch };

    setPreferences(next);
    if (patch.theme) applyThemeClass(patch.theme);

    try {
      const res = await apiClient.put("/users/preferences", next);

      if (res.data) {
        const merged = { ...DEFAULT_PREFS, ...res.data };
        setPreferences(merged);

        if (patch.theme) {
          localStorage.setItem("wf_theme", prev.theme);
          applyThemeClass(prev.theme);
        }
      }
    } catch (err) {
      console.error("[Preferences] save failed, rollback:", err);
      setPreferences(prev);
      if (patch.theme) applyThemeClass(prev.theme);
      throw err; 
    }
  }, []);

  const value = useMemo(() => ({
    preferences,
    loading,
    updatePreference,
    refresh: fetchPreferences,
    theme:      preferences.theme,
    accent:     preferences.accentColor,
    density:    preferences.density,
    language:   preferences.language,
    dateFormat: preferences.dateFormat,
    timeFormat: preferences.timeFormat,
  }), [preferences, loading, updatePreference, fetchPreferences]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferencesInternal = () => useContext(PreferencesContext);
export default PreferencesContext;