const CONFIG={SUPABASE_URL:"https://uvvbugnapdxnarartxvy.supabase.co",SUPABASE_ANON_KEY:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2dmJ1Z25hcGR4bmFyYXJ0eHZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NjkyNzUsImV4cCI6MjEwMzA0NTI3NX0.W_3xAz8rw6MzGbxc0gqMfM_cZA5SRvw2vB80QForuMU"};
const STORE={name:"فروشگاه معیلی",address:"آران، خیابان زینبیه",phone:"09130321061",eitaa:"https://eitaa.com/moeili",card:"6037998167313518",cardOwner:"ریحانه آزادی مقدم آرانی",receiptId:"@Ali_ak200"};
const sb=supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY);
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat("fa-IR").format(Math.round(Number(n)||0))+" تومان";
const num=n=>new Intl.NumberFormat("fa-IR").format(Number(n)||0);
const discount=(c,s)=>c>0?Math.max(0,Math.round(((c-s)/c)*100)):0;
let products=[],categories=[],cart=JSON.parse(localStorage.getItem("grocery_cart")||"[]"),activeFilter="all",activeCategory="";
let siteSettings={banner_url:"",logo_url:"",shipping_enabled:true,shipping_cost:0};

document.addEventListener("DOMContentLoaded",async()=>{
  bindUI();
  await Promise.all([loadCategories(),loadProducts(),loadSettings()]);
  renderCart();
});

function bindUI(){
  $("#searchInput").addEventListener("input",renderProducts);
  document.querySelectorAll(".pill").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".pill").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); activeFilter=b.dataset.filter; renderProducts();
  });
  $("#closeCart").onclick=closeCart; $("#drawerOverlay").onclick=closeCart;
  $("#checkoutBtn").onclick=()=>{
    if(!cart.length)return toast("سبد خرید خالی است");
    closeCart();
    prefillCheckout();
    $("#checkoutModal").classList.add("open");
    renderDeliveryOptions();
    renderCheckoutSummary();
  };
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).classList.remove("open"));
  $("#checkoutForm").onsubmit=submitOrder;
  $("#trackingForm").onsubmit=trackOrders;
  $("#navHome").onclick=()=>{closeAllSheets();window.scrollTo({top:0,behavior:"smooth"})};
  $("#navSearch").onclick=()=>{closeAllSheets();$("#searchInput").focus();window.scrollTo({top:0,behavior:"smooth"})};
  $("#navOrders").onclick=()=>{closeAllSheets();openAccountSheet("orders")};
  $("#navCart").onclick=()=>{closeAllSheets();openCart()};
  $("#navAccount").onclick=()=>{closeAllSheets();openAccountSheet()};
  $("#openAllCategories").onclick=()=>{closeAllSheets();$("#categorySheet").classList.add("open")};
  $("#closeCategorySheet").onclick=()=>$("#categorySheet").classList.remove("open");
  $("#closeAccountSheet").onclick=()=>$("#accountSheet").classList.remove("open");
  $("#showMoreProducts").onclick=()=>{activeFilter="all";activeCategory="";document.querySelectorAll(".pill").forEach(x=>x.classList.remove("active"));document.querySelector('.pill[data-filter="all"]').classList.add("active");renderProducts(true);window.scrollTo({top:document.querySelector("#products").offsetTop-80,behavior:"smooth"})};
}
function closeAllSheets(){ $("#categorySheet").classList.remove("open"); $("#accountSheet").classList.remove("open"); closeCart(); }

/* ===== دسته‌بندی‌ها ===== */
async function loadCategories(){
  if(CONFIG.SUPABASE_URL.includes("YOUR_")){categories=[];renderCategoryChips();return}
  const {data,error}=await sb.from("categories").select("*").order("sort_order",{ascending:true});
  if(error){console.error(error);categories=[]}else categories=data||[];
  renderCategoryChips();
}
function renderCategoryChips(){
  const wrap=$("#categoryChips"),sheet=$("#categorySheetList");
  const chip=(id,name,color,active)=>`<button class="cat-chip ${active?"active":""}" data-cat="${id}" style="--c:${color||"#16A863"}">${escapeHtml(name)}</button>`;
  const all=chip("","همه محصولات","#16A863",activeCategory==="");
  const list=categories.map(c=>chip(c.id,c.name,c.color,activeCategory===c.id)).join("");
  wrap.innerHTML=all+list;
  sheet.innerHTML=all+list||'<div class="empty-state">هنوز دسته‌بندی‌ای ثبت نشده.</div>';
  const bottom=$("#categoryBottomRow");
  if(bottom) bottom.innerHTML=categories.map(c=>`<button class="category-card" data-bottom-cat="${c.id}"><span class="cat-icon" style="background:${c.color||"#eee"}22">${c.name.slice(0,1)}</span><span>${escapeHtml(c.name)}</span></button>`).join("")||'<div class="empty-state">دسته‌ای ثبت نشده.</div>';
  document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.cat;renderCategoryChips();renderProducts(true);$("#categorySheet").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"})});
  document.querySelectorAll("[data-bottom-cat]").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.bottomCat;renderCategoryChips();renderProducts(true);window.scrollTo({top:document.querySelector("#products").offsetTop-70,behavior:"smooth"})});
}

