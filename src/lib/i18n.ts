import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import translations directly
import enCommon from "../../public/locales/en/common.json";
import urCommon from "../../public/locales/ur/common.json";

const resources = {
  en: {
    common: enCommon,
  },
  ur: {
    common: urCommon,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
