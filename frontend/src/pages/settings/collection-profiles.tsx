import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  activeCollectionProfile,
  collectionProfiles,
  createCollectionProfile,
  deleteCollectionProfile,
  renameCollectionProfile,
  switchCollectionProfile,
} from "@/store/lib/collection-profiles";
import css from "./collection-profiles.module.css";
import type { SettingProps } from "./types";

type EditMode = { type: "create" } | { type: "rename" };

/**
 * Selects the collection used for ownership and card availability, and manages named collections.
 */
export function CollectionProfilesSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  const [editMode, setEditMode] = useState<EditMode>();
  const [name, setName] = useState("");

  const profiles = collectionProfiles(settings);
  const active = activeCollectionProfile(settings);

  const profileName = (id: string) =>
    profiles[id]?.name || t("settings.collection.profiles.default_name");

  const options = Object.keys(profiles)
    .map((id) => ({ label: profileName(id), value: id }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const onSelect = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    const id = evt.target.value;
    setSettings((prev) => switchCollectionProfile(prev, id));
  };

  const startEdit = (mode: EditMode) => {
    setName(mode.type === "rename" ? profileName(active) : "");
    setEditMode(mode);
  };

  const onSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setSettings((prev) =>
      editMode?.type === "create"
        ? createCollectionProfile(prev, trimmed)
        : renameCollectionProfile(prev, trimmed),
    );

    setEditMode(undefined);
  };

  const onDelete = () => {
    const confirmed = confirm(
      t("settings.collection.profiles.delete_confirm", {
        name: profileName(active),
      }),
    );

    if (confirmed) setSettings((prev) => deleteCollectionProfile(prev));
  };

  const id = "settings-collection-profile";

  return (
    <Field
      bordered
      data-testid="settings-collection-profiles"
      helpText={t("settings.collection.profiles.help")}
    >
      <FieldLabel htmlFor={id}>
        {t("settings.collection.profiles.title")}
      </FieldLabel>
      {editMode ? (
        <div className={css["row"]}>
          <input
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- the input replaces the button that opened it.
            autoFocus
            aria-label={t("settings.collection.profiles.name")}
            className={css["input"]}
            data-testid="collection-profile-name"
            onChange={(evt) => setName(evt.target.value)}
            onKeyDown={(evt) => {
              if (evt.key === "Enter") {
                evt.preventDefault();
                onSubmit();
              } else if (evt.key === "Escape") {
                setEditMode(undefined);
              }
            }}
            placeholder={t("settings.collection.profiles.name")}
            type="text"
            value={name}
          />
          <Button
            data-testid="collection-profile-save"
            disabled={!name.trim()}
            iconOnly
            onClick={onSubmit}
            tooltip={t("common.save")}
          >
            <CheckIcon />
          </Button>
          <Button
            iconOnly
            onClick={() => setEditMode(undefined)}
            tooltip={t("common.cancel")}
          >
            <XIcon />
          </Button>
        </div>
      ) : (
        <div className={css["row"]}>
          <Select
            className={css["select"]}
            data-testid="collection-profile-select"
            id={id}
            onChange={onSelect}
            options={options}
            required
            value={active}
          />
          <Button
            data-testid="collection-profile-create"
            iconOnly
            onClick={() => startEdit({ type: "create" })}
            tooltip={t("settings.collection.profiles.create")}
          >
            <PlusIcon />
          </Button>
          <Button
            data-testid="collection-profile-rename"
            iconOnly
            onClick={() => startEdit({ type: "rename" })}
            tooltip={t("settings.collection.profiles.rename")}
          >
            <PencilIcon />
          </Button>
          <Button
            data-testid="collection-profile-delete"
            disabled={options.length < 2}
            iconOnly
            onClick={onDelete}
            tooltip={t("settings.collection.profiles.delete")}
          >
            <Trash2Icon />
          </Button>
        </div>
      )}
    </Field>
  );
}
