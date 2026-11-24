var activeCat = 'all';
var dealsData = [];

function checkCat(catStr, key) {
  var c = (catStr || '').toLowerCase();
  if (key === 'all') return true;
  if (key === 'women-fashion') return c.indexOf('women') !== -1 && c.indexOf('fashion') !== -1;
  if (key === 'men-fashion') return c.indexOf('men') !== -1 && c.indexOf('women') === -1 && c.indexOf('fashion') !== -1;
  if (key === 'footwear') return c.indexOf('footwear') !== -1;
  if (key === 'beauty') return c.indexOf('beauty') !== -1 || c.indexOf('cosmetic') !== -1;
  if (key === 'electronics') return c.indexOf('electronic') !== -1 || c.indexOf('gadget') !== -1;
  if (key === 'home') return c.indexOf('home') !== -1 || c.indexOf('kitchen') !== -1;
  if (key === 'kids') return c.indexOf('kid') !== -1 || c.indexOf('accessor') !== -1;
  return true;
}

function render() {
  var q = document.getElementById('searchBox').value.trim().toLowerCase();
  var list = dealsData.filter(function(item) {
    return checkCat(item.category, activeCat) && (!q || (item.title || '').toLowerCase().indexOf(q) !== -1 || (item.store || '').toLowerCase().indexOf(q) !== -1);
  });
  var grid = document.getElementById('dealsGrid');
  if (!list.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#64748b;">No active drops in this category yet—check <b>All Deals</b> or check back in 30 minutes!</div>';
    return;
  }
  grid.innerHTML = list.map(function(d) {
    var img = d.image ? '<img src="' + d.image + '" alt="" loading="lazy" />' : '<div class="thumb-placeholder">🛍️</div>';
    var price = d.price ? '<div class="prices"><span class="price-now">₹' + d.price + '</span>' + (d.mrp > d.price ? '<span class="price-was">₹' + d.mrp + '</span>' : '') + '</div>' : '';
    return '<div class="card"><div class="thumb"><span class="badge-store">' + (d.store || 'Store') + '</span><span class="badge-off">' + (d.discount >= 15 ? d.discount + '% OFF' : 'HOT DEAL') + '</span>' + img + '</div><div class="body"><div><div class="cat-label">' + d.category + '</div><div class="item-title">' + d.title + '</div></div><div>' + price + '<a href="' + d.ek_link + '" target="_blank" rel="noopener" class="deal-btn">Grab Deal Now →</a></div></div></div>';
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

fetch('./live_deals.json?v=' + Date.now())
  .then(function(r) { return r.ok ? r.json() : []; })
  .then(function(j) {
    if (Array.isArray(j)) {
      dealsData = j;
      render();
    }
  })
  .catch(function() { render(); });
