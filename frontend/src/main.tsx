import {
  AppHeader,
  Breadcrumb,
  Button,
  EdificeThemeProvider,
  Layout,
  useEdificeClient,
} from "@open-ent/react";
import { IconPlus } from "@open-ent/react/icons";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider, useTranslation } from "react-i18next";
import {
  HashRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import i18n from "./i18n";
import "./index.css";
import { PollEdit } from "./pages/PollEdit";
import { PollList } from "./pages/PollList";
import { PollView } from "./pages/PollView";
import { Providers } from "./providers";

/** En-tête : fil d'Ariane du socle (il porte le seul `<h1>` de la page) et, sur l'accueil, le bouton de création. */
const Header = () => {
  const { t } = useTranslation("poll");
  const { currentApp } = useEdificeClient();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <AppHeader
      render={() =>
        pathname === "/" ? (
          <Button
            type="button"
            color="primary"
            variant="filled"
            leftIcon={<IconPlus />}
            onClick={() => navigate("/new")}
            data-poll-new
          >
            {t("poll.new")}
          </Button>
        ) : null
      }
    >
      <div data-poll-title>
        {currentApp ? (
          <Breadcrumb app={currentApp} />
        ) : (
          <h1 className="h3 mb-0">{t("poll.title")}</h1>
        )}
      </div>
    </AppHeader>
  );
};

const App = () => (
  <HashRouter>
    <Layout>
      <Header />
      <Routes>
        <Route path="/" element={<PollList />} />
        <Route path="/view/:id" element={<PollView />} />
        <Route path="/new" element={<PollEdit />} />
        <Route path="/edit/:id" element={<PollEdit />} />
        <Route path="*" element={<PollList />} />
      </Routes>
    </Layout>
  </HashRouter>
);

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
