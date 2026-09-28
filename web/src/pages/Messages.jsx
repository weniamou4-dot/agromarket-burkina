
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/pages/message.css";
import { useAuth } from "../context/AuthContext";
import {
  compterMessagesNonLus,
  getMesConversations,
} from "../services/api/messagerie";
import { getImageUrl } from "../utils/media";


/*
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function normaliserTexte(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}


function formaterDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const maintenant = new Date();

  const difference =
    maintenant.getTime() - date.getTime();

  const minute = 60 * 1000;
  const heure = 60 * minute;
  const jour = 24 * heure;

  if (difference >= 0 && difference < minute) {
    return "À l'instant";
  }

  if (difference >= 0 && difference < heure) {
    const minutes = Math.floor(
      difference / minute
    );

    return `Il y a ${minutes} min`;
  }

  if (difference >= 0 && difference < jour) {
    const heures = Math.floor(
      difference / heure
    );

    return `Il y a ${heures} h`;
  }

  if (
    difference >= 0 &&
    difference < 7 * jour
  ) {
    const jours = Math.floor(
      difference / jour
    );

    return `Il y a ${jours} j`;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}


function tronquerTexte(
  texte,
  longueur = 80
) {
  const value = String(texte ?? "").trim();

  if (value.length <= longueur) {
    return value;
  }

  return `${value.slice(0, longueur).trim()}…`;
}


/*
 * ============================================================
 * NORMALISATION DES DONNÉES
 * ============================================================
 */

