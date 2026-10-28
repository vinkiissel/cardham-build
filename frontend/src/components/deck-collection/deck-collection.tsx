import { type DeckId, isArkhamDBIdentity } from "@arkham-build/shared";
import {
  DownloadIcon,
  EllipsisIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Virtuoso } from "react-virtuoso";
import { Link, useLocation } from "wouter";
import {
  useDeleteDeck,
  useDuplicateDeck,
} from "@/components/deck-display/hooks";
import {
  DeckSummary,
  DeckSummaryQuickActions,
} from "@/components/deck-summary/deck-summary";
import { BuiltDeckConflicts } from "@/components/deck-summary/built-deck-conflicts";
import { BuiltToggle } from "@/components/deck-summary/built-toggle";
import { DeckPackTags } from "@/components/deck-summary/deck-pack-tags";
import { Button } from "@/components/ui/button";
import {
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Scroller } from "@/components/ui/scroller";
import { useToast } from "@/components/ui/toast.hooks";
import {
  useDeleteAllDecksMutation,
  useImportFromFilesMutation,
} from "@/queries/mutations/decks";
import { useStore } from "@/store";
import type { DeckSummary as DeckSummaryType } from "@/store/lib/types";
import { isBuiltDeck } from "@/store/lib/card-usage";
import { createDeckBundle } from "@/store/lib/deck-bundle";
import { selectBuiltDeckConflicts } from "@/store/selectors/card-usage";
import { selectDecksDisplayList } from "@/store/selectors/deck-collection";
import { ACCOUNTS_ENABLED, ARKHAMDB_WARNING_VISIBLE } from "@/utils/constants";
import {
  createAuthRedirectPath,
  getCurrentLocalPath,
} from "@/utils/navigation-returns";
import { download } from "@/utils/download";
import { useHotkey } from "@/utils/use-hotkey";
import { Notice } from "../ui/notice";
import css from "./deck-collection.module.css";
import { DeckCollectionFilters } from "./deck-collection-filters";
import { DeckCollectionFolder } from "./deck-collection-folder";
import { DeckCollectionImport } from "./deck-collection-import";