/* ===== محصولات ===== */
async function loadSettings(){
 const {data,error}=await sb.from("site_settings").select("*");
 if(!error)(data||[]).forEach(x=>siteSettings[x.key]=x.value);
 renderSettings();
}
function renderSettings(){
 const img=$("#heroBannerImage"),hero=$("#heroBanner");
 if(siteSettings.banner_url){img.src=siteSettings.banner_url;hero.classList.add("has-image")}else hero.classList.remove("has-image");
 if(siteSettings.logo_url)document.querySelectorAll(".brand-mark").forEach(x=>x.innerHTML=`<img src="${escapeAttr(siteSettings.logo_url)}" alt="لوگو" style="width:100%;height:100%;object-fit:contain;border-radius:inherit">`);
}
function prefillCheckout(){
  $("#checkoutName").value=localStorage.getItem("moeili_name")||"";
  $("#checkoutPhone").value=localStorage.getItem("moeili_phone")||"";
  $("#checkoutAddress").value=localStorage.getItem("moeili_address")||"";
}
function rememberCustomer(name,phone,address){
  localStorage.setItem("moeili_name",name);
  localStorage.setItem("moeili_phone",phone);
  localStorage.setItem("moeili_address",address);
}

function renderDeliveryOptions(){
 const box=$("#deliveryOptions");if(!box)return;
 const opts=siteSettings.shipping_enabled
  ? `<label class="delivery-option selected"><input type="radio" name="delivery_method" value="pickup" checked> تحویل حضوری از فروشگاه</label><label class="delivery-option"><input type="radio" name="delivery_method" value="delivery"> ارسال به آدرس <small>+ ${money(siteSettings.shipping_cost)}</small></label>`
  : `<label class="delivery-option selected" style="grid-column:1/-1"><input type="radio" name="delivery_method" value="pickup" checked> تحویل حضوری از فروشگاه</label>`;
 box.innerHTML=opts;
 box.querySelectorAll("input").forEach(i=>i.onchange=()=>{box.querySelectorAll(".delivery-option").forEach(x=>x.classList.remove("selected"));i.closest(".delivery-option").classList.add("selected");renderCheckoutSummary()});
}
async function loadProducts(){
  if(CONFIG.SUPABASE_URL.includes("YOUR_")){products=demoProducts();renderProducts();return}
  const {data,error}=await sb.from("products").select("*, product_categories(category_id)").eq("is_visible",true).order("created_at",{ascending:false});
  if(error){console.error(error);products=demoProducts()}else products=(data||[]).map(p=>({...p,category_ids:(p.product_categories||[]).map(x=>x.category_id)}));
  renderProducts();
}
function demoProducts(){return[
{id:"d1",name:"شیر پرچرب",description:"شیر تازه مناسب مصرف روزانه",consumer_price:135900,store_price:109000,stock:18,unit:"بطری",image_url:"",is_popular:true,category_ids:[]},
{id:"d2",name:"ماست پرچرب",description:"ماست خوش‌طعم خانوادگی",consumer_price:418000,store_price:320000,stock:12,unit:"سطل",image_url:"",is_popular:true,category_ids:[]},
{id:"d3",name:"برنج هندی دانه بلند",description:"دانه بلند و خوش‌پخت",consumer_price:3300000,store_price:2900000,stock:8,unit:"کیسه",image_url:"",is_new:true,category_ids:[]},
{id:"d4",name:"چای سیاه",description:"مناسب مصرف روزانه",consumer_price:500000,store_price:450000,stock:20,unit:"بسته",image_url:"",is_new:true,category_ids:[]}]}
function renderProducts(showAll=false){
 const q=($("#searchInput").value||"").trim().toLowerCase();
 let list=products.filter(p=>(p.name||"").toLowerCase().includes(q));
 if(activeFilter==="discount")list=list.filter(p=>discount(p.consumer_price,p.store_price)>0);
 if(activeFilter==="popular")list=list.filter(p=>p.is_popular);
 if(activeFilter==="new")list=list.filter(p=>p.is_new);
 if(activeCategory)list=list.filter(p=>(p.category_ids||[]).includes(activeCategory));
 if(!showAll && list.length>6)list=list.slice(0,6);$("#productGrid").innerHTML=list.map(card).join("");$("#emptyState").classList.toggle("hidden",!!list.length);
 document.querySelectorAll(".add-btn").forEach(b=>b.onclick=()=>addToCart(b.dataset.id));
}
function card(p){
 const d=discount(p.consumer_price,p.store_price),out=Number(p.stock)<=0,sale=p.store_price_enabled!==false,showBadge=p.show_discount_badge!==false;
 const img=p.image_url?`<img src="${escapeAttr(p.image_url)}" alt="${escapeAttr(p.name)}">`:`<div class="placeholder">🧺</div>`;
 return `<article class="product-card"><div class="product-image">${d&&sale&&showBadge?`<span class="discount-badge">${num(d)}٪</span>`:""}${img}</div>
 <div class="stock ${out?"out":""}">${out?"ناموجود":`موجودی: ${num(p.stock)} ${escapeHtml(p.unit||"عدد")}`}</div>
 <h3 title="${escapeAttr(p.name)}">${escapeHtml(p.name)}</h3>
 <div class="prices"><div>${sale&&d?`<div class="consumer">${money(p.consumer_price)}</div>`:""}<div class="final-price">${money(sale?p.store_price:p.consumer_price)}</div></div><span class="unit">/ ${escapeHtml(p.unit||"عدد")}</span></div>
 <button class="add-btn" data-id="${p.id}" ${out?"disabled":""}>${out?"ناموجود":"افزودن به سبد"}</button></article>`;
}
function addToCart(id){
 const p=products.find(x=>String(x.id)===String(id));if(!p)return;
 const row=cart.find(x=>String(x.id)===String(id));const qty=(row?.quantity||0)+1;
 if(qty>Number(p.stock)){toast("بیشتر از موجودی محصول نمی‌توانید اضافه کنید");return}
 if(row)row.quantity=qty;else cart.push({id:p.id,quantity:1,name:p.name,store_price:p.store_price_enabled===false?p.consumer_price:p.store_price,consumer_price:p.consumer_price,unit:p.unit,image_url:p.image_url,stock:p.stock});
 saveCart();renderCart();openCart();
}
function changeQty(id,delta){const r=cart.find(x=>String(x.id)===String(id));if(!r)return;const p=products.find(x=>String(x.id)===String(id));const max=Number(p?.stock??r.stock);r.quantity=Math.max(0,Math.min(max,r.quantity+delta));if(!r.quantity)cart=cart.filter(x=>String(x.id)!==String(id));saveCart();renderCart()}
function removeItem(id){cart=cart.filter(x=>String(x.id)!==String(id));saveCart();renderCart()}
function saveCart(){localStorage.setItem("grocery_cart",JSON.stringify(cart));const n=num(cart.reduce((a,x)=>a+x.quantity,0));$("#navCartCount").textContent=n;$("#navCartCount").classList.toggle("hidden",!cart.length)}
function renderCart(){
 saveCart();$("#cartItems").innerHTML=cart.length?cart.map(r=>`<div class="cart-row"><div class="cart-thumb">${r.image_url?`<img src="${escapeAttr(r.image_url)}" alt="">`:"🧺"}</div><div><h4>${escapeHtml(r.name)}</h4><div class="qty"><button onclick="changeQty('${r.id}',-1)">−</button><span>${num(r.quantity)}</span><button onclick="changeQty('${r.id}',1)">+</button><button class="small-btn" onclick="removeItem('${r.id}')">حذف</button></div></div><div class="cart-price">${money(r.store_price*r.quantity)}</div></div>`).join(""):`<div class="empty-state">سبد خرید شما خالی است.</div>`;
 $("#cartTotal").textContent=money(cart.reduce((a,x)=>a+x.store_price*x.quantity,0));
}
function renderCheckoutSummary(){
 const sub=cart.reduce((a,x)=>a+x.consumer_price*x.quantity,0),final=cart.reduce((a,x)=>a+x.store_price*x.quantity,0);
 $("#checkoutSummary").innerHTML=`<div>جمع قیمت مصرف‌کننده: <b>${money(sub)}</b></div><div>مجموع تخفیف: <b>${money(sub-final)}</b></div><div>مبلغ نهایی: <b>${money(final)}</b></div>`;
}
async function submitOrder(e){
  e.preventDefault();
  if(!cart.length)return;
  const fd=new FormData(e.target),msg=$("#checkoutMessage");
  const phone=normalizePhone(fd.get("phone"));
  const name=String(fd.get("name")||"").trim();
  const address=String(fd.get("address")||"").trim();
  if(!/^09\\d{9}$/.test(phone)){msg.textContent="شماره موبایل باید ۱۱ رقم و با 09 شروع شود.";return}
  if(name.length<2){msg.textContent="نام و نام‌خانوادگی را کامل کنید.";return}
  if(address.length<5){msg.textContent="آدرس دقیق را کامل کنید.";return}
  msg.textContent="در حال ثبت سفارش...";
  const payload={
    customer_name:name, phone, address,
    note:String(fd.get("note")||"").trim(),
    delivery_method:String(fd.get("delivery_method")||"pickup"),
    items:cart.map(x=>({product_id:x.id,quantity:x.quantity}))
  };
  const {data,error}=await sb.rpc("create_order",payload);
  if(error){
    msg.textContent=error.message?.includes("stock")?"موجودی یکی از محصولات کافی نیست.":error.message||"ثبت سفارش انجام نشد؛ دوباره تلاش کنید.";
    return;
  }
  rememberCustomer(name,phone,address);
  cart=[];saveCart();closeCart();$("#checkoutModal").classList.remove("open");
  location.href="invoice.html?order="+encodeURIComponent(data.order_number)+"&phone="+encodeURIComponent(phone);
}

