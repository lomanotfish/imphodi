/**
 * ฐานข้อมูลเมนูอาหาร
 *
 * ตัวเลขเป็น "ค่าประมาณ" ของหนึ่งหน่วยเสิร์ฟตามที่ระบุใน serving
 * ร้านแต่ละร้านต่างกันได้มาก ใช้เป็นแนวทางคร่าว ๆ เท่านั้น
 *
 * kcal ของทุกเมนูคำนวณจากมาโครด้วยสูตร 4/4/9 (โปรตีน/คาร์บ/ไขมัน)
 * จึงไม่มีเมนูไหนที่ตัวเลขขัดกันเอง — มีเทสต์บังคับไว้ใน tests/foods.test.ts
 */

export type FoodCategory =
  | "onePlate"
  | "noodle"
  | "dish"
  | "rice"
  | "clean"
  | "snack"
  | "sweet"
  | "drink"
  | "fruit";

export interface Food {
  id: string;
  name: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  category: FoodCategory;
}

export const FOOD_CATEGORIES: { key: FoodCategory; label: string }[] = [
  { key: "onePlate", label: "จานเดียว" },
  { key: "noodle", label: "เส้น" },
  { key: "dish", label: "กับข้าว" },
  { key: "rice", label: "ข้าว/แป้ง" },
  { key: "clean", label: "คลีน" },
  { key: "snack", label: "ของว่าง" },
  { key: "sweet", label: "ของหวาน" },
  { key: "drink", label: "เครื่องดื่ม" },
  { key: "fruit", label: "ผลไม้" },
];

