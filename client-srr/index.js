// ...existing code...
const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const path = require('path');
const axios = require('axios'); // Dodano axios

const app = express();
const port = 3006; // Port dla aplikacji SSR

// URL do Twojego resource-server API
const RESOURCE_SERVER_URL = 'http://localhost:3001/api'; // Upewnij się, że to poprawny URL

// Middleware do parsowania ciała żądania (dla formularza)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Konfiguracja sesji - wymagane przez keycloak-connect
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: 'twojSilnySekretSesjiSSR123!', // Zmień na silny, unikalny sekret
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

// Inicjalizacja Keycloak
const keycloak = new Keycloak({ store: memoryStore });

// Middleware Keycloak
app.use(keycloak.middleware({
  logout: '/logout',
  admin: '/'
}));

// Przykładowe trasy
app.get('/', (req, res) => {
  const userName = req.kauth && req.kauth.grant ? req.kauth.grant.access_token.content.preferred_username : 'Gość';
  res.send(`
    <h1>Witaj w aplikacji SSR, ${userName}!</h1>
    ${req.kauth && req.kauth.grant ? `
      <a href="/protected">Panel Użytkownika</a><br>
      <a href="/logout">Wyloguj</a>
    ` : '<a href="/login">Zaloguj</a>'}
    <br><a href="/public">Zasób publiczny</a>
  `);
});

app.get('/login', keycloak.protect(), (req, res) => {
  res.redirect('/');
});

app.get('/public', (req, res) => {
  res.send('To jest zasób publiczny. Każdy ma do niego dostęp.');
});

