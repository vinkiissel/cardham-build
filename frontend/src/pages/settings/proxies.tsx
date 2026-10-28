import type { Card } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { CardsCombobox } from "@/components/cards-combobox";
import { ListCardInner } from "@/components/list-card/list-card-inner";
import { Field, FieldLabel } from "@/components/ui/field";
import { useStore } from "@/store";
import {
  filterDuplicates,
  filterMythosCards,
  filterType,
} from "@/store/lib/filtering";
import { makeSortFunction } from "@/store/lib/sorting";
import {
  selectLocaleSortingCollator,
  selectMetadata,
} from "@/store/selectors/shared";
import { official } from "@/utils/card-utils";
import { and, not } from "@/utils/fp";
import css from "./proxies.module.css";
import type { SettingProps } from "./types";

const PROXY_LIMIT = 9;

/**
 * Adds single cards to the collection, e.g. proxies or promo cards.
 */
export function ProxiesSetting(props: SettingProps) {
  const { settings, setSettings } = props;

  const { t } = useTranslation();

  const metadata = useStore(selectMetadata);
  const collator = useStore(selectLocaleSortingCollator);
  const locale = useStore((state) => state.settings.locale);

  const proxies = settings.proxies ?? {};

  const sortFn = makeSortFunction(
    ["name", "level", "position"],
    metadata,
    collator,
  );

  const cards = (() => {
    const filter = and([
      official,
      filterMythosCards,
      not(filterType(["investigator"])),
      filterDuplicates,
    ]);

    return Object.values(metadata.cards).filter(filter).sort(sortFn);
  })();

  const proxiedCards = Object.entries(proxies)
    .filter(([code, quantity]) => quantity > 0 && metadata.cards[code])
    .map(([code]) => metadata.cards[code])
    .sort(sortFn);

  const setQuantity = (code: string, quantity: number) => {
    setSettings((prev) => {
      const next = { ...prev.proxies };

      if (quantity > 0) {
        next[code] = quantity;
      } else {
        delete next[code];
      }

      return { ...prev, proxies: next };
    });
  };

  const onAddCards = (selected: Card[]) => {
    for (const card of selected) {
      if (!proxies[card.code]) setQuantity(card.code, 1);
    }
  };

  return (
    <Field bordered helpText={t("settings.collection.proxies_help")}>
      <FieldLabel as="div">{t("settings.collection.proxies")}</FieldLabel>
      <div className={css["proxies"]} data-testid="settings-proxies">
        <CardsCombobox
          id="proxies-add"
          items={cards}
          label={t("settings.collection.proxies_add")}
          limit={1}
          locale={locale}
          onValueChange={onAddCards}
          selectedItems={[]}
        />
        {proxiedCards.length > 0 && (
          <ol className={css["list"]}>
            {proxiedCards.map((card) => (
              <ListCardInner
                as="li"
                card={card}
                cardShowCollectionNumber
                key={card.code}
                limitOverride={PROXY_LIMIT}
                omitThumbnail
                onChangeCardQuantity={(card, quantity) =>
                  setQuantity(card.code, quantity)
                }
                quantity={proxies[card.code]}
                size="sm"
              />
            ))}
          </ol>
        )}
      </div>
    </Field>
  );
}
