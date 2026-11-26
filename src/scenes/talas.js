// talas — a sound wave crosses Novi Beograd at night, in real time.
// World units are metres: x east, z south, y up; the shop is the origin. One wave = one uniform (x, z, radius, gain);
// every material evaluates the same wave field, so the front is where 343 m/s says it is.
const CS = 343, LAUNCH = 1.5, NSRC = 6;
const D2R = Math.PI / 180;
// Real geography, traced from map tiles and georeferenced to the shop (44.8224814 N, 20.3874374 E; 1 deg lat = 111,190 m, 1 deg lon = 78,850 m).
const ROADS = [ // [name, class 0 motorway 1 boulevard 2 avenue 3 street 4 rail, "east,north ..."] metres from the shop
  ['E-75 / Bulevar Arsenija Carnojevica', 0, '-3200,1180 -2600,1150 -1700,1044 -1350,980 -902,877 -490,769 -123,600 100,470 360,303 690,120 893,-10 1140,-174 1450,-375 1756,-564 2040,-780 2350,-941 2790,-1240 3120,-1455 3410,-1645 3620,-1776 3910,-1965 4100,-2120 4207,-2185 4460,-2380 4700,-2540 4910,-2710 5180,-2880 5468,-2989 5800,-3083 6090,-3280 6244,-3421 7000,-4000'],
  ['Bulevar Mihajla Pupina', 1, '1718,1568 1774,1300 1861,910 1945,520 2015,185 2200,95 2378,-23 2600,-160 2900,-350 3196,-541 3480,-740 3723,-873 3950,-910 4049,-905'],
  ['Brankov most / Brankova', 1, '4105,-899 4400,-875 4760,-850 5120,-822 5300,-845 5530,-910'],
  ['Bulevar Nikole Tesle', 1, '2376,1644 2435,1300 2500,940 2535,570 2580,310 2690,265 2990,60 3290,-125 3616,-335 3950,-540 4045,-660 4086,-855'],
  ['Tresnjinog cveta', 2, '2593,340 2372,-29'],
  ['Bulevar umetnosti', 1, '2364,-9 2152,-350 1945,-665 1809,-872 1700,-1050'],
  ['Bulevar Crvene armije', 2, '1686,-1076 1440,-1450 1284,-1702 1280,-1990'],
  ['Bulevar Zorana Djindjica', 1, '896,451 1170,295 1480,57 1756,-132 2050,-315 2410,-555 2780,-793 3239,-1089 3603,-1281 3857,-1440'],
  ['Pariske komune', 2, '1084,755 1430,551 1680,390 1960,265 2075,215'],
  ['Omladinskih brigada', 1, '2033,178 1797,-155 1564,-544 1210,-1090 1025,-1360 927,-1600 933,-1883 938,-2005 970,-2344 1007,-2725'],
  ['Narodnih heroja', 2, '1681,390 1490,98 1364,-96 1252,-277'],
  ['Spanskih boraca', 2, '2879,-336 2675,-650 2543,-855 2410,-1079 2260,-1310'],
  ['Djordja Stanojevica', 2, '2204,-1346 2212,-1344 2080,-1597 1840,-1780 1600,-1735 1330,-1615'],
  ['Antifasisticke borbe', 2, '3210,-541 3134,-660 2896,-1028 2643,-1440 2434,-1770 2308,-2090'],
  ['Milentija Popovica', 2, '3796,-740 3667,-955 3510,-1190 3345,-1450 3170,-1717 3055,-1910'],
  ['Vladimira Popovica', 1, '2800,-2095 3050,-2086 3336,-2052 3550,-1930 3660,-1820 3754,-1690 3890,-1480 3956,-1372 4020,-1150 4078,-797'],
  ['Milutina Milankovica', 1, '667,-365 860,-485 1080,-663 1300,-800 1540,-955 1900,-1135 2196,-1390 2486,-1540 2740,-1705 3053,-1910'],
  ['Bulevar heroja sa Kosara', 2, '1188,-1074 1550,-1260 1817,-1440 2046,-1609 2280,-1739 2480,-1875 2800,-2115'],
  ['Nikole Dobrovica', 2, '250,-726 400,-725 640,-700 880,-840 1035,-945 1234,-1068'],
  ['Marka Celebonovica', 2, '-1700,-30 -1175,-134 -890,-194 -590,-266 -360,-348 -151,-455 -40,-515 80,-597 240,-706'],
  ['Partizanske avijacije', 2, '220,265 165,120 70,0 -30,-180 -100,-330 -195,-520 -290,-710 -384,-850 -535,-965'],
  ['Tosin bunar', 1, '1181,1634 1121,1450 1050,1209 998,1033 920,760 840,470 820,359 755,100 705,-170 685,-240 634,-510 582,-707 536,-801 366,-1019'],
  ['Zemunska', 2, '336,-1039 116,-1150 -90,-1195'],
  ['Vojvodjanska', 1, '-140,-1201 -210,-1235 -410,-1354 -640,-1480 -800,-1595 -1080,-1745 -1380,-1930 -1628,-2062 -2400,-2250'],
  ['Studentska', 2, '194,552 590,503 840,454 1003,400 1030,160 1081,-26'],
  ['Bulevar marsala Tolbuhina (Goce Delceva)', 2, '1031,769 1310,810 1700,866 2090,916 2500,980'],
  ['Dzona Kenedija', 2, '1480,1176 1900,1235 2440,1320'],
  ['Jurija Gagarina', 1, '-1700,-3130 -1517,-2977 -1420,-2840 -1199,-2706 -960,-2550 -710,-2416 -470,-2290 -200,-2185 70,-2110 340,-2050 640,-2024 970,-2009 1300,-2008 1660,-2040 2050,-2064 2410,-2085 2800,-2105'],
  ['Gandijeva', 2, '-485,-1145 -390,-1324 -254,-1570 -120,-1790 -9,-1980 76,-2190 125,-2440 165,-2670 233,-2890'],
  ['Nehruova', 2, '-886,-1616 -796,-1770 -633,-2050 -532,-2250 -430,-2494 -330,-2716 -244,-2912'],
  ['Dr Ivana Ribara', 2, '-1574,-2244 -1450,-2420 -1250,-2710 -1155,-2980 -995,-3233'],
  ['Dusana Vukasovica', 3, '-1164,-1787 -1045,-2040 -995,-2324 -870,-2496'],
  ['Japanska / Evropska', 3, '-1431,-2464 -770,-2085 -156,-1732 17,-1628'],
  ['Ljubinke Bobic', 3, '-1070,-853 -800,-955 -613,-1030'],
  ['Ismeta Mujezinovica', 3, '-1230,-641 -697,-885'],
  ['Pedje Milosavljevica', 3, '-794,-589 -503,-715 -332,-800'],
  ['Generala Mihajla Nedeljkovica', 3, '-417,-966 -90,-795 87,-703'],
  ['Smolucska', 3, '-53,144 -56,128 -120,-60 -155,-148'],
  ['Stojana Aralice', 3, '174,-65 180,-300 240,-564'],
  ['Dragise Brasovana', 3, '163,-416 318,-489 560,-560'],
  ['Marije Bursac', 3, '262,1251 505,1276 990,1350'],
  ['Dr Agostina Neta', 3, '1297,-1981 1320,-2340 1350,-2600'],
  ['Most na Adi', 1, '2840,-2068 2958,-2293 3020,-2680 3059,-2950 3115,-3310 3140,-3430'],
  ['Radnicka', 1, '2935,-3470 3203,-3283 3437,-3163 3740,-3080 4010,-3004 4340,-2875 4589,-2794 4878,-2644'],
  ['Stari savski most', 4, '3980,-1090 4370,-1300 4480,-1340 4800,-1440'],
  ['Novi zeleznicki most', 4, '2760,-1980 3090,-2260 3190,-2700 3300,-3150 3420,-3400'],
  ['Stari zeleznicki most', 4, '3950,-2200 4350,-2560 4600,-2790'],
  ['Karadjordjeva / Savska', 2, '4900,-494 4950,-800 5020,-1200 5056,-1730 4950,-2200 4832,-2704'],
  ['Kneza Milosa', 2, '5770,-1170 5550,-1650 5300,-2200 5060,-2722'],
  ['Terazije / Kralja Milana', 2, '5431,-1028 5650,-1400 5800,-1900 5850,-2250'],
  ['Nemanjina', 2, '5050,-1910 5450,-2080 5850,-2250'],
  ['Bulevar kralja Aleksandra', 2, '5690,-1350 6290,-1690 7000,-2000 7800,-2400'],
  ['Bulevar oslobodjenja', 2, '5850,-2250 5950,-2900 6100,-3600'],
  ['Cara Dusana', 2, '4950,250 5500,100 6200,-163'],
  ['Bulevar despota Stefana', 2, '5600,-797 6297,-497 7100,-100'],
  ['Dunavska', 3, '5190,710 6040,510 6800,300'],
];
const WATER = [ // [isIsland, outline]
  [0, '2152,-3708 1412,-3800 772,-3996 1516,-3996 1700,-3936 2104,-3888 2112,-3768 2152,-3756'],
  [0, '9056,1012 8924,988 7876,1004 7140,1136 6696,1176 5856,1388 5284,1656 5212,1656 5172,1720 3832,1728 3828,1936 3184,1936 3528,1740 4004,1592 4532,1260 4652,1240 4664,1088 4560,1004 4428,772 4272,352 3996,216 3708,168 3536,232 3392,332 3008,856 2844,1712 2840,1936 2504,1936 2524,1504 2704,796 2816,528 2932,352 3032,352 3008,252 3228,60 3376,48 3384,-4 3556,-40 3856,-32 4316,84 4376,-112 4576,-496 4660,-788 4708,-792 4604,-1356 4436,-1764 4152,-2148 3904,-2340 3092,-2356 2980,-2412 2704,-2448 2672,-2500 2600,-2520 2624,-2628 2960,-2556 3012,-2512 3508,-2492 3500,-2556 3236,-2676 2796,-2752 2340,-2720 1888,-2740 1036,-2928 1024,-2988 940,-2968 912,-3040 792,-3040 736,-2976 296,-3012 296,-3064 164,-3040 148,-3128 84,-3124 76,-3048 -220,-3112 -484,-3236 -952,-3612 -1032,-3636 -1032,-3780 -1064,-3840 -1156,-3844 -1168,-3808 -1216,-3808 -1340,-3996 -788,-3996 -556,-3840 -556,-3800 -596,-3796 -584,-3724 -360,-3748 72,-3616 576,-3376 972,-3248 1476,-3168 1756,-3044 2192,-3008 2200,-2980 2532,-2984 2556,-3028 2556,-2968 2624,-2960 2636,-3036 3104,-3012 3092,-3108 2752,-3360 2732,-3460 2564,-3476 2280,-3668 2292,-3740 2484,-3732 2916,-3440 3040,-3324 3064,-3220 3164,-3200 3384,-3012 3388,-2956 3468,-2944 3728,-2760 3744,-2696 3816,-2696 4228,-2392 4468,-2136 4784,-1600 4876,-1252 4892,-796 4804,-380 4576,88 4548,324 4572,436 4532,452 4532,516 4608,520 4768,732 5012,892 5300,972 5392,944 5404,984 5460,984 5492,932 6200,840 6144,660 6268,808 6664,704 6852,692 6872,640 7036,640 7072,524 7008,496 6964,356 6860,352 6844,296 7432,88 7444,140 7152,284 7164,388 7212,400 7240,496 7368,500 8176,304 8180,280 9056,156'],
  [1, '608,-3156 604,-3220 108,-3444 -140,-3528 -324,-3540 -324,-3484 -272,-3424 -72,-3308 204,-3208'],
];
const WATER_MORE = ['2330,2560 3080,2560 2900,3400 2300,3600 1700,3600 2100,3000', '9000,1320 9000,330 9600,150 9600,1200', '-1420,-4350 -640,-4350 -1500,-5400 -2500,-5400'];
const GREEN = [
  [0, '5736,-3676 5744,-3788 5844,-3832 5844,-3896 5920,-3892 5912,-3996 6004,-3996 6028,-3936 6132,-3956 6132,-3876 5936,-3868 5940,-3776 5860,-3776 5856,-3716'],
  [0, '3092,-3676 3060,-3748 3204,-3748 3208,-3796 3028,-3808 3028,-3996 3328,-3996 3296,-3744 3164,-3668'],
  [0, '5184,-3528 5052,-3352 4856,-3180 4784,-3172 4512,-3664 4816,-3564 5160,-3564'],
  [0, '644,-3164 112,-3244 -212,-3380 -320,-3532 -60,-3500 612,-3216'],
  [0, '2924,-3180 2772,-3112 2724,-3196 2620,-3228 2552,-3320 2216,-3388 2160,-3196 2232,-3132 2452,-3132 2492,-3088 2200,-3016 1756,-3052 1508,-3172 988,-3252 508,-3404 100,-3620 -552,-3832 -700,-3932 -724,-3996 572,-3996 700,-3944 836,-3964 1176,-3864 1180,-3828 2076,-3696 2276,-3764 2276,-3668 2632,-3448 2696,-3348 2900,-3268'],
  [0, '260,-3004 800,-2964 832,-2916 976,-2944 1180,-2864 988,-2868 952,-2816 752,-2832 732,-2772 656,-2792 656,-2700 608,-2696 572,-2852 356,-2880'],
  [0, '6488,-2676 6396,-2684 6388,-2616 6192,-2620 6144,-2944 6108,-3016 5992,-3048 5792,-2988 5792,-2932 5884,-2940 5888,-2892 5760,-2876 5752,-2764 5704,-2800 5684,-2944 5600,-2928 5592,-2864 5380,-2844 5344,-2808 5368,-2724 5240,-2664 5112,-2768 5772,-3060 5940,-3092 6040,-3176 6040,-3128 6124,-3080 6220,-3144 6252,-3064 6212,-2844 6456,-2840'],
  [0, '132,-2568 24,-2580 40,-2688 92,-2700 96,-2740 16,-2768 -40,-2916 -188,-2920 -324,-3064 -456,-3136 -544,-3136 -672,-3068 -708,-3268 -944,-3396 -980,-3392 -996,-3328 -1180,-3344 -1284,-3252 -1768,-3272 -2080,-3156 -2464,-3220 -2544,-3312 -2680,-3368 -2840,-3520 -2844,-3568 -3200,-3652 -3200,-3996 -1460,-3996 -1248,-3704 -968,-3608 -552,-3260 -220,-3100 92,-3008 212,-3016'],
  [1, '-2752,-3544 -2612,-3532 -2612,-3476 -2568,-3464 -2564,-3532 -1916,-3532 -1892,-3596 -2168,-3620 -2168,-3688 -2464,-3708 -2476,-3620 -2732,-3612'],
  [0, '156,-2536 464,-2468 604,-2504 620,-2440 396,-2356 212,-2388 224,-2488 156,-2496'],
  [0, '-628,-2204 -692,-2092 -868,-2100 -932,-2044 -1072,-2160 -1260,-2236 -1260,-2272 -1192,-2316 -1048,-2212 -960,-2220 -800,-2116 -724,-2152 -680,-2248'],
  [0, '7816,-1308 7784,-1572 7692,-1532 7688,-1608 8156,-1892 8352,-1884 8376,-1604 8336,-1348 8264,-1332 8220,-1388 8080,-1356 8008,-1416 7912,-1284'],
  [0, '6344,-1308 6364,-1448 6600,-1652 6724,-1608 6752,-1652 6836,-1648 6852,-1720 6920,-1684 6852,-1524 6744,-1564 6488,-1264 6380,-1264'],
  [0, '4664,-880 4528,-888 4452,-1384 4296,-1664 4012,-2000 4100,-2092 4152,-2100 4468,-1676 4640,-1184'],
  [0, '2640,-736 2576,-836 2496,-840 2532,-868 2504,-1004 2696,-1104 2856,-856 2800,-816 2716,-836 2712,-760'],
  [0, '6852,-612 6656,-624 6728,-880 6816,-876 6872,-828'],
  [0, '-3200,-40 -3200,-980 -2932,-980 -2544,-1128 -2476,-952 -2644,-920 -2640,-856 -2504,-840 -2552,-364 -2708,-48'],
  [0, '-1132,-156 -2024,8 -2156,-796 -2140,-1084 -2060,-1376 -1904,-1296 -1828,-1188 -1760,-1184 -1752,-1136 -1548,-968 -1424,-804 -1356,-548 -1204,-580 -1168,-476 -1228,-468 -1120,-204'],
  [0, '476,492 404,328 504,456 584,444 624,380 560,292 496,276 588,204 616,268 668,264 668,180 748,172 712,256 792,336 760,444'],
  [0, '5084,892 4976,872 4780,740 4668,624 4564,424 4568,256 4988,260 4968,196 4640,208 4580,196 4580,140 4684,128 4680,92 4608,84 4612,40 4984,36 4952,-32 4708,-16 4644,-52 4796,-328 4832,-304 4768,-172 4816,-152 5012,-396 5196,-296 5196,-232 5332,-12 5368,364 5092,568 5028,692 4924,684 4916,800 5060,760'],
  [0, '-564,856 -432,772 -316,816 -288,712 -92,624 644,572 656,708 752,804 752,940 576,908 212,1036 148,872 12,812 -8,900 72,984 92,1140 52,1212 -36,1212 -144,1152 -368,1160 -444,1012 -372,1072 -276,1032 -284,900 -384,872 -504,960'],
  [0, '8396,1392 8328,1164 8340,992 9056,1016 9056,1492 8536,1508'],
  [0, '2380,1720 2364,1668 2444,1524 2500,1020 2640,888 2636,684 2560,640 2616,344 2720,248 2696,180 2732,20 2636,-152 2704,-156 2752,-236 3012,-384 3036,-320 2900,-188 3096,-76 3588,-544 3856,-568 3856,-488 3968,-512 4056,-664 4092,-836 4312,-860 4612,-828 4648,-760 4600,-576 4400,-180 4308,104 3800,-44 3136,16 3208,76 2964,296 2688,816 2492,1540 2508,1720 2472,1720 2472,1628 2428,1636 2428,1720'],
  [0, '2864,1912 2844,1740 2928,1432 3004,880 3348,380 3516,248 3736,172 3996,220 4252,336 4300,428 4260,496 4316,500 4444,820 4556,1008 4644,1064 4660,1132 4752,1172 4748,1208 4652,1176 4648,1236 4536,1244 4004,1588 3516,1736 3168,1936'],
  [0, '5200,1720 5208,1672 5284,1672 5848,1396 6704,1180 7444,1100 7824,1016 8208,1008 8260,1100 8284,1500 8204,1500 8104,1580 8104,1636 8160,1664 8136,1724 8024,1708 8020,1600 7924,1608 7832,1560 7804,1616 7416,1684 7296,1652 7228,1748 6836,1760 6840,1800 7052,1804 7020,1876 7092,1924 7224,1876 7376,1912 7400,1788 7512,1780 7896,1904 7872,2032 6152,2032 6196,1948 6152,1948 6088,2032 5596,2032 5592,1720'],
];
const ZONES = [ // [character, grain in degrees north of east, outline]; the first zone that contains a point wins
  ['industrial', 15, '-2600,1000 -1340,1000 -500,745 -140,580 -350,-300 -1205,-134 -2600,100'],
  ['belville', -31, '1150,-1090 1570,-1210 2080,-1555 2800,-2095 1300,-2005 970,-1999 934,-1870 940,-1600 1015,-1300'],
  ['meander', -31.4, '700,-150 880,400 1090,715 2035,205 2590,340 2690,265 4025,-650 4076,-845 3830,-1480 3590,-1960 3050,-1900 2500,-1510 1900,-1135 1540,-965 1090,-650 670,-365'],
  ['meander', 9.5, '1010,1010 1090,715 2035,205 2590,340 2500,1000 2380,1660 1180,1660'],
  ['stepped', 27.6, '-1520,-2250 -1450,-1850 -80,-1195 60,-1170 110,-2100 -470,-2290 -1205,-2710 -1400,-2860'],
  ['industrial', 0, '60,-1170 396,-1079 1015,-1300 940,-1600 934,-1990 110,-2100'],
  ['atrium', 27.6, '-1700,-3130 -1205,-2710 -470,-2290 70,-2110 160,-2500 220,-2890 -300,-3050 -1000,-3350'],
  ['meander', -3, '70,-2110 970,-1999 1300,-2005 1330,-2620 994,-2760 220,-2890'],
  ['industrial', -3, '1330,-2060 2800,-2130 2870,-2000 3050,-2400 2500,-2600 1330,-2650'],
  ['kosa', -15, '-2600,100 -1205,-134 -350,-300 -140,580 100,460 370,310 700,130 745,100 685,-170 624,-500 520,-831 396,-1079 -80,-1195 -800,-1585 -1700,-1990 -2600,-1700'],
  ['low', 20, '-2600,1000 -500,745 -140,580 100,460 850,490 1010,1010 1180,1660 400,2400 -2600,2400'],
  ['low', -31, '3830,-790 4300,-950 4350,-1500 4150,-2050 3770,-1690 3980,-1090'],
  ['waterfront', 55, '4520,-1560 4950,-1300 4990,-1700 4900,-2420 4600,-2620 4380,-2240'],
  ['old', 35, '4800,720 6000,900 8200,300 8200,-2400 6400,-3600 5200,-3300 4700,-2700 4980,-1700 4950,-500'],
  ['low', 0, '3000,-3500 4700,-2800 5200,-3300 6400,-3600 6400,-5000 3000,-5000'],
];

