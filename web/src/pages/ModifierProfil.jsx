// src/pages/ModifierProfil.jsx

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";
import "../styles/pages/modifie-profile.css";
import {
  useAuth,
} from "../context/AuthContext";

import {
  apiRequest,
} from "../services/api/client";

import {
  getImageUrl,
} from "../utils/media";


/*
 * ============================================================
 * ICÔNES
 * ============================================================
 */

function Icon({
  name,
  size = 20,
}) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "user") {
    return (
      <svg {...props}>
        <circle
          cx="12"
          cy="8"
          r="3"
        />
        <path
          d="M5 21c.7-4.2 3-6.5 7-6.5s6.3 2.3 7 6.5"
        />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...props}>
        <path
          d="M6.5 3h3l1.5 4-2 1.7a14 14 0 0 0 6.3 6.3L17 13l4 1.5v3A2.5 2.5 0 0 1 18.5 20C10.5 20 4 13.5 4 5.5A2.5 2.5 0 0 1 6.5 3Z"
        />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg {...props}>
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
        />
        <path
          d="m4 7 8 6 8-6"
        />
      </svg>
    );
  }

  if (name === "location") {
    return (
      <svg {...props}>
        <path
          d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
        />
        <circle
          cx="12"
          cy="10"
          r="2.5"
        />
      </svg>
    );
  }

  if (name === "camera") {
    return (
      <svg {...props}>
        <path
          d="M4 7h4l1.5-2h5L16 7h4v12H4V7Z"
        />
        <circle
          cx="12"
          cy="13"
          r="3"
        />
      </svg>
    );
  }

  if (name === "key") {
    return (
      <svg {...props}>
        <circle
          cx="8"
          cy="15"
          r="3"
        />
        <path
          d="m10.5 12.5 7-7"
        />
        <path
          d="m15 7 2 2"
        />
        <path
          d="m17 5 2 2"
        />
      </svg>
    );
  }

  if (name === "save") {
    return (
      <svg {...props}>
        <path
          d="M5 4h12l2 2v14H5V4Z"
        />
        <path
          d="M8 4v6h8V4"
        />
        <path
          d="M8 20v-6h8v6"
        />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...props}>
        <path
          d="M5 12h13"
        />
        <path
          d="m13 6 6 6-6 6"
        />
      </svg>
    );
  }

  if (name === "cross") {
    return (
      <svg {...props}>
        <path
          d="m6 6 12 12"
        />
        <path
          d="M18 6 6 18"
        />
      </svg>
    );
  }

  return null;
}


/*
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function getInitials(name) {
  if (!name) {
    return "A";
  }

  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[1][0]
  ).toUpperCase();
}


function normalizeCoordinate(
  value,
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


function validateCoordinates(
  latitude,
  longitude,
) {
  if (
    latitude === null &&
    longitude === null
  ) {
    return {
      valid: true,
    };
  }

  if (
    latitude === null ||
    longitude === null
  ) {
    return {
      valid: false,
      message:
        "La latitude et la longitude doivent être renseignées ensemble.",
    };
  }

  if (
    latitude < -90 ||
    latitude > 90
  ) {
    return {
      valid: false,
      message:
        "La latitude doit être comprise entre -90 et 90.",
    };
  }

  if (
    longitude < -180 ||
    longitude > 180
  ) {
    return {
      valid: false,
      message:
        "La longitude doit être comprise entre -180 et 180.",
    };
  }

  return {
    valid: true,
  };
}


function validatePassword(
  password,
) {
  const value =
    String(password || "");

  if (!value) {
    return "Le mot de passe est obligatoire.";
  }

  if (value.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }

  if (!/[a-z]/.test(value)) {
    return "Le mot de passe doit contenir au moins une lettre minuscule.";
  }

  if (!/[A-Z]/.test(value)) {
    return "Le mot de passe doit contenir au moins une lettre majuscule.";
  }

  if (!/[0-9]/.test(value)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }

  return null;
}


/*
 * ============================================================
 * COMPOSANT
 * ============================================================
 */

