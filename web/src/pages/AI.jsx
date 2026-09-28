import { useEffect, useRef, useState } from "react";
import "../styles/pages/ai.css"
import {
  envoyerMessageAI,
  getAIHealth,
  suggererProduits,
} from "../services/api/ai";


// ============================================================
// PAGE AI
// ============================================================

export default function AI() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const [aiDisponible, setAiDisponible] = useState(null);
  const [aiModel, setAiModel] = useState(null);

  const [loadingMessage, setLoadingMessage] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [recherche, setRecherche] = useState("");
  const [region, setRegion] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);


  // ==========================================================
  // VÉRIFICATION DU SERVICE AI
  // ==========================================================

  useEffect(() => {
    verifierDisponibiliteAI();
  }, []);


  async function verifierDisponibiliteAI() {
    try {
      const resultat = await getAIHealth();

      setAiDisponible(Boolean(resultat?.available));
      setAiModel(resultat?.model || null);
    } catch {
      setAiDisponible(false);
      setAiModel(null);
    }
  }


  // ==========================================================
  // SCROLL AUTOMATIQUE DU CHAT
  // ==========================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loadingMessage]);


  // ==========================================================
  // ENVOYER UN MESSAGE À AI
  // ==========================================================

  async function handleSubmitMessage(event) {
    event.preventDefault();

    const texte = message.trim();

    if (!texte || loadingMessage) {
      return;
    }

    setError("");

    const messageUtilisateur = {
      id: Date.now(),
      role: "user",
      content: texte,
    };

    setMessages((precedentes) => [
      ...precedentes,
      messageUtilisateur,
    ]);

    setMessage("");
    setLoadingMessage(true);

    try {
      const resultat = await envoyerMessageAI(texte);

      setMessages((precedentes) => [
        ...precedentes,
        {
          id: Date.now() + 1,
          role: "assistant",
          content:
            resultat?.message ||
            "Je n'ai pas reçu de réponse.",
          model: resultat?.model || null,
        },
      ]);

    } catch (erreur) {
      setError(
        erreur?.message ||
          "Impossible de contacter l'assistant AI."
      );
    } finally {
      setLoadingMessage(false);
    }
  }


  // ==========================================================
  // RECHERCHE INTELLIGENTE DE PRODUITS
  // ==========================================================

  async function handleSuggestions(event) {
    event.preventDefault();

    const texte = recherche.trim();

    if (!texte || loadingSuggestions) {
      return;
    }

    setError("");
    setSuggestions([]);
    setLoadingSuggestions(true);

    try {
      const resultat = await suggererProduits({
        recherche: texte,
        region: region.trim() || null,
        limit: 5,
      });

      setSuggestions(
        Array.isArray(resultat?.suggestions)
          ? resultat.suggestions
          : []
      );

    } catch (erreur) {
      setError(
        erreur?.message ||
          "Impossible d'obtenir les suggestions."
      );
    } finally {
      setLoadingSuggestions(false);
    }
  }


  // ==========================================================
  // EFFACER LE CHAT
  // ==========================================================

  function handleClearChat() {
    setMessages([]);
    setError("");
  }


  // ==========================================================
  // UTILISER UNE QUESTION EXEMPLE
  // ==========================================================

  function utiliserQuestion(question) {
    setMessage(question);
  }


  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <main className="ai-page">

      {/* ======================================================
          EN-TÊTE
      ====================================================== */}

      <section className="ai-header">

        <div>
          <span className="ai-label">
            AgroMarket Burkina
          </span>

          <h1>
            Assistant AI
          </h1>

          <p>
            Posez vos questions et obtenez une assistance
            intelligente pour vos activités agricoles et commerciales.
          </p>
        </div>

        <div className="ai-status">

          <span
            className={`ai-status-indicator ${
              aiDisponible === true
                ? "available"
                : aiDisponible === false
                ? "unavailable"
                : "checking"
            }`}
          />

          <span>
            {aiDisponible === true
              ? "AI disponible"
              : aiDisponible === false
              ? "AI indisponible"
              : "Vérification..."}
          </span>

        </div>

      </section>


      {/* ======================================================
          ERREUR
      ====================================================== */}

      {error && (
        <div
          className="ai-error"
          role="alert"
        >
          {error}
        </div>
      )}


      {/* ======================================================
          CONTENU
      ====================================================== */}

      <section className="ai-content">

        {/* ====================================================
            CHAT AI
        ==================================================== */}

        <div className="ai-chat-card">

          <div className="ai-card-header">

            <div>
              <h2>
                Discussion avec l'assistant AI
              </h2>

              {aiModel && (
                <small>
                  Modèle : {aiModel}
                </small>
              )}
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                className="ai-clear-button"
                onClick={handleClearChat}
              >
                Effacer
              </button>
            )}

          </div>


          {/* ==================================================
              MESSAGES
          ================================================== */}

          <div className="ai-messages">

            {messages.length === 0 && (
              <div className="ai-empty">

                <div className="ai-empty-icon">
                  AI
                </div>

                <h3>
                  Bonjour 👋
                </h3>

                <p>
                  Je suis l'assistant AI d'AgroMarket Burkina.
                  Posez-moi une question pour commencer.
                </p>

                <div className="ai-examples">

                  <button
                    type="button"
                    onClick={() =>
                      utiliserQuestion(
                        "Comment puis-je mieux vendre mes produits agricoles sur AgroMarket ?"
                      )
                    }
                  >
                    Comment mieux vendre mes produits agricoles ?
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      utiliserQuestion(
                        "Comment choisir un bon prix pour mon produit ?"
                      )
                    }
                  >
                    Comment choisir un bon prix ?
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      utiliserQuestion(
                        "Quels produits agricoles sont intéressants à vendre ?"
                      )
                    }
                  >
                    Quels produits sont intéressants à vendre ?
                  </button>

                </div>

              </div>
            )}


            {messages.map((item) => (
              <div
                key={item.id}
                className={`ai-message ${
                  item.role === "user"
                    ? "user-message"
                    : "assistant-message"
                }`}
              >

                <div className="ai-message-role">
                  {item.role === "user"
                    ? "Vous"
                    : "Assistant AI"}
                </div>

                <div className="ai-message-content">
                  {item.content}
                </div>

              </div>
            ))}


            {loadingMessage && (
              <div className="ai-message assistant-message">

                <div className="ai-message-role">
                  Assistant AI
                </div>

                <div className="ai-loading">
                  L'assistant réfléchit...
                </div>

              </div>
            )}

            <div ref={messagesEndRef} />

          </div>


          {/* ==================================================
              FORMULAIRE CHAT
          ================================================== */}

          <form
            className="ai-chat-form"
            onSubmit={handleSubmitMessage}
          >

            <textarea
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder="Posez votre question..."
              maxLength={4000}
              rows={3}
              disabled={
                loadingMessage ||
                aiDisponible === false
              }
            />

            <div className="ai-chat-form-footer">

              <span>
                {message.length}/4000
              </span>

              <button
                type="submit"
                disabled={
                  !message.trim() ||
                  loadingMessage ||
                  aiDisponible === false
                }
              >
                {loadingMessage
                  ? "Envoi..."
                  : "Envoyer"}
              </button>

            </div>

          </form>

        </div>


        {/* ====================================================
            SUGGESTIONS DE PRODUITS
        ==================================================== */}

        <div className="ai-suggestions-card">

          <div className="ai-card-header">

            <div>
              <h2>
                Recherche intelligente
              </h2>

              <p>
                Trouvez des produits correspondant à votre recherche.
              </p>
            </div>

          </div>


          <form
            className="ai-suggestions-form"
            onSubmit={handleSuggestions}
          >

            <label htmlFor="ai-recherche">
              Produit recherché
            </label>

            <input
              id="ai-recherche"
              type="text"
              value={recherche}
              onChange={(event) =>
                setRecherche(event.target.value)
              }
              placeholder="Exemple : maïs, tomate, poulet..."
              maxLength={200}
            />


            <label htmlFor="ai-region">
              Région
            </label>

            <input
              id="ai-region"
              type="text"
              value={region}
              onChange={(event) =>
                setRegion(event.target.value)
              }
              placeholder="Exemple : Centre"
              maxLength={100}
            />


            <button
              type="submit"
              disabled={
                !recherche.trim() ||
                loadingSuggestions
              }
            >
              {loadingSuggestions
                ? "Recherche..."
                : "Rechercher"}
            </button>

          </form>


          {/* ==================================================
              RÉSULTATS
          ================================================== */}

          <div className="ai-suggestions-results">

            {suggestions.length === 0 &&
              !loadingSuggestions && (
                <div className="ai-no-results">
                  Les suggestions apparaîtront ici.
                </div>
              )}


            {suggestions.map((produit, index) => (
              <div
                key={`${produit.id}-${index}`}
                className="ai-product-suggestion"
              >

                <div>

                  <h3>
                    {produit.nom}
                  </h3>

                  {produit.type_produit && (
                    <span>
                      {produit.type_produit}
                    </span>
                  )}

                </div>

                <div className="ai-product-score">
                  Score :{" "}
                  {Number(
                    produit.score || 0
                  ).toFixed(2)}
                </div>

              </div>
            ))}

          </div>

        </div>

      </section>

    </main>
  );
}