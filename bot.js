// Load .env hanya kalau tidak diset dari luar (PM2 ecosystem)
if (!process.env.BOT_TOKEN) require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { TOTP, Secret } = require('otpauth');
const axios = require('axios');

const BOT_TOKEN    = process.env.BOT_TOKEN;
const OWNER_ID     = parseInt(process.env.OWNER_ID || '0');
const BOT_USERNAME = process.env.BOT_USERNAME  || 'yourbot';
const CHANNEL      = process.env.CHANNEL       || '@yourchannel';

if (!BOT_TOKEN) {
  console.error('ERROR: BOT_TOKEN tidak ditemukan. Isi file .env terlebih dahulu.');
  process.exit(1);
}

// ─────────────────────────────────────────
//   WEBHOOK / POLLING (auto-detect)
// ─────────────────────────────────────────
const WEBHOOK_URL  = process.env.WEBHOOK_URL  || '';
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || '3000');

console.log('  Mode          :', WEBHOOK_URL ? `webhook (${WEBHOOK_URL})` : 'polling');

let bot;
if (WEBHOOK_URL) {
  // WEBHOOK mode — respon instan, direkomendasikan di VPS
  bot = new TelegramBot(BOT_TOKEN, { webHook: { port: WEBHOOK_PORT } });
  bot.setWebHook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`)
    .then(() => console.log(`  Webhook aktif : ${WEBHOOK_URL}/bot${BOT_TOKEN}`))
    .catch(err => console.error('  Webhook error:', err.message));
} else {
  // POLLING mode — fallback jika WEBHOOK_URL tidak diset
  // Long polling — interval 0 + timeout 60 detik = respon hampir instan
  bot = new TelegramBot(BOT_TOKEN, {
    polling: {
      interval: 0,
      autoStart: true,
      params: {
        timeout: 60,
        allowed_updates: ['message', 'callback_query'],
      },
    },
  });
}

// ─────────────────────────────────────────
//   DATA ALAMAT INDONESIA (real)
// ─────────────────────────────────────────

const addresses = [
  {
    streets  : ['Jl. Sudirman No.', 'Jl. Thamrin No.', 'Jl. Gatot Subroto No.', 'Jl. Kuningan No.', 'Jl. HR Rasuna Said No.'],
    city     : 'Jakarta Selatan',
    province : 'DKI Jakarta',
    postal   : ['12190', '12920', '12930', '12940', '12950'],
    phone_prefix: '+62 812',
  },
  {
    streets  : ['Jl. Malioboro No.', 'Jl. Solo No.', 'Jl. Parangtritis No.', 'Jl. Kaliurang No.', 'Jl. Magelang No.'],
    city     : 'Yogyakarta',
    province : 'DI Yogyakarta',
    postal   : ['55213', '55221', '55231', '55241', '55251'],
    phone_prefix: '+62 821',
  },
  {
    streets  : ['Jl. Pemuda No.', 'Jl. Pandanaran No.', 'Jl. Gajah Mada No.', 'Jl. MT Haryono No.', 'Jl. Imam Bonjol No.'],
    city     : 'Semarang',
    province : 'Jawa Tengah',
    postal   : ['50132', '50133', '50134', '50135', '50136'],
    phone_prefix: '+62 817',
  },
  {
    streets  : ['Jl. Darmo No.', 'Jl. Basuki Rahmat No.', 'Jl. Gubeng No.', 'Jl. Diponegoro No.', 'Jl. Embong Malang No.'],
    city     : 'Surabaya',
    province : 'Jawa Timur',
    postal   : ['60241', '60251', '60261', '60271', '60281'],
    phone_prefix: '+62 813',
  },
  {
    streets  : ['Jl. Asia Afrika No.', 'Jl. Braga No.', 'Jl. Dago No.', 'Jl. Riau No.', 'Jl. Supratman No.'],
    city     : 'Bandung',
    province : 'Jawa Barat',
    postal   : ['40111', '40112', '40113', '40114', '40115'],
    phone_prefix: '+62 822',
  },
  {
    streets  : ['Jl. Imam Bonjol No.', 'Jl. Diponegoro No.', 'Jl. Pemuda No.', 'Jl. Sutomo No.', 'Jl. Nibung No.'],
    city     : 'Medan',
    province : 'Sumatera Utara',
    postal   : ['20151', '20152', '20153', '20154', '20155'],
    phone_prefix: '+62 811',
  },
  {
    streets  : ['Jl. Ahmad Yani No.', 'Jl. Lambung Mangkurat No.', 'Jl. Jendral Sudirman No.', 'Jl. Pangeran Samudera No.', 'Jl. Hasanuddin No.'],
    city     : 'Banjarmasin',
    province : 'Kalimantan Selatan',
    postal   : ['70111', '70112', '70113', '70114', '70115'],
    phone_prefix: '+62 851',
  },
  {
    streets  : ['Jl. Pettarani No.', 'Jl. Urip Sumoharjo No.', 'Jl. Sultan Hasanuddin No.', 'Jl. Ratulangi No.', 'Jl. Penghibur No.'],
    city     : 'Makassar',
    province : 'Sulawesi Selatan',
    postal   : ['90111', '90112', '90113', '90114', '90115'],
    phone_prefix: '+62 852',
  },
  {
    streets  : ['Jl. Diponegoro No.', 'Jl. Teuku Umar No.', 'Jl. Hayam Wuruk No.', 'Jl. Gatot Subroto No.', 'Jl. Imam Bonjol No.'],
    city     : 'Denpasar',
    province : 'Bali',
    postal   : ['80111', '80112', '80113', '80114', '80115'],
    phone_prefix: '+62 819',
  },
  {
    streets  : ['Jl. Sam Ratulangi No.', 'Jl. Ahmad Yani No.', 'Jl. Sudirman No.', 'Jl. Pierre Tendean No.', 'Jl. Walanda Maramis No.'],
    city     : 'Manado',
    province : 'Sulawesi Utara',
    postal   : ['95111', '95112', '95113', '95114', '95115'],
    phone_prefix: '+62 853',
  },
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateAddress() {
  const loc    = randItem(addresses);
  const street = randItem(loc.streets) + rand(1, 150);
  const postal = randItem(loc.postal);
  const phone  = `${loc.phone_prefix} ${rand(1000, 9999)} ${rand(1000, 9999)}`;
  const full   = `${street}, ${loc.city}, ${loc.province}, ${postal}`;
  return { street, city: loc.city, province: loc.province, phone, postal, country: 'Indonesia', full };
}

function generateAddresses(n) {
  const res = [];
  for (let i = 0; i < n; i++) res.push(generateAddress());
  return res;
}

function formatAddress(addr, i) {
  return (
    `<b>— #${i} —</b>\n` +
    `Street   : <code>${addr.street}</code>\n` +
    `City     : <code>${addr.city}</code>\n` +
    `Province : <code>${addr.province}</code>\n` +
    `Phone    : <code>${addr.phone}</code>\n` +
    `Postal   : <code>${addr.postal}</code>\n` +
    `Country  : <code>${addr.country}</code>\n` +
    `Full     : <code>${addr.full}</code>`
  );
}

// ─────────────────────────────────────────
//   WORLD ADDRESS DATA (Asia + Europe)
// ─────────────────────────────────────────

const COUNTRIES_PER_PAGE = 8;