export default {
  id: 'talas', enterWith: 'grain',
  beats: [
    { dur: 13, copy: ['talas.b1.h', 'talas.b1.p'] },
    { dur: 9, copy: ['talas.b2.h', 'talas.b2.p', 'talas.hint'] },
  ],
  create(ctx) {
    const { THREE, gfx, view, util } = ctx; const { clamp, lerp, smoothstep } = util;
    const { HASH, NOISE } = ctx.GLSL;

    // ---------------------------------------------------------------- geography: the real Novi Beograd
    // Tables above are metres east/north of the shop; the world is x = east, z = -north, y up.
    const site = ctx.site || {};
    const lat0 = site.lat ?? 44.8224814, lon0 = site.lon ?? 20.3874374;
    const geo = (lat, lon) => [(lon - lon0) * 78850, -(lat - lat0) * 111190];
    const sc = site.savaCentar || { lat: 44.8086, lon: 20.4317 };
    const SAVA = geo(sc.lat, sc.lon), DIST = Math.hypot(SAVA[0], SAVA[1]), ARRIVE = DIST / CS; // ≈3.8 km: ≈11.1 s
    const JA = Math.atan2(SAVA[1], SAVA[0]);
    const AC = 31.4 * D2R, HD = [Math.cos(AC), Math.sin(AC)], HN = [-HD[1], HD[0]]; // the central grid runs with the motorway
    const GENEX = [1374, 230], ARENA = [2650, 920], USCE = [3913, 657], PALATA = [3060, 160], HRAM = [6430, 2610];
    const VREF = -.04, CREF = [-2000, 600]; // rough camera (above Bezanijska kosa), for culling the generator
    const inView = (x, z, m = 0) => { const dx = x - CREF[0], dz = z - CREF[1]; const al = dx * Math.cos(VREF) + dz * Math.sin(VREF), la = -dx * Math.sin(VREF) + dz * Math.cos(VREF); return al > 620 - m && Math.abs(la) < 260 + m + al * 1.02; };
    const SAVA_Y = 52, SHOP_Y = 7;
    const PTS = s => s.split(' ').map(q => { const [e, n] = q.split(','); return [+e, -n]; });
    const MX0 = -3600, MX1 = 9600, MZ0 = -3600, MZ1 = 5400, MRES = 10, MW = (MX1 - MX0) / MRES, MH = (MZ1 - MZ0) / MRES;

    // ---------------------------------------------------------------- city: roads, water and voids from the tables; blocks filled in character
    const city = (() => {
      const rnd = util.rng(19890), R = (a, b) => a + (b - a) * rnd();
      const boxes = [], lights = [], cars = [];
      // ---- land-use raster: R water, G park / void, B built density (blurred, so banks are smooth)
      const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d', { willReadFrequently: true });
      const path = pts => { g.beginPath(); pts.forEach((p, i) => { const x = (p[0] - MX0) / MRES, y = (p[1] - MZ0) / MRES; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); g.fill(); };
      g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH);
      g.fillStyle = '#f00'; for (const [isl, s] of WATER) if (!isl) path(PTS(s)); for (const s of WATER_MORE) path(PTS(s));
      g.fillStyle = '#000'; for (const [isl, s] of WATER) if (isl) path(PTS(s));
      g.globalCompositeOperation = 'lighter'; g.fillStyle = '#0f0'; for (const [hole, s] of GREEN) if (!hole) path(PTS(s));
      const zones = ZONES.map(([type, ang, s]) => { const p = PTS(s); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of p) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); } return { type, ang: -ang * D2R, p, x0, x1, z0, z1 }; });
      const DENS = { meander: 1, stepped: .95, atrium: .7, kosa: .6, low: .4, industrial: .35, belville: .9, old: 1, waterfront: .9 };
      for (let k = zones.length - 1; k >= 0; k--) { g.globalCompositeOperation = 'source-over'; const b = Math.round(255 * (DENS[zones[k].type] || .5)); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgb(0,0,${b})`; path(zones[k].p); }
      const img = g.getImageData(0, 0, MW, MH), md = img.data;
      { const tmp = new Float32Array(MW * MH); for (let c = 0; c < 3; c++) for (let pass = 0; pass < 2; pass++) { const r = c === 2 ? 4 : 2;
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < MW) { s += md[(y * MW + xx) * 4 + c]; n++; } } tmp[y * MW + x] = s / n; }
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < MH) { s += tmp[yy * MW + x]; n++; } } md[(y * MW + x) * 4 + c] = Math.min(255, s / n); } }
        for (let i = 3; i < md.length; i += 4) md[i] = 255; }
      const mapAt = (x, z, c) => { const mx = Math.floor((x - MX0) / MRES), mz = Math.floor((z - MZ0) / MRES); return mx < 0 || mz < 0 || mx >= MW || mz >= MH ? 0 : md[(mz * MW + mx) * 4 + c] / 255; };
      const land = (x, z) => mapAt(x, z, 0) < .35;
      const inPoly = (p, x, z) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
      const zoneAt = (x, z) => { for (let k = 0; k < zones.length; k++) { const q = zones[k]; if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1 && inPoly(q.p, x, z)) return k; } return -1; };

      // ---- road segments, and a grid that remembers the two nearest segments of every 10 m cell
      const HW = [27, 21, 13, 8, 4], seg = [null], lines = [];
      for (const [, cls, s] of ROADS) { const p = PTS(s), ids = []; let cum = 0;
        for (let i = 0; i + 1 < p.length; i++) { const len = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]); ids.push(seg.length); seg.push({ ax: p[i][0], az: p[i][1], bx: p[i + 1][0], bz: p[i + 1][1], len, cum, hw: HW[cls], cls }); cum += len; }
        lines.push({ cls, ids, total: cum }); }
      const NS = seg.length, idx = new Uint8Array(MW * MH * 4), d1 = new Float32Array(MW * MH).fill(1e9), d2 = new Float32Array(MW * MH).fill(1e9), i1 = new Uint16Array(MW * MH), i2 = new Uint16Array(MW * MH);
      const segD = (s, x, z) => { const bx = s.bx - s.ax, bz = s.bz - s.az, h = clamp(((x - s.ax) * bx + (z - s.az) * bz) / (bx * bx + bz * bz)); return Math.hypot(x - s.ax - bx * h, z - s.az - bz * h); };
      for (let k = 1; k < NS; k++) { const s = seg[k], RM = 90;
        const x0 = Math.max(0, Math.floor((Math.min(s.ax, s.bx) - RM - MX0) / MRES)), x1 = Math.min(MW - 1, Math.ceil((Math.max(s.ax, s.bx) + RM - MX0) / MRES)), z0 = Math.max(0, Math.floor((Math.min(s.az, s.bz) - RM - MZ0) / MRES)), z1 = Math.min(MH - 1, Math.ceil((Math.max(s.az, s.bz) + RM - MZ0) / MRES));
        for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const e = segD(s, MX0 + (x + .5) * MRES, MZ0 + (z + .5) * MRES) - s.hw; if (e > RM) continue; const o = z * MW + x;
          if (e < d1[o]) { d2[o] = d1[o]; i2[o] = i1[o]; d1[o] = e; i1[o] = k; } else if (e < d2[o]) { d2[o] = e; i2[o] = k; } } }
      for (let o = 0; o < MW * MH; o++) { idx[o * 4] = i1[o] & 255; idx[o * 4 + 1] = i1[o] >> 8; idx[o * 4 + 2] = i2[o] & 255; idx[o * 4 + 3] = i2[o] >> 8; }
      const segTex = new Float32Array(512 * 2 * 4); for (let k = 1; k < NS; k++) { const s = seg[k]; segTex.set([s.ax, s.az, s.bx, s.bz], k * 4); segTex.set([s.hw, s.cls, s.cum, s.len], (512 + k) * 4); }
      const roadE = (x, z) => { const mx = Math.floor((x - MX0) / MRES), mz = Math.floor((z - MZ0) / MRES); if (mx < 0 || mz < 0 || mx >= MW || mz >= MH) return 1e9; const o = mz * MW + mx; let e = 1e9; if (i1[o]) e = segD(seg[i1[o]], x, z) - seg[i1[o]].hw; if (i2[o]) e = Math.min(e, segD(seg[i2[o]], x, z) - seg[i2[o]].hw); return e; };

      // ---- buildings
      const pathD = (x, z) => { const t = clamp((x * SAVA[0] + z * SAVA[1]) / (DIST * DIST)); return Math.hypot(x - SAVA[0] * t, z - SAVA[1] * t); };
      const dens = (x, z) => 1 - .7 * smoothstep(1300, 3600, pathD(x, z));
      const fan = (x, z, P, ang, len, w0, spread, slope, h, rad) => { const dx = x - P[0], dz = z - P[1]; const al = -(dx * Math.cos(ang) + dz * Math.sin(ang)), la = Math.abs(-dx * Math.sin(ang) + dz * Math.cos(ang)); return al > -rad && al < len && la < w0 + rad + Math.max(al, 0) * spread && h > 3 + Math.max(al, 0) * slope; };
      const KEEP = [[SAVA[0] + HD[0] * 60, SAVA[1] + HD[1] * 60, 300], [ARENA[0], ARENA[1], 150], [GENEX[0] + 20, GENEX[1], 85], [USCE[0] + 10, USCE[1] + 60, 190], [PALATA[0], PALATA[1], 200], [1420, 1840, 150], [1000, 1010, 120], [800, 1230, 190], [HRAM[0], HRAM[1], 120], [6005, 1547, 50], [4650, 1870, 60], [0, 0, 44]];
      const CAMS = [[-2762, 1472], [-738, 41], [-1200, -340]]; // where the cameras end up (landscape A/B, portrait)
      const blocks = (P, x, z, h, rad, hk) => CAMS.some(C => { const dx = P[0] - C[0], dz = P[1] - C[1], L2 = dx * dx + dz * dz, t = ((x - C[0]) * dx + (z - C[1]) * dz) / L2; if (t < .25 || t > .985) return false; return Math.abs((x - C[0]) * dz - (z - C[1]) * dx) / Math.sqrt(L2) < 46 + rad && h > hk; });
      const free = (x, z, rad, h) => !blocks(GENEX, x, z, h, rad, 34) && !blocks(USCE, x, z, h, rad, 40) && land(x, z) && mapAt(x, z, 1) < .45 && roadE(x, z) > 7 + rad * .62
        && !KEEP.some(k => Math.hypot(x - k[0], z - k[1]) < k[2] + rad * .5)
        && !fan(x, z, [0, 0], -.2, 520, 30, .34, .27, h, rad) && !fan(x, z, SAVA, .12, 900, 150, .3, .05, h, rad); // keep the sight lines to both places clear
      const add = (x, z, w, d, h, type, o = {}) => { const dc = Math.hypot(x - CREF[0], z - CREF[1]); boxes.push({ x, z, w, d, h, y: o.y || 0, c: o.c ?? 1, s: o.s ?? 0, type, seed: o.seed ?? rnd(), lit: o.lit ?? R(.5, 1.6), imp: o.imp ?? (h * 1.3 + Math.max(w, d) * .3) * (o.k || 1) * 1800 / (700 + dc + pathD(x, z) * .5) }); return boxes[boxes.length - 1]; };
      const light = (x, y, z, col, I, size, kind = 1) => lights.push(x, y, z, col[0] * I, col[1] * I, col[2] * I, size, rnd(), kind);
      const cSOD = [1, .48, .13], cWARM = [1, .74, .44], cWHITE = [.8, .9, 1], cWIN = [1, .62, .3], cRED = [1, .1, .12];
      const FH = 2.9;
      const PITCH = { meander: [136, 98], stepped: [262, 76], atrium: [66, 62], kosa: [62, 54], low: [36, 40], industrial: [128, 104], belville: [116, 84], old: [94, 92], waterfront: [120, 112] };
      zones.forEach((zn, zi) => {
        const ca = Math.cos(zn.ang), sa = Math.sin(zn.ang), [pu, pv] = PITCH[zn.type];
        const toL = (x, z) => [x * ca + z * sa, -x * sa + z * ca]; let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
        for (const q of zn.p) { const [u, v] = toL(q[0], q[1]); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
        // a box in the zone's own frame: (du along the grain, dv across)
        const B = (cx, cz, du, dv, wu, wv, h, type, o = {}) => { const x = cx + du * ca - dv * sa, z = cz + du * sa + dv * ca; return free(x, z, Math.max(wu, wv) * .5, h) ? add(x, z, wu, wv, h, type, { c: ca, s: sa, ...o }) : null; };
        for (let u = Math.ceil(u0 / pu) * pu; u < u1; u += pu) for (let v = Math.ceil(v0 / pv) * pv; v < v1; v += pv) {
          const jx = R(-.12, .12) * pu, jz = R(-.12, .12) * pv, cx = (u + jx) * ca - (v + jz) * sa, cz = (u + jx) * sa + (v + jz) * ca, r = rnd(), r2 = rnd();
          if (!inView(cx, cz, 520) || zoneAt(cx, cz) !== zi || !land(cx, cz)) continue;
          const dC = Math.hypot(cx - CREF[0], cz - CREF[1]), near = dC < 4800, dn = dens(cx, cz), park = mapAt(cx, cz, 1) > .45;
          const pl = (n, col, I, y = 7) => { for (let k = 0; k < n; k++) { const x = cx + R(-.5, .5) * pu * ca - R(-.5, .5) * pv * sa, z = cz + R(-.5, .5) * pu * sa + R(-.5, .5) * pv * ca; if (land(x, z) && mapAt(x, z, 1) < .45) light(x, y, z, col, I * dn, 1.1); } };
          if (park) continue;
          const chain = (n, L, fl, type = 0, step = 0) => { const seed = rnd(), lit = R(.5, 1.6); let f = fl; for (let k = 0; k < n; k++) { if (step) f = fl + step * k; else if (k && rnd() < .3) f = Math.max(4, fl + Math.round(R(-2.4, 2.4))); const h = Math.round(f) * FH;
            if (B(cx, cz, (k - (n - 1) / 2) * L, (k & 1 ? 1 : -1) * (near ? 5 : 0), L, 13.5, h, type, { seed: seed + k * .013, lit }) && near && rnd() < .7) B(cx, cz, (k - (n - 1) / 2) * L + R(-8, 8), (k & 1 ? 5 : -5), R(4, 7), R(4, 6), R(2.6, 4), 7, { y: h, k: .45 }); } };
          const tower = (du, dv, f0, f1) => { const w = R(20, 25), d = R(20, 25), h = Math.round(R(f0, f1)) * FH; if (B(cx, cz, du, dv, w, d, h, 1) && near) B(cx, cz, du + R(-3, 3), dv + R(-3, 3), w * .5, d * .45, R(3, 5), 7, { y: h, k: .5 }); };
          switch (zn.type) {
            case 'meander': if (r < .5) chain(near ? 3 : 1, near ? 41 : 118, R(8, 16)); else if (r < .7) { tower(-28, R(-10, 10), 15, 24); tower(28, R(-10, 10), 15, 24); } else if (r < .84) B(cx, cz, 0, 0, 13.5, R(60, 84), Math.round(R(6, 11)) * FH, 0); else if (r < .93) B(cx, cz, 0, 0, 52, 26, 7.5, 3);
              pl(3, r2 < .5 ? cSOD : cWHITE, R(.5, 1)); break;
            case 'belville': if (r < .58) chain(near ? 3 : 1, near ? 36 : 104, R(10, 13)); else if (r < .72) B(cx, cz, 0, 0, R(70, 100), R(46, 66), R(11, 16), 3); pl(3, cWHITE, R(.6, 1.1)); break;
            case 'stepped': { const dir = r2 < .5 ? 1 : -1, f0 = R(3.4, 5), seed = rnd(), lit = R(.6, 1.6); // the long stepped rows of blocks 61–64
              for (let k = 0; k < 6; k++) B(cx, cz, (k - 2.5) * 37 * dir, (k & 1 ? 4 : -4), 37, 14, Math.round(f0 + k * R(2.2, 3.1)) * FH, 0, { seed: seed + k * .01, lit });
              pl(4, cSOD, R(.5, 1)); break; }
            case 'atrium': if (r < .56) { B(cx, cz, 0, -14, 44, 11, 8.7, 2); B(cx, cz, -16, 8, 11, 30, 8.7, 2); } else if (r < .72 || (r < .9 && mapAt(cx + 0, cz + 260, 0) > .3)) tower(0, 0, 8, 15); pl(2, cWIN, R(.4, .8), 4); break;
            case 'kosa': if (Math.hypot(cx, cz) < 620 ? r < .62 : r < .16) B(cx, cz, 0, 0, R(30, 44), 13.5, Math.round(R(4, 8)) * FH, 0); else if (near && r < .8) { B(cx, cz, -12, 0, R(9, 13), R(9, 12), R(5, 8), 2, { k: .6 }); if (r2 < .6) B(cx, cz, 14, R(-6, 6), R(9, 13), R(9, 12), R(5, 8), 2, { k: .6 }); }
              pl(2, cWIN, R(.35, .8), 4); break;
            case 'low': if (dC < 6500 && r < (dC < 3000 ? .5 : .3)) B(cx, cz, 0, 0, R(9, 13), R(9, 12), R(5, 8), 2, { k: .6 }); if (r2 < .6) pl(r2 < .2 ? 2 : 1, r2 < .4 ? cWIN : cSOD, R(.4, .9), 4); break;
            case 'industrial': if (r < .42) B(cx, cz, 0, 0, R(50, 92), R(30, 52), R(8, 12), 3); if (r2 < .6) pl(2, cWHITE, R(.5, 1), 9); break;
            case 'old': if (r < .86) B(cx, cz, 0, 0, R(60, 74), R(54, 68), r2 < .06 ? R(34, 52) : R(13, 26), 2, { lit: R(.9, 1.9) }); pl(3, r2 < .7 ? cSOD : cWARM, R(.6, 1.6), 6 + R(0, 20)); break;
            case 'waterfront': if (r < .6) B(cx, cz, 0, 0, R(26, 34), R(26, 34), Math.round(R(16, 30)) * 3.6, 6); pl(3, cWHITE, R(.6, 1.2), 9); break;
          }
        }
      });
      if (inView(0, 0)) { add(-34, 30, 46, 14, 20, 0, { c: Math.cos(1.1), s: Math.sin(1.1), imp: 1e8 }); add(40, -52, 40, 14, 23, 0, { c: Math.cos(1.1), s: Math.sin(1.1), imp: 1e8 }); } // the shop's own lamellae

      // ---- landmarks, where they stand
      const lm = (P, al, la, w, d, h, type, y = 0, lit = 1, ang = AC) => { const c = Math.cos(ang), s = Math.sin(ang); return add(P[0] + c * al - s * la, P[1] + s * al + c * la, w, d, h, type, { y, c, s, lit, imp: 1e9 }); };
      // Sava Centar: long, low, stepped glass beside the motorway; its hall, and the hotel
      lm(SAVA, -50, 0, 390, 136, 17, 4); lm(SAVA, -50, 0, 362, 106, 13, 4, 17); lm(SAVA, -50, 0, 330, 74, 10, 4, 30);
      lm(SAVA, 196, -6, 136, 124, 40, 4); lm(SAVA, 196, -6, 112, 96, 11, 4, 40); lm(SAVA, 300, -110, 24, 96, 66, 6, 0, .7);
      for (let k = 0; k < 17; k++) for (const sd of [-1, 1]) light(SAVA[0] + HD[0] * (-242 + k * 24) + HN[0] * sd * 76, 5, SAVA[1] + HD[1] * (-242 + k * 24) + HN[1] * sd * 76, cWARM, 2.4, 1.3, 4);
      // Western City Gate (Genex): two unequal towers, the bridge, the round restaurant, a mast
      const GA = Math.PI / 2 - .3, gx = Math.cos(GA), gz = Math.sin(GA); // the pair stands roughly north-south: from the east and the west it reads as a gate
      lm(GENEX, -24, 0, 26, 26, 117, 5, 0, 2.4, GA); lm(GENEX, 24, 0, 24, 24, 92, 5, 0, 2.4, GA); lm(GENEX, 0, 0, 30, 9, 8, 5, 84, 1.5, GA); // two towers and the bridge
      lm(GENEX, -24, 0, 20, 20, 9, 5, 117, 3, GA + .4); lm(GENEX, -24, 0, 14, 14, 6, 5, 126, 3, GA); lm(GENEX, -24, 0, 2, 2, 22, 7, 132, 1, GA); // the revolving restaurant, a mast
      light(GENEX[0] - gx * 24, 155, GENEX[1] - gz * 24, cRED, 5, 1.6, 3); light(GENEX[0] + gx * 24, 95, GENEX[1] + gz * 24, cRED, 3, 1.2, 3);
      for (let k = 0; k < 7; k++) light(GENEX[0] - gx * 24 + Math.cos(k * .9) * 11, 122, GENEX[1] - gz * 24 + Math.sin(k * .9) * 11, cWARM, 1.6, 1.1, 1);
      // Belgrade Arena: a big low oval
      lm(ARENA, 0, 0, 152, 116, 30, 3, 0, .6); lm(ARENA, 0, 0, 128, 128, 31, 3, 0, .6, AC + Math.PI / 4); lm(ARENA, 0, 0, 104, 84, 6, 7, 31);
      for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; light(ARENA[0] + Math.cos(a) * 92 * HD[0] - Math.sin(a) * 74 * HD[1], 6, ARENA[1] + Math.cos(a) * 92 * HD[1] + Math.sin(a) * 74 * HD[0], cWARM, 1.6, 1.2, 1); }
      // Ušće: the two towers and the mall
      lm(USCE, 0, 0, 32, 30, 98, 6, 0, 1.2); lm(USCE, 0, 0, 2.4, 2.4, 26, 7, 98); lm(USCE, 56, 44, 30, 28, 88, 6, 0, 1.2); lm(USCE, -40, 150, 150, 96, 22, 3); light(USCE[0], 126, USCE[1], cRED, 4, 1.4, 3);
      // Palata Srbije: the long H
      lm(PALATA, 0, 0, 236, 24, 26, 5, 0, 1.3); lm(PALATA, -96, -30, 24, 104, 22, 5, 0, 1.3); lm(PALATA, 96, -30, 24, 104, 22, 5, 0, 1.3); lm(PALATA, 0, 34, 62, 50, 30, 5, 0, 1.3);
      // Delta City, West 65, Airport City
      lm([1420, 1840], 0, 0, 156, 108, 20, 3, 0, 1, 0); for (let k = 0; k < 10; k++) light(1350 + k * 16, 22, 1786, cWHITE, 1.6, 1.3, 1);
      lm([1000, 1010], 0, 0, 34, 34, 155, 6, 0, 1.5, .98); light(1000, 158, 1010, cRED, 4, 1.4, 3); for (let k = 0; k < 5; k++) lm([1000, 1010], -150 + k * 46, 70, 18, 62, 36, 0, 0, 1.4, .98);
      for (let k = 0; k < 8; k++) lm([800, 1230], (k % 4 - 1.5) * 74, (k < 4 ? -42 : 42), 56, 24, 27, 6, 0, 1.3, .98);
      // across the river: Beograđanka, the Belgrade Waterfront tower, the dome of Hram Svetog Save; the Ada bridge pylon
      lm([6005, 1547], 0, 0, 30, 22, 101, 5, 0, 1.4); light(6005, 104, 1547, cRED, 3, 1.3, 3);
      lm([4650, 1870], 0, 0, 36, 28, 168, 6, 0, 1.5, 1.05); light(4650, 171, 1870, cRED, 4, 1.4, 3);
      lm(HRAM, 0, 0, 80, 80, 40, 8, 0, 1, 0); lm(HRAM, 0, 0, 42, 42, 16, 8, 40, 1, 0); lm(HRAM, 0, 0, 34, 34, 9, 8, 56, 1, .785); lm(HRAM, 0, 0, 24, 24, 8, 8, 65, 1, 0); lm(HRAM, 0, 0, 1.6, 1.6, 9, 8, 73, 1, 0);
      lm([3045, 2905], 0, 0, 9, 9, 200, 7, 0, 1, 0); light(3045, 203, 2905, cRED, 4, 1.4, 3); for (let k = 1; k < 9; k++) light(3045 - 12 * k, 200 - 20 * k, 2905 - 62 * k + 500 * 0, cWHITE, .9, 1.1, 1);
      light(0, SHOP_Y, 0, [1, .62, .2], 1, 4.2, 2); // the shop

      // ---- quays: lamps along both banks of the Sava and the Danube, so the rivers read as dark ribbons edged in light
      for (const [isl, str] of WATER) { const p = PTS(str); if (isl) continue;
        for (let i = 0; i + 1 < p.length; i++) { const [ax, az] = p[i], [bx, bz] = p[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < 1) continue; const nx = -(bz - az) / L, nz = (bx - ax) / L;
          for (let a = rnd() * 46; a < L; a += 46) { const x = ax + (bx - ax) * a / L, z = az + (bz - az) * a / L;
            if (z < -1890 || z > 3950 || x > 9000 || !inView(x, z, 400)) continue; // edges where the traced tiles were clipped are not banks
            const l1 = land(x + nx * 26, z + nz * 26), l2 = land(x - nx * 26, z - nz * 26); if (l1 === l2) continue; const sd = l1 ? 1 : -1;
            const lx = x + nx * 9 * sd, lz = z + nz * 9 * sd; if (mapAt(lx, lz, 1) > .6 && rnd() < .6) continue;
            light(lx, 7, lz, x > 4300 && z > 900 ? cWHITE : rnd() < .8 ? cSOD : cWARM, 2.3, 1.7, 5); } } } // kind 5: always lit
      // ---- the far city beyond the traced map (Vracar, Zvezdara, Vozdovac, Banovo brdo): a carpet of small lights to the horizon
      { const fr = util.rng(51); const cl = (x, z) => Math.sin(x * .0021 + 1.3) * Math.sin(z * .0017 - .4) + .6 * Math.sin(x * .0047 + z * .0031) + .4 * Math.sin(x * .011 - z * .009);
        for (let x = 4200; x < 15000; x += 80) for (let z = -3400; z < 9000; z += 80) {
          const jx = x + (fr() - .5) * 70, jz = z + (fr() - .5) * 70, pick = fr();
          if (!inView(jx, jz, 900)) continue; const zi = zoneAt(jx, jz); if (zi >= 0 && zones[zi].type !== 'low') continue;
          if (jx < MX1 && jz < MZ1 && (!land(jx, jz) || mapAt(jx, jz, 1) > .4)) continue;
          if (jx < 6500 && jz < 2600) continue; // the near bank stays as traced
          const d = cl(jx, jz) + 1.3 - Math.hypot(jx - CREF[0], jz - CREF[1]) / 14000; if (pick > .22 * Math.max(0, d)) continue;
          light(jx, 6 + fr() * 14, jz, fr() < .72 ? cSOD : fr() < .6 ? cWARM : cWHITE, .9 + fr() * 1.2, 1.2, 1); }
        for (let x = 600; x < 4600; x += 80) for (let z = 2700; z < 7000; z += 80) { // Cukarica and Banovo brdo, south of the Sava
          const jx = x + (fr() - .5) * 70, jz = z + (fr() - .5) * 70, pick = fr();
          if (!inView(jx, jz, 900) || (jz < MZ1 && (!land(jx, jz) || mapAt(jx, jz, 1) > .4))) continue; const zi = zoneAt(jx, jz); if (zi >= 0 && zones[zi].type !== 'low') continue;
          const d = cl(jx, jz) + 1.2; if (pick > .16 * Math.max(0, d)) continue;
          light(jx, 6 + fr() * 10, jz, fr() < .75 ? cSOD : cWARM, .8 + fr(), 1.2, 1); } }

      // ---- street lamps along the real streets (the ground shader lays matching pools), and cars
      for (const ln of lines) { if (ln.cls > 3) continue; const sp = ln.cls === 0 ? 36 : ln.cls === 3 ? 50 : 42;
        for (const id of ln.ids) { const s = seg[id], dx = (s.bx - s.ax) / s.len, dz = (s.bz - s.az) / s.len, off = s.hw - 3;
          for (let a = Math.ceil(s.cum / sp) * sp; a < s.cum + s.len; a += sp) { const k = Math.round(a / sp), t = a - s.cum; for (const sd of ln.cls === 3 ? [k & 1 ? 1 : -1] : [-1, 1]) {
            const x = s.ax + dx * t - dz * off * sd, z = s.az + dz * t + dx * off * sd; if (!inView(x, z, 300)) continue; const far = Math.hypot(x - CREF[0], z - CREF[1]) > 5000; if (far && ln.cls > 1 && (k & 1)) continue;
            const overWater = !land(x, z); light(x, overWater ? 16 : ln.cls === 0 ? 11 : 9, z, ln.cls === 0 || overWater ? cWARM : cSOD, (ln.cls === 0 ? 2.1 : ln.cls === 1 ? 1.7 : ln.cls === 2 ? 1.3 : 1) * (overWater ? 1.5 : dens(x, z)), 1.15, overWater ? 5 : 0); } } } }
      for (const ln of lines) { if (ln.cls > 2) continue; const n = Math.round(ln.total / [20, 54, 120][ln.cls]);
        for (let k = 0; k < n; k++) { const dir = rnd() < .5 ? 1 : -1, lane = R(4, ln.cls === 2 ? 8 : 12) + (ln.cls < 2 ? 3 : 0), ph = R(0, ln.total), sp = R(8, 15) * (ln.cls === 0 ? 1.7 : 1), sd = rnd();
          for (const id of ln.ids) { const s = seg[id]; if (!inView((s.ax + s.bx) / 2, (s.az + s.bz) / 2, 500)) continue; const dx = (s.bx - s.ax) / s.len * dir, dz = (s.bz - s.az) / s.len * dir;
            cars.push((dir > 0 ? s.ax : s.bx) - dz * lane, (dir > 0 ? s.az : s.bz) + dx * lane, dir > 0 ? s.cum : ln.total - s.cum - s.len, dx, dz, s.len, sp, sd, ln.total, ph); } } }

      boxes.sort((p, q) => q.imp - p.imp); if (boxes.length > 5000) boxes.length = 5000;
      if (ctx.headless) window.__talas = { boxes: boxes.length, lights: lights.length / 9, cars: cars.length / 10, segs: NS };
      return { boxes, lights, cars, map: md, idx, segTex };
    })();

    // ---------------------------------------------------------------- shared uniforms + GLSL
    const src = Array.from({ length: NSRC }, () => new THREE.Vector4(0, 0, 0, 0));
    const U = {
      uCam: { value: new THREE.Vector3() }, uT: { value: 0 }, uSrc: { value: src }, uWake: { value: new THREE.Vector4(0, 0, 0, 1) },
      uShop: { value: new THREE.Vector4(0, 0, 1, 0) }, uGlowDir: { value: new THREE.Vector2(Math.cos(JA + .16), Math.sin(JA + .16)) }, uSava: { value: 0 }, uDecay: { value: 4.2 },
    };
    const ATM = /* glsl */`
uniform vec3 uCam; uniform float uT; uniform vec4 uSrc[${NSRC}]; uniform vec4 uWake; uniform vec4 uShop; uniform vec2 uGlowDir; uniform float uSava, uDecay;
const float CS = 343.;
const vec3 BRASS = vec3(1., .60, .20), PAPERW = vec3(1., .84, .60), SOD = vec3(1., .48, .13), FRONT = vec3(1., .72, .38);
vec3 skyCol(vec3 d){
  float el = max(d.y, 0.);
  float az = max(dot(normalize(d.xz + vec2(1e-5)), uGlowDir), 0.); float azf = .16 + .84 * pow(az, 5.);
  vec3 c = vec3(.0011, .0011, .0015);
  c += vec3(.070, .040, .021) * exp(-el * 24.) * azf;      // the old city's glow, hugging the horizon
  c += vec3(.0050, .0044, .0048) * exp(-el * 5.) * (.4 + .6 * azf);
  return c;
}
float fogT(vec3 wp){ vec3 v = wp - uCam; float d = length(v); float k = v.y / 420.; float f = abs(k) < 1e-3 ? 1. : (1. - exp(-k)) / k;
  return exp(-d * (exp(-uCam.y / 420.) * f / 15000. + 1. / 150000.)); }
vec3 fogged(vec3 c, vec3 wp){ vec3 v = wp - uCam; vec3 f = skyCol(normalize(vec3(v.x, 0., v.z))); float T = fogT(wp);
  f = mix(vec3(dot(f, vec3(.3, .5, .2))) * vec3(.92, .96, 1.12), f, .55 + .45 * (1. - T)) * (.72 + .28 * (1. - T)); return mix(f, c, T); }
vec3 ember(float x){ x = min(x, 3.); return mix(vec3(.95, .36, .09), vec3(1., .78, .45), smoothstep(0., 1.1, x)) * x; }
// band: the thin crest (+ two fainter crests behind it); soft: its wide glow; tail: what the front leaves behind, decaying
void waves(vec2 p, float jit, out float band, out float soft, out float tail){
  band = 0.; soft = 0.; tail = 0.;
  float n = (vnoise(p * .021) - .5) * 15. + (vnoise(p * .13) - .5) * 3.5;
  for (int i = 0; i < ${NSRC}; i++){ vec4 s = uSrc[i]; if (s.w <= 0.) continue;
    float d = distance(p, s.xy), x = d - s.z + n * smoothstep(40., 900., d);
    if (x > 120.) continue;
    float att = s.w / pow(1. + d / 1500., .55) * (.55 + .45 * smoothstep(0., 900., d)), w = 2.4 + d * .0026;
    float e = x / w, e2 = (x + 26. + d * .006) / (w * 1.7), e3 = (x + 56. + d * .012) / (w * 2.4);
    band += att * (exp(-e * e) + .28 * exp(-e2 * e2) + .11 * exp(-e3 * e3));
    float L = 22. + d * .05;                                            // the lit band just behind the edge: about half a second deep
    soft += att * (.35 + .65 * smoothstep(100., 1100., d)) * (x < 0. ? exp(x / L) : exp(-x * x / (w * w * 16.)));
    float tau = (-x - jit) / CS;
    tail += s.w / (1. + d / 4200.) * smoothstep(0., .05, tau) * exp(-max(tau, 0.) / uDecay);
  }
}
float wakeAt(vec2 p, float jit){ return max(uWake.w * smoothstep(0., 80., uWake.z - distance(p, uWake.xy) - jit), smoothstep(4550., 5150., p.x + jit * .3)); } // the old city across the river never sleeps
`;
    const HEAD = `precision highp float; precision highp sampler2D;\n` + HASH + NOISE + ATM;
    const MVP = `uniform mat4 projectionMatrix, viewMatrix;\n`;
    const mat = (vs, fs, uniforms = {}, o = {}) => new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: HEAD + MVP + vs, fragmentShader: HEAD + fs, uniforms: { ...U, ...uniforms }, ...o });
    const ADD = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };

    // ---------------------------------------------------------------- buildings (one instanced draw)
    const world = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, 1.6, 20, 60000);
    const NB = city.boxes.length;
    const bGeo = new THREE.InstancedBufferGeometry();
    {
      const P = [], N = [], T = [], I = [];
      const face = (o, e1, e2, n) => { const b = P.length / 3; for (const [a, c] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { P.push(o[0] + e1[0] * a + e2[0] * c, o[1] + e1[1] * a + e2[1] * c, o[2] + e1[2] * a + e2[2] * c); N.push(...n); T.push(a, c); } I.push(b, b + 1, b + 2, b, b + 2, b + 3); };
      face([.5, 0, .5], [0, 0, -1], [0, 1, 0], [1, 0, 0]); face([-.5, 0, -.5], [0, 0, 1], [0, 1, 0], [-1, 0, 0]);
      face([-.5, 0, .5], [1, 0, 0], [0, 1, 0], [0, 0, 1]); face([.5, 0, -.5], [-1, 0, 0], [0, 1, 0], [0, 0, -1]);
      face([-.5, 1, .5], [1, 0, 0], [0, 0, -1], [0, 1, 0]);
      bGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); bGeo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); bGeo.setAttribute('uv', new THREE.Float32BufferAttribute(T, 2)); bGeo.setIndex(I);
      const iA = new Float32Array(NB * 4), iB = new Float32Array(NB * 4), iC = new Float32Array(NB * 3);
      city.boxes.forEach((b, k) => { iA.set([b.x, b.y, b.z, b.type], k * 4); iB.set([b.w, b.h, b.d, b.seed], k * 4); iC.set([b.c, b.s, b.lit], k * 3); });
      bGeo.setAttribute('iA', new THREE.InstancedBufferAttribute(iA, 4)); bGeo.setAttribute('iB', new THREE.InstancedBufferAttribute(iB, 4)); bGeo.setAttribute('iC', new THREE.InstancedBufferAttribute(iC, 3));
      bGeo.instanceCount = NB;
    }
    const bMat = mat(/* glsl */`
in vec3 position, normal; in vec2 uv; in vec4 iA, iB; in vec3 iC;
out vec3 vW, vN, vSz; out vec2 vF; out vec4 vS; flat out float vFace;
void main(){
  vec3 l = position * iB.xyz; vec2 r = vec2(iC.x * l.x - iC.y * l.z, iC.y * l.x + iC.x * l.z);
  vW = vec3(iA.x + r.x, iA.y + l.y, iA.z + r.y);
  vN = vec3(iC.x * normal.x - iC.y * normal.z, normal.y, iC.y * normal.x + iC.x * normal.z);
  float fw = abs(normal.x) > .5 ? iB.z : iB.x;
  vF = normal.y > .5 ? l.xz : vec2(uv.x * fw, l.y);
  vFace = normal.y > .5 ? 4. : (normal.x > .5 ? 0. : normal.x < -.5 ? 1. : normal.z > .5 ? 2. : 3.);
  vS = vec4(fw, iA.w, iB.w, iC.z); vSz = iB.xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.);
}`, /* glsl */`
in vec3 vW, vN, vSz; in vec2 vF; in vec4 vS; flat in float vFace; out vec4 fragColor;
void main(){
  float type = vS.y, seed = vS.z, bias = vS.w;
  vec3 V = vW - uCam; float dist = length(V); vec3 Vn = V / dist;
  float band, soft, tail; vec3 col;
  vec3 toShop = vec3(uShop.x, 7., uShop.y) - vW; float dShop = length(toShop);
  float tone = .72 + .56 * hash11(seed * 7.31);
  if (vFace > 3.5) { // ---- roof: a little cool sky light, a brighter parapet
    waves(vW.xz, 0., band, soft, tail);
    vec2 e2 = vSz.xz * .5 - abs(vF); float de = min(e2.x, e2.y), fw = fwidth(de);
    float edge = 1. - smoothstep(.45, 1.3 + fw, de);
    vec2 rc = vF / 6.5 + seed * 31.; float lodr = smoothstep(.2, .7, max(fwidth(rc.x), fwidth(rc.y)));
    float k = mix(1. - .3 * hash12(floor(rc)) + .25 * hash12(floor(rc * .37)), .98, lodr);
    col = vec3(.0080, .0100, .0150) * tone * k + vec3(.015, .019, .029) * edge;
    if (type > 7.5) col = vec3(1., .9, .76) * .08; else if (type > 6.5) col *= .6;
    if (type > 3.5 && type < 4.5) col += vec3(1., .66, .3) * (uSava * (.04 + .2 * edge) + .02 * edge);
    col += FRONT * min(band, 1.6) * 2.6 + BRASS * min(soft, 1.3) * .42 + ember(min(tail, 1.1)) * .034;
    col += BRASS * uShop.z * .04 / (1. + dShop * dShop / 2500.);
  } else if (type > 7.5) { col = vec3(1., .9, .76) * (.05 + .05 * smoothstep(0., 70., vW.y)) * (.75 + .25 * abs(vN.x)); } // Hram Svetog Save, floodlit
  else if (type > 6.5) { waves(vW.xz, 0., band, soft, tail); col = vec3(.0042, .0044, .005) * tone + FRONT * band * 2. + BRASS * soft * .3; }
  else { // ---- facade
    float bay = 3.3, fh = 2.9, mx = .2, y0 = .36, y1 = .8;
    if (type > .5) { bay = 2.9; mx = .25; }
    if (type > 1.5) { bay = 4.4; fh = 3.1; mx = .27; }
    if (type > 2.5) { bay = 7.; fh = 5.2; mx = .05; y0 = .25; y1 = .7; }
    if (type > 3.5) { bay = 5.6; fh = 3.9; mx = .03; y0 = .14; y1 = .9; }
    if (type > 4.5) { bay = 3.1; fh = 3.05; mx = .29; y0 = .32; y1 = .8; }
    if (type > 5.5) { bay = 2.5; fh = 3.6; mx = .05; y0 = .2; y1 = .92; }
    vec2 cell = vec2(vF.x / bay + .5, vF.y / fh), id = floor(cell), f = fract(cell), fwc = fwidth(cell);
    float fwm = max(fwc.x, fwc.y), lod = smoothstep(.36, 1.05, fwm), lod2 = smoothstep(.9, 2.6, fwm * 2.);
    vec2 hs = vec2(seed * 113.1 + vFace * 17.3, seed * 57.7);
    vec4 r = vec4(hash22(id + hs), hash22(id.yx * 1.37 + hs + 3.1));
    vec2 lo = vec2(mx, y0), hi = vec2(1. - mx, y1), wv = smoothstep(lo - fwc * .7, lo + fwc * .7, f) * (1. - smoothstep(hi - fwc * .7, hi + fwc * .7, f));
    float win = wv.x * wv.y, area = (1. - 2. * mx) * (y1 - y0);
    waves(vW.xz, r.z * 80., band, soft, tail);
    float wk = wakeAt(vW.xz, r.w * 520.);
    float frac = mix(.028, .22, wk) * bias;
    vec3 warm = mix(vec3(1., .46, .15), vec3(1., .82, .54), r.y), em, avg;
    float br = mix(.2, 1.9, r.w * r.w * r.w);
    // coarse cells keep some texture when single windows are too small to draw
    vec2 cid = floor(cell / vec2(2., 2.)); vec2 cr = hash22(cid + hs + 7.7); float coarse = mix(pow(cr.x, 3.) * 4., 1., lod2);
    if (type > 3.5 && type < 4.5) { // Sava Centar: ribbons of glass that take the light when the wave arrives
      float g = .45 + .8 * r.y; em = (vec3(1., .64, .26) * uSava * 2. * g + vec3(.07, .06, .05) * step(r.x, .12)) * (.6 + .5 * f.y); avg = vec3(1., .64, .26) * uSava * 1.8 + .006; coarse = 1.;
      em += skyCol(reflect(Vn, vN)) * .5;
    } else {
      if (type > 5.5) { r.x = mix(r.x, hash12(vec2(id.y, seed * 91.)), .8); frac *= .4; warm = mix(vec3(.75, .86, 1.), vec3(1., .86, .66), r.y); }
      if (type > 2.5 && type < 3.5) { frac *= .5; warm = mix(vec3(.8, .9, 1.), vec3(1., .8, .55), step(.5, r.y)); }
      if (type > 4.5 && type < 5.5) frac *= bias > 2. ? 3.2 : .8;
      float on = step(r.x, frac);
      float sel = fract(r.x * 61.7 + r.y * 13.3), tvk = step(.9, sel), cool = step(sel, .07);
      vec3 wc = mix(warm, vec3(.82, .92, 1.) * .8, cool);
      wc = mix(wc, vec3(.28, .48, 1.) * (.45 + .7 * vnoise(vec2(uT * 4. + r.z * 90., r.w * 9.))), tvk);
      float resp = step(.6, fract(r.x * 91.7 + r.z * 7.1));
      float tl = pow(min(tail, 1.5), .7 + 3. * r.z);
      vec3 emb = ember(tl * 2.1) * resp * (.6 + .8 * r.y);
      // panes: a mullion, and now and then a drawn curtain
      float pane = 1. - .75 * (1. - smoothstep(.0, fwc.x * 1.2 + .012, abs(f.x - .5))) * step(.5, 1. - lod);
      float curt = mix(1., .25, step(.62, r.y) * step(f.x, .5));
      em = (wc * br * on * curt + emb) * pane;
      float stair = type < .5 && mod(id.x, 9.) == 4. && fract(seed * 5.3) < .65 ? 1. : 0.;
      em += vec3(.42, .55, .40) * .14 * stair;
      em *= .6 + .62 * f.y;
      if (id.y < .5 && type < 1.5) em = vec3(1., .68, .4) * .2 * step(fract(r.y * 7.), .35);
      vec3 embAvg = ember(pow(min(tail, 1.5), 1.7) * 2.1) * .3;
      avg = (mix(warm, vec3(.6, .65, .8), .12) * .42 * frac + embAvg * mix(pow(cr.y, 2.) * 3., 1., lod2)) * coarse + vec3(.42, .55, .40) * .014 * stair;
      if (type > 5.5) em += skyCol(reflect(Vn, vN)) * .35;
    }
    vec3 emis = mix(em * win, avg * area, lod);
    // the wall itself: concrete, floor bands, a loggia parapet now and then
    vec3 alb = vec3(.044, .043, .042) * tone * (type > 4.5 && type < 5.5 ? 1.3 : 1.);
    float parapet = step(.5, hash12(vec2(id.x, seed * 31.))) * step(f.y, .2) * step(type, 1.5);
    alb *= mix(1. - .34 * smoothstep(y1, y1 + .04, f.y) + .55 * parapet, 1., lod);
    alb *= mix(.8 + .4 * hash12(vec2(floor(vF.x / bay / 6. + seed * 9.), seed)), 1., lod2);
    alb *= 1. - .85 * mix(win, area, lod);
    vec3 L = vec3(.034, .040, .058) * (.8 + .2 * smoothstep(0., 30., vF.y))
      + SOD * .34 * exp(-vF.y / 8.) * (.5 + .5 * hash11(seed * 3.7 + vFace)) * mix(.4, 1., wk)
      + vec3(.09, .055, .03) * pow(max(dot(vN.xz, uGlowDir), 0.), 2.)
      + BRASS * uShop.z * 9. * max(dot(vN, toShop / dShop), 0.) / (1. + dShop * dShop / 900.);
    col = alb * L + emis;
    col += FRONT * band * (1.7 + 1.2 * win * (1. - lod)) + BRASS * soft * (.20 + .5 * mix(win, area, lod));
  }
  fragColor = vec4(fogged(col, vW), dist / 8.);
}`);
    const bMesh = new THREE.Mesh(bGeo, bMat); bMesh.frustumCulled = false; bMesh.renderOrder = 0; world.add(bMesh);

    // ---------------------------------------------------------------- ground: real roads (analytic, from the segment table), light pools, water
    const tMap = new THREE.DataTexture(city.map, MW, MH, THREE.RGBAFormat, THREE.UnsignedByteType); tMap.minFilter = tMap.magFilter = THREE.LinearFilter; tMap.needsUpdate = true;
    const tIdx = new THREE.DataTexture(city.idx, MW, MH, THREE.RGBAFormat, THREE.UnsignedByteType); tIdx.minFilter = tIdx.magFilter = THREE.NearestFilter; tIdx.needsUpdate = true;
    const tSeg = new THREE.DataTexture(city.segTex, 512, 2, THREE.RGBAFormat, THREE.FloatType); tSeg.minFilter = tSeg.magFilter = THREE.NearestFilter; tSeg.needsUpdate = true;
    const gGeo = new THREE.BufferGeometry(); { const S = 40000; gGeo.setAttribute('position', new THREE.Float32BufferAttribute([-S, 0, S, S, 0, S, S, 0, -S, -S, 0, -S], 3)); gGeo.setIndex([0, 1, 2, 0, 2, 3]); }
    const gMat = mat(/* glsl */`
in vec3 position; out vec3 vW;
void main(){ vW = position; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }`, /* glsl */`
in vec3 vW; out vec4 fragColor;
uniform sampler2D tMap, tIdx, tSeg; uniform vec4 uMapR, uAxis; uniform float uDbg;
void main(){
  vec2 p = vW.xz; vec3 V = vW - uCam; float dist = length(V); vec3 Vn = V / dist;
  float fp = max(fwidth(p.x), fwidth(p.y));
  vec2 muv = (p - uMapR.xy) * uMapR.zw; float inMap = step(0., muv.x) * step(muv.x, 1.) * step(0., muv.y) * step(muv.y, 1.);
  vec4 mp = texture(tMap, muv) * inMap;
  float n1 = vnoise(p * .012), n2 = vnoise(p * .09 + 31.);
  float wv = mp.r + (vnoise(p * .02) - .5) * .1, ww = max(fwidth(wv), .02);
  float water = smoothstep(.5 - ww, .5 + ww, wv);
  float pk = mp.g + (n1 - .5) * .2, park = smoothstep(.4, .6, pk) * (1. - water), built = mp.b * (1. - park);
  // ---- nearest street: two candidate segments per 10 m cell, evaluated exactly
  vec4 ix = floor(texture(tIdx, muv) * 255. + .5) * inMap;
  float bE = 1e5, bD = 1e5, along = 0.; vec4 sm = vec4(1., 9., 0., 1.);
  for (int k = 0; k < 2; k++) { float id = k == 0 ? ix.r + ix.g * 256. : ix.b + ix.a * 256.; if (id < .5) continue;
    vec4 sg = texelFetch(tSeg, ivec2(int(id), 0), 0), m = texelFetch(tSeg, ivec2(int(id), 1), 0);
    vec2 pa = p - sg.xy, ba = sg.zw - sg.xy; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.), d = length(pa - ba * h);
    if (d - m.x < bE) { bE = d - m.x; bD = d; sm = m; along = m.z + h * m.w; } }
  float hw = sm.x, cls = sm.y, rail = step(3.5, cls), mway = 1. - step(.5, cls), dual = 1. - step(1.5, cls);
  float road = (1. - smoothstep(-fp, fp, bE)) * (1. - rail);
  float asph = mix(1. - smoothstep(hw - 4. - fp, hw - 4. + fp, bD), smoothstep(2.5 - fp, 2.5 + fp, bD) * (1. - smoothstep(hw - 6. - fp, hw - 6. + fp, bD)), dual) * (1. - rail);
  float LS = mix(42., 36., mway), PR = mix(13.5, 16., mway), off = hw - 3., u = (fract(along / LS + .5) - .5) * LS;
  float tA = clamp(dot(p, uAxis.xy) / (uAxis.z * uAxis.z), 0., 1.), dens = 1. - .7 * smoothstep(1300., 3600., distance(p, uAxis.xy * tA));
  float pool = exp(-((bD - off) * (bD - off)) / (PR * PR)) * mix(exp(-u * u / (PR * PR)) * 1.7, .57, smoothstep(.12, .5, fp / LS)) * (1. - rail) * mix(.55, 1., dual) * mix(dens, 1., water);
  vec3 lampC = mix(SOD, PAPERW, mway);
  // ---- surfaces
  vec3 col = vec3(.0030, .0033, .0030) * (.7 + .7 * n1);
  col = mix(col, vec3(.0046, .0046, .0050) * (.75 + .5 * n2), built * .7);                 // paved city
  col = mix(col, vec3(.0014, .0021, .0015) * (.6 + .8 * n1), park);                         // parks and voids stay dark
  { vec2 lc = p / 26.; float lod = smoothstep(.25, .9, max(fwidth(lc.x), fwidth(lc.y))); col *= mix(.75 + .5 * hash12(floor(lc)), 1., max(lod, 1. - built)); }
  col += mix(SOD, vec3(.8, .9, 1.), .3) * .0016 * built * dens * smoothstep(.45, .8, vnoise(p * .035)); // yards and car parks, barely lit
  col += mix(SOD, PAPERW, .35) * built * (1. - water) * mix(.22, 1., wakeAt(p, 0.)) * (.0016 + .02 * smoothstep(1800., 7000., dist)) * (.6 + .8 * n1); // far off, the lights fuse into a carpet: the rivers read as the dark between
  vec3 verge = vec3(.0040, .0041, .0040), tar = vec3(.0072, .0070, .0070) * (.85 + .3 * n2);
  col = mix(col, vec3(.0058), smoothstep(fp, -fp, bE - 1.5) * rail * .7);
  col *= 1. - water;
  // water: smooth and dark; it holds the horizon, and the lights of bridges and quays
  if (water > .001) {
    vec2 rp = vec2(vnoise(p * .045 + uT * vec2(.21, .13)), vnoise(p * .045 + 9. - uT * vec2(.17, .22))) - .5;
    vec3 n = normalize(vec3(rp.x * .05, 1., rp.y * .05)), Rf = reflect(Vn, n);
    float fres = .03 + .97 * pow(1. - max(dot(-Vn, n), 0.), 5.);
    vec3 wc = skyCol(normalize(vec3(Rf.x, Rf.y * .3, Rf.z))) * fres * .8 + vec3(.0012, .0014, .0018); // flattened: the water catches the city's glow along the horizon
    vec2 tc = normalize(uCam.xz - p); float streak = .45 + 1.1 * vnoise(vec2(dot(p, vec2(-tc.y, tc.x)) / 7., dot(p, tc) * .02 - uT * .5));
    wc += lampC * .05 * exp(-max(bE, 0.) / 85.) * streak * (1. - rail);                                   // bridge lights
    float bank = 1. - smoothstep(.52, .93, mp.r);                                                         // the quay lamps, smeared on the water toward us
    wc += mix(SOD, PAPERW, .25) * .075 * bank * streak * streak * mix(.3, 1., wakeAt(p, 0.));
    wc += vec3(.004, .0034, .003) * (1. - fres) * smoothstep(.5, 1., wv);                                 // open water is a shade lighter than the land
    col += wc * water;
  }
  float deck = max(road, smoothstep(fp, -fp, bE - 1.5) * rail * water);
  col = mix(col, verge, road); col = mix(col, tar, asph); col = mix(col, vec3(.005), deck * water * (1. - asph));
  col += lampC * pool * (.020 + .055 * asph + .02 * road) * mix(.34, 1., wakeAt(p, 0.));
  col += vec3(.016, .011, .007) * asph * dual * .6;                                                   // faint lane glow
  // ---- the shop's own light, Sava Centar's, and the wave
  float dS = distance(p, uShop.xy);
  col += BRASS * uShop.z * (.14 / (1. + dS * dS / 260.) + .012 * exp(-dS / 70.)) + BRASS * uShop.w * .5 * exp(-dS / 55.);
  float band, soft, tail; waves(p, 0., band, soft, tail);
  float wet = mix(1., .5, water);
  col += vec3(1., .62, .26) * uSava * .05 * exp(-distance(p, uAxis.xy) / 150.) * (1. - water);
  col += (FRONT * min(band, 1.6) * 3.2 + BRASS * min(soft, 1.3) * .5 + ember(min(tail, 1.1)) * (.015 + .026 * road)) * wet;
  fragColor = vec4(fogged(col, vW), dist / 8.);
  if (uDbg > .5) { vec3 d = vec3(.02) * built; d = mix(d, vec3(0., .05, 0.), park); d = mix(d, vec3(0., .01, .09), water); d = mix(d, vec3(.12, .03, 0.), max(road, asph)); d = mix(d, vec3(.1, .1, .1), smoothstep(fp, -fp, bE - 1.5) * rail); fragColor = vec4(d, dist / 8.); }
}`, {
      uDbg: { value: 0 }, tMap: { value: tMap }, tIdx: { value: tIdx }, tSeg: { value: tSeg },
      uMapR: { value: new THREE.Vector4(MX0, MZ0, 1 / (MX1 - MX0), 1 / (MZ1 - MZ0)) }, uAxis: { value: new THREE.Vector4(SAVA[0], SAVA[1], DIST, 0) },
    });
    const gMesh = new THREE.Mesh(gGeo, gMat); gMesh.frustumCulled = false; gMesh.renderOrder = 1; world.add(gMesh);

    // ---------------------------------------------------------------- sky (drawn at the far plane, after the opaque city)
    const triGeo = new THREE.BufferGeometry(); triGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const RAY = { uFwd: { value: new THREE.Vector3() }, uRight: { value: new THREE.Vector3() }, uUp: { value: new THREE.Vector3() } };
    const sMat = mat(/* glsl */`
