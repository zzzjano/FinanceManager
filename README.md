# Finance Manager

Kompleksowy system zarządzania finansami oparty na architekturze mikroserwisów z autentykacją OAuth2 przez Keycloak.

## 🏗️ Architektura

System składa się z następujących komponentów:

- **Resource Server** (Port 3001) - Główne API z autentykacją OAuth2
- **User Service** (Port 3002) - Serwis zarządzania użytkownikami  
- **Finance Service** (Port 3003) - Serwis operacji finansowych
- **Client SPA** (Port 3000) - Aplikacja React dla użytkowników końcowych
- **Client SSR** (Port 3006) - Aplikacja Server-Side Rendered
- **Backend-to-Backend** - Serwis generowania raportów (działający w tle)
- **Keycloak** (Port 8080) - Serwer autoryzacji OAuth2
- **MongoDB** - Baza danych dla aplikacji
- **PostgreSQL** - Baza danych dla Keycloak

## 🚀 Szybki start

### 1. Sklonuj repozytorium
```bash
git clone <repository-url>
cd FinanceManager
```

### 2. Uruchom wszystkie serwisy
```bash
docker-compose up -d
```

### 3. Skonfiguruj Keycloak

1. Otwórz przeglądarkę i przejdź na: http://localhost:8080
2. Zaloguj się do panelu administracyjnego Keycloak:
   - **Username**: `admin`
   - **Password**: `admin`

3. **Importuj konfigurację realm**:
   - Kliknij na dropdown "Select realm" (w lewym górnym rogu)
   - Wybierz "Create Realm"
   - W sekcji "Resource file" kliknij "Browse"
   - Wybierz plik `realm-export.json` z katalogu głównego projektu
   - Kliknij "Create"

4. Realm `finance-manager` zostanie utworzony z kompletną konfiguracją:
   - Klientami OAuth2
   - Rolami użytkowników
   - Mapperami tokenów
   - Ustawieniami bezpieczeństwa

5. **Utwórz użytkownika administracyjnego w realmie `finance-manager`**:
   - W panelu administracyjnym Keycloak, upewnij się, że wybrany jest realm `finance-manager`.
   - Przejdź do sekcji "Users" i kliknij "Add user".
   - Wprowadź nazwę użytkownika "admin"
   - W zakładce "Credentials" ustaw hasło "admin" dla użytkownika.
   - W zakładce "Role Mappings" przypisz rolę `realm-admin` (z dostępnych "Realm Roles") do użytkownika.

6. **Utwórz konto użytkownika w aplikacji**:
   - Aby korzystać z aplikacji, utwórz konto użytkownika pod adresem: http://localhost:3000/register

## 🌐 Dostęp do aplikacji

Po uruchomieniu i konfiguracji Keycloak, dostęp do aplikacji:

- **Client SPA**: http://localhost:3000
- **Client SSR**: http://localhost:3006  
- **Resource Server API**: http://localhost:3001/api
- **Keycloak Admin Console**: http://localhost:8080