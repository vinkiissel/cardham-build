import type { Id } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { useSetDeckBuiltMutation } from "@/queries/mutations/decks";
import { useStore } from "@/store";
import { isBuiltDeck } from "@/store/lib/card-usage";
import { cx } from "@/utils/cx";
import { useToast } from "../ui/toast.hooks";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./built-toggle.module.css";

type Props = {
  className?: string;
  deckId: Id;
};

export function BuiltToggle(props: Props) {
  const { className, deckId } = props;

  const { t } = useTranslation();
  const toast = useToast();

  const built = useStore((state) => {
    const deck = state.data.decks[deckId];
    return deck ? isBuiltDeck(deck) : false;
  });

  const setDeckBuiltMutation = useSetDeckBuiltMutation();

  const onToggle = async (evt: React.MouseEvent) => {
    evt.preventDefault();
    evt.stopPropagation();

    try {
      await setDeckBuiltMutation.mutateAsync({ deckId, built: !built });
    } catch (err) {
      toast.show({
        children: t("deck_collection.built_toggle_error", {
          error: (err as Error)?.message,
        }),
        variant: "error",
      });
    }
  };

  return (
    <DefaultTooltip tooltip={t("deck_collection.built_toggle_help")}>
      <button
        aria-checked={built}
        className={cx(css["toggle"], built && css["checked"], className)}
        data-testid="deck-built-toggle"
        disabled={setDeckBuiltMutation.isPending}
        onClick={onToggle}
        role="switch"
        type="button"
      >
        <span className={css["track"]} aria-hidden="true">
          <span className={css["thumb"]} />
        </span>
        {built
          ? t("deck_collection.section_built")
          : t("deck_collection.section_unbuilt")}
      </button>
    </DefaultTooltip>
  );
}