in vec3 position; out vec2 vP; void main(){ vP = position.xy; gl_Position = vec4(position.xy, 1., 1.); }`, /* glsl */`
in vec2 vP; out vec4 fragColor; uniform vec3 uFwd, uRight, uUp;
void main(){
  vec3 d = normalize(uFwd + vP.x * uRight + vP.y * uUp);
  vec3 c = skyCol(d);
  float el = asin(clamp(d.y, -1., 1.)), az = atan(d.z, d.x);
  // a few stars
  vec2 g = vec2(az, el) * (57.2958 / .9); vec2 id = floor(g); vec2 h = hash22(id + 11.3); float pick = hash12(id * 1.31 + 4.7);
  float fw = max(fwidth(g.x), fwidth(g.y)), rad = max(.03, fw * .85);
  float dd = length(g - id - .15 - .7 * h);
  float mag = pow(clamp((pick - .945) / .055, 0., 1.), 3.);
  float tw = .8 + .2 * sin(uT * (1.5 + 4. * h.x) + h.y * 40.);
  vec3 tint = mix(vec3(1., .86, .7), vec3(.74, .83, 1.), h.y);
  c += tint * mag * tw * 1.1 * exp(-dd * dd / (rad * rad)) * pow(.03 / rad, 1.4) * smoothstep(.035, .3, d.y);
  // thin veils of haze near the horizon, lit from below
  float veil = fbm(vec2(az * 9. + uT * .004, el * 60.)) * exp(-max(d.y, 0.) * 16.);
  c *= 1. + .5 * veil;
  fragColor = vec4(c, 8000.);
}`, RAY, { depthWrite: false });
    const sMesh = new THREE.Mesh(triGeo, sMat); sMesh.frustumCulled = false; sMesh.renderOrder = 2; world.add(sMesh);

    // ---------------------------------------------------------------- lights (points) and cars
    const NL = city.lights.length / 9;
    const lGeo = new THREE.BufferGeometry();
    { // shuffle so that a lower quality thins them evenly; the shop and landmark lights stay first
      const idx = Array.from({ length: NL }, (_, i) => i), r = util.rng(7); const key = i => (city.lights[i * 9 + 8] >= 2 ? -1 : r());
      const keys = idx.map(key); idx.sort((a, b) => keys[a] - keys[b]);
      const P = new Float32Array(NL * 3), C = new Float32Array(NL * 3), A = new Float32Array(NL * 3);
      idx.forEach((i, k) => { const o = i * 9, L = city.lights; P.set([L[o], L[o + 1], L[o + 2]], k * 3); C.set([L[o + 3], L[o + 4], L[o + 5]], k * 3); A.set([L[o + 6], L[o + 7], L[o + 8]], k * 3); });
      lGeo.setAttribute('position', new THREE.BufferAttribute(P, 3)); lGeo.setAttribute('aC', new THREE.BufferAttribute(C, 3)); lGeo.setAttribute('aP', new THREE.BufferAttribute(A, 3));
    }
    const PX = { uPx: { value: 1000 } };
    const SPRITE = /* glsl */`
