// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://ba54d3f423e5488aa4df3ea583fdc8c5@o4509282434088960.ingest.de.sentry.io/4509305490899024",

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});