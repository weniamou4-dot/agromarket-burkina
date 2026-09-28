
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import "../styles/pages/conversation.css"
import { useAuth } from "../context/AuthContext";

import {
  getConversationById,
  getMessagesConversation,
  envoyerMessage,
  marquerMessagesCommeLus,
} from "../services/api/messagerie";

import { getImageUrl } from "../utils/media";


/*
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function formaterHeure(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}


function formaterDateComplete(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}


function tronquerTexte(
  texte,
  longueur = 70
) {
  const value = String(
    texte ?? ""
  ).trim();

  if (value.length <= longueur) {
    return value;
  }

  return `${value.slice(
    0,
    longueur
  ).trim()}…`;
}


function normaliserMessages(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (
    Array.isArray(result?.messages)
  ) {
    return result.messages;
  }

  if (
    Array.isArray(result?.results)
  ) {
    return result.results;
  }

  if (
    Array.isArray(result?.resultats)
  ) {
    return result.resultats;
  }

  return [];
}


function normaliserConversation(
  result
) {
  if (!result) {
    return null;
  }

  if (
    result.conversation &&
    typeof result.conversation === "object"
  ) {
    return result.conversation;
  }

  return result;
}


function obtenirNomUtilisateur(
  utilisateur
) {
  if (!utilisateur) {
    return "Utilisateur";
  }

  return (
    utilisateur.nom ||
    utilisateur.username ||
    utilisateur.full_name ||
    "Utilisateur"
  );
}


function obtenirNomProduit(
  conversation
) {
  const annonce =
    conversation?.annonce;

  if (!annonce) {
    return "Annonce";
  }

  if (annonce.produit_nom) {
    return annonce.produit_nom;
  }

  if (annonce.produit?.nom) {
    return annonce.produit.nom;
  }

  return `Annonce #${annonce.id}`;
}


/*
 * ============================================================
 * COMPOSANT
 * ============================================================
 */