in vec3 vC; out vec4 fragColor;
void main(){ vec2 q = gl_PointCoord * 2. - 1.; float r2 = dot(q, q); float a = exp(-r2 * 7.) * .75 + exp(-r2 * 30.) * .9 - .0007; if (a <= 0.) discard; fragColor = vec4(vC * a, 0.); }`;
    const lMat = mat(/* glsl */`
in vec3 position, aC, aP; uniform float uPx; out vec3 vC;
void main(){
  vec4 mv = viewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; float dist = max(-mv.z, 1.);
  float kind = aP.z, size = aP.x; vec3 c = aC; float minPx = 1.25;
  float band, soft, tail; waves(position.xz, aP.y * 40., band, soft, tail);
  if (kind < .5) c *= mix(.42, 1., wakeAt(position.xz, 0.)) * (1. + min(band * 2.2 + soft * 1.2, 2.6) + tail * .8);                                   // street lamps flare with the front
  else if (kind < 1.5) c *= mix(.42, 1., wakeAt(position.xz, aP.y * 400.)) * (1. + tail * .5) * (.85 + .15 * sin(uT * (1. + aP.y * 3.) + aP.y * 50.));
  else if (kind < 2.5) { c = BRASS * (9. * uShop.z + 22. * uShop.w); size *= 1. + .5 * uShop.w; minPx = 4.6; }
  else if (kind < 3.5) c *= .25 + .75 * smoothstep(.55, .9, sin(uT * 2.1 + aP.y * 2.));
  else if (kind < 4.5) c *= .2 + uSava;
  else c *= 1. + min(band * 2.2 + soft * 1.2, 2.6) + tail * .5;                                                                              // quays and bridges: always lit
  float px = size * uPx / dist, sz = max(px, minPx);
  vC = c * pow(px / sz, 1.3) * fogT(position);
  gl_PointSize = sz * 3.2;
}`, SPRITE, PX, ADD);
    const lPts = new THREE.Points(lGeo, lMat); lPts.frustumCulled = false; lPts.renderOrder = 3; world.add(lPts);

    const NC = city.cars.length / 10; // records: x, z, cum, dx, dz, len, speed, seed, line length, phase
    const cGeo = new THREE.BufferGeometry();
    { const A = new Float32Array(NC * 3), B = new Float32Array(NC * 4), C = new Float32Array(NC * 3);
      for (let k = 0; k < NC; k++) { const o = k * 10, c = city.cars; A.set([c[o], c[o + 1], c[o + 2]], k * 3); B.set([c[o + 3], c[o + 4], c[o + 5], c[o + 6]], k * 4); C.set([c[o + 8], c[o + 9], c[o + 7]], k * 3); }
      cGeo.setAttribute('position', new THREE.BufferAttribute(A, 3)); cGeo.setAttribute('aD', new THREE.BufferAttribute(B, 4)); cGeo.setAttribute('aL', new THREE.BufferAttribute(C, 3)); }
    const cMat = mat(/* glsl */`
