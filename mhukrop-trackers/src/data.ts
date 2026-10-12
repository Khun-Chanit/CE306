import { Restaurant } from './types.js';

export const initialRestaurants: Restaurant[] = [
    {
        id: 1,
        name: "ก๋วยจั๊บมิสเตอร์โจ",
        zone: "ถนนจันทน์",
        address: "46 ซอยจันทน์ 44 แขวงวัดพระยาไกร เขตบางคอแหลม กรุงเทพฯ",
        rating: 4.8,
        crispness: 4.9,
        menu: "ก๋วยจั๊บหมูกรอบ / หมูกรอบเปล่าจิ้มซีอิ๊วดำ",
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop",
        badge: "Michelin Bib Gourmand",
        isClosed: false,
        reviews: [
            { reviewer: "สายกินถิ่นเจริญกรุง", rating: 5.0, crisp: 5.0, comment: "หนังกรอบเสียงดังสนั่นหู เนื้อนุ่มกำลังดี น้ำซุปเผ็ดพริกไทยเข้ากันที่สุด!" }
        ]
    },
    {
        id: 2,
        name: "ข้าวหมูแดงหมูกรอบนายไซ",
        zone: "ประชาชื่น",
        address: "ถนนประชาชื่น (ระหว่างซอย 33 และ 34) เขตบางซื่อ กรุงเทพฯ",
        rating: 4.6,
        crispness: 4.8,
        menu: "ชุดข้าวหมูกรอบคลาสสิก / ต้มมะระ / ต้มยำขาหมู",
        image: "https://images.unsplash.com/photo-1625938145744-e380515399b7?q=80&w=600&auto=format&fit=crop",
        badge: "ตำนานประชาชื่น",
        isClosed: false,
        reviews: [
            { reviewer: "กะเพราหมูกรอบ lover", rating: 4.5, crisp: 5.0, comment: "หนังกรอบฟูกำลังดี มันไม่เยอะเกินไป น้ำราดเข้มข้นกลมกล่อม" }
        ]
    },
    {
        id: 3,
        name: "ธานี ข้าวหมูแดง หมูกรอบ",
        zone: "พญาไท",
        address: "ใกล้พหลโยธินซอย 5 (ซอยราชครู) แขวงสามเสนใน เขตพญาไท กรุงเทพฯ",
        rating: 4.5,
        crispness: 4.7,
        menu: "ข้าวหมูกรอบธานี / หมูกรอบพริกเกลือจัดจ้าน",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop",
        badge: "เจ้าดังย่านอารีย์",
        isClosed: false,
        reviews: [
            { reviewer: "AreeEater", rating: 4.5, crisp: 4.5, comment: "หมูกรอบชิ้นหนาสมราคา ย่างมาหนังกรอบเคี้ยวเพลินมาก" }
        ]
    },
    {
        id: 4,
        name: "ข้าวหมูแดงสีมรกต",
        zone: "ตลาดน้อย",
        address: "80-82 ซอยสุกร 1 ถนนมิตรภาพไทย-จีน ตลาดน้อย สัมพันธวงศ์ กรุงเทพฯ",
        rating: 4.6,
        crispness: 4.6,
        menu: "ข้าวหมูกรอบกุนเชียงไข่ยางมะตอย",
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=600&auto=format&fit=crop",
        badge: "ตำนานซอยสุกร",
        isClosed: false,
        reviews: [
            { reviewer: "หมูกรอบสายหวาน", rating: 4.6, crisp: 4.5, comment: "น้ำราดหอมหวานเค็มลงตัว หมูกรอบย่างเตาถ่านหนังกรอบฟูมาก" }
        ]
    },
    {
        id: 5,
        name: "เจ๊โอว จุฬา (หมูกรอบเจ๊โอว)",
        zone: "ปทุมวัน",
        address: "113 ซอยจรัสเมือง แขวงรองเมือง เขตปทุมวัน กรุงเทพฯ",
        rating: 4.7,
        crispness: 4.8,
        menu: "ยำหมูกรอบทรงเครื่อง / มาม่าเจ๊โอวหมูกรอบ",
        image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?q=80&w=600&auto=format&fit=crop",
        badge: "Michelin Guide",
        isClosed: false,
        reviews: [
            { reviewer: "MidnightSnack", rating: 5.0, crisp: 4.8, comment: "ยำหมูกรอบคือที่สุด! หนังกรอบสู้ฟัน นานแค่ไหนก็ยังยอมต่อคิว" }
        ]
    },
    {
        id: 6,
        name: "Ah Yat Abalone Forum",
        zone: "เจริญกรุง",
        address: "ชั้น 2 โรงแรม Ramada Plaza Menam Riverside ถนนเจริญกรุง กรุงเทพฯ",
        rating: 4.7,
        crispness: 4.9,
        menu: "หมูกรอบกวางตุ้งดั้งเดิม / หมูกรอบมงคล",
        image: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?q=80&w=600&auto=format&fit=crop",
        badge: "Cantonese Fine Dining",
        isClosed: false,
        reviews: [
            { reviewer: "GourmetChef", rating: 4.8, crisp: 5.0, comment: "หมูกรอบสไตล์กวางตุ้ง หนังบางกรอบสลับชั้นเนื้อนุ่มละมุน" }
        ]
    }
];