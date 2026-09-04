/* ── STATE ────────────────────────────────────── */
let products = [];
let cart = [];
let activeCategory = 'all';
let currentProduct = null;
let currentQty = 1;
let carouselIndex = 0;
let carouselTimer = null;

const WHATSAPP_NUMBER = '233XXXXXXXXX'; // ← replace with Masyl's real number

/* ── INIT ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  renderGrid(products);
  initCarousel();
  initPills();
  initCart();
  initDetailPage();
  initMenu();
  initAbout();
  initContact();
});

/* ── LOAD PRODUCTS ────────────────────────────── */
async function loadProducts() {
  try {
    const res = await fetch('products.json');
    products = await res.json();
    // hot product always renders top-left
    products.sort((a, b) => (b.hot ? 1 : 0) - (a.hot ? 1 : 0));
  } catch (e) {
    console.error('Could not load products.json', e);
  }
}

/* ── PRODUCT GRID ─────────────────────────────── */
function renderGrid(list) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';

  if (!list.length) {
    grid.innerHTML = `<p style="grid-column:span 2;text-align:center;color:rgba(0,0,0,0.3);padding:40px 0;font-weight:700;">No products here yet</p>`;
    return;
  }

  const placeholderBgs = [
    'linear-gradient(135deg,#ffd6ec,#f0d6ff)',
    'linear-gradient(135deg,#c8f0ff,#ffd6ec)',
    'linear-gradient(135deg,#fffacc,#ffd6ec)',
    'linear-gradient(135deg,#f0d6ff,#c8f0ff)',
  ];

  list.forEach((p, i) => {
    const tile = document.createElement('div');
    tile.className = 'tile' + (p.hot ? ' hot-tile' : '');
    tile.dataset.id = p.id;

    const bg = placeholderBgs[i % placeholderBgs.length];

    const imgHTML = p.image
      ? `<img class="tile-img" src="images/${p.image}" alt="${p.name}" loading="lazy">`
      : `<div class="tile-img-placeholder" style="background:${bg};">600 × 600px photo</div>`;

    const lowStock = p.stock <= 3
      ? `<span class="low-stock">Only ${p.stock} left</span>`
      : '';

    tile.innerHTML = `
      <div class="tile-img-wrap">
        ${imgHTML}
        ${lowStock}
      </div>
      <div class="tile-body">
        <div class="tile-name">${p.name}</div>
        <div class="tile-desc">${p.desc}</div>
        <div class="tile-price">GH₵ ${p.price}</div>
      </div>
    `;

    tile.addEventListener('click', () => openDetail(p));
    grid.appendChild(tile);
  });
}



/* ── PILL FILTERS ─────────────────────────────── */
function initPills() {
  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.dataset.cat;
      const filtered = activeCategory === 'all'
        ? products
        : products.filter(p => p.category === activeCategory);
      renderGrid(filtered);
    });
  });
}

/* ── CAROUSEL ─────────────────────────────────── */
function initCarousel() {
  const carousel = document.getElementById('carousel');
  const slides = carousel.querySelectorAll('.carousel-slide');
  const dotsWrap = document.getElementById('carouselDots');
  const total = slides.length;

  // build dots
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.addEventListener('click', () => goToSlide(i));
    dotsWrap.appendChild(dot);
  }

  // tap a slide → open that product
  slides.forEach(slide => {
    slide.addEventListener('click', () => {
      const id = parseInt(slide.dataset.productId);
      const product = products.find(p => p.id === id);
      if (product) openDetail(product);
    });
  });

  // touch swipe
  let startX = 0;
  carousel.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goToSlide(carouselIndex + (diff > 0 ? 1 : -1));
  });

  startAutoplay(total);
}

function goToSlide(index) {
  const carousel = document.getElementById('carousel');
  const total = carousel.querySelectorAll('.carousel-slide').length;
  carouselIndex = ((index % total) + total) % total;
  carousel.style.transform = `translateX(-${carouselIndex * 100}%)`;
  document.querySelectorAll('.carousel-dot').forEach((d, i) =>
    d.classList.toggle('active', i === carouselIndex)
  );
}

function startAutoplay(total) {
  clearInterval(carouselTimer);
  carouselTimer = setInterval(() => goToSlide(carouselIndex + 1), 3800);
}

/* ── DETAIL PAGE ──────────────────────────────── */
function initDetailPage() {
  document.getElementById('detailBack').addEventListener('click', closeDetail);
  document.getElementById('detailCartBtn').addEventListener('click', openCart);
}

