import type {
  CargoType,
  PriorityLevel,
  VehicleType,
} from "./types";

export const originOptions = [
  "Guwahati",
  "Shillong",
  "Imphal",
  "Agartala",
  "Aizawl",
  "Kohima",
  "Itanagar",
  "Gangtok",
] as const;

export const destinationOptions = originOptions;

export const VEHICLE_OPTIONS: VehicleType[] = [
  "Bus",
  "Truck",
  "Van",
  "Ambulance",
  "Light vehicle",
];

export const cargoOptions: CargoType[] = [
  "Medical Supplies",
  "Food & Relief",
  "Fuel",
  "General Cargo",
];

export const priorityOptions: PriorityLevel[] = [
  "Emergency",
  "High",
  "Standard",
];