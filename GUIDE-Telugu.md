# Fluke 378 FC → మీ సొంత HTML Dashboard — పూర్తి Telugu గైడ్

> ఈ file ని phone లో save చేసుకుని offline లో చదువుకోవచ్చు.

---

## 1. సూటి సమాధానం

**✅ సాధ్యమే (Possible).**
Fluke app లేకుండా, మీ మీటర్ readings ని Bluetooth ద్వారా మీ ఫోన్‌లోని **సొంత HTML dashboard** లో live గా చూడవచ్చు. **Internet అవసరం లేదు.**

కానీ 3 conditions:

| # | Condition | ఎందుకు |
|---|---|---|
| 1 | **Android ఫోన్ + Chrome browser** | iPhone/Safari లో Web Bluetooth లేదు |
| 2 | Dashboard page ని **ఒక్కసారి HTTPS link** నుంచి open చేయాలి | Chrome నియమం (తర్వాత offline) |
| 3 | మీ 378 FC యొక్క Bluetooth "address" (UUID) ఒకసారి **test** చేయాలి | ఇప్పటివరకు 376 FC మీద మాత్రమే publicly verify అయింది; 378 FC same family కాబట్టి same అయ్యే అవకాశం ఎక్కువ — కానీ ఒకసారి చూడాలి |

---

## 2. Concept — అసలు ఇది ఎలా పనిచేస్తుంది?

### 2.1 సులభమైన ఉదాహరణ (Analogy) — FM Radio

- **మీ Fluke మీటర్ = చిన్న radio station.**
  F button నొక్కగానే, అది తన display లో ఉన్న reading ని (ఉదా: `-6.60 A dc`) 2.4 GHz radio waves లో చుట్టూ 3–10 మీటర్ల దూరం వరకు పంపుతూ ఉంటుంది — సెకనుకు ఒకటి–రెండు సార్లు.
- **Fluke Connect app = Fluke కంపెనీ ఇచ్చిన radio receiver.**
- **మన HTML dashboard = మనమే తయారు చేసుకున్న radio receiver.**
- మీటర్‌కి "ఎవరు వింటున్నారు" అనేది తెలియదు, పట్టింపు లేదు. అది తన పని తాను చేస్తుంది.

అంటే: **Fluke app ఒక్కటే మార్గం కాదు.** ఆ radio "భాష" ఏమిటో తెలిస్తే ఎవరైనా వినవచ్చు. ఆ భాష ఇప్పటికే బయటపడింది (కింద చూడండి).

### 2.2 మీటర్ లోపల ఏముంది?

మీటర్ లో **Bluetooth Low Energy (BLE)** chip ఉంది. BLE లో data "పెట్టెల్లో" ఉంటుంది:

```
Service        = పెద్ద పెట్టె   (address: పొడవైన number = UUID)
 └ Characteristic = లోపలి పెట్టె  (address: ఇంకో UUID)  ← ఇందులో reading ఉంటుంది
```

Fluke **376 FC** (మీ 378 FC కి తోబుట్టువు) లో ఒకరు కనుగొన్నది:

| ఏమిటి | విలువ |
|---|---|
| Service UUID | `b6981800-7562-11e2-b50d-00163e46f8fe` |
| Characteristic UUID | `b6982901-7562-11e2-b50d-00163e46f8fe` |
| లోపల ఉన్న data | display మీద ఉన్న text **అలాగే** — ఉదా: `"   0.7 A  dc"` |

👉 ముఖ్యమైన విషయం: Fluke ఏ రహస్య code (encryption) వాడలేదు. **సాదా text.** అందుకే మనం సులభంగా చదవగలం.

### 2.3 ఫోన్ లో ఏం జరుగుతుంది?

1. ఫోన్ లో Bluetooth chip ఉంది.
2. కానీ ఒక web page నేరుగా ఆ chip ని touch చేయలేదు — మధ్యలో **Chrome browser** ఉంది.
3. Chrome లో **"Web Bluetooth"** అనే facility ఉంది. Page లోని JavaScript code Chrome ని అడుగుతుంది: *"నాకు ఒక Bluetooth device కి connect అవ్వాలి."*
4. Chrome మీకు ఒక **devices list** చూపిస్తుంది → మీరు **378FC** select చేసి **Pair** నొక్కుతారు.
5. అప్పటినుంచి మీటర్ పంపే ప్రతి packet → Chrome → page లోని code కి చేరుతుంది.
6. Code ఆ text ని చదివి **పెద్ద అంకెలుగా, graph గా, table గా** చూపిస్తుంది.

### 2.4 Data ప్రయాణం (ఒక్క వరుసలో)

