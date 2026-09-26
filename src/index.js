import React from "react";
import ReactDOM from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import "./index.css";

// If user closed the website/browser, sessionStorage was cleared.
// If there is no active session marker and we are not in an OAuth callback,
// clear Auth0 localStorage tokens so the user lands on the login page only!
const isLoginCallback = window.location.search.includes("code=") && window.location.search.includes("state=");
const isSessionActive = sessionStorage.getItem("interngate_session_active") === "true";

if (!isSessionActive && !isLoginCallback) {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("@@auth0spajs@@")) {
      localStorage.removeItem(key);
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <Auth0Provider
      domain={process.env.REACT_APP_AUTH0_DOMAIN}
      clientId={process.env.REACT_APP_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: process.env.REACT_APP_AUTH0_AUDIENCE,
      }}
      cacheLocation="localstorage"
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);