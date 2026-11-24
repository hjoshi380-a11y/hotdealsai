var activeCat = "all";
var dealsData = [
  { category: "Women's Fashion", title: "Myntra Festive & Casual Kurtas — Flat 50%–75% Off", price: 599, mrp: 1999, discount: 70, store: "Myntra", image: "", ek_link: "https://t.me" },
  { category: "Men's Fashion", title: "Branded Casual Shirts, Polos & Denim Drop", price: 649, mrp: 1899, discount: 65, store: "Ajio", image: "", ek_link: "https://t.me" },
  { category: "Electronics & Gadgets", title: "boAt & Noise TWS Earbuds / Smartwatches Loot", price: 899, mrp: 2999, discount: 70, store: "Flipkart", image: "", ek_link: "https://t.me" },
  { category: "Beauty & Grooming", title: "Nykaa & The Man Company Bestsellers Combo Drop", price: 349, mrp: 899, discount: 61, store: "Nykaa", image: "", ek_link: "https://t.me" },
  { category: "Men's Footwear", title: "Everyday Running Shoes & Sneakers Clearance", price: 849, mrp: 2499, discount: 66, store: "Myntra", image: "", ek_link: "https://t.me" },
  { category: "Home & Kitchen", title: "Smart Kitchen Organizers & Insulated Flasks", price: 399, mrp: 1199, discount: 67, store: "Amazon", image: "", ek_link: "https://t.me" }
];

function checkCat(catStr, key) {
  var c = (catStr || "").toLowerCase();
  if (key === "all") return true;
  if (key === "women-fashion") return c.indexOf("women") !== -1 && c.indexOf("fashion") !== -1;
  if (key === "men-fashion") return c.indexOf("men") !== -1 && c.indexOf("women") === -1 && c.indexOf("fashion") !== -1;
  if (key === "footwear") return c.indexOf("footwear") !== -1;
  if (key === "beauty") return c.indexOf("beauty") !== -1 || c.indexOf("cosmetic") !== -1;
  if (key === "electronics") return c.indexOf("electronic") !== -1 || c.indexOf("gadget") !== -1;
  if (key === "home") return c.indexOf("home") !== -1 || c.indexOf("kitchen") !== -1;
  if (key === "kids") return c.indexOf("kid") !== -1 || c.indexOf("accessor") !== -1;
  return true;
}

function render() {
  var list = dealsData.filter(function(item) { return checkCat(item.category, activeCat); });
  var grid = document.getElementById("dealsGrid");
  if (!list.length) {
    grid.innerHTML = "<div style=\"grid-column:1/-1;text-align:center;padding:48px 20px;color:#64748b;font-weight:600;\">Fresh deals for this category are syncing in the next scan—check <b>All Live Deals</b>!</div>";
    return;
  }
  grid.innerHTML = list.map(function(d) {
    var img = d.image ? "<img src=\"" + d.image + "\" alt=\"\" loading=\"lazy\" />" : "<div style=\"font-size:2.8rem;\">🛍️</div>";
    var price = d.price ? "<div class=\"prices\"><span class=\"price-now\">₹" + d.price + "</span>" + (d.mrp > d.price ? "<span class=\"price-was\">₹" + d.mrp + "</span>" : "") + "</div>" : "";
    return "<div class=\"card\"><div class=\"thumb\"><span class=\"badge-store\">" + (d.store || "Official Store") + "</span><span class=\"badge-off\">" + (d.discount >= 15 ? d.discount + "% OFF" : "EXCLUSIVE DEAL") + "</span>" + img + "</div><div class=\"body\"><div><div class=\"cat-label\">" + d.category + "</div><div class=\"item-title\">" + d.title + "</div></div><div>" + price + "<a href=\"" + d.ek_link + "\" target=\"_blank\" rel=\"noopener\" class=\"deal-btn\">Grab Deal Now →</a></div></div></div>";
  }).join("");
}

document.querySelectorAll(".tab").forEach(function(btn) {
  btn.addEventListener("click", function() {
    activeCat = this.getAttribute("data-cat");
    document.querySelectorAll(".tab").forEach(function(b) { b.classList.remove("active"); });
    this.classList.add("active");
    render();
  });
});

render();

fetch("./live_deals.json?v=" + Date.now())
  .then(function(r) { return r.ok ? r.json() : []; })
  .then(function(j) {
    if (Array.isArray(j) && j.length > 0) {
      dealsData = j;
      render();
    }
  })
  .catch(function() {});
