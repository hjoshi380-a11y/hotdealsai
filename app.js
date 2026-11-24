var dealsData = [];

function render() {
  var grid = document.getElementById("dealsGrid");
  if (!dealsData.length) {
    grid.innerHTML = "<div style=\"grid-column:1/-1;text-align:center;padding:48px 20px;color:#64748b;font-weight:600;\">Scanning live deals right now—refresh in 30 seconds!</div>";
    return;
  }
  grid.innerHTML = dealsData.map(function(d) {
    var img = d.image ? "<img src=\"" + d.image + "\" alt=\"\" loading=\"lazy\" />" : "<div style=\"font-size:2.8rem;\">🛍️</div>";
    var price = d.price ? "<div class=\"prices\"><span class=\"price-now\">₹" + d.price + "</span>" + (d.mrp > d.price ? "<span class=\"price-was\">₹" + d.mrp + "</span>" : "") + "</div>" : "";
    return "<div class=\"card\"><div class=\"thumb\"><span class=\"badge-store\">" + (d.store || "Official Store") + "</span><span class=\"badge-off\">" + (d.discount >= 15 ? d.discount + "% OFF" : "EXCLUSIVE DEAL") + "</span>" + img + "</div><div class=\"body\"><div><div class=\"cat-label\">" + (d.category || "Live Drop") + "</div><div class=\"item-title\">" + d.title + "</div></div><div>" + price + "<a href=\"" + d.ek_link + "\" target=\"_blank\" rel=\"noopener\" class=\"deal-btn\">Grab Deal Now →</a></div></div></div>";
  }).join("");
}

fetch("./live_deals.json?v=" + Date.now())
  .then(function(r) { return r.ok ? r.json() : []; })
  .then(function(j) {
    if (Array.isArray(j)) {
      dealsData = j;
      render();
    }
  })
  .catch(function() { render(); });
