# Brief งานป้อนข้อมูล Difficulty Percentages ของลานสกีในสหรัฐอเมริกา

## ภาพรวมงาน

ค้นหาและกรอก **% เปอร์เซ็นต์เส้นทางสกี** แยกตามระดับความยาก สําหรับลานสกีประมาณ **300+ แห่งในสหรัฐ** ลงในไฟล์ CSV ที่เตรียมไว้ ข้อมูลจะถูกใช้บนเว็บแอปจริง คุณภาพสําคัญที่สุด — **ปล่อยว่าง (NULL) ดีกว่าเดา**

## ทําไมเป็น % ไม่ใช่จํานวน

- ลานสกีเขียน "18% beginner / 56% intermediate / 26% advanced" ในเว็บอย่างเป็นทางการ
- % verify ง่าย — ดูจาก marketing page ของเขาตรงๆ
- ไม่ต้องนับ trail (ซึ่งยากมาก trail ต่อกัน แตกแยก)
- 4 % ต้องบวกกัน ≈ 100 = sanity check ในตัว

## ข้อมูลที่ต้องการ — 4 % + 1 จํานวน

| Column | ความหมาย | ตัวอย่าง |
|--------|---------|---------|
| `verified_pct_beginner` | % beginner / easy / 🟢 | 18 |
| `verified_pct_intermediate` | % intermediate / 🟦 | 56 |
| `verified_pct_advanced` | % advanced / single black ◆ | 18 |
| `verified_pct_expert` | % expert / double black ◆◆ | 8 |
| `verified_terrain_park_count` | จํานวน Terrain Park (จะเป็น 0 1 2 3...) | 3 |

> ⚠️ **4 % ต้องบวกกัน 98-102** (ปัดเศษได้ ±2)
> ถ้าผลรวมไม่เข้า 98-102 = ตัวเลขผิด ต้องไปดูใหม่

## แหล่งข้อมูลที่แนะนํา (ตามลําดับความน่าเชื่อถือ)

### 1️⃣ เว็บลานสกีอย่างเป็นทางการ (column `website_url` ใน CSV)
หาเพจชื่อ:
- "About"
- "The Mountain"
- "Stats" / "Statistics"
- "Trails"
- "Fact Sheet" / "By the Numbers"

ตัวอย่าง — เว็บ Killington:
> "Difficulty: 21% Easier (Beginner) · 37% More Difficult (Intermediate) · 25% Most Difficult (Advanced) · 17% Expert"

→ กรอก: 21, 37, 25, 17 ทันที

### 2️⃣ Wikipedia ภาษาอังกฤษ
URL: `https://en.wikipedia.org/wiki/<ชื่อลานสกี>`
ดู "Infobox ski area" sidebar ด้านขวา จะมี field:
- `Easiest run / Easy run / Beginner` — มักเป็น %
- `Intermediate runs`
- `Hardest run / Advanced / Black`
- `Expert / Double black diamond`

ถ้า Wikipedia ใส่เป็น count (จํานวน) ไม่ใช่ % → ลองดู total trails แล้วคูณเอง:
- Wiki บอก: total 100 trails, 18 beginner, 56 intermediate, 18 advanced, 8 expert
- กรอก: 18, 56, 18, 8

### 3️⃣ OnTheSnow.com / SkiCentral / Liftopia
ใช้ **cross-check** ไม่ใช่หลัก ถ้า 2 แหล่งไม่ตรงกัน เลือกที่ official กว่า

## กฎเหล็ก

### ✅ ทํา
- กรอก `verified_source_url` = URL ที่ใช้อ้างอิง **(ต้องมีทุกแถวที่กรอก %)**
- ถ้า 2 แหล่งตรงกัน → ดี
- ถ้าลานสกีมีแค่ 3 ระดับ (easy/medium/hard) → กรอก beginner/intermediate/advanced ปล่อย expert ว่าง + เขียน notes "3-tier resort"
- ถ้าลานสกีรวม single+double black เป็นค่าเดียว → กรอกใน `verified_pct_advanced` ปล่อย `verified_pct_expert` ว่าง + note "single+double black combined"
- ถ้า %s รวมกันได้ 98-102 → OK
- ถ้า %s รวมกัน < 95 หรือ > 105 → กลับไปดูใหม่ มีบางอย่างผิด

### ❌ ห้ามทํา
- **ห้ามเดา** ถ้าหาไม่เจอตัวเลขที่ชัดเจน → ปล่อยว่าง + เขียน notes "no public data"
- **ห้ามใส่ 0** ถ้าหาข้อมูลไม่เจอ (0 หมายถึงลานสกีนั้นไม่มี trail ระดับนั้นจริงๆ)
- **ห้ามคิด %s ขึ้นมาเอง** ถ้าลานสกีไม่ระบุ
- **ห้ามใช้ AI ChatGPT/Claude เดาให้** — ต้องคนตรวจกับ source จริง

### 💡 Tips ประหยัดเวลา
- บางแถวมี **agent leads** อยู่แล้ว ในคอลัมน์ `agent_guess_*` ให้ลอง compare กับเว็บจริง ถ้าตรง = copy เลย (เร็วขึ้น)
- หาในเว็บ resort ก่อน ถ้าไม่มีค่อยไป Wikipedia
- บางลานสกีไม่ระบุ % ที่ไหนเลย → mark SKIP ใน notes ปล่อยว่าง — ไม่เสียคะแนน

## Format ตอบกลับ

ส่งไฟล์ CSV ที่กรอกครบกลับมา **ห้ามแก้ column ใดๆ** ห้ามเปลี่ยน slug ห้ามลบแถว — กรอกเฉพาะใน `verified_pct_*` กับ `verified_terrain_park_count` กับ `verified_source_url` กับ `freelancer_notes`

## ขอบเขตงาน + ราคา

- **300+ แถว** (resorts ลานสกี)
- คาดว่ากรอกได้จริง ~200 (ที่เหลือเป็นลานเล็กที่ไม่มีข้อมูลออนไลน์ — ปล่อยว่าง + note "no public data" ก็ได้)
- เวลาทํางาน: ~10-20 ชั่วโมง
- ค่าจ้าง: เสนอราคามาได้

## เกณฑ์การจ่ายเงิน + Quality Control

จะสุ่มตรวจ 10% ของแถวที่กรอกข้อมูล โดย:
- เปิด `verified_source_url` แล้วเช็ค %s ตรงไหม
- เช็ค 4 %s รวมกันได้ 98-102 ทุกแถวไหม

เกณฑ์:
- ≥ 95% ถูกต้อง → จ่ายเต็ม
- 80-94% → จ่าย 80% + ขอแก้
- < 80% → ขอแก้ทั้งหมดก่อน

## ไฟล์ที่ส่งให้

- `fastwork-trail-data-input.csv` — เปิดด้วย Excel หรือ Google Sheets

## คําถามก่อนเริ่ม?

ถามได้เลยครับ ถามดีกว่าเดาผิด