function openDetail(product) {
  currentProduct = product;
  currentQty = 1;
  galleryIndex = 0;

  const page = document.getElementById('detailPage');
  const content = document.getElementById('detailContent');

  const placeholderBgs = [
    'linear-gradient(135deg,#ffd6ec,#f0d6ff)',
    'linear-gradient(135deg,#c8f0ff,#ffd6ec)',
    'linear-gradient(135deg,#fffacc,#ffd6ec)',
  ];
  const bg = placeholderBgs[product.id % placeholderBgs.length];

  // images: product.images = ['a.jpg','b.jpg'] OR fallback to product.image
  const imageList = product.images && product.images.length
    ? product.images
    : (product.image ? [product.image] : []);

  const gallerySlides = imageList.length
    ? imageList.map(img =>
        `<div class="gallery-slide"><img src="images/${img}" alt="${product.name}"></div>`
      ).join('')
    : `<div class="gallery-slide" style="background:${bg};">600 × 600px photo</div>`;

  const galleryDots = imageList.length > 1
    ? `<div class="gallery-dots">${imageList.map((_,i) =>
        `<button class="gallery-dot ${i===0?'active':''}" onclick="galleryGo(${i})"></button>`
      ).join('')}</div>`
    : '';

  const galleryBtns = imageList.length > 1
    ? `<button class="gallery-btn gallery-btn-prev" onclick="galleryGo(-1, true)">
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E70C6A" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
       </button>
       <button class="gallery-btn gallery-btn-next" onclick="galleryGo(1, true)">
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E70C6A" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
       </button>`
    : '';

  const imgHTML = `
    <div class="gallery-wrap" id="galleryWrap">
      <div class="gallery-track" id="galleryTrack">${gallerySlides}</div>
      ${galleryBtns}
      ${galleryDots}
    </div>
  `;

  const lowStockHTML = product.stock <= 3
    ? `<p class="low-stock-warn">⚠ Only ${product.stock} left in stock</p>`
    : '';

  const variantsHTML = product.variants.map(v => `
    <div class="variant-group">
      <div class="variant-label">${v.label}</div>
      <div class="variant-options">
        ${v.options.map((opt, i) => {
          const hex   = (typeof opt === 'object') ? opt.hex   : null;
          const label = (typeof opt === 'object') ? opt.label : opt;
          const colorStyle = hex
            ? `data-hex="${hex}" style="--opt-color:${hex};"`
            : '';
          return `<button class="variant-opt ${i === 0 ? 'selected' : ''}${hex ? ' has-color' : ''}"
            ${colorStyle} onclick="selectVariant(this)">${label}</button>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  content.innerHTML = `
    ${imgHTML}
    <div class="detail-body">
      <div class="detail-name">${product.name}</div>
      <div class="detail-price">GH₵ ${product.price}</div>
      <div class="detail-desc">${product.desc}</div>
      ${lowStockHTML}
      ${variantsHTML}
      <div class="qty-row">
        <span class="qty-label">Qty</span>
        <button class="qty-btn" onclick="changeQty(-1)">−</button>
        <span class="qty-num" id="qtyNum">1</span>
        <button class="qty-btn" onclick="changeQty(1)">+</button>
      </div>
    </div>
    <div class="cta-row">
      <button class="btn-add" onclick="addToCart()">Add to Bag</button>
      <button class="btn-order" onclick="orderNow()">Order Now</button>
    </div>
  `;

  updateDetailCartBadge();
  page.classList.remove('hidden');
  requestAnimationFrame(() => page.classList.add('visible'));
  clearInterval(carouselTimer);
}

function closeDetail() {
  const page = document.getElementById('detailPage');
  page.classList.remove('visible');
  setTimeout(() => page.classList.add('hidden'), 350);
  currentProduct = null;
  const total = document.querySelectorAll('.carousel-slide').length;
  startAutoplay(total);
}

/* ── VARIANTS & QTY ───────────────────────────── */
function selectVariant(btn) {
  const siblings = btn.closest('.variant-options').querySelectorAll('.variant-opt');
  siblings.forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

/* ── GALLERY ──────────────────────────────────── */
let galleryIndex = 0;
function galleryGo(indexOrDelta, isDelta = false) {
  const track  = document.getElementById('galleryTrack');
  const dots   = document.querySelectorAll('.gallery-dot');
  if (!track) return;
  const total  = track.children.length;
  if (total <= 1) return;
  galleryIndex = isDelta
    ? ((galleryIndex + indexOrDelta + total) % total)
    : indexOrDelta;
  track.style.transform = `translateX(-${galleryIndex * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === galleryIndex));
}

function getSelectedVariants() {
  return [...document.querySelectorAll('.variant-group')].map(g => {
    const label = g.querySelector('.variant-label').textContent.trim();
    const sel   = g.querySelector('.variant-opt.selected');
    return sel ? `${label}: ${sel.textContent.trim()}` : null;
  }).filter(Boolean);
}

function changeQty(delta) {
  currentQty = Math.max(1, currentQty + delta);
  const el = document.getElementById('qtyNum');
  if (el) el.textContent = currentQty;
}

/* ── CART ─────────────────────────────────────── */
function initCart() {
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);
  document.getElementById('whatsappBtn').addEventListener('click', sendWhatsApp);
  document.getElementById('navCartBtn').addEventListener('click', openCart);
}

function addToCart() {
  if (!currentProduct) return;
  const variants = getSelectedVariants();
  const key = currentProduct.id + '|' + variants.join(',');
  const existing = cart.find(i => i.key === key);
  if (existing) {
    existing.qty += currentQty;
  } else {
    cart.push({ key, id: currentProduct.id, name: currentProduct.name, price: currentProduct.price, qty: currentQty, variants });
  }
  updateCartUI();

  const btn = document.querySelector('.btn-add');
  if (btn) {
    btn.textContent = '✓ Added!';
    btn.style.background = 'var(--purple)';
    btn.style.color = 'white';
    setTimeout(() => {
      btn.textContent = 'Add to Bag';
      btn.style.background = '';
      btn.style.color = '';
    }, 1200);
  }
}

function orderNow() {
  if (!currentProduct) return;
  const variants = getSelectedVariants();
  const line = `• ${currentProduct.name}${variants.length ? ' (' + variants.join(', ') + ')' : ''} x${currentQty} — GH₵ ${currentProduct.price * currentQty}`;
  const msg = `Hi Masyl's Dream! 🌸 I'd like to order:\n${line}\n\nTotal: GH₵ ${currentProduct.price * currentQty}\n\nPlease confirm availability!`;
  openWhatsApp(msg);
}

function sendWhatsApp() {
  if (!cart.length) return;
  const lines = cart.map(i =>
    `• ${i.name}${i.variants.length ? ' (' + i.variants.join(', ') + ')' : ''} x${i.qty} — GH₵ ${i.price * i.qty}`
  ).join('\n');
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const msg = `Hi Masyl's Dream! 🌸 I'd like to order:\n${lines}\n\nTotal: GH₵ ${total}\n\nPlease confirm availability!`;
  openWhatsApp(msg);
}

function openWhatsApp(msg) {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

function openCart() {
  if (!cart.length) return;
  renderCartDrawer();
  document.getElementById('cartOverlay').classList.remove('hidden');
  document.getElementById('cartDrawer').classList.remove('hidden');
}

function closeCart() {
  document.getElementById('cartOverlay').classList.add('hidden');
  document.getElementById('cartDrawer').classList.add('hidden');
}

function removeFromCart(key) {
  cart = cart.filter(i => i.key !== key);
  updateCartUI();
  renderCartDrawer();
  if (!cart.length) closeCart();
}

function renderCartDrawer() {
  document.getElementById('cartItems').innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name} x${item.qty}</div>
        ${item.variants.length ? `<div class="cart-item-variant">${item.variants.join(' · ')}</div>` : ''}
      </div>
      <div class="cart-item-price">GH₵ ${item.price * item.qty}</div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.key}')">✕</button>
    </div>
  `).join('');
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  document.getElementById('cartTotal').textContent = `GH₵ ${total}`;
}

function updateCartUI() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  const navBadge = document.getElementById('navCartBadge');
  if (count > 0) {
    navBadge.textContent = count;
    navBadge.classList.remove('hidden');
  } else {
    navBadge.classList.add('hidden');
  }
  updateDetailCartBadge();
}

