import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/*
 * ============================================================
 * CONSTANTES
 * ============================================================
 */

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60000,
};

const GEOLOCATION_ERRORS = {
  1: "L'accès à votre position a été refusé.",
  2: "Votre position n'a pas pu être déterminée.",
  3: "La récupération de votre position a pris trop de temps.",
};

/*
 * ============================================================
 * NORMALISATION
 * ============================================================
 */

function normalizeCoordinate(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function normalizePosition(position) {
  if (!position?.coords) {
    return null;
  }

  const latitude = normalizeCoordinate(
    position.coords.latitude
  );

  const longitude = normalizeCoordinate(
    position.coords.longitude
  );

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    accuracy: normalizeCoordinate(
      position.coords.accuracy
    ),
    altitude: normalizeCoordinate(
      position.coords.altitude
    ),
    altitudeAccuracy: normalizeCoordinate(
      position.coords.altitudeAccuracy
    ),
    heading: normalizeCoordinate(
      position.coords.heading
    ),
    speed: normalizeCoordinate(
      position.coords.speed
    ),
    timestamp:
      Number(position.timestamp) || Date.now(),
    source: "gps",
  };
}

function normalizeError(error) {
  if (!error) {
    return {
      code: null,
      message:
        "Impossible de récupérer votre position.",
    };
  }

  return {
    code: Number(error.code) || null,
    message:
      GEOLOCATION_ERRORS[error.code] ||
      error.message ||
      "Impossible de récupérer votre position.",
  };
}

/*
 * ============================================================
 * HOOK
 * ============================================================
 */

export function useGeolocation(
  options = {}
) {
  const [position, setPosition] =
    useState(null);

  const [error, setError] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const mountedRef =
    useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
   * ----------------------------------------------------------
   * DISPONIBILITÉ
   * ----------------------------------------------------------
   */

  const isSupported =
    typeof navigator !== "undefined" &&
    "geolocation" in navigator;

  /*
   * ----------------------------------------------------------
   * RÉCUPÉRATION DE LA POSITION
   * ----------------------------------------------------------
   */

  const getCurrentPosition =
    useCallback(() => {
      if (!isSupported) {
        const unsupportedError = {
          code: null,
          message:
            "La géolocalisation n'est pas prise en charge par votre navigateur.",
        };

        if (mountedRef.current) {
          setError(unsupportedError);
          setLoading(false);
        }

        return Promise.reject(
          unsupportedError
        );
      }

      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const mergedOptions = {
        ...DEFAULT_OPTIONS,
        ...options,
      };

      return new Promise(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (rawPosition) => {
              const normalizedPosition =
                normalizePosition(
                  rawPosition
                );

              if (!normalizedPosition) {
                const invalidError = {
                  code: null,
                  message:
                    "Les coordonnées GPS reçues sont invalides.",
                };

                if (mountedRef.current) {
                  setError(invalidError);
                  setLoading(false);
                }

                reject(invalidError);
                return;
              }

              if (mountedRef.current) {
                setPosition(
                  normalizedPosition
                );
                setError(null);
                setLoading(false);
              }

              resolve(
                normalizedPosition
              );
            },
            (rawError) => {
              const normalizedError =
                normalizeError(rawError);

              if (mountedRef.current) {
                setError(normalizedError);
                setLoading(false);
              }

              reject(normalizedError);
            },
            mergedOptions
          );
        }
      );
    }, [
      isSupported,
      options.enableHighAccuracy,
      options.timeout,
      options.maximumAge,
    ]);

  /*
   * ----------------------------------------------------------
   * RÉINITIALISATION
   * ----------------------------------------------------------
   */

  const resetGeolocation =
    useCallback(() => {
      if (!mountedRef.current) {
        return;
      }

      setPosition(null);
      setError(null);
      setLoading(false);
    }, []);

  return {
    position,
    latitude: position?.latitude ?? null,
    longitude: position?.longitude ?? null,
    accuracy: position?.accuracy ?? null,

    error,
    loading,

    isSupported,

    getCurrentPosition,
    resetGeolocation,
  };
}

export default useGeolocation;
