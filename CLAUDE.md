@AGENTS.md

# อิ่มพอดี (Imphodi)

เว็บแอปคำนวณแคลอรี่และบันทึกมื้ออาหาร **หน้าเดียว** ภาษาไทย มินิมอลสามธีม
สมัครสมาชิกด้วยชื่อ + รหัสเท่านั้น ไม่ใช้อีเมล

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Bun · Tailwind v4 · motion · MongoDB

## คำสั่ง

```bash
bun dev            # http://localhost:3000
bun test           # เทสต์ทั้งชุด  (ไม่มี script ชื่อ test — `bun run test` จะพัง)
bun run verify     # lint + typecheck + เทสต์
bun run build
bun run db:setup   # สร้าง/อัปเดต collection + index + validator บน MongoDB
bun run db:parity  # ยิง MongoDB จริง เทียบพฤติกรรมกับ fileStore
```

`db:setup` และ `db:parity` รันด้วย **Node ไม่ใช่ Bun** เพราะ `bson` เรียก `node:v8`
`isBuildingSnapshot` ที่ Bun ยังไม่รองรับ — script ใน package.json จัดการให้แล้ว

## skill ที่มีให้ใช้

จับงานให้ตรง skill ก่อนลงมือแก้

| งาน | skill |
|---|---|
| เพิ่ม/แก้เมนูอาหาร | `food-catalog` |
| เพิ่ม/แก้ธีมสี หรือปัญหา contrast | `theme-add` |
| แก้โครงสร้างข้อมูล / ชั้นเก็บข้อมูล | `db-change` |

subagent: `api-security-reviewer` · `release-verifier` · `thai-ui-reviewer`

## สิ่งที่เดาจากชื่อไฟล์ไม่ได้

**ชั้นเก็บข้อมูลมีรอยต่อเดียว** ทุกคนเรียกผ่าน interface `DataStore` และ `getStore()`
เลือก `fileStore` หรือ `mongoStore` จาก `MONGODB_URI`
`src/lib/db/store.ts` เป็นไฟล์เดียวที่แตะ `node:fs` ได้

**ข้อความทุกตัวเป็นไทย** — UI, คอมเมนต์, JSDoc, README, ชื่อ `describe`/`test`
ตัวระบุกับชื่อไฟล์เป็นอังกฤษ ข้อความ error ถูก assert ตรงตัวในเทสต์ เปลี่ยนคำแล้วเทสต์ตก

**สีเป็นตัวแปร CSS ที่สลับตามธีม ไม่ใช่จานสีคงที่** บล็อก `[data-theme=…]` เก็บค่าดิบ
บล็อก `:root` ท้ายไฟล์เก็บค่าที่คำนวณจากค่าดิบ `@theme inline` ทำให้ `bg-brand-500`
วิ่งผ่าน var จึงสลับธีมได้โดยไม่ต้อง re-render — ห้ามใส่ `--brand-*` ไว้ที่ `:root` ท้ายไฟล์

**ธีมถูกหาใหม่ทุกคำขอ** `resolveTheme()`: cookie → ธีมในบัญชี → ค่าเริ่มต้น
ทั้ง `layout.tsx` และ `page.tsx` ต้องเรียกตัวเดียวกัน ไม่งั้นปุ่มสลับจะไฮไลต์ผิดสี

**เทสต์ที่แตะ server module** จะ mock `server-only` กับ `next/headers` (cookie jar เป็น Map)
แล้ว `process.chdir` ไปโฟลเดอร์ชั่วคราว **ก่อน** import โมดูล — ต้อง import แบบ dynamic
ใน `beforeAll` เพราะ `DATA_DIR` คิดจาก `process.cwd()` ตอนโหลดโมดูล
เทสต์ที่อ่านไฟล์ในโปรเจกต์ต้องอ้างจาก `import.meta.dir` ไม่ใช่ cwd

**kcal ของเมนูคำนวณจากมาโคร 4/4/9** และมีเทสต์บังคับ — เพิ่มเมนูคือคำนวณ ไม่ใช่เดา

**server ไม่เชื่อตัวเลขโภชนาการจาก client เลย** client ส่งแค่ `foodId` + `servings`
server คูณค่าจาก `findFood()` เอง แล้วถ่ายสำเนาชื่อ/ตัวเลขลงเอกสาร
แก้เมนูภายหลังจะไม่เขียนประวัติทับ