in vec3 position; in vec4 aD; in vec3 aL; uniform float uPx, uCarT; out vec3 vC;
void main(){
  // one car travels the whole line; this record draws it only while it is on this segment
  float along = mod(aL.y + aD.w * uCarT, aL.x) - position.z;
  float on = step(0., along) * step(along, aD.z);
  vec3 wp = vec3(position.x + aD.x * along, 1.2, position.y + aD.y * along);
  vec4 mv = viewMatrix * vec4(wp, 1.); gl_Position = projectionMatrix * mv; float dist = max(-mv.z, 1.);
  float away = dot(aD.xy, normalize(wp.xz - uCam.xz));
  vec3 c = away > 0. ? vec3(1., .07, .04) * 1.5 : vec3(1., .92, .78) * 3.4;
  c *= on * (.7 + .3 * aL.z);
  float px = 1.5 * uPx / dist, sz = max(px, 1.2);
  vC = c * pow(px / sz, 1.1) * fogT(wp);
  gl_PointSize = on > .5 ? sz * 3.2 : 0.;
}`, SPRITE, { ...PX, uCarT: { value: 0 } }, ADD);
    const cPts = new THREE.Points(cGeo, cMat); cPts.frustumCulled = false; cPts.renderOrder = 4; world.add(cPts);

    // ---------------------------------------------------------------- air: refraction at the front, the front itself, drifting haze
    const hdrA = gfx.target({ depth: true, samples: 4 }), hdrB = gfx.target({});
    const air = gfx.pass(/* glsl */`