```
[Fluke 378 FC] ──BLE radio──▶ [Phone Bluetooth chip] ──▶ [Chrome: Web Bluetooth] ──▶ [index.html JavaScript] ──▶ [Screen]
```

**ఈ గొలుసులో ఎక్కడా internet లేదు.** అందుకే offline పనిచేస్తుంది.

### 2.5 "HTML dashboard" అంటే ఏమిటి?

ఒక file — `index.html`. దీనిలో మూడు భాగాలు:

| భాగం | పని |
|---|---|
| **HTML** | ఏమేం కనిపించాలి (బటన్లు, అంకెలు, table) |
| **CSS** | ఎలా కనిపించాలి (రంగులు, sizes) |
| **JavaScript** | ఏం చేయాలి (Bluetooth connect, data చదవడం, graph గీయడం, CSV తయారు చేయడం) |

నేను ఇచ్చిన file లో ఈ మూడూ **ఒకే file లో** ఉన్నాయి. Server, database, login — ఏమీ లేవు. అంతా మీ ఫోన్‌లోనే.

---

## 3. "Offline" — Internet అవసరమా?

| దశ | Internet కావాలా? |
|---|---|
| మీటర్ ↔ ఫోన్ data | ❌ **ఎప్పుడూ అవసరం లేదు** (Bluetooth direct) |
| Dashboard page open చేయడం | మొదటిసారి మాత్రమే ✅ — తర్వాత ❌ |

Page ఫోన్‌లో ఉండటానికి 2 దారులు:

**దారి A (Recommended):** ఒక్కసారి internet తో HTTPS link open చేయండి → page తనను తాను ఫోన్‌లో save చేసుకుంటుంది (దీన్ని *service worker* అంటారు) → Home screen కి **Install** చేయండి → ఇకపై internet లేకున్నా app లాగా open అవుతుంది.

**దారి B:** `index.html` file ని ఫోన్‌లో copy చేసి Files app నుంచి Chrome తో open చేయడం. చాలా Android ఫోన్లలో పనిచేస్తుంది, కానీ కొన్నింటిలో Chrome ఈ విధంగా open చేసిన page కి Bluetooth ఇవ్వదు. Try చేయండి; పనిచేయకపోతే దారి A.

---

## 4. HTTPS ఎందుకు? (చాలా మంది confuse అయ్యే point)

Chrome నియమం:
> *"Bluetooth లాంటి hardware ని **నమ్మకమైన (secure) address** నుంచి వచ్చిన page కి మాత్రమే ఇస్తాను."*

- Secure address = `https://` తో మొదలయ్యేది (లేదా `localhost`).
- `http://` (s లేకుండా) page కి Chrome Bluetooth ఇవ్వదు → **SecurityError**.

అందుకే file ని ఒక్కసారి **free HTTPS hosting** లో పెట్టాలి.
*Hosting* అంటే మీ file ని internet లో ఒక address వద్ద ఉంచడం. Free options: **Netlify Drop** (drag & drop, 1 నిమిషం), **GitHub Pages**.

---

## 5. Setup — ఒక్కసారి చేయాల్సినవి

### Step 1 — Files తీసుకోండి
Workspace లోని `fluke-dashboard` folder లో 5 files ఉన్నాయి. అన్నీ **ఒకే folder లో** download చేయండి:

```
fluke-dashboard/
 ├ index.html      ← dashboard (ముఖ్యమైనది)
 ├ sw.js           ← offline cache
 ├ manifest.json   ← "Install app" కోసం
 ├ icon-192.png    ← app icon
 └ icon-512.png    ← app icon
```

### Step 2 — HTTPS లో పెట్టండి (Netlify Drop — easiest)
1. Laptop browser లో **app.netlify.com/drop** open చేయండి.
2. Free account (email) create చేయండి.
3. `fluke-dashboard` folder ని ఆ page మీద **drag & drop** చేయండి.
4. 30 సెకన్లలో link వస్తుంది: `https://ఏదో-పేరు.netlify.app`

*(GitHub Pages alternative: github.com → New repository (Public) → "Upload files" → 5 files upload → Commit → Settings → Pages → Branch: main → Save → `https://username.github.io/repo-name/`)*

### Step 3 — ఫోన్‌లో install చేయండి
1. Android **Chrome** లో ఆ link open చేయండి.
2. Header లో **"✔ offline ready"** కనిపిస్తుంది = page ఫోన్‌లో save అయింది.
3. Chrome menu (⋮) → **"Add to Home screen"** / **"Install app"** → Add.
   (లేదా page లో **📲 Install app** button కనిపిస్తే అది నొక్కండి.)
