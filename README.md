# 🌤️ Meteo:bit - Estacions Meteorològiques Escolars

Dashboard interactiu per visualitzar dades d'estacions meteorològiques construïdes per alumnes de primària utilitzant kits micro:bit i ThingSpeak.

## 📋 Característiques

- 🏫 Suport per a 6 escoles diferents
- 📊 Gràfics interactius amb Chart.js
- 📅 Filtratge per rang de dates
- 🌡️ Visualització de 4 sensors (temperatura, humitat, pressió, vent)
- 📱 Disseny responsive per a mòbils i tauletes
- 🎨 Interfície atractiva en català
- 💾 Emmagatzematge de dades a GitHub
- 🔄 Actualització automàtica via GitHub Actions

---

## 🚀 Guia Ràpida de Desplegament a GitHub Pages

### Pas 1: Crear un repositori nou a GitHub

1. Ves a [github.com/new](https://github.com/new)
2. Nom del repositori: `estacions-meteo-escoles` (o el nom que vulguis)
3. Descripció: `Dashboard d'estacions meteorològiques escolars`
4. Marca **Public** (necessari per GitHub Pages gratuït)
5. **NO** marquis "Add a README file" (ja el tenim)
6. Clica **Create repository**

### Pas 2: Pujar el projecte

Obre una terminal a la carpeta `weather-station-dashboard` i executa:

```bash
# Inicialitza git (si no està fet)
git init

# Afegeix tots els arxius
git add .

# Fes el primer commit
git commit -m "🚀 Primera versió del dashboard meteorològic"

# Afegeix el teu repositori remot (canvia per la teva URL!)
git remote add origin https://github.com/EL_TEU_USUARI/estacions-meteo-escoles.git

# Puja els arxius
git branch -M main
git push -u origin main
```

### Pas 3: Activar GitHub Pages

1. Ves al teu repositori a GitHub
2. Clica a **Settings** (engranatge)
3. Al menú esquerre, clica a **Pages**
4. A **Source**, selecciona:
   - Branch: `main`
   - Folder: `/ (root)`
5. Clica **Save**
6. Espera uns minuts i la teva pàgina estarà a:
   ```
   https://EL_TEU_USUARI.github.io/estacions-meteo-escoles/
   ```

### Pas 4: Configurar el projecte

Edita el fitxer `js/config.js`:

```javascript
github: {
    username: 'EL_TEU_USUARI',           // ← El teu usuari de GitHub
    repository: 'estacions-meteo-escoles', // ← El nom del repositori
    branch: 'main'
},
```

Fes commit i push dels canvis:

```bash
git add js/config.js
git commit -m "🔧 Configuració GitHub"
git push
```

---

## ⚙️ Configuració de ThingSpeak

### Obtenir les claus API

Per a cada escola, necessites el **Channel ID** i la **Read API Key** de ThingSpeak:

1. Inicia sessió a [thingspeak.com](https://thingspeak.com)
2. Ves al canal de l'estació
3. A la pestanya **API Keys**, copia la **Read API Key**
4. El **Channel ID** apareix a la URL i a la configuració del canal

### Configurar les escoles

Edita `js/config.js` i actualitza cada escola:

```javascript
escola1: {
    id: 'escola1',
    name: 'El Nom de la Teva Escola',
    description: 'Descripció de l\'estació...',
    location: 'Ciutat',
    
    thingspeak: {
        channelId: '123456',              // ← El teu Channel ID
        readApiKey: 'ABCDEFGHIJK12345',   // ← La teva Read API Key
    },
    // ...
},
```

---

## 🔄 Emmagatzematge de Dades amb GitHub Actions

El projecte inclou un workflow de GitHub Actions que recull dades de ThingSpeak automàticament i les guarda al repositori.

### Configurar els Secrets de GitHub

1. Ves al teu repositori → **Settings** → **Secrets and variables** → **Actions**
2. Clica **New repository secret** per a cada clau:

| Nom del Secret | Valor |
|----------------|-------|
| `ESCOLA1_CHANNEL_ID` | Channel ID de l'escola 1 |
| `ESCOLA1_API_KEY` | Read API Key de l'escola 1 |
| `ESCOLA2_CHANNEL_ID` | Channel ID de l'escola 2 |
| `ESCOLA2_API_KEY` | Read API Key de l'escola 2 |
| ... | (repetir per cada escola) |

### Activar GitHub Actions

1. Ves a **Actions** al teu repositori
2. Clica **I understand my workflows, go ahead and enable them**
3. El workflow `Collect Weather Data` s'executarà cada hora automàticament

### Executar Manualment

Pots executar la recollida de dades manualment:
1. Ves a **Actions** → **Collect Weather Data**
2. Clica **Run workflow**

---

## 📁 Estructura del Projecte

```
weather-station-dashboard/
├── index.html              # Pàgina principal (landing)
├── escola.html             # Plantilla per a cada escola
├── css/
│   └── styles.css          # Estils del dashboard
├── js/
│   ├── config.js           # ⚠️ CONFIGURACIÓ PRINCIPAL
│   ├── dashboard.js        # Lògica del dashboard
│   ├── charts.js           # Gràfics amb Chart.js
│   ├── thingspeak-service.js # Connexió amb ThingSpeak
│   ├── data-storage.js     # Gestió de dades locals
│   └── demo-data.js        # Dades de demostració
├── data/
│   ├── index.json          # Índex de dades disponibles
│   └── escola1/            # Dades de cada escola
│       └── ...
└── .github/
    └── workflows/
        └── collect-data.yml # Workflow automàtic
```

---

## 🎨 Mode Demo

Per provar el dashboard sense configurar ThingSpeak:

1. A `js/config.js`, assegura't que:
   ```javascript
   demoMode: true,
   ```
   
2. O afegeix `?demo=true` a la URL:
   ```
   https://el-teu-usuari.github.io/estacions-meteo-escoles/?demo=true
   ```

---

## 🛠️ Desenvolupament Local

Per treballar localment, necessites un servidor web (per les restriccions CORS):

### Opció 1: Python
```bash
cd weather-station-dashboard
python -m http.server 8000
```
Obre http://localhost:8000

### Opció 2: VS Code Live Server
1. Instal·la l'extensió "Live Server"
2. Fes clic dret a `index.html` → "Open with Live Server"

### Opció 3: Node.js
```bash
npx serve
```

---

## 📄 Llicència

MIT License - Lliure per a ús educatiu i personal.

---

## 🙏 Agraïments

- Als alumnes i mestres de les escoles participants
- [micro:bit](https://microbit.org/) per la plataforma educativa
- [ThingSpeak](https://thingspeak.com/) per la plataforma IoT
- [Chart.js](https://www.chartjs.org/) per les gràfiques

---

**Fet amb ❤️ per al Projecte mentoria 4.0 a Catalunya**
