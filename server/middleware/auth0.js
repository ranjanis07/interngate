const { auth } = require("express-oauth2-jwt-bearer");

// Verifies the access token Auth0 issued to the React SPA, checking its
// signature against Auth0's public keys (JWKS) plus audience/issuer.
// No shared secret is needed here.
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: "RS256",
});

module.exports = { checkJwt };