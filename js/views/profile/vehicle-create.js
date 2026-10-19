// =========================================================
// MOTOCLUBE
// Minha Garagem — Cadastrar Veículo
// Catálogo nacional ampliado — revisão 2026
// Bottom Sheet empilhado / Greaser Industrial Premium
// =========================================================

import { openBottomSheet } from "../../components/bottom-sheet.js";
import { createSelectDropdown, updateSelectOptions } from "../../components/dropdown.js";
import { icon } from "../../icons/icons.js";
import { showToast } from "../../components/toast.js";
import { createVehicle } from "../../services/vehicles.js";
import { events } from "../../core/events.js";

const VEHICLE_CATALOG = Object.freeze({
    motorcycle: {
        label: "Motocicleta",
        brands: {
            Honda: [
                "CG 125 Fan", "CG 125 Titan", "CG 150 Fan", "CG 150 Titan", "CG 160 Start", "CG 160 Fan", "CG 160 Titan",
                "Biz 100", "Biz 110i", "Biz 125", "Pop 100", "Pop 110i", "Elite 125", "PCX 150", "PCX 160", "ADV 150", "ADV 160",
                "SH 150i", "SH 300i", "CB 250F Twister", "CB 300F Twister", "CB 300F Hornet", "CB 500F", "CB500 Hornet", "CB 500X", "NX 500",
                "CB 650F", "CB 650R", "CB 750 Hornet", "CB 1000R", "CBR 500R", "CBR 600F", "CBR 600RR", "CBR 650R", "CBR 1000RR Fireblade", "CBR 1000RR-R Fireblade",
                "Hornet 600", "Hornet 900", "XRE 190", "XRE 300", "XRE 300 Sahara", "XR 250 Tornado", "XR 300L Tornado", "NXR 125 Bros", "NXR 150 Bros", "NXR 160 Bros",
                "CRF 230F", "CRF 250F", "CRF 250R", "CRF 450R", "CRF 450RX", "Africa Twin 1000", "Africa Twin 1100", "Africa Twin 1100 Adventure Sports", "Africa Twin 1100 Adventure Sports ES",
                "NC 700X", "NC 750X", "XL 750 Transalp", "CTX 700", "CTX 1300", "Shadow 600", "Shadow 750", "Rebel 500", "Gold Wing 1500", "Gold Wing 1800", "GL 1800 Gold Wing",
                "VFR 800", "VFR 1200F", "CB 1300 Super Four", "VTX 1800", "ST 1300 Pan European"
            ],
            Yamaha: [
                "YBR 125", "YBR 125 Factor", "Factor 125", "Factor 150", "Fazer 150", "Fazer FZ15", "Fazer FZ25", "YS 250 Fazer", "Fazer 250",
                "Crosser 150", "XTZ 125", "XTZ 150 Crosser", "XTZ 250 Lander", "Ténéré 250", "Ténéré 700", "TTR 230", "WR 250F",
                "NMax 160", "Neo 115", "Neo 125", "Fluo 125", "XMAX 250", "XMAX 300", "XJ6", "XJ6N", "XJ6F",
                "MT-03", "MT-07", "MT-09", "MT-09 SP", "MT-10", "MT-10 SP", "R3", "R15", "R15 ABS", "R7", "R1", "R1M",
                "XSR 700", "XSR 900", "Tracer 700", "Tracer 700 GT", "Tracer 900", "Tracer 900 GT", "Tracer 9 GT", "Super Ténéré 1200", "MT-01", "MT-125", "YZF-R15", "YZF-R3", "XT 660R", "XT 660Z Ténéré",
                "Midnight Star 950", "Midnight Star 1300", "Drag Star 650", "Drag Star 1100", "Virago 535", "Virago 750", "Virago 1100", "V-Max 1200", "V-Max 1700"
            ],
            Suzuki: [
                "Yes 125", "Intruder 125", "Intruder 250", "Burgman 125", "Burgman 400", "Burgman 650", "Address 110", "GS 500", "Bandit 600", "Bandit 650", "Bandit 1200", "Bandit 1250",
                "GSX 750F", "GSX 1250FA", "GSX-R 750", "GSX-R 1000", "GSX-S 750", "GSX-S 1000", "GSX-S1000GX", "GSX-S1000GT", "Hayabusa",
                "V-Strom 650", "V-Strom 650 XT", "V-Strom 800", "V-Strom 800DE", "V-Strom 1000", "V-Strom 1050", "V-Strom 1050XT", "SV 650", "Gladius 650",
                "Boulevard M800", "Boulevard M109R", "Boulevard C1500", "Boulevard C1800R", "Savage LS650", "DR 650", "DR-Z 400", "DR-Z 400E", "RM-Z 250", "RM-Z 450"
            ],
            Kawasaki: [
                "Ninja 250", "Ninja 300", "Ninja 400", "Ninja 500", "Ninja 650", "Ninja 1000", "Ninja 1000SX", "Ninja ZX-6R", "Ninja ZX-10R", "Ninja H2", "Ninja H2 SX", "Ninja ZX-14R",
                "Z300", "Z400", "Z500", "Z650", "Z750", "Z800", "Z900", "Z900RS", "Z1000", "Z1000SX", "Versys-X 300", "Versys 650", "Versys 1000",
                "KLR 650", "KLX 230", "KLX 300", "KLX 450R", "KX 250", "KX 450", "Eliminator 500", "Vulcan 500", "Vulcan 750", "Vulcan 900 Classic", "Vulcan S", "Vulcan 1500", "Vulcan 1600", "Vulcan 1700 Voyager",
                "Concours 14", "GTR 1400", "Versys 1100", "Z H2", "Z H2 SE"
            ],
            BMW: [
                "G 310 R", "G 310 GS", "G 310 RR", "F 700 GS", "F 750 GS", "F 800 GS", "F 850 GS", "F 850 GS Adventure", "F 900 GS", "F 900 GS Adventure", "F 900 R", "F 900 XR",
                "R 1200 GS", "R 1200 GS Adventure", "R 1250 GS", "R 1250 GS Adventure", "R 1300 GS", "R 1300 GS Adventure", "R 1300 GS Adventure ASA", "R 1250 RT", "R 1300 RT",
                "R 18", "R 18 Classic", "R 18 B", "R 18 Transcontinental", "R nineT", "R nineT Scrambler", "R nineT Pure", "R nineT Urban G/S",
                "S 1000 R", "S 1000 RR", "S 1000 XR", "M 1000 R", "M 1000 RR", "M 1000 XR", "K 1200 GT", "K 1300 S", "K 1600 B", "K 1600 GT", "K 1600 GTL", "K 1600 Grand America",
                "C 400 GT", "C 400 X", "CE 04"
            ],
            Ducati: [
                "Scrambler Icon", "Scrambler Full Throttle", "Scrambler Nightshift", "Scrambler Desert Sled", "Scrambler 1100", "Scrambler 1100 Sport", "Monster", "Monster 821", "Monster 937", "Monster SP",
                "Diavel 1260", "Diavel V4", "XDiavel", "XDiavel S", "Panigale V2", "Panigale V4", "Panigale V4 S", "Streetfighter V2", "Streetfighter V4", "Streetfighter V4 S",
                "Multistrada 950", "Multistrada V2", "Multistrada V2 S", "Multistrada V4", "Multistrada V4 S", "Multistrada V4 Rally", "Multistrada V4 Pikes Peak", "Hypermotard 950", "Hypermotard 950 SP", "DesertX", "DesertX Rally"
            ],
            Triumph: [
                "Speed 400", "Scrambler 400 X", "Scrambler 400 XC", "Speed Twin 900", "Speed Twin 1200", "Speed Twin 1200 RS", "Street Twin", "Street Scrambler", "Street Cup",
                "Trident 660", "Street Triple 675", "Street Triple 765", "Street Triple R", "Street Triple RS", "Daytona 675", "Daytona 660", "Daytona 765",
                "Tiger Sport 660", "Tiger Sport 800", "Tiger 800", "Tiger 900", "Tiger 900 GT", "Tiger 900 Rally", "Tiger 1200", "Tiger 1200 GT Pro", "Tiger 1200 Rally Pro",
                "Bonneville T100", "Bonneville T120", "Bonneville Bobber", "Bonneville Speedmaster", "Scrambler 900", "Scrambler 1200 X", "Scrambler 1200 XE", "Thruxton 1200", "Rocket 3", "Rocket 3 GT", "Rocket 3 R"
            ],
            Royal_Enfield: [
                "Hunter 350", "Classic 350", "Classic 500", "Bullet 350", "Bullet 500", "Meteor 350", "Super Meteor 650", "Classic 650", "Shotgun 650", "Bear 650", "Bear 650",
                "Interceptor 650", "Continental GT 650", "Himalayan 411", "Himalayan 450", "Scram 411", "Scram 440", "Thunderbird 350", "Thunderbird 500", "Electra 350"
            ],
            Harley_Davidson: [
                "Street 750", "Street Rod", "Iron 883", "Forty-Eight", "Forty-Eight Special", "Sportster 1200 Custom", "Sportster 1200 Iron", "Nightster", "Nightster Special", "Sportster S",
                "Street Bob", "Street Bob 114", "Low Rider", "Low Rider S", "Low Rider ST", "Fat Bob", "Fat Bob 114", "Fat Boy", "Fat Boy 114", "Breakout", "Breakout 117",
                "Heritage Classic", "Road King", "Road King Special", "Electra Glide", "Electra Glide Ultra Limited", "Street Glide", "Street Glide Special", "Street Glide Limited", "Street Glide Ultra",
                "Road Glide", "Road Glide Custom", "Road Glide Special", "Road Glide Limited", "Ultra Limited", "Pan America 1250", "Pan America 1250 Special", "CVO Street Glide", "CVO Road Glide", "LiveWire"
            ],
            Indian: ["Scout", "Scout Sixty", "Scout Bobber", "Scout Bobber Sixty", "Chief", "Chief Dark Horse", "Super Chief Limited", "Sport Chief", "Chieftain", "Chieftain Dark Horse", "Roadmaster", "Roadmaster Dark Horse", "Pursuit", "FTR 1200", "FTR Sport"],
            Moto_Guzzi: ["V7 Stone", "V7 Special", "V7 Racer", "V85 TT", "V85 TT Travel", "V100 Mandello", "V100 Mandello S", "California 1400", "Audace", "Eldorado", "Stelvio 1200", "Griso 1200", "Breva 750", "Breva 1100"],
            Aprilia: ["SR 160", "SR GT 200", "Tuono 125", "Tuono 660", "Tuono 660 Factory", "RS 125", "RS 660", "RSV4", "Tuono V4", "Shiver 750", "Dorsoduro 900", "CapoNord 1200", "Caponord 1200 Rally", "Mana 850"],
            KTM: ["Duke 125", "Duke 200", "Duke 250", "Duke 390", "Duke 790", "Duke 890", "Duke 990", "Duke 1290", "390 Adventure", "790 Adventure", "890 Adventure", "1290 Super Adventure", "690 Enduro R", "690 SMC R", "RC 200", "RC 390", "RC 8C", "450 EXC-F", "500 EXC-F", "890 SMT", "1390 Super Duke R"],
            Husqvarna: ["Svartpilen 125", "Svartpilen 200", "Svartpilen 250", "Svartpilen 401", "Vitpilen 401", "Vitpilen 701", "Norden 901", "Norden 901 Expedition", "Svartpilen 801", "Vitpilen 801", "701 Enduro", "701 Supermoto", "FE 250", "FE 350", "FE 450", "FE 501"],
            GasGas: ["SM 700", "ES 700", "EC 250", "EC 300", "EC 350F", "EC 450F", "MC 125", "MC 250F", "MC 350F", "MC 450F"],
            CFMOTO: ["300NK", "300SR", "450NK", "450SR", "450MT", "450CL-C", "650NK", "650MT", "650GT", "800NK", "800MT", "800MT Explore", "800X", "700CL-X", "700CL-X Sport"],
            Zontes: ["R310", "T310", "V310", "S310", "S350", "T350", "GK350", "R350", "V350", "U1-350", "T703F"],
            Bajaj: ["Dominar 160", "Dominar 200", "Dominar 250", "Dominar 400", "Dominar NS400Z", "Dominar 400 Touring", "Pulsar N150", "Pulsar N160", "Pulsar NS160", "Pulsar NS200", "Pulsar N250", "Pulsar NS400Z", "Avenger 160", "Avenger 220", "Chetak", "Pulsar RS200", "Pulsar 200NS"],
            Haojue: ["DK 150", "DK 160", "DK 160 CBS", "DR 160", "NK 150", "DL 160", "DL 250", "Master Ride 150", "Chopper Road 150", "Chopper Road 150 EFI", "VR 150", "Lindy 125", "Smart 110", "Z 150"],
            Shineray: ["Jet 50", "Jet 50 EFI", "Jet 125", "Jet 125 SS", "Jet 125S", "Worker 50", "Worker 125", "Phoenix 50", "Phoenix 200", "SHI 150", "SHI 175", "SHI 250", "Storm 200", "Storm 200 EFI", "Denver 250", "Denver 250 EFI", "Titanium 250", "Urban 150", "Urban 150 EFI", "XY 150", "XY 250", "SE 1", "SE 2", "SHE 1", "Free 150"],
            Dafra: ["Apache RTR 150", "Apache RTR 200", "Apache RTR 200 4V", "Cruisym 150", "Cruisym 300", "Cruisym 400", "Citycom 300i", "Citycom HD 300", "NH 190", "NH 300", "NHX 190", "NHX 200", "Horizon 150", "Horizon 250", "Kansas 150", "Kansas 250", "Next 250", "Roadwin 250", "Riva 150", "Zig 50"],
            Avelloz: ["AZ 125", "AZ 160", "AZ 250", "AZ 160 ADV", "AZ 250", "Urban 150", "TXR 160"],
            Mottu: ["Sport 110i", "Sport 110", "Pop 110", "Elettrica", "Sport 110 2.0"],
            VMoto: ["CPx", "CPx Pro", "TS Street Hunter", "TS Bravo", "Stash", "TC Max", "VS1"],
            Voltz: ["EV1 Sport", "EVS", "EVS Work", "EVS Mobi", "EVS Cargo"],
            Watts: ["W125", "W160S", "W160S Touring", "W160", "W125 City", "W300"],
            Fantic: ["Caballero 125", "Caballero 250", "Caballero 500", "XEF 250", "XEF 450", "XMF 125", "XMF 250", "XMF 450"],
            Benelli: ["TRK 502", "TRK 502X", "Leoncino 500", "Leoncino 800", "Imperiale 400", "302S", "302R", "TNT 300", "TNT 600", "502C", "752S", "TRK 251"],
            Morini: ["Seiemmezzo STR", "Seiemmezzo SCR", "X-Cape 650", "X-Cape 700", "Calibro 650", "Corsaro 1200"],
            Kymco: ["Agility 125", "People 150", "People GTi 300", "Downtown 300", "AK 550", "X-Town 300", "Like 150"],
            Piaggio: ["Liberty 125", "Medley 150", "Medley 200", "Beverly 300", "Beverly 400", "MP3 300", "MP3 500"],
            Vespa: ["Primavera 125", "Primavera 150", "Sprint 150", "GTS 300", "GTV 300", "946"],
            Can_Am: ["Ryker 600", "Ryker 900", "Spyder F3", "Spyder F3-S", "Spyder RT", "Spyder RT Limited"],
            Bull: ["Aquila 250", "Coyote 250", "Bull 160", "Bull 250", "Hummer 250", "Master 150"],
            GCX: ["200", "250", "300", "Raptor 250", "Street 250"],
            Mobilli: ["Mobi 125", "Mobi 150", "Mobi 200", "Mobi Electric"],
            RVM: ["Tekken 250", "Tekken 500", "Apache 500", "Superlight 200", "Daytona 350"],
            Beta: ["RR 125", "RR 200", "RR 250", "RR 300", "RR 350", "RR 390", "RR 430", "RR 480", "XTrainer 300"],
            Sherco: ["SE 125", "SE 250", "SE 300", "SEF 250", "SEF 300", "SEF 450", "SEF 500"],
            AJP: [],
            Ather: [],
            Benda: [],
            Bimota: [],
            Brixton: [],
            Buell: [],
            CCM: [],
            Cleveland_CycleWerks: [],
            Daelim: [],
            Dayang: [],
            Energica: [],
            "E-Ride_Pro": [],
            FB_Mondial: [],
            Hero: [],
            Italjet: [],
            Jawa: [],
            Kove: [],
            Lambretta: [],
            Lifan: [],
            Loncin: [],
            Macbor: [],
            Malaguti: [],
            Mash: [],
            MBP: [],
            Mondial: [],
            Morbidelli: [],
            NIU: [],
            Norton: [],
            Ola_Electric: [],
            QJMotor: [],
            Rieju: [],
            Scomadi: [],
            Surron: [],
            SWM: [],
            SYM: [],
            Taro: [],
            TGB: [],
            TM_Racing: [],
            TVS: [],
            UM: [],
            Ural: [],
            Voge: [],
            Yadea: [],
            Zero: [],
            ZXMoto: [],
            Keeway: [],
            Kymco: [],
            ZXMoto: [],
            Arcimoto: [],
            Adiva: [],
            Aodes: [],
            Arch: [],
            Avinton: [],
            BSA: [],
            CFMoto_Electric: [],
            Changjiang: [],
            Cyclone: [],
            DAB_Motors: [],
            Dayun: [],
            Derbi: [],
            Detroit_Brothers: [],
            Ebroh: [],
            Evoke: [],
            Felo: [],
            Flycon: [],
            Horwin: [],
            Hyosung: [],
            Imf: [],
            Kayo: [],
            Kiden: [],
            Luyuan: [],
            Megelli: [],
            Moto_Morini: [],
            Niu: [],
            Ovaobike: [],
            Peugeot_Motocycles: [],
            Qooder: [],
            Rato: [],
            Reiju: [],
            Rumble_Motors: [],
            Segway: [],
            Super_Soco: [],
            Talaria: [],
            Velca: [],
            Viar: [],
            Wuyang: [],
            YCF: [],
            Zapp: [],
            MXF: ["250RX", "250TS", "300RX", "450RX", "450TS", "2T 250"]
        }
    },
    car: {
        label: "Carro",
        brands: {
            Fiat: ["Mobi", "Argo", "Cronos", "Punto", "Palio", "Siena", "Uno", "Strada", "Toro", "Pulse", "Fastback", "Fiorino", "Doblò", "Ducato", "500", "500X", "Bravo", "Idea", "Linea", "Weekend", "Tempra"],
            Chevrolet: ["Onix", "Onix Plus", "Prisma", "Celta", "Corsa", "Astra", "Cruze", "Cruze Sport6", "Tracker", "Spin", "Montana", "S10", "Trailblazer", "Equinox", "Blazer", "Captiva", "Meriva", "Zafira", "Vectra", "Omega"],
            Volkswagen: ["Gol", "Polo", "Virtus", "Voyage", "Fox", "Saveiro", "T-Cross", "Nivus", "Taos", "Tiguan", "Jetta", "Golf", "Amarok", "Passat", "Up!", "SpaceFox", "Parati", "Santana", "Quantum", "Kombi", "Fusca"],
            Ford: ["Ka", "Fiesta", "Focus", "Fusion", "EcoSport", "Territory", "Bronco Sport", "Ranger", "Maverick", "Mustang", "Edge", "Explorer", "F-250", "Courier", "Pampa", "Del Rey", "Escort", "Verona"],
            Toyota: ["Etios", "Yaris", "Corolla", "Corolla Cross", "Camry", "Hilux", "SW4", "RAV4", "Prius", "Fielder", "Bandeirante"],
            Honda: ["Fit", "City", "City Hatchback", "Civic", "Accord", "HR-V", "WR-V", "CR-V", "ZR-V", "CRX", "Prelude"],
            Hyundai: ["HB20", "HB20S", "i30", "Creta", "Tucson", "ix35", "Santa Fe", "Azera", "Elantra", "Veloster", "Kona"],
            Renault: ["Kwid", "Sandero", "Logan", "Stepway", "Duster", "Captur", "Oroch", "Master", "Fluence", "Clio", "Megane", "Scenic"],
            Nissan: ["March", "Versa", "Sentra", "Kicks", "Frontier", "X-Trail", "Livina", "Tiida", "Grand Livina"],
            Jeep: ["Renegade", "Compass", "Commander", "Wrangler", "Gladiator", "Cherokee", "Grand Cherokee"],
            Mitsubishi: ["Lancer", "ASX", "Outlander", "Eclipse Cross", "Pajero", "Pajero Sport", "L200 Triton", "Eclipse", "Galant"],
            Citroen: ["C3", "C3 Aircross", "C4 Cactus", "C4", "C4 X", "C5 Aircross", "Jumpy", "Berlingo", "Xsara", "Xsara Picasso"],
            Peugeot: ["208", "2008", "3008", "5008", "Partner", "Expert", "206", "207", "307", "308", "408", "508"],
            BMW: ["118i", "120i", "220i", "320i", "330e", "420i", "430i", "520i", "530e", "740i", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "i3", "i4", "iX", "iX1"],
            Mercedes_Benz: ["A 200", "A 250", "C 180", "C 200", "C 300", "E 200", "E 300", "S 500", "GLA 200", "GLB 200", "GLC 300", "GLE 350", "GLS 450", "CLA 200", "CLS 450", "Sprinter", "Vito"],
            Audi: ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8", "TT", "R8", "e-tron", "Q4 e-tron"],
            Caoa_Chery: ["Arrizo 5", "Arrizo 6", "Arrizo 6 Pro", "Tiggo 5X", "Tiggo 7", "Tiggo 7 Pro", "Tiggo 8", "Tiggo 8 Pro", "Tiggo 8 Pro Plug-in", "Tiggo 2"],
            BYD: ["Dolphin", "Dolphin Mini", "Dolphin Plus", "Yuan Plus", "Song Plus", "Song Pro", "King", "Seal", "Tan", "Han", "Yuan Pro", "Seagull"],
            GWM: ["Haval H6", "Haval H6 GT", "Haval H6 PHEV", "Haval H6 HEV", "Ora 03", "Tank 300", "Tank 500"],
            Kia: ["Picanto", "Cerato", "K3", "Sportage", "Sorento", "Carnival", "Stonic", "Soul", "Bongo"],
            Subaru: ["Impreza", "WRX", "Forester", "Outback", "XV", "Crosstrek", "Legacy"],
            Land_Rover: ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Sport", "Range Rover Evoque", "Range Rover Velar"],
            Porsche: ["718 Cayman", "718 Boxster", "911", "Taycan", "Panamera", "Macan", "Cayenne"],
            Volvo: ["EX30", "EX40", "EC40", "XC40", "XC60", "XC90", "S60", "S90", "V60", "V90"],
            Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
            JAC: ["T40", "T50", "T60", "T8", "J3", "J5", "J6", "iEV20", "iEV40", "E-JS1"],
            Suzuki: ["Jimny", "Jimny Sierra", "Vitara", "Grand Vitara", "Swift", "SX4", "S-Cross"],
            Chery: ["QQ", "Celer", "Face", "Tiggo 2", "Tiggo 3", "Tiggo 5", "Tiggo 7", "Tiggo 8", "Arrizo 5"],
            Lifan: ["320", "530", "620", "X60", "X80", "Foison"],
            Acura: [],
            Alfa_Romeo: [],
            Alpine: [],
            Aston_Martin: [],
            Bentley: [],
            Bugatti: [],
            Buick: [],
            Cadillac: [],
            Changan: [],
            Chrysler: [],
            Cupra: [],
            Daihatsu: [],
            Dodge: [],
            Ferrari: [],
            Genesis: [],
            GMC: [],
            Haval: [],
            Holden: [],
            Hongqi: [],
            Infiniti: [],
            Isuzu: [],
            Iveco: [],
            Koenigsegg: [],
            Lada: [],
            Lamborghini: [],
            Lexus: [],
            Lincoln: [],
            Lotus: [],
            Lucid: [],
            Mahindra: [],
            Maserati: [],
            Maybach: [],
            McLaren: [],
            Mini: [],
            Neta: [],
            Oldsmobile: [],
            Opel: [],
            Pagani: [],
            Polestar: [],
            Pontiac: [],
            Ram: [],
            Rivian: [],
            Rolls_Royce: [],
            Saab: [],
            Scion: [],
            Seat: [],
            Skoda: [],
            Smart: [],
            SsangYong: [],
            Tata: [],
            VinFast: [],
            Wey: [],
            XPeng: [],
            Geely: ["EC7", "GC2", "Emgrand", "Coolray"]
        }
    }
});

