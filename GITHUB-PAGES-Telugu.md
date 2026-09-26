# GitHub Pages లో host చేయడం — Step by Step (Telugu)

> ✅ **అవును, GitHub కూడా free `https://` link ఇస్తుంది** — Netlify లాగే. Bluetooth కి కావాల్సిన HTTPS ఇందులో వస్తుంది. రెండూ పనిచేస్తాయి; ఏదో ఒకటి చాలు.

---

## Netlify vs GitHub — ఏది వాడాలి?

| | Netlify Drop | GitHub Pages |
|---|---|---|
| Upload | Folder drag & drop (30 సెకన్లు) | Website లో files upload (5 నిమిషాలు) |
| Link | `https://ఏదో-పేరు.netlify.app/assembly.html` | `https://USERNAME.github.io/REPO/assembly.html` |
| Update చేయడం | మళ్ళీ drag & drop | మళ్ళీ upload → Commit |
| Files ఎవరికైనా కనిపిస్తాయా? | ❌ కాదు (link మాత్రమే) | ✅ అవును — repo **Public** ఉండాలి (code ఎవరైనా చూడవచ్చు; మీ readings కాదు — అవి ఫోన్‌లోనే) |
| Expire అవుతుందా? | Claim చేయకపోతే అవుతుంది | ❌ ఎప్పటికీ ఉంటుంది |
| Live అవ్వడానికి time | వెంటనే | 1–3 నిమిషాలు |

👉 **నా సలహా:** GitHub — శాశ్వతం, free, reliable. మీ code లో రహస్యం ఏమీ లేదు కాబట్టి Public అయినా పర్లేదు.

---

## ముందుగా — ఏ files upload చేయాలి?

`fluke-dashboard-master.zip` లో ఉన్న files అన్నీ (zip ని extract చేయండి — zip ని కాదు, లోపలి files ని upload చేయాలి):

```
index.html                 ← Live dashboard
assembly.html              ← Heaters reading entry (మీ main app)
vivarana-telugu.html       ← Telugu guide
sw.js                      ← offline
manifest.json              ← Install app (dashboard)
manifest-assembly.json     ← Install app (heaters)
icon-192.png, icon-512.png ← dashboard icons
icon-assembly-192.png, icon-assembly-512.png ← Assembly Dashboard icon
.nojekyll                  ← GitHub కి "files అలాగే serve చేయి" అని చెప్పే ఖాళీ file
README.md                  ← description (optional)
```

⚠️ `.nojekyll` file పేరు dot తో మొదలవుతుంది — Windows లో కొన్నిసార్లు hidden గా ఉంటుంది. కనిపించకపోతే upload చేయకపోయినా app పనిచేస్తుంది (icons/manifest లో చిన్న issue రావచ్చు, అంతే).

---

## Step 1 — GitHub account (2 నిమిషాలు)

1. Laptop browser లో **github.com** → **Sign up**.
2. Email, password, username ఇవ్వండి (username చిన్నదిగా, ఉదా: `kiran-asm`) — **ఇదే మీ link లో వస్తుంది**.
3. Email verify చేయండి → Free plan select.

## Step 2 — Repository create (1 నిమిషం)

1. పైన కుడివైపు **+** → **New repository**.
2. **Repository name:** `fluke` (లేదా `heaters`) — చిన్నదిగా, spaces లేకుండా. **ఇదే link లో వస్తుంది.**
3. **Public** select చేయండి (⚠️ Private అయితే free plan లో Pages పనిచేయదు).
4. ✅ **"Add a README file"** tick చేయండి (దీనివల్ల main branch వెంటనే create అవుతుంది).
5. **Create repository**.

## Step 3 — Files upload (3 నిమిషాలు)

1. Repository page లో **Add file** (పైన కుడివైపు, పచ్చ "Code" బటన్ పక్కన) → **Upload files**.
2. Extract చేసిన folder లోని **అన్ని files select చేసి drag** చేయండి (లేదా "choose your files" → select all).
3. Files list కనిపించాక కింద **Commit changes** (పచ్చ బటన్) నొక్కండి.
4. Repository లో files కనిపిస్తాయి ✅.

## Step 4 — GitHub Pages ON (1 నిమిషం)

1. Repository లో పైన **Settings** tab.
2. ఎడమవైపు menu లో **Pages** (Code and automation section లో).
3. **Build and deployment** → **Source:** `Deploy from a branch`.
4. **Branch:** `main` select → Folder: `/ (root)` → **Save**.
5. **1–3 నిమిషాలు** wait చేయండి → page refresh చేయండి → పైన **"Your site is live at https://USERNAME.github.io/REPO/"** అని వస్తుంది.

## Step 5 — ఫోన్‌లో open (1 నిమిషం)

మీ links (USERNAME, REPO మీవి పెట్టండి):

