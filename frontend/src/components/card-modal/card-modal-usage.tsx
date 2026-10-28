import type { Card, DeckId } from "@arkham-build/shared";
import { LayersIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useStore } from "@/store";
import { selectCardAvailability } from "@/store/selectors/card-usage";
import { selectCanCheckOwnership } from "@/store/selectors/shared";
import css from "./card-modal.module.css";

type Props = {
  card: Card;
  deckId?: DeckId;
  onCloseModal: () => void;
};

/**
 * Lists the built decks that use a card, with links to each deck.
 */
export function CardModalUsage(props: Props) {
  const { card, deckId, onCloseModal } = props;
  const { t } = useTranslation();

  const availability = useStore(selectCardAvailability)(card, deckId);
  const canCheckOwnership = useStore(selectCanCheckOwnership);

  if (!availability.used) return null;

  return (
    <div className={css["quantity"]} data-testid="card-modal-usage">
      <h3 className={css["related-title"]}>
        <LayersIcon />
        {t("card_usage.title")}
      </h3>
      {canCheckOwnership && (
        <p>
          {t("card_usage.available", {
            available: Math.max(availability.available, 0),
            owned: availability.owned,
          })}
        </p>
      )}
      <ul className={css["usage-list"]}>
        {availability.decks.map((deck) => (
          <li key={deck.id}>
            {deck.quantity}×{" "}
            <Link href={`/deck/view/${deck.id}`} onClick={onCloseModal}>
              {deck.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
