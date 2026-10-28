import { TriangleAlertIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useStore } from "@/store";
import type { CardConflict } from "@/store/selectors/card-usage";
import { selectMetadata } from "@/store/selectors/shared";
import { displayAttribute } from "@/utils/card-utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import css from "./built-deck-conflicts.module.css";

type Props = {
  conflicts: CardConflict[];
};

/**
 * Warning for a built deck that uses more copies of some cards than the collection holds.
 * Hovering or clicking it lists those cards and the built decks that use them.
 */
export function BuiltDeckConflicts(props: Props) {
  const { conflicts } = props;
  const { t } = useTranslation();
  const metadata = useStore(selectMetadata);

  return (
    <Popover placement="bottom-start">
      <PopoverTrigger asChild>
        <button
          className={css["trigger"]}
          data-testid="built-deck-conflicts"
          onClick={(evt) => {
            evt.preventDefault();
            evt.stopPropagation();
          }}
          type="button"
        >
          <TriangleAlertIcon />
          {t("card_usage.conflicts", { count: conflicts.length })}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <div className={css["content"]} data-testid="built-deck-conflicts-list">
          <p>{t("card_usage.conflicts_help")}</p>
          <ul className={css["list"]}>
            {conflicts.map((conflict) => {
              const card = metadata.cards[conflict.code];
              return (
                <li key={conflict.code}>
                  <strong>
                    {card ? displayAttribute(card, "name") : conflict.code}
                  </strong>{" "}
                  {t("card_usage.conflict_counts", {
                    used: conflict.used,
                    owned: conflict.owned,
                  })}
                  <ul className={css["decks"]}>
                    {conflict.decks.map((deck) => (
                      <li key={deck.id}>
                        {deck.quantity}×{" "}
                        <Link href={`/deck/view/${deck.id}`}>{deck.name}</Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