| App | Link |
|---|---|
| **Heaters reading entry** | `https://USERNAME.github.io/REPO/assembly.html` |
| Live dashboard | `https://USERNAME.github.io/REPO/index.html` (లేదా `/REPO/` మాత్రమే) |
| Telugu guide | `https://USERNAME.github.io/REPO/vivarana-telugu.html` |

1. Link ని WhatsApp లో మీకే పంపుకోండి → ఫోన్ **Chrome** లో open.
2. Chrome menu ⋮ → **Add to Home screen / Install app** → "Assembly" icon (app పేరు: Assembly Dashboard).
3. Meter F బటన్ → app లో **Setup → Connect meter** → 378FC → Pair.

---

## Update చేయడం (కొత్త version ఇచ్చినప్పుడు)

### A. GitHub లో కొత్త files పెట్టడం (ఇది చేయకపోతే phone లో ఎప్పటికీ update రాదు!)
1. github.com → మీ **repository** open → **Add file → Upload files**.
2. కొత్త zip ని computer లో **extract** చేసి, లోపలి **అన్ని files** drag చేయండి (`assembly.html`, `sw.js`, `index.html`, `manifest-assembly.json`, `icon-assembly-192.png`, `icon-assembly-512.png`, …). అవే పేర్లు కాబట్టి పాతవి overwrite అవుతాయి.
3. కింద **Commit changes** నొక్కండి. 1–2 నిమిషాల్లో live అవుతుంది.
4. Check: computer/phone Chrome లో `https://USERNAME.github.io/REPO/assembly.html` open చేసి కుడి-కింద version చూడండి (`v2026-09-04.19` లేదా కొత్తది). ఇక్కడ కొత్తది కనిపిస్తేనే upload సరిగ్గా అయినట్టు.

### B. Phone లో (install చేసిన app)
- Internet ON చేసి app open చేయండి → v19 నుంచి app **దానంతట అదే** కొత్త version కి మారుతుంది (కొన్ని సార్లు "New version available → ↻ Update" banner వస్తుంది → tap).
- రాకపోతే: app లో కుడి-కింద ఉన్న చిన్న **version number మీద tap** చేయండి → "Checking for update…" → app refresh అయ్యి కొత్త version వస్తుంది.
- అప్పటికీ పాతదే ఉంటే (చాలా పాత install): Chrome ⋮ → Settings → Site settings → Storage → మీ site → **Clear** → app మళ్ళీ open. (Data localStorage లో ఉంటుంది కాబట్టి readings పోతాయి — ముందు report share చేయండి; Google Sheet లో ఉంటే ఏం కాదు.)

### C. App పేరు / icon మారాలంటే (Assembly Dashboard)
Android home screen లో పాత "Heaters" icon పేరు దానంతట అదే మారదు. ఒకసారి:
1. పాత icon ని long-press → **Uninstall / Remove**.
2. Chrome లో site open → ⋮ → **Add to Home screen / Install app** → కొత్త **"Assembly"** icon (లోపల పేరు "Assembly Dashboard") వస్తుంది.

---

## సమస్యలు

| సమస్య | పరిష్కారం |
|---|---|
| Settings → Pages లో "Deploy from a branch" disabled / కనపడట్లేదు | Repo **Private** గా ఉంది → Settings → General → కింద Danger Zone → **Change visibility → Public** |
| Branch dropdown లో `main` లేదు | Step 2 లో README tick చేయలేదు → Add file → Create new file → పేరు `README.md` → Commit; తర్వాత Pages లో మళ్ళీ try |
| Link open చేస్తే **404** | (a) 3 నిమిషాలు wait చేసి refresh; (b) file పేరు check — `assembly.html` (చిన్న అక్షరాలు); (c) files repo root లో ఉన్నాయా, ఏదైనా sub-folder లో కాదా చూడండి |
| Icons / Install app రావట్లేదు | `.nojekyll` upload అవ్వలేదు → Add file → Create new file → పేరు `.nojekyll` → (ఖాళీగా) Commit |
| Bluetooth "not secure context" | Link `https://` తో ఉందా చూడండి (GitHub always https — `http://` typing చేస్తే redirect అవుతుంది) |
| Update చేసినా పాత page | (1) GitHub లో కొత్త files నిజంగా upload అయ్యాయా? computer Chrome లో site open చేసి version చూడండి. (2) Phone app లో కుడి-కింద version number tap. (3) Chrome ⋮ → Settings → Site settings → Storage → మీ site → Clear |

---

## ఒక్క వాక్యంలో

**github.com → New repository (Public + README) → Upload files → Commit → Settings → Pages → main → Save → 2 నిమిషాలు → `https://USERNAME.github.io/REPO/assembly.html` ఫోన్ Chrome లో → Add to Home screen.**