export function DeckCollection() {
  const { t } = useTranslation();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const [scrollParent, setScrollParent] = useState<HTMLElement | undefined>();

  const [, navigate] = useLocation();
  const toast = useToast();

  const deckCollection = useStore(selectDecksDisplayList);

  const importDecksMutation = useImportFromFilesMutation();
  const deleteAllDecksMutation = useDeleteAllDecksMutation();

  const hasConnections = useStore(
    (state) => state.auth.status === "authenticated",
  );

  const hasArkhamDBConnection = useStore(
    (state) =>
      state.auth.status === "authenticated" &&
      !!state.auth.session?.identities.some(isArkhamDBIdentity),
  );

  const onAddFiles = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const input = evt.currentTarget;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const toastId = toast.show({
      children: t("deck_collection.import_loading"),
      variant: "loading",
    });

    try {
      const { imported, skipped } =
        await importDecksMutation.mutateAsync(files);

      toast.show({
        children: skipped
          ? t("deck_collection.import_summary_skipped", {
              count: imported,
              skipped,
            })
          : t("deck_collection.import_summary", { count: imported }),
        duration: 5000,
        variant: "success",
      });
    } catch (error) {
      toast.show({
        children: t("deck_collection.import_error", {
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        variant: "error",
      });
    }

    input.value = "";
    setPopoverOpen(false);
    toast.dismiss(toastId);
  };

  const onDeleteAll = async () => {
    const confirmed = confirm(t("deck_collection.delete_all_confirm"));

    if (confirmed) {
      setPopoverOpen(false);

      const toastId = toast.show({
        children: t("deck_collection.delete_all_loading"),
        variant: "loading",
      });
      try {
        await deleteAllDecksMutation.mutateAsync();
        toast.dismiss(toastId);
      } catch (err) {
        toast.dismiss(toastId);
        toast.show({
          children: t("deck_collection.delete_all_error", {
            error: (err as Error)?.message,
          }),
          variant: "error",
        });
      }
    }
  };

  const onExportAll = () => {
    const bundle = createDeckBundle(useStore.getState().data);
    const date = new Date().toISOString().slice(0, 10);

    download(JSON.stringify(bundle), `decks-${date}.json`, "application/json");

    setPopoverOpen(false);
  };

  const deleteDeck = useDeleteDeck();
  const duplicateDeck = useDuplicateDeck();

  const onNewDeck = () => {
    navigate("/deck/create");
  };

  useHotkey("n", onNewDeck);

  return (
    <div className={css["container"]}>
      <input
        className="sr-only"
        accept="application/json"
        id="collection-import"
        type="file"
        multiple
        onChange={onAddFiles}
      />
      {ARKHAMDB_WARNING_VISIBLE && hasArkhamDBConnection && (
        <Notice className={css["banner"]} variant="warning">
          {t("deck_collection.arkhamdb_response_time_banner")}
        </Notice>
      )}
      <header className={css["header"]}>
        <h2 className={css["title"]}>{t("deck_collection.title")}</h2>
        <div className={css["actions"]}>
          {!hasConnections && <DeckCollectionImport />}
          <Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="bare"
                data-testid="collection-more-actions"
                aria-label={t("common.more_actions")}
              >
                <EllipsisIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <DropdownMenu>
                <DropdownItem>
                  <Button
                    as="label"
                    data-testid="collection-import-button"
                    htmlFor="collection-import"
                    full
                    variant="bare"
                  >
                    <UploadIcon /> {t("deck_collection.import_json")}
                  </Button>
                </DropdownItem>
                <DropdownButton
                  data-testid="collection-export-all"
                  onClick={onExportAll}
                  full
                  variant="bare"
                >
                  <DownloadIcon /> {t("deck_collection.export_all")}
                </DropdownButton>
                <DropdownButton
                  data-testid="collection-delete-all"
                  onClick={onDeleteAll}
                  full
                  variant="bare"
                >
                  <Trash2Icon /> {t("deck_collection.delete_all")}
                </DropdownButton>
              </DropdownMenu>
            </PopoverContent>
          </Popover>
        </div>
      </header>
      <div className={css["cta"]}>
        <Link asChild to="/deck/create">
          <Button as="a" data-testid="collection-create-deck" size="sm">
            <PlusIcon />
            {t("deck.actions.create")}
          </Button>
        </Link>
      </div>

      {deckCollection.total > 1 && (
        <div className={css["filters"]}>
          <DeckCollectionFilters
            filteredCount={deckCollection.deckCount}
            totalCount={deckCollection.total}
          />
        </div>
      )}
      {deckCollection.total ? (
        <Scroller
          className={css["scroller"]}
          padded
          ref={
            setScrollParent as unknown as React.RefObject<HTMLDivElement | null>
          }
          type="hover"
        >
          <Virtuoso
            customScrollParent={scrollParent}
            data={deckCollection.entries}
            defaultItemHeight={97}
            overscan={5}
            totalCount={deckCollection.total}
            skipAnimationFrameInResizeObserver
            itemContent={(_, entry) => (
              <div
                key={
                  entry.type === "section"
                    ? entry.section
                    : `${entry.section}-${entry.type === "deck" ? entry.deck.id : entry.folder.id}`
                }
                className={css["collection-entry"]}
                style={
                  {
                    "--depth": entry.depth,
                    "--folder-color": entry.folder?.color,
                  } as React.CSSProperties
                }
              >
                {entry.type === "section" && (
                  <h3
                    className={css["section"]}
                    data-testid={`collection-section-${entry.section}`}
                  >
                    {t(`deck_collection.section_${entry.section}`)}
                    <span className={css["section-count"]}>{entry.count}</span>
                  </h3>
                )}
                {entry.type === "folder" && (
                  <DeckCollectionFolder
                    count={entry.count}
                    expanded={entry.expanded}
                    folder={entry.folder}
                  />
                )}
                {entry.type === "deck" && (
                  <DeckCollectionDeckEntry
                    deck={entry.deck}
                    deleteDeck={deleteDeck}
                    depth={entry.depth}
                    duplicateDeck={duplicateDeck}
                  />
                )}
              </div>
            )}
          />
        </Scroller>
      ) : (
        <div className={css["placeholder-container"]}>
          <figure className={css["placeholder"]}>
            <i className="icon-deck" />
            <figcaption className={css["placeholder-caption"]}>
              {t("deck_collection.collection_empty")}
              <nav className={css["placeholder-actions"]}>
                <Link href="/deck/create" asChild>
                  <Button variant="bare">
                    <PlusIcon />
                    {t("deck.actions.create")}
                  </Button>
                </Link>
                {ACCOUNTS_ENABLED && (
                  <Link
                    asChild
                    href={createAuthRedirectPath(
                      "/auth/login",
                      getCurrentLocalPath(),
                    )}
                  >
                    <Button variant="bare">{t("auth.login.action")}</Button>
                  </Link>
                )}
              </nav>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}

function DeckCollectionDeckEntry({
  deck,
  deleteDeck,
  depth,
  duplicateDeck,
}: {
  deck: DeckSummaryType;
  deleteDeck: (id: DeckId) => Promise<void>;
  depth: number;
  duplicateDeck: (id: DeckId) => void;
}) {
  const hasSyncConflict = useStore(
    (state) => state.sync.decks.items[deck.id]?.status === "conflict",
  );

  const built = useStore((state) => {
    const stored = state.data.decks[deck.id];
    return stored ? isBuiltDeck(stored) : false;
  });

  const conflicts = useStore(
    (state) => selectBuiltDeckConflicts(state)[deck.id],
  );

  return (
    <div
      className={css["deck"]}
      data-testid={`collection-deck-${deck.name}`}
      style={{ "--depth": depth } as React.CSSProperties}
    >
      <DeckSummary
        data-testid="collection-deck"
        deck={deck}
        hasSyncConflict={hasSyncConflict}
        interactive
        showThumbnail
        size="sm"
        validation={deck.problem}
        className={
          built
            ? conflicts?.length
              ? css["built-conflict"]
              : css["built-ok"]
            : undefined
        }
        data-built-status={
          built ? (conflicts?.length ? "conflict" : "ok") : undefined
        }
        tags={
          <DeckPackTags
            deckId={deck.id}
            max={built && conflicts?.length ? 4 : 6}
          />
        }
        metaPrefix={
          <>
            <BuiltToggle deckId={deck.id} />
            {built && !!conflicts?.length && (
              <BuiltDeckConflicts conflicts={conflicts} />
            )}
          </>
        }
      >
        <DeckSummaryQuickActions
          deck={deck}
          onDeleteDeck={deleteDeck}
          onDuplicateDeck={duplicateDeck}
        />
      </DeckSummary>
    </div>
  );
}