const worldAddresses = {
  // ── ASIA ──
  ID: {
    name: 'Indonesia', country: 'Indonesia', phone_prefix: '+62 81',
    locations: [
      { streets: ['Jl. Sudirman No.','Jl. Thamrin No.','Jl. Gatot Subroto No.','Jl. Kuningan No.','Jl. HR Rasuna Said No.'], city: 'Jakarta Selatan', province: 'DKI Jakarta', postal: ['12190','12920','12930','12940','12950'] },
      { streets: ['Jl. Malioboro No.','Jl. Solo No.','Jl. Parangtritis No.','Jl. Kaliurang No.'], city: 'Yogyakarta', province: 'DI Yogyakarta', postal: ['55213','55221','55231','55241'] },
      { streets: ['Jl. Darmo No.','Jl. Basuki Rahmat No.','Jl. Gubeng No.','Jl. Diponegoro No.'], city: 'Surabaya', province: 'Jawa Timur', postal: ['60241','60251','60261','60271'] },
      { streets: ['Jl. Asia Afrika No.','Jl. Braga No.','Jl. Dago No.','Jl. Riau No.'], city: 'Bandung', province: 'Jawa Barat', postal: ['40111','40112','40113','40114'] },
      { streets: ['Jl. Imam Bonjol No.','Jl. Diponegoro No.','Jl. Sutomo No.','Jl. Nibung No.'], city: 'Medan', province: 'Sumatera Utara', postal: ['20151','20152','20153','20154'] },
      { streets: ['Jl. Pettarani No.','Jl. Sultan Hasanuddin No.','Jl. Ratulangi No.'], city: 'Makassar', province: 'Sulawesi Selatan', postal: ['90111','90112','90113'] },
      { streets: ['Jl. Diponegoro No.','Jl. Teuku Umar No.','Jl. Hayam Wuruk No.'], city: 'Denpasar', province: 'Bali', postal: ['80111','80112','80113'] },
      { streets: ['Jl. Pemuda No.','Jl. Pandanaran No.','Jl. Gajah Mada No.'], city: 'Semarang', province: 'Jawa Tengah', postal: ['50132','50133','50134'] },
      { streets: ['Jl. Sam Ratulangi No.','Jl. Ahmad Yani No.','Jl. Sudirman No.'], city: 'Manado', province: 'Sulawesi Utara', postal: ['95111','95112','95113'] },
      { streets: ['Jl. Ahmad Yani No.','Jl. Lambung Mangkurat No.','Jl. Hasanuddin No.'], city: 'Banjarmasin', province: 'Kalimantan Selatan', postal: ['70111','70112','70113'] },
    ],
  },

  JP: {
    name: 'Japan', country: 'Japan', phone_prefix: '+81 90',
    locations: [
      { streets: ['1-1 Marunouchi','2-3 Otemachi','1-6-1 Chiyoda','3-1 Uchisaiwaicho','1-2 Hibiya'], city: 'Chiyoda-ku', province: 'Tokyo', postal: ['100-0005','100-0004','100-0001','100-0011','100-0012'] },
      { streets: ['2-1 Nishishinjuku','1-26-1 Kabukicho','1-1 Shinjuku','3-38-1 Shinjuku'], city: 'Shinjuku-ku', province: 'Tokyo', postal: ['160-0023','160-0021','160-0022','160-0022'] },
      { streets: ['1-2-3 Shibuya','2-1 Dogenzaka','1-21-1 Jinnan','3-1 Udagawacho'], city: 'Shibuya-ku', province: 'Tokyo', postal: ['150-0002','150-0043','150-0041','150-0042'] },
      { streets: ['1-2-1 Kita-Shinagawa','2-1 Higashi-Shinagawa','4-1 Konan'], city: 'Shinagawa-ku', province: 'Tokyo', postal: ['140-0001','140-0002','108-0075'] },
      { streets: ['3-1-1 Umeda','1-8-16 Umeda','1-1-3 Dojimahama'], city: 'Kita-ku', province: 'Osaka', postal: ['530-0001','530-0001','530-0004'] },
      { streets: ['1-5-1 Namba','1-1 Dotombori','2-2-22 Shinsaibashisuji'], city: 'Chuo-ku', province: 'Osaka', postal: ['542-0076','542-0071','542-0085'] },
      { streets: ['35 Higashisugita-cho','45 Kamanza-cho','1-1 Karasuma'], city: 'Shimogyo-ku', province: 'Kyoto', postal: ['600-8411','604-8091','600-8216'] },
      { streets: ['1-1-25 Sakae','3-15-31 Nishiki','2-1-1 Marunouchi'], city: 'Naka-ku', province: 'Aichi', postal: ['460-0008','460-0003','460-0002'] },
      { streets: ['1-1 Chuo','2-3 Minami-cho','3-1 Shinmachi'], city: 'Hakata-ku', province: 'Fukuoka', postal: ['812-0011','812-0013','812-0016'] },
      { streets: ['2-1 Odori Higashi','1-1 Kita 1 Jo Higashi','3-1 Sapporo Ekimae'], city: 'Chuo-ku', province: 'Hokkaido', postal: ['060-0001','060-0001','060-0005'] },
    ],
  },
  KR: {
    name: 'South Korea', country: 'South Korea', phone_prefix: '+82 10',
    locations: [
      { streets: ['Teheran-ro 152','Gangnam-daero 396','Dosan-daero 45','Nonhyeon-ro 123'], city: 'Gangnam-gu', province: 'Seoul', postal: ['06236','06241','06035','06120'] },
      { streets: ['Sejongno 1-gil','Jong-ro 1-gil','Cheonggyecheon-ro 30','Eulji-ro 10'], city: 'Jongno-gu', province: 'Seoul', postal: ['03150','03159','03181','04523'] },
      { streets: ['Hongdae-gil 22','Yanghwa-ro 160','World Cup buk-ro 396'], city: 'Mapo-gu', province: 'Seoul', postal: ['04066','04002','03925'] },
      { streets: ['Yeoksam-ro 165','Seolleung-ro 508','Bongeunsa-ro 114'], city: 'Seocho-gu', province: 'Seoul', postal: ['06528','06608','06097'] },
      { streets: ['Haeundae-ro 875','Marine City 1-ro 1','Centum 4-ro 7'], city: 'Haeundae-gu', province: 'Busan', postal: ['48094','48116','48059'] },
      { streets: ['Bupyeong-daero 21','Gyeongin-ro 2','Incheon-daero 10'], city: 'Bupyeong-gu', province: 'Incheon', postal: ['21365','21378','22151'] },
      { streets: ['Dongdaegu-ro 550','Gongdan-ro 330','Suseong-ro 76-gil 10'], city: 'Dong-gu', province: 'Daegu', postal: ['41060','41503','42001'] },
      { streets: ['Dunsan-ro 100','Dunsan-daero 482','Gapcheon-ro 477'], city: 'Seo-gu', province: 'Daejeon', postal: ['35208','35220','35270'] },
      { streets: ['Buk-ro 100','Dongmun-daero 24','Jeonju-ro 660'], city: 'Wansan-gu', province: 'Jeonbuk', postal: ['54999','55000','55060'] },
      { streets: ['Gwanggyo-ro 145','Ingye-ro 178','Paldal-ro 14'], city: 'Paldal-gu', province: 'Gyeonggi', postal: ['16488','16468','16472'] },
    ],
  },
  SG: {
    name: 'Singapore', country: 'Singapore', phone_prefix: '+65 8',
    locations: [
      { streets: ['1 Raffles Place','2 Shenton Way','10 Marina Boulevard','8 Marina View'], city: 'Downtown Core', province: 'Central Region', postal: ['048616','068809','018981','018960'] },
      { streets: ['313 Orchard Road','238 Orchard Road','176 Orchard Road','290 Orchard Road'], city: 'Orchard', province: 'Central Region', postal: ['238895','238905','238868','238852'] },
      { streets: ['3 Temasek Boulevard','9 Raffles Boulevard','6 Raffles Boulevard'], city: 'Marina Bay', province: 'Central Region', postal: ['038983','039596','039594'] },
      { streets: ['14 Scotts Road','1 Scotts Road','25 Scotts Road'], city: 'Newton', province: 'Central Region', postal: ['228213','228208','228220'] },
      { streets: ['1 Jurong West Central 2','10 Jurong Gateway Road','50 Jurong Gateway Road'], city: 'Jurong East', province: 'West Region', postal: ['648886','608549','608549'] },
      { streets: ['10 Woodlands Square','1 Woodlands Drive 50','30 Woodlands Avenue 2'], city: 'Woodlands', province: 'North Region', postal: ['737715','738500','738343'] },
      { streets: ['1 Tampines Walk','11 Tampines Concourse','5 Tampines Central 6'], city: 'Tampines', province: 'East Region', postal: ['528523','528575','529483'] },
      { streets: ['50 Bishan Street 13','5 Bishan Place','9 Sin Ming Road'], city: 'Bishan', province: 'Central Region', postal: ['579799','579787','575581'] },
      { streets: ['83 Punggol Central','1 Punggol Drive','4 Punggol Walk'], city: 'Punggol', province: 'North-East Region', postal: ['828761','828647','828656'] },
      { streets: ['1 HarbourFront Walk','3 HarbourFront Place','2 HarbourFront Avenue'], city: 'Harbourfront', province: 'Central Region', postal: ['098585','099254','098632'] },
    ],
  },
  MY: {
    name: 'Malaysia', country: 'Malaysia', phone_prefix: '+60 11',
    locations: [
      { streets: ['Jalan Ampang 165','Jalan Bukit Bintang 100','Jalan Imbi 15','Jalan Sultan Ismail 38'], city: 'Kuala Lumpur', province: 'Wilayah Persekutuan', postal: ['50450','55100','55100','50250'] },
      { streets: ['Jalan Raja Chulan 3','Jalan P. Ramlee 25','Jalan Masjid India 44'], city: 'Kuala Lumpur City Centre', province: 'Wilayah Persekutuan', postal: ['50200','50350','50100'] },
      { streets: ['Jalan SS 2/72','Jalan SS 2/24','Jalan SS 6/1','Jalan Kemajuan'], city: 'Petaling Jaya', province: 'Selangor', postal: ['47300','47300','47301','46200'] },
      { streets: ['Jalan Kerinchi 1','Jalan Bangsar 59','Jalan Maarof 12'], city: 'Bangsar', province: 'Wilayah Persekutuan', postal: ['59200','59000','59100'] },
      { streets: ['Lebuh Pasar Besar 2','Jalan Tuanku Abdul Halim','Jalan Syed Putra 3'], city: 'Georgetown', province: 'Pulau Pinang', postal: ['10000','10050','10100'] },
      { streets: ['Jalan Datuk Keramat 5','Jalan Macalister 30','Jalan Burma 15'], city: 'Georgetown', province: 'Pulau Pinang', postal: ['10150','10050','10350'] },
      { streets: ['Jalan Tun Abdul Razak 2','Jalan Larkin 5','Jalan Skudai 10'], city: 'Johor Bahru', province: 'Johor', postal: ['80300','80350','80200'] },
      { streets: ['Jalan Putra 1','Jalan KLCC 3','Persiaran KLCC 2'], city: 'KLCC', province: 'Wilayah Persekutuan', postal: ['50088','50450','50450'] },
      { streets: ['Jalan Alan Butler 5','Jalan Istana 10','Jalan Masjid Abidin 3'], city: 'Kuala Terengganu', province: 'Terengganu', postal: ['20000','20100','20200'] },
      { streets: ['Jalan Tun Hussein Onn 1','Jalan Semantan 3','Jalan Damansara 12'], city: 'Damansara', province: 'Selangor', postal: ['47400','47300','50490'] },
    ],
  },

  TH: {
    name: 'Thailand', country: 'Thailand', phone_prefix: '+66 8',
    locations: [
      { streets: ['Sukhumvit Rd 21','Silom Rd 10','Sathorn Rd 1 North','Ratchadamri Rd 2'], city: 'Bangkok', province: 'Bangkok', postal: ['10110','10500','10120','10330'] },
      { streets: ['Khao San Rd 33','Phra Arthit Rd 5','Chakraphong Rd 68'], city: 'Phra Nakhon', province: 'Bangkok', postal: ['10200','10200','10200'] },
      { streets: ['Charoen Nakhon Rd 1A','Charoen Krung Rd 1432','New Rd 1048'], city: 'Thon Buri', province: 'Bangkok', postal: ['10600','10500','10500'] },
      { streets: ['Pattaya Beach Rd 182','Pattaya 2nd Rd 216','Walking Street 78'], city: 'Pattaya', province: 'Chonburi', postal: ['20150','20150','20150'] },
      { streets: ['Nimmanhemin Rd 1','Wualai Rd 18','Huay Kaew Rd 329'], city: 'Chiang Mai', province: 'Chiang Mai', postal: ['50200','50100','50300'] },
      { streets: ['Karon Rd 503','Patong Rd 162','Bangla Rd 15'], city: 'Phuket', province: 'Phuket', postal: ['83150','83150','83150'] },
      { streets: ['Phahon Yothin Rd 44','Vibhavadi Rangsit Rd 51','Chatuchak Rd 60'], city: 'Chatuchak', province: 'Bangkok', postal: ['10900','10900','10900'] },
      { streets: ['Ratchaprasong Rd 3','Ploenchit Rd 2','Wireless Rd 14'], city: 'Pathum Wan', province: 'Bangkok', postal: ['10330','10330','10330'] },
      { streets: ['Na Mueang Rd 5','Si Suriyawong Rd 7','Surin Rd 12'], city: 'Buriram', province: 'Buriram', postal: ['31000','31000','31000'] },
      { streets: ['Phatthalung Rd 8','Luang Pho Tuad Rd 3','Khlong Hae Rd 10'], city: 'Hat Yai', province: 'Songkhla', postal: ['90110','90110','90250'] },
    ],
  },
  VN: {
    name: 'Vietnam', country: 'Vietnam', phone_prefix: '+84 90',
    locations: [
      { streets: ['1 Ba Trieu','25 Trang Tien','3 Dinh Tien Hoang','10 Le Thai To'], city: 'Hoan Kiem', province: 'Hanoi', postal: ['100000','100000','100000','100000'] },
      { streets: ['50 Nguyen Du','12 Le Duan','8 Tran Hung Dao'], city: 'Hai Ba Trung', province: 'Hanoi', postal: ['100000','100000','100000'] },
      { streets: ['1 Nguyen Hue','23 Dong Khoi','135 Nam Ky Khoi Nghia','17 Le Loi'], city: 'District 1', province: 'Ho Chi Minh City', postal: ['700000','700000','700000','700000'] },
      { streets: ['244 Dien Bien Phu','60 Hoang Dieu','7 Tran Phu'], city: 'District 3', province: 'Ho Chi Minh City', postal: ['700000','700000','700000'] },
      { streets: ['28 Tran Phu','4 Hung Vuong','15 Nguyen Van Troi'], city: 'Hai Chau', province: 'Da Nang', postal: ['550000','550000','550000'] },
      { streets: ['1 Vo Nguyen Giap','Duong Bien 5','3 Nguyen Tat Thanh'], city: 'Son Tra', province: 'Da Nang', postal: ['550000','550000','550000'] },
      { streets: ['10 Tran Phu','Phan Chu Trinh 20','Le Loi 5'], city: 'Hoi An', province: 'Quang Nam', postal: ['560000','560000','560000'] },
      { streets: ['10 Hung Vuong','3 Ly Thai To','7 Pham Hung'], city: 'Nha Trang', province: 'Khanh Hoa', postal: ['650000','650000','650000'] },
      { streets: ['3 Nguyen Van Linh','22 Dien Bien Phu','5 Tran Hung Dao'], city: 'Ngu Hanh Son', province: 'Da Nang', postal: ['550000','550000','550000'] },
      { streets: ['12 Hai Ba Trung','4 Tran Quoc Toan','9 Phan Dinh Phung'], city: 'Dong Da', province: 'Hanoi', postal: ['100000','100000','100000'] },
    ],
  },
  PH: {
    name: 'Philippines', country: 'Philippines', phone_prefix: '+63 91',
    locations: [
      { streets: ['Ayala Avenue 6750','Makati Avenue 139','Paseo de Roxas 8767','Valero St 139'], city: 'Makati', province: 'Metro Manila', postal: ['1226','1227','1226','1227'] },
      { streets: ['BGC High Street 5th Ave','Bonifacio High Street','26th St 5th Ave','32nd St 1'], city: 'Bonifacio Global City', province: 'Metro Manila', postal: ['1634','1634','1634','1634'] },
      { streets: ['Roxas Boulevard 1000','Pedro Gil St 5','Ermita St 2'], city: 'Ermita', province: 'Metro Manila', postal: ['1000','1000','1000'] },
      { streets: ['EDSA 187','Shaw Boulevard 100','Pioneer St 5'], city: 'Mandaluyong', province: 'Metro Manila', postal: ['1550','1552','1550'] },
      { streets: ['Quezon Avenue 100','Timog Avenue 20','Roosevelt Avenue 10'], city: 'Quezon City', province: 'Metro Manila', postal: ['1103','1103','1105'] },
      { streets: ['Session Road 25','Burnham Park Rd 1','Governor Pack Rd 48'], city: 'Baguio', province: 'Benguet', postal: ['2600','2600','2600'] },
      { streets: ['Colon Street 100','Osmena Boulevard 50','Jones Avenue 30'], city: 'Cebu City', province: 'Cebu', postal: ['6000','6000','6000'] },
      { streets: ['San Pedro St 1','Anda St 5','Real St 10'], city: 'Davao City', province: 'Davao del Sur', postal: ['8000','8000','8000'] },
      { streets: ['Airport Road 1','Boracay Station 1','Main Road Station 2'], city: 'Malay', province: 'Aklan', postal: ['5608','5608','5608'] },
      { streets: ['National Hwy 1','Lacson St 50','Lizares Ave 20'], city: 'Bacolod', province: 'Negros Occidental', postal: ['6100','6100','6100'] },
    ],
  },

  CN: {
    name: 'China', country: 'China', phone_prefix: '+86 138',
    locations: [
      { streets: ['Wangfujing St 255','Changan Ave 1','Jianguomennei Ave 2'], city: 'Dongcheng', province: 'Beijing', postal: ['100006','100005','100005'] },
      { streets: ['Nanjing Rd East 800','Nanjing Rd West 1266','Huaihai Rd Middle 796'], city: 'Huangpu', province: 'Shanghai', postal: ['200001','200040','200020'] },
      { streets: ['Lujiazui Ring Rd 1088','Dongfang Rd 1600','Century Ave 100'], city: 'Pudong', province: 'Shanghai', postal: ['200120','200122','200120'] },
      { streets: ['Zhongshan 4th Rd 1','Beijing Rd 555','Tianhe Rd 228'], city: 'Tianhe', province: 'Guangdong', postal: ['510620','510030','510620'] },
      { streets: ['Chunxi Rd 88','Renmin South Rd 1','Hongxing Rd 4th Section 28'], city: 'Jinjiang', province: 'Sichuan', postal: ['610015','610016','610021'] },
      { streets: ['Jiefang Rd 209','Jiankang Rd 1','Xinmin Ave 1'], city: 'Jianghan', province: 'Hubei', postal: ['430022','430022','430023'] },
      { streets: ['Zhongshan Rd 112','Jiujiang Rd 45','Hankou Rd 200'], city: 'Xuanwu', province: 'Jiangsu', postal: ['210018','210005','210008'] },
      { streets: ['Hongqiao Rd 2199','Zhongshan Rd West 1800','Yanan Rd West 1515'], city: 'Changning', province: 'Shanghai', postal: ['200336','200051','200040'] },
      { streets: ['Gongnong Rd 100','Zhonghua Ave 500','Longhua St 168'], city: 'Longhua', province: 'Guangdong', postal: ['518109','518109','518109'] },
      { streets: ['Jiuzhao Hutong 5','Diansanmen W St 69','Xinjiekou S St 1'], city: 'Xicheng', province: 'Beijing', postal: ['100035','100009','100035'] },
    ],
  },
  TW: {
    name: 'Taiwan', country: 'Taiwan', phone_prefix: '+886 9',
    locations: [
      { streets: ['Zhongxiao E Rd Sec 4 201','Xinyi Rd Sec 5 7','Songren Rd 68','Keelung Rd Sec 1 1'], city: 'Xinyi Dist', province: 'Taipei City', postal: ['110','110','110','110'] },
      { streets: ['Zhongshan N Rd Sec 2 45','Minsheng E Rd Sec 3 123','Nanjing E Rd Sec 3 88'], city: 'Zhongshan Dist', province: 'Taipei City', postal: ['104','105','104'] },
      { streets: ['Hankou St Sec 1 100','Bade Rd Sec 1 10','Zhonghua Rd Sec 1 36'], city: 'Zhongzheng Dist', province: 'Taipei City', postal: ['100','100','100'] },
      { streets: ['Fuxing S Rd Sec 1 222','Dunhua S Rd Sec 1 177','Renai Rd Sec 4 366'], city: "Da'an Dist", province: 'Taipei City', postal: ['106','106','106'] },
      { streets: ['Sanmin Rd 2 301','Zhongzheng Rd 1','Minquan Rd 258'], city: 'Sanmin Dist', province: 'Kaohsiung City', postal: ['807','800','807'] },
      { streets: ['Gongyuan Rd 100','Zhongshan Rd 50','Zhongzheng 2nd Rd 12'], city: 'Lingya Dist', province: 'Kaohsiung City', postal: ['802','800','802'] },
      { streets: ['Chenggong Rd 100','Renai Rd 22','Zhongzheng Rd 45'], city: 'East Dist', province: 'Tainan City', postal: ['701','700','700'] },
      { streets: ['Zhongyuan Rd 112','Nanjing Rd 200','Minsheng Rd 50'], city: 'Zhongli Dist', province: 'Taoyuan City', postal: ['320','320','320'] },
      { streets: ['Zhongqing Rd 45','Fuxing Rd 88','Zhongzheng Rd 120'], city: 'Xitun Dist', province: 'Taichung City', postal: ['407','407','407'] },
      { streets: ['Wenhua 1st Rd 123','Boai 2nd Rd 88','Minghua Rd 55'], city: 'Zuoying Dist', province: 'Kaohsiung City', postal: ['813','813','813'] },
    ],
  },
  HK: {
    name: 'Hong Kong', country: 'Hong Kong', phone_prefix: '+852 5',
    locations: [
      { streets: ['1 Harbour Rd','30 Canton Rd','5 Star Ferry Concourse'], city: 'Wan Chai', province: 'Hong Kong Island', postal: ['999077','999077','999077'] },
      { streets: ['1 Austin Rd West','Canton Rd 3','Harbour City 27 Canton Rd'], city: 'Tsim Sha Tsui', province: 'Kowloon', postal: ['999077','999077','999077'] },
      { streets: ['1 Sham Mong Rd','Argyle St 8','Mong Kok Rd 55'], city: 'Mong Kok', province: 'Kowloon', postal: ['999077','999077','999077'] },
      { streets: ['1 Queensway','12 Admiralty Dr','Pacific Place 88 Queensway'], city: 'Admiralty', province: 'Hong Kong Island', postal: ['999077','999077','999077'] },
      { streets: ['100 Queens Rd Central','2 Chater Rd','Exchange Square 8 Connaught'], city: 'Central', province: 'Hong Kong Island', postal: ['999077','999077','999077'] },
      { streets: ['1 Expo Drive','1 Convention Ave','Convention Pl 1'], city: 'Wan Chai', province: 'Hong Kong Island', postal: ['999077','999077','999077'] },
      { streets: ['MegaBox 38 Wang Chiu Rd','APM 418 Kwun Tong Rd','1 Millennium City Kwun Tong'], city: 'Kwun Tong', province: 'Kowloon', postal: ['999077','999077','999077'] },
      { streets: ['1 Tung Chung Expwy','Citygate 20 Tat Tung Rd','AsiaWorld-Expo 1 Expo Dr'], city: 'Tung Chung', province: 'Lantau Island', postal: ['999077','999077','999077'] },
      { streets: ['18 Luard Rd','45 Johnston Rd','1 Star St'], city: 'Wan Chai', province: 'Hong Kong Island', postal: ['999077','999077','999077'] },
      { streets: ['East Point Rd 10','Causeway Bay Plaza 2','Times Square 1 Matheson St'], city: 'Causeway Bay', province: 'Hong Kong Island', postal: ['999077','999077','999077'] },
    ],
  },
  IN: {
    name: 'India', country: 'India', phone_prefix: '+91 98',
    locations: [
      { streets: ['MG Road 1','Brigade Road 10','Residency Road 5','Commercial St 50'], city: 'Bangalore', province: 'Karnataka', postal: ['560001','560025','560025','560001'] },
      { streets: ['Connaught Place 1','Janpath 3','India Gate Rd 1','Lodhi Rd 1'], city: 'New Delhi', province: 'Delhi', postal: ['110001','110001','110003','110003'] },
      { streets: ['Marine Drive 100','Nariman Point 1','Bandra Kurla Complex 1','Linking Road 89'], city: 'Mumbai', province: 'Maharashtra', postal: ['400002','400021','400051','400050'] },
      { streets: ['Park Street 10','Camac Street 35','Chowringhee Rd 22','Esplanade 1'], city: 'Kolkata', province: 'West Bengal', postal: ['700016','700016','700013','700001'] },
      { streets: ['Anna Salai 100','Nungambakkam High Rd 90','Greams Rd 10','Cathedral Rd 5'], city: 'Chennai', province: 'Tamil Nadu', postal: ['600002','600034','600006','600086'] },
      { streets: ['Banjara Hills Rd 1','Jubilee Hills Rd 36','Film Nagar 1','Hitech City Rd 10'], city: 'Hyderabad', province: 'Telangana', postal: ['500034','500033','500033','500081'] },
      { streets: ['Civil Lines 1','Hazratganj 5','MG Marg 20','Janpath 10'], city: 'Lucknow', province: 'Uttar Pradesh', postal: ['226001','226001','226001','226001'] },
      { streets: ['Aundh Rd 1','FC Road 100','Koregaon Park 5','MG Road 10'], city: 'Pune', province: 'Maharashtra', postal: ['411001','411004','411001','411001'] },
      { streets: ['Sarkhej Rd 1','CG Road 100','Ashram Road 80','Law Garden Rd 5'], city: 'Ahmedabad', province: 'Gujarat', postal: ['380015','380009','380009','380006'] },
      { streets: ['Sector 17 Plaza 1','Madhya Marg 10','Sector 8 C 5','Sector 35 B 3'], city: 'Chandigarh', province: 'Chandigarh', postal: ['160017','160001','160018','160022'] },
    ],
  },

  AE: {
    name: 'UAE', country: 'United Arab Emirates', phone_prefix: '+971 5',
    locations: [
      { streets: ['Sheikh Zayed Rd 1','Downtown Dubai Mohammed Bin Rashid Blvd 1','Business Bay 123'], city: 'Dubai', province: 'Dubai', postal: ['00000','00000','00000'] },
      { streets: ['Marina Walk 5','JBR The Walk 1','Jumeirah Beach Rd 1'], city: 'Dubai Marina', province: 'Dubai', postal: ['00000','00000','00000'] },
      { streets: ['Corniche Rd 1','Hamdan St 2','Khalidiyah St 10'], city: 'Abu Dhabi', province: 'Abu Dhabi', postal: ['00000','00000','00000'] },
      { streets: ['Al Reem Island 1','Saadiyat Island 1','Yas Island Blvd 1'], city: 'Abu Dhabi', province: 'Abu Dhabi', postal: ['00000','00000','00000'] },
      { streets: ['Deira Clocktower Rd 1','Al Rigga Rd 5','Salah Al Din Rd 10'], city: 'Deira', province: 'Dubai', postal: ['00000','00000','00000'] },
      { streets: ['Old Dubai Creek Rd 1','Al Fahidi St 3','Al Seef Rd 2'], city: 'Bur Dubai', province: 'Dubai', postal: ['00000','00000','00000'] },
      { streets: ['King Faisal Rd 10','Al Nakheel Rd 5','Corniche Rd 15'], city: 'Sharjah', province: 'Sharjah', postal: ['00000','00000','00000'] },
      { streets: ['Rashid Bin Saeed Al Maktoum St 1','Al Nasr Rd 10','Al Bustan St 5'], city: 'Ajman', province: 'Ajman', postal: ['00000','00000','00000'] },
      { streets: ['Al Masar St 1','Al Qusais Industrial Area 3','Al Nahda Rd 20'], city: 'Al Qusais', province: 'Dubai', postal: ['00000','00000','00000'] },
      { streets: ['DIFC Gate Village 1','Al Mustaqbal St 1','Financial Centre Rd 1'], city: 'DIFC', province: 'Dubai', postal: ['00000','00000','00000'] },
    ],
  },
  SA: {
    name: 'Saudi Arabia', country: 'Saudi Arabia', phone_prefix: '+966 5',
    locations: [
      { streets: ['King Fahd Rd 1','Olaya St 3','Tahlia St 5','King Abdullah Rd 2'], city: 'Riyadh', province: 'Riyadh Region', postal: ['11564','11564','11564','11411'] },
      { streets: ['Tahlia St 10','Palestine St 20','Madinah Rd 15'], city: 'Jeddah', province: 'Makkah Region', postal: ['21411','21452','21411'] },
      { streets: ['Al Masjid Al Haram St 1','Ibrahim Al Khalil St 2','King Abdul Aziz Rd 5'], city: 'Mecca', province: 'Makkah Region', postal: ['24231','24231','24231'] },
      { streets: ['King Faisal Rd 10','Quba Rd 5','Al Madinah Al Munawwarah Rd 1'], city: 'Medina', province: 'Medina Region', postal: ['42311','42311','42311'] },
      { streets: ['King Fahd Rd 50','Prince Sultan Rd 10','Airport Rd 1'], city: 'Dammam', province: 'Eastern Province', postal: ['31411','31411','31411'] },
      { streets: ['King Abdullah Economic City Blvd 1','Al Khobar Rd 5','Al Rashid Mall Rd 1'], city: 'Al Khobar', province: 'Eastern Province', postal: ['31952','31952','31952'] },
      { streets: ['Khobar-Jubail Hwy 1','2nd Industrial City 5','SABIC Ave 1'], city: 'Jubail', province: 'Eastern Province', postal: ['31951','31951','31951'] },
      { streets: ['Abha-Khamis Rd 1','Al Nuzha Rd 5','King Khalid Airport Rd 1'], city: 'Abha', province: 'Asir Region', postal: ['62523','62523','62523'] },
      { streets: ['King Khalid St 20','Haramain Expressway 1','Al Balad Old Town 3'], city: 'Jeddah', province: 'Makkah Region', postal: ['21411','21411','21441'] },
      { streets: ['Salama St 5','Al Wurud St 3','Ash Sharafiyah St 10'], city: 'Riyadh', province: 'Riyadh Region', postal: ['11564','11564','11565'] },
    ],
  },
  QA: {
    name: 'Qatar', country: 'Qatar', phone_prefix: '+974 3',
    locations: [
      { streets: ['Corniche St 1','West Bay Al Corniche 10','Al Dafna St 5'], city: 'Doha', province: 'Ad Dawhah', postal: ['00000','00000','00000'] },
      { streets: ['Grand Hamad Ave 1','Al Sadd Rd 10','C-Ring Rd 5'], city: 'Doha', province: 'Ad Dawhah', postal: ['00000','00000','00000'] },
      { streets: ['Lusail Marina Blvd 1','Lusail City 5','Fox Hills Rd 3'], city: 'Lusail', province: 'Al Khor', postal: ['00000','00000','00000'] },
      { streets: ['The Pearl Qatar 1','Porto Arabia 5','Medina Centrale 3'], city: 'The Pearl', province: 'Ad Dawhah', postal: ['00000','00000','00000'] },
      { streets: ['Qatar Foundation Rd 1','Education City 5','Research Complex 1'], city: 'Al Rayyan', province: 'Al Rayyan', postal: ['00000','00000','00000'] },
      { streets: ['Al Waab St 1','D-Ring Rd 5','Salwa Rd 10'], city: 'Al Waab', province: 'Ad Dawhah', postal: ['00000','00000','00000'] },
      { streets: ['Hamad International Airport Rd 1','Airport Rd 1','New Doha Intl Airport 1'], city: 'Al Rayyan', province: 'Al Rayyan', postal: ['00000','00000','00000'] },
      { streets: ['Al Khor St 1','Industrial Area St 30','Al Khor Corniche 5'], city: 'Al Khor', province: 'Al Khor', postal: ['00000','00000','00000'] },
      { streets: ['Khalifa International Stadium Rd 1','Aspire Zone 1','Al Waab City 5'], city: 'Aspire Zone', province: 'Ad Dawhah', postal: ['00000','00000','00000'] },
      { streets: ['Msheireb Downtown 1','Heritage House Rd 5','Souq Waqif 10'], city: 'Msheireb', province: 'Ad Dawhah', postal: ['00000','00000','00000'] },
    ],
  },
  TR: {
    name: 'Turkey', country: 'Turkey', phone_prefix: '+90 53',
    locations: [
      { streets: ['Istiklal Caddesi 100','Cumhuriyet Caddesi 10','Buyukdere Caddesi 201'], city: 'Beyoglu', province: 'Istanbul', postal: ['34430','34367','34394'] },
      { streets: ['Bagdat Caddesi 303','Bagdat Cad 100','Suadiye 5'], city: 'Kadikoy', province: 'Istanbul', postal: ['34728','34728','34740'] },
      { streets: ['Ataturk Blvd 1','Kizilay Sq 5','Tunali Hilmi Cad 50'], city: 'Cankaya', province: 'Ankara', postal: ['06420','06420','06700'] },
      { streets: ['Kordon Caddesi 1','Alsancak Kibris Sehitleri Cad 102','Cumhuriyet Blv 10'], city: 'Konak', province: 'Izmir', postal: ['35250','35220','35220'] },
      { streets: ['Kaleiçi Ataturk Cad 1','Konyaalti Plaji 5','Lara Yolu 20'], city: 'Muratpasa', province: 'Antalya', postal: ['07040','07050','07110'] },
      { streets: ['Bursa Merinos Park Cad 1','Ataturk Cad 100','Cekirge Cad 5'], city: 'Osmangazi', province: 'Bursa', postal: ['16010','16010','16070'] },
      { streets: ['Trabzon Uzun Sokak 1','Meydan Parki Cad 5','Iskele Cad 10'], city: 'Ortahisar', province: 'Trabzon', postal: ['61100','61100','61100'] },
      { streets: ['Tarihi Carsi 1','Kapali Carsi 5','Bedesten 10'], city: 'Fatih', province: 'Istanbul', postal: ['34126','34126','34126'] },
      { streets: ['Bagcilar Merkez 1','Goztepe Cad 5','Sanayi Cad 10'], city: 'Bagcilar', province: 'Istanbul', postal: ['34200','34200','34200'] },
      { streets: ['Maslak Buyukdere Cad 255','Sariyer Buyukdere Cad 1','Levent Nisbetiye Cad 5'], city: 'Sariyer', province: 'Istanbul', postal: ['34485','34450','34330'] },
    ],
  },

  // ── EUROPE ──
  GB: {
    name: 'UK', country: 'United Kingdom', phone_prefix: '+44 79',
    locations: [
      { streets: ['10 Downing Street','1 Parliament Square','50 Whitehall','Buckingham Palace Rd 5'], city: 'Westminster', province: 'London', postal: ['SW1A 2AA','SW1P 3BD','SW1A 2AT','SW1W 0QH'] },
      { streets: ['221B Baker Street','100 Oxford Street','55 Regent Street','15 Bond Street'], city: 'Marylebone', province: 'London', postal: ['NW1 6XE','W1C 1AA','W1B 5TR','W1S 4BS'] },
      { streets: ['1 Canada Square','30 South Colonnade','10 Upper Bank Street'], city: 'Canary Wharf', province: 'London', postal: ['E14 5AB','E14 5NS','E14 5NP'] },
      { streets: ['1 Princes Street','20 Lothian Road','30 Princes St'], city: 'Edinburgh', province: 'Scotland', postal: ['EH2 2ER','EH1 2DJ','EH2 2ER'] },
      { streets: ['1 Deansgate','35 King Street','100 Piccadilly'], city: 'Manchester', province: 'Greater Manchester', postal: ['M3 1AR','M2 4WG','M1 2DB'] },
      { streets: ['20 Broad Street','1 Victoria Square','100 Colmore Row'], city: 'Birmingham', province: 'West Midlands', postal: ['B1 2HF','B1 1BD','B3 3AG'] },
      { streets: ['1 The Square','10 Park Row','30 New Bridge Street'], city: 'Bristol', province: 'Bristol', postal: ['BS1 6HR','BS1 5BJ','BS1 2AA'] },
      { streets: ['1 City Square','100 Wellington Street','50 Park Lane'], city: 'Leeds', province: 'West Yorkshire', postal: ['LS1 1BA','LS1 1BB','LS3 1AA'] },
      { streets: ['1 Castle Street','10 St Davids Way','30 Queen Street'], city: 'Cardiff', province: 'Wales', postal: ['CF10 1BP','CF10 2EH','CF10 2BT'] },
      { streets: ['Castle Hill 1','Shipquay St 10','Strand Rd 20'], city: 'Derry', province: 'Northern Ireland', postal: ['BT48 6JE','BT48 6JL','BT48 7BQ'] },
    ],
  },
  DE: {
    name: 'Germany', country: 'Germany', phone_prefix: '+49 15',
    locations: [
      { streets: ['Unter den Linden 1','Friedrichstrasse 100','Kurfurstendamm 15','Potsdamer Platz 1'], city: 'Mitte', province: 'Berlin', postal: ['10117','10117','10709','10785'] },
      { streets: ['Maximilianstrasse 12','Ludwigstrasse 5','Leopoldstrasse 50','Marienplatz 1'], city: 'Munich', province: 'Bavaria', postal: ['80539','80333','80802','80331'] },
      { streets: ['Zeil 106','Goethestrasse 1','Kaiserstrasse 56','Bockenheimer Landstr 10'], city: 'Frankfurt', province: 'Hesse', postal: ['60313','60313','60329','60325'] },
      { streets: ['Monckebergstrasse 1','Jungfernstieg 10','Reeperbahn 1','Speicherstadt 1'], city: 'Hamburg', province: 'Hamburg', postal: ['20095','20095','20359','20457'] },
      { streets: ['Konigsallee 30','Graf-Adolf-Strasse 1','Berliner Allee 10'], city: 'Dusseldorf', province: 'North Rhine-Westphalia', postal: ['40212','40210','40212'] },
      { streets: ['Hohe Strasse 1','Schildergasse 57','Dom-Romer-Platz 1'], city: 'Cologne', province: 'North Rhine-Westphalia', postal: ['50667','50667','60311'] },
      { streets: ['Schlossstrasse 1','Nikolaikirchof 5','Universitatsplatz 10'], city: 'Stuttgart', province: 'Baden-Wurttemberg', postal: ['70173','70173','70173'] },
      { streets: ['Altstadt 1','Bahnhofstrasse 5','Rathausplatz 1'], city: 'Nuremberg', province: 'Bavaria', postal: ['90403','90402','90403'] },
      { streets: ['Breite Strasse 1','Alter Markt 10','Hohe Strasse 5'], city: 'Cologne', province: 'North Rhine-Westphalia', postal: ['50667','50667','50667'] },
      { streets: ['Herrenhäuser Allee 1','Georgstrasse 10','Ernst-August-Platz 5'], city: 'Hannover', province: 'Lower Saxony', postal: ['30419','30159','30159'] },
    ],
  },
  FR: {
    name: 'France', country: 'France', phone_prefix: '+33 6',
    locations: [
      { streets: ['1 Rue de Rivoli','10 Avenue des Champs-Elysees','5 Rue de la Paix','1 Place Vendome'], city: 'Paris 1er', province: 'Ile-de-France', postal: ['75001','75008','75001','75001'] },
      { streets: ['Tour Eiffel Champ de Mars 5','1 Avenue Joseph Bouvard','5 Avenue Anatole France'], city: 'Paris 7e', province: 'Ile-de-France', postal: ['75007','75007','75007'] },
      { streets: ['1 Rue de la Canebiere','10 Vieux-Port','5 Rue Saint-Ferreol'], city: 'Marseille', province: 'Provence-Alpes-Cote dAzur', postal: ['13001','13001','13001'] },
      { streets: ['1 Place Bellecour','10 Rue de la Republique','5 Quai de Saone'], city: 'Lyon', province: 'Auvergne-Rhone-Alpes', postal: ['69002','69001','69005'] },
      { streets: ['1 Rue Kleber','10 Place Kleber','5 Grand Rue'], city: 'Strasbourg', province: 'Grand Est', postal: ['67000','67000','67000'] },
      { streets: ['1 Place du Capitole','10 Rue dAlsace-Lorraine','5 Rue du Taur'], city: 'Toulouse', province: 'Occitanie', postal: ['31000','31000','31000'] },
      { streets: ['1 Rue de la Liberte','10 Place de la Republique','5 Boulevard de la Madeleine'], city: 'Dijon', province: 'Bourgogne-Franche-Comte', postal: ['21000','21000','21000'] },
      { streets: ['1 Promenade des Anglais','10 Rue Massena','5 Place Massena'], city: 'Nice', province: 'Provence-Alpes-Cote dAzur', postal: ['06000','06000','06000'] },
      { streets: ['1 Rue des Carmes','10 Place du Bouffay','5 Rue de la Fosse'], city: 'Nantes', province: 'Pays de la Loire', postal: ['44000','44000','44000'] },
      { streets: ['1 Rue Sainte-Catherine','10 Place de la Bourse','5 Cours de lIntendance'], city: 'Bordeaux', province: 'Nouvelle-Aquitaine', postal: ['33000','33000','33000'] },
    ],
  },
  NL: {
    name: 'Netherlands', country: 'Netherlands', phone_prefix: '+31 6',
    locations: [
      { streets: ['Damrak 1','Kalverstraat 10','Rokin 5','Leidsestraat 15'], city: 'Amsterdam', province: 'North Holland', postal: ['1012 LG','1012 GX','1012 KS','1017 PE'] },
      { streets: ['Coolsingel 40','Binnenwegplein 5','Lijnbaan 10','Weena 100'], city: 'Rotterdam', province: 'South Holland', postal: ['3012 AA','3012 LD','3012 EC','3013 AL'] },
      { streets: ['Hofweg 1','Spui 10','Grote Marktstraat 5','Buitenhof 1'], city: 'The Hague', province: 'South Holland', postal: ['2511 AA','2511 BH','2511 HH','2513 AH'] },
      { streets: ['Vredenburg 1','Lange Viestraat 10','Springweg 5','Oudegracht 1'], city: 'Utrecht', province: 'Utrecht', postal: ['3511 AB','3511 BG','3511 VK','3511 AE'] },
      { streets: ['Grotemarkt 1','Vismarkt 10','Gedempte Zuiderdiep 5'], city: 'Groningen', province: 'Groningen', postal: ['9712 HS','9712 NX','9711 HB'] },
      { streets: ['Markt 1','Grote Kerk Plein 5','Smedenstraat 10'], city: 'Breda', province: 'North Brabant', postal: ['4811 XL','4811 XK','4811 WK'] },
      { streets: ['Markt 3','Maasboulevard 1','Stationsplein 5'], city: 'Maastricht', province: 'Limburg', postal: ['6211 CJ','6211 EP','6221 BP'] },
      { streets: ['Friesestraatweg 1','Tweebaksmarkt 52','Nieuwstad 10'], city: 'Leeuwarden', province: 'Friesland', postal: ['8913 HA','8911 KS','8911 CE'] },
      { streets: ['Korte Houtstraat 5','Torenstraat 10','Spui 1'], city: 'The Hague', province: 'South Holland', postal: ['2511 CA','2513 AC','2511 BL'] },
      { streets: ['Kennedyplein 1','Piazza Center 5','18 Septemberplein 10'], city: 'Eindhoven', province: 'North Brabant', postal: ['5611 EK','5611 EK','5611 EH'] },
    ],
  },

  IT: {
    name: 'Italy', country: 'Italy', phone_prefix: '+39 33',
    locations: [
      { streets: ['Via Condotti 1','Via Veneto 10','Via del Corso 100','Piazza di Spagna 5'], city: 'Rome', province: 'Lazio', postal: ['00187','00187','00186','00187'] },
      { streets: ['Via Montenapoleone 1','Corso Vittorio Emanuele II 10','Via Dante 5','Piazza del Duomo 1'], city: 'Milan', province: 'Lombardy', postal: ['20121','20122','20121','20122'] },
      { streets: ['Via Roma 5','Via Garibaldi 10','Piazza Carignano 1','Corso Re Umberto 5'], city: 'Turin', province: 'Piedmont', postal: ['10124','10122','10123','10128'] },
      { streets: ['Via Caracciolo 1','Via Toledo 100','Via Chiaia 50','Piazza del Plebiscito 1'], city: 'Naples', province: 'Campania', postal: ['80121','80132','80121','80132'] },
      { streets: ['Viale Europa 1','Via del Parione 10','Piazza della Repubblica 5'], city: 'Florence', province: 'Tuscany', postal: ['50127','50123','50123'] },
      { streets: ['Riva degli Schiavoni 1','San Marco 1','Piazza San Marco 5'], city: 'Venice', province: 'Veneto', postal: ['30122','30124','30124'] },
      { streets: ['Via Maqueda 1','Via Roma 100','Piazza Pretoria 5'], city: 'Palermo', province: 'Sicily', postal: ['90133','90133','90133'] },
      { streets: ['Via Indipendenza 1','Piazza Maggiore 5','Via Rizzoli 10'], city: 'Bologna', province: 'Emilia-Romagna', postal: ['40121','40124','40125'] },
      { streets: ['Via Verdi 1','Via Garibaldi 5','Viale Gramsci 10'], city: 'Genoa', province: 'Liguria', postal: ['16121','16124','16121'] },
      { streets: ['Piazza del Duomo 1','Via Arcivescovado 2','Via Vittorio Emanuele II 5'], city: 'Catania', province: 'Sicily', postal: ['95124','95124','95129'] },
    ],
  },
  ES: {
    name: 'Spain', country: 'Spain', phone_prefix: '+34 6',
    locations: [
      { streets: ['Gran Via 1','Paseo de la Castellana 100','Calle Serrano 10','Puerta del Sol 1'], city: 'Madrid', province: 'Community of Madrid', postal: ['28013','28046','28001','28013'] },
      { streets: ['Las Ramblas 1','Passeig de Gracia 43','Via Laietana 10','Placa de Catalunya 1'], city: 'Barcelona', province: 'Catalonia', postal: ['08002','08007','08003','08002'] },
      { streets: ['Calle Sierpes 1','Avenida de la Constitucion 5','Calle Betis 10'], city: 'Seville', province: 'Andalusia', postal: ['41004','41001','41010'] },
      { streets: ['Gran Via de Colon 1','Calle Reyes Catolicos 5','Acera del Darro 10'], city: 'Granada', province: 'Andalusia', postal: ['18009','18010','18005'] },
      { streets: ['Calle Mayor 1','Avenida del Puerto 5','Plaza del Ayuntamiento 1'], city: 'Valencia', province: 'Valencia', postal: ['46002','46023','46002'] },
      { streets: ['Calle Larios 1','Alameda Principal 10','Paseo del Parque 5'], city: 'Malaga', province: 'Andalusia', postal: ['29005','29001','29016'] },
      { streets: ['Avenida Juan Carlos I 1','Calle Mayor 10','Avenida de la Paz 5'], city: 'Zaragoza', province: 'Aragon', postal: ['50003','50001','50006'] },
      { streets: ['Calle Corrida 10','Avenida de El Llano 5','Plaza del Marques 1'], city: 'Gijon', province: 'Asturias', postal: ['33201','33209','33201'] },
      { streets: ['Calle Ancha 1','Avenida de Andalucia 10','Calle Nueva 5'], city: 'Almeria', province: 'Andalusia', postal: ['04001','04006','04002'] },
      { streets: ['Avenida Diagonal 1','Passeig de Gracia 100','Carrer de Balmes 5'], city: 'Barcelona', province: 'Catalonia', postal: ['08018','08008','08007'] },
    ],
  },
  PT: {
    name: 'Portugal', country: 'Portugal', phone_prefix: '+351 9',
    locations: [
      { streets: ['Avenida da Liberdade 10','Rua Augusta 1','Rua do Ouro 5','Praca do Comercio 1'], city: 'Lisbon', province: 'Lisbon District', postal: ['1250-096','1100-060','1100-062','1100-148'] },
      { streets: ['Rua de Santa Catarina 10','Avenida dos Aliados 5','Rua das Flores 1'], city: 'Porto', province: 'Porto District', postal: ['4000-060','4000-066','4050-262'] },
      { streets: ['Rua de Coimbra 1','Rua Ferreira Borges 5','Praca 8 de Maio 1'], city: 'Coimbra', province: 'Coimbra District', postal: ['3000-120','3000-168','3000-300'] },
      { streets: ['Rua do Comercio 5','Praca do Giraldo 1','Rua 5 de Outubro 10'], city: 'Evora', province: 'Evora District', postal: ['7000-540','7000-500','7000-854'] },
      { streets: ['Avenida Arriaga 1','Rua Joao Tavira 5','Rua 31 de Janeiro 10'], city: 'Funchal', province: 'Madeira', postal: ['9004-520','9050-021','9050-011'] },
      { streets: ['Rua Direita 10','Praca Velha 1','Rua Joao das Regras 5'], city: 'Braga', province: 'Braga District', postal: ['4710-311','4700-306','4715-301'] },
      { streets: ['Rua do Almada 1','Rua das Carmelitas 5','Cais da Ribeira 10'], city: 'Porto', province: 'Porto District', postal: ['4050-037','4050-173','4050-509'] },
      { streets: ['Rua da Palma 1','Rua de Passos Manuel 5','Rua de Cedofeita 10'], city: 'Porto', province: 'Porto District', postal: ['4000-256','4000-382','4050-178'] },
      { streets: ['Avenida Infante Dom Henrique 1','Rua de Sao Joao 5'], city: 'Lagos', province: 'Faro District', postal: ['8600-779','8600-699'] },
      { streets: ['Praca da Republica 1','Rua de Alvaro Casteloes 5','Rua Visconde de Sameiro 10'], city: 'Viana do Castelo', province: 'Viana do Castelo District', postal: ['4900-530','4900-522','4900-559'] },
    ],
  },
  CH: {
    name: 'Switzerland', country: 'Switzerland', phone_prefix: '+41 79',
    locations: [
      { streets: ['Bahnhofstrasse 1','Paradeplatz 8','Limmatquai 10','Niederdorfstrasse 5'], city: 'Zurich', province: 'Zurich', postal: ['8001','8001','8001','8001'] },
      { streets: ['Rue du Rhone 1','Rue de Rive 10','Place du Molard 5','Rue du Marche 15'], city: 'Geneva', province: 'Geneva', postal: ['1204','1207','1204','1204'] },
      { streets: ['Spitalgasse 1','Marktgasse 10','Kramgasse 5','Munsterplatz 1'], city: 'Bern', province: 'Bern', postal: ['3011','3011','3011','3011'] },
      { streets: ['Kapellgasse 1','Eisengasse 10','Haldenstrasse 5'], city: 'Lucerne', province: 'Lucerne', postal: ['6004','6004','6006'] },
      { streets: ['Aarbergergasse 1','Marktgasse 10','Gerechtigkeitsgasse 5'], city: 'Basel', province: 'Basel-City', postal: ['4051','4051','4051'] },
      { streets: ['Bahnhofplatz 1','Hauptstrasse 5','Dorfstrasse 10'], city: 'Lausanne', province: 'Vaud', postal: ['1003','1003','1004'] },
      { streets: ['Via Nassa 1','Piazza della Riforma 5','Via Pessina 10'], city: 'Lugano', province: 'Ticino', postal: ['6900','6900','6900'] },
      { streets: ['Stadthausstrasse 1','Hauptgasse 10','Vorstadt 5'], city: 'Biel/Bienne', province: 'Bern', postal: ['2502','2502','2503'] },
      { streets: ['Vordere Vorstadt 1','Hauptgasse 5','Kreuzgasse 10'], city: 'Aarau', province: 'Aargau', postal: ['5001','5000','5000'] },
      { streets: ['St. Leonhardstrasse 1','Rosenbergstrasse 5','Marktgasse 10'], city: 'St. Gallen', province: 'St. Gallen', postal: ['9000','9001','9001'] },
    ],
  },
  AT: {
    name: 'Austria', country: 'Austria', phone_prefix: '+43 69',
    locations: [
      { streets: ['Karntner Strasse 1','Graben 10','Kohlmarkt 5','Mariahilfer Strasse 100'], city: 'Vienna', province: 'Vienna', postal: ['1010','1010','1010','1060'] },
      { streets: ['Getreidegasse 9','Linzer Gasse 1','Staatsbrucke 1'], city: 'Salzburg', province: 'Salzburg', postal: ['5020','5020','5020'] },
      { streets: ['Herrengasse 1','Hauptplatz 10','Paradeisgasse 5'], city: 'Graz', province: 'Styria', postal: ['8010','8010','8010'] },
      { streets: ['Landstrasse 1','Hauptplatz 10','Promenade 5'], city: 'Linz', province: 'Upper Austria', postal: ['4020','4020','4020'] },
      { streets: ['Maria-Theresien-Strasse 1','Burggraben 5','Herzog-Friedrich-Strasse 10'], city: 'Innsbruck', province: 'Tyrol', postal: ['6020','6020','6020'] },
      { streets: ['Hauptplatz 1','Rathausgasse 5','Domgasse 10'], city: 'Klagenfurt', province: 'Carinthia', postal: ['9020','9020','9020'] },
      { streets: ['Sparkassenplatz 1','Rathausplatz 5','Hauptplatz 10'], city: 'Wels', province: 'Upper Austria', postal: ['4600','4600','4600'] },
      { streets: ['Hauptplatz 1','Wiener Strasse 5','Bahnhofstrasse 10'], city: 'St. Polten', province: 'Lower Austria', postal: ['3100','3100','3100'] },
      { streets: ['Kreuzgasse 1','Hauptplatz 5','Rathausstrasse 10'], city: 'Villach', province: 'Carinthia', postal: ['9500','9500','9500'] },
      { streets: ['Rathausplatz 1','Landstrasse 5','Stadtplatz 10'], city: 'Steyr', province: 'Upper Austria', postal: ['4400','4400','4400'] },
    ],
  },
  BE: {
    name: 'Belgium', country: 'Belgium', phone_prefix: '+32 47',
    locations: [
      { streets: ['Rue Neuve 1','Boulevard Anspach 10','Avenue Louise 5','Grand-Place 1'], city: 'Brussels', province: 'Brussels Capital Region', postal: ['1000','1000','1050','1000'] },
      { streets: ['Meir 1','Groenplaats 10','Nationalestraat 5','Lange Nieuwstraat 1'], city: 'Antwerp', province: 'Antwerp Province', postal: ['2000','2000','2000','2000'] },
      { streets: ['Veldstraat 1','Korenmarkt 5','Sint-Pietersnieuwstraat 10'], city: 'Ghent', province: 'East Flanders', postal: ['9000','9000','9000'] },
      { streets: ['Bondgenotenlaan 1','Mechelsestraat 5','Brusselsestraat 10'], city: 'Leuven', province: 'Flemish Brabant', postal: ['3000','3000','3000'] },
      { streets: ['Rue de la Cathedrale 1','Boulevard dAvroy 10','Rue Feronstreee 5'], city: 'Liege', province: 'Liege Province', postal: ['4000','4000','4000'] },
      { streets: ['Place du Marche 1','Rue de Namur 5','Rue des Brasseurs 10'], city: 'Namur', province: 'Namur Province', postal: ['5000','5000','5000'] },
      { streets: ['Grand-Place 1','Rue de Neffe 5','Rue des Voisins 10'], city: 'Bruges', province: 'West Flanders', postal: ['8000','8000','8000'] },
      { streets: ['Place Communale 1','Rue de Riviere 5','Rue de Namur 10'], city: 'Charleroi', province: 'Hainaut', postal: ['6000','6000','6000'] },
      { streets: ['Grand Place 1','Rue des Claires 5','Rue de Nimy 10'], city: 'Mons', province: 'Hainaut', postal: ['7000','7000','7000'] },
      { streets: ['Rue du Pont 1','Place de lHotel de Ville 5','Rue de Gaume 10'], city: 'Arlon', province: 'Luxembourg Province', postal: ['6700','6700','6700'] },
    ],
  },

  SE: {
    name: 'Sweden', country: 'Sweden', phone_prefix: '+46 70',
    locations: [
      { streets: ['Drottninggatan 1','Kungsgatan 10','Strandvagen 5','Birger Jarlsgatan 15'], city: 'Stockholm', province: 'Stockholm County', postal: ['111 21','111 35','114 56','114 29'] },
      { streets: ['Avenyn 1','Kungsgatan 10','Kungsportsavenyn 5'], city: 'Gothenburg', province: 'Vastra Gotaland County', postal: ['411 36','411 19','411 36'] },
      { streets: ['Stortorget 1','Hamngatan 10','Sodra Forstadsgatan 5'], city: 'Malmo', province: 'Scania County', postal: ['211 34','211 22','214 36'] },
      { streets: ['Stora Torget 1','Kungsgatan 5','Vastra Storgatan 10'], city: 'Uppsala', province: 'Uppsala County', postal: ['753 31','753 31','752 23'] },
      { streets: ['Stortorget 1','Tradgardsgatan 5','Kyrkogatan 10'], city: 'Linkoping', province: 'Ostergotland County', postal: ['582 21','582 22','582 22'] },
      { streets: ['Stortorget 1','Norra Storgatan 5','Sodra Promenaden 10'], city: 'Norrkoping', province: 'Ostergotland County', postal: ['602 25','602 24','602 32'] },
      { streets: ['Stortorget 1','Ostergatan 5','Korsgatan 10'], city: 'Orebro', province: 'Orebro County', postal: ['702 11','702 10','703 61'] },
      { streets: ['Stora Torget 1','Storgatan 5','Hertig Karls allee 10'], city: 'Karlstad', province: 'Varmland County', postal: ['652 24','652 25','651 84'] },
      { streets: ['Drottninggatan 1','Vasagatan 5','Torggatan 10'], city: 'Umea', province: 'Vasternorrland County', postal: ['903 31','903 29','903 26'] },
      { streets: ['Stortorget 1','Drottninggatan 5','Radmansgatan 10'], city: 'Sundsvall', province: 'Vasternorrland County', postal: ['852 30','851 31','852 36'] },
    ],
  },
  NO: {
    name: 'Norway', country: 'Norway', phone_prefix: '+47 9',
    locations: [
      { streets: ['Karl Johans gate 1','Aker Brygge 1','Bogstadveien 10','Grensen 5'], city: 'Oslo', province: 'Oslo County', postal: ['0154','0250','0355','0159'] },
      { streets: ['Bryggen 1','Torgallmenningen 10','Strandkaien 5'], city: 'Bergen', province: 'Vestland County', postal: ['5003','5014','5013'] },
      { streets: ['Nordre gate 1','Kongens gate 5','Thomas Angells gate 10'], city: 'Trondheim', province: 'Trondelag County', postal: ['7013','7013','7012'] },
      { streets: ['Storgata 1','Bispegata 5','Kongens gate 10'], city: 'Stavanger', province: 'Rogaland County', postal: ['4006','4005','4005'] },
      { streets: ['Kirkegata 1','Ovre Langgate 5','Nedre Langgate 10'], city: 'Tonsberg', province: 'Vestfold og Telemark', postal: ['3126','3126','3127'] },
      { streets: ['Storgata 1','Kongens gate 5','Gronlandsveien 10'], city: 'Kristiansand', province: 'Agder County', postal: ['4611','4611','4610'] },
      { streets: ['Storgata 1','Storgt 5','Torvgata 10'], city: 'Drammen', province: 'Viken County', postal: ['3015','3017','3018'] },
      { streets: ['Storgata 1','Kirkegata 5','Radhusgata 10'], city: 'Fredrikstad', province: 'Viken County', postal: ['1607','1607','1607'] },
      { streets: ['Storgata 1','Radhusgata 5','Sentrum 10'], city: 'Tromso', province: 'Troms og Finnmark', postal: ['9008','9008','9008'] },
      { streets: ['Strandgata 1','Norregata 5','Torget 10'], city: 'Alesund', province: 'More og Romsdal', postal: ['6002','6003','6002'] },
    ],
  },
  DK: {
    name: 'Denmark', country: 'Denmark', phone_prefix: '+45 5',
    locations: [
      { streets: ['Stroget 1','Norregade 10','Gothersgade 5','Bredgade 15'], city: 'Copenhagen', province: 'Capital Region', postal: ['1100','1165','1123','1260'] },
      { streets: ['Sondergade 1','Radhusgade 10','Aboulevarden 5'], city: 'Aarhus', province: 'Central Denmark Region', postal: ['8000','8000','8000'] },
      { streets: ['Sondergade 1','Kongensgade 5','Ostergade 10'], city: 'Odense', province: 'Southern Denmark Region', postal: ['5000','5000','5000'] },
      { streets: ['Algade 1','Vestergade 5','Nytorv 10'], city: 'Aalborg', province: 'North Denmark Region', postal: ['9000','9000','9000'] },
      { streets: ['Storegade 1','Fiskegade 5','Havnegade 10'], city: 'Esbjerg', province: 'Southern Denmark Region', postal: ['6700','6700','6700'] },
      { streets: ['Jernbanegade 1','Ostergade 5','Vestergade 10'], city: 'Randers', province: 'Central Denmark Region', postal: ['8900','8900','8900'] },
      { streets: ['Skolegade 1','Ostergade 5','Vesterbrogade 10'], city: 'Kolding', province: 'Southern Denmark Region', postal: ['6000','6000','6000'] },
      { streets: ['Vesterbrogade 1','Frederiksberggade 5','Komagergade 10'], city: 'Copenhagen', province: 'Capital Region', postal: ['1620','1459','1150'] },
      { streets: ['Klampenborgvej 1','Strandvejen 5','Kongevej 10'], city: 'Lyngby', province: 'Capital Region', postal: ['2800','2900','2900'] },
      { streets: ['Norrebrogade 1','Ravnsborggade 5','Elmegade 10'], city: 'Copenhagen', province: 'Capital Region', postal: ['2200','2200','2200'] },
    ],
  },
  FI: {
    name: 'Finland', country: 'Finland', phone_prefix: '+358 4',
    locations: [
      { streets: ['Mannerheimintie 1','Aleksanterinkatu 10','Esplanadi 5','Pohjoisesplanadi 15'], city: 'Helsinki', province: 'Uusimaa', postal: ['00100','00100','00130','00170'] },
      { streets: ['Hameenkatu 1','Keskustori 5','Yliopistokatu 10'], city: 'Tampere', province: 'Pirkanmaa', postal: ['33100','33100','33100'] },
      { streets: ['Kauppakatu 1','Linnankatu 5','Eerikinkatu 10'], city: 'Turku', province: 'Southwest Finland', postal: ['20100','20100','20100'] },
      { streets: ['Kauppakatu 1','Kirkkokatu 5','Rautatienkatu 10'], city: 'Oulu', province: 'North Ostrobothnia', postal: ['90100','90100','90100'] },
      { streets: ['Kauppakatu 1','Maaherrankatu 5','Olavinkatu 10'], city: 'Savonlinna', province: 'South Savo', postal: ['57100','57100','57100'] },
      { streets: ['Kauppakatu 1','Torikatu 5','Kirkkokatu 10'], city: 'Jyvaskyla', province: 'Central Finland', postal: ['40100','40100','40100'] },
      { streets: ['Kauppakatu 1','Kirkkokatu 5','Torikatu 10'], city: 'Kuopio', province: 'North Savo', postal: ['70100','70100','70100'] },
      { streets: ['Kauppakatu 1','Rantakatu 5','Kirkkokatu 10'], city: 'Vaasa', province: 'Ostrobothnia', postal: ['65100','65100','65100'] },
      { streets: ['Hameenkatu 1','Torikatu 5','Kauppakatu 10'], city: 'Lahti', province: 'Paijat-Hame', postal: ['15110','15100','15110'] },
      { streets: ['Aleksanterinkatu 1','Bulevardi 5','Fredrikinkatu 10'], city: 'Helsinki', province: 'Uusimaa', postal: ['00100','00120','00120'] },
    ],
  },
  PL: {
    name: 'Poland', country: 'Poland', phone_prefix: '+48 50',
    locations: [
      { streets: ['Nowy Swiat 1','Aleje Jerozolimskie 10','ul. Marszalkowska 100','Plac Defilad 1'], city: 'Warsaw', province: 'Masovian Voivodeship', postal: ['00-400','00-695','00-693','00-901'] },
      { streets: ['ul. Florianska 1','Rynek Glowny 10','ul. Grodzka 5'], city: 'Krakow', province: 'Lesser Poland Voivodeship', postal: ['31-021','31-041','31-006'] },
      { streets: ['Swidnicka 1','Rynek 10','Swidnicka 53','ul. Olawska 5'], city: 'Wroclaw', province: 'Lower Silesian Voivodeship', postal: ['50-066','50-101','50-069','50-123'] },
      { streets: ['ul. Piotrkowska 1','Plac Wolnosci 10','ul. Narutowicza 5'], city: 'Lodz', province: 'Lodz Voivodeship', postal: ['90-001','90-001','90-136'] },
      { streets: ['ul. Dluga 1','Stary Rynek 10','ul. Ratajczaka 5'], city: 'Poznan', province: 'Greater Poland Voivodeship', postal: ['61-848','61-001','61-801'] },
      { streets: ['ul. Gdanska 1','Dlugi Targ 10','ul. Waly Jagiellonskie 5'], city: 'Gdansk', province: 'Pomeranian Voivodeship', postal: ['80-001','80-831','80-853'] },
      { streets: ['ul. Sokolska 1','Rynek 10','ul. Starowiejska 5'], city: 'Katowice', province: 'Silesian Voivodeship', postal: ['40-086','40-098','40-011'] },
      { streets: ['ul. Bonifraterska 1','pl. Katedralny 5','ul. Farna 10'], city: 'Szczecin', province: 'West Pomeranian Voivodeship', postal: ['71-011','70-001','70-031'] },
      { streets: ['ul. Lipowa 1','Rynek Kosciuszki 10','ul. Sienkiewicza 5'], city: 'Bialystok', province: 'Podlaskie Voivodeship', postal: ['15-427','15-426','15-092'] },
      { streets: ['ul. Szeroka 1','ul. Zamkowa 5','Starowka 10'], city: 'Lublin', province: 'Lublin Voivodeship', postal: ['20-001','20-115','20-004'] },
    ],
  },
  CZ: {
    name: 'Czech Rep.', country: 'Czech Republic', phone_prefix: '+420 6',
    locations: [
      { streets: ['Vaclavske namesti 1','Na Prikope 10','Wenceslas Square 5','Staromestske namesti 1'], city: 'Prague', province: 'Prague', postal: ['110 00','110 00','110 00','110 00'] },
      { streets: ['namesti Svobody 1','Ceska 5','Jostova 10'], city: 'Brno', province: 'South Moravian Region', postal: ['602 00','602 00','602 00'] },
      { streets: ['namesti Dr. E. Benese 1','Smetanovo nabrezi 5','Prazska 10'], city: 'Plzen', province: 'Plzen Region', postal: ['301 00','301 00','301 00'] },
      { streets: ['Horni namesti 1','Dolni namesti 5','trida Svobody 10'], city: 'Olomouc', province: 'Olomouc Region', postal: ['779 00','779 00','779 00'] },
      { streets: ['namesti Miru 1','Revolucni 5','Smetanovo namesti 10'], city: 'Liberec', province: 'Liberec Region', postal: ['460 01','460 01','460 01'] },
      { streets: ['Velke namesti 1','Male namesti 5','Eliscino nabrezi 10'], city: 'Hradec Kralove', province: 'Hradec Kralove Region', postal: ['500 01','500 01','500 01'] },
      { streets: ['namesti Republiky 1','Prokopova 5','Rooseveltova 10'], city: 'Ostrava', province: 'Moravian-Silesian Region', postal: ['701 00','702 00','702 00'] },
      { streets: ['Masarykovo namesti 1','Kapucinske namesti 5','Husova 10'], city: 'Ceske Budejovice', province: 'South Bohemian Region', postal: ['370 01','370 01','370 01'] },
      { streets: ['namesti Miru 1','trida T. G. Masaryka 5','Zerotinova 10'], city: 'Zlin', province: 'Zlin Region', postal: ['760 01','760 01','760 01'] },
      { streets: ['Vaclavske namesti 100','Old Town Square 1','Charles Bridge 1'], city: 'Prague', province: 'Prague', postal: ['110 00','110 00','118 00'] },
    ],
  },
  GR: {
    name: 'Greece', country: 'Greece', phone_prefix: '+30 69',
    locations: [
      { streets: ['Ermou 1','Syntagma Square 10','Stadiou 5','Voukourestiou 15'], city: 'Athens', province: 'Attica', postal: ['105 63','105 57','105 64','106 74'] },
      { streets: ['Aristotelous Square 1','Tsimiski 10','Egnatia 5'], city: 'Thessaloniki', province: 'Central Macedonia', postal: ['546 23','546 23','546 27'] },
      { streets: ['Patreos 1','Maizonos 5','Gerokostopoulou 10'], city: 'Patras', province: 'Western Greece', postal: ['262 21','262 22','262 23'] },
      { streets: ['Palaia 1','Venetokleion 5','Eleftheriou Venizelou 10'], city: 'Heraklion', province: 'Crete', postal: ['712 01','712 01','712 02'] },
      { streets: ['Dodonis 1','Pyrsinella 5','Averoff 10'], city: 'Ioannina', province: 'Epirus', postal: ['452 21','452 21','452 32'] },
      { streets: ['Demokratias 1','Karamanli 5','Mitropoliti 10'], city: 'Kavala', province: 'Eastern Macedonia', postal: ['653 02','653 02','653 02'] },
      { streets: ['Mitropoleos 1','Agiou Nikolaou 5','Ermou 10'], city: 'Chania', province: 'Crete', postal: ['731 32','731 32','731 33'] },
      { streets: ['Iroon Polytechniou 1','Leof. Karamanli 5','Neapoli 10'], city: 'Thessaloniki', province: 'Central Macedonia', postal: ['546 55','542 50','560 28'] },
      { streets: ['Kaningos Square 1','Pedion Areos 5','Patision 10'], city: 'Athens', province: 'Attica', postal: ['106 77','113 62','104 34'] },
      { streets: ['Vas. Georgiou 1','Poseidonos 5','Kalamakiou 10'], city: 'Glyfada', province: 'Attica', postal: ['166 74','174 55','174 55'] },
    ],
  },
  IE: {
    name: 'Ireland', country: 'Ireland', phone_prefix: '+353 8',
    locations: [
      { streets: ["O'Connell Street 1",'Grafton Street 10','Dame Street 5','Nassau Street 15'], city: 'Dublin', province: 'Leinster', postal: ['D01 A5V0','D02 HX60','D02 EF00','D02 T283'] },
      { streets: ['Patrick Street 1','Oliver Plunkett Street 10','Grand Parade 5'], city: 'Cork', province: 'Munster', postal: ['T12 Y3PH','T12 EA01','T12 VN20'] },
      { streets: ['Shop Street 1','Eyre Square 10','William Street 5'], city: 'Galway', province: 'Connacht', postal: ['H91 X9EK','H91 C3WH','H91 Y226'] },
      { streets: ["O'Connell Street 1",'Sarsfield Street 5','Henry Street 10'], city: 'Limerick', province: 'Munster', postal: ['V94 H3RR','V94 RD53','V94 VF67'] },
      { streets: ['Main Street 1','Charlotte Street 5','Mall Road 10'], city: 'Waterford', province: 'Munster', postal: ['X91 K5WY','X91 PA0P','X91 V3F5'] },
      { streets: ['Mainguard Street 1','OBrien Street 5','Castle Street 10'], city: 'Kilkenny', province: 'Leinster', postal: ['R95 X264','R95 KY0T','R95 WT95'] },
      { streets: ['Main Street 1','Market Street 5','Church Street 10'], city: 'Sligo', province: 'Connacht', postal: ['F91 VH97','F91 H8XE','F91 N67T'] },
      { streets: ['Barrack Street 1','High Street 5','Market Street 10'], city: 'Tralee', province: 'Munster', postal: ['V92 HV12','V92 HF70','V92 FN25'] },
      { streets: ['Main Street 1','Chapel Street 5','Bridge Street 10'], city: 'Letterkenny', province: 'Ulster', postal: ['F92 Y76T','F92 WT20','F92 HY66'] },
      { streets: ['Dawson Street 1','Kildare Street 5','Merrion Square 10'], city: 'Dublin', province: 'Leinster', postal: ['D02 PF28','D02 YX11','D02 XD78'] },
    ],
  },
};