export default function Conversation() {
  const navigate = useNavigate();

  const { conversationId } =
    useParams();

  const {
    user,
    loading: authLoading,
    isAuthenticated,
  } = useAuth();


  /*
   * ==========================================================
   * ÉTATS
   * ==========================================================
   */

  const [conversation, setConversation] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [messagesLoading, setMessagesLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [messageError, setMessageError] =
    useState("");

  const [contenu, setContenu] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);


  /*
   * ==========================================================
   * RÉFÉRENCES
   * ==========================================================
   */

  const textareaRef =
    useRef(null);

  const messagesEndRef =
    useRef(null);

  const mountedRef =
    useRef(true);


  /*
   * ==========================================================
   * IDENTIFIANT
   * ==========================================================
   */

  const id = useMemo(
    () => Number(conversationId),
    [conversationId]
  );

  const currentUserId = useMemo(
    () => Number(user?.id) || 0,
    [user?.id]
  );


  /*
   * ==========================================================
   * VALIDATION ID
   * ==========================================================
   */

  const idValide =
    Number.isInteger(id) &&
    id > 0;


  /*
   * ==========================================================
   * MONTAGE / DÉMONTAGE
   * ==========================================================
   */

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);


  /*
   * ==========================================================
   * REDIRECTION SI NON CONNECTÉ
   * ==========================================================
   */

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate(
        `/connexion?redirect=${encodeURIComponent(
          `/messages/${conversationId}`
        )}`,
        {
          replace: true,
        }
      );
    }
  }, [
    authLoading,
    isAuthenticated,
    navigate,
    conversationId,
  ]);


  /*
   * ==========================================================
   * CHARGER LA CONVERSATION
   * ==========================================================
   */

  const chargerConversation =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (
          !isAuthenticated ||
          !idValide
        ) {
          return;
        }

        if (!silent) {
          setLoading(true);
        }

        setError("");

        try {
          const result =
            await getConversationById(id);

          if (!mountedRef.current) {
            return;
          }

          setConversation(
            normaliserConversation(
              result
            )
          );
        } catch (err) {
          if (!mountedRef.current) {
            return;
          }

          setError(
            err?.message ||
            "Impossible de récupérer la conversation."
          );
        } finally {
          if (mountedRef.current) {
            setLoading(false);
          }
        }
      },
      [
        id,
        idValide,
        isAuthenticated,
      ]
    );


  /*
   * ==========================================================
   * CHARGER LES MESSAGES
   * ==========================================================
   */

  const chargerMessages =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (
          !isAuthenticated ||
          !idValide
        ) {
          return;
        }

        if (!silent) {
          setMessagesLoading(true);
        }

        try {
          const result =
            await getMessagesConversation(
              id,
              {
                page: 1,
                limit: 100,
              }
            );

          if (!mountedRef.current) {
            return;
          }

          setMessages(
            normaliserMessages(result)
          );
        } catch (err) {
          if (!mountedRef.current) {
            return;
          }

          setMessageError(
            err?.message ||
            "Impossible de récupérer les messages."
          );
        } finally {
          if (mountedRef.current) {
            setMessagesLoading(false);
          }
        }
      },
      [
        id,
        idValide,
        isAuthenticated,
      ]
    );


  /*
   * ==========================================================
   * CHARGEMENT INITIAL
   * ==========================================================
   */

  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      !idValide
    ) {
      if (
        !authLoading &&
        !idValide
      ) {
        setLoading(false);
        setMessagesLoading(false);
        setError(
          "Identifiant de conversation invalide."
        );
      }

      return;
    }

    setMessageError("");

    chargerConversation();

    chargerMessages();
  }, [
    authLoading,
    isAuthenticated,
    idValide,
    chargerConversation,
    chargerMessages,
  ]);


  /*
   * ==========================================================
   * MARQUER COMME LU
   * ==========================================================
   */

  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      !idValide ||
      messages.length === 0
    ) {
      return;
    }

    marquerMessagesCommeLus(id)
      .catch(() => {
        /*
         * L'échec du marquage comme lu ne doit pas
         * bloquer l'affichage de la conversation.
         */
      });
  }, [
    authLoading,
    isAuthenticated,
    idValide,
    id,
    messages.length,
  ]);


  /*
   * ==========================================================
   * ACTUALISATION AUTOMATIQUE
   * ==========================================================
   *
   * Pour le MVP, nous utilisons un polling toutes les
   * 5 secondes.
   *
   * Plus tard, nous pourrons remplacer cette mécanique
   * par WebSocket sans modifier l'architecture des services.
   */

  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      !idValide
    ) {
      return undefined;
    }

    const interval =
      window.setInterval(
        async () => {
          if (!mountedRef.current) {
            return;
          }

          try {
            await chargerMessages({
              silent: true,
            });
          } catch {
            /*
             * chargerMessages gère déjà son état d'erreur.
             */
          }
        },
        5000
      );

    return () => {
      window.clearInterval(interval);
    };
  }, [
    authLoading,
    isAuthenticated,
    idValide,
    chargerMessages,
  ]);


  /*
   * ==========================================================
   * DÉFILEMENT VERS LE DERNIER MESSAGE
   * ==========================================================
   */

  useEffect(() => {
    if (
      messages.length === 0
    ) {
      return;
    }

    window.requestAnimationFrame(
      () => {
        messagesEndRef.current?.scrollIntoView(
          {
            behavior: "smooth",
            block: "end",
          }
        );
      }
    );
  }, [messages]);


  /*
   * ==========================================================
   * INFORMATIONS SUR L'INTERLOCUTEUR
   * ==========================================================
   */

  const interlocuteur =
    useMemo(() => {
      if (!conversation) {
        return null;
      }

      const vendeurId =
        Number(
          conversation.vendeur_id
        );

      const acheteurId =
        Number(
          conversation.acheteur_id
        );

      if (
        currentUserId > 0 &&
        vendeurId === currentUserId
      ) {
        return conversation.acheteur;
      }

      if (
        currentUserId > 0 &&
        acheteurId === currentUserId
      ) {
        return conversation.vendeur;
      }

      return (
        conversation.vendeur ??
        conversation.acheteur ??
        null
      );
    }, [
      conversation,
      currentUserId,
    ]);


  const interlocuteurNom =
    obtenirNomUtilisateur(
      interlocuteur
    );

  const interlocuteurPhoto =
    interlocuteur?.photo_profil
      ? getImageUrl(
          interlocuteur.photo_profil
        )
      : null;

  const nomProduit =
    obtenirNomProduit(
      conversation
    );


  /*
   * ==========================================================
   * ENVOYER LE MESSAGE
   * ==========================================================
   */

  const envoyer =
    useCallback(
      async () => {
        const texte =
          contenu.trim();

        if (!texte) {
          setMessageError(
            "Veuillez saisir un message."
          );

          textareaRef.current?.focus();

          return;
        }

        if (texte.length > 2000) {
          setMessageError(
            "Le message ne peut pas dépasser 2000 caractères."
          );

          return;
        }

        if (
          !idValide ||
          sending
        ) {
          return;
        }

        setSending(true);
        setMessageError("");

        try {
          const nouveauMessage =
            await envoyerMessage(
              id,
              texte
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          /*
           * Ajout immédiat du message retourné
           * par l'API.
           */
          if (
            nouveauMessage &&
            typeof nouveauMessage ===
              "object"
          ) {
            setMessages(
              (anciensMessages) => {
                const existe =
                  anciensMessages.some(
                    (message) =>
                      Number(
                        message?.id
                      ) ===
                      Number(
                        nouveauMessage?.id
                      )
                  );

                if (existe) {
                  return anciensMessages;
                }

                return [
                  ...anciensMessages,
                  nouveauMessage,
                ];
              }
            );
          }

          setContenu("");

          textareaRef.current?.focus();

          /*
           * Synchronisation avec le serveur
           * pour garantir que l'affichage local
           * correspond à la base.
           */
          await chargerMessages({
            silent: true,
          });
        } catch (err) {
          if (!mountedRef.current) {
            return;
          }

          setMessageError(
            err?.message ||
            "Impossible d'envoyer le message."
          );
        } finally {
          if (mountedRef.current) {
            setSending(false);
          }
        }
      },
      [
        contenu,
        id,
        idValide,
        sending,
        chargerMessages,
      ]
    );


  /*
   * ==========================================================
   * CLAVIER
   * ==========================================================
   */

  const gererClavier =
    useCallback(
      (event) => {
        if (
          event.key !== "Enter"
        ) {
          return;
        }

        /*
         * Shift + Enter = nouvelle ligne
         */
        if (event.shiftKey) {
          return;
        }

        /*
         * Enter seul = envoyer
         */
        event.preventDefault();

        envoyer();
      },
      [envoyer]
    );


  /*
   * ==========================================================
   * ACTUALISER
   * ==========================================================
   */

  const actualiser =
    useCallback(
      async () => {
        if (
          refreshing ||
          !idValide
        ) {
          return;
        }

        setRefreshing(true);
        setMessageError("");

        try {
          await Promise.all([
            chargerConversation({
              silent: true,
            }),
            chargerMessages({
              silent: true,
            }),
          ]);

          /*
           * Les messages reçus deviennent lus
           * après l'actualisation.
           */
          await marquerMessagesCommeLus(
            id
          );
        } catch {
          /*
           * Les fonctions individuelles gèrent
           * déjà leurs erreurs.
           */
        } finally {
          if (mountedRef.current) {
            setRefreshing(false);
          }
        }
      },
      [
        refreshing,
        idValide,
        id,
        chargerConversation,
        chargerMessages,
      ]
    );


  /*
   * ==========================================================
   * ÉTAT AUTH
   * ==========================================================
   */

  if (authLoading) {
    return (
      <main className="page page-loading">
        <section className="page-loading">
          <p>Chargement...</p>
        </section>
      </main>
    );
  }


  /*
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <main className="page conversation-page">

      <section className="conversation-container">

        {/* ==================================================
            EN-TÊTE
        ================================================== */}

        <header className="conversation-header">

          <button
            type="button"
            className="conversation-back-button"
            onClick={() =>
              navigate("/messages")
            }
            aria-label="Retour aux messages"
          >
            ←
          </button>


          <div className="conversation-user">

            <div className="conversation-avatar">

              {interlocuteurPhoto ? (
                <img
                  src={
                    interlocuteurPhoto
                  }
                  alt={`Photo de ${interlocuteurNom}`}
                />
              ) : (
                <span aria-hidden="true">
                  👤
                </span>
              )}

            </div>


            <div className="conversation-user-info">

              <h1>
                {interlocuteurNom}
              </h1>

              <p>
                {nomProduit}
              </p>

            </div>

          </div>


          <button
            type="button"
            className="conversation-refresh-button"
            onClick={actualiser}
            disabled={
              refreshing ||
              loading ||
              messagesLoading
            }
            aria-label="Actualiser la conversation"
          >
            {refreshing
              ? "..."
              : "↻"}
          </button>

        </header>


        {/* ==================================================
            INFORMATIONS ANNONCE
        ================================================== */}

        {conversation?.annonce && (
          <section className="conversation-annonce">

            <div>

              <strong>
                {nomProduit}
              </strong>

              <p>
                {Number(
                  conversation.annonce.prix
                ).toLocaleString(
                  "fr-FR"
                )}{" "}
                FCFA
                {" • "}
                {conversation.annonce.quantite}{" "}
                {conversation.annonce.unite}
              </p>

              <small>
                {conversation.annonce.commune ||
                  conversation.annonce.province ||
                  conversation.annonce.region ||
                  ""}
              </small>

            </div>


            {conversation.annonce.id && (
              <Link
                to={`/produits/${conversation.annonce.id}`}
                className="conversation-annonce-link"
              >
                Voir l'annonce
              </Link>
            )}

          </section>
        )}


        {/* ==================================================
            ERREUR CONVERSATION
        ================================================== */}

        {error && (
          <section
            className="conversation-error"
            role="alert"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                chargerConversation()
              }
            >
              Réessayer
            </button>
          </section>
        )}


        {/* ==================================================
            ERREUR MESSAGE
        ================================================== */}

        {messageError && (
          <section
            className="conversation-message-error"
            role="alert"
          >
            <span>
              {messageError}
            </span>

            <button
              type="button"
              onClick={() =>
                setMessageError("")
              }
              aria-label="Fermer le message d'erreur"
            >
              ×
            </button>
          </section>
        )}


        {/* ==================================================
            ZONE DES MESSAGES
        ================================================== */}

        <section
          className="conversation-messages"
          aria-label="Messages"
        >

          {messagesLoading &&
            messages.length === 0 && (
              <div className="conversation-loading">
                <p>
                  Chargement des messages...
                </p>
              </div>
            )}


          {!messagesLoading &&
            !error &&
            messages.length === 0 && (
              <div className="conversation-empty">

                <div
                  className="conversation-empty-icon"
                  aria-hidden="true"
                >
                  💬
                </div>

                <h2>
                  Aucun message
                </h2>

                <p>
                  Commencez la conversation
                  avec {interlocuteurNom}.
                </p>

              </div>
            )}


          {messages.map(
            (message) => {
              const expediteurId =
                Number(
                  message?.expediteur_id
                );

              const estMoi =
                expediteurId ===
                currentUserId;

              const expediteurNom =
                estMoi
                  ? "Vous"
                  : obtenirNomUtilisateur(
                      message?.expediteur
                    );

              const heure =
                formaterHeure(
                  message?.date_creation
                );

              const dateComplete =
                formaterDateComplete(
                  message?.date_creation
                );

              return (
                <article
                  key={message.id}
                  className={`conversation-message ${
                    estMoi
                      ? "conversation-message-sent"
                      : "conversation-message-received"
                  }`}
                >

                  <div className="conversation-message-bubble">

                    <p className="conversation-message-author">
                      {expediteurNom}
                    </p>

                    <p className="conversation-message-text">
                      {message.contenu}
                    </p>

                    <time
                      className="conversation-message-time"
                      dateTime={
                        message?.date_creation ||
                        undefined
                      }
                      title={dateComplete}
                    >
                      {heure}

                      {estMoi &&
                        (
                          <span
                            aria-label={
                              message.est_lu
                                ? "Lu"
                                : "Envoyé"
                            }
                          >
                            {" "}
                            {message.est_lu
                              ? "✓✓"
                              : "✓"}
                          </span>
                        )}
                    </time>

                  </div>

                </article>
              );
            }
          )}


          <div
            ref={messagesEndRef}
            aria-hidden="true"
          />

        </section>


        {/* ==================================================
            COMPOSEUR
        ================================================== */}

        {conversation?.est_active !==
          false && (
          <form
            className="conversation-composer"
            onSubmit={(event) => {
              event.preventDefault();
              envoyer();
            }}
          >

            <textarea
              ref={textareaRef}
              value={contenu}
              onChange={(event) =>
                setContenu(
                  event.target.value
                )
              }
              onKeyDown={gererClavier}
              placeholder="Écrire un message..."
              maxLength={2000}
              rows={3}
              disabled={sending}
              aria-label="Écrire un message"
            />


            <div className="conversation-composer-footer">

              <span>
                {contenu.length}/2000
              </span>

              <button
                type="submit"
                disabled={
                  sending ||
                  !contenu.trim()
                }
              >
                {sending
                  ? "Envoi..."
                  : "Envoyer"}
              </button>

            </div>

          </form>
        )}


        {/* ==================================================
            CONVERSATION INACTIVE
        ================================================== */}

        {conversation &&
          conversation.est_active ===
            false && (
            <section className="conversation-inactive">

              <p>
                Cette conversation est
                actuellement inactive.
              </p>

            </section>
          )}

      </section>

    </main>
  );
}
