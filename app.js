var activeCat = 'all';
var dealsData = [
  { category: "Women's Fashion", title: "Festive & Everyday Kurta Sets — Flat 50%–70% Off", price: 699, mrp: 1999, discount: 65, store: "Myntra", image: "", ek_link: "#" },
  { category: "Women's Footwear", title: "Block Heels, Flats & Winter Boots Clearance Drop", price: 549, mrp: 1499, discount: 63, store: "Myntra", image: "", ek_link: "#" },
  { category: "Beauty & Cosmetics", title: "Bestselling Lipsticks, Serums & Skincare Combos", price: 349, mrp: 799, discount: 56, store: "Nykaa", image: "", ek_link: "#" },
  { category: "Men's Footwear", title: "Branded Everyday Sneakers & Running Shoes Drop", price: 999, mrp: 2999, discount: 67, store: "Flipkart", image: "", ek_link: "#" }
];

function checkCat(catStr, key) {
  var c = (catStr || '').toLowerCase();
  if (key === 'all') return true;
  if (key === 'fashion') return c.indexOf('fashion') !== -1 || c.indexOf('exclusive') !== -1;
  if (key === 'women-footwear') return c.indexOf('women') !== -1 && c.indexOf('footwear') !== -1;
  if (key === 'beauty') return c.indexOf('beauty') !== -1 || c.indexOf('cosmetic') !== -1;
  if (key === 'men-footwear') return c.indexOf('men') !== -1 && c.indexOf('women') === -1;
  return true;
}

function render() {
  var q = document.getElementById('searchBox').value.trim().toLowerCase();
  var list = dealsData.filter(function(item) {
    return checkCat(item.category, activeCat) && (!q || (item.title || '').toLowerCase().indexOf(q) !== -1);
  });
  var grid = document.getElementById('dealsGrid');
  if (!list.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#64748b;">No deals in this tab right now—check <b>All Deals</b>!</div>';
    return;
  }
  grid.innerHTML = list.map(function(d) {
    var img = d.image ? '<img src="' + d.image + '" alt="" />' : '<div class="thumb-placeholder">🛍️</div>';
    var price = d.price ? '<div class="prices"><span class="price-now">₹' + d.price + '</span>' + (d.mrp > d.price ? '<span class="price-was">₹' + d.mrp + '</span>' : '') + '</div>' : '';
    return '<div class="card"><div class="thumb"><span class="badge-store">' + (d.store || 'Store') + '</span><span class="badge-off">' + (d.discount >= 15 ? d.discount + '% OFF' : 'HOT DEAL') + '</span>' + img + '</div><div class="body"><div><div class="cat-label">' + d.category + '</div><div class="item-title">' + d.title + '</div></div><div>' + price + '<a href="' + d.ek_link + '" target="_blank" class="deal-btn">Grab Deal Now →</a></div></div></div>';
  }).join('');
}

document.querySelectorAll('.tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    activeCat = this.getAttribute('data-cat');
    document.querySelectorAll('.tab').forEach(function(b) { b.classList.remove('active'); });
    this.classList.add('active');
    render();
  });
});

document.getElementById('searchBox').addEventListener('input', render);
render();

fetch('./live_deals.json?v=' + Date.now())
  .then(function(r) { return r.ok ? r.json() : null; })
  .then(function(j) {
    if (Array.isArray(j) && j.length) {
      dealsData = j;
      render();
    }
  })
  .catch(function() {});
