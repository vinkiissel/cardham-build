import type { Deck } from "@arkham-build/shared";
import { CopyIcon, LinkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { deckCodeLink, encodeDeckCode } from "@/store/lib/deck-code";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast.hooks";
import css from "./sidebar.module.css";

type Props = {
  deck: Deck;
};

/**
 * Copies a build code or link that rebuilds the deck in another browser.
 */
export function DeckBuildCode(props: Props) {
  const { deck } = props;
  const { t } = useTranslation();
  const toast = useToast();

  const copy = async (asLink: boolean) => {
    try {
      const code = await encodeDeckCode(deck);
      await navigator.clipboard.writeText(asLink ? deckCodeLink(code) : code);

      toast.show({
        children: asLink
          ? t("deck_view.build_code.link_copied")
          : t("deck_view.build_code.code_copied"),
        variant: "success",
        duration: 3000,
      });
    } catch (err) {
      toast.show({
        children: t("deck_view.build_code.copy_error", {
          error: (err as Error)?.message,
        }),
        variant: "error",
      });
    }
  };

  return (
    <div className={css["share"]} data-testid="deck-build-code">
      <p>{t("deck_view.build_code.description")}</p>
      <nav className={css["share-actions"]}>
        <Button
          data-testid="deck-build-code-copy"
          onClick={() => copy(false)}
          size="sm"
        >
          <CopyIcon />
          {t("deck_view.build_code.copy_code")}
        </Button>
        <Button
          data-testid="deck-build-code-link"
          onClick={() => copy(true)}
          size="sm"
        >
          <LinkIcon />
          {t("deck_view.build_code.copy_link")}
        </Button>
      </nav>
    </div>
  );
}
