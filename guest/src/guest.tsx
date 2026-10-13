import React from "react";
import { createRoot } from "react-dom/client";
import { LandingPage } from "./components/landing/LandingPage";
import { UploadPage } from "./components/upload/UploadPage";
import "./ui/guest.css";

function GuestApp() {
  const querySlug = new URLSearchParams(window.location.search).get("slug");
  if (window.location.pathname === "/" && !querySlug) return <LandingPage />;
  return <UploadPage />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GuestApp />
  </React.StrictMode>,
);
