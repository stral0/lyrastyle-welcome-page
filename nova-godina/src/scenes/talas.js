// talas — a sound wave crosses Novi Beograd at night, in real time.
// World units are metres: x east, z south, y up; the shop is the origin. One wave = one uniform (x, z, radius, gain);
// every material evaluates the same wave field, so the front is where 343 m/s says it is.
// New Year: Deda Mraz's sleigh crosses the sky; the ring leaves the ground under it as it passes over the shop.
import { createSleigh } from '../xmas/sleigh.js';
import { createSnow } from '../xmas/snow.js';
const CS = 343, LAUNCH = 3.9, NSRC = 6; // the ring leaves the door ~0.55 s after the grain transition has cleared (it ends at 3.35 s)
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
    { dur: 16.5, textAt: 4.7, copy: ['talas.b1.h', 'talas.b1.p'] },          // words are in by 2.8 s, the bells ring at LAUNCH (3.9 s); an impatient step fast-forwards to just after the ring leaves the door. The front reaches Sava Centar at LAUNCH + 11.1 s
    { dur: 9, textAt: 3.2, copy: ['talas.b2.h', 'talas.b2.p', 'talas.hint'] }, // headline over the camera move, the invitation right after
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
      const CAMS = [[-3672, 3236], [-943, 70], [-1594, -446]]; // where the cameras end up (landscape A/B, portrait)
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
      // ---- three Belgrade landmarks people recognise at night: lit so the eye finds them (kind 5 = always lit)
      { // Most na Adi: the single white pylon and its fan of stays, the lit deck across the river
        const PY = [3045, 2905], ADA = PTS(ROADS.find(r => r[0] === 'Most na Adi')[2]);
        lm(PY, 0, 0, 11, 11, 200, 9, 0, 1, 0); lm(PY, 0, 0, 4, 4, 14, 9, 200, 1, 0); light(PY[0], 216, PY[1], cRED, 5, 1.6, 3);
        for (let i = 0; i + 1 < ADA.length; i++) { const [ax, az] = ADA[i], [bx, bz] = ADA[i + 1], L = Math.hypot(bx - ax, bz - az);
          for (let a = 0; a < L; a += 22) light(ax + (bx - ax) * a / L, 12, az + (bz - az) * a / L, cWHITE, 2.6, 1.6, 5); }
        const dir = [ADA[ADA.length - 1][0] - ADA[0][0], ADA[ADA.length - 1][1] - ADA[0][1]], dl = Math.hypot(dir[0], dir[1]); dir[0] /= dl; dir[1] /= dl;
        for (const sd of [-1, 1]) for (let c = 1; c <= 10; c++) { const dd = 40 + c * 34, tx = PY[0] + dir[0] * dd * sd, tz = PY[1] + dir[1] * dd * sd, ty = 190 - c * 9;
          for (let k = 1; k <= 9; k++) { const f = k / 10; light(PY[0] + (tx - PY[0]) * f, ty + (12 - ty) * f, PY[1] + (tz - PY[1]) * f, cWHITE, 1.25, 1.05, 5); } }
      }
      { // Hram Svetog Save: floodlit white walls, the dome, the gilded cross, a ring of floodlights
        for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; light(HRAM[0] + Math.cos(a) * 62, 3, HRAM[1] + Math.sin(a) * 62, cWARM, 4.2, 2.4, 5); }
        light(HRAM[0], 84, HRAM[1], [1, .82, .45], 9, 2.6, 5);
      }
      { // Kalemegdan: the fortress on its ridge above the confluence; walls and bastions in warm floodlight, the Pobednik
        const KAL = [4960, -200], KA = -.65, c = Math.cos(KA), s2 = Math.sin(KA), P = (al, la) => [KAL[0] + c * al - s2 * la, KAL[1] + s2 * al + c * la];
        const ring = [[-230, -120], [-60, -150], [120, -140], [240, -80], [250, 60], [120, 130], [-80, 140], [-230, 90]];
        for (let i = 0; i < ring.length; i++) { const A2 = ring[i], B2 = ring[(i + 1) % ring.length], mx = (A2[0] + B2[0]) / 2, mz = (A2[1] + B2[1]) / 2, L = Math.hypot(B2[0] - A2[0], B2[1] - A2[1]), an = KA + Math.atan2(B2[1] - A2[1], B2[0] - A2[0]);
          const [wx, wz] = P(mx, mz); add(wx, wz, L + 8, 10, 20, 10, { c: Math.cos(an), s: Math.sin(an), lit: 1, imp: 1e9 });
          const [bx, bz] = P(A2[0], A2[1]); add(bx, bz, 30, 30, 24, 10, { c: Math.cos(an + .785), s: Math.sin(an + .785), lit: 1, imp: 1e9 }); // bastion
          for (let a = 0; a < L; a += 16) { const f = a / L, [lx, lz] = P(A2[0] + (B2[0] - A2[0]) * f, A2[1] + (B2[1] - A2[1]) * f); light(lx, 2, lz, cWARM, 3.6, 2.2, 5); } }
        const [gx2, gz2] = P(-80, -30); add(gx2, gz2, 40, 26, 22, 10, { c, s: s2, lit: 1, imp: 1e9 }); // the clock tower gate
        const [px2, pz2] = P(-262, -10); add(px2, pz2, 9, 9, 14, 10, { c, s: s2, lit: 1, imp: 1e9 }); add(px2, pz2, 3.4, 3.4, 20, 8, { y: 14, c, s: s2, lit: 1, imp: 1e9 }); // Pobednik on its column
        light(px2, 38, pz2, [1, .86, .6], 5, 1.9, 5);
      }
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
      uMoonD: { value: new THREE.Vector3(.9, .07, .3).normalize() }, uWinter: { value: 1 },
    };
    const ATM = /* glsl */`
uniform vec3 uCam; uniform float uT; uniform vec4 uSrc[${NSRC}]; uniform vec4 uWake; uniform vec4 uShop; uniform vec2 uGlowDir; uniform float uSava, uDecay;
uniform vec3 uMoonD; uniform float uWinter;
const float CS = 343.;
const vec3 MOONL = vec3(.62, .74, 1.);
const vec3 BRASS = vec3(1., .60, .20), PAPERW = vec3(1., .84, .60), SOD = vec3(1., .48, .13), FRONT = vec3(1., .72, .38);
vec3 skyCol(vec3 d){
  float el = max(d.y, 0.);
  float az = max(dot(normalize(d.xz + vec2(1e-5)), uGlowDir), 0.); float azf = .16 + .84 * pow(az, 5.);
  vec3 c = vec3(.0011, .0011, .0015);
  c += vec3(.070, .040, .021) * exp(-el * 24.) * azf;      // the old city's glow, hugging the horizon
  c += vec3(.0050, .0044, .0048) * exp(-el * 5.) * (.4 + .6 * azf);
  // winter: a cold moonlit haze low in the sky, strongest under the moon
  float mz = max(dot(normalize(d.xz + vec2(1e-5)), normalize(uMoonD.xz)), 0.);
  c += MOONL * uWinter * (exp(-el * 9.) * (.0016 + .0060 * pow(mz, 6.)) + .0026 * exp(-el * 4.5) * (.5 + .5 * mz));
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
    if (type > 9.5) col = vec3(1., .72, .42) * (.16 + .12 * edge); // Kalemegdan: lit wall tops
    else if (type > 8.5) col = vec3(.85, .93, 1.) * .9;                // Ada bridge pylon top
    else if (type > 7.5) col = vec3(1., .93, .8) * (.42 + .3 * edge);  // Hram: floodlit dome and roofs
    else if (type > 6.5) col *= .6;
    if (type < 7.5) { // a thin cover of snow on the roofs, picked out by the moon (and thicker along the parapets, where it drifts)
      float drift = .55 + .45 * vnoise(vW.xz * .09 + seed * 17.);
      col += MOONL * uWinter * (vec3(.0062, .0068, .0076) * drift * mix(k, 1., lodr) + vec3(.004, .0044, .005) * edge);
    }
    if (type > 3.5 && type < 4.5) col += vec3(1., .66, .3) * (uSava * (.04 + .2 * edge) + .02 * edge);
    col += FRONT * min(band, 1.6) * 2.6 + BRASS * min(soft, 1.3) * .42 + ember(min(tail, 1.1)) * .034;
    col += BRASS * uShop.z * .04 / (1. + dShop * dShop / 2500.);
  } else if (type > 9.5) { // Kalemegdan: old stone walls washed in warm floodlight from below
    float up = smoothstep(0., 16., vW.y); float course = .85 + .15 * step(.5, fract(vW.y * .45));
    col = vec3(1., .66, .34) * (.34 - .18 * up) * course * (.8 + .2 * abs(vN.x));
  } else if (type > 8.5) { // Ada bridge pylon: cool white light all the way up
    col = vec3(.82, .91, 1.) * (.55 + .35 * smoothstep(0., 200., vW.y)) * (.75 + .25 * abs(vN.z));
  } else if (type > 7.5) { col = vec3(1., .92, .78) * (.36 + .34 * smoothstep(0., 70., vW.y)) * (.72 + .28 * abs(vN.x)); } // Hram Svetog Save, floodlit
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
      + MOONL * .018 * uWinter * max(dot(vN.xz, normalize(uMoonD.xz)), 0.)
      + BRASS * uShop.z * 9. * max(dot(vN, toShop / dShop), 0.) / (1. + dShop * dShop / 900.);
    col = alb * L + emis;
    col += FRONT * band * (1.7 + 1.2 * win * (1. - lod)) + BRASS * soft * (.20 + .5 * mix(win, area, lod));
  }
  fragColor = vec4(fogged(col, vW), dist / 8.);
}`);
    const bMesh = new THREE.Mesh(bGeo, bMat); bMesh.frustumCulled = false; bMesh.renderOrder = 0; world.add(bMesh);

    // ---------------------------------------------------------------- sky: drawn by the ground's own draw call, as a far-plane triangle after the ground
    // (so it costs no draw call of its own, and early depth still skips it wherever the city covers it)
    const RAY = { uFwd: { value: new THREE.Vector3() }, uRight: { value: new THREE.Vector3() }, uUp: { value: new THREE.Vector3() } };
    const SKYGL = /* glsl */`
uniform vec3 uFwd, uRight, uUp; uniform float uMoonR, uMoonK;
vec3 skyFull(vec3 d){
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
  // the moon: large, soft, cold; low over the old town, so the sleigh can cross it
  if (uMoonK > 0.) {
    float cm = clamp(dot(d, uMoonD), -1., 1.), ma = acos(cm), mw = fwidth(ma) * 1.5;
    vec3 mu = normalize(cross(uMoonD, vec3(0., 1., 0.))), mv = cross(mu, uMoonD);
    vec2 q = vec2(dot(d, mu), dot(d, mv)) / uMoonR;
    float disc = 1. - smoothstep(uMoonR * .96 - mw, uMoonR * 1.02 + mw, ma);
    float mott = .86 - .16 * smoothstep(.42, .68, fbm(q * 1.5 + 3.1)) - .07 * smoothstep(.5, .72, fbm(q * 3.4 + 9.)) + .05 * vnoise(q * 9.);
    float limb = sqrt(max(0., 1. - dot(q, q)));
    float haze = smoothstep(-.004, .05, d.y);                     // thick air low on the horizon dims and warms it a little
    vec3 mc = mix(vec3(.95, .84, .72), vec3(.80, .87, 1.), haze);
    c = mix(c, mc * .78 * mott * (.66 + .34 * limb) * uMoonK * (.5 + .5 * haze), disc);
    float o = max(ma - uMoonR, 0.) / uMoonR;
    c += MOONL * uMoonK * (.034 * exp(-o * 2.6) + .012 * exp(-o * .6) + .009 * exp(-o * .14) * exp(-max(d.y, 0.) * 9.)) * (.5 + .5 * haze);
  }
  return c;
}`;

    // ---------------------------------------------------------------- ground: real roads (analytic, from the segment table), light pools, water
    const tMap = new THREE.DataTexture(city.map, MW, MH, THREE.RGBAFormat, THREE.UnsignedByteType); tMap.minFilter = tMap.magFilter = THREE.LinearFilter; tMap.needsUpdate = true;
    const tIdx = new THREE.DataTexture(city.idx, MW, MH, THREE.RGBAFormat, THREE.UnsignedByteType); tIdx.minFilter = tIdx.magFilter = THREE.NearestFilter; tIdx.needsUpdate = true;
    const tSeg = new THREE.DataTexture(city.segTex, 512, 2, THREE.RGBAFormat, THREE.FloatType); tSeg.minFilter = tSeg.magFilter = THREE.NearestFilter; tSeg.needsUpdate = true;
    const gGeo = new THREE.BufferGeometry(); { const S = 40000; gGeo.setAttribute('position', new THREE.Float32BufferAttribute([-S, 0, S, S, 0, S, S, 0, -S, -S, 0, -S, -1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
      gGeo.setAttribute('aSky', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 1, 1], 1)); gGeo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6]); }
    const gMat = mat(/* glsl */`
in vec3 position; in float aSky; out vec3 vW; out vec2 vP; flat out float vSky;
void main(){ vW = position; vP = position.xy; vSky = aSky; gl_Position = aSky > .5 ? vec4(position.xy, 1., 1.) : projectionMatrix * viewMatrix * vec4(vW, 1.); }`, /* glsl */`
in vec3 vW; in vec2 vP; flat in float vSky; out vec4 fragColor;
uniform sampler2D tMap, tIdx, tSeg; uniform vec4 uMapR, uAxis; uniform float uDbg;
${SKYGL}
void main(){
  if (vSky > .5) { fragColor = vec4(skyFull(normalize(uFwd + vP.x * uRight + vP.y * uUp)), 8000.); return; }
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
      ...RAY, uMoonR: { value: .03 }, uMoonK: { value: 1 },
      uDbg: { value: 0 }, tMap: { value: tMap }, tIdx: { value: tIdx }, tSeg: { value: tSeg },
      uMapR: { value: new THREE.Vector4(MX0, MZ0, 1 / (MX1 - MX0), 1 / (MZ1 - MZ0)) }, uAxis: { value: new THREE.Vector4(SAVA[0], SAVA[1], DIST, 0) },
    });
    const gMesh = new THREE.Mesh(gGeo, gMat); gMesh.frustumCulled = false; gMesh.renderOrder = 1; world.add(gMesh);


    // ---------------------------------------------------------------- lights (points) and cars
    // lamps and cars share one draw: a light record carries (colour, 0) and (size, seed, kind, rank); a car record carries its
    // segment (dx, dz, len, speed) and (line length, phase, seed, 2 + rank). Quality thins both by rank in the vertex shader.
    const NL = city.lights.length / 9, NC = city.cars.length / 10; // car records: x, z, cum, dx, dz, len, speed, seed, line length, phase
    const lGeo = new THREE.BufferGeometry();
    { // shuffle so that a lower quality thins them evenly; the shop and landmark lights stay first
      const idx = Array.from({ length: NL }, (_, i) => i), r = util.rng(7); const key = i => (city.lights[i * 9 + 8] >= 2 ? -1 : r());
      const keys = idx.map(key); idx.sort((a, b) => keys[a] - keys[b]);
      const N = NL + NC, P = new Float32Array(N * 3), X = new Float32Array(N * 4), Y = new Float32Array(N * 4);
      idx.forEach((i, k) => { const o = i * 9, L = city.lights; P.set([L[o], L[o + 1], L[o + 2]], k * 3); X.set([L[o + 3], L[o + 4], L[o + 5], 0], k * 4); Y.set([L[o + 6], L[o + 7], L[o + 8], k / NL], k * 4); });
      for (let k = 0; k < NC; k++) { const o = k * 10, c = city.cars, j = NL + k; P.set([c[o], c[o + 1], c[o + 2]], j * 3); X.set([c[o + 3], c[o + 4], c[o + 5], c[o + 6]], j * 4); Y.set([c[o + 8], c[o + 9], c[o + 7], 2 + k / NC], j * 4); }
      lGeo.setAttribute('position', new THREE.BufferAttribute(P, 3)); lGeo.setAttribute('aX', new THREE.BufferAttribute(X, 4)); lGeo.setAttribute('aY', new THREE.BufferAttribute(Y, 4));
    }
    const PX = { uPx: { value: 1000 } };
    const SPRITE = /* glsl */`
in vec3 vC; out vec4 fragColor;
void main(){ vec2 q = gl_PointCoord * 2. - 1.; float r2 = dot(q, q); float a = exp(-r2 * 7.) * .75 + exp(-r2 * 30.) * .9 - .0007; if (a <= 0.) discard; fragColor = vec4(vC * a, 0.); }`;
    const lMat = mat(/* glsl */`
in vec3 position; in vec4 aX, aY; uniform float uPx, uCarT, uKeepL, uKeepC; out vec3 vC;
void main(){
  bool car = aY.w > 1.5; float rank = car ? aY.w - 2. : aY.w;
  vC = vec3(0.); gl_PointSize = 0.; gl_Position = vec4(2., 2., 2., 1.);
  if (rank > (car ? uKeepC : uKeepL)) return;
  if (car) {
    vec4 aD = aX; vec3 aL = aY.xyz;
    // one car travels the whole line; this record draws it only while it is on this segment
    float along = mod(aL.y + aD.w * uCarT, aL.x) - position.z;
    if (along < 0. || along > aD.z) return;
    vec3 wp = vec3(position.x + aD.x * along, 1.2, position.y + aD.y * along);
    vec4 mv = viewMatrix * vec4(wp, 1.); gl_Position = projectionMatrix * mv; float dist = max(-mv.z, 1.);
    float away = dot(aD.xy, normalize(wp.xz - uCam.xz));
    vec3 c = away > 0. ? vec3(1., .07, .04) * 1.5 : vec3(1., .92, .78) * 3.4;
    c *= .7 + .3 * aL.z;
    float px = 1.5 * uPx / dist, sz = max(px, 1.2);
    vC = c * pow(px / sz, 1.1) * fogT(wp);
    gl_PointSize = sz * 3.2;
    return;
  }
  vec3 aC = aX.rgb, aP = aY.xyz;
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
}`, SPRITE, { ...PX, uCarT: { value: 0 }, uKeepL: { value: 1 }, uKeepC: { value: 1 } }, ADD);
    const lPts = new THREE.Points(lGeo, lMat); lPts.frustumCulled = false; lPts.renderOrder = 3; world.add(lPts);
    const cMat = lMat;

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
  // winter: a faint cold veil of distant snowfall, thickest toward the horizon, drifting down in slow curtains
  float hv = (1. - exp(-dist / 6500.)) * exp(-max(rd.y + .01, 0.) * 18.);
  float curtain = .55 + .45 * vnoise(vec2(atan(rd.z, rd.x) * 34. + uT * .04, rd.y * 26. + uT * .3)) * vnoise(vec2(atan(rd.z, rd.x) * 9. - uT * .02, 3.1));
  col += MOONL * uWinter * .02 * hv * curtain;
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
    const BOT = { a: 600, b: 600 }, SKY = { a: 150, b: 40 };
    const lLyra = ui.text('talas.lyra', { size: 29, font: 'textMed', color: INK });
    const lSava = ui.text('talas.sava', { size: 29, font: 'textMed', color: INK });
    // Belgrade landmarks across the river: small, quiet labels so visitors recognise the city
    const LMK = [['talas.ada', 3045, 214, 2905], ['talas.hram', 6430, 86, 2610], ['talas.kalemegdan', 4900, 26, -210]].map(([k, x, y, z]) => ({ T: ui.text(k, { size: 25, font: 'textMed', color: '#d9ccb4' }), x, y, z }));
    const CSZ = 62;
    const cInt = Array.from({ length: 12 }, (_, i) => ui.text(String(i), { size: CSZ, font: 'display', color: INK, align: 'right', valign: 'baseline' }));
    const cDec = Array.from({ length: 10 }, (_, i) => ui.text(',' + i, { size: CSZ, font: 'display', color: INK, align: 'left', valign: 'baseline' }));
    const cUnit = ui.text(' s', { size: CSZ * .62, font: 'displayItalic', color: BR, align: 'left', valign: 'baseline' });
    let decW = 0; const balCache = {};
    // narrowest wrap that keeps the line count: no orphan word on the last line
    const balance = (key, size, maxW) => { const ck = [key, ctx.lang(), Math.round(size), Math.round(maxW), Math.round(view.scale * 100)].join('|'); if (balCache[ck]) return balCache[ck];
      const o = { size, font: 'display', leading: 1.06 }, h0 = ui.measure(key, { ...o, width: maxW }).h; let lo = maxW * .45, hi = maxW;
      for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (ui.measure(key, { ...o, width: mid }).h <= h0 + 1) hi = mid; else lo = mid; }
      return (balCache[ck] = Math.ceil(hi) + 2); };
    // number of lines a headline wraps to (measured exactly as it is drawn)
    const nLines = (key, size, w) => { const ck = ['n', key, ctx.lang(), Math.round(size), Math.round(w), Math.round(view.scale * 100)].join('|'); if (balCache[ck]) return balCache[ck];
      const o = { size, font: 'display', leading: 1.06 }, h1 = ui.measure(key, o).h, h = ui.measure(key, { ...o, width: w }).h;
      return (balCache[ck] = 1 + Math.max(0, Math.round((h - h1) / (size * 1.06)))); };
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
    const HOR = { a: .3, b: .3 }; // preferred horizon (ndc y) per beat, from the text layout
    // The solve is a search. Candidate compositions (horizon height, camera height, where the pin and Sava Centar sit) are tried in
    // order of their distance from the authored one; each solved pose is checked on the real frame, at the launch and at the
    // arrival, and the first that keeps the pin (with room for the team above it), Sava Centar and the wave's path to it on screen
    // and clear of the words wins. If none is perfect, the pose that misses least is used (never a blind fallback).
    const fit = () => {
      const asp = gfx.aspect, key = [asp.toFixed(3), HOR.a.toFixed(3), HOR.b.toFixed(3), Math.round(BOT.a), Math.round(BOT.b), Math.round(view.safeTop || 0), Math.round(view.safeBottom || 0)].join('|'); if (key === camKey) return; camKey = key;
      const port = asp < .95, fov = clamp(44 * Math.pow(1.6 / asp, .5), 38, 64), kx = Math.min(1, Math.pow(1.6 / asp, .55)), t0 = performance.now();
      const vw = view.w, vh = view.h, sB = view.safeBottom || 130, sS = view.safeSide || 90;
      const L0 = port ? .42 * vw : Math.min(.32 * vh, .24 * vw); // the team's length at the launch (as plan() sizes it)
      const nOf = y => 1 - 2 * y / vh;
      const scr = (P, pt) => { setCam(pc, P); const q = ndcOf(pc, pt); return q[2] > 5 ? [(q[0] * .5 + .5) * vw, (.5 - q[1] * .5) * vh] : null; };
      const out = (v, lo, hi) => (v < lo ? lo - v : v > hi ? v - hi : 0);
      const off = (p, x0, x1, y0, y1) => (p ? out(p[0], x0, x1) + out(p[1], y0, y1) : 1e4);
      const missA = c => { let m = 0; const tb = BOT.a; // beat 0: how far (design units) the pose misses the composition; 0 = good
        for (const t of [LAUNCH, LAUNCH + ARRIVE + .5]) { const P = camBase(0, ctx.ease.outCubic(clamp(t / 13)), t, 0, 1, c, c);
          const pin = scr(P, P_SHOP), sv = scr(P, [SAVA[0], SAVA_Y, SAVA[1]]);
          m += off(pin, sS + 40, vw * (port ? .64 : .6), tb + .62 * L0 + 24, vh - sB - 30); // room above the pin for the team as it rings, and for its label below
          m += off(sv, sS + 60, vw - sS - 60, tb + 90, vh - sB - 40);
          if (pin && sv) m += Math.max(0, pin[0] + .1 * vw - sv[0]) + .5 * Math.max(0, sv[1] + 40 - pin[1]); // Sava Centar lies right of the shop and beyond it
          for (let f = .15; f < 1; f += .15) m += .5 * off(scr(P, [SAVA[0] * f, 4, SAVA[1] * f]), 20, vw - 20, tb + 30, vh - sB); } // the wave's path to it
        return m; };
      const missB = c => { let m = 0; const tb = BOT.b; // beat 1: the pin (it invites a touch) and Sava Centar stay on screen under the words
        for (const t1 of [6.2, 12]) { const P = camBase(1, 1, 17 + t1, t1, 1, c, c);
          m += off(scr(P, P_SHOP), sS + 40, vw - sS - 40, tb + 70, vh - sB - 30);
          m += .5 * off(scr(P, [SAVA[0], SAVA_Y, SAVA[1]]), sS, vw - sS, tb + 40, vh - sB); }
        return m; };
      const search = (h0, yH0, tb, ts0, tv0, miss) => {
        const yHmax = Math.min(.62, nOf(tb + 60)), cands = []; // the horizon never rises into the words
        ts0 = [ts0[0], Math.max(ts0[1], nOf(vh - sB - 70))]; // short screens: the authored pin height starts above the bottom chrome
        for (const dy of [0, .03, .06, .09, .12, .16, .2, .25, -.03, -.06]) { const yH = yH0 + dy; if (dy > 0 && yH > yHmax) continue;
          for (const hm of [1, .85, 1.2, .7, 1.45, .55]) for (const dpy of [0, .06, .12, .18, .26, -.05]) for (const pxm of [1, .85, 1.18, .7]) for (const sxm of [1, .85, 1.18])
            cands.push({ c: Math.abs(dy) * 4 + Math.abs(Math.log(hm)) * 1.2 + Math.abs(dpy) * 3 + Math.abs(Math.log(pxm)) * 1.5 + Math.abs(Math.log(sxm)) * 1.5, yH, h: h0 * hm, ts: [ts0[0] * pxm, ts0[1] + dpy], tv: tv0 * sxm }); }
        cands.sort((a, b) => a.c - b.c);
        let best = null, bm = 1e18, n = 0;
        for (const k of cands) { n++; const c = solve(k.h, fov, asp, k.yH, k.ts, k.tv); if (!c) continue; c.yH = k.yH; const m = miss(c);
          if (m < bm) { bm = m; best = c; } if (m <= 0) break; }
        if (best) { best.miss = bm; best.tries = n; }
        return best; };
      if (port) { camA = search(760, HOR.a, BOT.a, [-.12, -.5], .22, missA); camB = search(300, HOR.b, BOT.b, [-.1, -.42], .26, missB); }
      else { camA = search(asp > 2.2 ? 900 : 1000, HOR.a, BOT.a, [-.42 * kx, -.62], .36 * kx, missA); camB = search(250, HOR.b, BOT.b, [-.22 * kx, -.6], .4 * kx, missB); }
      const fb = (h, yH) => ({ x: -1500, z: -300, h, yaw: JA - .15, pitch: -Math.atan(yH * Math.tan(fov * D2R / 2)), fov, yH, miss: 1e9, fb: true }); // only if nothing converged at all
      camA = camA || fb(700, HOR.a); camB = camB || fb(260, HOR.b);
      if (ctx.headless) window.__talasCam = { camA, camB, ms: performance.now() - t0 };
      flyKey = '';
    };
    const vF = new THREE.Vector3(), vR = new THREE.Vector3(), vU = new THREE.Vector3(), vT = new THREE.Vector3();
    let tanF = .36;
    // the camera's authored pose (no sway, no parallax): beat 0 settles in, beat 1 moves from A to B
    const camBase = (kb, settleK, since0, since1, m = 1, A = camA, B = camB) => {
      const settle = 1 - settleK;
      const glide = ((1 - Math.exp(-Math.max(0, since0 - 4) / 46)) * (1 - kb) + (1 - Math.exp(-Math.max(0, since1 - 5) / 40)) * kb) * (m < 1 ? .25 : 1);
      const yaw = lerp(A.yaw, B.yaw, kb), pitch = lerp(A.pitch, B.pitch, kb); let x = lerp(A.x, B.x, kb), z = lerp(A.z, B.z, kb), h = lerp(A.h, B.h, kb);
      const back = settle * 230 * (1 - kb) - glide * lerp(150, 70, kb);
      x -= Math.cos(yaw) * back; z -= Math.sin(yaw) * back; h += settle * 46 * (1 - kb) - glide * lerp(16, 8, kb);
      return { x, z, h, yaw, pitch, fov: lerp(A.fov, B.fov, kb) };
    };
    const setCam = (c, P) => { c.fov = P.fov; c.aspect = gfx.aspect; c.updateProjectionMatrix(); c.position.set(P.x, P.h, P.z);
      c.lookAt(P.x + Math.cos(P.yaw) * Math.cos(P.pitch), P.h + Math.sin(P.pitch), P.z + Math.sin(P.yaw) * Math.cos(P.pitch)); c.updateMatrixWorld(true); return c; };
    const project = (x, y, z) => { vT.set(x, y, z).applyMatrix4(cam.matrixWorldInverse); const zf = -vT.z; if (zf < 5) return null; return { x: (vT.x / (zf * tanF * cam.aspect) * .5 + .5) * view.w, y: (.5 - vT.y / (zf * tanF) * .5) * view.h, d: zf }; };

    // ---------------------------------------------------------------- wave bookkeeping
    const PER = 4.6, P0 = .7, LIFE0 = 21, LIFE = 12.5;
    let user = [], live = [], prevT = 0, prevK = -1, lastSub = -1, lastAir = -1, tap = null, lastUser = -9;
    const tWaveOf = s => s.since(0) - LAUNCH;
    const kOf = s => (s.beat >= 1 ? Math.floor((s.since(1) - P0) / PER) : -1);
    const jOf = s => (s.beat >= 1 && FLY.L ? Math.floor((s.since(1) - 3) / FLY.L.per) : -1); // one soft shake of the bells per loop
    let prevJ = -1, sPan = -.4;
    const env = (age, life) => smoothstep(0, .1, age) * (1 - smoothstep(life - 3.5, life, age));
    const launch = (x, z, s) => { user.push({ x, z, t0: s.t }); if (user.length > NSRC) user.shift(); lastUser = s.t;
      const pan = clamp(((project(x, 0, z) || { x: view.w / 2 }).x / view.w) * 2 - 1, -1, 1) * .7;
      ctx.audio.drum('kick', { gain: .7, pan, pitch: .9 + .25 * Math.random() }); ctx.sfx('thud', { gain: .35, pan }); };

    const grade = { exposure: 1.1, bloom: .75, threshold: .9, knee: .7, radius: 1.15, tone: 'aces', contrast: 1.06, saturation: 1.04, vignette: .36, grain: .032, halation: .5, lift: [.0032, .0025, .0019], gain: [1, 1, 1], fade: 1 };

    // ---------------------------------------------------------------- Deda Mraz's sleigh, the moon, the snow
    // The flight is planned on screen and solved in the world: at each key time the team must sit in the band of sky between the
    // words and the horizon, as seen by the camera at that moment; its altitude there is solved from that, so it flies in 3D
    // (real perspective, receding toward the old town) and still never crosses the words. Everything is a pure function of time.
    const pc = new THREE.PerspectiveCamera(40, 1.6, 20, 60000), pv0 = new THREE.Vector3(), pv1 = new THREE.Vector3();
    const tfOf = c => Math.tan(c.fov * D2R / 2);
    const ndcOf = (c, p) => { pv0.set(p[0], p[1], p[2]).applyMatrix4(c.matrixWorldInverse); const zf = -pv0.z, tf = tfOf(c); return [pv0.x / (zf * tf * c.aspect), pv0.y / (zf * tf), zf]; };
    const aimY = (c, gx, gz, ny) => { // altitude at which ground point (gx, gz) is seen at ndc height ny
      pv0.set(gx, 0, gz).applyMatrix4(c.matrixWorldInverse); pv1.set(gx, 1, gz).applyMatrix4(c.matrixWorldInverse);
      const tf = tfOf(c), b = pv1.y - pv0.y, d = pv1.z - pv0.z; return (-ny * tf * pv0.z - pv0.y) / (b + ny * tf * d); };
    const camAt0 = t => camBase(0, ctx.ease.outCubic(clamp(t / 13)), t, 0);                               // beat 0, at its time t
    const camAt1 = (t, off) => camBase(ctx.ease.inOutCubic(clamp(t / 6.2)), 1, off + t, t);              // beat 1
    // the flight: key points are kept in the first camera's frame (screen x, altitude, depth) and joined by a monotone cubic per
    // component (Fritsch-Butland): no overshoot, so a team that drifts right on screen never doubles back, and the speed eases
    // smoothly from the fast entry into the cruise. Beyond the ends it carries straight on.
    const monoSpline = K => { const n = K.length, D = K[0].p.length, h = [], M = [];
      for (let i = 0; i + 1 < n; i++) h.push(K[i + 1].t - K[i].t);
      for (let c = 0; c < D; c++) { const d = [], m = []; for (let i = 0; i + 1 < n; i++) d.push((K[i + 1].p[c] - K[i].p[c]) / h[i]);
        for (let i = 0; i < n; i++) { if (i === 0) m.push(d[0]); else if (i === n - 1) m.push(d[n - 2]); else if (d[i - 1] * d[i] <= 0) m.push(0);
          else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m.push((w1 + w2) / (w1 / d[i - 1] + w2 / d[i])); } }
        M.push(m); }
      return t => { if (t <= K[0].t) return K[0].p.map((v, c) => v + M[c][0] * (t - K[0].t)); if (t >= K[n - 1].t) return K[n - 1].p.map((v, c) => v + M[c][n - 1] * (t - K[n - 1].t));
        let i = 0; while (K[i + 1].t < t) i++; const f = (t - K[i].t) / h[i], f2 = f * f, f3 = f2 * f;
        return K[i].p.map((v, c) => (2 * f3 - 3 * f2 + 1) * v + (f3 - 2 * f2 + f) * h[i] * M[c][i] + (-2 * f3 + 3 * f2) * K[i + 1].p[c] + (f3 - f2) * h[i] * M[c][i + 1]); }; };
    const FR = { x: 0, z: 0, fx: 1, fz: 0, rx: 0, rz: 1, k: 1 };               // the frame: camera A at the launch (k = tan(fov/2) * aspect)
    const toFrame = (gx, gz) => { const dx = gx - FR.x, dz = gz - FR.z, d = dx * FR.fx + dz * FR.fz; return [(dx * FR.rx + dz * FR.rz) / (d * FR.k), d]; };
    const fromFrame = (X, alt, d) => { const l = X * d * FR.k; return [FR.x + FR.fx * d + FR.rx * l, alt, FR.z + FR.fz * d + FR.rz * l]; };
    const FLY = { K: null, spl: null, L: null, S0: 400, S1: 300, mode: 0, off: 0, moonT: 0, moonA: new THREE.Vector3(1, .05, 0), moonB: new THREE.Vector3(1, .05, 0) };
    let flyKey = '';
    const blendW = t => ctx.ease.inOutCubic(clamp((t - .3) / 5.2));
    // a gentle rise and fall rides on the planned line (a few percent of the team's length; incommensurate, never a wobble)
    const undul = (t, S) => S * (.016 * Math.sin(t * 1.25 + .4) + .006 * Math.sin(t * 2.3 + 1.7));
    const path0 = t => { const q = FLY.spl(t); return fromFrame(q[0], q[1] + undul(t, FLY.S0), Math.max(q[2], 50)); };
    const loopAt = t => { const L = FLY.L, a = L.ph + t * Math.PI * 2 / L.per; // a slow loop over the river: wide across, shallow in depth, rising at the far side
      const ca = Math.cos(a), sa = Math.sin(a); return [L.c[0] + L.r[0] * L.rx * ca + L.f[0] * L.rf * sa, L.c[1] + L.ry * sa + L.rz * Math.sin(2 * a) + undul(t, FLY.S1), L.c[2] + L.r[1] * L.rx * ca + L.f[1] * L.rf * sa]; };
    const posAt = (t, comp = true) => { if (FLY.mode === 0) return path0(t); const w = blendW(t); if (w >= 1) return loopAt(t);
      const a = path0(t + FLY.off), b = loopAt(t); if (comp) a[1] += camAt1(t, FLY.off).h - camAt0(t + FLY.off).h; // as the camera comes down, so does the sleigh: it stays in the sky band
      return a.map((v, k) => lerp(v, b[k], w)); };
    // the heading ignores that compensating descent (the camera falls with it, so on screen it is no dive)
    const flight = t => { const a = posAt(t), p = posAt(t, false), b = posAt(t + .04, false); return { pos: a, dir: [b[0] - p[0], b[1] - p[1], b[2] - p[2]] }; };
    const sleigh = createSleigh(ctx, { size: 400, light: [.6, .7], path: flight, sparks: 220, sparkLife: 2.6, rim: 2, lodPx: 26 });
    // ---- the bells ring over the door: a burst of gold sparks shakes loose from the dash bells and drops onto the pin, where the
    // ring is born; the sparks splash out along the ground with the front. One draw call (points), a pure function of tW.
    const RING0 = -.14;                                                       // tW at which the bells shake (the jingle)
    const NBS = 46, NBT = 3, NBF = 7, NBP = NBS * NBT + NBF;                  // sparks x (head + 2 trail samples), plus the flash at the bells
    const bsPos = new Float32Array(NBP * 3), bsI = new Float32Array(NBP * 2), bsSeed = (() => { const r = util.rng(1225), a = new Float32Array(NBS * 6); for (let i = 0; i < a.length; i++) a[i] = r(); return a; })();
    const bsGeo = new THREE.BufferGeometry(); bsGeo.setAttribute('position', new THREE.BufferAttribute(bsPos, 3).setUsage(THREE.DynamicDrawUsage)); bsGeo.setAttribute('aI', new THREE.BufferAttribute(bsI, 2).setUsage(THREE.DynamicDrawUsage));
    const bsMat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, ...ADD, depthTest: false, uniforms: { uPx: PX.uPx },
      vertexShader: `precision highp float; in vec3 position; in vec2 aI; uniform mat4 modelViewMatrix, projectionMatrix; uniform float uPx; out float vI;
void main(){ vI = 0.; gl_PointSize = 0.; gl_Position = vec4(2., 2., 2., 1.); if (aI.y <= 0.) return;
  vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; float d = max(-mv.z, 1.), px = aI.x * uPx / d, sz = max(px, 1.7);
  vI = aI.y * px / sz; gl_PointSize = sz * 3.2; }`,
      fragmentShader: `precision highp float; in float vI; out vec4 fragColor;
void main(){ vec2 q = gl_PointCoord * 2. - 1.; float r2 = dot(q, q); float a = exp(-r2 * 7.) * .6 + exp(-r2 * 30.) - .0008; if (a <= 0.) discard;
  fragColor = vec4(mix(vec3(1., .62, .24), vec3(1., .9, .7), min(vI * .25, 1.)) * vI * a * 5., 0.); }` });
    const bsPts = new THREE.Points(bsGeo, bsMat); bsPts.frustumCulled = false; const bsScene = new THREE.Scene(); bsScene.add(bsPts);
    let bsOn = false;
    const bR = new THREE.Vector3(), bU = new THREE.Vector3();
    // the dash bells' world position at flight time t (the team's centre line, then the sleigh's dash offset in the screen plane, as sleigh.js does)
    const bellAt = (c, t, S) => { const P = posAt(t), Q = posAt(t + .04, false), R0 = posAt(t, false), a = ndcOf(c, P), b = ndcOf(c, [P[0] + Q[0] - R0[0], P[1] + Q[1] - R0[1], P[2] + Q[2] - R0[2]]);
      const dx = (b[0] - a[0]) * c.aspect, dy = b[1] - a[1], fl = dx < 0 ? -1 : 1, an = fl * clamp(Math.atan2(dy, fl * dx + 1e-9), -.75, .75), sc = S / 250;
      const t0 = -82.8 * fl, t1 = -12, ca = Math.cos(an), sa = Math.sin(an), ox = (ca * t0 - sa * t1) * sc, oy = (sa * t0 + ca * t1) * sc;
      bR.setFromMatrixColumn(c.matrixWorld, 0); bU.setFromMatrixColumn(c.matrixWorld, 1);
      return [P[0] + bR.x * ox + bU.x * oy, P[1] + bR.y * ox + bU.y * oy, P[2] + bR.z * ox + bU.z * oy]; };
    const burst = (c, tW, S, on) => {
      bsOn = on && tW > RING0 - .05 && tW < 2.2; if (!bsOn) return;
      const u = S / 1280, J = 26 * u, src0 = bellAt(c, LAUNCH + RING0, S); // sizes are tuned for the 1280 m team of 16:10 (landscape): scale with the team
      // one spark at age a after it let go: a fast, accelerating plunge to the door, then a skip outward along the ground
      const at = (i, a, out) => { const o = i * 6, D = .1 + .3 * bsSeed[o + 1] * bsSeed[o + 1];
        const sx = src0[0] + (bsSeed[o + 2] - .5) * S * .05, sy = src0[1] + (bsSeed[o + 3] - .5) * S * .03, sz = src0[2] + (bsSeed[o + 4] - .5) * S * .05;
        const ang = bsSeed[o + 5] * 6.2832, rr = J * Math.sqrt(bsSeed[o + 2]), ex = Math.cos(ang) * rr, ez = Math.sin(ang) * rr, ey = SHOP_Y + 3;
        if (a < D) { const f = a / D, fe = f * f * (.35 + .65 * f), sw = Math.sin(Math.PI * f) * (bsSeed[o + 4] - .5) * S * .03;
          out[0] = sx + (ex - sx) * fe + sw; out[1] = sy + (ey - sy) * fe; out[2] = sz + (ez - sz) * fe - sw; return 1; }
        const b = a - D, life = .5 + .5 * bsSeed[o + 3]; if (b > life) return 0; const k = b / life, v = (70 + 90 * bsSeed[o + 1]) * u;
        out[0] = ex + Math.cos(ang) * v * b * (1 - .5 * k); out[2] = ez + Math.sin(ang) * v * b * (1 - .5 * k); out[1] = ey + Math.max(0, 55 * b - 160 * b * b) * u;
        return (1 - k) * (1 - k) * .8; };
      const tmp = [0, 0, 0];
      for (let i = 0; i < NBS; i++) { const a0 = tW - (RING0 + .05 * bsSeed[i * 6]);
        for (let k = 0; k < NBT; k++) { const j = i * NBT + k, a = a0 - k * .022; let w = a >= 0 ? at(i, a, tmp) : 0;
          if (k && a >= .1 + .3 * bsSeed[i * 6 + 1] * bsSeed[i * 6 + 1]) w = 0;       // the trail is the fall only
          bsPos[j * 3] = tmp[0]; bsPos[j * 3 + 1] = tmp[1]; bsPos[j * 3 + 2] = tmp[2]; bsI[j * 2] = (k ? 4.2 - k : 6) * (.8 + .5 * bsSeed[i * 6 + 5]) * u; bsI[j * 2 + 1] = w * (k ? .5 / k : 1.25); } }
      const fa = tW - RING0, fw = fa >= 0 ? Math.exp(-fa / .14) * Math.min(1, fa * 40) : 0; // the bells flash as they shake
      for (let i = 0; i < NBF; i++) { const j = NBS * NBT + i, o = i * 6; bsPos[j * 3] = src0[0] + (bsSeed[o] - .5) * S * .06; bsPos[j * 3 + 1] = src0[1] + (bsSeed[o + 1] - .5) * S * .03; bsPos[j * 3 + 2] = src0[2] + (bsSeed[o + 2] - .5) * S * .06;
        bsI[j * 2] = (9 + 8 * bsSeed[o + 3]) * u; bsI[j * 2 + 1] = fw * (1.4 + bsSeed[o + 4]); }
      bsGeo.attributes.position.needsUpdate = true; bsGeo.attributes.aI.needsUpdate = true;
      if (ctx.headless) window.__talasBell = { src0, tW };
    };
    const snow = createSnow(ctx, { count: 1700, box: [56, 36, 56], size: .075, fall: .8, wind: [.55, 0, -.25], sway: .5, focus: 45, aperture: .2, near: .8,
      color: [.66, .72, .88], brightness: .9 });
    // the team's box on screen (design units), for keeping it off the words and the labels
    const teamBox = (c, p, S, ang) => { const q = ndcOf(c, p); if (q[2] < 5) return null; const L = S * view.h / (2 * tfOf(c) * q[2]), H = L * .36, ca = Math.abs(Math.cos(ang)), sa = Math.abs(Math.sin(ang));
      const w = L * ca + H * sa, h = L * sa + H * ca, x = (q[0] * .5 + .5) * view.w, y = (.5 - q[1] * .5) * view.h; return [x - w / 2, y - h / 2, w, h, x, y, L]; };
    const angOf = (c, t, fn) => { const a = ndcOf(c, fn(t - .12)), b = ndcOf(c, fn(t + .12)); const dx = (b[0] - a[0]) * gfx.aspect, dy = b[1] - a[1]; return clamp(Math.atan2(dy, Math.abs(dx) + 1e-9), -.75, .75); };
    const teamHits = (r, ang, bx) => { // the team as a capsule along its heading (r from teamBox), against padded word boxes
      const L = r[6], hh = L * .16, ca = Math.cos(ang), sa = Math.sin(ang);
      for (let i = 0; i <= 6; i++) { const u = (i / 6 - .5) * L, x = r[4] + u * ca, y = r[5] - u * sa;
        for (const q of bx) if (x > q[0] - hh && x < q[0] + q[2] + hh && y > q[1] - hh && y < q[1] + q[3] + hh) return true; }
      return false; };
    const hitBox = (r, q) => r[0] < q[0] + q[2] && r[0] + r[2] > q[0] && r[1] < q[1] + q[3] && r[1] + r[3] > q[1];
    const plan = () => {
      const vw = view.w, vh = view.h, port = view.portrait, MG = 16, sT = view.safeTop || 110;
      const boxes = Ts => Ts.map(T => [T.x - MG, T.y - MG, T.width + MG * 2, T.height + MG * 2]);
      const key = [camKey, ...[h1, p1, h2, p2, hint].map(T => [T.x, T.y, T.width, T.height].map(Math.round).join(','))].join('|'); if (key === flyKey && FLY.K) return; flyKey = key;
      const boxA = boxes([h1, p1]), boxB = boxes([h2, p2, hint]);
      const yHorA = (1 - camA.yH) / 2 * vh, yHorB = (1 - camB.yH) / 2 * vh; // the horizons the camera solve settled on
      const L0 = port ? .42 * vw : Math.min(.32 * vh, .24 * vw), L1 = port ? .19 * vw : Math.min(.112 * vh, .085 * vw); // design units: ~320 px and ~120 px at 1440x900
      // the band of sky over x: from the lowest word box above it down to the horizon
      const bandY = (bx, x, w, h, yHor, lo = 1.35) => { let top = sT + h / 2; for (const q of bx) if (x + w / 2 > q[0] && x - w / 2 < q[0] + q[2]) top = Math.max(top, q[1] + q[3] + h / 2); return Math.max(top, yHor - lo * h / 2); };
      // ---- beat 0: in from the left and a little behind us, over the shop at the launch, then away over Sava Centar, the river and the old town
      const A0 = camAt0(LAUNCH); setCam(pc, A0);
      const fx = Math.cos(A0.yaw), fz = Math.sin(A0.yaw), rx = -Math.sin(A0.yaw), rz = Math.cos(A0.yaw);
      const dShop = (0 - A0.x) * fx + (0 - A0.z) * fz, tf = tfOf(pc), asp = gfx.aspect;
      const d0 = dShop * (port ? 1 : .97), l0 = -(port ? 1.5 : 1.3) * d0 * tf * asp;
      const S0 = FLY.S0 = L0 * 2 * tf * Math.hypot(dShop, A0.h) / vh;
      const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
      const ahead = .33 * S0, dSava = (SAVA[0] - A0.x) * fx + (SAVA[1] - A0.z) * fz;
      const gp = (nx, k) => { const d = dSava * k, l = nx * d * tf * asp; return [A0.x + fx * d + rx * l, A0.z + fz * d + rz * l]; }; // ground point by screen x and depth                                // the anchor is the team's centre: put the sleigh itself (and its bells) over the door
      const gs = (nx, d) => { const l = nx * d * tf * asp; return [A0.x + fx * d + rx * l, A0.z + fz * d + rz * l]; }; // ground point by screen x and depth (metres)
      const nxPin = ((0 - A0.x) * rx + (0 - A0.z) * rz) / (dShop * tf * asp);
      const G = [
        [LAUNCH - 3.3, [A0.x + fx * d0 + rx * l0, A0.z + fz * d0 + rz * l0]],
        [LAUNCH, [rx * ahead, rz * ahead]],
        [LAUNCH + 2.5, gs(nxPin + (port ? .26 : .42), lerp(dShop, dSava, .22))],   // then a long, shallow climb away to the right, back into the sky band
        [LAUNCH + 5.5, gs(nxPin + (port ? .44 : .64), lerp(dShop, dSava, .55))],
        [LAUNCH + 11.8, lerp2(SAVA, HRAM, .04)],           // slower than sound: the ring reaches Sava Centar first
        [LAUNCH + 18, gp(.5, 1.15)],                       // over the river
        [LAUNCH + 25, gp(.76, 1.42)],                      // over the old town (Vracar, by Hram Svetog Save), always drifting right as it goes
        [LAUNCH + 38, gp(1.4, 1.85)],
      ];
      { // after the pass the team keeps drifting right on screen (no doubling back: a billboard would flip); matters in portrait
        let prev = -9; G.forEach((q, i) => { const g = q[1], dx = g[0] - A0.x, dz = g[1] - A0.z, d = dx * fx + dz * fz, l = dx * rx + dz * rz; let nx = l / (d * tf * asp);
          const mn = i < 2 ? -9 : prev + Math.max(port ? .2 : .1, (port ? .025 : .02) * (q[0] - G[i - 1][0])); // never hovering: at least ~.02 of the half-width per second
          if (nx < mn) { nx = mn; const l2 = nx * d * tf * asp; q[1] = [A0.x + fx * d + rx * l2, A0.z + fz * d + rz * l2]; } prev = nx; }); }
      const lift = G.map(() => 0), iL = 1, iC = 2; let yLow = 0;
      // at the launch the team comes down out of the sky band and passes low over the pin: the bells (a third of the team behind
      // its centre) right above the door, the runners a little above the label's height, so the gold drizzle visibly lands on it
      const yPinOf = P => { setCam(pc, P); const q = ndcOf(pc, [0, SHOP_Y, 0]); return (.5 - q[1] * .5) * vh; };
      const solveK = () => G.map(([t, g], i) => { const P = camAt0(t); const yPin = i === iL ? yPinOf(P) : 0; setCam(pc, P);
        const q = ndcOf(pc, [g[0], P.h, g[1]]), x = (q[0] * .5 + .5) * vw, L = S0 * vh / (2 * tfOf(pc) * q[2]);
        const yB = bandY(boxA, x, L * 1.05, L * .4, yHorA, 1.1) + lift[i]; if (i === iL) yLow = Math.max(yPin - Math.max(.34 * L, 96), yHorA - L * .05);
        const y = i === iL ? yLow : i === iC ? lerp(yLow, yB, .45) : yB;
        const fp = toFrame(g[0], g[1]); return { t, p: [fp[0], aimY(pc, g[0], g[1], 1 - 2 * y / vh), fp[1]] }; });
      Object.assign(FR, { x: A0.x, z: A0.z, fx, fz, rx, rz, k: tf * asp });
      FLY.K = solveK(); FLY.spl = monoSpline(FLY.K);
      for (let it = 0; it < 14; it++) { // sample the flight; where the team would touch the words, lower the nearest key a little
        let bad = -1;
        for (let t = LAUNCH - 2; t < LAUNCH + 14 && bad < 0; t += .25) { setCam(pc, camAt0(t)); const a = angOf(pc, t, path0), r = teamBox(pc, path0(t), S0, a); if (r && r[0] + r[2] > 0 && r[0] < vw && teamHits(r, a, boxA)) bad = t; }
        if (bad < 0) break; let bi = 0; G.forEach(([t], i) => { if (i !== iL && Math.abs(t - bad) < Math.abs(G[bi][0] - bad)) bi = i; }); if (lift[bi] > 90) break; lift[bi] += 10; FLY.K = solveK(); FLY.spl = monoSpline(FLY.K);
      }
      // ---- the moon: where the sleigh will be a few seconds after the pass, so it crosses the disc; never under the words
      FLY.moonT = LAUNCH + (port ? 6 : 7);
      { const P = camAt0(FLY.moonT); setCam(pc, P); const q = ndcOf(pc, path0(FLY.moonT)); const Rm = port ? .05 * vw : .046 * vh;
        let x = (q[0] * .5 + .5) * vw, y = (.5 - q[1] * .5) * vh - (port ? 0 : .1 * Rm);
        for (const b of boxA) if (x + Rm * 1.6 > b[0] && x - Rm * 1.6 < b[0] + b[2]) y = Math.max(y, b[1] + b[3] + Rm * 1.25);
        y = Math.min(y, yHorA - Rm * .55); x = clamp(x, Rm * 2, vw - Rm * 2);
        const nx = x / vw * 2 - 1, ny = 1 - 2 * y / vh; pv0.set(nx * tf * asp, ny * tf, -1).transformDirection(pc.matrixWorld);
        FLY.moonA.copy(pv0); U.uMoonD.value.copy(pv0); gMat.uniforms.uMoonR.value = Math.atan(Rm / (vh / 2) * tf); }
      // ---- beat 1: a slow loop over the river, small and far, in the sky band of beat 1
      const B1 = camAt1(9, 17); setCam(pc, B1);
      const bx = Math.cos(B1.yaw), bz = Math.sin(B1.yaw), C = [4470, 0, 1050];
      const dL = (C[0] - B1.x) * bx + (C[2] - B1.z) * bz, tf1 = tfOf(pc);
      const S1 = FLY.S1 = L1 * 2 * tf1 * dL / vh;
      FLY.L = { c: C, r: [-bz, bx], f: [bx, bz], rx: dL * tf1 * asp * (port ? .3 : .17), rf: 520, ry: 0, rz: 0, per: 16, ph: -.6 };
      const q = ndcOf(pc, [C[0], B1.h, C[2]]), xL = (q[0] * .5 + .5) * vw;
      let yL = bandY(boxB, xL, L1 * 1.3 + FLY.L.rx * vh / (2 * tf1 * dL) * 2, L1 * .45, yHorB, 1.7);
      FLY.L.c[1] = aimY(pc, C[0], C[2], 1 - 2 * yL / vh); FLY.L.ry = (FLY.L.c[1] - B1.h) * .22; FLY.L.rz = (FLY.L.c[1] - B1.h) * .04;
      { // beat 1: the camera has turned; the moon drifts with the move to sit behind the loop, so the team crosses it on each pass
        const Rm = port ? .05 * vw : .046 * vh; let x = xL + (port ? 0 : .12 * FLY.L.rx * vh / (tf1 * dL)), y = yL + Rm * .15;
        for (const b of boxB) if (x + Rm * 1.6 > b[0] && x - Rm * 1.6 < b[0] + b[2]) y = Math.max(y, b[1] + b[3] + Rm * 1.25);
        y = Math.min(y, yHorB - Rm * .55);
        pv0.set((x / vw * 2 - 1) * tf1 * asp, (1 - 2 * y / vh) * tf1, -1).transformDirection(pc.matrixWorld); FLY.moonB.copy(pv0); }
      if (ctx.headless) window.__talasFly = { K: FLY.K, L: FLY.L, S0, S1, moon: U.uMoonD.value.toArray(), lift };
    };

    // ---------------------------------------------------------------- words: laid out before the camera, which keeps the horizon below them
    const layout = () => {
      const vw = view.w, vh = view.h, port = view.portrait;
      const sT = view.safeTop || 110, sS = view.safeSide || 90;
      const mx = Math.max(sS, port ? 96 : vw * .062), top = sT + (port ? 90 : 40), avail = vw - mx * 2;
      const hs = port ? 92 : clamp(vw * .056, 96, 112);
      hint.set(view.touch ? 'talas.hintTouch' : 'talas.hint'); hint.size = port ? 32 : 29; hint.wrap = avail;
      const block = (H, P, X, key, hsz) => {
        let wMax = port ? avail : Math.min(vw * .56, hsz * 9.6);
        if (!port) for (let i = 0; i < 6 && nLines(key, hsz, wMax) > 2; i++) { hsz *= .95; wMax = Math.min(vw * .56, hsz * 9.6); } // landscape: two lines at most (a third line pushes the horizon off the city)
        H.size = hsz; H.wrap = balance(key, hsz, wMax); P.size = port ? 40 : 36; P.wrap = port ? avail - 30 : 560;
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
      const hz = (bot, sky) => Math.round(clamp(1 - 2 * (bot + (port ? 80 : 70) + sky) / vh, -.3, .62) * 200) / 200;
      HOR.a = hz(BOT.a, SKY.a * (port ? 1.15 : 1)); HOR.b = hz(BOT.b, SKY.b * (port ? .5 : 1)); // a band of open sky under the words, for the sleigh
    };

    const inst = {
      async init() {
        layout(); fit();
        const s = { t: 0, dt: 0, time: 0, beat: 1, p: [1, 1], k: () => 1, at: b => (b ? 9 : 13), since: b => (b ? 9 : 17), enter: 1, exit: 0, q: 1, motion: 1, mouse: { x: 0, y: 0, down: false } };
        const tmp = gfx.target({ hdr: false, scale: .25 }); inst.update(s); inst.render(tmp, s); gfx.free(tmp);
        ctx.audio.warm([{ sfx: 'jingle' }, { sfx: 'sleigh' }]);
      },
      enter(s) { user = []; tap = null; lastUser = -9; prevT = tWaveOf(s); prevK = kOf(s); prevJ = jOf(s); lastSub = lastAir = -1; },
      exit() { ctx.audio.layer('sub', 0); ctx.audio.layer('air', 0); lastSub = lastAir = -1; },
      beat(s) { prevK = kOf(s); prevJ = jOf(s); },
      resize() { camKey = ''; },
      lang() { setLang(); },

      update(s) {
        layout(); fit(); plan();
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
          if (prevT < -1.15 && tW >= -1.15) ctx.sfx('sleigh', { gain: .95, pan: sPan });                     // the sleigh comes over the roofs...
          if (prevT < RING0 && tW >= RING0) ctx.sfx('jingle', { shake: 1, gain: .9, pan: sPan });             // ...shakes its bells right over the door (the gold burst)...
          if (prevT < 0 && tW >= 0) { ctx.audio.drum('kick', { gain: .95 }); ctx.sfx('thud', { gain: .6 }); } // ...and the ring leaves the ground under them
          const jn = jOf(s); if (jn > prevJ && jn >= 0) ctx.sfx('jingle', { shake: .3, gain: .32, pitch: 1.06, pan: sPan }); prevJ = jn;
          if (prevT < ARRIVE && tW >= ARRIVE) ctx.sfx('bell', { gain: .5, pan: .3 });
          if (k > prevK && k >= 0) ctx.audio.drum('kick', { gain: .5, pitch: .92 });
        }
        prevT = tW; prevK = k;
        sub = clamp(sub * .85); airL = clamp(.12 + .7 * airL);
        if (Math.abs(sub - lastSub) > .01) { ctx.audio.layer('sub', sub); lastSub = sub; }
        if (Math.abs(airL - lastAir) > .01) { ctx.audio.layer('air', airL); lastAir = airL; }

        // ---- camera
        const kb = s.k(1, 0, 6.2, 'inOutCubic');
        const CB = camBase(kb, s.k(0, 0, 13, 'outCubic'), s.since(0), since1, m);   // arrives from a little higher and further back
        let yaw = CB.yaw, pitch = CB.pitch, cx = CB.x, cz = CB.z, ch = CB.h;
        const fwx = Math.cos(yaw), fwz = Math.sin(yaw);
        const sway = m * (1 - .6 * Math.sin(Math.PI * kb));
        cx += -fwz * (Math.sin(t * .113) * 16 + Math.sin(t * .071 + 1.3) * 11) * sway; cz += fwx * (Math.sin(t * .113) * 16 + Math.sin(t * .071 + 1.3) * 11) * sway;
        ch += (Math.sin(t * .093 + 2.1) * 5 + Math.sin(t * .157) * 2.5) * sway;
        const par = (1 - Math.sin(Math.PI * kb)) * (.3 + .7 * s.k(0, 0, 3)) * (s.motion < 1 ? .3 : 1);
        yaw += Math.sin(t * .083 + .4) * .0035 * sway + s.mouse.x * .03 * par; pitch += Math.sin(t * .067) * .002 * sway + s.mouse.y * .012 * par;
        let fov = CB.fov;
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
        lMat.uniforms.uKeepL.value = .45 + .55 * q - 1e-6; lMat.uniforms.uKeepC.value = .4 + .6 * q - 1e-6;

        // ---- the sleigh (reduced motion: held still, mid-flight) and the snow
        let tS, sz;
        if (s.beat < 1) { FLY.mode = 0; tS = m < 1 ? FLY.moonT + .6 : s.since(0); sz = FLY.S0; } // reduced motion: held across the moon
        else { FLY.mode = 1; FLY.off = s.since(0) - since1; tS = m < 1 ? 9.6 : since1; sz = lerp(FLY.S0, FLY.S1, blendW(tS)); }
        U.uMoonD.value.copy(FLY.moonA).lerp(FLY.moonB, kb).normalize();
        sleigh.ring(s.beat < 1 && m >= 1 ? LAUNCH + RING0 : null);         // the bells ring over the door: a gold drizzle falls toward the shop as the wave leaves
        sleigh.update(tS, null, null, cam, sz);
        burst(cam, tW, sz, s.beat < 1 && m >= 1);
        const sp = posAt(tS), sAng = angOf(cam, tS, t => posAt(t, false)), sBox = teamBox(cam, sp, sz, sAng), sFlip = (ndcOf(cam, posAt(tS + .1))[0] >= ndcOf(cam, sp)[0]) ? 1 : -1;
        const mD = U.uMoonD.value, mP = project(cam.position.x + mD.x * 3e4, cam.position.y + mD.y * 3e4, cam.position.z + mD.z * 3e4);
        if (sBox) { sPan = clamp(sBox[4] / view.w * 2 - 1, -1, 1) * .7;
          let lx = .55, ly = .75; if (mP) { const dx = mP.x - sBox[4], dy = sBox[5] - mP.y, l = Math.hypot(dx, dy) || 1; lx = dx / l * .8; ly = dy / l * .8 + .65; }
          sleigh.setLight(lx, ly);
          // over the lit city (below the horizon) the dark team needs a touch more rim to read, most of all on small screens
          const yHz = (1 - lerp(camA.yH, camB.yH, kb)) / 2 * view.h, below = smoothstep(-.05, .35, (sBox[5] - yHz) / Math.max(sBox[6], 1));
          sleigh.style({ rim: 2 + .5 * below * (Math.min(view.cssW || 1e4, view.cssH || 1e4) < 520 ? 1 : .5) }); }
        snow.quality(q).update(m < 1 ? s.time * .3 : s.time, cam);

        // ---- grade follows the story
        const hit = arr > 0 ? Math.exp(-arr / 1.2) : 0;
        grade.exposure = 1.08 + .1 * smoothstep(0, 9, tW) + .12 * hit;
        grade.bloom = .72 + .22 * Math.min(flash, 1) + .35 * hit; grade.fade = 1; grade.halation = .5;
        if (dbg && dbg.length < 5) { grade.bloom = 0; grade.halation = 0; grade.vignette = 0; }

        // ---- words (positions were set by layout())
        const vw = view.w, vh = view.h, port = view.portrait;
        const out1 = s.k(1, 0, .8);
        // words first: each headline starts within a second of its beat and the paragraph follows straight on (keep textAt in step)
        const i1 = s.k(0, .7, 1.8), j1 = s.k(0, 1.6, 2.8), i2 = s.k(1, .8, 1.8), j2 = s.k(1, 1.6, 2.7), ih = s.k(1, 2.4, 3.2);
        h1.show(i1, { style: 'blur', by: 'word', q: out1 }); p1.show(j1, { style: 'rise', by: 'word', q: out1 });
        h2.show(i2, { style: 'blur', by: 'word' }); p2.show(j2, { style: 'rise', by: 'word' });
        const used = clamp((t - lastUser) / .8) * (user.length ? .45 : 1);
        hint.alpha = (.9 + .1 * Math.sin(t * 2.2) * m) * (lastUser > 0 ? .25 + .75 * used : 1); hint.show(ih, { style: 'rise', by: 'word' });

        // ---- labels pinned to the two places, and the counter riding the front: all of it kept off the words
        oN = 0; oU.uView.value.set(vw, vh); oU.uAA.value = .8 / view.scale;
        const sT = view.safeTop || 110, sB = view.safeBottom || 130, sS = view.safeSide || 90, MG = 30;
        const avoid = [];
        const keep = (T, vis) => { if (vis) avoid.push([T.x - MG, T.y - MG, T.width + MG * 2, T.height + MG * 2]); };
        keep(h1, i1 > 0 && out1 < 1); keep(p1, j1 > 0 && out1 < 1); keep(h2, i2 > 0); keep(p2, j2 > 0); keep(hint, ih > 0);
        if (sBox && sBox[0] + sBox[2] > 0 && sBox[0] < vw) avoid.push([sBox[0] - 12, sBox[1] - 12, sBox[2] + 24, sBox[3] + 24]); // labels keep off the sleigh...
        if (mP) { const r = Math.tan(gMat.uniforms.uMoonR.value) / tanF * vh * .5 + 10; avoid.push([mP.x - r, mP.y - r, r * 2, r * 2]); } // ...and off the moon
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
        { // the moment it rings: a fine plumb line drops from the bells to the door, and the ring leaves the ground there
          const kd = s.beat < 1 && m >= 1 ? smoothstep(-.45, 0, tW) * (1 - smoothstep(.15, 1.7, tW)) : 0;
          if (kd > .01 && sBox && aShop) { const x0 = sBox[4] - Math.cos(sAng) * sBox[6] * .4 * sFlip, y0 = sBox[5] + sBox[6] * .1 + Math.sin(sAng) * sBox[6] * .4 * sFlip, y1 = aShop.y - 12, f = smoothstep(-.45, .1, tW);
            oLine(x0, y0, x0 + (aShop.x - x0) * f, y0 + (y1 - y0) * f, kd * .42, .55); } }
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
        const rLyra = pin(lLyra, aShop, kL * (1 - .25 * pass * kb), ['dl', 'ul', 'dr', 'ur'], .62 + .33 * kb); // the shop: as legible as Sava Centar, even while its own rings pulse under it // below-left first: the sleigh passes low over the pin, so the label stays put
        if (s.beat >= 1 && lastUser < 0 && aShop && m >= 1) for (const t0 of [2.4, 3.1]) { // as the invitation lands, the shop pin rings twice: "here, touch"
          const a = (s.at(1) - t0) / 1.5; if (a > 0 && a < 1) oRing(aShop.x, aShop.y, 9 + 58 * ctx.ease.outCubic(a), (1 - a) * (1 - a) * .85); }
        const arrived = arr > 0;
        const rSava = pin(lSava, aSava, kS * (arrived ? 1 : .7), ['ul', 'ur', 'dl', 'dr'], .5);
        // the counter rides the front along the line from the shop to Sava Centar
        const cT = clamp(tW, 0, ARRIVE), fr = cT / ARRIVE;
        const tenths = Math.min(Math.floor(cT * 10 + 1e-6), Math.floor(ARRIVE * 10)), ci = Math.floor(tenths / 10), cd = tenths % 10;
        const cA = smoothstep(-.25, .25, tW) * (1 - s.k(1, 0, 1.3, 'inOutCubic')); // beat 2 moves on: the count has done its job, and the camera move would bury it behind the towers
        const aF = project(SAVA[0] * fr, lerp(4, SAVA_Y, fr * fr * fr), SAVA[1] * fr);
        if (aF && aShop && cA > .01) oLine(aShop.x, aShop.y, aF.x, aF.y, cA * .22 * (1 - .5 * kb), .6); // the distance covered so far
        let cx0 = 0, cy0 = 0, rCount = null; const TI = cInt[Math.min(ci, cInt.length - 1)]; TI._sync(); cUnit._sync();
        const wI = TI.width || CSZ * .6, uW = cUnit.width || 30, cw = wI + decW + 7 + uW, chh = CSZ * .92;
        if (aF && cA > .01) {
          const P = place(aF, cw, chh, ['dr', 'dl', 'ur', 'ul'], avoid, 20, 26);
          cx0 = P.x + wI; cy0 = P.y + CSZ * .78;
          oPlate(P.x, P.y, cw, chh, cA * .45); rCount = [P.x, P.y, cw, chh]; avoid.push([P.x - 18, P.y - 12, cw + 36, chh + 24]); // the landmarks keep off the count
          const land = smoothstep(.86, 1, fr);
          const dx = P.ex - aF.x, dy = P.ey - aF.y, l = Math.hypot(dx, dy) || 1;
          oLine(aF.x + dx / l * 9, aF.y + dy / l * 9, P.ex, P.ey, cA * .5 * (1 - .4 * land)); oRing(aF.x, aF.y, 3.4, cA * (1 - land), true);
        }
        cInt.forEach((T, i) => { T.alpha = i === ci && aF ? cA : 0; T.x = cx0; T.y = cy0; T.show(T.alpha > 0 ? 1 : 0, { style: 'fade' }); });
        cDec.forEach((T, i) => { T.alpha = i === cd && aF ? cA : 0; T.x = cx0; T.y = cy0; T.show(T.alpha > 0 ? 1 : 0, { style: 'fade' }); });
        cUnit.alpha = aF ? cA : 0; cUnit.x = cx0 + decW + 7; cUnit.y = cy0; cUnit.show(cUnit.alpha > 0 ? 1 : 0, { style: 'fade' });
        // landmark labels: after the wave has arrived (beat 0) and in beat 1; only where they fit cleanly, never forced
        const kLm = Math.max(smoothstep(ARRIVE + .6, ARRIVE + 2.2, tW) * (1 - kb), s.k(1, 1.2, 2.6, 'outCubic'));
        for (const L of LMK) {
          const a = project(L.x, L.y, L.z), T = L.T; T._sync();
          if (kLm < .01 || !onScr(a)) { T.alpha = 0; T.show(0, { style: 'fade', by: 'line' }); continue; }
          const P = place(a, T.width, T.height, ['ul', 'ur', 'dl', 'dr'], avoid, 12, 22);
          const r = [P.x - 22, P.y - 14, T.width + 44, T.height + 28];             // generous: a quiet label never touches another one
          if (!inSafe([P.x, P.y, T.width, T.height]) || avoid.some(q => hitR(r, q))) { T.alpha = 0; T.show(0, { style: 'fade', by: 'line' }); continue; }
          T.x = P.x; T.y = P.y; T.alpha = kLm * .92; T.show(1, { style: 'fade', by: 'line' });
          oPlate(P.x, P.y, T.width, T.height, .42 * kLm);
          const dx = P.ex - a.x, dy = P.ey - a.y, l = Math.hypot(dx, dy) || 1;
          oLine(a.x + dx / l * 8, a.y + dy / l * 8, P.ex, P.ey, kLm * .4); oRing(a.x, a.y, 4.5, kLm * .6);
          avoid.push(r);
        }
        oGeo.attributes.position.needsUpdate = true; oGeo.attributes.aD.needsUpdate = true; oGeo.setDrawRange(0, oN * 6);
        if (ctx.headless) { // test hook (headless only): is the story's moment on screen, and do the labels keep off the words?
          const inR = (a, x0, x1, y0, y1) => !!a && a.x >= x0 && a.x <= x1 && a.y >= y0 && a.y <= y1;
          const bl = window.__talasBell, bP = bl && bsOn ? project(bl.src0[0], bl.src0[1], bl.src0[2]) : null;
          const path = []; for (let f = .1; f < 1; f += .1) path.push(project(SAVA[0] * f, 4, SAVA[1] * f));
          const tbx = T => [T.x, T.y, T.width, T.height].map(v => Math.round(v));
          const texts = s.beat < 1 ? [[h1, i1 * (1 - out1)], [p1, j1 * (1 - out1)]] : [[h2, i2], [p2, j2], [hint, ih]];
          window.__talasDbg = { t: s.since(0), beat: s.beat, LAUNCH, ARRIVE, view: [Math.round(vw), Math.round(vh)], safe: [sS, sT, sB].map(Math.round),
            usedFallback: !!(camA.fb || camB.fb || camA.miss > 0 || camB.miss > 0), missA: camA.miss, missB: camB.miss, triesA: camA.tries, triesB: camB.tries, camMs: window.__talasCam && Math.round(window.__talasCam.ms), yH: [camA.yH, camB.yH], HOR: [HOR.a, HOR.b],
            headLines: [nLines('talas.b1.h', h1.size, h1.wrap), nLines('talas.b2.h', h2.size, h2.wrap)], headSize: [h1.size, h2.size].map(Math.round),
            pin: aShop && [aShop.x, aShop.y].map(Math.round), sava: aSava && [aSava.x, aSava.y].map(Math.round), bell: bP && [bP.x, bP.y].map(Math.round), sleigh: sBox && sBox.slice(0, 4).map(Math.round),
            pinOnScreen: inR(aShop, sS, vw - sS, sT, vh - sB), savaOnScreen: inR(aSava, sS, vw - sS, sT, vh - sB), pathOnScreen: path.every(a => inR(a, 0, vw, sT, vh)),
            sleighOnScreen: !!sBox && inR({ x: sBox[4], y: sBox[5] }, 0, vw, 0, vh) && (s.beat > 0 || !bsOn || inR(bP, 0, vw, 0, vh)),
            bellOverPin: !!(bP && aShop) && Math.abs(bP.x - aShop.x) < Math.max(60, .2 * sBox[6]) && bP.y < aShop.y,
            textBoxes: texts.filter(q => q[1] > .01).map(q => tbx(q[0])),
            labelBoxes: [[lLyra, rLyra], [lSava, rSava]].filter(q => q[1] && q[0].alpha > .01).map(q => tbx(q[0])).concat(rCount && cA > .01 ? [rCount.map(Math.round)] : []) };
        }
      },

      render(target) {
        gfx.draw(world, cam, hdrA);
        sleigh.render(hdrA, cam); if (bsOn) gfx.draw(bsScene, cam, hdrA, { clear: false }); snow.render(hdrA, cam);
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