function updateDetailCartBadge() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  const badge = document.getElementById('detailCartBadge');
  if (!badge) return;
  badge.textContent = count;
  count > 0 ? badge.classList.remove('hidden') : badge.classList.add('hidden');
}



/* ── MENU ─────────────────────────────────────── */
function initMenu() {
  document.getElementById('menuBtn').addEventListener('click', openMenu);
  document.getElementById('menuBack').addEventListener('click', closeMenu);
}

function openMenu() {
  const menu = document.getElementById('menuPage');
  menu.classList.remove('hidden');
  requestAnimationFrame(() => menu.classList.add('visible'));
}

function closeMenu() {
  const menu = document.getElementById('menuPage');
  menu.classList.remove('visible');
  setTimeout(() => menu.classList.add('hidden'), 350);
}

/* ── ABOUT PAGE ───────────────────────────────── */
function initAbout() {
  document.getElementById('aboutBack').addEventListener('click', closeAbout);
}

function openAbout() {
  const page = document.getElementById('aboutPage');
  page.classList.remove('hidden');
  requestAnimationFrame(() => page.classList.add('visible'));
}

function closeAbout() {
  const page = document.getElementById('aboutPage');
  page.classList.remove('visible');
  setTimeout(() => page.classList.add('hidden'), 350);
}

/* ── CONTACT PAGE ─────────────────────────────── */
function initContact() {
  document.getElementById('contactBack').addEventListener('click', closeContact);
}

function openContact() {
  const page = document.getElementById('contactPage');
  page.classList.remove('hidden');
  requestAnimationFrame(() => page.classList.add('visible'));
}

function closeContact() {
  const page = document.getElementById('contactPage');
  page.classList.remove('visible');
  setTimeout(() => page.classList.add('hidden'), 350);
}


