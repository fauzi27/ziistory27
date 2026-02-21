import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// Import koneksi db dari file firebase.js yang kita buat
import { db } from "./firebase.js";

// ==========================================
// DATA CONFIGURATION
// ==========================================
const NOMOR_WA_TOKO = "6285939939449"; 
const LINK_GAMBAR_QRIS = "https://res.cloudinary.com/dsutaioqw/image/upload/v1771581748/IMG-20260220-WA0004_xzigot.jpg"; 
const ID_ADMIN_KASIR = "zy8AUA4PUdhj4LSrxzMgfT270Ut2"; 

// ==========================================
// STATE & VARIABLES
// ==========================================
let menus = [];
let cart = [];
let currentCategory = 'all'; 
let currentQueue = ""; 

// Inisialisasi awal (Set QRIS Image)
document.getElementById('qris-image').src = LINK_GAMBAR_QRIS;

// ==========================================
// FIREBASE LISTENER (AMBIL MENU)
// ==========================================
const menuCol = collection(db, "users", ID_ADMIN_KASIR, "menus");
onSnapshot(menuCol, (snapshot) => {
    menus = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    document.getElementById('loading-menu').classList.add('hidden');
    renderCategories();
    renderMenus();
}, (error) => {
    console.error("Error mengambil menu:", error);
    document.getElementById('loading-menu').innerHTML = `<p class="text-red-500 text-xs">Gagal memuat menu. Pastikan ID Admin benar dan Rules Firebase sudah di-set 'allow read: if true;'</p>`;
});

// ==========================================
// FUNGSI & LOGIKA APLIKASI
// ==========================================

// Fungsi Buat Nomor Antrean (ttbbtt + 3 angka acak)
function generateQueueNumber() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const randomUrut = String(Math.floor(Math.random() * 900) + 100); 
    return `${dd}${mm}${yy}${randomUrut}`;
}

function renderCategories() {
    const container = document.getElementById('category-tabs');
    const uniqueCats = [...new Set(menus.map(m => (m.category || 'lainnya').toLowerCase()))];
    
    let html = `<button onclick="setCategory('all')" class="flex-none px-4 py-1.5 rounded-full text-xs font-bold transition border ${currentCategory === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}">Semua</button>`;
    
    uniqueCats.forEach(cat => {
        const isActive = currentCategory === cat;
        const activeClass = isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200';
        html += `<button onclick="setCategory('${cat}')" class="flex-none px-4 py-1.5 rounded-full text-xs font-bold transition border capitalize ${activeClass}">${cat}</button>`;
    });
    container.innerHTML = html;
}

window.setCategory = function(cat) {
    currentCategory = cat;
    renderCategories(); 
    renderMenus();      
}

