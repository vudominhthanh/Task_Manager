import React from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function AdminRoute({ children }) {
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {}

  const isSystemAdmin =
    user?.role === "SYS_AD" ||
    user?.isSystemAdmin === true ||
    user?.systemRoles?.some?.((r) => r.name === "SYS_AD");

  if (!isSystemAdmin) {
    toast.error("Bạn không có quyền truy cập khu vực quản trị!");
    return <Navigate to="/" replace />;
  }

  return children;
}