4. Home screen లో **"Fluke Dash"** icon వస్తుంది. **ఇకపై internet అవసరం లేదు.**

### Step 4 — ఫోన్ permissions
- Bluetooth **ON**.
- Android అడిగితే **Location** / **Nearby devices** permission → Allow. (పాత Android లలో Bluetooth scanning కి Location ON ఉండాలి — ఇది Android నియమం, Chrome ది కాదు.)

### Step 5 — మొదటి test (Demo mode — మీటర్ అవసరం లేదు)
Fluke Dash open → **▶ Demo mode** నొక్కండి → నకిలీ readings తో dashboard ఎలా పనిచేస్తుందో చూడండి (అంకె, graph, table, CSV). Concept అర్థం అవ్వడానికి ఇది ఉపయోగం. మళ్ళీ నొక్కితే ఆగుతుంది.

---

## 6. Daily use — మీటర్ connect చేయడం

1. మీటర్ rotary switch ని కావలసిన mode కి తిప్పండి (ఉదా: **A**). Clamp ని wire చుట్టూ పెట్టండి.
2. మీటర్ మీద **F button** (SAVE / wireless గుర్తు ఉన్న బటన్) నొక్కండి → display లో **Bluetooth గుర్తు** వస్తుంది.
3. ఫోన్‌లో **Fluke Dash** open → **🔵 Connect meter** నొక్కండి.
4. Chrome చిన్న window చూపిస్తుంది (devices list). **378FC** (లేదా మీరు Fluke app లో పెట్టిన పేరు) కనిపించగానే select చేసి **Pair** నొక్కండి.
   ⚠️ Fluke Connect app close చేసి ఉంచండి — మీటర్ ఒకేసారి ఒక్క connection మాత్రమే తీసుకుంటుంది.
5. Header లో **పచ్చ చుక్క + "Connected · 378FC"** వస్తుంది.
6. మధ్యలో **పెద్ద అంకె = live reading**. మీటర్ display లో ఉన్నదే ఇక్కడ కనిపిస్తుంది.
7. కింద **Min / Max / Avg / Samples** automatic గా లెక్క అవుతాయి. Graph కదులుతూ ఉంటుంది. Table లో ప్రతి reading time తో store అవుతుంది.
8. పని అయ్యాక **⬇ Export CSV** → `.csv` file download అవుతుంది → Excel లో open చేయవచ్చు / WhatsApp లో share చేయవచ్చు.
9. **Disconnect** నొక్కండి లేదా మీటర్ OFF చేయండి.

Connection మధ్యలో పోతే dashboard **5 సార్లు automatic గా reconnect** try చేస్తుంది. Connected ఉన్నంత వరకు screen off అవ్వకుండా చూస్తుంది (wake lock).

---

## 7. Dashboard లో ప్రతి భాగం అర్థం

| భాగం | అర్థం |
|---|---|
| Header చుక్క | బూడిద = connect కాలేదు · పసుపు = connecting / demo · **పచ్చ = connected** · ఎరుపు = disconnected |
| ✔ offline ready | Page ఫోన్‌లో save అయింది, internet లేకుండా open అవుతుంది |
| 🔵 Connect meter | Bluetooth devices list open చేస్తుంది |
| Disconnect | Connection తీసేస్తుంది |
| ▶ Demo mode | నకిలీ data తో practice |
| Reset stats | Min/Max/Avg/graph clear |
| ⬇ Export CSV | అన్ని readings file గా save |
| 📲 Install app | Home screen కి add (Chrome support చేస్తే కనిపిస్తుంది) |
| Show all Bluetooth devices | Meter list లో కనపడకపోతే tick చేయండి |
| Advanced (UUIDs) | మీ మీటర్ address వేరుగా ఉంటే ఇక్కడ మార్చండి (Section 9) |
| LCD panel | Device పేరు, 🔋 battery %, పెద్ద అంకె, unit (A/V/Ω…), mode chips (dc/ac/MAX/HOLD…), time |
| Min / Max / Avg / Samples | ఈ session గణాంకాలు; "/s" = సెకనుకు ఎన్ని readings |
| Trend graph | చివరి 240 readings గీత |
| Raw text / Raw hex | మీటర్ **నిజంగా** పంపిన bytes — సమస్య వచ్చినప్పుడు debug కి |
| Measurement log | ప్రతి reading time, value, unit, mode తో table (చివరి 60 చూపిస్తుంది; CSV లో అన్నీ) |
| Device info & connection log | Model, firmware, connect అయిన time; ఏం జరుగుతోందో messages |

---