const BRAND_LABELS = Object.freeze({
    Royal_Enfield: "Royal Enfield",
    Harley_Davidson: "Harley-Davidson",
    Mercedes_Benz: "Mercedes-Benz",
    Caoa_Chery: "CAOA Chery",
    Cleveland_CycleWerks: "Cleveland CycleWerks",
    "E-Ride_Pro": "E Ride Pro",
    FB_Mondial: "FB Mondial",
    Ola_Electric: "Ola Electric",
    TM_Racing: "TM Racing"
});

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function optionsFrom(values, placeholder = "Selecione") {
    return [
        { value: "", label: placeholder, disabled: true },
        ...values.map(value => ({
            value,
            label: BRAND_LABELS[value] || value.replaceAll("_", " ")
        }))
    ];
}

function renderForm() {
    const form = document.createElement("form");
    form.className = "vehicle-create-sheet";
    form.id = "vehicle-create-sheet-form";
    form.noValidate = true;

    form.innerHTML = `
        <div class="vehicle-create-sheet__intro">
            <span class="vehicle-create-sheet__mark">
                ${icon("vehicle", { size: 21, decorative: true })}
            </span>
            <div>
                <strong>Coloque uma nova máquina na garagem.</strong>
                <span>Marcas em ordem alfabética. Digite o modelo e o ano do veículo.</span>
            </div>
        </div>

        <div class="vehicle-create-sheet__grid">
            <div class="vehicle-create-sheet__field vehicle-create-sheet__field--full">
                <label for="vehicle-create-type">Categoria</label>
                <select id="vehicle-create-type" name="type" required>
                    <option value="" disabled selected>Selecione a categoria</option>
                    <option value="motorcycle">Motocicleta</option>
                    <option value="car">Carro</option>
                </select>
            </div>

            <div class="vehicle-create-sheet__field">
                <label for="vehicle-create-brand">Marca</label>
                <select id="vehicle-create-brand" name="brand" required disabled>
                    <option value="" disabled selected>Escolha a categoria</option>
                </select>
            </div>

            <div class="vehicle-create-sheet__field">
                <label for="vehicle-create-model">Modelo</label>
                <input
                    id="vehicle-create-model"
                    name="model"
                    type="text"
                    maxlength="100"
                    autocomplete="off"
                    placeholder="Digite o modelo"
                    required
                >
            </div>

            <div class="vehicle-create-sheet__field">
                <label for="vehicle-create-year">Ano</label>
                <input
                    id="vehicle-create-year"
                    name="year"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    maxlength="4"
                    autocomplete="off"
                    placeholder="2026"
                    required
                >
            </div>

            <div class="vehicle-create-sheet__field">
                <label for="vehicle-create-color">Cor <span>opcional</span></label>
                <input
                    id="vehicle-create-color"
                    name="color"
                    type="text"
                    maxlength="40"
                    autocomplete="off"
                    placeholder="Preta"
                >
            </div>

            <div class="vehicle-create-sheet__field vehicle-create-sheet__field--full">
                <label for="vehicle-create-plate">Placa <span>opcional</span></label>
                <input
                    id="vehicle-create-plate"
                    name="plate"
                    type="text"
                    maxlength="10"
                    autocomplete="off"
                    autocapitalize="characters"
                    placeholder="ABC1D23"
                >
            </div>
        </div>

        <div class="vehicle-create-sheet__hint">
            ${icon("info", { size: 15, decorative: true })}
            <span>“A pé” continua disponível na garagem e não ocupa uma vaga de veículo.</span>
        </div>

        <div class="vehicle-create-sheet__actions">
            <button type="button" class="vehicle-create-sheet__cancel" data-action="cancel">
                Cancelar
            </button>
            <button type="submit" class="vehicle-create-sheet__submit" id="vehicle-create-submit">
                ${icon("plus", { size: 17, decorative: true })}
                <span>Cadastrar veículo</span>
            </button>
        </div>
    `;

    return form;
}

