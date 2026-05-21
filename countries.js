'use strict';
// countries.js — data alamat realistis per negara (Asia A-Z + Europe A-Z)
// Format setiap entry: { streets, city, province, postal, phone_prefix, country }

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randItem(arr)   { return arr[Math.floor(Math.random() * arr.length)]; }

const COUNTRIES = {

  // ═══════════════════════════════════════
  //   ASIA  (A-Z)
  // ═══════════════════════════════════════

  'Afghanistan': {
    country: 'Afghanistan',
    streets: ['Darulaman Rd', 'Zanbaq Sq', 'Shar-e-Naw St', 'Taimani Rd', 'Wazir Akbar Khan St'],
    city: 'Kabul', province: 'Kabul',
    postal: ['1001', '1003', '1005', '1007'],
    phone_prefix: '+93 70',
  },
  'Armenia': {
    country: 'Armenia',
    streets: ['Mashtots Ave', 'Tigranashen St', 'Abovyan St', 'Bagratunyats Ave', 'Komitas Ave'],
    city: 'Yerevan', province: 'Yerevan',
    postal: ['0001', '0002', '0010', '0019'],
    phone_prefix: '+374 91',
  },
  'Azerbaijan': {
    country: 'Azerbaijan',
    streets: ['Nizami St', 'Istiqlaliyyat St', 'Rasul Rza St', 'Fuzuli St', 'Heydar Aliyev Ave'],
    city: 'Baku', province: 'Baku',
    postal: ['AZ1000', 'AZ1001', 'AZ1010', 'AZ1022'],
    phone_prefix: '+994 50',
  },
  'Bahrain': {
    country: 'Bahrain',
    streets: ['Government Ave', 'Sheikh Hamad Causeway', 'King Faisal Hwy', 'Al Khalifa Ave', 'Muharraq Ave'],
    city: 'Manama', province: 'Capital',
    postal: ['317', '323', '411', '412'],
    phone_prefix: '+973 3',
  },
  'Bangladesh': {
    country: 'Bangladesh',
    streets: ['Mirpur Rd', 'Gulshan Ave', 'Dhanmondi Rd', 'Uttara Sector 3', 'Motijheel C/A'],
    city: 'Dhaka', province: 'Dhaka',
    postal: ['1000', '1200', '1205', '1212'],
    phone_prefix: '+880 1',
  },

  'Bhutan': {
    country: 'Bhutan',
    streets: ['Norzin Lam', 'Chhogyel Lam', 'Doebum Lam', 'Phendey Lam', 'Chang Lam'],
    city: 'Thimphu', province: 'Thimphu',
    postal: ['11001', '11002', '11003', '11004'],
    phone_prefix: '+975 17',
  },
  'Brunei': {
    country: 'Brunei',
    streets: ['Jln Tutong', 'Jln Gadong', 'Jln Kebangsaan', 'Jln Muara', 'Jln Sultan'],
    city: 'Bandar Seri Begawan', province: 'Brunei Muara',
    postal: ['BA1110', 'BA1311', 'BA3133', 'BC4115'],
    phone_prefix: '+673 8',
  },
  'Cambodia': {
    country: 'Cambodia',
    streets: ['Norodom Blvd', 'Monivong Blvd', 'Sihanouk Blvd', 'Preah Ang Duong St', 'Charles de Gaulle Blvd'],
    city: 'Phnom Penh', province: 'Phnom Penh',
    postal: ['12000', '12101', '12201', '12301'],
    phone_prefix: '+855 96',
  },
  'China': {
    country: 'China',
    streets: ['Wangfujing St', 'Chang\'an Ave', 'Zhongguancun St', 'Nanjing Rd', 'Huaihai Rd'],
    city: 'Beijing', province: 'Beijing',
    postal: ['100000', '100001', '100010', '200000'],
    phone_prefix: '+86 138',
  },
  'Georgia': {
    country: 'Georgia',
    streets: ['Rustaveli Ave', 'Agmashenebeli Ave', 'Chavchavadze Ave', 'Pekini Ave', 'Tsereteli Ave'],
    city: 'Tbilisi', province: 'Tbilisi',
    postal: ['0101', '0102', '0105', '0108'],
    phone_prefix: '+995 555',
  },

  'Hong Kong': {
    country: 'Hong Kong',
    streets: ['Nathan Rd', 'Hennessy Rd', 'Des Voeux Rd', 'Connaught Rd', 'Queen\'s Rd'],
    city: 'Hong Kong', province: 'Kowloon',
    postal: ['000000'],
    phone_prefix: '+852 6',
  },
  'India': {
    country: 'India',
    streets: ['Connaught Place', 'MG Road', 'Park Street', 'Anna Salai', 'Linking Rd'],
    city: 'New Delhi', province: 'Delhi',
    postal: ['110001', '110002', '110003', '400001'],
    phone_prefix: '+91 98',
  },
  'Indonesia': {
    country: 'Indonesia',
    streets: ['Jl. Sudirman No.', 'Jl. Thamrin No.', 'Jl. Gatot Subroto No.', 'Jl. Kuningan No.', 'Jl. HR Rasuna Said No.'],
    city: 'Jakarta', province: 'DKI Jakarta',
    postal: ['10110', '10220', '10330', '10440'],
    phone_prefix: '+62 812',
  },
  'Iran': {
    country: 'Iran',
    streets: ['Valiasr St', 'Enghelab Ave', 'Azadi Ave', 'Chamran Hwy', 'Mirdamad Blvd'],
    city: 'Tehran', province: 'Tehran',
    postal: ['1111111111', '1311111111', '1411111111', '1511111111'],
    phone_prefix: '+98 912',
  },
  'Iraq': {
    country: 'Iraq',
    streets: ['Karrada St', 'Saadoun St', 'Abu Nuwas St', 'Palestine St', 'Haifa St'],
    city: 'Baghdad', province: 'Baghdad',
    postal: ['10001', '10011', '10021', '10031'],
    phone_prefix: '+964 770',
  },
  'Israel': {
    country: 'Israel',
    streets: ['Rothschild Blvd', 'Dizengoff St', 'Ben Yehuda St', 'Allenby St', 'Jaffa Rd'],
    city: 'Tel Aviv', province: 'Tel Aviv',
    postal: ['6160101', '6100001', '9190401', '9190501'],
    phone_prefix: '+972 52',
  },
  'Japan': {
    country: 'Japan',
    streets: ['Shinjuku-dori', 'Omotesando', 'Takeshita St', 'Akihabara Electric Town', 'Ginza 4-chome'],
    city: 'Tokyo', province: 'Tokyo',
    postal: ['100-0001', '150-0001', '160-0001', '160-0022'],
    phone_prefix: '+81 90',
  },

  'Jordan': {
    country: 'Jordan',
    streets: ['Rainbow St', 'Zahran St', 'University St', 'Medina St', 'Gardens St'],
    city: 'Amman', province: 'Amman',
    postal: ['11118', '11121', '11183', '11190'],
    phone_prefix: '+962 79',
  },
  'Kazakhstan': {
    country: 'Kazakhstan',
    streets: ['Nurzhol Blvd', 'Kenesary St', 'Beibitshilik St', 'Respublika Ave', 'Kabanbay Batyr Ave'],
    city: 'Astana', province: 'Akmola',
    postal: ['010000', '010001', '010010', '010020'],
    phone_prefix: '+7 701',
  },
  'Kuwait': {
    country: 'Kuwait',
    streets: ['Arabian Gulf St', 'Hamad Al-Mubarak St', 'Salem Al-Mubarak St', 'Gulf Rd', 'Al-Sour St'],
    city: 'Kuwait City', province: 'Kuwait',
    postal: ['10001', '10002', '13001', '22001'],
    phone_prefix: '+965 9',
  },
  'Kyrgyzstan': {
    country: 'Kyrgyzstan',
    streets: ['Chui Ave', 'Erkindik Blvd', 'Manas Ave', 'Togolok Moldo St', 'Abdrakhmanov St'],
    city: 'Bishkek', province: 'Chuy',
    postal: ['720000', '720001', '720005', '720010'],
    phone_prefix: '+996 770',
  },
  'Laos': {
    country: 'Laos',
    streets: ['Lane Xang Ave', 'Setthathilat Rd', 'Samsenthai Rd', 'Nokeo Koummane Rd', 'Fa Ngum Rd'],
    city: 'Vientiane', province: 'Vientiane',
    postal: ['01000', '01001', '01002', '01160'],
    phone_prefix: '+856 20',
  },
  'Lebanon': {
    country: 'Lebanon',
    streets: ['Hamra St', 'Bliss St', 'Corniche Rd', 'Verdun St', 'Achrafieh St'],
    city: 'Beirut', province: 'Beirut',
    postal: ['1100', '1101', '1105', '2038'],
    phone_prefix: '+961 3',
  },
  'Malaysia': {
    country: 'Malaysia',
    streets: ['Jalan Bukit Bintang', 'Jalan Ampang', 'Jalan Raja Chulan', 'Jalan Tuanku Abdul Halim', 'Jalan Imbi'],
    city: 'Kuala Lumpur', province: 'Wilayah Persekutuan',
    postal: ['50000', '50088', '50200', '50450'],
    phone_prefix: '+60 11',
  },
  'Maldives': {
    country: 'Maldives',
    streets: ['Majeedhee Magu', 'Orchid Magu', 'Sosun Magu', 'Fareedhee Magu', 'Boduthakurufaanu Magu'],
    city: 'Malé', province: 'Malé',
    postal: ['20002', '20026', '20095', '20077'],
    phone_prefix: '+960 9',
  },

  'Mongolia': {
    country: 'Mongolia',
    streets: ['Peace Ave', 'United Nations St', 'Chingis Ave', 'Olympic St', 'Sambuu St'],
    city: 'Ulaanbaatar', province: 'Ulaanbaatar',
    postal: ['14210', '14200', '15160', '16050'],
    phone_prefix: '+976 99',
  },
  'Myanmar': {
    country: 'Myanmar',
    streets: ['Pyay Rd', 'Insein Rd', 'Inya Rd', 'Kabar Aye Pagoda Rd', 'University Ave'],
    city: 'Yangon', province: 'Yangon',
    postal: ['11181', '11221', '11041', '11091'],
    phone_prefix: '+95 9',
  },
  'Nepal': {
    country: 'Nepal',
    streets: ['New Rd', 'Durbar Marg', 'Kantipath', 'Maharajgunj Rd', 'Lazimpat Rd'],
    city: 'Kathmandu', province: 'Bagmati',
    postal: ['44600', '44601', '44602', '44610'],
    phone_prefix: '+977 98',
  },
  'Oman': {
    country: 'Oman',
    streets: ['Sultan Qaboos St', 'Al Wattayah St', 'Muttrah Corniche', 'Al Khuwair St', 'Al Ghubra St'],
    city: 'Muscat', province: 'Muscat',
    postal: ['100', '112', '113', '115'],
    phone_prefix: '+968 92',
  },
  'Pakistan': {
    country: 'Pakistan',
    streets: ['Constitution Ave', 'Jinnah Ave', 'Kashmir Hwy', 'Murree Rd', 'GT Road'],
    city: 'Islamabad', province: 'Islamabad',
    postal: ['44000', '44010', '44020', '44050'],
    phone_prefix: '+92 300',
  },
  'Philippines': {
    country: 'Philippines',
    streets: ['Ayala Ave', 'EDSA', 'Roxas Blvd', 'Ortigas Ave', 'Commonwealth Ave'],
    city: 'Manila', province: 'Metro Manila',
    postal: ['1000', '1002', '1008', '1600'],
    phone_prefix: '+63 917',
  },
  'Qatar': {
    country: 'Qatar',
    streets: ['Corniche St', 'Al Waab St', 'C Ring Rd', 'D Ring Rd', 'Al Sadd St'],
    city: 'Doha', province: 'Ad Dawhah',
    postal: ['0000'],
    phone_prefix: '+974 5',
  },
  'Saudi Arabia': {
    country: 'Saudi Arabia',
    streets: ['King Fahd Rd', 'Tahlia St', 'Olaya St', 'King Abdullah Rd', 'Prince Sultan Rd'],
    city: 'Riyadh', province: 'Riyadh',
    postal: ['11564', '11432', '12211', '12244'],
    phone_prefix: '+966 50',
  },
  'Singapore': {
    country: 'Singapore',
    streets: ['Orchard Rd', 'Raffles Place', 'Shenton Way', 'Robinson Rd', 'Cecil St'],
    city: 'Singapore', province: 'Central',
    postal: ['238823', '048621', '068897', '069535'],
    phone_prefix: '+65 9',
  },
  'South Korea': {
    country: 'South Korea',
    streets: ['Gangnam-daero', 'Teheran-ro', 'Sejong-daero', 'Eulji-ro', 'Bukchon-ro'],
    city: 'Seoul', province: 'Seoul',
    postal: ['06000', '06100', '04524', '03000'],
    phone_prefix: '+82 10',
  },

  'Sri Lanka': {
    country: 'Sri Lanka',
    streets: ['Galle Rd', 'Duplication Rd', 'Baseline Rd', 'High Level Rd', 'Kandy Rd'],
    city: 'Colombo', province: 'Western',
    postal: ['00100', '00200', '00300', '00500'],
    phone_prefix: '+94 77',
  },
  'Taiwan': {
    country: 'Taiwan',
    streets: ['Zhongxiao E Rd', 'Ren\'ai Rd', 'Xinyi Rd', 'Dunhua S Rd', 'Fuxing S Rd'],
    city: 'Taipei', province: 'Taipei',
    postal: ['100', '104', '106', '110'],
    phone_prefix: '+886 9',
  },
  'Thailand': {
    country: 'Thailand',
    streets: ['Sukhumvit Rd', 'Silom Rd', 'Sathorn Rd', 'Wireless Rd', 'Ratchadamri Rd'],
    city: 'Bangkok', province: 'Bangkok',
    postal: ['10110', '10120', '10330', '10500'],
    phone_prefix: '+66 81',
  },
  'Turkey': {
    country: 'Turkey',
    streets: ['İstiklal Caddesi', 'Bağdat Caddesi', 'Nispetiye Caddesi', 'Abdi İpekçi Caddesi', 'Barbaros Blvd'],
    city: 'Istanbul', province: 'Istanbul',
    postal: ['34000', '34100', '34200', '34400'],
    phone_prefix: '+90 532',
  },
  'United Arab Emirates': {
    country: 'United Arab Emirates',
    streets: ['Sheikh Zayed Rd', 'Al Wasl Rd', 'Jumeirah Beach Rd', 'Al Maktoum Rd', 'Corniche Rd'],
    city: 'Dubai', province: 'Dubai',
    postal: ['00000'],
    phone_prefix: '+971 50',
  },
  'Uzbekistan': {
    country: 'Uzbekistan',
    streets: ['Amir Temur Ave', 'Islam Karimov St', 'Mustaqillik Ave', 'Navoi Ave', 'Chilanzar Rd'],
    city: 'Tashkent', province: 'Tashkent',
    postal: ['100000', '100001', '100010', '100100'],
    phone_prefix: '+998 90',
  },
  'Vietnam': {
    country: 'Vietnam',
    streets: ['Nguyen Hue Blvd', 'Le Loi St', 'Dong Khoi St', 'Ham Nghi St', 'Tran Hung Dao St'],
    city: 'Ho Chi Minh City', province: 'Ho Chi Minh',
    postal: ['700000', '700100', '700200', '710000'],
    phone_prefix: '+84 90',
  },

  // ═══════════════════════════════════════
  //   EUROPE  (A-Z)
  // ═══════════════════════════════════════

  'Albania': {
    country: 'Albania',
    streets: ['Rruga Ismail Qemali', 'Bulevardi Dëshmorët e Kombit', 'Rruga e Kavajës', 'Rruga Myslym Shyri', 'Rruga Abdyl Frashëri'],
    city: 'Tirana', province: 'Tirana',
    postal: ['1001', '1002', '1003', '1010'],
    phone_prefix: '+355 69',
  },
  'Andorra': {
    country: 'Andorra',
    streets: ['Av. Meritxell', 'Av. Carlemany', 'Carrer Major', 'Carrer La Vall', 'Av. Fiter i Rossell'],
    city: 'Andorra la Vella', province: 'Andorra la Vella',
    postal: ['AD500', 'AD510', 'AD520', 'AD400'],
    phone_prefix: '+376 3',
  },
  'Austria': {
    country: 'Austria',
    streets: ['Kärntner Straße', 'Mariahilfer Straße', 'Graben', 'Ringstraße', 'Naschmarkt'],
    city: 'Vienna', province: 'Vienna',
    postal: ['1010', '1020', '1030', '1040'],
    phone_prefix: '+43 664',
  },

  'Belarus': {
    country: 'Belarus',
    streets: ['Independence Ave', 'Lenina St', 'Karl Marx St', 'Pervomayskaya St', 'Nemiga St'],
    city: 'Minsk', province: 'Minsk',
    postal: ['220000', '220004', '220030', '220036'],
    phone_prefix: '+375 29',
  },
  'Belgium': {
    country: 'Belgium',
    streets: ['Rue Neuve', 'Avenue Louise', 'Boulevard Anspach', 'Rue du Midi', 'Chaussée de Charleroi'],
    city: 'Brussels', province: 'Brussels',
    postal: ['1000', '1050', '1060', '1070'],
    phone_prefix: '+32 477',
  },
  'Bosnia and Herzegovina': {
    country: 'Bosnia and Herzegovina',
    streets: ['Ferhadija St', 'Titova St', 'Maršala Tita', 'Branilaca Sarajeva St', 'Obala Kulina Bana'],
    city: 'Sarajevo', province: 'Sarajevo Canton',
    postal: ['71000', '71100', '71120', '71210'],
    phone_prefix: '+387 61',
  },
  'Bulgaria': {
    country: 'Bulgaria',
    streets: ['Vitosha Blvd', 'Tsar Osvoboditel Blvd', 'Stamboliyski Blvd', 'Slivnitsa Blvd', 'Cherni Vrah Blvd'],
    city: 'Sofia', province: 'Sofia',
    postal: ['1000', '1100', '1111', '1404'],
    phone_prefix: '+359 88',
  },
  'Croatia': {
    country: 'Croatia',
    streets: ['Ilica', 'Frankopanska', 'Gajeva', 'Masarykova', 'Trg bana Jelačića'],
    city: 'Zagreb', province: 'Zagreb',
    postal: ['10000', '10001', '10010', '10020'],
    phone_prefix: '+385 91',
  },
  'Cyprus': {
    country: 'Cyprus',
    streets: ['Makarios Ave', 'Ledra St', 'Archbishop Kyprianou St', 'Stasikratous St', 'Grivas Dighenis Ave'],
    city: 'Nicosia', province: 'Nicosia',
    postal: ['1010', '1011', '1065', '1101'],
    phone_prefix: '+357 99',
  },
  'Czech Republic': {
    country: 'Czech Republic',
    streets: ['Václavské náměstí', 'Na Příkopě', 'Národní třída', 'Spálená', 'Wenceslas Square'],
    city: 'Prague', province: 'Prague',
    postal: ['110 00', '120 00', '130 00', '140 00'],
    phone_prefix: '+420 6',
  },
  'Denmark': {
    country: 'Denmark',
    streets: ['Strøget', 'Nørrebrogade', 'Vesterbrogade', 'Amagerbrogade', 'Gothersgade'],
    city: 'Copenhagen', province: 'Capital Region',
    postal: ['1000', '1100', '1200', '2000'],
    phone_prefix: '+45 20',
  },
  'Estonia': {
    country: 'Estonia',
    streets: ['Viru St', 'Narva mnt', 'Pärnu mnt', 'Liivalaia', 'Gonsiori'],
    city: 'Tallinn', province: 'Harju',
    postal: ['10111', '10112', '10143', '10145'],
    phone_prefix: '+372 5',
  },
  'Finland': {
    country: 'Finland',
    streets: ['Mannerheimintie', 'Aleksanterinkatu', 'Esplanadi', 'Pohjoisesplanadi', 'Erottajankatu'],
    city: 'Helsinki', province: 'Uusimaa',
    postal: ['00100', '00120', '00130', '00140'],
    phone_prefix: '+358 40',
  },
  'France': {
    country: 'France',
    streets: ['Champs-Élysées', 'Rue de Rivoli', 'Bd Haussmann', 'Rue du Faubourg Saint-Honoré', 'Rue Saint-Antoine'],
    city: 'Paris', province: 'Île-de-France',
    postal: ['75001', '75002', '75008', '75015'],
    phone_prefix: '+33 6',
  },

  'Germany': {
    country: 'Germany',
    streets: ['Kurfürstendamm', 'Unter den Linden', 'Friedrichstraße', 'Potsdamer Platz', 'Alexanderplatz'],
    city: 'Berlin', province: 'Berlin',
    postal: ['10115', '10117', '10178', '10785'],
    phone_prefix: '+49 151',
  },
  'Greece': {
    country: 'Greece',
    streets: ['Ermou St', 'Syntagma Square', 'Stadiou St', 'Panepistimiou Ave', 'Kifissias Ave'],
    city: 'Athens', province: 'Attica',
    postal: ['10431', '10557', '10563', '11521'],
    phone_prefix: '+30 69',
  },
  'Hungary': {
    country: 'Hungary',
    streets: ['Andrássy út', 'Váci utca', 'Rákóczi út', 'Nagy körút', 'Bajcsy-Zsilinszky út'],
    city: 'Budapest', province: 'Budapest',
    postal: ['1011', '1051', '1061', '1071'],
    phone_prefix: '+36 30',
  },
  'Iceland': {
    country: 'Iceland',
    streets: ['Laugavegur', 'Skólavörðustígur', 'Bankastræti', 'Austurstræti', 'Hverfisgata'],
    city: 'Reykjavik', province: 'Capital Region',
    postal: ['101', '102', '103', '104'],
    phone_prefix: '+354 8',
  },
  'Ireland': {
    country: 'Ireland',
    streets: ['O\'Connell St', 'Grafton St', 'Nassau St', 'Henry St', 'Baggot St'],
    city: 'Dublin', province: 'Leinster',
    postal: ['D01', 'D02', 'D04', 'D06'],
    phone_prefix: '+353 87',
  },
  'Italy': {
    country: 'Italy',
    streets: ['Via Condotti', 'Via Veneto', 'Corso Vittorio Emanuele', 'Via del Corso', 'Via Nazionale'],
    city: 'Rome', province: 'Lazio',
    postal: ['00100', '00184', '00186', '00192'],
    phone_prefix: '+39 340',
  },
  'Latvia': {
    country: 'Latvia',
    streets: ['Brīvības iela', 'Elizabetes iela', 'Tērbatas iela', 'Stabu iela', 'Krišjāņa Valdemāra iela'],
    city: 'Riga', province: 'Riga',
    postal: ['LV-1001', 'LV-1010', 'LV-1011', 'LV-1050'],
    phone_prefix: '+371 2',
  },
  'Liechtenstein': {
    country: 'Liechtenstein',
    streets: ['Herrengasse', 'Städtle', 'Feldkircher Straße', 'Austraße', 'Churerstraße'],
    city: 'Vaduz', province: 'Vaduz',
    postal: ['9490', '9491', '9492', '9493'],
    phone_prefix: '+423 79',
  },
  'Lithuania': {
    country: 'Lithuania',
    streets: ['Gedimino pr.', 'Pilies g.', 'Vokiečių g.', 'Didžioji g.', 'Šventaragio g.'],
    city: 'Vilnius', province: 'Vilnius',
    postal: ['01001', '01100', '01124', '03101'],
    phone_prefix: '+370 6',
  },
  'Luxembourg': {
    country: 'Luxembourg',
    streets: ['Grand-Rue', 'Avenue de la Liberté', 'Rue Aldringen', 'Rue du Fossé', 'Boulevard Royal'],
    city: 'Luxembourg City', province: 'Luxembourg',
    postal: ['L-1111', 'L-1411', 'L-1511', 'L-2130'],
    phone_prefix: '+352 621',
  },
  'Malta': {
    country: 'Malta',
    streets: ['Republic St', 'Merchant St', 'Old Bakery St', 'Triq il-Kbira', 'Tower Rd'],
    city: 'Valletta', province: 'Valletta',
    postal: ['VLT 1110', 'VLT 1111', 'VLT 1112', 'VLT 1011'],
    phone_prefix: '+356 79',
  },

  'Moldova': {
    country: 'Moldova',
    streets: ['Ștefan cel Mare Blvd', 'Bănulescu-Bodoni St', 'Pușkin St', 'Armenească St', 'Columna St'],
    city: 'Chișinău', province: 'Chișinău',
    postal: ['MD-2001', 'MD-2012', 'MD-2060', 'MD-2079'],
    phone_prefix: '+373 69',
  },
  'Monaco': {
    country: 'Monaco',
    streets: ['Avenue des Spélugues', 'Boulevard des Moulins', 'Avenue Princesse Grace', 'Rue Grimaldi', 'Avenue d\'Ostende'],
    city: 'Monaco', province: 'Monaco',
    postal: ['98000'],
    phone_prefix: '+377 6',
  },
  'Montenegro': {
    country: 'Montenegro',
    streets: ['Slobode St', 'Vaka Đurovića Blvd', 'Moskovska St', 'Jovana Tomaševića St', 'Bulevar Revolucije'],
    city: 'Podgorica', province: 'Podgorica',
    postal: ['81000', '81001', '81101', '81110'],
    phone_prefix: '+382 67',
  },
  'Netherlands': {
    country: 'Netherlands',
    streets: ['Kalverstraat', 'Damrak', 'Leidsestraat', 'Herengracht', 'Keizersgracht'],
    city: 'Amsterdam', province: 'North Holland',
    postal: ['1011', '1012', '1015', '1016'],
    phone_prefix: '+31 6',
  },
  'North Macedonia': {
    country: 'North Macedonia',
    streets: ['Macedonia Square', 'Dame Gruev St', 'Bul. Partizanski Odredi', 'Bul. Ilinden', 'Vasil Gjorgov Blvd'],
    city: 'Skopje', province: 'Skopje',
    postal: ['1000', '1001', '1020', '1030'],
    phone_prefix: '+389 70',
  },
  'Norway': {
    country: 'Norway',
    streets: ['Karl Johans gate', 'Bogstadveien', 'Aker Brygge', 'Grünerløkka', 'Torggata'],
    city: 'Oslo', province: 'Oslo',
    postal: ['0150', '0152', '0158', '0250'],
    phone_prefix: '+47 9',
  },
  'Poland': {
    country: 'Poland',
    streets: ['Nowy Świat', 'Krakowskie Przedmieście', 'Marszałkowska', 'Aleje Jerozolimskie', 'Chmielna'],
    city: 'Warsaw', province: 'Masovian',
    postal: ['00-001', '00-020', '00-100', '00-950'],
    phone_prefix: '+48 500',
  },
  'Portugal': {
    country: 'Portugal',
    streets: ['Av. da Liberdade', 'Rua Augusta', 'Rua do Ouro', 'Av. Almirante Reis', 'Rua da Prata'],
    city: 'Lisbon', province: 'Lisbon',
    postal: ['1000-001', '1000-100', '1100-001', '1200-001'],
    phone_prefix: '+351 91',
  },
  'Romania': {
    country: 'Romania',
    streets: ['Calea Victoriei', 'Bd. Unirii', 'Bd. Magheru', 'Str. Lipscani', 'Calea Dorobanților'],
    city: 'Bucharest', province: 'Bucharest',
    postal: ['010011', '010012', '020021', '020022'],
    phone_prefix: '+40 72',
  },
  'San Marino': {
    country: 'San Marino',
    streets: ['Contrada del Collegio', 'Contrada del Pianello', 'Via Eugippo', 'Via Napoleone Bonaparte', 'Strada della Rocca'],
    city: 'San Marino City', province: 'San Marino',
    postal: ['47890', '47891', '47892', '47893'],
    phone_prefix: '+378 0',
  },
  'Serbia': {
    country: 'Serbia',
    streets: ['Knez Mihailova', 'Terazije', 'Makedonska', 'Kralja Milana', 'Knjaževačka'],
    city: 'Belgrade', province: 'Belgrade',
    postal: ['11000', '11001', '11010', '11030'],
    phone_prefix: '+381 62',
  },
  'Slovakia': {
    country: 'Slovakia',
    streets: ['Obchodná', 'Laurinská', 'Panská', 'Ventúrska', 'Michalská'],
    city: 'Bratislava', province: 'Bratislava',
    postal: ['811 01', '811 02', '811 03', '811 04'],
    phone_prefix: '+421 9',
  },

  'Slovenia': {
    country: 'Slovenia',
    streets: ['Čopova ulica', 'Kongresni trg', 'Prešernov trg', 'Mestni trg', 'Stari trg'],
    city: 'Ljubljana', province: 'Ljubljana',
    postal: ['1000', '1001', '1110', '1260'],
    phone_prefix: '+386 30',
  },
  'Spain': {
    country: 'Spain',
    streets: ['Gran Vía', 'Paseo de Castellana', 'Calle Serrano', 'Puerta del Sol', 'Paseo de Recoletos'],
    city: 'Madrid', province: 'Madrid',
    postal: ['28001', '28002', '28010', '28013'],
    phone_prefix: '+34 6',
  },
  'Sweden': {
    country: 'Sweden',
    streets: ['Drottninggatan', 'Kungsgatan', 'Sveavägen', 'Hamngatan', 'Birger Jarlsgatan'],
    city: 'Stockholm', province: 'Stockholm',
    postal: ['111 21', '111 35', '111 52', '114 34'],
    phone_prefix: '+46 70',
  },
  'Switzerland': {
    country: 'Switzerland',
    streets: ['Bahnhofstrasse', 'Rennweg', 'Limmatquai', 'Niederdorfstrasse', 'Talstrasse'],
    city: 'Zurich', province: 'Zurich',
    postal: ['8001', '8002', '8003', '8004'],
    phone_prefix: '+41 76',
  },
  'Ukraine': {
    country: 'Ukraine',
    streets: ['Khreshchatyk St', 'Volodymyrska St', 'Velyka Vasylkivska St', 'Antonovycha St', 'Bohdana Khmelnytskoho St'],
    city: 'Kyiv', province: 'Kyiv',
    postal: ['01001', '01004', '01010', '02000'],
    phone_prefix: '+380 67',
  },
  'United Kingdom': {
    country: 'United Kingdom',
    streets: ['Oxford St', 'Baker St', 'Regent St', 'Bond St', 'The Strand'],
    city: 'London', province: 'England',
    postal: ['W1A 1AA', 'EC1A 1BB', 'SW1A 1AA', 'WC2N 5DU'],
    phone_prefix: '+44 7',
  },
  'Vatican City': {
    country: 'Vatican City',
    streets: ['Via della Conciliazione', 'Piazza San Pietro', 'Via Paolo VI', 'Viale Vaticano', 'Via di Porta Angelica'],
    city: 'Vatican City', province: 'Vatican City',
    postal: ['00120'],
    phone_prefix: '+39 06',
  },

}; // end COUNTRIES