/* ===== پیگیری فاکتورها ===== */
function openAccountSheet(autoTrack=false){
  closeAllSheets();
  $("#accountSheet").classList.add("open");
  const saved=localStorage.getItem("moeili_phone")||"";
  $("#trackingPhone").value=saved;
  $("#trackingInvoice").value="";
  $("#trackingMessage").textContent="";
  if(autoTrack && saved) setTimeout(()=>trackOrders(new Event("submit")),100);
}
async function trackOrders(e){
  e?.preventDefault?.();
  const phone=normalizePhone($("#trackingPhone").value);
  const msg=$("#trackingMessage"),box=$("#myOrders");
  if(!/^09\\d{9}$/.test(phone)){msg.textContent="شماره موبایل معتبر وارد کنید.";box.innerHTML="";return}
  msg.textContent="در حال جستجو...";
  box.innerHTML="";
  const {data,error}=await sb.rpc("lookup_orders_by_phone",{p_phone:phone});
  if(error){msg.textContent=error.message||"خطا در دریافت فاکتورها.";return}
  localStorage.setItem("moeili_phone",phone);
  msg.textContent=data?.length?`${num(data.length)} فاکتور برای این شماره پیدا شد.`:"اطلاعات واردشده با هم مطابقت ندارد.";
  box.innerHTML=(data||[]).map(orderCard).join("")||'<div class="empty-state"><span class="big-emoji">🧾</span>هنوز سفارشی با این شماره ثبت نشده است.</div>';
}
function orderCard(o){
  return `<div class="order-card tracking-order-card">
    <div class="order-card-top">
      <div><span class="invoice-mini-label">فاکتور</span><strong>#${escapeHtml(o.order_number)}</strong><small>${new Date(o.created_at).toLocaleString("fa-IR")}</small></div>
      <span class="status">${escapeHtml(o.status)}</span>
    </div>
    <div class="order-card-bottom"><b>${money(o.final_total)}</b><a class="primary-btn small-btn" href="invoice.html?order=${encodeURIComponent(o.order_number)}&phone=${encodeURIComponent(normalizePhone(o.phone||$("#trackingPhone").value))}">مشاهده فاکتور</a></div>
  </div>`;
}
function openCart(){$("#cartDrawer").classList.add("open");$("#drawerOverlay").classList.add("open")}
function closeCart(){$("#cartDrawer").classList.remove("open");$("#drawerOverlay").classList.remove("open")}
function toast(t){let x=document.createElement("div");x.className="toast";x.textContent=t;document.body.appendChild(x);setTimeout(()=>x.remove(),2500)}

function normalizePhone(v){return String(v||"").replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/\D/g,"")}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escapeAttr(s){return escapeHtml(s)}