uniform sampler2D tScene; uniform vec3 uFwd, uRight, uUp; uniform mat4 uVP; uniform float uHaze, uDepth;
${ATM}
void main(){
  vec2 ndc = vUv * 2. - 1.; vec3 rd = normalize(uFwd + ndc.x * uRight + ndc.y * uUp);
  float dist = uDepth > .5 ? texture(tScene, vUv).a * 8. : 1e5; vec3 P = uCam + rd * dist;
  vec2 off = vec2(0.); float shell = 0.;
  float nz = (vnoise(P.xz * .021) - .5) * 15.;
  for (int i = 0; i < ${NSRC}; i++){ vec4 s = uSrc[i]; if (s.w <= 0.) continue;
    float R = s.z, att = s.w / pow(1. + R / 1500., .55);
    vec2 q = P.xz - s.xy; float d = length(q), w = 15. + R * .006, e = (d - R + nz) / w;
    if (abs(e) < 3. && dist < 40000.) { vec2 rad = q / max(d, 1.); vec4 c0 = uVP * vec4(P, 1.), c1 = uVP * vec4(P + vec3(rad.x, 0., rad.y) * w, 1.);
      off += (c1.xy / c1.w - c0.xy / c0.w) * (-e * exp(-e * e)) * att * .9; }
    // the wavefront in the air: a thin spherical shell, visible only close to the ground
    vec3 oc = uCam - vec3(s.x, 0., s.y); float b = dot(oc, rd), dc2 = dot(oc, oc) - b * b;
    float ws = 4. + R * .0035, ho = sqrt(max((R + ws) * (R + ws) - dc2, 0.)), hi = sqrt(max((R - ws) * max(R - ws, 0.) - dc2, 0.));
    float path = ho - hi; if (path > 0. && R > 8.) { att *= smoothstep(8., 90., R); float hm = .5 * (ho + hi), Hc = 30. + R * .03, k = att * pow(path / ws, .5);
      float t0 = -b - hm, t1 = -b + hm; vec3 h0 = uCam + rd * t0, h1 = uCam + rd * t1;
      if (t0 > 0. && t0 < dist && h0.y > -2.) shell += k * exp(-max(h0.y, 0.) / Hc) * (.55 + .9 * vnoise(h0.xz * .03 + h0.y * .05));
      if (t1 > 0. && t1 < dist && h1.y > -2.) shell += k * exp(-max(h1.y, 0.) / Hc) * (.55 + .9 * vnoise(h1.xz * .03 + h1.y * .05)); }
  }
  vec2 uv = vUv + off * .5;
  vec3 col = vec3(texture(tScene, uv + off * .06).r, texture(tScene, uv).g, texture(tScene, uv - off * .06).b);
  col += FRONT * min(shell, 7.) * .021;
  // low haze, drifting
  float hz = vnoise(P.xz * .0011 + uT * vec2(.013, .006)) * vnoise(P.xz * .0033 - uT * vec2(.011, .019) + 9.);
  col += skyCol(normalize(vec3(rd.x, 0., rd.z))) * hz * uHaze * (1. - exp(-dist / 2600.)) * exp(-max(P.y, 0.) / 90.);
  fragColor = vec4(col, 1.);
}`, { tScene: hdrA.texture, uFwd: null, uRight: null, uUp: null, uVP: new THREE.Matrix4(), uHaze: .45, uDepth: gfx.floatOK ? 1 : 0, // without float targets there is no distance in alpha: skip occlusion
      uCam: null, uT: 0, uSrc: null, uWake: null, uShop: null, uGlowDir: null, uSava: 0, uDecay: 4.2 });
    for (const k in U) air.u[k] = air.material.uniforms[k] = U[k];
    for (const k in RAY) air.u[k] = air.material.uniforms[k] = RAY[k];

    // ---------------------------------------------------------------- overlay: leader lines + text
    const MAXQ = 16, oGeo = new THREE.BufferGeometry();
    const oPos = new Float32Array(MAXQ * 12), oDat = new Float32Array(MAXQ * 16);
    { const idx = []; for (let i = 0; i < MAXQ; i++) idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
      oGeo.setAttribute('position', new THREE.BufferAttribute(oPos, 3)); oGeo.setAttribute('aD', new THREE.BufferAttribute(oDat, 4)); oGeo.setIndex(idx); oGeo.setDrawRange(0, 0); }
    const oU = { uView: { value: new THREE.Vector2(1920, 1080) }, uAA: { value: 1 } };
    const oMat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: oU, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `precision highp float; in vec3 position; in vec4 aD; uniform vec2 uView; out vec4 vD; out float vK;
void main(){ vD = aD; vK = position.z; gl_Position = vec4(position.x / uView.x * 2. - 1., 1. - position.y / uView.y * 2., 0., 1.); }`,
      fragmentShader: `precision highp float; in vec4 vD; in float vK; uniform float uAA; out vec4 fragColor;
