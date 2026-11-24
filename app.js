var minDiscount = 0;
var dealsData = [];

function render() {
  var list = dealsData
    .filter(function(item) { return (Number(item.discount) || 0) >= minDiscount; })
    .sort(function(a, b) { return (Number(b.discount) || 0) - (Number(a.discount) || 0); });

  var grid = document.getElementById("dealsGrid");
  if (!list.length) {
    grid.innerHTML = "<div style=\"grid-column:1/-1;text-align:center;padding:48px 20px;color:#64748b;font-weight:600;\">No deals in this discount slab right now—tap <b>All Live Deals</b> to view active drops!</div>";
    return;
  }
  grid.innerHTML = list.map(function(d) {
    var disc = Number(d.discount) || 0;
    var img = d.image ? "<img src=\"" + d.image + "\" alt=\"\" loading=\"lazy\" />" : "<div style=\"font-size:2.8rem;\">🛍️</div>";
    var price = d.price ? "<div class=\"prices\"><span class=\"price-now\">₹" + d.price + "</span>" + (d.mrp > d.price ? "<span class=\"price-was\">₹" + d.mrp + "</span>" : "") + "</div>" : "";
    return "<div class=\"card\"><div class=\"thumb\"><span class=\"badge-store\">" + (d.store || "Official Store") + "</span><span class=\"badge-off\">" + (disc >= 10 ? disc + "% OFF" : "VERIFIED DEAL") + "</span>" + img + "</div><div class=\"body\"><div><div class=\"cat-label\">" + (d.category || "Brand Deal") + "</div><div class=\"item-title\">" + d.title + "</div></div><div>" + price + "<a href=\"" + d.ek_link + "\" target=\"_blank\" rel=\"noopener\" class=\"deal-btn\">Grab Deal Now →</a></div></div></div>";
  }).join("");
}

document.querySelectorAll(".tab").forEach(function(btn) {
  btn.addEventListener("click", function() {
    minDiscount = Number(this.getAttribute("data-min")) || 0;
    document.querySelectorAll(".tab").forEach(function(b) { b.classList.remove("active"); });
    this.classList.add("active");
    render();
  });
});

fetch("./live_deals.json?v=" + Date.now())
  .then(function(r) { return r.ok ? r.json() : []; })
  .then(function(j) {
    if (Array.isArray(j)) {
      dealsData = j;
      render();
    }
  })
  .catch(function() { render(); });
