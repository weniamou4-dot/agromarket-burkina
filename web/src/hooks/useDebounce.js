
import { useEffect, useState } from "react";

/**
 * Retarde la mise à jour d'une valeur jusqu'à ce qu'elle
 * reste inchangée pendant la durée spécifiée.
 *
 * Exemple :
 * const rechercheDebounced = useDebounce(recherche, 400);
 */
export function useDebounce(value, delay = 400) {
  const safeDelay = Math.max(0, Number(delay) || 0);

  const [debouncedValue, setDebouncedValue] =
    useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, safeDelay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, safeDelay]);

  return debouncedValue;
}

export default useDebounce;

