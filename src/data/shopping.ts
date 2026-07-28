export type ShoppingItem = {
  name: string;
  price: string;
  category: string;
  source: "Olive Young" | "韓國藥局";
  imageUrl?: string;
};

const rows = (source: ShoppingItem["source"], data: string[][]): ShoppingItem[] =>
  data.map(([name, price, category, imageUrl]) => ({ name: name!, price: price!, category: category!, source, imageUrl }));

export const shoppingItems: ShoppingItem[] = [
  ...rows("Olive Young", [
    ["Beauty of Joseon 朝鮮美女防曬霜", "₩18,000", "防曬", "https://beautyofjoseon.com/cdn/shop/files/relief-sunscreen-1-front.webp?v=1770603160"],
    ["ROUND LAB 獨島白樺樹保濕防曬霜", "₩17,500～₩20,000", "防曬", "https://media6.ppl-media.com/tr:h-750,w-750,c-at_max,dpr-2,q-40/static/img/product/400688/round-lab-birch-juice-moisturizing-sunscreen-50ml-korean-skin-care_5_display_1707200115_e9315770.jpg"],
    ["S.NATURE 水庫角鯊烷保濕霜", "₩9,000～₩30,000", "面霜", "https://koreacosmeticsbn.com/cdn/shop/files/S-NATURE-Aqua-Squalane-Moisturizing-Cream-80ml-680x920.png?v=1737531268&width=1946"],
    ["Narka 控油髮根睫毛膏", "₩18,000～₩25,000", "髮用控油", "https://media.ulta.com/i/ulta/2655178?w=600&h=600&fmt=auto"],
    ["SKIN1004 積雪草安瓶", "₩12,000～₩15,000", "精華", "https://skincareshop.com.bd/wp-content/uploads/2024/04/SKIN1004-Madagascar-Centella-Ampoule-100ml.jpg"],
    ["BIOHEAL BOH 膠原益生菌面膜", "₩22,000～₩28,000", "面膜", "https://www.eyurs.com/cdn/shop/files/bioheal-boh-probioderm-collagen-remodeling-serum-gel-mask-front-side-of-product_1800x1800.jpg?v=1749072883"],
    ["Longtake 黑茶無花果護髮油", "₩20,000～₩25,000", "髮油", "https://holiholic.com/cdn/shop/files/Longtake_Blacktea_Fig_Softening_Hair_Oil-Holiholic_grande.png?v=1732204083"],
    ["SUNGBOON EDITOR 綠番茄 NMN 毛孔安瓶", "₩25,000～₩30,000", "精華", "https://static.wixstatic.com/media/2e5257_fcb351947d2d41c088b24d2811f9c25c~mv2.jpg/v1/fill/w_776,h_814,al_c,q_85,enc_avif,quality_auto/2e5257_fcb351947d2d41c088b24d2811f9c25c~mv2.jpg"],
    ["óngredients 舒緩屏障乳液", "₩15,000～₩20,000", "乳液", "https://i5.walmartimages.com/seo/ONGREDIENTS-Skin-Barrier-Calming-Lotion-220ml-7-43-fl-oz_1d2a14ca-8a30-4ffd-92f6-b840df06f81a.4eaf8487ec9aa00c3d945350109da517.jpeg"],
    ["medicube PDRN 粉胜肽精華", "₩28,000～₩35,000", "精華", "https://m.media-amazon.com/images/I/61OewnOw5jL._SL1500_.jpg"],
    ["numbuzin 紐姆真面膜系列", "₩2,000～₩3,500／片", "面膜", "https://down-ph.img.susercontent.com/file/sg-11134207-7rdyg-lxte4ami9s4f3c"],
    ["MARSHIQUE 皺紋修護貼片", "₩20,000～₩28,000", "功能性貼片", "https://www.pinkland.co.nz/wp-content/uploads/2023/11/msq001-1.jpg"],
    ["Round Lab 獨島面膜系列", "₩2,000～₩3,500／片", "面膜", "https://roundlab.com/cdn/shop/files/1025-dokdo-water-gel-mask-sheet-round-lab-1_2048x2048.jpg?v=1687196744"],
    ["d’Alba 白松露滋養面膜", "₩3,000～₩4,500／片", "面膜", "https://cdn.chanhtuoi.com/uploads/23/06/dalba-white-truffle-nourishing-treatment-mask_front_photo_original.jpeg.webp"],
    ["UNOVE 水感護髮噴霧", "₩15,000～₩20,000", "髮用噴霧", "https://luxiface.com/cdn/shop/files/unove-water-essence-mist-200ml_1800x1800.png?v=1710577655"],
    ["Goodal 青柑橘淡斑化妝棉", "₩18,000～₩22,000", "化妝棉", "https://glowstation.com/wp-content/uploads/GOODAL-Green-Tangerine-Vita-C-Dark-Spot-Care-Pad-88099375909.jpg"],
    ["FILLY 綠番茄泥膜潔面", "₩12,000～₩18,000", "洗面乳／泥膜", "https://skincarebd.com/wp-content/uploads/2024/12/FUC01-PC.jpg"],
    ["Lilybyred 星光眼線膠筆", "₩8,000～₩12,000", "彩妝", "https://cosmenet-private.s3-bkk.nipa.cloud/upload/Maker/product-info/lilybyred/lilybyred_starryeyesam9topm9slimgeleyeliner_01.jpg"],
    ["Biodance 水潤修護面膜", "₩68,000", "面膜", "https://www.wcosmetics.com.au/cdn/shop/files/WXWorkCapture_17254566261422.png?v=1725456641"],
    ["innisfree 維C潤色防曬霜", "₩15,000～₩20,000", "防曬", "https://soonsubeauty.com/cdn/shop/files/169319132230045_427470827.jpg?v=1775329840"],
    ["Goodal 青柑橘淡斑精華", "₩25,000～₩30,000", "精華", "https://cosmeticholic.pk/cdn/shop/files/goodal-green-tangerine-vita-c-dark-spot-care-serum-cosmetic-holic-2.jpg?v=1710975236&width=1090"],
    ["SO.NATURAL FIXX 定妝噴霧", "₩15,000～₩20,000", "彩妝噴霧", "https://down-sg.img.susercontent.com/file/sg-11134207-7rbkl-ln6paqpjdxdhf6"],
    ["No.3 奇蹟酵母棉片", "₩20,000～₩25,000", "化妝棉", "https://glowstation.com/wp-content/uploads/NUMBUZIN-No.3-Radiance-Glowing-Jumbo-Essence-Pad-150ml-70-Pads-8809652580982.jpg"],
    ["JUNG SAEM MOOL 三合一定妝保濕噴霧", "₩25,000～₩30,000", "彩妝噴霧", "https://down-ph.img.susercontent.com/file/sg-11134207-7reoq-m2sv4953k5v171"]
  ]),
  ...rows("韓國藥局", [
    ["Rejuran 麗珠蘭水光針精華", "₩25,000～₩40,000", "醫美系精華", "https://m.media-amazon.com/images/I/61CHSTGKVeL._SL1500_.jpg"],
    ["Rejuyoung PDRN 10,000ppm 深層修護霜", "₩22,000～₩35,000", "修護面霜", "https://sthkbeauty.com/cdn/shop/files/rejuyoung-10000ppm-pdrn-30ml-7841380.webp?v=1777308189&width=1024"],
    ["Juvekle PDLLA 10000+ 修護乳", "₩28,000～₩40,000", "PDLLA 修護", "https://down-tw.img.susercontent.com/file/sg-11134208-82616-mj645yef1ptxbf"],
    ["Dr.Reju-All Advanced PDRN 修護霜", "₩25,000～₩38,000", "修護面霜", "https://cdn11.bigcommerce.com/s-hwo2s3k4l6/images/stencil/960w/products/809/5394/3__90030.1756647060.png?c=2"],
    ["Anua PDRN 玻尿酸膠囊100精華液", "₩20,000～₩32,000", "保濕精華", "https://accessoriestrend.co.ke/wp-content/uploads/2025/01/Anua-PDRN-Hyaluronic-Acid-Capsule-100-Serum-kenya.jpg"],
    ["medicube PDRN 粉紅胜肽膠原奇肌安瓶", "₩30,000～₩45,000", "抗老安瓶", "https://microless.com/cdn/products/a35221da37ab7d52df4e24eaa9c361b6-hi.jpg"],
    ["HeveBlue 鮭魚PDRN積雪草霜", "₩22,000～₩33,000", "舒緩乳霜", "https://m.media-amazon.com/images/I/614M-NxKV8L._AC_.jpg"],
    ["Primera PDRN-NIA10 提亮精華液", "₩28,000～₩42,000", "提亮精華", "https://soonsubeauty.com/cdn/shop/files/16074762479416491_431394097.jpg?v=1773162229"],
    ["VT PDRN 水光精華液 #100", "₩25,000～₩36,000", "水光精華", "https://coslovemetics.mk/wp-content/uploads/Vt-Cosmetics-PDRN-ESSENCE-100-30ml.jpg"],
    ["THE FACE SHOP PDRN玻尿酸7潤澤精華", "₩20,000～₩30,000", "平價精華", "https://incidecoder-content.storage.googleapis.com/70749f52-6db7-43d1-81ec-cf1b9b476741/products/the-face-shop-alltimate-pdrn-hyalu-7-serum/the-face-shop-alltimate-pdrn-hyalu-7-serum_front_photo_original.jpeg"],
    ["ISOI 亮白淡斑玫瑰精華", "₩30,000～₩45,000", "淡斑精華", "https://incidecoder-content.storage.googleapis.com/68d2ee93-6a37-40e6-8554-85d4dfd9500c/products/isoi-bulgarian-rose-blemish-care-up-serum/isoi-bulgarian-rose-blemish-care-up-serum_front_photo_original.jpeg"],
    ["BRING GREEN 藍豆B5-PDRN保濕乳霜", "₩18,000～₩28,000", "修護乳霜", "https://lacosmetique.com.au/cdn/shop/files/blue-bean-b5-pdrn-mild-cream-100ml-3522233.png?v=1779943270&width=1200"],
    ["Frankly PDRN 彈力球多效精華液", "₩25,000～₩38,000", "抗老精華", "https://befrankly.com/cdn/shop/files/PDRN____08.jpg?v=1750723974"],
    ["VDL 玫瑰PDRN妝前乳", "₩20,000～₩30,000", "妝前打底", "https://storage.skinsort.com/18wjhqeyfij3x6b06wvsrmvxnu5u"],
    ["Dear Dahlia PDRN BB霜", "₩28,000～₩40,000", "底妝", "https://www.odkshop.com/cdn/shop/files/TdYcrBSm5y_2048x.jpg?v=1755111702"],
    ["PONY EFFECT PDRN 養膚氣墊", "₩25,000～₩35,000", "氣墊粉餅", "https://img.pchome.com.tw/cs/items/DDBHB9A900JPHFN/000001_1777864578.jpg"],
    ["Newvein 消腫飲", "₩20,000～₩30,000", "保健飲品", "https://www.newvein.co.kr/images/drugstore_pkg.png"],
    ["I'M MEME 神力水光網紗氣墊", "₩18,000～₩28,000", "氣墊粉餅", "https://down-my.img.susercontent.com/file/sg-11134207-81zts-mn0ws682wnb4f7"],
    ["Losy Kim PDRN 潤色唇膏", "₩15,000～₩25,000", "唇膏", "https://down-my.img.susercontent.com/file/sg-11134207-821dk-mgjpzu1ko5573a"],
    ["Nuse 麗珠 Reju 水光唇釉", "₩15,000～₩22,000", "唇釉", "https://down-br.img.susercontent.com/file/sg-11134207-7rdvo-mchc80k2xmue32"],
    ["Make P:rem PDRN 毛孔潔淨卸妝乳", "₩20,000～₩30,000", "卸妝乳", "https://www.ballagrio.com/cdn/shop/files/1_37dc7e85-00fa-4cd0-8e7f-60237e260ced_1200x1200.jpg?v=1758009101"],
    ["REJURAN Healing／Soothing Mask", "₩25,000～₩35,000", "面膜", "https://skin-reboot.com/wp-content/uploads/2025/08/Rejuran-Recover-Soothing-Mask.jpg"],
    ["LACTO FIT 益生菌", "₩20,000～₩30,000", "保健食品", "https://down-ph.img.susercontent.com/file/sg-11134207-825ab-mg0rv9bntqtof7"],
    ["Beauty Collagen 100", "₩25,000～₩35,000", "美容保健", "https://web.tradekorea.com/product/867/2035867/LOW_MOLECULAR_COLLAGEN_C_2gx30p_2.jpg"],
    ["藥局 PDRN 精華", "₩28,000～₩40,000", "精華液", "https://media.ulta.com/i/ulta/77006313"],
    ["爆水面霜", "₩20,000～₩30,000", "面霜", "https://bestkoreanskincare.kr/cdn/shop/files/dalbaWhiteTruffleFirstSpraySerum_83dbe0a0-488a-4630-9cec-e3c5fb42c612.png?v=1704547975&width=1946"]
  ])
];
