import { type Card, SPECIAL_CARD_CODES } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectCardPack } from "@/store/selectors/card-usage";
import {
  selectCanCheckOwnership,
  selectMetadata,
} from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { displayPackName } from "@/utils/formatting";
import css from "./card-pack-icon.module.css";
import PackIcon from "./icons/pack-icon";

/**
 * Icon of the pack a card comes from, shown next to card names.
 * For cards in several products, a pack from the collection is shown; unowned packs are highlighted.
 */
export function CardPackIcon(props: { card: Card }) {
  const { card } = props;
  const { t } = useTranslation();

  // Select the memoized lookup, not its result: a new object per render would loop.
  const pack = useStore(selectCardPack)(card.code);
  const metadata = useStore(selectMetadata);
  const canCheckOwnership = useStore(selectCanCheckOwnership);

  if (
    !pack ||
    !card.official ||
    card.code === SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS
  ) {
    return null;
  }

  const packData = metadata.packs[pack.code];
  if (!packData) return null;

  const missing = canCheckOwnership && !pack.owned;
  const name = displayPackName(packData);

  return (
    <span
      className={cx(css["pack"], missing && css["missing"])}
      data-testid="card-pack"
      data-pack={pack.code}
      title={missing ? t("card_usage.pack_missing", { name }) : name}
    >
      <PackIcon code={pack.code} />
      <span className="sr-only">{name}</span>
    </span>
  );
}
