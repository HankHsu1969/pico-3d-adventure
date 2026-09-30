// 五個冒險關卡。座標：玩家往 -Z 前進，Y 向上。
// 跳躍參考：一般跳約 2.8 高、奔跑跳約 3.2；平地起跳水平距離約 5~8。
export const LEVELS = [
  // ============ 1. 晴空草原 ============
  {
    id: 1, name: '晴空草原', en: 'Sunny Meadow', theme: 'meadow', bg: 'assets/bg1.jpg', music: 'meadow', time: 300,
    desc: '皮可的冒險從這裡開始！踩扁咕姆、收集星星寶石。',
    build(B) {
      B.ground(0, 8, -38, 14, 0);
      B.coinLine(0, 0, -4, 0, 0, -10, 4);
      B.brick(-3.6, 3.9, -13); B.qblock(-2.4, 3.9, -13, 'coin'); B.brick(-1.2, 3.9, -13);
      B.qblock(0, 3.9, -13, 'feather'); B.brick(1.2, 3.9, -13); B.qblock(2.4, 3.9, -13, 'coin'); B.brick(3.6, 3.9, -13);
      B.enemy('walker', 0, 0, -21);
      B.enemy('walker', 3, 0, -30);
      B.box(-4.5, 2.3, -27, 3, 3, 1.2);
      B.box(-4.5, 4.9, -32, 3, 3, 1.2);
      B.coinLine(-4.5, 2.3, -26, -4.5, 2.3, -28, 2);
      B.gem(-4.5, 4.9, -32);
      ['tree', 'tree', 'bush', 'bush'].forEach((t, i) => B.deco(t, i % 2 ? 5.8 : -5.8, 0, -2 - i * 8));
      B.scatter('flower', -6, 6, 6, -36, 0, 22);
      // 缺口
      B.coinArc(0, -37, 0, -44, 0.5, 2.6, 6);
      B.ground(0, -43, -72, 10, 0);
      B.enemy('walker', -2, 0, -50);
      B.enemy('walker', 2, 0, -60);
      B.spring(3.2, 0, -55, 26);
      B.box(3.5, 7, -61, 4, 4, 1.2);
      B.coinRing(3.5, 7, -61, 1.4, 6);
      B.gem(3.5, 7, -62);
      B.deco('tree', -4, 0, -46); B.deco('bush', -4, 0, -66); B.deco('mushroom', 4, 0, -68, 1.2);
      B.scatter('flower', -4.5, 4.5, -44, -70, 0, 14);
      B.checkpoint(0, 0, -68);
      // 移動平台區
      B.box(0, 0.5, -76, 3, 3, 2);
      B.mover(0, 0.5, -82, 4, 4, [0, 0, -8], 4);
      B.coinLine(0, 0.5, -82, 0, 0.5, -90, 4);
      B.box(0, 0.5, -96, 3, 3, 2);
      B.ground(0, -98.5, -131, 12, 1);
      B.brick(-2.4, 4.9, -106); B.qblock(-1.2, 4.9, -106, 'coin10'); B.brick(0, 4.9, -106);
      B.qblock(1.2, 4.9, -106, 'heart'); B.brick(2.4, 4.9, -106);
      B.enemy('walker', -3, 1, -112);
      B.enemy('walker', 0, 1, -116);
      B.enemy('walker', 3, 1, -120);
      B.coinLine(-3, 1, -110, 3, 1, -110, 4);
      // 第三顆寶石：右側浮空平台
      B.box(8.5, 3.5, -110, 2.5, 2.5, 1.2);
      B.box(11.5, 6, -116, 3, 3, 1.2);
      B.coin(8.5, 3.5, -110);
      B.gem(11.5, 6, -116);
      B.deco('tree', -5, 1, -101); B.deco('tree', 5, 1, -124); B.deco('bush', -5, 1, -122);
      B.scatter('flower', -5.5, 5.5, -100, -125, 1, 12);
      // 階梯 + 終點
      B.box(0, 2.2, -126, 6, 2, 1.2);
      B.box(0, 3.4, -128, 6, 2, 2.4);
      B.box(0, 4.6, -130, 6, 2, 3.6);
      B.ground(0, -133, -160, 14, 1);
      B.goal(0, 1, -139.5);
      B.deco('tree', -5.5, 1, -150); B.deco('tree', 5.5, 1, -148); B.deco('bush', 4, 1, -156);
      B.scatter('flower', -6, 6, -134, -158, 1, 14);
      // 遠景
      B.deco('tree', -14, -4, -60, 2.5); B.deco('tree', 16, -4, -30, 2.2); B.deco('tree', 15, -3, -130, 2.8);
    },
  },
  // ============ 2. 夕陽沙漠 ============
  {
    id: 2, name: '夕陽沙漠', en: 'Sunset Desert', theme: 'desert', bg: 'assets/bg2.jpg', music: 'desert', time: 300,
    desc: '跳過沙岩石柱、搭上移動平台，小心會掉落的地板！',
    build(B) {
      B.ground(0, 8, -30, 12, 0);
      B.qblock(0, 3.9, -8, 'feather');
      B.qblock(-2.4, 3.9, -8, 'coin'); B.qblock(2.4, 3.9, -8, 'coin');
      B.enemy('walker', 2, 0, -16);
      B.enemy('spiky', 0, 0, -23, { range: 3.5 });
      B.coinLine(-3, 0, -12, -3, 0, -20, 4);
      B.deco('cactus', -5, 0, -4); B.deco('cactus', 5, 0, -18, 1.2); B.deco('cactus', -5, 0, -27, 0.9);
      // 石柱跳躍
      B.cyl(0, 0.8, -34, 1.6);
      B.cyl(3, 1.8, -38.5, 1.6);
      B.cyl(0, 2.8, -43, 1.6);
      B.cyl(-3, 1.8, -47.5, 1.6);
      B.cyl(0, 1, -52, 1.8);
      [[0, 0.8, -34], [3, 1.8, -38.5], [0, 2.8, -43], [-3, 1.8, -47.5]].forEach(([x, y, z]) => B.coin(x, y + 0.3, z));
      B.ground(0, -55, -80, 12, 1);
      B.qblock(-1.2, 4.9, -60, 'coin'); B.brick(0, 4.9, -60); B.qblock(1.2, 4.9, -60, 'coin');
      B.enemy('spiky', 0, 1, -66, { range: 4 });
      B.enemy('walker', -3, 1, -72);
      B.enemy('walker', 3, 1, -74);
      // 寶石 1：高台
      B.box(-4.5, 3.6, -68, 2.5, 2.5, 2.6);
      B.box(-4.5, 6.2, -74, 2.5, 2.5, 1.2);
      B.gem(-4.5, 6.2, -74);
      B.deco('cactus', 5, 1, -58); B.deco('cactus', 5, 1, -70, 1.3);
      B.checkpoint(0, 1, -78);
      // 移動平台
      B.mover(0, 1, -84, 4, 4, [0, 0, -11], 4.5);
      B.coinLine(0, 1.5, -86, 0, 1.5, -94, 5);
      B.ground(0, -99, -118, 10, 1);
      B.enemy('walker', 2, 1, -104);
      B.enemy('spiky', 0, 1, -113, { range: 3 });
      B.spring(-3.5, 1, -108, 26);
      B.box(-3.5, 7.5, -115, 3, 3, 1.2);
      B.gem(-3.5, 7.5, -115);
      B.deco('cactus', 4, 1, -101);
      // 掉落平台
      B.faller(0, 1, -121.5, 3, 3);
      B.faller(0, 1, -126, 3, 3);
      B.faller(0, 1, -130.5, 3, 3);
      B.faller(0, 1, -135, 3, 3);
      B.coinLine(0, 1.5, -121.5, 0, 1.5, -135, 4);
      B.ground(0, -138.5, -157, 12, 1);
      B.enemy('walker', -3, 1, -143);
      B.enemy('walker', 3, 1, -146);
      B.qblock(0, 4.9, -144, 'heart');
      // 寶石 3：右邊懸空小平台
      B.box(8.5, 2, -149, 2, 2, 1);
      B.gem(8.5, 2, -149);
      B.box(0, 2.2, -152, 6, 2, 1.2);
      B.box(0, 3.4, -154, 6, 2, 2.4);
      B.box(0, 4.6, -156, 6, 2, 3.6);
      B.ground(0, -159, -185, 14, 1);
      B.goal(0, 1, -165.5);
      B.deco('cactus', -5.5, 1, -175); B.deco('cactus', 5.5, 1, -180, 1.2);
      // 遠景金字塔
      B.deco('pyramid', -120, -34, -150, 70); B.deco('pyramid', 110, -34, -240, 90); B.deco('pyramid', 140, -34, -60, 60); B.deco('pyramid', -150, -34, -30, 55);
    },
  },
  // ============ 3. 冰雪山峰 ============
  {
    id: 3, name: '冰雪山峰', en: 'Frosty Peaks', theme: 'snow', bg: 'assets/bg3.jpg', music: 'snow', time: 300,
    desc: '冰面很滑！爬上山峰，閃過滾動的冰刺球。',
    build(B) {
      B.ground(0, 8, -24, 12, 0);
      B.qblock(0, 3.9, -8, 'feather');
      B.coinLine(-3, 0, -4, -3, 0, -12, 4);
      B.enemy('walker', 0, 0, -17);
      B.deco('pine', -5, 0, -2); B.deco('pine', 5, 0, -12); B.deco('snowman', -4.5, 0, -18);
      // 冰道
      B.ground(0, -24, -44, 8, 0, 'ice');
      B.enemy('spiky', 0, 0, -31, { range: 3, speed: 3.2 });
      B.enemy('spiky', 0, 0, -39, { range: 3, speed: 3.6 });
      B.coinLine(0, 0, -26, 0, 0, -43, 6);
      // 往上爬
      B.box(0, 1.4, -47, 4, 3, 5);
      B.box(2.5, 2.8, -50.5, 3, 3, 1.2);
      B.box(-0.5, 4.2, -54, 3, 3, 1.2);
      B.box(2, 5.6, -57.5, 3, 3, 1.2);
      B.ground(0, -59.5, -80, 10, 6.5, 'normal', 10);
      B.enemy('walker', -2, 6.5, -66);
      B.enemy('walker', 2, 6.5, -72);
      B.qblock(-1.2, 10.4, -64, 'coin'); B.qblock(1.2, 10.4, -64, 'heart');
      // 寶石 1
      B.box(-3.8, 8.8, -70, 2, 2, 2.3);
      B.box(-7.5, 10.6, -74, 2.5, 2.5, 1.2);
      B.gem(-7.5, 10.6, -74);
      B.deco('pine', 4, 6.5, -62); B.deco('crystal', 4, 6.5, -76);
      B.checkpoint(0, 6.5, -77);
      // 掉落冰塊
      B.faller(0, 6, -83, 3, 3);
      B.faller(2, 5.5, -87, 3, 3);
      B.faller(-1, 5, -91, 3, 3);
      B.faller(1, 4.5, -95, 3, 3);
      B.ground(0, -98, -120, 12, 4, 'ice');
      B.enemy('walker', -3, 4, -104);
      B.enemy('walker', 3, 4, -108);
      B.enemy('spiky', 0, 4, -114, { range: 4, speed: 3 });
      B.coinRing(0, 4, -110, 3, 8);
      // 寶石 2：上下移動平台
      B.mover(9, 4, -108, 3, 3, [0, 4, 0], 3.5);
      B.box(9, 10, -114, 3, 3, 1.2);
      B.gem(9, 10, -114);
      B.deco('crystal', -5, 4, -100, 1.3); B.deco('snowman', -5, 4, -117);
      // 冰柱跳
      B.cyl(0, 4, -124, 1.4, 'ice');
      B.cyl(0, 4, -128.5, 1.4, 'ice');
      B.cyl(0, 4, -133, 1.4, 'ice');
      B.coin(0, 4.4, -124); B.coin(0, 4.4, -128.5); B.coin(0, 4.4, -133);
      B.ground(0, -136, -155, 12, 4);
      B.enemy('walker', 2, 4, -140);
      B.enemy('walker', -2, 4, -144);
      B.spring(-4, 4, -145, 26);
      B.box(-4, 11, -151, 3, 3, 1.2);
      B.gem(-4, 11, -151);
      B.box(0, 5.2, -150, 6, 2, 1.2);
      B.box(0, 6.4, -152, 6, 2, 2.4);
      B.box(0, 7.6, -154, 6, 2, 3.6);
      B.ground(0, -157, -180, 14, 4);
      B.goal(0, 4, -163.5);
      B.deco('pine', -5.5, 4, -172); B.deco('pine', 5.5, 4, -160); B.deco('snowman', 5, 4, -176);
      // 遠景
      B.deco('pine', -20, -8, -50, 3); B.deco('pine', 22, -6, -90, 3.5); B.deco('pine', -24, -6, -140, 4);
      B.deco('crystal', 18, -2, -30, 3);
    },
  },
  // ============ 4. 雲端王國 ============
  {
    id: 4, name: '雲端王國', en: 'Sky Kingdom', theme: 'sky', bg: 'assets/bg4.jpg', music: 'sky', time: 300, killY: -12,
    desc: '在雲朵與彩虹橋上跳躍，小心嗡嗡蜂！',
    build(B) {
      B.cyl(0, 0, 0, 5, 'cloud');
      B.qblock(0, 3.9, -2, 'feather');
      B.coinRing(0, 0, 0, 3, 8);
      B.cyl(0, 0, -9, 2.2, 'cloud');
      B.cyl(3, 0.5, -14.5, 2.2, 'cloud');
      B.cyl(-1, 1, -20, 2.2, 'cloud');
      B.coin(0, 0.3, -9); B.coin(3, 0.8, -14.5); B.coin(-1, 1.3, -20);
      // 彩虹橋
      B.ground(0, -22.5, -40, 4, 1, 'rainbow', 0.8);
      B.enemy('bee', 0, 3, -29, { amp: 3, speed: 1.6 });
      B.enemy('bee', 0, 3, -36, { amp: 3, speed: 2 });
      B.coinLine(0, 1, -24, 0, 1, -39, 6);
      B.cyl(0, 1, -45, 3.5, 'cloud');
      B.enemy('walker', 0, 1, -45, { chase: false, range: 2 });
      // 繞圈平台
      B.circler(0, 1.5, -54, 3.5, 3.5, 3.5, 6);
      B.cyl(0, 2, -63.5, 3, 'cloud');
      B.checkpoint(0, 2, -63.5);
      // 寶石 1
      B.spring(2, 2, -65, 27);
      B.cyl(6, 9, -69, 2, 'cloud');
      B.gem(6, 9, -69);
      // 上下 / 左右平台
      B.mover(0, 2, -70, 3, 3, [0, 3, 0], 3);
      B.cyl(0, 5.5, -76, 2.2, 'cloud');
      B.coin(0, 5.8, -76);
      B.mover(0, 5.5, -82, 3, 3, [6, 0, 0], 4);
      B.cyl(6, 5.5, -88, 2.2, 'cloud');
      // 彩虹橋 2
      B.ground(6, -90.5, -110, 4, 5.5, 'rainbow', 0.8);
      B.qblock(6, 9.4, -94, 'coin10');
      B.enemy('bee', 6, 7.5, -99, { amp: 3.5, speed: 1.8 });
      B.enemy('bee', 6, 7.5, -106, { amp: 3.5, speed: 2.2 });
      // 寶石 2：橋下小雲
      B.cyl(10.5, 2, -104, 1.8, 'cloud');
      B.gem(10.5, 2, -104);
      B.cyl(10.5, 3.5, -109.5, 1.5, 'cloud');
      B.cyl(6, 5, -114, 2.5, 'cloud');
      B.cyl(2, 4, -119, 2.5, 'cloud');
      B.cyl(-2, 3, -124, 2.5, 'cloud');
      B.coin(6, 5.3, -114); B.coin(2, 4.3, -119); B.coin(-2, 3.3, -124);
      // 大雲原
      B.ground(-2, -127, -150, 10, 3, 'cloud', 2);
      B.enemy('walker', -4, 3, -133);
      B.enemy('walker', 1, 3, -138);
      B.enemy('bee', -2, 5, -142, { amp: 4, speed: 1.5 });
      B.qblock(-2, 6.9, -131, 'heart');
      // 寶石 3：掉落雲
      B.faller(-9.5, 3.5, -140, 2.5, 2.5);
      B.faller(-13, 4.5, -144, 2.5, 2.5);
      B.gem(-13, 4.5, -144);
      B.box(-2, 4.2, -145, 6, 2, 1.2, 'rainbow');
      B.box(-2, 5.4, -147, 6, 2, 2.4, 'rainbow');
      B.box(-2, 6.6, -149, 6, 2, 3.6, 'rainbow');
      B.ground(-2, -152, -176, 14, 3, 'cloud', 2);
      B.goal(-2, 3, -158.5);
      // 裝飾
      B.deco('rainbow', 18, -4, -60, 2.5, -0.4); B.deco('rainbow', -22, -6, -150, 3, 0.5);
      B.deco('cloud', -34, 2, -40, 4); B.deco('cloud', 38, 6, -110, 5); B.deco('cloud', -40, 4, -170, 5);
      B.deco('balloon', 3, 1, -130); B.deco('balloon', -6, 3, -158); B.deco('balloon', 3, 3, -168);
    },
  },
  // ============ 5. 熔岩城堡 ============
  {
    id: 5, name: '熔岩城堡', en: 'Lava Castle', theme: 'castle', bg: 'assets/bg5.jpg', music: 'castle', time: 400, boss: true,
    desc: '最終關卡！穿越火焰棒與壓壓石，打敗咕嚕大王！',
    build(B) {
      B.ground(0, 8, -20, 12, 0, 'stone');
      B.qblock(-1.2, 3.9, -8, 'feather'); B.qblock(1.2, 3.9, -8, 'heart');
      B.enemy('walker', 0, 0, -15);
      B.deco('torch', -5.3, 0, -2); B.deco('torch', 5.3, 0, -2); B.deco('torch', -5.3, 0, -18); B.deco('torch', 5.3, 0, -18);
      B.box(0, 0, -24.5, 3, 3, 4, 'stone');
      B.box(0, 0, -29.5, 3, 3, 4, 'stone');
      B.coin(0, 0.3, -24.5); B.coin(0, 0.3, -29.5);
      B.ground(0, -33, -55, 10, 0, 'stone');
      B.firebar(0, 0.7, -40, 4.5, 1.7);
      B.enemy('walker', 3, 0, -47);
      B.thwomp(0, 0, -51.5);
      // 寶石 1：壓壓石旁的高台
      B.box(4, 4.8, -52, 2.2, 2.2, 1);
      B.gem(4, 4.8, -52);
      // 移動平台過岩漿
      B.mover(0, 0, -59, 3, 3, [0, 0, -8], 4);
      B.ground(0, -70.5, -95, 12, 0, 'stone');
      B.checkpoint(0, 0, -73);
      B.firebar(-3, 0.7, -80, 3.6, 2.0);
      B.firebar(3, 0.7, -88, 3.6, -2.0, Math.PI);
      B.enemy('spiky', 0, 0, -84, { range: 4 });
      B.qblock(0, 3.9, -92, 'feather');
      B.deco('torch', -5.6, 0, -72); B.deco('torch', 5.6, 0, -72); B.deco('torch', -5.6, 0, -94); B.deco('torch', 5.6, 0, -94);
      // 掉落平台
      B.faller(0, 0, -98.5, 3, 3);
      B.faller(0, 0, -103, 3, 3);
      B.faller(0, 0, -107.5, 3, 3);
      B.faller(0, 0, -112, 3, 3);
      // 寶石 3：左邊遠處石柱（需要奔跑跳）
      B.box(-7.5, 0.5, -106, 2.5, 2.5, 5, 'stone');
      B.gem(-7.5, 0.5, -106);
      B.ground(0, -115.5, -135, 12, 0, 'stone');
      B.thwomp(-2, 0, -122);
      B.thwomp(2.5, 0, -128.5);
      B.enemy('walker', 3, 0, -119);
      B.enemy('walker', -3, 0, -132);
      // 寶石 2：彈簧跳上浮空台
      B.box(8.5, 0, -125, 2.5, 2.5, 4, 'stone');
      B.spring(8.5, 0, -125, 28);
      B.box(8.5, 9, -131, 2.5, 2.5, 1, 'stone');
      B.gem(8.5, 9, -131);
      B.qblock(0, 3.9, -133, 'heart');
      B.checkpoint(0, 0, -134);
      // 魔王競技場
      B.ground(0, -135, -147, 4, 0, 'stone');
      B.cyl(0, 0, -160, 14, 'stone', 4);
      B.boss(0, 0, -167, 0, -160, 14);
      B.bigStar(0, 2.5, -160);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        B.deco('torch', Math.cos(a) * 13, 0, -160 + Math.sin(a) * 13);
      }
      B.deco('pillar', -12, -2, -30, 1.2); B.deco('pillar', 12, -2, -60, 1.2); B.deco('pillar', -12, -2, -100, 1.2);
      B.deco('pillar', 16, -2, -126, 1.4); B.deco('pillar', -21, -2, -182, 1.6); B.deco('pillar', 21, -2, -184, 1.6);
    },
  },
];
