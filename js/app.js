// SEWAAJA - APP.JS (LENGKAP & FIX)
// ============================================================

// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://ltitsmpdizbomyprofsh.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0aXRzbXBkaXpib215cHJvZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4Mzk0MTAsImV4cCI6MjA5NjQxNTQxMH0.QOuA9xW9AMtYbYwg895taraq2a1O0qNyWghepyDZuwk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase connected!');

// ==================== DATA PRODUK DEFAULT ====================
const defaultProducts = [
    { id: 1, name: "Carrier Eiger 60L", category: "Carrier", price: 30000, status: "Tersedia", image: "https://picsum.photos/seed/eiger/300/200" },
    { id: 2, name: "Carrier Consina 50L", category: "Carrier", price: 45000, status: "Tersedia", image: "https://picsum.photos/seed/consina/300/200" },
    { id: 3, name: "Tenda Dome 4 Orang", category: "Tenda", price: 50000, status: "Tersedia", image: "https://picsum.photos/seed/tenda1/300/200" },
    { id: 4, name: "Tenda Eiger Twin", category: "Tenda", price: 75000, status: "Tersedia", image: "https://picsum.photos/seed/tenda2/300/200" },
    { id: 5, name: "Carrier Arei 40L", category: "Carrier", price: 40000, status: "Tersedia", image: "https://picsum.photos/seed/arei/300/200" },
    { id: 6, name: "Alat Camping Lengkap", category: "Alat Camping", price: 100000, status: "Tersedia", image: "https://picsum.photos/seed/camping/300/200" }
];

let products = [];
let rentals = [];
let currentUser = null;
let isLoginMode = true;
let selectedCategory = 'Semua';
let searchQuery = '';
let currentPaymentRentalId = null;
let metodePembayaran = 'qris';
let buktiTerkirim = false;

// ==================== TOAST ====================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    toast.innerHTML = `${icons[type] || '📢'} ${message}`;
    toast.className = `toast ${type}`;
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// ==================== STORAGE ====================
function saveToStorageLocal() {
    try {
        localStorage.setItem('sewaaja_products', JSON.stringify(products));
        localStorage.setItem('sewaaja_rentals', JSON.stringify(rentals));
        console.log('💾 Saved to localStorage');
    } catch(e) { console.error('Error saving:', e); }
}

async function loadFromStorage() {
    try {
        // Coba dari Supabase
        const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true });
        
        if (productsError) throw productsError;
        
        if (productsData && productsData.length > 0) {
            products = productsData;
            console.log('✅ Products loaded from Supabase:', products.length);
        } else {
            // Jika kosong, pakai default
            products = JSON.parse(JSON.stringify(defaultProducts));
            console.log('📦 Using default products');
        }
        
        const { data: rentalsData, error: rentalsError } = await supabase
            .from('rentals')
            .select('*')
            .order('id', { ascending: false });
        
        if (rentalsError) throw rentalsError;
        rentals = rentalsData || [];
        console.log('✅ Rentals loaded from Supabase:', rentals.length);
        
    } catch(e) {
        console.error('❌ Supabase error:', e);
        // Fallback ke LocalStorage
        loadFromStorageLocal();
    }
}

function loadFromStorageLocal() {
    try {
        const storedProducts = localStorage.getItem('sewaaja_products');
        if (storedProducts) {
            products = JSON.parse(storedProducts);
        } else {
            products = JSON.parse(JSON.stringify(defaultProducts));
        }
        const storedRentals = localStorage.getItem('sewaaja_rentals');
        if (storedRentals) {
            rentals = JSON.parse(storedRentals);
        } else {
            rentals = [];
        }
        console.log('📦 Loaded from localStorage - Products:', products.length);
    } catch(e) {
        products = JSON.parse(JSON.stringify(defaultProducts));
        rentals = [];
    }
}