## 8. సమస్యలు & పరిష్కారాలు

| సమస్య | కారణం | పరిష్కారం |
|---|---|---|
| ఎర్ర banner: "Web Bluetooth is not available" | తప్పు browser | **Chrome** వాడండి (Android). Firefox / iPhone Safari పనిచేయవు |
| ఎర్ర banner: "Not a secure context" | `http://` లో open చేశారు | `https://` link వాడండి (Section 4) |
| పసుపు banner: "inside a preview frame" | Chat preview లో చూస్తున్నారు | Page ని **సొంత tab** లో open చేయండి |
| Connect నొక్కితే list ఖాళీ | Meter Bluetooth OFF / దూరం / Location OFF | Meter F button నొక్కి Bluetooth గుర్తు చూడండి; 2 m లోపు రండి; Location ON; **"Show all Bluetooth devices"** tick |
| List లో ఉంది కానీ connect అవ్వదు | Fluke Connect app / nRF Connect ఇంకా connected | ఆ apps close చేసి, meter OFF→ON చేసి మళ్ళీ try |
| Connected కానీ అంకె "----" | UUID వేరు | Section 9 (nRF Connect) చేయండి |
| అంకె వస్తుంది కానీ వేరుగా / అర్థం కావట్లేదు | Text format కొంచెం వేరు | "Raw text" box లో ఏం వచ్చిందో చూడండి; ఆ text పంపితే code సర్దుబాటు చేయవచ్చు |
| తరచుగా disconnect | దూరం ఎక్కువ / metal panel / battery low | దగ్గరకి రండి; meter battery మార్చండి |
| Meter కొద్దిసేపటికి OFF అవుతోంది | Auto Power Off | Meter manual లో APO disable పద్ధతి చూడండి (long logging కి) |

---

## 9. UUID check — nRF Connect తో (connect అయ్యి కూడా అంకె రాకపోతే మాత్రమే)

1. Play Store → **"nRF Connect for Mobile"** (Nordic Semiconductor) install.
2. Meter F button → Bluetooth ON.
3. nRF Connect → **SCAN** → **378FC** → **CONNECT**.
4. Services list లో **"Unknown Service"** కనిపిస్తుంది — దాని UUID note చేయండి (`b698…` లాగా ఉండాలి).
5. దాన్ని expand చేస్తే **"Unknown Characteristic"** (properties: NOTIFY, READ) — దాని UUID note చేయండి.
6. ఆ characteristic పక్కన **↓ (read)** నొక్కితే value కనిపిస్తుంది. Text లో reading కనిపిస్తే ✅ **ఇదే మనకి కావాల్సింది.**
7. nRF Connect లో **DISCONNECT** చేయండి (లేకపోతే dashboard connect అవ్వదు).
8. Dashboard → **Advanced** → ఆ రెండు UUIDs paste → **Connect meter**.

---

## 10. ఏవి సాధ్యం కాదు (నిజాయితీగా)

| ❌ | ఎందుకు | ప్రత్యామ్నాయం |
|---|---|---|
| iPhone Safari | Apple Web Bluetooth ఇవ్వదు | iPhone లో "Bluefy" browser app తో try చేయవచ్చు |
| Page close చేసి / screen off లో 24 గంటలు background logging | Web Bluetooth page open ఉన్నప్పుడే పనిచేస్తుంది | Laptop / Raspberry Pi + Python (bleak) పద్ధతి |
| WhatsApp కి automatic గా readings | WhatsApp కి అలాంటి facility లేదు | CSV / screenshot manual share |
| Fluke official support | ఇది community reverse-engineering | Firmware update తో format మారితే చిన్న సర్దుబాటు అవసరం కావచ్చు |
| 20–30 m దూరం నుంచి | Practical BLE range తక్కువ | 3 m లోపు ఉండండి |

---

## 11. సారాంశం

- **సాధ్యమే.** మీటర్ readings సాదా text లో Bluetooth ద్వారా వస్తాయి; Chrome లోని Web Bluetooth తో మన సొంత HTML page వాటిని చదవగలదు.
- **Internet అవసరం లేదు** — మొదటిసారి page open చేయడానికి తప్ప.
- **ఒక్కసారి setup:** 5 files → Netlify Drop → phone Chrome లో open → Install.
- **రోజూ:** Meter F button → Fluke Dash → Connect meter → 378FC → Pair → readings.
- **ఒకే unknown:** మీ 378 FC UUID 376 FC లాగే ఉందా — మొదటి connect లో తెలిసిపోతుంది; వేరుగా ఉంటే nRF Connect తో 5 నిమిషాల్లో fix.