**สิทธิ์ derive จาก session ทุกครั้ง** ทุกฟังก์ชันใน food-log เรียก `getSessionKey()`
แล้วส่ง `userKey` เป็น argument แรกของทุก method ในชั้น store
และชั้น store กรอง `userKey` ซ้ำอีกชั้น — นี่คือด่านจริง ไม่ใช่ UI

**วันที่ตรึง Asia/Bangkok** ผ่าน `todayKey()` เพราะ server รัน UTC
ห้ามใช้ `new Date().toISOString().slice(0,10)`

**logic บริสุทธิ์แยกออกจาก I/O จริง ๆ** `calories.ts` กับ `totals.ts` เป็น pure
client import ได้ ส่วน `auth.ts` / `food-log.ts` / `theme-server.ts` / `db/store.ts`
ขึ้นต้นด้วย `import "server-only"` — `totals.ts` มีอยู่เพราะ client ต้องใช้ `sumTotals`
แต่ `food-log.ts` เป็น server-only

**`src/components/ui/*` เป็นซากของ shadcn ที่ไม่มีใครใช้** แอปเขียน control เอง
อย่า "แก้ให้ถูก" โดยเปลี่ยนไปใช้ `ui/Button`

**`getCurrentUser` ห่อด้วย React `cache()`** layout กับ page จึงอ่าน DB ครั้งเดียวต่อคำขอ

**`tsconfig.include` ครอบ `tests/`** `next build` จึง type-check เทสต์ด้วย
และต้องมี devDependency `@types/bun`

## กับดักที่เคยทำให้เกิดบั๊กจริง

1. **สระ/วรรณยุกต์ไทยเป็น `\p{M}` ไม่ใช่ `\p{L}`** regex ตรวจชื่อที่ลืม `\p{M}`
   ทำให้ชื่อไทยเกือบทั้งหมดสมัครไม่ได้
2. **ธีมเคยอ่านแค่ cookie** เปิดจากเครื่องใหม่จึงมองข้ามธีมที่บันทึกในบัญชี กลายเป็นชมพูหมด
3. **contrast พังสองรอบ** ปุ่ม disabled ขาวบนพาสเทล 1.3:1 · ปุ่มปกติขาวบนไล่สีสด 2.2:1
   → ปุ่มต้องเป็นพาสเทล + ตัวอักษรเข้ม และตอน disabled ต้องสลับสีตัวอักษรด้วย
4. **หลอดแคลอรี่เคยผูกกับ `revealed`** (state ของอีกแท็บ) ทำให้ตัวเลขขึ้นแต่หลอดค้างที่ 0
   → ต้องคิดจาก `budget` ที่ส่งเข้ามาเท่านั้น
5. **ชื่อผู้ใช้ `__proto__` / `constructor`** ชน `Object.prototype` ใน fileStore
   → register บอกชื่อซ้ำผิด ๆ และ login โยน TypeError เป็น 500 โดยไม่ต้องล็อกอิน
   → `Object.create(null)` + `Object.hasOwn`
6. **แก้จำนวนเสิร์ฟซ้ำ ๆ เคยทำให้ปัดเศษเพี้ยนทับถม** server คิดใหม่จากค่าต่อเสิร์ฟทุกครั้ง
   ส่วน reducer ฝั่ง client สเกลจากยอดเดิม จึงอาจต่างกันชั่วคราว — ฝั่ง server เป็นตัวจริง
7. **จำนวนที่ไม่ลงล็อกครึ่งหน่วยถูกปัด ไม่ใช่ปฏิเสธ** (0.25 → 0.5) เฉพาะที่ปัดแล้วต่ำกว่า 0.5
   จึงถูกปฏิเสธ
8. **กฎ React Compiler เป็น error ทุกข้อ** ห้าม mutate, ห้าม setState ใน effect,
   ห้าม `Date.now()`/`randomUUID()` ใน render body, ห้ามประกาศ component ซ้อน

## ที่ยังค้างอยู่

- `layout.tsx` ตั้ง `themeColor` เป็นค่าคงที่ สีแถบเบราว์เซอร์ไม่เปลี่ยนตามธีม
- `SERVINGS_LIMIT` ถูกเขียนซ้ำเป็นตัวเลขดิบใน `food-log.tsx` แทนที่จะ import จาก schema
- throttle การเดารหัสเก็บในหน่วยความจำของ process จึงข้ามได้เมื่อสเกลหลาย instance
- session เพิกถอนไม่ได้ — logout ลบแค่ cookie ตัว token ยังใช้ได้จนหมดอายุ 30 วัน
- ไม่มี rate limit บน endpoint ที่เขียนข้อมูล
