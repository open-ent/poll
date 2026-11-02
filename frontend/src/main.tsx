import { AppHeader, Layout } from "@open-ent/react";
import { EdificeThemeProvider } from "@open-ent/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider, useTranslation } from "react-i18next";
import { HashRouter, Route, Routes } from "react-router-dom";
import i18n from "./i18n";
import { PollEdit } from "./pages/PollEdit";
import { PollList } from "./pages/PollList";
import { PollView } from "./pages/PollView";
import { Providers } from "./providers";

// Le thème de la plateforme rend les `.btn-link` quasi invisibles (même couleur que le fond) : ils reprennent la couleur du texte, soulignés.
const style = document.createElement("style");
style.textContent =
  ".btn-link{color:inherit !important;text-decoration:underline}";
document.head.appendChild(style);

const App = () => {
  const { t } = useTranslation("poll");
  return (
    <Layout>
      <AppHeader>
        <h1 className="h2" data-poll-title>
          {t("poll.title")}
        </h1>
      </AppHeader>
      <HashRouter>
        <Routes>
          <Route path="/" element={<PollList />} />
          <Route path="/view/:id" element={<PollView />} />
          <Route path="/new" element={<PollEdit />} />
          <Route path="/edit/:id" element={<PollEdit />} />
          <Route path="*" element={<PollList />} />
        </Routes>
      </HashRouter>
    </Layout>
  );
};

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Providers>
        <I18nextProvider i18n={i18n}>
          <EdificeThemeProvider>
            <App />
          </EdificeThemeProvider>
        </I18nextProvider>
      </Providers>
    </StrictMode>,
  );
}