function ModifierProfil() {
  const {
    isAuthenticated,
    refreshUser,
  } = useAuth();

  const navigate =
    useNavigate();

  const fileInputRef =
    useRef(null);


  /*
   * ==========================================================
   * PROFIL
   * ==========================================================
   */

  const [
    profile,
    setProfile,
  ] = useState(null);


  /*
   * ==========================================================
   * FORMULAIRE
   * ==========================================================
   *
   * Les coordonnées GPS restent dans l'état local uniquement.
   * Elles ne sont pas affichées à l'écran.
   *
   * Cela permet de les envoyer au backend sans exposer
   * inutilement la position précise du domicile.
   */

  const [
    form,
    setForm,
  ] = useState({
    nom: "",
    telephone: "",
    email: "",
    adresse: "",
    description: "",

    latitude: "",
    longitude: "",

    localisation_source:
      "manuelle",
  });


  /*
   * ==========================================================
   * MOT DE PASSE
   * ==========================================================
   */

  const [
    passwordForm,
    setPasswordForm,
  ] = useState({
    ancien_mot_de_passe: "",
    nouveau_mot_de_passe: "",
  });


  /*
   * ==========================================================
   * ÉTATS
   * ==========================================================
   */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    photoLoading,
    setPhotoLoading,
  ] = useState(false);

  const [
    passwordSaving,
    setPasswordSaving,
  ] = useState(false);

  const [
    locationLoading,
    setLocationLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    photoPreview,
    setPhotoPreview,
  ] = useState(null);


  /*
   * ==========================================================
   * CHARGEMENT DU PROFIL
   * ==========================================================
   */

  useEffect(() => {
    if (
      isAuthenticated === false
    ) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadProfile() {
      try {
        setError("");

        const data =
          await apiRequest(
            "/users/me",
            {
              method: "GET",
            }
          );

        if (!mounted) {
          return;
        }

        setProfile(data);

        setForm({
          nom:
            data?.nom || "",

          telephone:
            data?.telephone || "",

          email:
            data?.email || "",

          adresse:
            data?.adresse || "",

          description:
            data?.description || "",

          latitude:
            data?.latitude != null
              ? String(data.latitude)
              : "",

          longitude:
            data?.longitude != null
              ? String(data.longitude)
              : "",

          localisation_source:
            data?.localisation_source ||
            "manuelle",
        });

        setPhotoPreview(
          getImageUrl(
            data?.photo_profil
          )
        );
      } catch (err) {
        console.error(
          "Erreur chargement profil :",
          err
        );

        if (mounted) {
          setError(
            err?.message ||
            "Impossible de charger votre profil."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [
    isAuthenticated,
  ]);


  /*
   * ==========================================================
   * CHANGEMENT FORMULAIRE
   * ==========================================================
   */

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm(
      previous => ({
        ...previous,
        [name]: value,
      })
    );
  }


  /*
   * ==========================================================
   * MOT DE PASSE
   * ==========================================================
   */

  function handlePasswordChange(
    event,
  ) {
    const {
      name,
      value,
    } = event.target;

    setPasswordForm(
      previous => ({
        ...previous,
        [name]: value,
      })
    );
  }


  /*
   * ==========================================================
   * ENREGISTRER LE PROFIL
   * ==========================================================
   */

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");


    if (!form.nom.trim()) {
      setError(
        "Le nom est obligatoire."
      );
      return;
    }


    if (!form.telephone.trim()) {
      setError(
        "Le numéro de téléphone est obligatoire."
      );
      return;
    }


    const latitude =
      normalizeCoordinate(
        form.latitude
      );

    const longitude =
      normalizeCoordinate(
        form.longitude
      );


    /*
     * Si une valeur est saisie mais ne peut pas
     * être convertie en nombre.
     */

    if (
      form.latitude.trim() !== "" &&
      latitude === null
    ) {
      setError(
        "La latitude est invalide."
      );
      return;
    }


    if (
      form.longitude.trim() !== "" &&
      longitude === null
    ) {
      setError(
        "La longitude est invalide."
      );
      return;
    }


    const coordinatesValidation =
      validateCoordinates(
        latitude,
        longitude
      );


    if (
      !coordinatesValidation.valid
    ) {
      setError(
        coordinatesValidation.message
      );
      return;
    }


    setSaving(true);


    try {
      const payload = {
        nom:
          form.nom.trim(),

        telephone:
          form.telephone.trim(),

        email:
          form.email.trim() ||
          null,

        adresse:
          form.adresse.trim() ||
          null,

        description:
          form.description.trim() ||
          null,

        latitude,

        longitude,

        localisation_source:
          form.localisation_source,
      };


      const data =
        await apiRequest(
          "/users/me",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );


      setProfile(data);


      /*
       * Synchronisation locale des coordonnées.
       * Elles restent cachées dans l'interface.
       */

      setForm(
        previous => ({
          ...previous,

          latitude:
            data?.latitude != null
              ? String(data.latitude)
              : previous.latitude,

          longitude:
            data?.longitude != null
              ? String(data.longitude)
              : previous.longitude,

          localisation_source:
            data?.localisation_source ||
            previous.localisation_source,
        })
      );


      setSuccess(
        "Votre profil a été mis à jour avec succès."
      );


      /*
       * Ici refreshUser est utile :
       * le contexte d'authentification doit connaître
       * les nouvelles informations du profil.
       */

      if (
        typeof refreshUser ===
        "function"
      ) {
        try {
          await refreshUser();
        } catch (refreshError) {
          console.warn(
            "Impossible de synchroniser le contexte utilisateur :",
            refreshError
          );
        }
      }
    } catch (err) {
      console.error(
        "Erreur modification profil :",
        err
      );

      setError(
        err?.message ||
        "Impossible de modifier votre profil."
      );
    } finally {
      setSaving(false);
    }
  }


  /*
   * ==========================================================
   * GPS NAVIGATEUR
   * ==========================================================
   */

  function obtenirMaPosition() {
    setError("");
    setSuccess("");


    if (
      !navigator.geolocation
    ) {
      setError(
        "La géolocalisation n'est pas disponible sur cet appareil."
      );
      return;
    }


    setLocationLoading(true);


    navigator.geolocation.getCurrentPosition(
      position => {
        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;


        setForm(
          previous => ({
            ...previous,

            latitude:
              latitude.toFixed(6),

            longitude:
              longitude.toFixed(6),

            localisation_source:
              "gps",
          })
        );


        setSuccess(
          "Votre position GPS a été récupérée. Enregistrez maintenant le profil."
        );


        setLocationLoading(false);
      },

      geoError => {
        console.error(
          "Erreur géolocalisation :",
          geoError
        );


        let message =
          "Impossible de récupérer votre position GPS. Vérifiez l'autorisation de localisation.";


        if (
          geoError?.code ===
          geoError.PERMISSION_DENIED
        ) {
          message =
            "L'accès à votre position a été refusé. Autorisez la localisation dans votre navigateur.";
        } else if (
          geoError?.code ===
          geoError.POSITION_UNAVAILABLE
        ) {
          message =
            "Votre position GPS est actuellement indisponible.";
        } else if (
          geoError?.code ===
          geoError.TIMEOUT
        ) {
          message =
            "La récupération de votre position GPS a pris trop de temps. Réessayez.";
        }


        setError(message);
        setLocationLoading(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }


  /*
   * ==========================================================
   * PHOTO
   * ==========================================================
   */

  async function handlePhotoChange(
    event,
  ) {
    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    setError("");
    setSuccess("");


    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        "Format non autorisé. Utilisez JPG, PNG ou WEBP."
      );

      event.target.value = "";
      return;
    }


    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "La photo ne doit pas dépasser 5 Mo."
      );

      event.target.value = "";
      return;
    }


    setPhotoLoading(true);


    try {
      const formData =
        new FormData();


      formData.append(
        "file",
        file
      );


      const result =
        await apiRequest(
          "/users/me/photo",
          {
            method: "POST",

            body:
              formData,
          }
        );


      const url =
        getImageUrl(
          result?.photo_profil
        );


      setPhotoPreview(url);


      setProfile(
        previous => ({
          ...previous,

          photo_profil:
            result?.photo_profil ||
            null,
        })
      );


      setSuccess(
        "Photo de profil mise à jour."
      );


      if (
        typeof refreshUser ===
        "function"
      ) {
        try {
          await refreshUser();
        } catch (refreshError) {
          console.warn(
            "Impossible de synchroniser la photo dans le contexte utilisateur :",
            refreshError
          );
        }
      }
    } catch (err) {
      console.error(
        "Erreur photo :",
        err
      );

      setError(
        err?.message ||
        "Impossible de modifier la photo."
      );
    } finally {
      setPhotoLoading(false);

      if (event.target) {
        event.target.value = "";
      }
    }
  }


  /*
   * ==========================================================
   * SUPPRIMER PHOTO
   * ==========================================================
   */

  async function supprimerPhoto() {
    const confirmDelete =
      window.confirm(
        "Voulez-vous supprimer votre photo de profil ?"
      );


    if (!confirmDelete) {
      return;
    }


    setError("");
    setSuccess("");
    setPhotoLoading(true);


    try {
      await apiRequest(
        "/users/me/photo",
        {
          method: "DELETE",
        }
      );


      setPhotoPreview(null);


      setProfile(
        previous => ({
          ...previous,

          photo_profil:
            null,
        })
      );


      setSuccess(
        "Votre photo de profil a été supprimée."
      );


      if (
        typeof refreshUser ===
        "function"
      ) {
        try {
          await refreshUser();
        } catch (refreshError) {
          console.warn(
            "Impossible de synchroniser la suppression de la photo :",
            refreshError
          );
        }
      }
    } catch (err) {
      console.error(
        "Erreur suppression photo :",
        err
      );

      setError(
        err?.message ||
        "Impossible de supprimer la photo."
      );
    } finally {
      setPhotoLoading(false);
    }
  }


  /*
   * ==========================================================
   * CHANGER MOT DE PASSE
   * ==========================================================
   */

  async function handlePasswordSubmit(
    event,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");


    const passwordError =
      validatePassword(
        passwordForm.nouveau_mot_de_passe
      );


    if (passwordError) {
      setError(passwordError);
      return;
    }


    if (
      !profile?.mot_de_passe_defini
    ) {
      setError(
        "Ce compte ne possède pas encore de mot de passe local. Utilisez la section dédiée ci-dessous."
      );
      return;
    }


    if (
      !passwordForm.ancien_mot_de_passe
    ) {
      setError(
        "L'ancien mot de passe est obligatoire."
      );
      return;
    }


    setPasswordSaving(true);


    try {
      await apiRequest(
        "/users/me/password",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              passwordForm
            ),
        }
      );


      setPasswordForm({
        ancien_mot_de_passe: "",
        nouveau_mot_de_passe: "",
      });


      setSuccess(
        "Votre mot de passe a été modifié avec succès."
      );
    } catch (err) {
      console.error(
        "Erreur mot de passe :",
        err
      );

      setError(
        err?.message ||
        "Impossible de modifier le mot de passe."
      );
    } finally {
      setPasswordSaving(false);
    }
  }


  /*
   * ==========================================================
   * AJOUTER MOT DE PASSE À UN COMPTE GOOGLE
   * ==========================================================
   */

  async function handleSetPassword(
    event,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");


    const passwordError =
      validatePassword(
        passwordForm.nouveau_mot_de_passe
      );


    if (passwordError) {
      setError(passwordError);
      return;
    }


    setPasswordSaving(true);


    try {
      await apiRequest(
        "/users/me/password",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              nouveau_mot_de_passe:
                passwordForm.nouveau_mot_de_passe,
            }),
        }
      );


      setPasswordForm({
        ancien_mot_de_passe: "",
        nouveau_mot_de_passe: "",
      });


      setProfile(
        previous => ({
          ...previous,

          mot_de_passe_defini:
            true,

          methode_authentification:
            "hybride",
        })
      );


      setSuccess(
        "Votre mot de passe local a été ajouté."
      );


      if (
        typeof refreshUser ===
        "function"
      ) {
        try {
          await refreshUser();
        } catch (refreshError) {
          console.warn(
            "Impossible de synchroniser le mot de passe dans le contexte utilisateur :",
            refreshError
          );
        }
      }
    } catch (err) {
      console.error(
        "Erreur création mot de passe :",
        err
      );

      setError(
        err?.message ||
        "Impossible d'ajouter le mot de passe."
      );
    } finally {
      setPasswordSaving(false);
    }
  }


  /*
   * ==========================================================
   * REDIRECTION
   * ==========================================================
   */

  if (
    !isAuthenticated &&
    !loading
  ) {
    return (
      <Navigate
        to="/connexion"
        replace
      />
    );
  }


  /*
   * ==========================================================
   * CHARGEMENT
   * ==========================================================
   */

  if (loading) {
    return (
      <main className="edit-profile-page">

        <div className="profile-loading">

          <div className="profile-loading-spinner" />

          <h1>
            Chargement...
          </h1>

        </div>

      </main>
    );
  }


  const photoUrl =
    photoPreview;

  const initials =
    getInitials(
      profile?.nom
    );


  /*
   * ==========================================================
   * INTERFACE
   * ==========================================================
   */

  return (
    <main className="edit-profile-page">

      {/* ====================================================
          EN-TÊTE
      ===================================================== */}

      <section className="edit-profile-hero">

        <div className="edit-profile-container">

          <Link
            to="/profil"
            className="edit-profile-back"
          >
            ← Retour à mon profil
          </Link>


          <span className="profile-eyebrow">
            PARAMÈTRES DU COMPTE
          </span>

          <h1>
            Modifier mon profil
          </h1>

          <p>
            Mettez à jour vos informations
            personnelles, votre localisation
            et votre sécurité.
          </p>

        </div>

      </section>


      <div className="edit-profile-container">

        {/* ==================================================
            ALERTES
        =================================================== */}

        {error && (
          <div className="profile-alert profile-alert-error">

            <strong>
              Erreur
            </strong>

            <span>
              {error}
            </span>

          </div>
        )}


        {success && (
          <div className="profile-alert profile-alert-success">

            <span>
              {success}
            </span>

          </div>
        )}


        {/* ==================================================
            PHOTO
        =================================================== */}

        <section className="edit-profile-card">

          <div className="edit-profile-section-header">

            <div>

              <span>
                PHOTO DE PROFIL
              </span>

              <h2>
                Votre identité visuelle
              </h2>

            </div>

          </div>


          <div className="edit-profile-photo-area">

            <div className="profile-avatar edit-profile-avatar">

              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={
                    profile?.nom ||
                    "Profil"
                  }
                />
              ) : (
                <span>
                  {initials}
                </span>
              )}

            </div>


            <div className="edit-profile-photo-actions">

              <p>
                JPG, PNG ou WEBP — 5 Mo maximum.
              </p>


              <div className="edit-profile-photo-buttons">

                <button
                  type="button"
                  className="profile-primary-button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    photoLoading
                  }
                >

                  <Icon
                    name="camera"
                    size={17}
                  />

                  {photoLoading
                    ? "Traitement..."
                    : "Changer la photo"}

                </button>


                {photoUrl && (
                  <button
                    type="button"
                    className="profile-danger-button"
                    onClick={
                      supprimerPhoto
                    }
                    disabled={
                      photoLoading
                    }
                  >
                    Supprimer
                  </button>
                )}

              </div>


              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handlePhotoChange
                }
                hidden
              />

            </div>

          </div>

        </section>


        {/* ==================================================
            INFORMATIONS
        =================================================== */}

        <form
          className="edit-profile-card"
          onSubmit={
            handleSubmit
          }
        >

          <div className="edit-profile-section-header">

            <div>

              <span>
                INFORMATIONS PERSONNELLES
              </span>

              <h2>
                Mes informations
              </h2>

            </div>

          </div>


          <div className="edit-profile-form-grid">

            <div className="edit-profile-field">

              <label htmlFor="nom">
                Nom complet
              </label>

              <div className="edit-profile-input">

                <Icon
                  name="user"
                  size={18}
                />

                <input
                  id="nom"
                  name="nom"
                  type="text"
                  value={
                    form.nom
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Votre nom"
                  maxLength={100}
                  autoComplete="name"
                />

              </div>

            </div>


            <div className="edit-profile-field">

              <label htmlFor="telephone">
                Téléphone
              </label>

              <div className="edit-profile-input">

                <Icon
                  name="phone"
                  size={18}
                />

                <input
                  id="telephone"
                  name="telephone"
                  type="tel"
                  value={
                    form.telephone
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Votre numéro"
                  maxLength={20}
                  autoComplete="tel"
                />

              </div>

              <small>
                {
                  profile?.telephone_verifie
                    ? "Numéro vérifié"
                    : "Numéro non vérifié"
                }
              </small>

            </div>


            <div className="edit-profile-field">

              <label htmlFor="email">
                Adresse email
              </label>

              <div className="edit-profile-input">

                <Icon
                  name="mail"
                  size={18}
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={
                    form.email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="exemple@email.com"
                  maxLength={150}
                  autoComplete="email"
                />

              </div>

              <small>
                {
                  profile?.email_verifie
                    ? "Adresse vérifiée"
                    : "Adresse non vérifiée"
                }
              </small>

            </div>


            <div className="edit-profile-field">

              <label htmlFor="adresse">
                Adresse
              </label>

              <div className="edit-profile-input">

                <Icon
                  name="location"
                  size={18}
                />

                <input
                  id="adresse"
                  name="adresse"
                  type="text"
                  value={
                    form.adresse
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Ville, quartier..."
                  maxLength={255}
                  autoComplete="street-address"
                />

              </div>

            </div>


            <div className="edit-profile-field edit-profile-field-full">

              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={
                  form.description
                }
                onChange={
                  handleChange
                }
                rows={5}
                placeholder="Présentez-vous en quelques lignes..."
                maxLength={1000}
              />

            </div>

          </div>


          {/* =================================================
              LOCALISATION
          ================================================= */}

          <div className="edit-profile-subsection">

            <div>

              <span>
                GÉOLOCALISATION
              </span>

              <h3>
                Ma position
              </h3>

              <p>
                Votre position précise est protégée.
                Vous pouvez utiliser le GPS de votre appareil
                pour enregistrer automatiquement votre position.
              </p>

            </div>


            <button
              type="button"
              className="profile-secondary-button"
              onClick={
                obtenirMaPosition
              }
              disabled={
                locationLoading ||
                saving
              }
            >

              <Icon
                name="location"
                size={17}
              />

              {locationLoading
                ? "Localisation..."
                : "Utiliser ma position GPS"}

            </button>


            <div className="edit-profile-location-status">

              <Icon
                name="location"
                size={18}
              />

              <div>

                <strong>
                  {form.latitude &&
                  form.longitude
                    ? "Position GPS enregistrée"
                    : "Aucune position GPS enregistrée"}
                </strong>

                <span>
                  {
                    form.localisation_source ===
                    "gps"
                      ? "Source : GPS"
                      : "La position précise n'est pas affichée."
                  }
                </span>

              </div>

            </div>

          </div>


          <div className="edit-profile-form-actions">

            <Link
              to="/profil"
              className="profile-cancel-button"
            >
              Annuler
            </Link>


            <button
              type="submit"
              className="profile-primary-button"
              disabled={
                saving
              }
            >

              <Icon
                name="save"
                size={17}
              />

              {saving
                ? "Enregistrement..."
                : "Enregistrer les modifications"}

            </button>

          </div>

        </form>


        {/* ==================================================
            MOT DE PASSE
        =================================================== */}

        <section className="edit-profile-card">

          <div className="edit-profile-section-header">

            <div>

              <span>
                SÉCURITÉ
              </span>

              <h2>
                Mot de passe
              </h2>

            </div>

          </div>


          {profile?.mot_de_passe_defini ? (

            <form
              onSubmit={
                handlePasswordSubmit
              }
            >

              <div className="edit-profile-security-intro">

                <Icon
                  name="key"
                  size={22}
                />

                <p>
                  Votre compte possède un mot de passe local.
                  Vous pouvez le modifier ici.
                </p>

              </div>


              <div className="edit-profile-form-grid">

                <div className="edit-profile-field">

                  <label htmlFor="ancien_mot_de_passe">
                    Ancien mot de passe
                  </label>

                  <input
                    id="ancien_mot_de_passe"
                    name="ancien_mot_de_passe"
                    type="password"
                    value={
                      passwordForm.ancien_mot_de_passe
                    }
                    onChange={
                      handlePasswordChange
                    }
                    autoComplete="current-password"
                  />

                </div>


                <div className="edit-profile-field">

                  <label htmlFor="nouveau_mot_de_passe">
                    Nouveau mot de passe
                  </label>

                  <input
                    id="nouveau_mot_de_passe"
                    name="nouveau_mot_de_passe"
                    type="password"
                    value={
                      passwordForm.nouveau_mot_de_passe
                    }
                    onChange={
                      handlePasswordChange
                    }
                    minLength={8}
                    autoComplete="new-password"
                  />

                </div>

              </div>


              <button
                type="submit"
                className="profile-primary-button"
                disabled={
                  passwordSaving
                }
              >

                <Icon
                  name="key"
                  size={17}
                />

                {passwordSaving
                  ? "Modification..."
                  : "Modifier le mot de passe"}

              </button>

            </form>

          ) : (

            <form
              onSubmit={
                handleSetPassword
              }
            >

              <div className="edit-profile-security-intro">

                <Icon
                  name="key"
                  size={22}
                />

                <p>
                  Votre compte ne possède pas encore
                  de mot de passe local. Vous pouvez
                  en définir un pour pouvoir également
                  vous connecter avec vos identifiants.
                </p>

              </div>


              <div className="edit-profile-field">

                <label htmlFor="nouveau_mot_de_passe_google">
                  Nouveau mot de passe
                </label>

                <input
                  id="nouveau_mot_de_passe_google"
                  name="nouveau_mot_de_passe"
                  type="password"
                  value={
                    passwordForm.nouveau_mot_de_passe
                  }
                  onChange={
                    handlePasswordChange
                  }
                  minLength={8}
                  autoComplete="new-password"
                />

              </div>


              <button
                type="submit"
                className="profile-primary-button"
                disabled={
                  passwordSaving
                }
              >

                <Icon
                  name="key"
                  size={17}
                />

                {passwordSaving
                  ? "Configuration..."
                  : "Définir mon mot de passe"}

              </button>

            </form>

          )}

        </section>


        {/* ==================================================
            RÔLE
        =================================================== */}

        <section className="edit-profile-info-card">

          <div>

            <span>
              RÔLE DU COMPTE
            </span>

            <strong>
              {profile?.role}
            </strong>

            <p>
              Le rôle de votre compte est géré
              par le système et ne peut pas être
              modifié depuis votre profil.
            </p>

          </div>

        </section>


        {/* ==================================================
            RETOUR
        =================================================== */}

        <div className="edit-profile-bottom">

          <button
            type="button"
            className="profile-secondary-button"
            onClick={() =>
              navigate("/profil")
            }
          >

            Retour au profil

            <Icon
              name="arrow"
              size={16}
            />

          </button>

        </div>

      </div>

    </main>
  );
}


export default ModifierProfil;