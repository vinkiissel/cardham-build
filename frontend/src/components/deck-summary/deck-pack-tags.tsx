import type { Id } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectDeckPacks } from "@/store/selectors/card-usage";
import {
  selectCanCheckOwnership,
  selectMetadata,
} from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { displayPackName, shortenPackName } from "@/utils/formatting";
import PackIcon from "../icons/pack-icon";
import { Tag } from "../ui/tag";
import css from "./deck-pack-tags.module.css";

/**
 * Icons for the packs needed to build a deck, with the pack name as tooltip.
 * Packs missing from the collection are highlighted.
 */
export function DeckPackTags(props: { deckId: Id; max?: number }) {
  const { deckId, max = 6 } = props;
  const { t } = useTranslation();

  const packs = useStore((state) => selectDeckPacks(state)[deckId]);
  const metadata = useStore(selectMetadata);
  const canCheckOwnership = useStore(selectCanCheckOwnership);

  if (!packs) return null;

  // Keep the deck entry to a single line: show the first packs, the rest as a count.
  const limit = packs.length > max ? max - 1 : max;
  const shown = packs.slice(0, limit);
  const hidden = packs.slice(limit);

  const hiddenNames = hidden
    .map(({ code }) => metadata.packs[code])
    .filter(Boolean)
    .map((pack) => displayPackName(pack))
    .join(", ");

  const icons = shown.map(({ code, owned }) => {
    const pack = metadata.packs[code];
    if (!pack) return null;

    const missing = canCheckOwnership && !owned;

    return (
      <Tag
        as="li"
        className={cx(missing && css["missing"])}
        data-testid={`deck-pack-${code}`}
        key={code}
        size="xs"
      >
        <span
          className={css["pack"]}
          title={
            missing
              ? t("card_usage.pack_missing", { name: displayPackName(pack) })
              : displayPackName(pack)
          }
        >
          <PackIcon className={css["icon"]} code={code} />
          <span className="sr-only">{shortenPackName(pack)}</span>
        </span>
      </Tag>
    );
  });

  return (
    <>
      {icons}
      {hidden.length > 0 && (
        <Tag as="li" data-testid="deck-pack-more" size="xs">
          <span
            className={cx(
              css["pack"],
              canCheckOwnership &&
                hidden.some((pack) => !pack.owned) &&
                css["missing"],
            )}
            title={hiddenNames}
          >
            +{hidden.length}
          </span>
        </Tag>
      )}
    </>
  );
}
