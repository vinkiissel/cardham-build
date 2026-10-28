import type { Card } from "@arkham-build/shared";
import { LayersIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectCardAvailability } from "@/store/selectors/card-usage";
import { selectCanCheckOwnership } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import css from "./card-usage-indicator.module.css";
import { useResolvedDeck } from "./resolved-deck-context";
import { DefaultTooltip } from "./ui/tooltip";

type Props = {
  card: Card;
  /** Copies of the card in the current deck. */
  quantity?: number;
};

/**
 * Highlights cards that are used by built decks, showing how many copies are left.
 */
export function CardUsageIndicator(props: Props) {
  const { card, quantity } = props;

  const { t } = useTranslation();
  const { resolvedDeck } = useResolvedDeck();

  const availability = useStore(selectCardAvailability)(card, resolvedDeck?.id);

  // Without a configured collection, only the number of copies in use is meaningful.
  const canCheckOwnership = useStore(selectCanCheckOwnership);

  if (!availability.used) return null;

  const available = Math.max(availability.available, 0);

  const overcommitted =
    canCheckOwnership && !!quantity && quantity > availability.available;

  return (
    <DefaultTooltip
      tooltip={
        <div className={css["tooltip"]}>
          {canCheckOwnership && (
            <p>
              {t("card_usage.available", {
                available,
                owned: availability.owned,
              })}
            </p>
          )}
          {overcommitted && (
            <p className={css["tooltip-warning"]}>
              {t("card_usage.overcommitted", {
                count: quantity - available,
              })}
            </p>
          )}
          <p>{t("card_usage.used_in")}</p>
          <ul>
            {availability.decks.map((deck) => (
              <li key={deck.id}>
                {deck.quantity}× {deck.name}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <span
        className={cx(css["indicator"], overcommitted && css["overcommitted"])}
        data-testid="card-usage"
      >
        <LayersIcon />
        {canCheckOwnership
          ? `${available}/${availability.owned}`
          : availability.used}
      </span>
    </DefaultTooltip>
  );
}
