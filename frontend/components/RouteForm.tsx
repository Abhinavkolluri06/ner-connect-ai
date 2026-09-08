"use client";

import { useEffect, useRef, useState } from "react";

import type {
  CargoType,
  PriorityLevel,
  RouteRequest,
  VehicleType,
} from "@/lib/types";

export type RouteFormErrors = {
  origin?: string;
  destination?: string;
};

type RouteFormProps = {
  value: RouteRequest;
  loading: boolean;
  errors: RouteFormErrors;
  onChange: (value: RouteRequest) => void;
  onSubmit: () => void;
  onBookmark: () => void;
  bookmarkDisabled: boolean;
};

const LOCATIONS = [
  "Guwahati",
  "Shillong",
  "Cherrapunji",
  "Sohra",
  "Imphal",
  "Kohima",
  "Agartala",
  "Aizawl",
  "Gangtok",
  "Itanagar",
  "Dimapur",
  "Silchar",
  "Tura",
];

const VEHICLES: VehicleType[] = [
  "Truck",
  "Van",
  "Ambulance",
  "Light vehicle",
];

const CARGO_TYPES: CargoType[] = [
  "Medical Supplies",
  "Food & Relief",
  "Fuel",
  "General Cargo",
];

const PRIORITIES: PriorityLevel[] = [
  "Emergency",
  "High",
  "Standard",
];

const ORIGIN_STORAGE_KEY =
  "ner-connect-recent-origins";

const DESTINATION_STORAGE_KEY =
  "ner-connect-recent-destinations";

const MAX_RECENT_LOCATIONS = 5;

function getRecentLocations(
  key: string,
): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored =
      localStorage.getItem(key);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is string =>
            typeof item === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function saveRecentLocation(
  key: string,
  location: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  const cleanLocation =
    location.trim();

  if (!cleanLocation) {
    return;
  }

  const existing =
    getRecentLocations(key);

  const updated = [
    cleanLocation,
    ...existing.filter(
      (item) =>
        item.toLowerCase() !==
        cleanLocation.toLowerCase(),
    ),
  ].slice(0, MAX_RECENT_LOCATIONS);

  localStorage.setItem(
    key,
    JSON.stringify(updated),
  );
}

type LocationFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  storageKey: string;
  error?: string;
  onChange: (value: string) => void;
};