// Chroniona trasa - wyświetlanie informacji, preferencji, kont i transakcji
app.get('/protected', keycloak.protect(), async (req, res) => {
  try {
    const token = req.kauth.grant.access_token.token;
    const userInfo = req.kauth.grant.access_token.content;
    const userId = userInfo.sub; // User ID z tokena
    const userRoles = userInfo.realm_access && userInfo.realm_access.roles ? userInfo.realm_access.roles.join(', ') : 'Brak ról realm';

    let preferences = { theme: 'default', language: 'en', currency: 'USD' };
    let preferencesError = null;
    let accounts = [];
    let accountsError = null;
    let transactions = [];
    let transactionsError = null;

    const axiosConfig = {
      headers: { 'Authorization': `Bearer ${token}` }
    };

    // Pobieranie preferencji
    try {
      const preferencesResponse = await axios.get(`${RESOURCE_SERVER_URL}/users/${userId}/preferences`, axiosConfig);
        preferences = preferencesResponse.data.data.preferences;
    } catch (error) {
      console.error('Błąd podczas pobierania preferencji:', error.response ? error.response.data : error.message);
      preferencesError = 'Nie udało się załadować preferencji.';
      preferences = { theme: 'default', language: 'en', currency: 'USD', ...preferences }; // Użyj domyślnych/częściowych
    }
    preferences.theme = preferences.theme || 'default';
    preferences.language = preferences.language || 'en';
    preferences.currency = preferences.currency || 'USD';

    // Pobieranie kont
    try {
      const accountsResponse = await axios.get(`${RESOURCE_SERVER_URL}/accounts`, axiosConfig);
        accounts = accountsResponse.data.data.accounts;
    } catch (error) {
      console.error('Błąd podczas pobierania kont:', error.response ? error.response.data : error.message);
      accountsError = 'Nie udało się załadować listy kont.';
    }

    // Pobieranie transakcji (np. ostatnich 10)
    try {
      const transactionsResponse = await axios.get(`${RESOURCE_SERVER_URL}/transactions`, axiosConfig);
        transactions = transactionsResponse.data.data.transactions;
    } catch (error) {
      console.error('Błąd podczas pobierania transakcji:', error.response ? error.response.data : error.message);
      transactionsError = 'Nie udało się załadować listy transakcji.';
    }

    // Formatowanie daty dla transakcji (opcjonalnie)
    const formatDate = (dateString) => {
      if (!dateString) return 'Brak daty';
      try {
        return new Date(dateString).toLocaleDateString('pl-PL');
      } catch (e) {
        return dateString; // Zwróć oryginalną wartość, jeśli parsowanie zawiedzie
      }
    };

    res.send(`
      <!DOCTYPE html>
      <html lang="pl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Panel Użytkownika</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
          h1, h2, h3 { color: #333; }
          .container { background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .section { margin-bottom: 30px; }
          .error { color: red; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
          form div { margin-bottom: 10px; }
          label { display: inline-block; width: 100px; }
          select, button { padding: 8px; }
          .nav-link { margin-right: 15px; text-decoration: none; color: #007bff; }
          .nav-link:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <p>
            <a href="/" class="nav-link">Strona główna</a>
            <a href="/logout" class="nav-link">Wyloguj</a>
          </p>
          <h1>Panel Użytkownika</h1>
          
          <div class="section">
            <h3>Informacje o Użytkowniku</h3>
            <p>Witaj, ${userInfo.preferred_username}!</p>
            <p>Email: ${userInfo.email}</p>
            <p>ID (sub): ${userId}</p>
            <p>Role (realm): ${userRoles}</p>
            <!-- <p>Token: <pre style="white-space: pre-wrap; word-break: break-all;">${token.substring(0,100)}...</pre></p> -->
          </div>

          <div class="section">
            <h3>Twoje Preferencje</h3>
            ${preferencesError ? `<p class="error">${preferencesError}</p>` : ''}
            <form action="/update-preferences" method="POST">
              <div>
                <label for="theme">Motyw:</label>
                <select id="theme" name="theme">
                  <option value="light" ${preferences.theme === 'light' ? 'selected' : ''}>Jasny</option>
                  <option value="dark" ${preferences.theme === 'dark' ? 'selected' : ''}>Ciemny</option>
                  <option value="system" ${preferences.theme === 'system' || preferences.theme === 'default' ? 'selected' : ''}>Systemowy</option>
                </select>
              </div>
              <div>
                <label for="language">Język:</label>
                <select id="language" name="language">
                  <option value="en" ${preferences.language === 'en' ? 'selected' : ''}>Angielski</option>
                  <option value="pl" ${preferences.language === 'pl' ? 'selected' : ''}>Polski</option>
                  <option value="de" ${preferences.language === 'de' ? 'selected' : ''}>Niemiecki</option>
                </select>
              </div>
              <div>
                <label for="currency">Waluta:</label>
                <select id="currency" name="currency">
                  <option value="USD" ${preferences.currency === 'USD' ? 'selected' : ''}>USD</option>
                  <option value="EUR" ${preferences.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                  <option value="PLN" ${preferences.currency === 'PLN' ? 'selected' : ''}>PLN</option>
                </select>
              </div>
              <button type="submit">Zapisz Preferencje</button>
            </form>
          </div>

          <div class="section">
            <h3>Twoje Konta</h3>
            ${accountsError ? `<p class="error">${accountsError}</p>` : ''}
            ${!accountsError && accounts.length === 0 ? '<p>Nie masz jeszcze żadnych kont.</p>' : ''}
            ${accounts.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Nazwa Konta</th>
                    <th>Typ</th>
                    <th>Saldo</th>
                    <th>Waluta</th>
                  </tr>
                </thead>
                <tbody>
                  ${accounts.map(account => `
                    <tr>
                      <td>${account.name || 'Brak nazwy'}</td>
                      <td>${account.type || 'Brak typu'}</td>
                      <td>${typeof account.balance === 'number' ? account.balance.toFixed(2) : account.balance}</td>
                      <td>${account.currency || preferences.currency}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>

          <div class="section">
            <h3>Ostatnie Transakcje</h3>
            ${transactionsError ? `<p class="error">${transactionsError}</p>` : ''}
            ${!transactionsError && transactions.length === 0 ? '<p>Brak transakcji do wyświetlenia.</p>' : ''}
            ${transactions.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Opis</th>
                    <th>Kategoria</th>
                    <th>Kwota</th>
                    <th>Typ</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactions.slice(0, 10).map(tx => `
                    <tr>
                      <td>${formatDate(tx.date)}</td>
                      <td>${tx.description || 'Brak opisu'}</td>
                      <td>${tx.categoryName || tx.categoryId || 'Brak kategorii'}</td>
                      <td style="color: ${tx.type === 'expense' || (typeof tx.amount === 'number' && tx.amount < 0) ? 'red' : 'green'};">
                        ${typeof tx.amount === 'number' ? tx.amount.toFixed(2) : tx.amount} ${tx.currency || preferences.currency}
                      </td>
                      <td>${tx.type || (typeof tx.amount === 'number' ? (tx.amount < 0 ? 'Wydatek' : 'Przychód') : 'Nieznany')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Błąd na trasie /protected:', error);
    res.status(500).send('Wystąpił błąd serwera podczas ładowania strony chronionej.');
  }
});

// Trasa do aktualizacji preferencji
app.post('/update-preferences', keycloak.protect(), async (req, res) => {
  try {
    const token = req.kauth.grant.access_token.token;
    const userId = req.kauth.grant.access_token.content.sub;
    
    const { theme, language, currency } = req.body;
    const newPreferences = { theme, language, currency };

    await axios.put(`${RESOURCE_SERVER_URL}/users/${userId}/preferences`, newPreferences, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.redirect('/protected?preferencesUpdated=true'); 
  } catch (error) {
    console.error('Błąd podczas aktualizacji preferencji:', error.response ? error.response.data : error.message);
    res.redirect('/protected?preferencesError=true');
  }
});

// Obsługa błędów Keycloak (opcjonalnie, dla lepszego debugowania)
app.use((err, req, res, next) => {
  console.error("Błąd middleware Keycloak lub inny:", err);
  console.error(err.stack);
  res.status(500).send('Coś poszło nie tak z Keycloak lub serwerem!');
});

app.listen(port, () => {
  console.log(`Aplikacja SSR działa na http://localhost:${port}`);
});
// ...existing code...