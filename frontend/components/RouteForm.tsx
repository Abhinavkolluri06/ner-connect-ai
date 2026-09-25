"use client";

import { useEffect, useRef, useState } from "react";

import {
  MapPin,
  Truck,
  Package,
  AlertTriangle,
  ArrowRight,
  Bookmark,
  RotateCcw,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";

import type {
  CargoType,
  PriorityLevel,
  RouteRequest,
  VehicleType,
} from "@/lib/types";

import {
  LOCATIONS,
  filterLocationSuggestions,
} from "@/lib/navigation";

export type RouteFormErrors = {
  origin?: string;
  destination?: string;
  vehicle?: string;
  cargo?: string;
  priority?: string;
};

type RouteFormProps = {
  value?: RouteRequest;
  loading?: boolean;
  errors?: RouteFormErrors;

  onChange: (value: RouteRequest) => void;
  onSubmit: () => void;

  onBookmark: () => void;
  bookmarkDisabled: boolean;

  onPickOnMap?: (
    field: "origin" | "destination",
  ) => void;

  activePickMode?:
    | "origin"
    | "destination"
    | null;
};

export { LOCATIONS, filterLocationSuggestions };

const VEHICLES: VehicleType[] = [
  "Bus",
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
    const stored = localStorage.getItem(key);

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

  const cleanLocation = location.trim();

  if (!cleanLocation) {
    return;
  }

  try {
    const existing = getRecentLocations(key);

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
  } catch {
    // Local storage is only a convenience.
  }
}

function LocationField({
  label,
  value,
  placeholder,
  storageKey,
  error,
  onChange,
  onPickOnMap,
  isPickActive,
}: {
  label: string;
  value: string;
  placeholder: string;
  storageKey: string;
  error?: string;

  onChange: (value: string) => void;

  onPickOnMap?: () => void;
  isPickActive?: boolean;
}) {
  const [open, setOpen] =
    useState(false);

  const [activeIndex, setActiveIndex] =
    useState(-1);

  const [recentLocations, setRecentLocations] =
    useState<string[]>([]);

  const inputRef =
    useRef<HTMLInputElement>(null);

  const wrapperRef =
    useRef<HTMLDivElement>(null);

  const fieldId =
    `location-${label.toLowerCase()}`;

  const listboxId =
    `${fieldId}-listbox`;

  useEffect(() => {
    setRecentLocations(
      getRecentLocations(storageKey),
    );
  }, [storageKey]);

  const {
    filteredRecent,
    filteredLocations,
    allVisibleOptions,
  } = filterLocationSuggestions(
    value,
    LOCATIONS,
    recentLocations,
  );

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
        setActiveIndex(-1);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
  }, []);

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

    setOpen(false);
    setActiveIndex(-1);

    inputRef.current?.focus();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      !open &&
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp")
    ) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(0);
      return;
    }

    if (
      allVisibleOptions.length === 0
    ) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setActiveIndex((current) =>
        current <
        allVisibleOptions.length - 1
          ? current + 1
          : 0,
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveIndex((current) =>
        current > 0
          ? current - 1
          : allVisibleOptions.length - 1,
      );
    }

    if (event.key === "Enter") {
      if (
        open &&
        activeIndex >= 0 &&
        activeIndex <
          allVisibleOptions.length
      ) {
        event.preventDefault();

        handleSelect(
          allVisibleOptions[activeIndex],
        );
      }
    }

    if (event.key === "Escape") {
      event.preventDefault();

      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      <div className="flex items-center justify-between">
        <label
          htmlFor={fieldId}
          className="block text-xs font-semibold text-[#0C2A40]"
        >
          {label}
        </label>

        {onPickOnMap ? (
          <button
            type="button"
            onClick={onPickOnMap}
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
              isPickActive
                ? "bg-[#0A9169] text-white"
                : "text-[#087657] hover:bg-[#EFFBF6]"
            }`}
          >
            {isPickActive
              ? "Picking…"
              : "Pick on map"}
          </button>
        ) : null}
      </div>

      <div className="relative mt-1.5">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <MapPin className="h-4 w-4 text-[#0A9169]" />
        </div>

        <input
          ref={inputRef}
          id={fieldId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={
            open ? listboxId : undefined
          }
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className={`block h-12 w-full rounded-xl border bg-white pl-10 pr-4 text-xs font-medium text-[#0C2A40] placeholder-[#8696A3] shadow-soft focus:border-[#0A9169] focus:outline-none focus:ring-2 focus:ring-[#DEF8ED] ${
            error
              ? "border-red-400"
              : "border-[#E1E8ED]"
          }`}
        />
      </div>

      {error ? (
        <p className="mt-1 text-[11px] font-medium text-red-600">
          {error}
        </p>
      ) : null}

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[3000] max-h-60 overflow-y-auto rounded-2xl border border-[#E1E8ED] bg-white p-2 shadow-elevated"
        >
          {filteredRecent.length >
          0 ? (
            <div className="mb-1.5 border-b border-[#E1E8ED] pb-1.5">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#087657]">
                Recent Locations
              </p>

              {filteredRecent.map(
                (location) => {
                  const index =
                    allVisibleOptions.indexOf(
                      location,
                    );

                  return (
                    <button
                      key={`recent-${location}`}
                      type="button"
                      role="option"
                      aria-selected={
                        activeIndex === index
                      }
                      onClick={() =>
                        handleSelect(location)
                      }
                      onMouseEnter={() =>
                        setActiveIndex(index)
                      }
                      className={`block w-full rounded-xl px-3 py-2 text-left text-xs font-medium ${
                        activeIndex === index
                          ? "bg-[#EFFBF6] text-[#087657]"
                          : "text-[#0C2A40] hover:bg-[#F5F9F7]"
                      }`}
                    >
                      ★ {location}
                    </button>
                  );
                },
              )}
            </div>
          ) : null}

          <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8696A3]">
            Northeast Corridor Hubs
          </p>

          {filteredLocations.length >
          0 ? (
            filteredLocations.map(
              (location) => {
                const index =
                  allVisibleOptions.indexOf(
                    location,
                  );

                return (
                  <button
                    key={location}
                    type="button"
                    role="option"
                    aria-selected={
                      activeIndex === index
                    }
                    onClick={() =>
                      handleSelect(location)
                    }
                    onMouseEnter={() =>
                      setActiveIndex(index)
                    }
                    className={`block w-full rounded-xl px-3 py-2 text-left text-xs font-medium ${
                      activeIndex === index
                        ? "bg-[#EFFBF6] text-[#087657]"
                        : "text-[#0C2A40] hover:bg-[#F5F9F7]"
                    }`}
                  >
                    {location}
                  </button>
                );
              },
            )
          ) : filteredRecent.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[#8696A3]">
              No matching locations found
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  icon: Icon,
  error,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  icon: React.ComponentType<{
    className?: string;
  }>;
  error?: string;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#0C2A40]">
        {label}
      </label>

      <div className="relative mt-1.5">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <Icon className="h-4 w-4 text-[#5C6F80]" />
        </div>

        <select
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value as T,
            )
          }
          className={`h-12 w-full appearance-none rounded-xl border bg-white pl-10 pr-9 text-xs font-medium text-[#0C2A40] shadow-soft focus:border-[#0A9169] focus:outline-none focus:ring-2 focus:ring-[#DEF8ED] ${
            error
              ? "border-red-400"
              : "border-[#E1E8ED]"
          }`}
        >
          <option value="">
            Select {label.toLowerCase()}
          </option>

          {options.map((option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
          <ChevronDown className="h-4 w-4 text-[#8696A3]" />
        </div>
      </div>

      {error ? (
        <p className="mt-1 text-[11px] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function RouteForm({
  value: incomingValue,

  loading = false,
  errors = {},
  onChange,
  onSubmit,
  onBookmark,
  bookmarkDisabled = false,
  onPickOnMap,
  activePickMode,
}: RouteFormProps) {
  const value: RouteRequest = incomingValue ?? {
    origin: "",
    destination: "",
    vehicle: "" as RouteRequest["vehicle"],
    cargo: "" as RouteRequest["cargo"],
    priority: "" as RouteRequest["priority"],
  };

  function clearAll() {
    onChange({
      origin: "",
      destination: "",
      vehicle:
        "" as RouteRequest["vehicle"],
      cargo:
        "" as RouteRequest["cargo"],
      priority:
        "" as RouteRequest["priority"],
    });
  }

  return (
    <section className="overflow-visible rounded-3xl border border-[#E1E8ED] bg-white p-5 shadow-card lg:p-6">
      <div className="flex items-center justify-between border-b border-[#E1E8ED] pb-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-[#081F31]">
            Route Planner
          </h2>

          <p className="mt-0.5 text-[11px] text-[#5C6F80]">
            Define your movement.
          </p>
        </div>

        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1 text-xs font-semibold text-[#087657] hover:text-[#0A9169]"
        >
          <RotateCcw className="h-3 w-3" />
          Clear All
        </button>
      </div>

      <div className="space-y-4 pt-4">
        <LocationField
          label="Origin"
          value={value.origin}
          placeholder="Select origin hub"
          storageKey={
            ORIGIN_STORAGE_KEY
          }
          error={errors.origin}
          onChange={(origin) =>
            onChange({
              ...value,
              origin,
            })
          }
          onPickOnMap={() =>
            onPickOnMap?.("origin")
          }
          isPickActive={
            activePickMode === "origin"
          }
        />

        <div className="relative z-10 -my-2 flex justify-center">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                origin:
                  value.destination,
                destination:
                  value.origin,
              })
            }
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E1E8ED] bg-white text-[#5C6F80] shadow-xs hover:border-[#0A9169] hover:text-[#0A9169]"
            aria-label="Swap origin and destination"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <LocationField
          label="Destination"
          value={value.destination}
          placeholder="Select destination hub"
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
          onPickOnMap={() =>
            onPickOnMap?.("destination")
          }
          isPickActive={
            activePickMode ===
            "destination"
          }
        />

        <SelectField
          label="Vehicle Type"
          value={value.vehicle}
          options={VEHICLES}
          icon={Truck}
          error={errors.vehicle}
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
          icon={Package}
          error={errors.cargo}
          onChange={(cargo) =>
            onChange({
              ...value,
              cargo,
            })
          }
        />

        <SelectField
          label="Routing Priority"
          value={value.priority}
          options={PRIORITIES}
          icon={AlertTriangle}
          error={errors.priority}
          onChange={(priority) =>
            onChange({
              ...value,
              priority,
            })
          }
        />

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#081F31] px-4 text-xs font-bold text-white shadow-soft hover:bg-[#0C2A40] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analyzing Routes…
              </>
            ) : (
              <>
                Analyze Routes
                <ArrowRight className="h-4 w-4 text-emerald-400" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBookmark}
            disabled={
              bookmarkDisabled || loading
            }
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#E1E8ED] bg-[#F5F9F7] px-4 text-xs font-semibold text-[#0C2A40] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Bookmark className="h-3.5 w-3.5 text-[#0A9169]" />
            Save Assessment Bookmark
          </button>
        </div>
      </div>
    </section>
  );
}