function LocationField({
  label,
  value,
  placeholder,
  storageKey,
  error,
  onChange,
}: LocationFieldProps) {
  const wrapperRef =
    useRef<HTMLDivElement>(null);

  const [open, setOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [recentLocations, setRecentLocations] =
    useState<string[]>([]);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  function handleFocus() {
    setRecentLocations(
      getRecentLocations(storageKey),
    );

    setSearchQuery("");
    setOpen(true);
  }

  function handleInputChange(
    nextValue: string,
  ) {
    onChange(nextValue);
    setSearchQuery(nextValue);
    setOpen(true);
  }

  function handleSelect(
    location: string,
  ) {
    onChange(location);

    saveRecentLocation(
      storageKey,
      location,
    );

    setRecentLocations(
      getRecentLocations(storageKey),
    );

    setSearchQuery("");
    setOpen(false);
  }

  const query =
    searchQuery
      .trim()
      .toLowerCase();

  const filteredLocations =
    LOCATIONS.filter((location) =>
      location
        .toLowerCase()
        .includes(query),
    );

  const filteredRecent =
    recentLocations.filter((location) =>
      location
        .toLowerCase()
        .includes(query),
    );

  function LocationOption({
    location,
  }: {
    location: string;
  }) {
    return (
      <button
        type="button"
        onClick={() =>
          handleSelect(location)
        }
        className="block w-full rounded px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
      >
        {location}
      </button>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </label>

      <div
        className={`flex h-10 items-center rounded-md border bg-white transition ${
          error
            ? "border-red-400"
            : open
              ? "border-navy-900 ring-1 ring-navy-900/10"
              : "border-slate-300"
        }`}
      >
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onFocus={handleFocus}
          onChange={(event) =>
            handleInputChange(
              event.target.value,
            )
          }
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-navy-900 outline-none placeholder:text-slate-400"
          aria-invalid={Boolean(error)}
        />

        <button
          type="button"
          onClick={() =>
            open
              ? setOpen(false)
              : handleFocus()
          }
          className="flex h-full w-10 items-center justify-center text-slate-500"
          aria-label={`Choose ${label.toLowerCase()}`}
        >
          <span
            className={`text-xs transition-transform ${
              open
                ? "rotate-180"
                : ""
            }`}
          >
            ▼
          </span>
        </button>
      </div>

      {error ? (
        <p className="mt-1 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[3000] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          {filteredRecent.length >
          0 ? (
            <div className="border-b border-slate-100 p-1.5">
              <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-navy-900">
                Recent locations
              </p>

              {filteredRecent.map(
                (location) => (
                  <LocationOption
                    key={`recent-${location}`}
                    location={location}
                  />
                ),
              )}
            </div>
          ) : null}

          <div className="max-h-56 overflow-y-auto p-1.5">
            <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-navy-900">
              Available locations
            </p>

            {filteredLocations.length >
            0 ? (
              filteredLocations.map(
                (location) => (
                  <LocationOption
                    key={location}
                    location={location}
                  />
                ),
              )
            ) : (
              <p className="px-2 py-2 text-sm text-slate-500">
                No matching locations
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value as T,
          )
        }
        className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 text-sm text-navy-900 outline-none transition focus:border-navy-900 focus:ring-1 focus:ring-navy-900/10"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function RouteForm({
  value,
  loading,
  errors,
  onChange,
  onSubmit,
  onBookmark,
  bookmarkDisabled,
}: RouteFormProps) {
  return (
    <section className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-base font-bold text-navy-900">
            Route Planner
          </h2>

          <p className="mt-0.5 text-[11px] text-slate-500">
            Define your movement.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onChange({
              origin: "",
              destination: "",
              vehicle: "Truck",
              cargo: "Medical Supplies",
              priority: "Emergency",
            })
          }
          className="text-xs font-semibold text-blue-700 hover:text-blue-900"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-3 p-4">
        <LocationField
          label="Origin"
          value={value.origin}
          placeholder="Select origin"
          storageKey={ORIGIN_STORAGE_KEY}
          error={errors.origin}
          onChange={(origin) =>
            onChange({
              ...value,
              origin,
            })
          }
        />

        <LocationField
          label="Destination"
          value={value.destination}
          placeholder="Select destination"
          storageKey={
            DESTINATION_STORAGE_KEY
          }
          error={errors.destination}
          onChange={(destination) =>
            onChange({
              ...value,
              destination,
            })
          }
        />

        <SelectField
          label="Vehicle Type"
          value={value.vehicle}
          options={VEHICLES}
          onChange={(vehicle) =>
            onChange({
              ...value,
              vehicle,
            })
          }
        />

        <SelectField
          label="Cargo Type"
          value={value.cargo}
          options={CARGO_TYPES}
          onChange={(cargo) =>
            onChange({
              ...value,
              cargo,
            })
          }
        />

        <SelectField
          label="Priority"
          value={value.priority}
          options={PRIORITIES}
          onChange={(priority) =>
            onChange({
              ...value,
              priority,
            })
          }
        />

        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="mt-2 flex h-10 w-full items-center justify-center rounded-md bg-navy-900 px-4 text-sm font-bold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Assessing route…"
            : "Find Safe Route →"}
        </button>

        <button
          type="button"
          onClick={onBookmark}
          disabled={
            bookmarkDisabled ||
            loading
          }
          className="flex h-9 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-xs font-bold text-navy-900 transition hover:border-navy-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ☆ Save Route Bookmark
        </button>

        {bookmarkDisabled ? (
          <p className="text-center text-[10px] text-slate-500">
            Calculate a route and select
            the route you want to bookmark.
          </p>
        ) : null}
      </div>
    </section>
  );
}