export function openVehicleCreateSheet({ onCreated = null } = {}) {
    const form = renderForm();

    const sheet = openBottomSheet({
        title: "Novo veículo",
        subtitle: "Adicionar à minha garagem",
        content: form,
        className: "bottom-sheet--vehicle-create",
        stack: true
    });

    if (!sheet) return null;

    const typeSelect = form.querySelector("#vehicle-create-type");
    const brandSelect = form.querySelector("#vehicle-create-brand");
    const yearInput = form.querySelector("#vehicle-create-year");
    const colorInput = form.querySelector("#vehicle-create-color");
    const plateInput = form.querySelector("#vehicle-create-plate");
    const submitButton = form.querySelector("#vehicle-create-submit");

    const resolveControl = (element, id) => {
        if (element?._mcSelectControl) {
            return element._mcSelectControl;
        }

        const wrapper = form.querySelector(`#${id}`)?.closest?.(".mc-select");
        return wrapper?._mcSelectControl || null;
    };

    const typeControl =
        createSelectDropdown(typeSelect) ||
        resolveControl(typeSelect, "vehicle-create-type");

    const brandControl =
        createSelectDropdown(brandSelect) ||
        resolveControl(brandSelect, "vehicle-create-brand");


    function syncBrandOptions() {
        const type = typeControl?.hidden.value || "";
        const brands = Object.keys(VEHICLE_CATALOG[type]?.brands || {}).sort((a, b) =>
            (BRAND_LABELS[a] || a.replaceAll("_", " ")).localeCompare(
                BRAND_LABELS[b] || b.replaceAll("_", " "), "pt-BR", { sensitivity: "base" }
            )
        );

        updateSelectOptions(
            brandControl,
            optionsFrom(brands, type ? "Selecione a marca" : "Escolha a categoria"),
            ""
        );

        if (brandControl) {
            brandControl.trigger.disabled = !type;
            brandControl.hidden.disabled = !type;
        }

        // O modelo é digitado pelo usuário; não depende da marca selecionada.
        const modelInput = form.querySelector("#vehicle-create-model");
        if (modelInput) modelInput.value = "";
    }

    typeControl?.hidden.addEventListener("change", syncBrandOptions);

    form.querySelector('[data-action="cancel"]')?.addEventListener("click", () => {
        sheet.close();
    });

    yearInput?.addEventListener("input", () => {
        yearInput.value = yearInput.value.replace(/\D/g, "").slice(0, 4);
    });

    plateInput?.addEventListener("input", () => {
        plateInput.value = plateInput.value.toUpperCase();
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const type = typeControl?.hidden.value || "";
        const brand = brandControl?.hidden.value || "";
        const model = form.querySelector("#vehicle-create-model")?.value.trim() || "";
        const year = Number(yearInput?.value || 0);
        const color = colorInput?.value.trim() || "";
        const plate = plateInput?.value.trim().toUpperCase() || "";

        if (!type) {
            showToast({ type: "error", message: "Selecione a categoria." });
            return;
        }

        if (!brand) {
            showToast({ type: "error", message: "Selecione a marca." });
            return;
        }

        if (!model) {
            showToast({ type: "error", message: "Selecione o modelo." });
            return;
        }

        if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) {
            showToast({ type: "error", message: "Informe um ano válido." });
            yearInput?.focus();
            return;
        }

        submitButton.disabled = true;
        submitButton.classList.add("is-loading");

        try {
            const vehicle = await createVehicle({
                type,
                brand: BRAND_LABELS[brand] || brand.replaceAll("_", " "),
                model,
                year,
                color,
                plate
            });

            events.emit("vehicle:created", { vehicle });
            events.emit("vehicle:changed", { vehicle });

            showToast({
                type: "success",
                message: `${vehicle.brand} ${vehicle.model} entrou na sua garagem.`
            });

            if (typeof onCreated === "function") {
                await onCreated(vehicle);
            }

            sheet.close();
        } catch (error) {
            console.error("[VEHICLE CREATE] Falha ao cadastrar:", error);
            showToast({
                type: "error",
                message: error.message || "Não foi possível cadastrar o veículo."
            });
        } finally {
            submitButton.disabled = false;
            submitButton.classList.remove("is-loading");
        }
    });

    syncBrandOptions();

    return sheet;
}

// Compatibilidade com o router legado.
export function renderVehicleCreate() {
    return openVehicleCreateSheet();
}

export function initializeVehicleCreate(data = {}) {
    return openVehicleCreateSheet(data);
}
