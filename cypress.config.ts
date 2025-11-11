import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "xzhvyb",

  e2e: {
    baseUrl: "http://localhost:8080",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,

    setupNodeEvents(_on, _config) {
      // implement node event listeners here
    },
  },

  reporter: "mochawesome",
  reporterOptions: {
    reportDir: "cypress/reports/mochawesome",
    overwrite: false,
    html: false,
    json: true,
    timestamp: "mmddyyyy_HHMMss",
  },

  env: {
    // Environment variables will be loaded from cypress.env.json
  },
});
