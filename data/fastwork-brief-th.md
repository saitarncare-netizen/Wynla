# Brief งานป้อนข้อมูล Trail Breakdown ของลานสกีในสหรัฐอเมริกา

## ภาพรวมงาน

ค้นหาและกรอกข้อมูลจํานวน Trail (เส้นทางสกี) แยกตามระดับความยาก สําหรับลานสกี **346 แห่งในสหรัฐ** ลงในไฟล์ CSV ที่เตรียมไว้

ข้อมูลนี้จะถูกใช้บนเว็บแอปจริง คุณภาพจึงสําคัญที่สุด — **ให้ NULL (ปล่อยว่าง) ดีกว่าเดา**

## ข้อมูลที่ต้องการ — 5 ตัวเลขต่อลานสกี

| Column | ความหมาย | ตัวอย่าง |
|--------|---------|---------|
| `verified_beginner` | จํานวนเส้นทางระดับ **Beginner** (วงกลมเขียว 🟢) | 18 |
| `verified_intermediate` | จํานวนเส้นทางระดับ **Intermediate** (สี่เหลี่ยมฟ้า 🟦) | 56 |
| `verified_advanced` | จํานวนเส้นทางระดับ **Advanced / Single Black Diamond** (◆ ดําเดี่ยว) | 73 |
| `verified_expert` | จํานวนเส้นทางระดับ **Expert / Double Black Diamond** (◆◆ ดําคู่) | 38 |
| `verified_terrain_park_count` | จํานวน Terrain Park (สวนเทรนแฮก, จะเป็น 0 1 2 3...) | 3 |

## แหล่งข้อมูลที่แนะนํา (ตามลําดับความน่าเชื่อถือ)

1. **เว็บลานสกีอย่างเป็นทางการ** (column `website_url` ใน CSV)
   - หาเพจชื่อ "About", "The Mountain", "Stats", "Trails", "By the Numbers"
   - ตัวอย่าง: vail.com/the-mountain หรือ killington.com/stats
2. **Wikipedia ภาษาอังกฤษ** — `https://en.wikipedia.org/wiki/<ชื่อลานสกี>`
   - ดูที่ "Infobox ski area" sidebar ขวา จะมี field `Trails`, `Easiest run`, `Hardest run`, `Terrain parks`
3. **OnTheSnow.com / SkiCentral / Ski Resort Info** — แต่อย่าเชื่อ 100% ใช้ cross-check

## กฎเหล็ก — ทํา / ไม่ทํา

### ✅ ทํา
- กรอก `verified_source_url` = URL ที่ใช้อ้างอิง (ต้องมีทุกแถวที่กรอกข้อมูล)
- ถ้าหา 2 แหล่งตรงกัน → ดีมาก กรอกได้เต็มความมั่นใจ
- ถ้าลานสกีบอกแค่ "easy/medium/hard" 3 ระดับ → กรอก beginner / intermediate / advanced **ปล่อย expert ว่าง** + เขียนใน `freelancer_notes` ว่า "3-tier resort, no expert column"
- ถ้าลานสกีรวม single+double black เป็นคํา ๆ เดียว → กรอกใน `verified_advanced` ปล่อย `verified_expert` ว่าง + note "single+double black combined"

### ❌ ห้ามทํา
- **ห้ามเดา** ถ้าหาไม่เจอตัวเลขที่ชัดเจน → ปล่อยว่าง + เขียน notes ว่า "no public data"
- **ห้ามคูณ %** ถ้าไม่รู้ total เช่น "30% beginner of 100" = 30 (OK ถ้ารู้ทั้ง %), แต่ "30% beginner" เฉย ๆ = ห้ามใส่
- **ห้ามใส่ 0** ถ้าหาข้อมูลไม่เจอ (0 หมายถึงลานสกีนั้นไม่มี trail ระดับนั้นจริง ๆ — หายาก เช่น Aspen Highlands ไม่มี beginner)
- **ห้ามใช้ AI ChatGPT/Claude เดาให้** เพราะ AI เคยลองแล้ว ผิดเยอะ ต้องคนตรวจจริง

### 💡 Tip ประหยัดเวลา
- 145 แถวมี **agent leads** อยู่แล้วในคอลัมน์ `agent_guess_*` — แค่เปรียบเทียบกับเว็บจริงว่าตรงไหม → ถ้าตรงก็ copy ไปใส่ `verified_*` (เร็วกว่าค้นใหม่)
- 201 แถวที่เหลือคอลัมน์ leads ว่าง → ต้องค้นเอง

## Format ตอบกลับ

ส่งไฟล์ CSV ที่กรอกครบกลับมา **ห้ามแก้ column ใดๆ ใน CSV** ห้ามเปลี่ยนชื่อ slug ห้ามลบแถว — แค่กรอกในคอลัมน์ `verified_*` กับ `verified_source_url` กับ `freelancer_notes`

## ขอบเขตงาน + ราคา

- **346 แถว** (resorts ลานสกี)
- คาดว่ากรอกได้จริง ~150-250 (ที่เหลือเป็นลานเล็ก ๆ ไม่มีข้อมูลออนไลน์ — ปล่อยว่าง + note "no public data" ก็ได้)
- เวลาทํางาน: ~15-25 ชั่วโมง
- ค่าจ้าง: เสนอราคามาได้

## เกณฑ์การจ่ายเงิน

จะสุ่มตรวจ 10% ของแถวที่กรอกข้อมูล โดยเช็คกับ source URL ว่าตรงจริงไหม:
- ถ้า ≥ 95% ตรง → จ่ายเต็ม
- ถ้า 80-94% ตรง → จ่าย 80%
- ถ้า < 80% ตรง → ขอแก้ก่อน

## ไฟล์ที่ส่งให้ (1 ไฟล์)

- `fastwork-trail-data-input.csv` — 346 แถว เปิดด้วย Excel หรือ Google Sheets ก็ได้

## คําถามก่อนเริ่ม?

ถามได้เลยครับ — ถามดีกว่าเดาผิด