async function saveToStorage() {
    try {
        // Simpan ke Supabase
        for (const product of products) {
            const { error } = await supabase
                .from('products')
                .upsert({
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    status: product.status,
                    image_url: product.image || product.image_url
                }, { onConflict: 'id' });
            if (error) console.error('Upsert product error:', error);
        }
        for (const rental of rentals) {
            const { error } = await supabase
                .from('rentals')
                .upsert({
                    id: rental.id,
                    product_id: rental.product_id,
                    product_name: rental.product_name,
                    penyewa: rental.penyewa,
                    user_email: rental.user_email,
                    no_wa: rental.no_wa,
                    alamat: rental.alamat,
                    tgl_mulai: rental.tgl_mulai,
                    tgl_selesai: rental.tgl_selesai,
                    total_harga: rental.total_harga,
                    metode: rental.metode || 'qris',
                    status: rental.status,
                    tanggal_pengajuan: rental.tanggal_pengajuan || new Date().toISOString()
                }, { onConflict: 'id' });
            if (error) console.error('Upsert rental error:', error);
        }
        console.log('💾 Saved to Supabase');
    } catch(e) {
        console.error('❌ Save to Supabase error:', e);
        saveToStorageLocal();
    }
}

// ==================== RENDER ====================
async function renderAll() {
    await loadFromStorage();
    renderFilter();
    renderCatalog();
    
    const isAdmin = currentUser && currentUser.role === 'admin';
    const adminPanel = document.getElementById('adminPanel');
    if (isAdmin) {
        adminPanel.style.display = 'block';
        renderAdminTable();
        renderRentalTable();
        updateStats();
    } else {
        adminPanel.style.display = 'none';
    }
}

function updateStats() {
    const total = products.length;
    const tersedia = products.filter(p => p.status === 'Tersedia').length;
    const disewa = products.filter(p => p.status === 'Disewa').length;
    const pendapatan = rentals
        .filter(r => r.status === 'Selesai' || r.status === 'Disewa')
        .reduce((sum, r) => sum + (r.total_harga || 0), 0);
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statTersedia').textContent = tersedia;
    document.getElementById('statSewa').textContent = disewa;
    document.getElementById('statPendapatan').textContent = `Rp ${pendapatan.toLocaleString()}`;
}

function renderFilter() {
    const container = document.getElementById('filterKategori');
    if (!container) return;
    const categories = ['Semua', ...new Set(products.map(p => p.category))];
    container.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.textContent = cat;
        const isActive = selectedCategory === cat;
        btn.className = `filter-btn ${isActive ? 'active' : ''}`;
        btn.onclick = function() { selectedCategory = cat; renderFilter(); renderCatalog(); };
        container.appendChild(btn);
    });
}