const REGION_COUNTRIES = {
  asia:   ['ID','JP','KR','SG','MY','TH','VN','PH','CN','TW','HK','IN','AE','SA','QA','TR'],
  europe: ['GB','DE','FR','NL','IT','ES','PT','CH','AT','BE','SE','NO','DK','FI','PL','CZ','GR','IE'],
};

function generateWorldAddress(countryKey) {
  const c   = worldAddresses[countryKey];
  const loc = randItem(c.locations);
  const num = rand(1, 250);
  const suf = rand(1000, 9999).toString();
  const street = `${randItem(loc.streets)} ${num}`;
  const postal = randItem(loc.postal);
  const phone  = `${c.phone_prefix}${suf}`;
  const full   = `${street}, ${loc.city}, ${loc.province}, ${postal}`;
  return { street, city: loc.city, province: loc.province, phone, postal, country: c.country, full };
}

function generateWorldAddresses(countryKey, n) {
  const res = [];
  for (let i = 0; i < n; i++) res.push(generateWorldAddress(countryKey));
  return res;
}

function buildCountryListKeyboard(region, page) {
  const keys  = REGION_COUNTRIES[region];
  const start = page * COUNTRIES_PER_PAGE;
  const slice = keys.slice(start, start + COUNTRIES_PER_PAGE);
  const rows  = [];
  for (let i = 0; i < slice.length; i += 2) {
    const row = [{ text: worldAddresses[slice[i]].name, callback_data: `addr_country_${slice[i]}` }];
    if (slice[i + 1]) row.push({ text: worldAddresses[slice[i + 1]].name, callback_data: `addr_country_${slice[i + 1]}` });
    rows.push(row);
  }
  const navRow  = [];
  const isFirst = page === 0;
  const isLast  = start + COUNTRIES_PER_PAGE >= keys.length;
  navRow.push({ text: '← Back', callback_data: isFirst ? 'addr_back_region' : `addr_clist_${region}_${page - 1}` });
  if (!isLast) navRow.push({ text: 'Next →', callback_data: `addr_clist_${region}_${page + 1}` });
  rows.push(navRow);
  return { inline_keyboard: rows };
}