void main(){ float a; vec3 c = vec3(.957, .918, .847);
  if (vK > 2.5) { a = (1. - smoothstep(.35, 1., abs(vD.x))) * (1. - smoothstep(.2, 1., abs(vD.y))); c = vec3(.012, .009, .007); } // a soft dark plate under a label
  else if (vK < .5) a = 1. - smoothstep(vD.z - uAA, vD.z + uAA, abs(vD.y)); else { float r = length(vD.xy); a = vK < 1.5 ? 1. - smoothstep(.9 - uAA, .9 + uAA, abs(r - vD.z)) : 1. - smoothstep(vD.z - uAA, vD.z + uAA, r); }
  a *= vD.w; if (a < .003) discard; fragColor = vec4(c, a); }` });
    const oScene = new THREE.Scene(), oCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); { const m = new THREE.Mesh(oGeo, oMat); m.frustumCulled = false; oScene.add(m); }
    let oN = 0;
    const oQuad = (x0, y0, x1, y1, x2, y2, x3, y3, d, kind) => { if (oN >= MAXQ) return; const o = oN * 12, q = oN * 16; oPos.set([x0, y0, kind, x1, y1, kind, x2, y2, kind, x3, y3, kind], o); oDat.set(d, q); oN++; };
    const oLine = (ax, ay, bx, by, alpha, hw = .8) => { const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy); if (l < 1 || alpha < .01) return; const nx = -dy / l * (hw + 2), ny = dx / l * (hw + 2), h = hw + 2;
      oQuad(ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny, [0, h, hw, alpha, 0, h, hw, alpha, 0, -h, hw, alpha, 0, -h, hw, alpha], 0); };
    const oPlate = (x, y, w, h, alpha) => { if (alpha < .01) return; const px = 34, py = 22; oQuad(x - px, y - py, x + w + px, y - py, x + w + px, y + h + py, x - px, y + h + py, [-1, -1, 0, alpha, 1, -1, 0, alpha, 1, 1, 0, alpha, -1, 1, 0, alpha], 3); };
    const oRing = (x, y, r, alpha, fillK) => { if (alpha < .01) return; const e = r + 3; oQuad(x - e, y - e, x + e, y - e, x + e, y + e, x - e, y + e, [-e, -e, r, alpha, e, -e, r, alpha, e, e, r, alpha, -e, e, r, alpha], fillK ? 2 : 1); };

    const ui = ctx.overlay();
    const INK = '#f4ead8', DIM = '#b9ad98', BR = '#d8a548';
    const h1 = ui.text('talas.b1.h', { size: 104, font: 'display', color: INK, width: 900, leading: 1.06 });
    const p1 = ui.text('talas.b1.p', { size: 38, font: 'text', color: DIM, width: 640, leading: 1.32 });
    const h2 = ui.text('talas.b2.h', { size: 104, font: 'display', color: INK, width: 900, leading: 1.06 });
    const p2 = ui.text('talas.b2.p', { size: 38, font: 'text', color: DIM, width: 700, leading: 1.32 });
    const hint = ui.text('talas.hint', { size: 30, font: 'textMed', color: BR });
    const BOT = { a: 600, b: 600 };
    const lLyra = ui.text('talas.lyra', { size: 29, font: 'textMed', color: INK });
    const lSava = ui.text('talas.sava', { size: 29, font: 'textMed', color: INK });
    const CSZ = 62;
    const cInt = Array.from({ length: 12 }, (_, i) => ui.text(String(i), { size: CSZ, font: 'display', color: INK, align: 'right', valign: 'baseline' }));
    const cDec = Array.from({ length: 10 }, (_, i) => ui.text(',' + i, { size: CSZ, font: 'display', color: INK, align: 'left', valign: 'baseline' }));
    const cUnit = ui.text(' s', { size: CSZ * .62, font: 'displayItalic', color: BR, align: 'left', valign: 'baseline' });
    let decW = 0; const balCache = {};
    // narrowest wrap that keeps the line count: no orphan word on the last line
    const balance = (key, size, maxW) => { const ck = [key, ctx.lang(), Math.round(size), Math.round(maxW)].join('|'); if (balCache[ck]) return balCache[ck];
      const o = { size, font: 'display', leading: 1.06 }, h0 = ui.measure(key, { ...o, width: maxW }).h; let lo = maxW * .45, hi = maxW;
      for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (ui.measure(key, { ...o, width: mid }).h <= h0 + 1) hi = mid; else lo = mid; }
      return (balCache[ck] = Math.ceil(hi) + 2); };
    const setLang = () => {
      const tpl = ctx.t('talas.sec', { n: '\u0001' }), suf = (tpl.split('\u0001')[1] || ' s').trim(), sep = ctx.lang() === 'en' ? '.' : ',';
      cDec.forEach((T, i) => T.set(sep + i)); cUnit.set(suf);
      decW = Math.max(...cDec.map((_, i) => ui.measure(sep + i, { size: CSZ, font: 'display' }).w));
    };
    setLang();

    // ---------------------------------------------------------------- camera: solve a pose that frames both places
    // pitch is fixed by where the horizon must sit (below the words, so they always stay over dark sky);
    // x, z, yaw are solved so the shop and Sava Centar land where the composition wants them.
    const pose = (q, h, tanF, asp, P) => { // -> ndc of world point P for camera q = [x, z, yaw, pitch] at height h
      const cy = Math.cos(q[2]), sy = Math.sin(q[2]), cp = Math.cos(q[3]), sp = Math.sin(q[3]);
      const dx = P[0] - q[0], dy = P[1] - h, dz = P[2] - q[1];
      const zf = cy * cp * dx + sp * dy + sy * cp * dz;
      return [(-sy * dx + cy * dz) / (zf * tanF * asp), (-cy * sp * dx + cp * dy - sy * sp * dz) / (zf * tanF), zf];
    };
    const P_SHOP = [0, SHOP_Y, 0], P_SAVA = [SAVA[0], SAVA_Y * .5, SAVA[1]];
    const solve = (h, fov, asp, yH, ts, tvx) => {
      const tanF = Math.tan(fov * D2R / 2), pitch = -Math.atan(yH * tanF);
      const yaw0 = JA - .12, d0 = h / Math.tan(Math.max(.05, -pitch + Math.atan(-ts[1] * tanF)));
      const q = [-Math.cos(yaw0) * d0, -Math.sin(yaw0) * d0, yaw0];
      const F = q => { const a = pose([...q, pitch], h, tanF, asp, P_SHOP), b = pose([...q, pitch], h, tanF, asp, P_SAVA); return [a[0] - ts[0], a[1] - ts[1], b[0] - tvx]; };
      const eps = [.5, .5, 1e-4];
      for (let it = 0; it < 50; it++) {
        const f = F(q), M = [[], [], []];
        for (let k = 0; k < 3; k++) { const q2 = q.slice(); q2[k] += eps[k]; const f2 = F(q2); for (let r = 0; r < 3; r++) M[r][k] = (f2[r] - f[r]) / eps[k]; }
        for (let r = 0; r < 3; r++) M[r][3] = -f[r];
        for (let c = 0; c < 3; c++) { let pv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[pv][c])) pv = r; [M[c], M[pv]] = [M[pv], M[c]]; if (Math.abs(M[c][c]) < 1e-12) return null;
          for (let r = 0; r < 3; r++) if (r !== c) { const m = M[r][c] / M[c][c]; for (let k = c; k < 4; k++) M[r][k] -= m * M[c][k]; } }
        const dq = M.map((row, r) => row[3] / row[r]); let st = 1; const lim = [h * 1.5, h * 1.5, .1];
        for (let k = 0; k < 3; k++) st = Math.min(st, lim[k] / (Math.abs(dq[k]) + 1e-9));
        for (let k = 0; k < 3; k++) q[k] += dq[k] * st;
        if (!q.every(Number.isFinite)) return null;
        if (Math.hypot(...f) < 1e-6) break;
      }
      const chk = F(q); if (Math.hypot(...chk) > .02) return null;
      return { x: q[0], z: q[1], h, yaw: q[2], pitch, fov };
    };
    let camA = null, camB = null, camKey = '';
    const HOR = { a: .3, b: .3 }; // horizon (ndc y) per beat, from the text layout
    const fit = () => {
      const asp = gfx.aspect, key = [asp.toFixed(3), HOR.a.toFixed(3), HOR.b.toFixed(3)].join('|'); if (key === camKey) return; camKey = key;
      const port = asp < .95, fov = clamp(44 * Math.pow(1.6 / asp, .5), 38, 64), kx = Math.min(1, Math.pow(1.6 / asp, .55));
      if (port) {
        camA = solve(760, fov, asp, HOR.a, [-.12, -.5], .22); camB = solve(300, fov, asp, HOR.b, [-.1, -.42], .26);
      } else {
        camA = solve(asp > 2.2 ? 900 : 1000, fov, asp, HOR.a, [-.42 * kx, -.62], .36 * kx); camB = solve(250, fov, asp, HOR.b, [-.22 * kx, -.6], .4 * kx);
      }
      const fb = (h, yH) => ({ x: -1500, z: -300, h, yaw: JA - .15, pitch: -Math.atan(yH * Math.tan(fov * D2R / 2)), fov });
      camA = camA || fb(700, HOR.a); camB = camB || fb(260, HOR.b);
      if (ctx.headless) window.__talasCam = { camA, camB };
    };
    const vF = new THREE.Vector3(), vR = new THREE.Vector3(), vU = new THREE.Vector3(), vT = new THREE.Vector3();
    let tanF = .36;
    const project = (x, y, z) => { vT.set(x, y, z).applyMatrix4(cam.matrixWorldInverse); const zf = -vT.z; if (zf < 5) return null; return { x: (vT.x / (zf * tanF * cam.aspect) * .5 + .5) * view.w, y: (.5 - vT.y / (zf * tanF) * .5) * view.h, d: zf }; };

    // ---------------------------------------------------------------- wave bookkeeping
    const PER = 4.6, P0 = .7, LIFE0 = 21, LIFE = 12.5;
    let user = [], live = [], prevT = 0, prevK = -1, lastSub = -1, lastAir = -1, tap = null, lastUser = -9;
    const tWaveOf = s => s.since(0) - LAUNCH;
    const kOf = s => (s.beat >= 1 ? Math.floor((s.since(1) - P0) / PER) : -1);
    const env = (age, life) => smoothstep(0, .1, age) * (1 - smoothstep(life - 3.5, life, age));
    const launch = (x, z, s) => { user.push({ x, z, t0: s.t }); if (user.length > NSRC) user.shift(); lastUser = s.t;
      const pan = clamp(((project(x, 0, z) || { x: view.w / 2 }).x / view.w) * 2 - 1, -1, 1) * .7;
      ctx.audio.drum('kick', { gain: .7, pan, pitch: .9 + .25 * Math.random() }); ctx.sfx('thud', { gain: .35, pan }); };

    const grade = { exposure: 1.1, bloom: .75, threshold: .9, knee: .7, radius: 1.15, tone: 'aces', contrast: 1.06, saturation: 1.04, vignette: .36, grain: .032, halation: .5, lift: [.0032, .0025, .0019], gain: [1, 1, 1], fade: 1 };

    // ---------------------------------------------------------------- words: laid out before the camera, which keeps the horizon below them
    const layout = () => {
      const vw = view.w, vh = view.h, port = view.portrait;
      const sT = view.safeTop || 110, sS = view.safeSide || 90;
      const mx = Math.max(sS, port ? 96 : vw * .062), top = sT + (port ? 90 : 40), avail = vw - mx * 2;
      const hs = port ? 92 : clamp(vw * .056, 96, 112);
      hint.set(view.touch ? 'talas.hintTouch' : 'talas.hint'); hint.size = port ? 32 : 29; hint.wrap = avail;
      const block = (H, P, X, key, hsz) => {
        H.size = hsz; H.wrap = balance(key, hsz, port ? avail : Math.min(vw * .5, hsz * 8.7)); P.size = port ? 40 : 36; P.wrap = port ? avail - 30 : 560;
        H._sync(); P._sync(); if (X) X._sync();
        const gap = 70; H.x = mx; H.y = top;
        if (!port && mx + H.width + gap + 520 <= vw - mx) { // two columns: the paragraph sits beside the headline, foot to foot
          P.x = mx + H.width + gap; P.wrap = Math.min(600, vw - mx - P.x); P._sync();
          const colH = P.height + (X ? X.height + 28 : 0); P.y = Math.max(top + 8, top + H.height - colH - 4);
          if (X) { X.x = P.x; X.y = P.y + P.height + 28; }
        } else {
          P.x = mx; P.y = top + H.height + (port ? 40 : 32);
          if (X) { X.x = mx; X.y = P.y + P.height + (port ? 40 : 28); }
        }
        return Math.max(H.y + H.height, P.y + P.height, X ? X.y + X.height : 0);
      };
      BOT.a = block(h1, p1, null, 'talas.b1.h', hs); BOT.b = block(h2, p2, hint, 'talas.b2.h', port ? hs : hs * .9);
      const hz = bot => Math.round(clamp(1 - 2 * (bot + (port ? 80 : 70)) / vh, -.3, .62) * 200) / 200;
      HOR.a = hz(BOT.a); HOR.b = hz(BOT.b);
    };

    const inst = {
      async init() {
        layout(); fit();
        const s = { t: 0, dt: 0, time: 0, beat: 1, p: [1, 1], k: () => 1, at: b => (b ? 9 : 13), since: b => (b ? 9 : 17), enter: 1, exit: 0, q: 1, motion: 1, mouse: { x: 0, y: 0, down: false } };
        const tmp = gfx.target({ hdr: false, scale: .25 }); inst.update(s); inst.render(tmp, s); gfx.free(tmp);
      },
      enter(s) { user = []; tap = null; lastUser = -9; prevT = tWaveOf(s); prevK = kOf(s); lastSub = lastAir = -1; },
      exit() { ctx.audio.layer('sub', 0); ctx.audio.layer('air', 0); lastSub = lastAir = -1; },
      beat(s) { prevK = kOf(s); },
      resize() { camKey = ''; },
      lang() { setLang(); },

      update(s) {
        layout(); fit();
        const m = s.motion, t = s.t;
        const tW = tWaveOf(s), since1 = s.since(1);
        // ---- waves: the first one, the slow pulse of beat 2, and the visitor's own
        live = [];
        if (tW > 0 && tW < LIFE0) live.push({ x: 0, z: 0, age: tW, g: env(tW, LIFE0), shop: 1 });
        const k = kOf(s);
        if (s.beat >= 1) for (let i = k; i >= 0 && i > k - 3; i--) { const age = since1 - P0 - i * PER; if (age > 0 && age < LIFE) live.push({ x: 0, z: 0, age, g: .8 * env(age, LIFE), shop: 1 }); }
        for (const w of user) { const age = t - w.t0; if (age >= 0 && age < LIFE) live.push({ x: w.x, z: w.z, age, g: .85 * env(age, LIFE) }); }
        user = user.filter(w => t - w.t0 < LIFE);
        live.sort((a, b) => a.age - b.age); if (live.length > NSRC) live.length = NSRC;
        let flash = 0, sub = 0, airL = 0;
        for (let i = 0; i < NSRC; i++) { const w = live[i]; if (w) { src[i].set(w.x, w.z, CS * w.age, w.g); if (w.shop) flash += Math.exp(-w.age * 2.6); sub += w.g * Math.exp(-w.age / 3.5); airL = Math.max(airL, w.g * (1 - w.age / LIFE0)); } else src[i].set(0, 0, 0, 0); }
        U.uWake.value.set(0, 0, CS * Math.max(tW, 0), 1);
        const arr = tW - ARRIVE;
        U.uSava.value = arr > 0 ? .1 + smoothstep(0, .25, arr) * (.6 + 1.1 * Math.exp(-arr / 1.4)) : .1;
        const pre = tW < 0 ? smoothstep(-LAUNCH, 0, tW) : 0; // the point gathers itself before it lets go
        U.uShop.value.set(0, 0, .8 + .12 * Math.sin(t * 1.7) * m + .35 * pre * pre, Math.min(flash, 1.2));
        U.uT.value = t; cMat.uniforms.uCarT.value = t; U.uDecay.value = lerp(4.2, 2.3, s.k(1, 0, 4));

        // ---- cues (forward crossings only)
        if (s.dt > 0) {
          if (prevT < 0 && tW >= 0) { ctx.audio.drum('kick', { gain: .95 }); ctx.sfx('thud', { gain: .6 }); }
          if (prevT < ARRIVE && tW >= ARRIVE) ctx.sfx('bell', { gain: .5, pan: .3 });
          if (k > prevK && k >= 0) ctx.audio.drum('kick', { gain: .5, pitch: .92 });
        }
        prevT = tW; prevK = k;
        sub = clamp(sub * .85); airL = clamp(.12 + .7 * airL);
        if (Math.abs(sub - lastSub) > .01) { ctx.audio.layer('sub', sub); lastSub = sub; }
        if (Math.abs(airL - lastAir) > .01) { ctx.audio.layer('air', airL); lastAir = airL; }

        // ---- camera
        const kb = s.k(1, 0, 6.2, 'inOutCubic'), A = camA, B = camB;
        const settle = 1 - s.k(0, 0, 13, 'outCubic');                              // arrives from a little higher and further back
        const glide = ((1 - Math.exp(-Math.max(0, s.since(0) - 4) / 46)) * (1 - kb) + (1 - Math.exp(-Math.max(0, since1 - 5) / 40)) * kb) * (m < 1 ? .25 : 1);
        let yaw = lerp(A.yaw, B.yaw, kb), pitch = lerp(A.pitch, B.pitch, kb), cx = lerp(A.x, B.x, kb), cz = lerp(A.z, B.z, kb), ch = lerp(A.h, B.h, kb);
        const fwx = Math.cos(yaw), fwz = Math.sin(yaw);
        const back = settle * 230 * (1 - kb) - glide * lerp(150, 70, kb);
        cx -= fwx * back; cz -= fwz * back; ch += settle * 46 * (1 - kb) - glide * lerp(16, 8, kb);
        const sway = m * (1 - .6 * Math.sin(Math.PI * kb));
        cx += -fwz * (Math.sin(t * .113) * 16 + Math.sin(t * .071 + 1.3) * 11) * sway; cz += fwx * (Math.sin(t * .113) * 16 + Math.sin(t * .071 + 1.3) * 11) * sway;
        ch += (Math.sin(t * .093 + 2.1) * 5 + Math.sin(t * .157) * 2.5) * sway;
        const par = (1 - Math.sin(Math.PI * kb)) * (.3 + .7 * s.k(0, 0, 3)) * (s.motion < 1 ? .3 : 1);
        yaw += Math.sin(t * .083 + .4) * .0035 * sway + s.mouse.x * .03 * par; pitch += Math.sin(t * .067) * .002 * sway + s.mouse.y * .012 * par;
        let fov = lerp(A.fov, B.fov, kb);
        const dbg = ctx.headless && window.__talasTop; // test hook: a plan view, to check the map against reality
        gMat.uniforms.uDbg.value = dbg && dbg.length < 5 ? 1 : 0;
        if (dbg) { cx = dbg[0]; cz = dbg[1]; ch = dbg[2]; yaw = dbg.length > 4 ? dbg[4] : -Math.PI / 2; pitch = dbg.length > 5 ? dbg[5] : -1.5707; fov = dbg[3] || 40; }
        cam.fov = fov; cam.aspect = gfx.aspect; cam.updateProjectionMatrix(); tanF = Math.tan(fov * D2R / 2);
        cam.position.set(cx, ch, cz); cam.lookAt(cx + Math.cos(yaw) * Math.cos(pitch), ch + Math.sin(pitch), cz + Math.sin(yaw) * Math.cos(pitch)); cam.updateMatrixWorld(true);
        U.uCam.value.copy(cam.position);
        vF.set(0, 0, -1).transformDirection(cam.matrixWorld); vR.set(1, 0, 0).transformDirection(cam.matrixWorld).multiplyScalar(tanF * cam.aspect); vU.set(0, 1, 0).transformDirection(cam.matrixWorld).multiplyScalar(tanF);
        RAY.uFwd.value.copy(vF); RAY.uRight.value.copy(vR); RAY.uUp.value.copy(vU);
        air.u.uVP.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        PX.uPx.value = hdrA.height / (2 * tanF);
        const q = clamp(s.q, .35, 1);
        bGeo.instanceCount = Math.max(60, Math.floor(NB * (.4 + .6 * q)));
        lGeo.setDrawRange(0, Math.floor(NL * (.45 + .55 * q))); cGeo.setDrawRange(0, Math.floor(NC * (.4 + .6 * q)));

        // ---- grade follows the story
        const hit = arr > 0 ? Math.exp(-arr / 1.2) : 0;
        grade.exposure = 1.08 + .1 * smoothstep(0, 9, tW) + .12 * hit;
        grade.bloom = .72 + .22 * Math.min(flash, 1) + .35 * hit; grade.fade = 1; grade.halation = .5;
        if (dbg && dbg.length < 5) { grade.bloom = 0; grade.halation = 0; grade.vignette = 0; }

        // ---- words (positions were set by layout())
        const vw = view.w, vh = view.h, port = view.portrait;
        const out1 = s.k(1, 0, .8);
        const i1 = s.k(0, .7, 2.3), j1 = s.k(0, 2.5, 4.1), i2 = s.k(1, 3.8, 5.4), j2 = s.k(1, 5.2, 6.8), ih = s.k(1, 7.1, 8.3);
        h1.show(i1, { style: 'blur', by: 'word', q: out1 }); p1.show(j1, { style: 'rise', by: 'word', q: out1 });
        h2.show(i2, { style: 'blur', by: 'word' }); p2.show(j2, { style: 'rise', by: 'word' });
        const used = clamp((t - lastUser) / .8) * (user.length ? .45 : 1);
        hint.alpha = (.8 + .2 * Math.sin(t * 2.2) * m) * (lastUser > 0 ? .25 + .75 * used : 1); hint.show(ih, { style: 'rise', by: 'word' });

        // ---- labels pinned to the two places, and the counter riding the front: all of it kept off the words
        oN = 0; oU.uView.value.set(vw, vh); oU.uAA.value = .8 / view.scale;
        const sT = view.safeTop || 110, sB = view.safeBottom || 130, sS = view.safeSide || 90, MG = 30;
        const avoid = [];
        const keep = (T, vis) => { if (vis) avoid.push([T.x - MG, T.y - MG, T.width + MG * 2, T.height + MG * 2]); };
        keep(h1, i1 > 0 && out1 < 1); keep(p1, j1 > 0 && out1 < 1); keep(h2, i2 > 0); keep(p2, j2 > 0); keep(hint, ih > 0);
        const hitR = (r, q) => r[0] < q[0] + q[2] && r[0] + r[2] > q[0] && r[1] < q[1] + q[3] && r[1] + r[3] > q[1];
        const hitS = (ax, ay, bx, by, q) => { for (let i = 0; i <= 16; i++) { const x = ax + (bx - ax) * i / 16, y = ay + (by - ay) * i / 16; if (x > q[0] && x < q[0] + q[2] && y > q[1] && y < q[1] + q[3]) return true; } return false; };
        const inSafe = r => r[0] >= sS && r[0] + r[2] <= vw - sS && r[1] >= sT && r[1] + r[3] <= vh - sB;
        // a w x h box near anchor a: ul / ur / dl / dr. Returns {x, y, ex, ey} (box top-left, leader end) clear of `av`
        const place = (a, w, h, cands, av, gx = 16, gy = 30) => {
          let best = null, bestScore = 1e9;
          for (const c of cands) {
            const L = c[1] === 'l', U = c[0] === 'u';
            const x = L ? a.x - gx - w : a.x + gx, y = U ? a.y - gy - h : a.y + gy * .8;
            const ex = L ? x + w + 4 : x - 4, ey = U ? y + h * .62 : y + h * .38;
            const r = [x, y, w, h]; let sc = inSafe(r) ? 0 : 50;
            for (const q of av) { if (hitR(r, q)) sc += 100; if (hitS(a.x, a.y, ex, ey, q)) sc += 20; }
            if (sc < bestScore) { bestScore = sc; best = { x, y, ex, ey }; } if (!sc) break;
          }
          if (bestScore > 0) { // fallback: clamp into the safe area, then below every box it still touches
            best.x = clamp(best.x, sS, vw - sS - w); best.y = clamp(best.y, sT, vh - sB - h);
            for (const q of av) if (hitR([best.x, best.y, w, h], q)) best.y = Math.min(vh - sB - h, q[1] + q[3] + 2);
            best.ex = clamp(a.x, best.x, best.x + w); best.ey = best.y + h * .5;
          }
          return best;
        };
        const aShop = project(0, SHOP_Y, 0), aSava = project(SAVA[0], SAVA_Y, SAVA[1]);
        const onScr = a => a && a.x > -40 && a.x < vw + 40 && a.y > 0 && a.y < vh;
        const pin = (T, a, alpha, cands, plate) => {
          T.alpha = alpha; T.show(alpha > .01 && onScr(a) ? 1 : 0, { style: 'fade', by: 'line' }); if (alpha <= .01 || !onScr(a)) return null;
          const P = place(a, T.width, T.height, cands, avoid); T.x = P.x; T.y = P.y;
          if (plate > 0) oPlate(P.x, P.y, T.width, T.height, plate * alpha);
          const dx = P.ex - a.x, dy = P.ey - a.y, l = Math.hypot(dx, dy) || 1;
          oLine(a.x + dx / l * 11, a.y + dy / l * 11, P.ex, P.ey, alpha * .5); oRing(a.x, a.y, 7, alpha * .75);
          const r = [P.x - 14, P.y - 10, T.width + 28, T.height + 20]; avoid.push(r); return r;
        };
        // the shop label fades while a ring of its own passes under it
        let pass = 0; for (const w of live) if (w.shop) { const x = CS * w.age; pass = Math.max(pass, Math.exp(-x * x / (170 * 170)) * w.g); }
        const kL = s.k(0, .5, 1.6, 'outCubic'), kS = s.k(0, 3.2, 4.6, 'outCubic');
        pin(lLyra, aShop, kL * (1 - .7 * pass * kb), ['ul', 'dl', 'ur', 'dr'], .55 + .4 * kb);
        const arrived = arr > 0;
        pin(lSava, aSava, kS * (arrived ? 1 : .7), ['ul', 'ur', 'dl', 'dr'], .5);
        // the counter rides the front along the line from the shop to Sava Centar
        const cT = clamp(tW, 0, ARRIVE), fr = cT / ARRIVE;
        const tenths = Math.min(Math.floor(cT * 10 + 1e-6), Math.floor(ARRIVE * 10)), ci = Math.floor(tenths / 10), cd = tenths % 10;
        const cA = smoothstep(-.25, .25, tW) * (1 - .25 * kb);
        const aF = project(SAVA[0] * fr, lerp(4, SAVA_Y, fr * fr * fr), SAVA[1] * fr);
        if (aF && aShop && cA > .01) oLine(aShop.x, aShop.y, aF.x, aF.y, cA * .22 * (1 - .5 * kb), .6); // the distance covered so far
        let cx0 = 0, cy0 = 0; const TI = cInt[Math.min(ci, cInt.length - 1)]; TI._sync(); cUnit._sync();
        const wI = TI.width || CSZ * .6, uW = cUnit.width || 30, cw = wI + decW + 7 + uW, chh = CSZ * .92;
        if (aF && cA > .01) {
          const P = place(aF, cw, chh, ['dr', 'dl', 'ur', 'ul'], avoid, 20, 26);
          cx0 = P.x + wI; cy0 = P.y + CSZ * .78;
          oPlate(P.x, P.y, cw, chh, cA * .45);
          const land = smoothstep(.86, 1, fr);
          const dx = P.ex - aF.x, dy = P.ey - aF.y, l = Math.hypot(dx, dy) || 1;
          oLine(aF.x + dx / l * 9, aF.y + dy / l * 9, P.ex, P.ey, cA * .5 * (1 - .4 * land)); oRing(aF.x, aF.y, 3.4, cA * (1 - land), true);
        }
        cInt.forEach((T, i) => { T.alpha = i === ci && aF ? cA : 0; T.x = cx0; T.y = cy0; T.show(T.alpha > 0 ? 1 : 0, { style: 'fade' }); });
        cDec.forEach((T, i) => { T.alpha = i === cd && aF ? cA : 0; T.x = cx0; T.y = cy0; T.show(T.alpha > 0 ? 1 : 0, { style: 'fade' }); });
        cUnit.alpha = aF ? cA : 0; cUnit.x = cx0 + decW + 7; cUnit.y = cy0; cUnit.show(cUnit.alpha > 0 ? 1 : 0, { style: 'fade' });
        oGeo.attributes.position.needsUpdate = true; oGeo.attributes.aD.needsUpdate = true; oGeo.setDrawRange(0, oN * 6);
      },

      render(target) {
        gfx.draw(world, cam, hdrA);
        air.u.tScene.value = hdrA.texture; air.render(hdrB);
        gfx.post(hdrB, target, grade);
        gfx.draw(oScene, oCam, target, { clear: false });
        ui.render(target);
      },

      pointer(e, s) {
        const ok = s.beat >= 1 ? s.at(1) > 1.2 : tWaveOf(s) > ARRIVE + .8;
        if (!ok) return false;
        const fire = () => {
          if (s.t - lastUser < .22) return;
          const dx = vF.x + e.nx * vR.x + e.ny * vU.x, dy = vF.y + e.nx * vR.y + e.ny * vU.y, dz = vF.z + e.nx * vR.z + e.ny * vU.z;
          let x = 0, z = 0;
          if (dy < -1e-3) { const tt = -cam.position.y / dy; if (tt < 11000) { x = cam.position.x + dx * tt; z = cam.position.z + dz * tt; } }
          launch(x, z, s);
        };
        if (e.type === 'down') { if (e.pointerType === 'mouse' || !e.pointerType) { fire(); return true; } tap = { x: e.x, y: e.y }; return false; }
        if (e.type === 'up' && tap) { const moved = Math.hypot(e.x - tap.x, e.y - tap.y); tap = null; if (moved < 40) fire(); }
        return false;
      },
    };
    return inst;
  },
};
