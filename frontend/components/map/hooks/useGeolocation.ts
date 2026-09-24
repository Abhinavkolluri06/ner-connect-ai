import { useCallback, useState } from "react";

export type GeolocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

export type GeolocationCoords = {
  lat: number;
  lon: number;
  accuracy: number;
};

export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestLocation = useCallback((): Promise<GeolocationCoords | null> => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setErrorMessage("Geolocation is not supported by your browser environment.");
      return Promise.resolve(null);
    }

    setStatus("requesting");
    setErrorMessage(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result: GeolocationCoords = {
            lat: parseFloat(position.coords.latitude.toFixed(4)),
            lon: parseFloat(position.coords.longitude.toFixed(4)),
            accuracy: position.coords.accuracy,
          };
          setCoords(result);
          setStatus("granted");
          resolve(result);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setStatus("denied");
            setErrorMessage("Location permission was denied. Please allow location access in your browser settings.");
          } else {
            setStatus("error");
            setErrorMessage(error.message || "Failed to determine your device location.");
          }
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        },
      );
    });
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setCoords(null);
    setErrorMessage(null);
  }, []);

  return {
    status,
    coords,
    errorMessage,
    requestLocation,
    reset,
  };
}