// ─────────────────────────────────────────
//   2FA HELPERS
// ─────────────────────────────────────────

function isValid2FASecret(input) {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z2-7]+=*$/.test(cleaned) && cleaned.length >= 16;
}

function getOTP(base32) {
  const totp = new TOTP({
    algorithm: 'SHA1', digits: 6, period: 30,
    secret: Secret.fromBase32(base32.trim().toUpperCase()),
  });
  return totp.generate();
}

function currentPeriod() {
  return Math.floor(Date.now() / 1000 / 30);
}

function secondsLeft() {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

function timerBar(secs) {
  const filled = Math.round((secs / 30) * 10);
  const empty  = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + `  ${secs}s`;
}

async function hasJoined(userId) {
  try {
    const m = await bot.getChatMember(CHANNEL, userId);
    if (m.status === 'kicked' || m.status === 'left') return false;
    return true;
  } catch { return true; }
}

// ─────────────────────────────────────────
//   SESSIONS
// ─────────────────────────────────────────

const sessions   = {}; // OTP sessions
const msgCache   = {}; // userId → msgId (pesan utama, untuk di-edit)
const userState  = {}; // userId → state string ('awaiting_ip', dll)
const stateTimer = {}; // userId → timeout handle untuk expire userState

// Patch #6: set userState dengan auto-expire 5 menit
const STATE_TTL = 5 * 60 * 1000;
function setUserState(userId, state) {
  clearTimeout(stateTimer[userId]);
  userState[userId] = state;
  stateTimer[userId] = setTimeout(() => {
    delete userState[userId];
    delete stateTimer[userId];
  }, STATE_TTL);
}
function clearUserState(userId) {
  clearTimeout(stateTimer[userId]);
  delete stateTimer[userId];
  delete userState[userId];
}

function stopSession(userId) {
  if (sessions[userId]) {
    clearInterval(sessions[userId].timer);
    delete sessions[userId];
  }
}

// Patch #5: cleanup session + msgCache yang tidak aktif (TTL 30 menit)
const SESSION_TTL = 30 * 60 * 1000; // 30 menit
setInterval(() => {
  const now = Date.now();
  for (const uid of Object.keys(sessions)) {
    const s = sessions[uid];
    if (s.lastActive && now - s.lastActive > SESSION_TTL) {
      stopSession(uid);
      delete msgCache[uid];
    }
  }
  // Bersihkan msgCache untuk user yang tidak punya session aktif > 30 menit
  for (const uid of Object.keys(msgCache)) {
    if (!sessions[uid]) delete msgCache[uid];
  }
}, 10 * 60 * 1000); // cek tiap 10 menit

// ─────────────────────────────────────────
//   KEYBOARDS
// ─────────────────────────────────────────

const mainMenu = {
  inline_keyboard: [[
    { text: '🔐 Generate 2FA',    callback_data: 'menu_2fa'     },
    { text: '📍 Random Address',  callback_data: 'menu_address' },
  ],[
    { text: '🌐 Cek IP / ISP',    callback_data: 'menu_ip'      },
  ]],
};

const joinOpts = {
  parse_mode: 'HTML',
  reply_markup: {
    inline_keyboard: [[
      { text: '📢 Join Channel', url: 'https://t.me/RayzellStores' },
      { text: '✓ Sudah Join',   callback_data: 'check_join' },
    ]],
  },
};

// ─────────────────────────────────────────
//   SEND / EDIT helper (1 pesan saja)
// ─────────────────────────────────────────

async function sendOrEdit(chatId, userId, text, opts = {}) {
  const mid = msgCache[userId];
  if (mid) {
    try {
      await bot.editMessageText(text, {
        chat_id   : chatId,
        message_id: mid,
        parse_mode: 'HTML',
        ...opts,
      });
      return mid;
    } catch (_) {}
  }
  // Kirim baru kalau belum ada atau gagal edit
  const sent = await bot.sendMessage(chatId, text, { parse_mode: 'HTML', ...opts });
  msgCache[userId] = sent.message_id;
  return sent.message_id;
}

// ─────────────────────────────────────────
//   /start
// ─────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const name   = msg.from.first_name || 'Pengguna';
  const joined = await hasJoined(userId);

  stopSession(userId);

  if (!joined) {
    const sent = await bot.sendMessage(chatId,
      `Untuk menggunakan bot ini, kamu harus join channel kami dulu.`,
      joinOpts
    );
    msgCache[userId] = sent.message_id;
    return;
  }

  await sendOrEdit(chatId, userId,
    `Halo, <b>${name}</b>! Pilih fitur di bawah.`,
    { reply_markup: mainMenu }
  );
});