export const FOODS: Food[] = [
  // ------------------------------------------------------------ จานเดียว
  { id: "khao-man-kai", name: "ข้าวมันไก่", serving: "1 จาน", protein: 30, carbs: 80, fat: 20, kcal: 620, category: "onePlate" },
  { id: "khao-kha-moo", name: "ข้าวขาหมู", serving: "1 จาน", protein: 28, carbs: 85, fat: 24, kcal: 668, category: "onePlate" },
  { id: "khao-moo-krob", name: "ข้าวหมูกรอบ", serving: "1 จาน", protein: 26, carbs: 82, fat: 32, kcal: 720, category: "onePlate" },
  { id: "khao-moo-daeng", name: "ข้าวหมูแดง", serving: "1 จาน", protein: 25, carbs: 85, fat: 14, kcal: 566, category: "onePlate" },
  { id: "khao-pad-goong", name: "ข้าวผัดกุ้ง", serving: "1 จาน", protein: 22, carbs: 78, fat: 16, kcal: 544, category: "onePlate" },
  { id: "pad-thai", name: "ผัดไทย", serving: "1 จาน", protein: 18, carbs: 80, fat: 18, kcal: 554, category: "onePlate" },
  { id: "khao-kaprao-moo-kai-dao", name: "ข้าวกะเพราหมูสับ ไข่ดาว", serving: "1 จาน", protein: 30, carbs: 80, fat: 26, kcal: 674, category: "onePlate" },
  { id: "khao-kaprao-kai", name: "ข้าวกะเพราไก่", serving: "1 จาน", protein: 28, carbs: 78, fat: 16, kcal: 568, category: "onePlate" },
  { id: "khao-kai-jeaw", name: "ข้าวไข่เจียว", serving: "1 จาน", protein: 16, carbs: 78, fat: 22, kcal: 574, category: "onePlate" },
  { id: "khao-kluk-kapi", name: "ข้าวคลุกกะปิ", serving: "1 จาน", protein: 18, carbs: 85, fat: 18, kcal: 574, category: "onePlate" },
  { id: "khao-mok-kai", name: "ข้าวหมกไก่", serving: "1 จาน", protein: 26, carbs: 82, fat: 20, kcal: 612, category: "onePlate" },
  { id: "khao-pad-american", name: "ข้าวผัดอเมริกัน", serving: "1 จาน", protein: 24, carbs: 90, fat: 38, kcal: 798, category: "onePlate" },
  { id: "khao-niao-kai-tod", name: "ข้าวเหนียวไก่ทอด", serving: "1 ชุด", protein: 28, carbs: 78, fat: 24, kcal: 640, category: "onePlate" },

  // ----------------------------------------------------------------- เส้น
  { id: "kuay-teow-nam-sai", name: "ก๋วยเตี๋ยวน้ำใสหมู", serving: "1 ชาม", protein: 20, carbs: 48, fat: 8, kcal: 344, category: "noodle" },
  { id: "kuay-teow-tom-yum", name: "ก๋วยเตี๋ยวต้มยำ", serving: "1 ชาม", protein: 22, carbs: 60, fat: 12, kcal: 436, category: "noodle" },
  { id: "yen-ta-fo", name: "เย็นตาโฟ", serving: "1 ชาม", protein: 20, carbs: 58, fat: 10, kcal: 402, category: "noodle" },
  { id: "kuay-teow-nua-tun", name: "ก๋วยเตี๋ยวเนื้อตุ๋น", serving: "1 ชาม", protein: 26, carbs: 50, fat: 12, kcal: 412, category: "noodle" },
  { id: "rad-na", name: "ราดหน้าหมู", serving: "1 จาน", protein: 20, carbs: 70, fat: 16, kcal: 504, category: "noodle" },
  { id: "pad-see-ew", name: "ผัดซีอิ๊ว", serving: "1 จาน", protein: 18, carbs: 76, fat: 20, kcal: 556, category: "noodle" },
  { id: "bamee-moo-daeng", name: "บะหมี่หมูแดง", serving: "1 ชาม", protein: 22, carbs: 56, fat: 10, kcal: 402, category: "noodle" },
  { id: "kanom-jeen-nam-ya", name: "ขนมจีนน้ำยา", serving: "1 จาน", protein: 16, carbs: 62, fat: 12, kcal: 420, category: "noodle" },
  { id: "suki-nam", name: "สุกี้น้ำรวม", serving: "1 จาน", protein: 26, carbs: 30, fat: 8, kcal: 296, category: "noodle" },
  { id: "mama-tom", name: "มาม่าต้ม", serving: "1 ซอง", protein: 8, carbs: 52, fat: 13, kcal: 357, category: "noodle" },
  { id: "spaghetti-kee-mao", name: "สปาเกตตี้ขี้เมา", serving: "1 จาน", protein: 22, carbs: 76, fat: 16, kcal: 536, category: "noodle" },
  { id: "kuay-teow-ruea", name: "ก๋วยเตี๋ยวเรือ", serving: "1 ชาม", protein: 22, carbs: 52, fat: 10, kcal: 386, category: "noodle" },

  // ------------------------------------------------------------- กับข้าว
  { id: "tom-yum-goong", name: "ต้มยำกุ้ง", serving: "1 ถ้วย", protein: 18, carbs: 8, fat: 4, kcal: 140, category: "dish" },
  { id: "kaeng-kiao-wan-kai", name: "แกงเขียวหวานไก่", serving: "1 ถ้วย", protein: 18, carbs: 12, fat: 14, kcal: 246, category: "dish" },
  { id: "kaeng-som", name: "แกงส้มผักรวม", serving: "1 ถ้วย", protein: 12, carbs: 10, fat: 3, kcal: 115, category: "dish" },
  { id: "tom-kha-kai", name: "ต้มข่าไก่", serving: "1 ถ้วย", protein: 16, carbs: 10, fat: 20, kcal: 284, category: "dish" },
  { id: "pad-pak-bung", name: "ผัดผักบุ้งไฟแดง", serving: "1 จาน", protein: 4, carbs: 10, fat: 9, kcal: 137, category: "dish" },
  { id: "pad-kaprao-moo", name: "ผัดกะเพราหมูสับ", serving: "1 จาน", protein: 20, carbs: 8, fat: 16, kcal: 256, category: "dish" },
  { id: "kai-jeaw", name: "ไข่เจียว", serving: "1 ฟอง", protein: 8, carbs: 1, fat: 16, kcal: 180, category: "dish" },
  { id: "kai-dao", name: "ไข่ดาว", serving: "1 ฟอง", protein: 7, carbs: 1, fat: 8, kcal: 104, category: "dish" },
  { id: "kai-tom", name: "ไข่ต้ม", serving: "1 ฟอง", protein: 6, carbs: 0.5, fat: 5, kcal: 71, category: "dish" },
  { id: "som-tum-thai", name: "ส้มตำไทย", serving: "1 จาน", protein: 4, carbs: 22, fat: 2, kcal: 122, category: "dish" },
  { id: "som-tum-pla-ra", name: "ส้มตำปูปลาร้า", serving: "1 จาน", protein: 8, carbs: 20, fat: 4, kcal: 148, category: "dish" },
  { id: "laab-moo", name: "ลาบหมู", serving: "1 จาน", protein: 22, carbs: 8, fat: 12, kcal: 228, category: "dish" },
  { id: "nam-tok-moo", name: "น้ำตกหมู", serving: "1 จาน", protein: 24, carbs: 8, fat: 14, kcal: 254, category: "dish" },
  { id: "yum-woon-sen", name: "ยำวุ้นเส้น", serving: "1 จาน", protein: 14, carbs: 26, fat: 5, kcal: 205, category: "dish" },
  { id: "kai-yang", name: "ไก่ย่าง", serving: "1/4 ตัว", protein: 30, carbs: 2, fat: 14, kcal: 254, category: "dish" },
  { id: "pla-too-tod", name: "ปลาทูทอด", serving: "1 ตัว", protein: 18, carbs: 0, fat: 10, kcal: 162, category: "dish" },
  { id: "pla-neung-manao", name: "ปลานึ่งมะนาว", serving: "1 จาน", protein: 32, carbs: 6, fat: 5, kcal: 197, category: "dish" },
  { id: "moo-ping", name: "หมูปิ้ง", serving: "1 ไม้", protein: 7, carbs: 5, fat: 5, kcal: 93, category: "dish" },
  { id: "look-chin-ping", name: "ลูกชิ้นปิ้ง", serving: "1 ไม้", protein: 6, carbs: 12, fat: 3, kcal: 99, category: "dish" },
  { id: "kaeng-jeud-taohu", name: "แกงจืดเต้าหู้หมูสับ", serving: "1 ถ้วย", protein: 12, carbs: 6, fat: 6, kcal: 126, category: "dish" },
  { id: "pad-prik-kaeng-moo", name: "ผัดพริกแกงหมู", serving: "1 จาน", protein: 18, carbs: 9, fat: 15, kcal: 243, category: "dish" },
  { id: "moo-sam-chan-yang", name: "หมูสามชั้นย่าง", serving: "100 ก.", protein: 18, carbs: 0, fat: 34, kcal: 378, category: "dish" },

  // ----------------------------------------------------------- ข้าว/แป้ง
  { id: "khao-suay-1", name: "ข้าวสวย", serving: "1 ทัพพี", protein: 1.5, carbs: 17, fat: 0.2, kcal: 76, category: "rice" },
  { id: "khao-suay-plate", name: "ข้าวสวย", serving: "1 จาน (2 ทัพพี)", protein: 3, carbs: 34, fat: 0.4, kcal: 152, category: "rice" },
  { id: "khao-niao", name: "ข้าวเหนียว", serving: "1 ห่อ", protein: 4, carbs: 45, fat: 0.5, kcal: 200, category: "rice" },
  { id: "khao-klong", name: "ข้าวกล้อง", serving: "1 ทัพพี", protein: 2, carbs: 17, fat: 0.6, kcal: 81, category: "rice" },
  { id: "toast-butter", name: "ขนมปังปิ้งเนย", serving: "1 แผ่น", protein: 5, carbs: 26, fat: 9, kcal: 205, category: "rice" },

  // ---------------------------------------------------------------- คลีน
  { id: "chicken-breast", name: "อกไก่ย่าง", serving: "100 ก.", protein: 31, carbs: 0, fat: 3.6, kcal: 156, category: "clean" },
  { id: "egg-white-3", name: "ไข่ขาวต้ม", serving: "3 ฟอง", protein: 11, carbs: 1, fat: 0.2, kcal: 50, category: "clean" },
  { id: "tofu-white", name: "เต้าหู้ขาว", serving: "100 ก.", protein: 8, carbs: 2, fat: 4.8, kcal: 83, category: "clean" },
  { id: "goong-pao", name: "กุ้งเผา", serving: "100 ก.", protein: 20, carbs: 1, fat: 1, kcal: 93, category: "clean" },
  { id: "salad-clear", name: "สลัดผักน้ำใส", serving: "1 จาน", protein: 5, carbs: 14, fat: 3, kcal: 103, category: "clean" },
  { id: "salad-chicken", name: "สลัดอกไก่", serving: "1 จาน", protein: 28, carbs: 12, fat: 8, kcal: 232, category: "clean" },
  { id: "salmon-grilled", name: "แซลมอนย่าง", serving: "100 ก.", protein: 22, carbs: 0, fat: 13, kcal: 205, category: "clean" },

  // ------------------------------------------------------------- ของว่าง
  { id: "french-fries", name: "เฟรนช์ฟรายส์", serving: "1 ที่", protein: 4, carbs: 42, fat: 16, kcal: 328, category: "snack" },
  { id: "fried-chicken", name: "ไก่ทอด", serving: "1 ชิ้น", protein: 22, carbs: 9, fat: 18, kcal: 286, category: "snack" },
  { id: "burger", name: "เบอร์เกอร์", serving: "1 ชิ้น", protein: 25, carbs: 40, fat: 28, kcal: 512, category: "snack" },
  { id: "pizza-slice", name: "พิซซ่า", serving: "1 ชิ้น", protein: 12, carbs: 30, fat: 11, kcal: 267, category: "snack" },
  { id: "donut", name: "โดนัทเคลือบ", serving: "1 ชิ้น", protein: 4, carbs: 31, fat: 13, kcal: 257, category: "snack" },
  { id: "croissant", name: "ครัวซองต์", serving: "1 ชิ้น", protein: 6, carbs: 30, fat: 14, kcal: 270, category: "snack" },
  { id: "potato-chips", name: "มันฝรั่งทอดกรอบ", serving: "1 ถุงเล็ก", protein: 2, carbs: 15, fat: 10, kcal: 158, category: "snack" },

  // ------------------------------------------------------------ ของหวาน
  { id: "mango-sticky-rice", name: "ข้าวเหนียวมะม่วง", serving: "1 จาน", protein: 6, carbs: 88, fat: 12, kcal: 484, category: "sweet" },
  { id: "bua-loy", name: "บัวลอยน้ำกะทิ", serving: "1 ถ้วย", protein: 4, carbs: 42, fat: 9, kcal: 265, category: "sweet" },
  { id: "tubtim-krob", name: "ทับทิมกรอบ", serving: "1 ถ้วย", protein: 2, carbs: 44, fat: 7, kcal: 247, category: "sweet" },
  { id: "ice-cream", name: "ไอศกรีม", serving: "1 สกู๊ป", protein: 2, carbs: 17, fat: 7, kcal: 139, category: "sweet" },
  { id: "chocolate-cake", name: "เค้กช็อกโกแลต", serving: "1 ชิ้น", protein: 5, carbs: 48, fat: 16, kcal: 356, category: "sweet" },
  { id: "lod-chong", name: "ลอดช่องน้ำกะทิ", serving: "1 ถ้วย", protein: 2, carbs: 38, fat: 8, kcal: 232, category: "sweet" },

  // --------------------------------------------------------- เครื่องดื่ม
  { id: "water", name: "น้ำเปล่า", serving: "1 แก้ว", protein: 0, carbs: 0, fat: 0, kcal: 0, category: "drink" },
  { id: "americano", name: "อเมริกาโน่ไม่หวาน", serving: "1 แก้ว", protein: 0.3, carbs: 1, fat: 0, kcal: 5, category: "drink" },
  { id: "green-tea-unsweet", name: "ชาเขียวไม่หวาน", serving: "1 แก้ว", protein: 0, carbs: 0.5, fat: 0, kcal: 2, category: "drink" },
  { id: "cha-thai-yen", name: "ชาไทยเย็น", serving: "1 แก้ว", protein: 3, carbs: 40, fat: 8, kcal: 244, category: "drink" },
  { id: "coffee-yen", name: "กาแฟเย็น", serving: "1 แก้ว", protein: 3, carbs: 34, fat: 8, kcal: 220, category: "drink" },
  { id: "bubble-tea", name: "ชานมไข่มุก", serving: "1 แก้ว", protein: 4, carbs: 62, fat: 9, kcal: 345, category: "drink" },
  { id: "milk-plain", name: "นมจืด", serving: "200 มล.", protein: 7, carbs: 10, fat: 8, kcal: 140, category: "drink" },
  { id: "soy-milk", name: "นมถั่วเหลือง", serving: "1 กล่อง", protein: 5, carbs: 18, fat: 4, kcal: 128, category: "drink" },
  { id: "soda", name: "น้ำอัดลม", serving: "1 กระป๋อง", protein: 0, carbs: 35, fat: 0, kcal: 140, category: "drink" },
  { id: "orange-juice", name: "น้ำส้มคั้น", serving: "1 แก้ว", protein: 1, carbs: 26, fat: 0.3, kcal: 111, category: "drink" },
  { id: "ovaltine", name: "โอวัลติน", serving: "1 แก้ว", protein: 6, carbs: 28, fat: 5, kcal: 181, category: "drink" },

  // -------------------------------------------------------------- ผลไม้
  { id: "banana", name: "กล้วยหอม", serving: "1 ผล", protein: 1.3, carbs: 27, fat: 0.4, kcal: 117, category: "fruit" },
  { id: "apple", name: "แอปเปิล", serving: "1 ผล", protein: 0.5, carbs: 25, fat: 0.3, kcal: 105, category: "fruit" },
  { id: "orange", name: "ส้ม", serving: "1 ผล", protein: 1, carbs: 15, fat: 0.2, kcal: 66, category: "fruit" },
  { id: "watermelon", name: "แตงโม", serving: "1 ถ้วย", protein: 1, carbs: 11, fat: 0.2, kcal: 50, category: "fruit" },
  { id: "papaya", name: "มะละกอสุก", serving: "1 ถ้วย", protein: 0.6, carbs: 14, fat: 0.2, kcal: 60, category: "fruit" },
  { id: "guava", name: "ฝรั่ง", serving: "1 ผล", protein: 2.6, carbs: 24, fat: 1, kcal: 115, category: "fruit" },
  { id: "pineapple", name: "สับปะรด", serving: "1 ถ้วย", protein: 0.9, carbs: 22, fat: 0.2, kcal: 93, category: "fruit" },
  { id: "grapes", name: "องุ่น", serving: "1 ถ้วย", protein: 1, carbs: 27, fat: 0.3, kcal: 115, category: "fruit" },
  { id: "mango-ripe", name: "มะม่วงสุก", serving: "1 ผล", protein: 1.4, carbs: 50, fat: 0.6, kcal: 211, category: "fruit" },
  { id: "durian", name: "ทุเรียนหมอนทอง", serving: "2 เม็ด", protein: 3, carbs: 40, fat: 10, kcal: 262, category: "fruit" },
  { id: "pomelo", name: "ส้มโอ", serving: "1 ถ้วย", protein: 1, carbs: 18, fat: 0.1, kcal: 77, category: "fruit" },
];

const BY_ID = new Map(FOODS.map((food) => [food.id, food]));

export function findFood(id: string): Food | undefined {
  return BY_ID.get(id);
}

export function categoryLabel(key: FoodCategory): string {
  return FOOD_CATEGORIES.find((item) => item.key === key)?.label ?? key;
}

/** ค้นหาแบบง่าย ๆ ตามชื่อเมนู กรองหมวดได้ด้วย */
export function searchFoods(query: string, category: FoodCategory | "all") {
  const needle = query.trim().toLowerCase();

  return FOODS.filter((food) => {
    if (category !== "all" && food.category !== category) return false;
    if (!needle) return true;
    return food.name.toLowerCase().includes(needle);
  });
}
