import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/*
 * ============================================================
 * UTILITAIRE
 * ============================================================
 */

function getErrorMessage(error) {
  if (!error) {
    return null;
  }

  if (
    typeof error === "string"
  ) {
    return error;
  }

  if (
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message.trim();
  }

  if (
    typeof error.detail === "string" &&
    error.detail.trim()
  ) {
    return error.detail.trim();
  }

  return "Une erreur est survenue.";
}

/*
 * ============================================================
 * HOOK
 * ============================================================
 */

export function useAsync(
  asyncFunction,
  options = {}
) {
  const {
    immediate = false,
    initialData = null,
  } = options;

  const mountedRef =
    useRef(true);

  const requestIdRef =
    useRef(0);

  const [data, setData] =
    useState(initialData);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  /*
   * ----------------------------------------------------------
   * MONTAGE / DÉMONTAGE
   * ----------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
   * ----------------------------------------------------------
   * EXÉCUTION
   * ----------------------------------------------------------
   */

  const execute =
    useCallback(
      async (...args) => {
        const currentRequestId =
          ++requestIdRef.current;

        if (mountedRef.current) {
          setLoading(true);
          setError(null);
        }

        try {
          const result =
            await asyncFunction(...args);

          /*
           * Une ancienne requête ne doit pas
           * écraser le résultat d'une requête
           * plus récente.
           */
          if (
            !mountedRef.current ||
            currentRequestId !==
              requestIdRef.current
          ) {
            return result;
          }

          setData(result);
          setLoading(false);

          return result;
        } catch (err) {
          if (
            !mountedRef.current ||
            currentRequestId !==
              requestIdRef.current
          ) {
            throw err;
          }

          const message =
            getErrorMessage(err);

          setError(message);
          setLoading(false);

          throw err;
        }
      },
      [asyncFunction]
    );

  /*
   * ----------------------------------------------------------
   * RÉINITIALISATION
   * ----------------------------------------------------------
   */

  const reset =
    useCallback(() => {
      requestIdRef.current += 1;

      if (!mountedRef.current) {
        return;
      }

      setData(initialData);
      setLoading(false);
      setError(null);
    }, [initialData]);

  /*
   * ----------------------------------------------------------
   * EXÉCUTION AUTOMATIQUE
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!immediate) {
      return;
    }

    execute().catch(() => {
      /*
       * L'état error est déjà géré par le hook.
       * Le catch évite une Promise rejetée non gérée.
       */
    });
  }, [immediate, execute]);

  return {
    data,
    setData,

    loading,
    error,

    execute,
    reset,
  };
}

export default useAsync;