// ─────────────────────────────────────────
//   /help
// ─────────────────────────────────────────

// Patch #7: tambah /help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  await bot.sendMessage(chatId,
    `<b>📖 Panduan Bot</b>\n\n` +
    `<b>🔐 Generate 2FA</b>\n` +
    `Masukkan secret key Base32 (contoh: <code>JBSWY3DPEHPK3PXP</code>)\n` +
    `Bot akan menampilkan OTP realtime dengan countdown.\n\n` +
    `<b>📍 Random Address</b>\n` +
    `Generate alamat dari Asia (16 negara) & Europe (18 negara).\n\n` +
    `<b>🌐 Cek IP / ISP</b>\n` +
    `Masukkan IP address atau domain untuk melihat info lokasi & ISP.\n\n` +
    `<b>Commands:</b>\n` +
    `/start — Buka menu utama\n` +
    `/help  — Tampilkan panduan ini`,
    { parse_mode: 'HTML' }
  );
});

// ─────────────────────────────────────────
//   OTP SESSION
// ─────────────────────────────────────────

async function startOtpSession(userId, chatId, base32) {
  stopSession(userId);
  // Guard: tandai session sedang diinisialisasi untuk mencegah double-call
  sessions[userId] = { secret: base32, chatId, msgId: null, timer: null, lastActive: Date.now() };

  let otp;
  try { otp = getOTP(base32); }
  catch { return sendOrEdit(chatId, userId, `Error: This is not 2FA Secret !`); }

  const startPeriod = currentPeriod();
  const secs        = secondsLeft();
  const ic          = secs <= 5 ? '🔴' : secs <= 10 ? '🟡' : '🟢';

  const msgId = await sendOrEdit(chatId, userId,
    `🔐 2FA Code: <code>${otp}</code>\n` +
    `${ic} Status: <b>Aktif</b>\n\n` +
    `<code>${timerBar(secs)}</code>`,
    {
      reply_markup: { inline_keyboard: [[
        { text: `⏱ ${secs}s`,       callback_data: `otp_refresh_${base32}` },
        { text: '← Kembali',        callback_data: 'otp_back' },
      ]]},    }
  );
  // Patch #4: pastikan msgCache selalu sinkron dengan msgId yang aktif
  msgCache[userId] = msgId;
  // Patch #3: update session dengan msgId dan timer yang benar
  sessions[userId].msgId = msgId;

  const timer = setInterval(async () => {
    try {
      const nowPeriod = currentPeriod();
      const nowSecs   = secondsLeft();

      if (nowPeriod !== startPeriod) {
        clearInterval(sessions[userId]?.timer);
        if (sessions[userId]) sessions[userId].timer = null;

        await bot.editMessageText(
          `🔐 2FA Code: <code>${otp}</code>\n` +
          `⏳ Status: <b>Expired</b>\n\n` +
          `Tap Refresh untuk mendapatkan kode baru.`,
          {
            chat_id      : chatId,
            message_id   : msgId,
            parse_mode   : 'HTML',
            reply_markup : { inline_keyboard: [[
              { text: '← Kembali',  callback_data: 'otp_back' },
              { text: '🔄 Refresh', callback_data: `otp_refresh_${base32}` },
            ]]},
          }
        );
        return;
      }

      const ic2 = nowSecs <= 5 ? '🔴' : nowSecs <= 10 ? '🟡' : '🟢';
      await bot.editMessageText(
        `🔐 2FA Code: <code>${otp}</code>\n` +
        `${ic2} Status: <b>Aktif</b>\n\n` +
        `<code>${timerBar(nowSecs)}</code>`,
        {
          chat_id      : chatId,
          message_id   : msgId,
          parse_mode   : 'HTML',
          reply_markup : { inline_keyboard: [[
            { text: `⏱ ${nowSecs}s`, callback_data: `otp_refresh_${base32}` },
            { text: '← Kembali',    callback_data: 'otp_back' },
          ]]},        }
      );
    } catch (e) {
      const em = e.message || '';
      if (em.includes('message to edit not found') || em.includes('MESSAGE_ID_INVALID')) {
        stopSession(userId);
      }
    }
  }, 2000);

  sessions[userId].timer = timer;
}