function renderCatalog() {
    const container = document.getElementById('katalogContainer');
    if (!container) return;
    
    let filtered = products;
    if (selectedCategory !== 'Semua') {
        filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (searchQuery) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    document.getElementById('productCount').textContent = `${filtered.length} alat`;
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">
            <p class="text-2xl mb-4">😕</p>
            <p>Tidak ada alat pendakian</p>
        </div>`;
        return;
    }
    
    container.innerHTML = '';
    filtered.forEach((p, index) => {
        const card = document.createElement('div');
        card.className = `glass-card rounded-xl overflow-hidden fade-in`;
        card.style.animationDelay = `${index * 0.05}s`;
        const isDisabled = p.status !== 'Tersedia';
        const imgUrl = p.image || p.image_url || 'https://picsum.photos/seed/default/300/200';
        card.innerHTML = `
            <div class="product-image-container">
                <img src="${imgUrl}" class="product-image" onerror="this.src='https://picsum.photos/seed/error/300/200'">
            </div>
            <div class="p-3 md:p-4">
                <div class="flex justify-between items-start">
                    <h4 class="font-bold text-sm md:text-base text-gray-800">${p.name}</h4>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">${p.category}</span>
                </div>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-blue-600 font-bold text-xs md:text-sm">Rp ${p.price.toLocaleString()}/hari</span>
                    <span class="status-badge ${p.status === 'Tersedia' ? 'status-tersedia' : 'status-disewa'}">${p.status}</span>
                </div>
                <button onclick="openSewa(${p.id})" class="mt-3 w-full py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold transition ${p.status === 'Tersedia' ? 'btn-gradient text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}" ${p.status !== 'Tersedia' ? 'disabled' : ''}>
                    ${p.status === 'Tersedia' ? '🛒 Sewa Sekarang' : '⛔ Sedang Disewa'}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

document.getElementById('searchInput')?.addEventListener('input', function() {
    searchQuery = this.value;
    renderCatalog();
});

// ==================== ADMIN TABLE ====================
function renderAdminTable() {
    const tbody = document.getElementById('adminTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    products.forEach(p => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="p-2 text-xs md:text-sm">${p.name}</td>
            <td class="p-2 text-xs md:text-sm">${p.category}</td>
            <td class="p-2 text-xs md:text-sm">Rp ${p.price.toLocaleString()}</td>
            <td class="p-2"><span class="status-badge ${p.status === 'Tersedia' ? 'status-tersedia' : 'status-disewa'}">${p.status}</span></td>
            <td class="p-2">
                <button onclick="editProduct(${p.id})" class="text-blue-600 mr-2 text-xs md:text-sm hover:underline">Edit</button>
                <button onclick="deleteProduct(${p.id})" class="text-red-600 text-xs md:text-sm hover:underline">Hapus</button>
            </td>
        `;
    });
}

// ==================== RENTAL TABLE ====================
function renderRentalTable() {
    const tbody = document.getElementById('rentalTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (rentals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-gray-500">Belum ada data penyewaan</td></tr>';
        return;
    }
    const sorted = [...rentals].reverse();
    sorted.forEach(r => {
        const row = tbody.insertRow();
        let statusClass = '';
        if (r.status === 'Menunggu Pembayaran') statusClass = 'status-menunggu';
        else if (r.status === 'Menunggu Konfirmasi') statusClass = 'status-menunggu';
        else if (r.status === 'Dibayar') statusClass = 'status-dibayar';
        else if (r.status === 'Disewa') statusClass = 'status-disewa';
        else if (r.status === 'Selesai') statusClass = 'status-tersedia';
        else if (r.status === 'Ditolak') statusClass = 'status-ditolak';
        else statusClass = 'status-tersedia';
        
        let actions = '';
        if (r.status === 'Menunggu Pembayaran') {
            actions = `<button onclick="confirmPaymentFromAdmin(${r.id})" class="text-green-600 mr-1 text-xs">✅ Konfirmasi Bayar</button>
                       <button onclick="rejectRental(${r.id})" class="text-red-600 text-xs">❌ Tolak</button>`;
        } else if (r.status === 'Menunggu Konfirmasi') {
            actions = `<button onclick="approveRental(${r.id})" class="text-blue-600 text-xs">✓ Proses Sewa</button>
                       <button onclick="rejectRental(${r.id})" class="text-red-600 text-xs">❌ Tolak</button>`;
        } else if (r.status === 'Dibayar') {
            actions = `<button onclick="approveRental(${r.id})" class="text-blue-600 text-xs">✓ Proses Sewa</button>`;
        } else if (r.status === 'Disewa') {
            actions = `<button onclick="completeRental(${r.id})" class="text-blue-600 text-xs">✓ Selesaikan</button>`;
        } else {
            actions = '-';
        }
        
        row.innerHTML = `
            <td class="p-2 text-xs">${r.id}</td>
            <td class="p-2 text-xs md:text-sm">${r.product_name}</td>
            <td class="p-2 text-xs md:text-sm">${r.penyewa}</td>
            <td class="p-2 text-xs">${r.no_wa || '-'}</td>
            <td class="p-2 text-xs max-w-[100px] truncate">${r.alamat || '-'}</td>
            <td class="p-2 text-xs">${r.tgl_mulai} → ${r.tgl_selesai}</td>
            <td class="p-2 text-xs md:text-sm">Rp ${(r.total_harga || 0).toLocaleString()}</td>
            <td class="p-2 text-xs">${r.metode === 'qris' ? '📱 QRIS' : '🏪 Tempat'}</td>
            <td class="p-2"><span class="status-badge ${statusClass}">${r.status}</span></td>
            <td class="p-2 text-center">${actions}</td>
        `;
    });
}

// ==================== CRUD PRODUK ====================
function editProduct(id) {
    const p = products.find(p => p.id === id);
    if (!p) return;
    document.getElementById('productTitle').innerText = 'Edit Alat';
    document.getElementById('productId').value = p.id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productCategory').value = p.category;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productImage').value = p.image || '';
    openModal('productModal');
}

async function deleteProduct(id) {
    if (confirm('Yakin hapus alat ini?')) {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);
            if (error) throw error;
            products = products.filter(p => p.id !== id);
            await renderAll();
            showToast('✅ Alat berhasil dihapus', 'success');
        } catch(e) {
            console.error('Delete error:', e);
            showToast('❌ Gagal hapus alat', 'error');
        }
    }
}

async function simpanProduk() {
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const price = parseInt(document.getElementById('productPrice').value);
    let image = document.getElementById('productImage').value.trim();
    
    if (!name || !category || !price) return showToast('⚠️ Isi semua data!', 'error');
    if (!image) image = 'https://picsum.photos/seed/' + Date.now() + '/300/200';
    
    if (id) {
        const index = products.findIndex(p => p.id == id);
        if (index !== -1) {
            products[index] = { ...products[index], name, category, price, image };
        }
        showToast('✅ Alat berhasil diupdate', 'success');
    } else {
        const newId = Math.max(...products.map(p => p.id), 0) + 1;
        products.push({ id: newId, name, category, price, status: "Tersedia", image });
        showToast('✅ Alat berhasil ditambahkan', 'success');
    }
    await saveToStorage();
    closeModal('productModal');
    await renderAll();
}

// ==================== FUNGSI SEWA ====================
function openSewa(productId) {
    if (!currentUser) {
        showToast('⚠️ Silakan login dulu!', 'error');
        openModal('authModal');
        return;
    }
    const product = products.find(p => p.id === productId);
    if (!product || product.status !== 'Tersedia') {
        showToast('⚠️ Alat tidak tersedia!', 'error');
        return;
    }
    document.getElementById('sewaProductId').value = product.id;
    document.getElementById('sewaPrice').value = product.price;
    document.getElementById('sewaTitle').innerHTML = `Sewa - ${product.name}`;
    document.getElementById('sewaNama').value = '';
    document.getElementById('sewaWA').value = '';
    document.getElementById('sewaAlamat').value = '';
    document.getElementById('sewaTglMulai').value = '';
    document.getElementById('sewaTglSelesai').value = '';
    document.getElementById('sewaTotal').innerHTML = 'Total: Rp 0';
    pilihMetode('qris');
    openModal('sewaModal');
}

function hitungTotal() {
    const tglMulai = document.getElementById('sewaTglMulai').value;
    const tglSelesai = document.getElementById('sewaTglSelesai').value;
    const harga = parseInt(document.getElementById('sewaPrice').value);
    if (tglMulai && tglSelesai && harga) {
        const hari = Math.ceil((new Date(tglSelesai) - new Date(tglMulai)) / (1000 * 60 * 60 * 24));
        if (hari > 0) {
            let total = hari * harga;
            let diskonText = '';
            if (hari >= 7) {
                total = total * 0.85;
                diskonText = ' (Diskon 15% untuk 7+ hari!)';
            } else if (hari >= 3) {
                total = total * 0.90;
                diskonText = ' (Diskon 10% untuk 3+ hari!)';
            }
            document.getElementById('sewaTotal').innerHTML = `Total: Rp ${Math.round(total).toLocaleString()}${diskonText}`;
        }
    }
}

async function simpanSewa() {
    if (!currentUser) return showToast('⚠️ Silakan login dulu!', 'error');
    
    const productId = parseInt(document.getElementById('sewaProductId').value);
    const nama = document.getElementById('sewaNama').value.trim();
    const wa = document.getElementById('sewaWA').value.trim();
    const alamat = document.getElementById('sewaAlamat').value.trim();
    const tglMulai = document.getElementById('sewaTglMulai').value;
    const tglSelesai = document.getElementById('sewaTglSelesai').value;
    const metode = document.getElementById('sewaMetode').value;
    
    if (!nama || !wa || !alamat || !tglMulai || !tglSelesai) {
        return showToast('⚠️ Isi semua data!', 'error');
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) return showToast('⚠️ Alat tidak ditemukan!', 'error');
    
    const hari = Math.ceil((new Date(tglSelesai) - new Date(tglMulai)) / (1000 * 60 * 60 * 24));
    if (hari <= 0) return showToast('⚠️ Tanggal selesai harus setelah tanggal mulai!', 'error');
    
    let totalHarga = product.price * hari;
    if (hari >= 7) totalHarga = totalHarga * 0.85;
    else if (hari >= 3) totalHarga = totalHarga * 0.90;
    totalHarga = Math.round(totalHarga);
    
    const newRental = {
        id: Date.now(),
        product_id: productId,
        product_name: product.name,
        penyewa: nama,
        user_email: currentUser.email,
        no_wa: wa,
        alamat: alamat,
        tgl_mulai: tglMulai,
        tgl_selesai: tglSelesai,
        total_harga: totalHarga,
        metode: metode,
        status: metode === 'qris' ? 'Menunggu Pembayaran' : 'Menunggu Konfirmasi',
        tanggal_pengajuan: new Date().toISOString()
    };
    
    rentals.push(newRental);
    await saveToStorage();
    showToast('✅ Permintaan sewa berhasil!', 'success');
    closeModal('sewaModal');
    
    if (metode === 'qris') {
        generateQRCode(totalHarga, newRental.id);
    } else {
        currentPaymentRentalId = newRental.id;
        kirimKeWA();
    }
    
    await renderAll();
}

// ==================== QR CODE ====================
function generateQRCode(amount, rentalId) {
    currentPaymentRentalId = rentalId;
    buktiTerkirim = false;
    document.getElementById('btnSelesaiBayar').classList.add('hidden');
    
    const qrData = `SewaAja Payment\nID: ${rentalId}\nTotal: Rp ${amount.toLocaleString()}\nBank: BCA 1234567890 a.n SewaAja`;
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';
    
    try {
        new QRCode(qrcodeDiv, {
            text: qrData,
            width: 200,
            height: 200,
            colorDark: "#1e293b",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch(e) {
        qrcodeDiv.innerHTML = `<div class="bg-gray-100 p-4 rounded-lg text-center">
            <p class="text-sm">QR Code tidak tersedia</p>
            <p class="text-xs text-gray-500 mt-2">Silakan transfer ke rekening di bawah</p>
        </div>`;
    }
    
    document.getElementById('paymentAmount').innerHTML = `Total: Rp ${amount.toLocaleString()}`;
    openModal('paymentModal');
}

// ==================== WHATSAPP ====================
function kirimKeWA() {
    const rental = rentals.find(r => r.id === currentPaymentRentalId);
    if (!rental) {
        if (rentals.length > 0) {
            const lastRental = rentals[rentals.length - 1];
            kirimPesanWA(lastRental);
            return;
        }
        return showToast('⚠️ Data penyewaan tidak ditemukan!', 'error');
    }
    kirimPesanWA(rental);
    buktiTerkirim = true;
    document.getElementById('btnSelesaiBayar').classList.remove('hidden');
    document.getElementById('btnSelesaiBayar').innerHTML = '✅ Selesai & Konfirmasi';
    showToast('📨 Bukti terkirim!', 'success');
}

function kirimPesanWA(rental) {
    const adminWA = '6281234567890';
    let pesan = rental.metode === 'qris' ? 
        `✅ KONFIRMASI PEMBAYARAN QRIS ✅\n\n🧑‍🤝‍🧑 Nama: ${rental.penyewa}\n📦 Barang: ${rental.product_name}\n📅 Tanggal: ${rental.tgl_mulai} s/d ${rental.tgl_selesai}\n💰 Total: Rp ${rental.total_harga.toLocaleString()}\n📱 No. WA: ${rental.no_wa}\n📍 Alamat: ${rental.alamat}\n\n📎 *Bukti pembayaran terlampir*` :
        `🏪 KONFIRMASI BAYAR DI TEMPAT 🏪\n\n🧑‍🤝‍🧑 Nama: ${rental.penyewa}\n📦 Barang: ${rental.product_name}\n📅 Tanggal: ${rental.tgl_mulai} s/d ${rental.tgl_selesai}\n💰 Total: Rp ${rental.total_harga.toLocaleString()}\n📱 No. WA: ${rental.no_wa}\n📍 Alamat: ${rental.alamat}\n\nSaya akan bayar langsung di tempat.`;
    
    window.open(`https://wa.me/${adminWA}?text=${encodeURIComponent(pesan)}`, '_blank');
}

function confirmPayment() {
    if (currentPaymentRentalId) {
        const rental = rentals.find(r => r.id === currentPaymentRentalId);
        if (rental && rental.status === 'Menunggu Pembayaran') {
            if (confirm('📱 Kirim bukti pembayaran ke WhatsApp Admin?')) {
                kirimKeWA();
            }
        }
    }
}

function selesaikanPembayaran() {
    if (currentPaymentRentalId) {
        const rental = rentals.find(r => r.id === currentPaymentRentalId);
        if (rental) {
            rental.status = 'Dibayar';
            saveToStorage();
            showToast('✅ Pembayaran berhasil dikonfirmasi!', 'success');
            closeModal('paymentModal');
            buktiTerkirim = false;
            document.getElementById('btnSelesaiBayar').classList.add('hidden');
            renderAll();
        }
    }
}

// ==================== ADMIN SEWA ====================
async function approveRental(id) {
    const rental = rentals.find(r => r.id === id);
    if (rental) {
        rental.status = 'Disewa';
        const product = products.find(p => p.id === rental.product_id);
        if (product) product.status = 'Disewa';
        await saveToStorage();
        await renderAll();
        showToast(`✅ Sewa ${rental.product_name} diproses!`, 'success');
    }
}

async function completeRental(id) {
    const rental = rentals.find(r => r.id === id);
    if (rental) {
        rental.status = 'Selesai';
        const product = products.find(p => p.id === rental.product_id);
        if (product && product.status === 'Disewa') product.status = 'Tersedia';
        await saveToStorage();
        await renderAll();
        showToast(`✅ Sewa ${rental.product_name} selesai!`, 'success');
    }
}

function rejectRental(id) {
    if (!confirm('Tolak penyewaan ini?')) return;
    const rental = rentals.find(r => r.id === id);
    if (rental) {
        rental.status = 'Ditolak';
        saveToStorage();
        renderAll();
        showToast('❌ Penyewaan ditolak', 'error');
    }
}

function confirmPaymentFromAdmin(id) {
    const rental = rentals.find(r => r.id === id);
    if (rental && rental.status === 'Menunggu Pembayaran') {
        rental.status = 'Dibayar';
        saveToStorage();
        renderAll();
        showToast(`✅ Pembayaran ${rental.product_name} dikonfirmasi!`, 'success');
    }
}

// ==================== AUTH ====================
function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!email || !password) return showToast('⚠️ Isi email dan password!', 'error');
    
    if (isLoginMode) {
        if (email === 'admin@sewaaja.com' && password === 'admin123') {
            currentUser = { email, role: 'admin' };
            document.getElementById('navAuth').innerHTML = `<span class="text-green-600 font-bold text-xs md:text-sm">👑 Admin: ${email} <button onclick="logout()" class="ml-1 text-red-500 text-xs hover:underline">Logout</button></span>`;
            closeModal('authModal');
            renderAll();
            showToast('✅ Login sebagai Admin!', 'success');
        } else if (email === 'user1@gmail.com' && password === 'user123') {
            currentUser = { email, role: 'user' };
            document.getElementById('navAuth').innerHTML = `<span class="text-green-600 font-bold text-xs md:text-sm">🏔️ User: ${email} <button onclick="logout()" class="ml-1 text-red-500 text-xs hover:underline">Logout</button></span>`;
            closeModal('authModal');
            renderAll();
            showToast('✅ Login sebagai Pendaki!', 'success');
        } else {
            showToast('❌ Login gagal!', 'error');
        }
    }
}

function logout() {
    currentUser = null;
    document.getElementById('navAuth').innerHTML = `<button onclick="openModal('authModal')" class="btn-gradient text-white px-3 py-1.5 rounded-xl text-xs md:text-sm font-bold transition">Login</button>`;
    renderAll();
    showToast('👋 Anda telah logout', 'info');
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('authTitle').innerText = isLoginMode ? 'Masuk Akun' : 'Daftar Akun';
    document.getElementById('authSwitch').innerText = isLoginMode ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login';
}

// ==================== PILIH METODE ====================
function pilihMetode(metode) {
    metodePembayaran = metode;
    document.getElementById('sewaMetode').value = metode;
    const btnQRIS = document.getElementById('btnQRIS');
    const btnTempat = document.getElementById('btnTempat');
    if (metode === 'qris') {
        btnQRIS.className = 'metode-btn p-3 border-2 rounded-xl text-sm font-semibold transition border-blue-500 bg-blue-50 text-blue-600 active';
        btnTempat.className = 'metode-btn p-3 border-2 rounded-xl text-sm font-semibold transition border-gray-200 bg-gray-50 text-gray-600';
    } else {
        btnTempat.className = 'metode-btn p-3 border-2 rounded-xl text-sm font-semibold transition border-blue-500 bg-blue-50 text-blue-600 active';
        btnQRIS.className = 'metode-btn p-3 border-2 rounded-xl text-sm font-semibold transition border-gray-200 bg-gray-50 text-gray-600';
    }
}

// ==================== MODAL ====================
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// ==================== INIT ====================
loadFromStorage();
renderAll();
console.log('🏔️ SewaAja - Sewa Alat Pendakian siap digunakan!');
console.log('🔑 Login: admin@sewaaja.com / admin123');
console.log('🔑 Login: user1@gmail.com / user123');
