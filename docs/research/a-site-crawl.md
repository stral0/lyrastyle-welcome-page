# A — lyrastyle.rs site crawl and audit

Crawled 2026-11-26. **[V]** = seen directly in a fetch that day (URL given). **[U]** = unverified or inferred.

Method limits: `curl` was blocked (proxy 403), so pages were read as text through a fetch tool; HTTP headers, request counts and images could not be inspected. The public WooCommerce Store API works without auth and was the main data source.

## 0. Address verdict

**Use "Partizanske avijacije 16, LUX 51, lamela 2 (ulaz iz atrijuma), 11070 Novi Beograd". Confidence: high (~90%).**

| Source | Says | Tag |
|---|---|---|
| Contact page https://lyrastyle.rs/kontakt/ | "Partizanske avijacije 16, LUX 51 lamela 2, u atrijumu, 11070 Novi Beograd" | [V] |
| Legal page https://lyrastyle.rs/pravne-informacije/ | retail "Partizanske avijacije 16, Novi Beograd"; registered seat "Smolućska 16V, Novi Beograd" | [V] |
| Legacy-site footer (still served at https://lyrastyle.rs/product/sennheiser-e604) | "Nova lokacija - LUX 51, Partizanske avijacije 16, lamela 2, ulaz iz atrijuma" | [V] |
| Google Business listing (Places lookup, 4.8★, 1,074 reviews) | "Partizanske avijacije 16, Beograd 11070", 44.8224814, 20.3874374 | [V] |
| PlanPlus https://www.planplus.rs/lyra-style-muzicki-instrumenti/93120 | "Partizanske avijacije 6 /LUX 51, Lamela B, 11077" | [V] |
| https://www.poslovnivodic.com/lyra-style-doo-muzicki-instrumenti.html | "Partizanske avijacije 2" | [V] |

Why "6" exists: the LUX 51 complex is marketed at "Partizanske avijacije 6" (https://realestate-magazin.rs/en/nekretnine/projekti/lux-51-an-urban-oasis-of-intimacy-and-comfort/84647) [V]; the directory seems to use the complex address, the shop its own entrance number [U]. APR and Facebook were unreachable; a call to the client closes the remaining doubt.

## 1. Site map and taxonomy

- Sitemap index https://lyrastyle.rs/sitemap_index.xml (Yoast), referenced in robots.txt: 23 child sitemaps, **8 product sitemaps** (`product-sitemap.xml` … `product-sitemap8.xml`) [V].
- **7,933 products** ("1 - 12 od ukupno 7933 proizvoda", https://lyrastyle.rs/prodavnica/) [V].
- **In stock: roughly 4,900–5,400 (62–68%)**; Store API page 50 of `stock_status=instock&per_page=100` has products, page 55 is empty [V]. The rest show "Povremeno na stanju".
- 307 product categories, 8 top-level; 347 brands (Store API `/products/categories`, `/products/brands`) [V].
- Other sitemaps: post, page (14), galerija, referenca, prezentacija, upustvo, baner, bricks_template (24), FAQ taxonomy, author [V].
- Product URL pattern `https://lyrastyle.rs/proizvod/<slug>/` (API permalinks and sitemap) [V].

### Top-level categories (exact names and deep-link URLs) [V]

| Name | URL | Products | Notable subcategories (count) |
|---|---|---|---|
| Gitare | https://lyrastyle.rs/gitare/ | 2,302 | Gitare (923): Električne Gitare 326, Akustične ozvučene gitare 180, Električne Bas gitare 128, Akustične Gitare 123, PRS Električne Gitare 93, Klasične gitare 83, Martin akustične gitare 53 · Pribor i oprema 596 · Žice za gitare 473 · Pojačala 157 · Efekti 138 · Gitare Za Početnike 78 |
| Bubnjevi i Udaraljke | https://lyrastyle.rs/bubnjevi-i-udaraljke/ | 2,049 | Prateća oprema 545 · Udaraljke 351 · Činele 314 · Plastike Kože za bubnjeve 284 · Hardver za bubanj 200 · Palice za bubnjeve 177 · Akustični bubnjevi 175 (Mapex bubnjevi 78, DS Drum 32) · Elektronski bubnjevi 23 |
| Klavijature i Klaviri | https://lyrastyle.rs/klavijature-i-klaviri/ | 271 | Električni klaviri 117 · Pribor i oprema 103 · Polukoncertni klaviri i koncertni klaviri 21 · Pianina 20 · Klavijature za početnike 17 · Radne stanice i Sintisajzeri 12 |
| Klasični Instrumenti | https://lyrastyle.rs/klasicni-instrumenti/ | 2,484 | Usnici i Trske 643 · Gudački instrumenti 642 · Drveni duvački instrumenti 425 · Školski instrumenti 288 · Žice za klasične instrumente 269 · Limeni duvački instrumenti 257 · Žičani instrumenti 18 (Harfe 14) |
| Ozvučenje | https://lyrastyle.rs/ozvucenje/ | 330 | Zvučne kutije 148 · Miksete 59 · 100v sistemi 58 · Kompletni sistemi 42 · Pojačala 20 · Rasveta 12 |
| DJ Oprema Mikrofoni Slušalice | https://lyrastyle.rs/dj-oprema-mikrofoni-slusalice/ | 398 | Žičani – kablovski mikrofoni 133 · Bežični mikrofoni 91 (Sennheiser 27, Shure 13) · Slušalice 67 · Stalci za mikrofone 50 · Studijski mikrofoni 42 · DJ program / Gramofoni / Kontroleri 5 |
| Studio | https://lyrastyle.rs/studio/ | 132 | Studijski monitori 35 · Studijski mikrofoni 34 · Zvučne i procesorske kartice 25 · Studijske slušalice 10 |
| Prateća oprema | https://lyrastyle.rs/prateca-oprema-1/ | 198 | Stalci za razne instrumente 52 · Notni stalci i Notni pribor 42 · Oprema za orkestre 37 · Metronomi i Štimeri 27 · Klavirske stolice 26 |

Counts overlap. Other nav links: `/prodavnica/`, `/kontakt/`, `/blog/`, `/reference/`, `/galerije/`, `/prezentacije/`, `/upustva/`, `/linkovi/` [V].

## 2. Brands

347 brand terms at `https://lyrastyle.rs/brend/<slug>/` [V]. Prior-note brands confirmed: Adam Audio 7, AKG 21, Alesis 11, Shure 57 [V]; **Akai and Agner appear on the homepage strip but have no products in the API list** [V].

Largest by product count [V]: Gewa 412 · Cort 280 · Mapex 267 · Vandoren 217 · Anatolian 186 · D'Addario 179 · Zildjian 174 · Meinl 171 · Yamaha 168 · Ernie Ball 167 · Remo 164 · Gibraltar 160 · Vic Firth 157 · Proel 151 · Markbass 130 · Jim Dunlop 123 · Thomastik 105 · Paul Reed Smith 102 · Schlagwerk 102 · Hohner 89 · Tama 85 · Donner 82 · Martin 80 · Sennheiser 69 · Fender 65 · Pearl 65 · Gibson 59 · Ibanez 55 · Topp Pro 52 · Epiphone 50 · Kawai 48 · DS Drum 46 · Buffet Crampon 41 · Duesenberg 41 · Alhambra 38 · Medeli 36 · Marshall 35 · Korg 27 · Roland 12.

Also present [V]: Neumann, Genelec, RME, SSL, Focusrite, Rode, Audix, Selmer Paris, Yanagisawa, B&S, Melton, Bach, Powell, Camac, Bösendorfer, Petrof, Takamine, Gretsch Drums, DW, Bose, Midas, Behringer, Boss, Vox.

**Flagship (evidence = own brand subcategory, blog post or gallery, deep range)** [V for the evidence, **[U] for any exclusivity**]: Mapex, Markbass, Martin, PRS, Schlagwerk, DS Drum, Vox, Kawai, Buffet Crampon, B&S, Duesenberg, Alhambra, Vandoren, Sennheiser, Shure, Cort, Gewa, Zildjian. No page states "zvanični distributer"; brand pages have no description or logo (https://lyrastyle.rs/brend/mapex/) [V].

House labels [V]: "Lyra Style" (37 products, e.g. Lyra TR 100 trumpet, Lyra SAS 75 sax), "Lion Style" (25, piano benches), "Lyra Khalid" (1).

## 3. Price bands (RSD, Store API `orderby=price`, 2026-11-26) [V]

| Category | Cheapest in stock | Median item | Dearest in stock | Dearest listed (any stock) | Typical instrument bands |
|---|---|---|---|---|---|
| Gitare | 40 (pick) | 11,900 | 799,000 Gibson 1959 Les Paul Reissue | 824,820 Martin D-41 | starter 11,500–18,850; mid electrics 65,000–82,500; Martin/Gibson 384,900–706,820 |
| Bubnjevi i Udaraljke | 120 (tension rod) | 7,500 | 925,000 Mapex Venus LTVE (price looks wrong [U]); 885,000 Zildjian Alchem-E Gold | same | kits 64,900–95,000; e-kits 33,900–109,500; pro 319,500–448,500 |
| Klavijature i Klaviri | 990 (cable) | 22,500 | 3,290,340 Kawai GX-2 | 5,681,060 Kawai GX-7 | keyboards 9,000–28,500; digital pianos 59,000–99,900; premium digital 208,200–418,500 |
| Klasični Instrumenti | 30 (brush) | 4,400 | 513,300 Roland FR-4X | 1,886,784 Melton 4250 tuba | student violins 11,000–19,900; alto sax 64,900–142,600; pro winds 239,000–475,000 |
| Ozvučenje | 42 (cable/m) | 21,830 | 180,200 Yamaha Stagepas 600BT | 458,800 Midas M32 | mixers 10,990–70,900; active speakers 27,250–46,090 |
| DJ Oprema Mikrofoni Slušalice | 120 (adapter) | 16,860 | 146,320 Audix DP7 | 775,000 Sennheiser EM3731/SKM5200 | vocal mics 15,340–44,400; wireless 64,900–99,900 |
| Studio | 2,800 (pop filter) | 29,160 | 52,990 ADAM A4V | 742,512 Neumann M150 | monitors 15,900–52,990; **only 8 of ~130 items in stock** |
| Prateća oprema | 290 (batteries) | 4,400 | 33,999 Meteoro amp (clearance) | same | metronomes 6,490–9,750; stands 4,700–19,900 |

Median = middle item of the price-sorted category, so accessories pull it down.

## 4. Baked product data

See JSON at the end: 64 products, 8 per category, each seen in the Store API with `is_in_stock: true` [V]. Brand labels normalised (API says "Martin gitare", "KAWAI"). Prices drift; refresh from `https://lyrastyle.rs/wp-json/wc/store/v1/products?category=<id>&stock_status=instock`. Category IDs: Gitare 3285, Bubnjevi 3286, Klasični 3287, Klavijature 3288, Studio 3289, Ozvučenje 3390, DJ 3391, Prateća 3483 [V].

## 5. Content and brand facts

- **Blog** https://lyrastyle.rs/blog/: 30 posts [V]. Mostly Dec 2016 – Mar 2019; then one each in Dec 2022, Mar 2023, Dec 2023; latest 2026-08-06 is a ~30-word stub [V]. Topics: buying guides (guitar, violin, piano, first microphone), brand pieces (Markbass, Duesenberg, Buffet Crampon, Alhambra, Martin, B&S, Roland), Guča festival, school competitions, a guest piece by Petar Jelić (YU Grupa).
- **O nama** https://lyrastyle.rs/o-nama/: body is "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis dui ante…" [V].
- **Company** (https://lyrastyle.rs/pravne-informacije/) [V]: "Preduzeće za trgovinu i poslovne usluge Lyra Style DOO", MB 17195921, PIB 101200125. Founding year, founders, staff: not found [U].
- **History** [V]: 2014 "Otvaranje nove lokacije MERKUR trzni centar" (gallery); later moved to LUX 51 ("Nova lokacija", legacy footer), date unknown.
- **Homepage claims** [V]: H1 "Najveća ponuda muzičkih instrumenata"; "Zašto Lyra Style?" → "Služimo svim muzičarima, gde god da se nalaze na svom muzičkom putovanju.", "Najveća selekcija u Srbiji", "Stručni saveti".
- **References** https://lyrastyle.rs/reference/ (20) [V]: Steinway D-274 for Skupština Grada Beograda; Yamaha C7 for Jugokoncert; Schiedmayer celesta for Narodno pozorište/RTS; Beogradska Filharmonija; Orkestar Vojske Srbije; Ministry of Culture; AV systems for the Japanese and Chinese embassies; Slavija fountain audio; restaurants. Sponsors two awards at Guča (gallery text) [V].
- **Services** (https://lyrastyle.rs/narucivanje-dostava-i-povrat-robe/) [V]: store pickup or delivery (Post Express / Daily Express); weekday orders before 13:00 usually ship same day; 2–5 working days; Serbia only; card, cash on delivery, bank transfer; 14-day withdrawal. Free-shipping text conflicts ("200€" vs "25.000 din"). Sound-system installation shown by references. **Installments, repair, rental: not mentioned** [V absent].
- **Opening hours**: absent from the new site [V]. Google, PlanPlus and the legacy footer: Mon–Fri 10:00–19:00, Sat 10:00–15:00, Sun closed [V].
- **Phones** +381 11 212 0444, +381 63 556 001 [V]. **Email** sales@lyrastyle.rs (Cloudflare-obfuscated on new site, plain on legacy page) [V].
- **Social (homepage footer)** [V]: Facebook https://www.facebook.com/lyrastyle.rs/ (Yoast publisher: https://www.facebook.com/lyrastylebeograd/) · Instagram https://www.instagram.com/lyrastylebeograd/ · YouTube https://www.youtube.com/watch?v=P1X0Y5u6i28 (one video, not a channel) · **TikTok: none**.
- Google rating 4.8 from 1,074 reviews [V].

## 6. SEO audit

- **`noindex, nofollow` is still on every template checked** [V]: home, `/kontakt/`, `/o-nama/`, `/blog/`, `/prodavnica/`, all top-level categories checked, subcategory, product pages, brand pages, `/galerije/`, `/reference/`.
- **Legacy site still partly live** [V]: `https://lyrastyle.rs/product/sennheiser-e604` returns the old design (no noindex, old footer, "© 2026"), while `https://lyrastyle.rs/product/mapex-ar529sdw-armory-5pcs-shell-pack` returns the new site. Google results still list `/product/…`, `/category/…`, `/contact` URLs [V]. Cause (cache vs. old origin) unknown [U].
- **Canonicals inconsistent** [V]: product canonical is `/pro/<brand>/<category path>/<slug>/` while links, API and sitemap use `/proizvod/<slug>/`; brand canonical uses Cyrillic `/бренд/markbass/` while links use `/brend/`; category pages have no canonical and og:url `/kategorija-proizvoda/…`.
- Titles: "Gitare Arhive - Lyra Style", "Lyra Style Prodavnica muzičkih instrumenata - Lyra Style" [V]. Meta descriptions: absent on home, category, product [V]. hreflang: none [V].
- Structured data: **no JSON-LD** on home or product (no Product, Offer, Organization, LocalBusiness, BreadcrumbList) [V]. OpenGraph present via Yoast; product `og:type` is "article" [V].
- Headings: home has one H1; product page prints its H1 twice; icon names leak as text ("headphones") [V].
- Sitemap health [V]: includes 24 Bricks templates (`/template/header/`…), `/administration/` (login), cart/checkout/account, banner post types, numeric slugs (`/proizvod/2/`); published while every URL is noindex.
- robots.txt [V]: Cloudflare-managed block disallows 32 AI/data crawlers, `Content-Signal: search=yes, ai-train=no`; search engines otherwise allowed.
- Internal linking: ~300-link category mega-menu on every page; breadcrumbs repeat "Gitare / Gitare" (`gitare-1`) [V].
- Thin/duplicate [V]: categories and brands have no intro copy; descriptions mix a Serbian intro with English manufacturer specs; duplicate products (two "Markaudio Ergo System 2" at different prices); zero-price items marked in stock (Powell Sonaré PS-705, Bose Panaray 502A); "Nekategorizovano" in the nav.
- Leftovers [V]: O nama Lorem ipsum; `{mb_site-info_fax}` printed on `/kontakt/`.

## 7. Performance (qualitative; PageSpeed Insights API refused the request) [U unless tagged]

- Cloudflare in front [V]. Cache headers, TTFB, request count, page weight: not measurable here.
- `automatic.css` is ~402 KB uncompressed (https://lyrastyle.rs/wp-content/uploads/automatic-css/automatic.css) [V]; likely render-blocking [U].
- Homepage images: about 30 JPG, 19 WebP, 6 PNG; hero banners WebP; product og:image JPG at 1920×1920 [V].
- Heavy DOM from the mega-menu on every page [V].
- Plugin load: REST index is 1.35 MB with 30 namespaces (WooCommerce 11.1.2, Bricks, Yoast, ElasticPress, Jetpack, WS Form, Meta Box, custom `lyra-search`) [V].
- No timeouts while crawling; two image fetches and `/linkovi/` errored [V].

## 8. Visual identity

- **Logo**: https://lyrastyle.rs/wp-content/uploads/lyra_logo.png (favicon `cropped-lyra_logo-180x180.png`) [V URL]. The tool could not open images, so **no description is given** [U]. Share image: https://lyrastyle.rs/wp-content/uploads/lyra_style-page.jpg (1559×881).
- **Colours** (Automatic.css variables) [V]: primary **#e7131a** (red), secondary **#136ee7** (blue), base #ffffff, neutral #000000; framework defaults for success #29A745, warning #FFC10A, danger #DC3545, info #18a4b9.
- **Fonts** [V]: Montserrat for headings and text.
- **Photography**: manufacturer packshots; four hero banners (`01.webp`, `3.webp`, `4.webp`, `21.webp`); brand tiles fall back to `woocommerce-placeholder.webp` [V]. Own photos sit in old galleries with Facebook/Viber-export filenames, so expect low resolution [U].

### Their own photography (URLs verified; descriptions from gallery titles and filenames, images not viewed)

All under `https://lyrastyle.rs/wp-content/uploads/`. **Caution: most predate the move to LUX 51 and probably show the previous store** [U].

| File(s) | Description | Gallery |
|---|---|---|
| `11880500-990242467749674-1594997481120974336-n.jpg` | store interior | /galerija/slike-iz-radnje/ |
| `2016-05-06-15-41-22.jpg`, `2016-08-16-12-25-59.jpg`, `2017-01-19-125235.jpg` | store interior, 2016–17 | same |
| `duvaci-u-radnji.jpg`, `kontrabasi.jpg`, `zicasazicama.jpg` | winds, double basses, string wall | same |
| `walloffame_2.jpg`, `koja-svira-gitaru-1.jpg` | "wall of fame"; visitor playing guitar | same |
| `img-6638.jpg` … `img-6654.jpg` (12 files), `viber-image-2019-11-14-17-20-09.jpg` | drum department | /galerija/bubnjarska-radnja-beograd/ |
| `webbjelicaiklarineti.jpg`, `webdejanpetrovic.jpg`, `webinterviju.jpg`, `websajt1_4.jpg` (+7 more `web*.jpg`) | 2014 store opening, guests | /galerija/slike-sa-otvaranja-nove-prodavnice-lyra-style-grand-opening-of-new-store-2014/ |
| `radnja-merkur-n.jpg`, `shop-pics-0041.jpg` | store at Merkur centre | /galerija/foto-album-lyra-style/ |
| `1gucafestival.jpg`, `2017-08-13-114215.jpg` | Guča trumpet festival | Guča gallery, blog |
| `gaja.jpg` | musician with their instrument | /galerija/muizicari-sa-nasim-instrumentima/ |
| `lyrastyle-topciderac.jpg`, `ambasada-japana-lyra-style.jpg`, `fontana-lyra-style.jpg`, `yamahac7-lyra-style_2.jpg` | installation and delivery references | /reference/ |

## 9. Weaknesses and strengths

**Top 8 weaknesses**
1. Whole site is `noindex, nofollow`; the new shop is invisible to search.
2. Old site still answers on some `/product/` URLs, so two versions of the shop coexist and Google indexes the old one.
3. Canonicals contradict the real URLs (`/pro/…`, Cyrillic `/бренд/`, `/kategorija-proizvoda/…`).
4. No structured data, no meta descriptions, "Arhive" titles, duplicate H1.
5. No brand story: Lorem ipsum "O nama", no hours or address in the footer, `{mb_site-info_fax}` on Kontakt, blog effectively dormant since 2019.
6. About a third of the catalogue is not in stock (Studio: 8 of ~130); zero-price and duplicate products; one likely price error.
7. Taxonomy noise: `gitare/gitare-1`, three "Pribor i oprema", "Nekategorizovano" in nav, sitemap full of templates and login pages.
8. Own photography is old and of the previous location; brand tiles are placeholders.

**Top 5 strengths**
1. Breadth: 7,933 products, 347 brands, unusually deep orchestral range.
2. Aspirational stock is real and in stock: Gibson Custom, Martin, PRS, Kawai GX-2, Roland FR-4X.
3. Open Store API gives live prices, stock and permalinks; top-level category URLs are clean and stable.
4. Institutional proof (concert pianos to city institutions, Philharmonic, National Theatre, embassies, Guča awards); Google 4.8★ from 1,074 reviews.
5. Simple, usable identity (red #e7131a, blue #136ee7, Montserrat) and consistent name/address/phone on own site and Google.

## Baked product data (in stock, seen 2026-11-26)

```json
[
  {"cat": "Gitare", "brand": "Valencia", "name": "Valencia VC104K Klasična gitara paket", "priceRSD": 12800, "url": "https://lyrastyle.rs/proizvod/valencia-vc104k-klasicna-gitara-paket/"},
  {"cat": "Gitare", "brand": "Cort", "name": "Cort G100 OPW električna gitara", "priceRSD": 18850, "url": "https://lyrastyle.rs/proizvod/cort-g100-opw-elektricna-gitara/"},
  {"cat": "Gitare", "brand": "Epiphone", "name": "Epiphone SG Standard EB Ebony električna gitara", "priceRSD": 71000, "url": "https://lyrastyle.rs/proizvod/epiphone-sg-standard-eb-ebony-elektricna-gitara/"},
  {"cat": "Gitare", "brand": "Paul Reed Smith", "name": "PRS SE CE24 Standard Satin Vintage Cherry 2026 Električna gitara", "priceRSD": 79900, "url": "https://lyrastyle.rs/proizvod/prs-se-ce24-standard-satin-vintage-cherry-2026-elektricna-gitara/"},
  {"cat": "Gitare", "brand": "Fender", "name": "Fender Blues Junior IV kombo pojačalo", "priceRSD": 115500, "url": "https://lyrastyle.rs/proizvod/fender-blues-junior-iv-kombo-pojacalo/"},
  {"cat": "Gitare", "brand": "Markbass", "name": "Markbass CMD 103H Kombo bas pojačalo", "priceRSD": 117800, "url": "https://lyrastyle.rs/proizvod/markbass-cmd-103h-kombo-bas-pojacalo/"},
  {"cat": "Gitare", "brand": "Martin", "name": "Martin D-28 Akustična gitara", "priceRSD": 471880, "url": "https://lyrastyle.rs/proizvod/martin-d-28-akusticna-gitara/"},
  {"cat": "Gitare", "brand": "Gibson", "name": "Gibson 1959 Les Paul Standard Reissue VOS IT", "priceRSD": 799000, "url": "https://lyrastyle.rs/proizvod/gibson-1959-les-paul-standard-reissue-vos-it/"},

  {"cat": "Bubnjevi i Udaraljke", "brand": "Eastar", "name": "Eastar EDS-180BE set bubnjeva za decu", "priceRSD": 15900, "url": "https://lyrastyle.rs/proizvod/eastar-eds-180be-set-bubnjeva-za-decu/"},
  {"cat": "Bubnjevi i Udaraljke", "brand": "Donner", "name": "Donner DED 80 elektronski bubanj", "priceRSD": 33900, "url": "https://lyrastyle.rs/proizvod/donner-ded-80-elektronski-bubanj/"},
  {"cat": "Bubnjevi i Udaraljke", "brand": "Alesis", "name": "Alesis Nitro Max kit", "priceRSD": 59900, "url": "https://lyrastyle.rs/proizvod/alesis-nitro-max-kit/"},
  {"cat": "Bubnjevi i Udaraljke", "brand": "Mapex", "name": "MAPEX CM5044FTCDK COMET Set bubnjeva sa stolicom i činelama", "priceRSD": 64900, "url": "https://lyrastyle.rs/proizvod/mapex-cm5044ftcdk-comet-set-bubnjeva-sa-stolicom-i-cinelama/"},
  {"cat": "Bubnjevi i Udaraljke", "brand": "Zildjian", "name": "Zildjian A-Series City Pack", "priceRSD": 85600, "url": "https://lyrastyle.rs/proizvod/zildjian-a-series-city-pack/"},
  {"cat": "Bubnjevi i Udaraljke", "brand": "Meinl", "name": "Meinl Sonic Energy Handpan – D#, G, A#, C, D, D#, F, G", "priceRSD": 232900, "url": "https://lyrastyle.rs/proizvod/meinl-sonic-energy-handpan-d-g-a-c-d-d-f-g/"},
  {"cat": "Bubnjevi i Udaraljke", "brand": "Mapex", "name": "Mapex SE529XBOE Saturn Evolution 4 pc Shell Pack – EXOTIC AEGEAN FADE", "priceRSD": 348100, "url": "https://lyrastyle.rs/proizvod/mapex-se529xboe-saturn-evolution-4-pc-shell-pack-exotic-aegean-fade/"},
  {"cat": "Bubnjevi i Udaraljke", "brand": "Zildjian", "name": "Zildjian ZAGEX ALCHEM-E Series Gold EX set bubnjeva", "priceRSD": 885000, "url": "https://lyrastyle.rs/proizvod/zildjian-zagex-alchem-e-series-gold-ex-set-bubnjeva/"},

  {"cat": "Klavijature i Klaviri", "brand": "Medeli", "name": "Medeli MK1BK Nebula klavijatura", "priceRSD": 9000, "url": "https://lyrastyle.rs/proizvod/medeli-mk1bk-nebula-klavijatura/"},
  {"cat": "Klavijature i Klaviri", "brand": "Medeli", "name": "Medeli MK300 Millenium klavijatura", "priceRSD": 28500, "url": "https://lyrastyle.rs/proizvod/medeli-mk300-millenium-klavijatura/"},
  {"cat": "Klavijature i Klaviri", "brand": "Donner", "name": "Donner DDP 95 White digitalni klavir", "priceRSD": 59000, "url": "https://lyrastyle.rs/proizvod/donner-ddp-95-white-digitalni-klavir/"},
  {"cat": "Klavijature i Klaviri", "brand": "Korg", "name": "Korg LP380 WH/Beli digitalni klavir", "priceRSD": 99900, "url": "https://lyrastyle.rs/proizvod/korg-lp380-whbeli-digitalni-klavir/"},
  {"cat": "Klavijature i Klaviri", "brand": "Kawai", "name": "KAWAI CN 201 WH Električni Klavir", "priceRSD": 208200, "url": "https://lyrastyle.rs/proizvod/kawai-cn-201-wh-elektricni-klavir/"},
  {"cat": "Klavijature i Klaviri", "brand": "Kawai", "name": "Kawai CA 501 BK digitalni klavir", "priceRSD": 398850, "url": "https://lyrastyle.rs/proizvod/kawai-ca-501-bk-digitalni-klavir/"},
  {"cat": "Klavijature i Klaviri", "brand": "Kawai", "name": "Kawai K-200 E/P polirani crni pianino", "priceRSD": 773200, "url": "https://lyrastyle.rs/proizvod/kawai-k-200-ep-polirani-crni-pianino/"},
  {"cat": "Klavijature i Klaviri", "brand": "Kawai", "name": "Kawai GX-2 koncertni klavir", "priceRSD": 3290340, "url": "https://lyrastyle.rs/proizvod/kawai-gx-2-koncertni-klavir/"},

  {"cat": "Klasični Instrumenti", "brand": "Vhienna", "name": "Vhienna VOB 14-Basic violina sa koferom i gudalom", "priceRSD": 11000, "url": "https://lyrastyle.rs/proizvod/vhienna-vob-14-basic-violina-sa-koferom-i-gudalom/"},
  {"cat": "Klasični Instrumenti", "brand": "Gewa", "name": "Gewa Violina set 3/4 HW PS401612", "priceRSD": 19900, "url": "https://lyrastyle.rs/proizvod/gewa-violina-set-34-hw-ps401612/"},
  {"cat": "Klasični Instrumenti", "brand": "Lyra Style", "name": "Lyra TR 100 školska truba", "priceRSD": 32500, "url": "https://lyrastyle.rs/proizvod/lyra-tr-100-skolska-truba/"},
  {"cat": "Klasični Instrumenti", "brand": "Hohner", "name": "Hohner SUPER 64 Performance C usna harmonika", "priceRSD": 46800, "url": "https://lyrastyle.rs/proizvod/hohner-super-64-performance-c-usna-harmonika/"},
  {"cat": "Klasični Instrumenti", "brand": "Canorus", "name": "Canorus AS501 Alt saksofon", "priceRSD": 69900, "url": "https://lyrastyle.rs/proizvod/canorus-as501-alt-saksofon/"},
  {"cat": "Klasični Instrumenti", "brand": "Yamaha", "name": "Yamaha YAS 280 Alt Saksofon", "priceRSD": 142600, "url": "https://lyrastyle.rs/proizvod/yamaha-yas-280-alt-saksofon/"},
  {"cat": "Klasični Instrumenti", "brand": "Buffet Crampon", "name": "Buffet Crampon RC BC1114-2-0 Bb-klarinet 17", "priceRSD": 475000, "url": "https://lyrastyle.rs/proizvod/buffet-crampon-rc-bc1114-2-0-bb-klarinet-17/"},
  {"cat": "Klasični Instrumenti", "brand": "Roland", "name": "Roland FR-4X BK V-Harmonika", "priceRSD": 513300, "url": "https://lyrastyle.rs/proizvod/roland-fr-4x-bk-v-harmonika-1/"},

  {"cat": "Ozvučenje", "brand": "Topp Pro", "name": "Topp Pro MX3BT mikseta sa USB i Bluetooth funkcijom", "priceRSD": 10990, "url": "https://lyrastyle.rs/proizvod/topp-pro-mx3bt-mikseta-sa-usb-i-bluetooth-funkcijom/"},
  {"cat": "Ozvučenje", "brand": "Master Audio", "name": "Master Audio BK200A aktivni zvučnik", "priceRSD": 27250, "url": "https://lyrastyle.rs/proizvod/master-audio-bk200a-aktivni-zvucnik/"},
  {"cat": "Ozvučenje", "brand": "Topp Pro", "name": "Topp Pro XCS12A Aktivni dvosistemski zvučnik 800W", "priceRSD": 41300, "url": "https://lyrastyle.rs/proizvod/topp-pro-xcs12a-aktivni-dvosistemski-zvucnik-800w/"},
  {"cat": "Ozvučenje", "brand": "Behringer", "name": "Behringer XENYX X1622 USB pasivna mikseta", "priceRSD": 46200, "url": "https://lyrastyle.rs/proizvod/behringer-xenyx-x1622-usb-pasivna-mikseta/"},
  {"cat": "Ozvučenje", "brand": "Yamaha", "name": "Yamaha MG12XU pasivna mikseta", "priceRSD": 70900, "url": "https://lyrastyle.rs/proizvod/yamaha-mg12xu-pasivna-mikseta/"},
  {"cat": "Ozvučenje", "brand": "JBL", "name": "JBL PartyBox 710", "priceRSD": 106000, "url": "https://lyrastyle.rs/proizvod/jbl-partybox-710/"},
  {"cat": "Ozvučenje", "brand": "Master Audio", "name": "Master Audio MZ8100/NB600W – Komplet Ozvučenja", "priceRSD": 153400, "url": "https://lyrastyle.rs/proizvod/master-audio-mz8100nb600w-komplet-ozvucenja/"},
  {"cat": "Ozvučenje", "brand": "Yamaha", "name": "Yamaha Stagepas 600BT Aktivni Audio Sistem", "priceRSD": 180200, "url": "https://lyrastyle.rs/proizvod/yamaha-stagepas-600bt-aktivni-audio-sistem/"},

  {"cat": "DJ Oprema Mikrofoni Slušalice", "brand": "Shure", "name": "Shure SM58-LCE Vokalni mikrofon bez prekidača", "priceRSD": 17900, "url": "https://lyrastyle.rs/proizvod/shure-sm58-lce-vokalni-mikrofon-bez-prekidaca/"},
  {"cat": "DJ Oprema Mikrofoni Slušalice", "brand": "Shure", "name": "Shure Beta 58A Vokalni mikrofon", "priceRSD": 29000, "url": "https://lyrastyle.rs/proizvod/shure-beta-58a-vokalni-mikrofon/"},
  {"cat": "DJ Oprema Mikrofoni Slušalice", "brand": "Audio-Technica", "name": "Audio-Technica ATH-M50XBT slušalice", "priceRSD": 29500, "url": "https://lyrastyle.rs/proizvod/audio-technica-ath-m50xbt-slusalice/"},
  {"cat": "DJ Oprema Mikrofoni Slušalice", "brand": "Numark", "name": "Numark Party Mix Pro DJ kontroler sa rasvetom", "priceRSD": 29900, "url": "https://lyrastyle.rs/proizvod/numark-party-mix-pro-dj-kontroler-sa-rasvetom/"},
  {"cat": "DJ Oprema Mikrofoni Slušalice", "brand": "Shure", "name": "Shure BETA 87A kondenzatorski mikrofon", "priceRSD": 44400, "url": "https://lyrastyle.rs/proizvod/shure-beta-87a-kondenzatorski-mikrofon/"},
  {"cat": "DJ Oprema Mikrofoni Slušalice", "brand": "Sennheiser", "name": "SENNHEISER EW-D SKM-S Base Set (S1-7) Digitalni wireless sistem", "priceRSD": 85140, "url": "https://lyrastyle.rs/proizvod/sennheiser-ew-d-skm-s-base-set-s1-7-digitalni-wireless-sistem/"},
  {"cat": "DJ Oprema Mikrofoni Slušalice", "brand": "Shure", "name": "Shure GLXD24+/Beta58 bežični mikrofon sa Beta B/58 glavom", "priceRSD": 99900, "url": "https://lyrastyle.rs/proizvod/shure-glxd24beta58-bezicni-mikrofon-sa-beta-b58-glavom/"},
  {"cat": "DJ Oprema Mikrofoni Slušalice", "brand": "Audix", "name": "Audix DP7 Mikrofonski set za bubnjeve", "priceRSD": 146320, "url": "https://lyrastyle.rs/proizvod/audix-dp7-mikrofonski-set-za-bubnjeve/"},

  {"cat": "Studio", "brand": "Donner", "name": "Donner N 32 Midi klavijatura", "priceRSD": 9900, "url": "https://lyrastyle.rs/proizvod/donner-n-32-midi-klavijatura/"},
  {"cat": "Studio", "brand": "Donner", "name": "Donner EC 1345 Livejack Audio Interface 2X2", "priceRSD": 15000, "url": "https://lyrastyle.rs/proizvod/donner-ec-1345-livejack-audio-interface-2x2/"},
  {"cat": "Studio", "brand": "M-Audio", "name": "M-Audio BX4 multimedijalni monitori (par)", "priceRSD": 15900, "url": "https://lyrastyle.rs/proizvod/m-audio-bx4-multimedijalni-monitori-par/"},
  {"cat": "Studio", "brand": "IK Multimedia", "name": "IK Multimedia iRig Pro I/O audio/MIDI interfejs", "priceRSD": 20800, "url": "https://lyrastyle.rs/proizvod/ik-multimedia-irig-pro-io-audiomidi-interfejs/"},
  {"cat": "Studio", "brand": "Adam Audio", "name": "Adam Audio T7V aktivni studijski monitori", "priceRSD": 29230, "url": "https://lyrastyle.rs/proizvod/adam-audio-t7v-aktivni-studijski-monitori/"},
  {"cat": "Studio", "brand": "Yamaha", "name": "Yamaha HS7 Aktivni studijski monitor", "priceRSD": 37550, "url": "https://lyrastyle.rs/proizvod/yamaha-hs7-aktivni-studijski-monitor/"},
  {"cat": "Studio", "brand": "Yamaha", "name": "Yamaha HS8 studijski monitor", "priceRSD": 49640, "url": "https://lyrastyle.rs/proizvod/yamaha-hs8-studijski-monitor/"},
  {"cat": "Studio", "brand": "Adam Audio", "name": "ADAM A4V studijski monitor (kom)", "priceRSD": 52990, "url": "https://lyrastyle.rs/proizvod/adam-a4v-studijski-monitor-kom/"},

  {"cat": "Prateća oprema", "brand": "Alice", "name": "Alice A003AP štimer – pitch pipe", "priceRSD": 800, "url": "https://lyrastyle.rs/proizvod/alice-a003ap-stimer-pitch-pipe/"},
  {"cat": "Prateća oprema", "brand": "Korg", "name": "Korg KDM 3 Metronom", "priceRSD": 6490, "url": "https://lyrastyle.rs/proizvod/korg-kdm-3-metronom/"},
  {"cat": "Prateća oprema", "brand": "Hercules", "name": "Hercules KS110B Stalak za klavijaturu", "priceRSD": 6700, "url": "https://lyrastyle.rs/proizvod/hercules-ks110b-stalak-za-klavijaturu/"},
  {"cat": "Prateća oprema", "brand": "Wittner", "name": "Wittner Classic mehanički metronom", "priceRSD": 9750, "url": "https://lyrastyle.rs/proizvod/wittner-classic-mehanicki-metronom/"},
  {"cat": "Prateća oprema", "brand": "Hercules", "name": "Hercules BS418B Stalak za note", "priceRSD": 11500, "url": "https://lyrastyle.rs/proizvod/hercules-bs418b-stalak-za-note/"},
  {"cat": "Prateća oprema", "brand": "K&M", "name": "K&M 11927 Orkestraski pult za note", "priceRSD": 15960, "url": "https://lyrastyle.rs/proizvod/km-11927-orkestraski-pult-za-note/"},
  {"cat": "Prateća oprema", "brand": "RATstands", "name": "RATstands 69Q13 Jazz stalak za note", "priceRSD": 19900, "url": "https://lyrastyle.rs/proizvod/ratstands-69q13-jazz-stalak-za-note/"},
  {"cat": "Prateća oprema", "brand": "Lion Style", "name": "Lion Style PB7 PE klavirska stolica – crna polirana", "priceRSD": 22500, "url": "https://lyrastyle.rs/proizvod/lion-style-pb7-pe-klavirska-stolica-crna-polirana/"}
]
```