// ─────────────────────────────────────────
//   CALLBACK QUERY
// ─────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const msgId  = query.message.message_id;
  const name   = query.from.first_name || 'Pengguna';
  const data   = query.data || '';

  // ── check_join ──
  if (data === 'check_join') {
    const joined = await hasJoined(userId);
    if (!joined) {
      return bot.answerCallbackQuery(query.id, {
        text: 'Kamu belum join. Silakan join channel dulu.', show_alert: true,
      });
    }
    await bot.answerCallbackQuery(query.id, { text: 'Berhasil! Selamat datang.' });
    msgCache[userId] = msgId;
    await sendOrEdit(chatId, userId,
      `Halo, <b>${name}</b>! Pilih fitur di bawah.`,
      { reply_markup: mainMenu }
    );
    return;
  }

  // ── menu_2fa ──
  if (data === 'menu_2fa') {
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    stopSession(userId);
    clearUserState(userId); // reset state
    setUserState(userId, 'awaiting_2fa'); // set state 2FA
    await sendOrEdit(chatId, userId,
      `🔐 <b>Generate 2FA</b>\n\nKirim secret key 2FA kamu (Base32).\n\n<i>Contoh: <code>JBSWY3DPEHPK3PXP</code></i>`,
      { reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] } }
    );
    return;
  }

  // ── menu_address: show region selector ──
  if (data === 'menu_address') {
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    await sendOrEdit(chatId, userId,
      `📍 <b>Random Address</b>\n\nSelect region:`,
      {
        reply_markup: { inline_keyboard: [
          [
            { text: 'Asia',   callback_data: 'addr_region_asia'   },
            { text: 'Europe', callback_data: 'addr_region_europe' },
          ],
          [{ text: '← Back', callback_data: 'back_main' }],
        ]},
      }
    );
    return;
  }

  // ── addr_region_<region> ──
  if (data === 'addr_region_asia' || data === 'addr_region_europe') {
    const region = data === 'addr_region_asia' ? 'asia' : 'europe';
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    const label = region === 'asia' ? 'Asia' : 'Europe';
    await sendOrEdit(chatId, userId,
      `📍 <b>${label}</b> — Select country:`,
      { reply_markup: buildCountryListKeyboard(region, 0) }
    );
    return;
  }

  // ── addr_clist_<region>_<page> ──
  if (data.startsWith('addr_clist_')) {
    const parts  = data.split('_');
    const region = parts[2];
    const page   = parseInt(parts[3]);
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    const label = region === 'asia' ? 'Asia' : 'Europe';
    await sendOrEdit(chatId, userId,
      `📍 <b>${label}</b> — Select country:`,
      { reply_markup: buildCountryListKeyboard(region, page) }
    );
    return;
  }

  // ── addr_back_region ──
  if (data === 'addr_back_region') {
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    await sendOrEdit(chatId, userId,
      `📍 <b>Random Address</b>\n\nSelect region:`,
      {
        reply_markup: { inline_keyboard: [
          [
            { text: 'Asia',   callback_data: 'addr_region_asia'   },
            { text: 'Europe', callback_data: 'addr_region_europe' },
          ],
          [{ text: '← Back', callback_data: 'back_main' }],
        ]},
      }
    );
    return;
  }

  // ── addr_back_clist_<region>_<page> ──
  if (data.startsWith('addr_back_clist_')) {
    const parts  = data.split('_');
    const region = parts[3];
    const page   = parseInt(parts[4]);
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    const label = region === 'asia' ? 'Asia' : 'Europe';
    await sendOrEdit(chatId, userId,
      `📍 <b>${label}</b> — Select country:`,
      { reply_markup: buildCountryListKeyboard(region, page) }
    );
    return;
  }

  // ── addr_country_<key>: generate addresses for a country ──
  if (data.startsWith('addr_country_')) {
    const key    = data.slice(13);
    const region = REGION_COUNTRIES.asia.includes(key) ? 'asia' : 'europe';
    const cpage  = Math.floor(REGION_COUNTRIES[region].indexOf(key) / COUNTRIES_PER_PAGE);
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    const addrs = generateWorldAddresses(key, 3);
    const text  = addrs.map((a, i) => formatAddress(a, i + 1)).join('\n\n');
    await sendOrEdit(chatId, userId, text, {
      reply_markup: { inline_keyboard: [[
        { text: 'Generate Again', callback_data: `addr_again_${key}` },
        { text: '← Back',        callback_data: `addr_back_clist_${region}_${cpage}` },
      ]]},
    });
    return;
  }

  // ── addr_again_<key>: regenerate same country ──
  if (data.startsWith('addr_again_')) {
    const key    = data.slice(11);
    const region = REGION_COUNTRIES.asia.includes(key) ? 'asia' : 'europe';
    const cpage  = Math.floor(REGION_COUNTRIES[region].indexOf(key) / COUNTRIES_PER_PAGE);
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    const addrs = generateWorldAddresses(key, 3);
    const text  = addrs.map((a, i) => formatAddress(a, i + 1)).join('\n\n');
    await sendOrEdit(chatId, userId, text, {
      reply_markup: { inline_keyboard: [[
        { text: 'Generate Again', callback_data: `addr_again_${key}` },
        { text: '← Back',        callback_data: `addr_back_clist_${region}_${cpage}` },
      ]]},
    });
    return;
  }

  // ── back_main ──
  if (data === 'back_main') {
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    stopSession(userId);
    clearUserState(userId);
    await sendOrEdit(chatId, userId,
      `Halo, <b>${name}</b>! Pilih fitur di bawah.`,
      { reply_markup: mainMenu }
    );
    return;
  }

  // ── otp_back ──
  if (data === 'otp_back') {
    await bot.answerCallbackQuery(query.id);
    stopSession(userId);
    msgCache[userId] = msgId;
    await sendOrEdit(chatId, userId,
      `Halo, <b>${name}</b>! Pilih fitur di bawah.`,
      { reply_markup: mainMenu }
    );
    return;
  }

  // ── otp_refresh_<base32> ──
  if (data.startsWith('otp_refresh_')) {
    const base32 = data.slice(12);
    const sess   = sessions[userId];

    // Timer masih jalan = belum expired
    if (sess && sess.timer !== null) {
      const secs = secondsLeft();
      return bot.answerCallbackQuery(query.id, {
        text: `OTP masih aktif. Tunggu ${secs} detik lagi.`, show_alert: false,
      });
    }

    await bot.answerCallbackQuery(query.id, { text: 'Refreshed!' });
    msgCache[userId] = msgId;
    await startOtpSession(userId, chatId, base32);
    return;
  }

  // ── menu_ip ──
  if (data === 'menu_ip') {
    await bot.answerCallbackQuery(query.id);
    msgCache[userId] = msgId;
    await sendOrEdit(chatId, userId,
      `🌐 <b>Cek IP / ISP</b>\n\nKirim IP address atau domain yang ingin dicek.\n\n<i>Contoh:</i>\n<code>178.128.98.106</code>\n<code>google.com</code>`,
      { reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] } }
    );
    setUserState(userId, 'awaiting_ip');
    return;
  }

  await bot.answerCallbackQuery(query.id).catch(() => {});
});