// ─────────────────────────────────────────
//   REGIONS
// ─────────────────────────────────────────

const REGIONS = {
  'Asia': [
    'Afghanistan','Armenia','Azerbaijan','Bahrain','Bangladesh','Bhutan','Brunei',
    'Cambodia','China','Georgia','Hong Kong','India','Indonesia','Iran','Iraq',
    'Israel','Japan','Jordan','Kazakhstan','Kuwait','Kyrgyzstan','Laos','Lebanon',
    'Malaysia','Maldives','Mongolia','Myanmar','Nepal','Oman','Pakistan','Philippines',
    'Qatar','Saudi Arabia','Singapore','South Korea','Sri Lanka','Taiwan','Thailand',
    'Turkey','United Arab Emirates','Uzbekistan','Vietnam',
  ],
  'Europe': [
    'Albania','Andorra','Austria','Belarus','Belgium','Bosnia and Herzegovina',
    'Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia','Finland',
    'France','Germany','Greece','Hungary','Iceland','Ireland','Italy','Latvia',
    'Liechtenstein','Lithuania','Luxembourg','Malta','Moldova','Monaco','Montenegro',
    'Netherlands','North Macedonia','Norway','Poland','Portugal','Romania',
    'San Marino','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland',
    'Ukraine','United Kingdom','Vatican City',
  ],
};

// ─────────────────────────────────────────
//   GENERATE ADDRESS
// ─────────────────────────────────────────

function generateOneAddress(countryName) {
  const c = COUNTRIES[countryName];
  if (!c) return null;
  const num    = Math.floor(Math.random() * 150) + 1;
  const street = c.streets[Math.floor(Math.random() * c.streets.length)] + ' ' + num;
  const postal = c.postal[Math.floor(Math.random() * c.postal.length)];
  const phone  = `${c.phone_prefix}${Math.floor(1000000 + Math.random() * 9000000)}`;
  return {
    street,
    city    : c.city,
    province: c.province,
    postal,
    phone,
    country : c.country,
    full    : `${street}, ${c.city}, ${c.province}, ${postal}`,
  };
}

module.exports = { COUNTRIES, REGIONS, generateOneAddress };
