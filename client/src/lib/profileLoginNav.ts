import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/** Явная навигация на вход (обход залипания UI при client-side переходе). */
export function useGoProfileLogin() {
  const navigate = useNavigate();
  return useCallback(() => {
    navigate({ pathname: "/login", search: "?returnTo=%2Fprofile" });
  }, [navigate]);
}