// ─────────────────────────────────────────
//   MESSAGE — terima secret 2FA / IP lookup
// ─────────────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text   = msg.text.trim();

  if (!(await hasJoined(userId))) {
    return bot.sendMessage(chatId,
      `Untuk menggunakan bot ini, kamu harus join channel kami dulu.`,
      joinOpts
    );
  }

  // Hapus pesan user biar chat tetap rapi
  try { await bot.deleteMessage(chatId, msg.message_id); } catch (_) {}

  // ── State: awaiting_ip ──
  if (userState[userId] === 'awaiting_ip') {
    clearUserState(userId);
    const query = text.trim();
    // Reset state dulu biar tidak nyangkut

    await sendOrEdit(chatId, userId,
      `🌐 <b>Mengecek...</b> <code>${query}</code>`,
      { reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] } }
    );

    try {
      // Kalau domain, resolve dulu ke IP pakai ip-api
      const res = await axios.get(`http://ip-api.com/json/${encodeURIComponent(query)}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, {
        timeout: 8000,
      });
      const d = res.data;

      if (d.status === 'fail') {
        await sendOrEdit(chatId, userId,
          `❌ <b>Gagal mengecek:</b> <code>${query}</code>\n\n<i>${d.message || 'IP/domain tidak valid.'}</i>`,
          { reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] } }
        );
        return;
      }

      // Flag emoji dari country code
      const flag = d.countryCode
        ? d.countryCode.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
        : '';

      const mapsUrl = `https://www.google.com/maps?q=${d.lat},${d.lon}`;

      const result =
        `<b>IP Lookup Result</b>\n\n` +
        `Public IP   : <code>${d.query}</code>\n` +
        `ISP         : <code>${d.isp}</code>\n` +
        `Org         : <code>${d.org}</code>\n` +
        `ASN         : <code>${d.as}</code>\n` +
        `Country     : <code>${d.country} ${flag} (${d.countryCode})</code>\n` +
        `City        : <code>${d.city}</code>\n` +
        `Region      : <code>${d.regionName}</code>\n` +
        `Coordinates : <code>${d.lat}, ${d.lon}</code>\n` +
        `Timezone    : <code>${d.timezone}</code>\n` +
        `ZIP/Code    : <code>${d.zip || '-'}</code>\n\n` +
        `🌍 <a href="${mapsUrl}">Lihat di Google Maps</a>`;

      await sendOrEdit(chatId, userId, result, {
        reply_markup: { inline_keyboard: [[
          { text: '🔄 Cek Lagi',  callback_data: 'menu_ip'   },
          { text: '← Kembali',   callback_data: 'back_main' },
        ]]},
        disable_web_page_preview: true,
      });
    } catch (err) {
      await sendOrEdit(chatId, userId,
        `❌ <b>Error:</b> Gagal menghubungi server. Coba lagi.\n\n<i>${err.message}</i>`,
        { reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] } }
      );
    }
    return;
  }

  // ── State: awaiting_2fa ──
  if (userState[userId] === 'awaiting_2fa') {
    const input = text.toUpperCase().replace(/\s+/g, '');
    if (!isValid2FASecret(input)) {
      await sendOrEdit(chatId, userId,
        `Error: This is not 2FA Secret !\n\n<i>Coba lagi atau kembali ke menu.</i>`,
        { reply_markup: { inline_keyboard: [[{ text: '← Kembali', callback_data: 'back_main' }]] } }
      );
      return;
    }
    clearUserState(userId);
    await startOtpSession(userId, chatId, input);
    return;
  }

  // ── Tidak ada state — abaikan input random ──
  // User kirim teks tanpa klik menu apapun — tidak diproses
});

// ─────────────────────────────────────────
//   ERROR HANDLER
// ─────────────────────────────────────────

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

// ─────────────────────────────────────────
//   STARTUP
// ─────────────────────────────────────────
console.log('');
console.log('  2FA + Address Bot — started');
console.log(`  Bot     : @${BOT_USERNAME}`);
console.log(`  Owner   : ${OWNER_ID}`);
console.log(`  Channel : ${CHANNEL}`);
console.log('');
