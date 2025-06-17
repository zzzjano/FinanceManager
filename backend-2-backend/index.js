const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
const querystring = require('querystring');

let config;
try {
  config = require('./keycloak-b2b-config.json');
} catch (error) {
  console.error('FATAL ERROR: Could not load keycloak-b2b-config.json.', error);
  process.exit(1);
}

const REPORTS_DIR = path.resolve(__dirname, config['reports-directory'] || 'reports');

/**
 * Ensures that the base reports directory exists.
 */
async function ensureBaseReportsDirectory() {
  try {
    await fs.ensureDir(REPORTS_DIR);
    console.log(`Base reports directory ensured at: ${REPORTS_DIR}`);
  } catch (err) {
    console.error(`Error creating base reports directory ${REPORTS_DIR}:`, err);
    throw err;
  }
}

/**
 * Fetches an access token from Keycloak using Client Credentials Grant.
 */
async function getAccessToken() {
  const tokenUrl = `${config['auth-server-url']}/realms/${config.realm}/protocol/openid-connect/token`;
  const params = {
    client_id: config['report-service-client-id'],
    client_secret: config['report-service-client-secret'],
    grant_type: 'client_credentials',
  };

  try {
    console.log(`Attempting to get access token from ${tokenUrl} for client_id: ${params.client_id}`);
    const response = await axios.post(tokenUrl, querystring.stringify(params), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    console.log('Successfully obtained access token.');
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
    throw error; // Re-throw to stop execution if token cannot be obtained
  }
}

/**
 * Fetches all users from the resource server API.
 * Requires ADMIN privileges for the service account.
 * @param {string} accessToken The Keycloak access token.
 */
async function fetchAllUsers(accessToken) {
  const usersUrl = `${config['resource-server-api-url']}/users`;
  console.log(`Fetching all users from: ${usersUrl}`);

  try {
    const response = await axios.get(usersUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log('Successfully fetched all users.');
    // Assuming the API returns users in response.data.data.users or response.data.users or directly response.data
    if (response.data && response.data.data && Array.isArray(response.data.data.users)) {
        return response.data.data.users;
    }
    console.warn('Users data not found in expected structure in API response. Response data:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching all users:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
    throw error;
  }
}

/**
 * Fetches a JSON report for a specific user from the resource server API.
 * @param {string} accessToken The Keycloak access token.
 * @param {string} userId The ID of the user for whom to generate the report.
 */
async function fetchUserJsonReport(accessToken, userId) {
  const reportBaseUrl = `${config['resource-server-api-url']}/reports/periodic`;
  const currentUserId = String(userId); // Ensure userId is a string

  const requestParams = {
    period: 'year', // This was hardcoded as 'year' in your version
    userId: currentUserId,
  };

  // Construct URL with query parameters for logging - axios will also do this with its params config
  const queryString = Object.keys(requestParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(requestParams[key])}`)
    .join('&');
  const fullUrlForLog = `${reportBaseUrl}?${queryString}`;

  console.log(`Attempting to fetch JSON report for user ${currentUserId}.`);
  console.log(`Full URL (for logging): ${fullUrlForLog}`);

  const axiosRequestConfig = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Accept': 'application/json' // Explicitly ask for JSON
    },
    params: requestParams,
  };

  console.log('Axios request config:', JSON.stringify(axiosRequestConfig, null, 2));

  try {
    const response = await axios.get(reportBaseUrl, axiosRequestConfig);
    console.log(`Successfully fetched JSON report for user ${currentUserId}. Status: ${response.status}`);
    // console.log('Response headers:', response.headers);
    // console.log('Response data for user ', currentUserId, ':', JSON.stringify(response.data, null, 2)); // More detailed log of response data
    return response.data;
  } catch (error) {
    console.error(`Error fetching JSON report for user ${currentUserId}:`);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else {
      console.error('Message:', error.message);
    }
    throw error; 
  }
}

/**
 * Saves the JSON report data to a file in a user-specific directory.
 * @param {object} data The report data (expected to be a JS object).
 * @param {string} userId The ID of the user.
 */
async function saveUserJsonReportToFile(data, userId) {
  const userReportDir = path.join(REPORTS_DIR, userId);
  await fs.ensureDir(userReportDir); // Ensure user-specific directory exists

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `report_user_${userId}_${timestamp}.json`; // Filename now always .json
  const filepath = path.join(userReportDir, filename);

  try {
    // Data is expected to be a JS object, stringify it for saving
    const contentToSave = JSON.stringify(data, null, 2);
    await fs.writeFile(filepath, contentToSave);
    console.log(`JSON Report for user ${userId} saved to ${filepath}`);
  } catch (error) {
    console.error(`Error saving JSON report for user ${userId} to ${filepath}:`, error);
    throw error;
  }
}

/**
 * Main task to generate and save JSON reports for all users.
 */
async function generateAndSaveJsonReportsForAllUsers() {
  console.log(`
--- Starting JSON report generation task for ALL USERS at ${new Date().toISOString()} ---`);
  try {
    await ensureBaseReportsDirectory(); // Ensure base directory exists
    const accessToken = await getAccessToken();
    const users = await fetchAllUsers(accessToken);

    if (!users || users.length === 0) {
      console.log("No users found to generate reports for.");
      console.log(`--- JSON report generation task finished at ${new Date().toISOString()} ---`);
      return;
    }

    console.log(`Found ${users.length} users. Generating JSON reports...`);
    // console.log(users); // Original console.log for debugging users list

    for (const user of users) {
      const userId = user.keycloakId; // Assuming user object has an _id field
      if (!userId) {
        console.warn("User object missing _id, skipping report generation for:", user);
        continue;
      }

      console.log(`
Generating JSON report for user: ${userId} (${user.username || user.email || 'N/A'})`);

      // Generate and save JSON report for the user
      try {
        const jsonReportData = await fetchUserJsonReport(accessToken, userId);
        await saveUserJsonReportToFile(jsonReportData, userId);
      } catch (reportError) {
        console.error(`Failed to generate or save JSON report for user ${userId}:`, reportError.message);
      }
    }

  } catch (error) {
    console.error('Critical error during JSON report generation for all users:', error.message);
  }
  console.log(`--- JSON report generation task for ALL USERS finished at ${new Date().toISOString()} ---`);
}

// --- Main Execution ---

console.log('Backend-to-Backend Report Generator Service started.');
console.log(`Reports will be saved to: ${REPORTS_DIR}`);
console.log(`Scheduled to run according to cron: "${config['cron-schedule']}"`);

// Validate cron schedule
if (!cron.validate(config['cron-schedule'])) {
  console.error(`FATAL ERROR: Invalid cron schedule: "${config['cron-schedule']}". Please check keycloak-b2b-config.json.`);
  process.exit(1);
}

// Schedule the task
cron.schedule(config['cron-schedule'], () => {
  console.log(`Cron job triggered at ${new Date().toISOString()}`);
  generateAndSaveJsonReportsForAllUsers().catch(err => { // Changed to new main function
    console.error("Unhandled error in scheduled task execution:", err);
  });
});

// Optionally, run once on startup for testing or immediate generation
(async () => {
  console.log("Performing initial run of JSON report generation for all users...");
  await generateAndSaveJsonReportsForAllUsers().catch(err => { // Changed to new main function
    console.error("Unhandled error in initial run:", err);
  });
  console.log("Initial run finished. Waiting for scheduled runs...");
})();