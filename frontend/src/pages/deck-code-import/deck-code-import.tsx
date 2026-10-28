import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import {
  ErrorDisplay,
  ErrorImage,
} from "@/components/error-display/error-display";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import css from "../errors/404.module.css";

/**
 * Imports the build code in the URL hash, e.g. `/import#ahb1.…`, and opens the imported deck.
 */
function DeckCodeImport() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string>();

  const importDeckCode = useStore((state) => state.importDeckCode);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = decodeURIComponent(window.location.hash.slice(1));

    importDeckCode(code)
      .then((id) => navigate(`/deck/view/${id}`, { replace: true }))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [importDeckCode, navigate]);

  if (!error) {
    return <Loader show message={t("deck_collection.import_loading")} />;
  }

  const message = t("deck_collection.import_error", { error });

  return (
    <AppLayout mainClassName={css["main"]} title={message}>
      <ErrorDisplay message={message} pre={<ErrorImage />} status={400}>
        <Link asChild to="~/">
          <Button as="a" variant="bare">
            {t("app.home")}
          </Button>
        </Link>
      </ErrorDisplay>
    </AppLayout>
  );
}

export default DeckCodeImport;