function normaliserListe(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (
    Array.isArray(result?.conversations)
  ) {
    return result.conversations;
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


function obtenirUtilisateurConversation(
  conversation,
  currentUserId
) {
  const userId = Number(currentUserId);

  const vendeurId = Number(
    conversation?.vendeur_id
  );

  const acheteurId = Number(
    conversation?.acheteur_id
  );

  if (
    userId > 0 &&
    vendeurId === userId
  ) {
    return conversation?.acheteur;
  }

  if (
    userId > 0 &&
    acheteurId === userId
  ) {
    return conversation?.vendeur;
  }

  return conversation?.vendeur ??
    conversation?.acheteur ??
    null;
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

  /*
   * Le backend actuel renvoie produit_id
   * dans MessagerieAnnonceResponse.
   *
   * Il ne renvoie pas encore directement
   * le nom du produit.
   */
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

export default function Messages() {
  const navigate = useNavigate();

  const {
    user,
    loading: authLoading,
    isAuthenticated,
  } = useAuth();

  const [conversations, setConversations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  const [total, setTotal] =
    useState(0);

  const [page, setPage] =
    useState(1);

  const [pages, setPages] =
    useState(0);

  const limit = 20;


  /*
   * ==========================================================
   * UTILISATEUR CONNECTÉ
   * ==========================================================
   */

  const currentUserId = useMemo(
    () => Number(user?.id) || 0,
    [user?.id]
  );


  /*
   * ==========================================================
   * CHARGER LES CONVERSATIONS
   * ==========================================================
   */

  const chargerConversations =
    useCallback(
      async ({
        silent = false,
        targetPage = page,
      } = {}) => {
        if (!isAuthenticated) {
          return;
        }

        if (!silent) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        try {
          const result =
            await getMesConversations({
              page: targetPage,
              limit,
            });

          const liste =
            normaliserListe(result);

          setConversations(liste);

          setTotal(
            Number(result?.total) || liste.length
          );

          setPage(
            Number(result?.page) || targetPage
          );

          setPages(
            Number(result?.pages) || 0
          );
        } catch (err) {
          setError(
            err?.message ||
            "Impossible de récupérer vos conversations."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        isAuthenticated,
        page,
      ]
    );


  /*
   * ==========================================================
   * CHARGEMENT INITIAL
   * ==========================================================
   */

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setLoading(false);

      navigate(
        "/connexion?redirect=%2Fmessages",
        {
          replace: true,
        }
      );

      return;
    }

    chargerConversations({
      targetPage: 1,
    });
  }, [
    authLoading,
    isAuthenticated,
    navigate,
  ]);


  /*
   * ==========================================================
   * ACTUALISATION AUTOMATIQUE
   * ==========================================================
   *
   * MVP :
   * On utilise un petit polling au lieu d'un WebSocket.
   *
   * Cela permet d'avoir une messagerie fonctionnelle
   * sans ajouter immédiatement une infrastructure temps réel.
   */

  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated
    ) {
      return undefined;
    }

    const interval =
      window.setInterval(() => {
        chargerConversations({
          silent: true,
          targetPage: page,
        });
      }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    authLoading,
    isAuthenticated,
    chargerConversations,
    page,
  ]);


  /*
   * ==========================================================
   * NAVIGATION VERS UNE CONVERSATION
   * ==========================================================
   */

  const ouvrirConversation =
    useCallback(
      (conversationId) => {
        const id =
          Number(conversationId);

        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {
          return;
        }

        navigate(
          `/messages/${id}`
        );
      },
      [navigate]
    );


  /*
   * ==========================================================
   * PAGINATION
   * ==========================================================
   */

  const allerPage =
    useCallback(
      (nouvellePage) => {
        const target =
          Number(nouvellePage);

        if (
          !Number.isInteger(target) ||
          target < 1 ||
          (pages > 0 &&
            target > pages)
        ) {
          return;
        }

        chargerConversations({
          targetPage: target,
        });
      },
      [
        chargerConversations,
        pages,
      ]
    );


  /*
   * ==========================================================
   * ÉTAT D'AUTHENTIFICATION
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
    <main className="page messages-page">
      <section className="messages-container">

        {/* ==================================================
            EN-TÊTE
        ================================================== */}

        <header className="messages-header">

          <div>
            <h1>Messages</h1>

            <p>
              Retrouvez vos conversations avec
              les vendeurs et acheteurs.
            </p>
          </div>

          <button
            type="button"
            className="messages-refresh-button"
            onClick={() =>
              chargerConversations({
                silent: true,
                targetPage: page,
              })
            }
            disabled={
              loading ||
              refreshing
            }
            aria-label="Actualiser les messages"
          >
            {refreshing
              ? "Actualisation..."
              : "↻ Actualiser"}
          </button>

        </header>


        {/* ==================================================
            ERREUR
        ================================================== */}

        {error && (
          <section
            className="messages-error"
            role="alert"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                chargerConversations({
                  targetPage: page,
                })
              }
            >
              Réessayer
            </button>
          </section>
        )}


        {/* ==================================================
            CHARGEMENT
        ================================================== */}

        {loading && (
          <section
            className="messages-loading"
            aria-live="polite"
          >
            <p>
              Chargement de vos conversations...
            </p>
          </section>
        )}


        {/* ==================================================
            AUCUNE CONVERSATION
        ================================================== */}

        {!loading &&
          !error &&
          conversations.length === 0 && (
            <section className="messages-empty">

              <div
                className="messages-empty-icon"
                aria-hidden="true"
              >
                💬
              </div>

              <h2>
                Aucune conversation
              </h2>

              <p>
                Vos conversations avec les
                vendeurs et acheteurs apparaîtront
                ici.
              </p>

              <Link
                to="/produits"
                className="messages-empty-link"
              >
                Découvrir les produits
              </Link>

            </section>
          )}


        {/* ==================================================
            LISTE DES CONVERSATIONS
        ================================================== */}

        {!loading &&
          conversations.length > 0 && (
            <section
              className="messages-list"
              aria-label="Mes conversations"
            >

              {conversations.map(
                (conversation) => {
                  const utilisateur =
                    obtenirUtilisateurConversation(
                      conversation,
                      currentUserId
                    );

                  const nom =
                    obtenirNomUtilisateur(
                      utilisateur
                    );

                  const produit =
                    obtenirNomProduit(
                      conversation
                    );

                  const dernierMessage =
                    conversation?.dernier_message;

                  const nombreNonLus =
                    Math.max(
                      0,
                      Number(
                        conversation?.messages_non_lus
                      ) || 0
                    );

                  const image =
                    utilisateur?.photo_profil
                      ? getImageUrl(
                          utilisateur.photo_profil
                        )
                      : null;

                  const date =
                    formaterDate(
                      conversation?.derniere_activite
                    );

                  const texte =
                    dernierMessage?.contenu
                      ? tronquerTexte(
                          dernierMessage.contenu
                        )
                      : "Aucun message";


                  return (
                    <article
                      key={conversation.id}
                      className={`message-conversation-item${
                        nombreNonLus > 0
                          ? " has-unread"
                          : ""
                      }`}
                      onClick={() =>
                        ouvrirConversation(
                          conversation.id
                        )
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();

                          ouvrirConversation(
                            conversation.id
                          );
                        }
                      }}
                    >

                      {/* ==================================
                          PHOTO
                      ================================== */}

                      <div className="message-user-avatar">

                        {image ? (
                          <img
                            src={image}
                            alt={`Photo de ${nom}`}
                            loading="lazy"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                          >
                            👤
                          </span>
                        )}

                      </div>


                      {/* ==================================
                          CONTENU
                      ================================== */}

                      <div className="message-conversation-content">

                        <div className="message-conversation-top">

                          <h2>
                            {nom}
                          </h2>

                          <time
                            dateTime={
                              conversation?.derniere_activite ||
                              undefined
                            }
                          >
                            {date}
                          </time>

                        </div>


                        <p className="message-conversation-product">
                          {produit}
                        </p>


                        <p className="message-conversation-preview">
                          {texte}
                        </p>

                      </div>


                      {/* ==================================
                          NON LUS
                      ================================== */}

                      {nombreNonLus > 0 && (
                        <span
                          className="message-unread-badge"
                          aria-label={`${nombreNonLus} message(s) non lu(s)`}
                        >
                          {nombreNonLus > 99
                            ? "99+"
                            : nombreNonLus}
                        </span>
                      )}

                    </article>
                  );
                }
              )}

            </section>
          )}


        {/* ==================================================
            INFORMATIONS
        ================================================== */}

        {!loading &&
          conversations.length > 0 && (
            <footer className="messages-footer">

              <span>
                {total} conversation
                {total > 1
                  ? "s"
                  : ""}
              </span>

              {pages > 1 && (
                <nav
                  className="messages-pagination"
                  aria-label="Pagination des conversations"
                >

                  <button
                    type="button"
                    onClick={() =>
                      allerPage(
                        page - 1
                      )
                    }
                    disabled={page <= 1}
                  >
                    ←
                  </button>

                  <span>
                    Page {page} / {pages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      allerPage(
                        page + 1
                      )
                    }
                    disabled={
                      page >= pages
                    }
                  >
                    →
                  </button>

                </nav>
              )}

            </footer>
          )}

      </section>
    </main>
  );
}