function renderMenus() {
    const container = document.getElementById('menu-container');
    container.innerHTML = '';
    
    let availableMenus = menus.filter(m => m.stock > 0 || m.stock === undefined);
    if (currentCategory !== 'all') {
        availableMenus = availableMenus.filter(m => (m.category || 'lainnya').toLowerCase() === currentCategory);
    }

    if(availableMenus.length === 0) {
        container.innerHTML = '<p class="col-span-2 text-center text-gray-400 text-xs py-10 italic">Menu tidak ditemukan.</p>';
        return;
    }

    availableMenus.forEach(item => {
        const el = document.createElement('div');
        el.className = 'bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col justify-between';
        el.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-2">
                    <div class="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 bg-gray-50 border">
                        <i class="fas ${item.icon || 'fa-utensils'} text-sm"></i>
                    </div>
                    <span class="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Tersedia</span>
                </div>
                <h3 class="font-bold text-[11px] text-gray-800 leading-tight mb-1 line-clamp-2 h-7">${item.name}</h3>
                <p class="text-xs text-blue-600 font-bold mb-3">Rp ${(item.price || 0).toLocaleString('id-ID')}</p>
            </div>
            <button onclick="addToCart('${item.id}')" class="w-full bg-blue-50 text-blue-600 border border-blue-200 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition active:scale-95 flex items-center justify-center gap-1">
                <i class="fas fa-plus text-[10px]"></i> Tambah
            </button>
        `;
        container.appendChild(el);
    });
}

window.addToCart = function(id) {
    const item = menus.find(m => m.id === id);
    if (!item) return;

    const existing = cart.find(c => c.id === id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ id: item.id, name: item.name, price: parseInt(item.price), qty: 1 });
    }
    updateCartUI();
    Swal.fire({toast: true, position: 'top-end', icon: 'success', title: `+1 ${item.name}`, showConfirmButton: false, timer: 700});
}

function updateCartUI() {
    let total = 0;
    let count = 0;
    cart.forEach(item => { total += (item.price * item.qty); count += item.qty; });

    document.getElementById('cart-total').innerText = 'Rp ' + total.toLocaleString('id-ID');
    document.getElementById('cart-count').innerText = count;
    document.getElementById('qris-amount').innerText = 'Rp ' + total.toLocaleString('id-ID');
}

window.showCheckout = function() {
    if (cart.length === 0) return Swal.fire('Kosong', 'Pilih menu dulu ya kak!', 'warning');
    
    currentQueue = generateQueueNumber();
    document.getElementById('display-queue').innerText = currentQueue;
    
    generateReceiptPreview();
    document.getElementById('checkout-modal').classList.remove('hidden');
}

window.closeCheckout = function() {
    document.getElementById('checkout-modal').classList.add('hidden');
}

function generateReceiptPreview() {
    const container = document.getElementById('receipt-content');
    let total = 0;
    let date = new Date().toLocaleString('id-ID');
    
    let html = `
        <div class="text-center mb-2 border-b border-dashed pb-2">
            <h2 class="font-bold text-sm">Pesanan Online</h2>
            <p class="text-[10px] text-gray-500">${date}</p>
        </div>
        <div class="space-y-1 mb-2 border-b border-dashed pb-2">
    `;

    cart.forEach(i => {
        let sub = i.price * i.qty;
        total += sub;
        html += `<div class="flex justify-between text-[11px]"><span>${i.qty}x ${i.name}</span><span>${sub.toLocaleString()}</span></div>`;
    });

    html += `
        </div>
        <div class="flex justify-between font-bold text-sm mt-2"><span>TOTAL (QRIS)</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>
    `;
    container.innerHTML = html;
}

window.processOrder = function() {
    const nama = document.getElementById('cust-name').value.trim();
    const catatan = document.getElementById('cust-note').value.trim();

    if (!nama) return Swal.fire('Data Kurang', 'Mohon isi Nama Anda!', 'error');

    const receipt = document.getElementById('receipt-content');
    const noteHtml = catatan ? `<br><span class="text-gray-600 font-normal mt-1 block">Catatan: ${catatan}</span>` : '';
    
    receipt.innerHTML = `<div class="text-[11px] font-bold mb-2 pb-2 border-b border-dashed">
        <span class="text-blue-600 block mb-1 text-sm">No. Antrean: ${currentQueue}</span>
        Pemesan: ${nama}
        ${noteHtml}
    </div>` + receipt.innerHTML;

    let total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    let textWA = `*Pesanan Baru (QRIS)*%0A%0A*No. Antrean:* ${currentQueue}%0A*Nama:* ${nama}%0A`;
    if(catatan) textWA += `*Catatan:* ${catatan}%0A`;
    textWA += `%0A*Pesanan:*%0A`;
    
    cart.forEach(i => textWA += `- ${i.qty}x ${i.name} (Rp ${(i.price * i.qty).toLocaleString()})%0A`);
    textWA += `%0A*Total Bayar:* Rp ${total.toLocaleString('id-ID')}%0A%0A_Catatan: Struk pesanan terlampir. Mohon sertakan bukti transfer QRIS Anda._`;

    let waLink = `https://wa.me/${NOMOR_WA_TOKO}?text=${textWA}`;

    Swal.fire({
        title: 'Menyiapkan...',
        text: 'Struk akan terdownload, lampirkan struk ini & bukti transfer QRIS di WhatsApp ya!',
        timer: 3000,
        showConfirmButton: false,
        allowOutsideClick: false
    });

    html2canvas(receipt, { scale: 2, backgroundColor: '#ffffff' }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Pesanan_${nama}_${currentQueue}.png`;
        link.href = canvas.toDataURL();
        link.click();
        setTimeout(() => { window.location.href = waLink; }, 1000);
    });
}
