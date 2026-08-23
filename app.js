const CONFIG={SUPABASE_URL:"https://uvvbugnapdxnarartxvy.supabase.co",SUPABASE_ANON_KEY:"sb_publishable_F8z6hG_34Q4SrTAI_NoZHg_eCD2a_Rn"};
const sb=supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY);
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat("fa-IR").format(Math.round(Number(n)||0))+" تومان";
const num=n=>new Intl.NumberFormat("fa-IR").format(Number(n)||0);
const discount=(c,s)=>c>0?Math.max(0,Math.round(((c-s)/c)*100)):0;
let products=[],cart=JSON.parse(localStorage.getItem("grocery_cart")||"[]"),activeFilter="all";

document.addEventListener("DOMContentLoaded",async()=>{bindUI();await loadProducts();renderCart();});
function bindUI(){
  $("#searchInput").addEventListener("input",renderProducts);
  document.querySelectorAll(".pill").forEach(b=>b.onclick=()=>{document.querySelectorAll(".pill").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeFilter=b.dataset.filter;renderProducts()});
  $("#cartBtn").onclick=openCart;$("#closeCart").onclick=closeCart;$("#drawerOverlay").onclick=closeCart;
  $("#checkoutBtn").onclick=()=>{if(!cart.length)return toast("سبد خرید خالی است");$("#checkoutModal").classList.add("open");renderCheckoutSummary()};
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).classList.remove("open"));
  $("#checkoutForm").onsubmit=submitOrder;$("#lookupOrders").onclick=lookupOrders;
}
async function loadProducts(){
  if(CONFIG.SUPABASE_URL.includes("YOUR_")){products=demoProducts();renderProducts();return}
  const {data,error}=await sb.from("products").select("*").order("created_at",{ascending:false});
  if(error){console.error(error);products=demoProducts()}else products=data||[];
  renderProducts();
}
function demoProducts(){return[
{id:"d1",name:"شیر پرچرب",description:"شیر تازه مناسب مصرف روزانه",consumer_price:135900,store_price:109000,stock:18,unit:"بطری",image_url:"",is_popular:true},
{id:"d2",name:"ماست پرچرب",description:"ماست خوش‌طعم خانوادگی",consumer_price:418000,store_price:320000,stock:12,unit:"سطل",image_url:"",is_popular:true},
{id:"d3",name:"برنج هندی دانه بلند",description:"دانه بلند و خوش‌پخت",consumer_price:3300000,store_price:2900000,stock:8,unit:"کیسه",image_url:"",is_new:true},
{id:"d4",name:"چای سیاه",description:"مناسب مصرف روزانه",consumer_price:500000,store_price:450000,stock:20,unit:"بسته",image_url:"",is_new:true},
{id:"d5",name:"آبمیوه انبه",description:"نوشیدنی میوه‌ای",consumer_price:120000,store_price:90000,stock:24,unit:"بطری",image_url:"",is_popular:true},
{id:"d6",name:"بیسکویت کرمدار",description:"تازه و خوش‌طعم",consumer_price:75000,store_price:65000,stock:30,unit:"بسته",image_url:""},
{id:"d7",name:"روغن مایع",description:"مناسب پخت‌وپز روزانه",consumer_price:850000,store_price:790000,stock:9,unit:"بطری",image_url:""},
{id:"d8",name:"رب گوجه‌فرنگی",description:"طعم خانگی",consumer_price:190000,store_price:169000,stock:16,unit:"قوطی",image_url:""}]}
function renderProducts(){
 const q=($("#searchInput").value||"").trim().toLowerCase();
 let list=products.filter(p=>(p.name||"").toLowerCase().includes(q));
 if(activeFilter==="discount")list=list.filter(p=>discount(p.consumer_price,p.store_price)>0);
 if(activeFilter==="popular")list=list.filter(p=>p.is_popular);
 if(activeFilter==="new")list=list.filter(p=>p.is_new);
 $("#productGrid").innerHTML=list.map(card).join("");$("#emptyState").classList.toggle("hidden",!!list.length);
 document.querySelectorAll(".add-btn").forEach(b=>b.onclick=()=>addToCart(b.dataset.id));
}
function card(p){
 const d=discount(p.consumer_price,p.store_price),out=Number(p.stock)<=0;
 const img=p.image_url?`<img src="${escapeAttr(p.image_url)}" alt="${escapeAttr(p.name)}">`:`<div class="placeholder">🧺</div>`;
 return `<article class="product-card"><div class="product-image">${d?`<span class="discount-badge">${num(d)}٪ تخفیف</span>`:""}${img}</div>
 <div class="stock ${out?"out":""}">${out?"ناموجود":`موجودی: ${num(p.stock)} ${escapeHtml(p.unit||"عدد")}`}</div>
 <h3 title="${escapeAttr(p.name)}">${escapeHtml(p.name)}</h3>
 <div class="prices"><div>${d?`<div class="consumer">${money(p.consumer_price)}</div>`:""}<div class="final-price">${money(p.store_price)}</div></div><span class="unit">/ ${escapeHtml(p.unit||"عدد")}</span></div>
 <button class="add-btn" data-id="${p.id}" ${out?"disabled":""}>${out?"ناموجود":"افزودن به سبد"}</button></article>`;
}
function addToCart(id){
 const p=products.find(x=>String(x.id)===String(id));if(!p)return;
 const row=cart.find(x=>String(x.id)===String(id));const qty=(row?.quantity||0)+1;
 if(qty>Number(p.stock)){toast("بیشتر از موجودی محصول نمی‌توانید اضافه کنید");return}
 if(row)row.quantity=qty;else cart.push({id:p.id,quantity:1,name:p.name,store_price:p.store_price,consumer_price:p.consumer_price,unit:p.unit,image_url:p.image_url,stock:p.stock});
 saveCart();renderCart();openCart();
}
function changeQty(id,delta){const r=cart.find(x=>String(x.id)===String(id));if(!r)return;const p=products.find(x=>String(x.id)===String(id));const max=Number(p?.stock??r.stock);r.quantity=Math.max(0,Math.min(max,r.quantity+delta));if(!r.quantity)cart=cart.filter(x=>String(x.id)!==String(id));saveCart();renderCart()}
function removeItem(id){cart=cart.filter(x=>String(x.id)!==String(id));saveCart();renderCart()}
function saveCart(){localStorage.setItem("grocery_cart",JSON.stringify(cart));$("#cartCount").textContent=num(cart.reduce((a,x)=>a+x.quantity,0))}
function renderCart(){
 saveCart();$("#cartItems").innerHTML=cart.length?cart.map(r=>`<div class="cart-row"><div class="cart-thumb">${r.image_url?`<img src="${escapeAttr(r.image_url)}" alt="">`:"🧺"}</div><div><h4>${escapeHtml(r.name)}</h4><div class="qty"><button onclick="changeQty('${r.id}',-1)">−</button><span>${num(r.quantity)}</span><button onclick="changeQty('${r.id}',1)">+</button><button class="small-btn" onclick="removeItem('${r.id}')">حذف</button></div></div><div class="cart-price">${money(r.store_price*r.quantity)}</div></div>`).join(""):`<div class="empty-state">سبد خرید شما خالی است.</div>`;
 $("#cartTotal").textContent=money(cart.reduce((a,x)=>a+x.store_price*x.quantity,0));
}
function renderCheckoutSummary(){
 const sub=cart.reduce((a,x)=>a+x.consumer_price*x.quantity,0),final=cart.reduce((a,x)=>a+x.store_price*x.quantity,0);
 $("#checkoutSummary").innerHTML=`<div>جمع قیمت مصرف‌کننده: <b>${money(sub)}</b></div><div>مجموع تخفیف: <b>${money(sub-final)}</b></div><div>مبلغ نهایی: <b>${money(final)}</b></div>`;
}
async function submitOrder(e){
 e.preventDefault();if(!cart.length)return;
 const fd=new FormData(e.target),msg=$("#checkoutMessage");msg.textContent="در حال ثبت سفارش...";
 const payload={customer_name:String(fd.get("name")).trim(),phone:normalizePhone(fd.get("phone")),address:String(fd.get("address")).trim(),note:String(fd.get("note")||"").trim(),items:cart.map(x=>({product_id:x.id,quantity:x.quantity}))};
 if(CONFIG.SUPABASE_URL.includes("YOUR_")){const fake="ORD-"+Math.floor(10000000+Math.random()*89999999);localStorage.setItem("last_order",JSON.stringify({order_number:fake,...payload,subtotal:cart.reduce((a,x)=>a+x.consumer_price*x.quantity,0),discount_total:cart.reduce((a,x)=>a+(x.consumer_price-x.store_price)*x.quantity,0),final_total:cart.reduce((a,x)=>a+x.store_price*x.quantity,0),created_at:new Date().toISOString(),status:"ثبت شده"}));showInvoice(JSON.parse(localStorage.getItem("last_order")));return}
 const {data,error}=await sb.rpc("create_order",payload);
 if(error){msg.textContent=error.message.includes("stock")?"موجودی یکی از محصولات کافی نیست.":"ثبت سفارش انجام نشد؛ دوباره تلاش کنید.";return}
 cart=[];saveCart();closeCart();$("#checkoutModal").classList.remove("open");location.href="invoice.html?order="+encodeURIComponent(data.order_number);
}
async function lookupOrders(){
 const phone=normalizePhone($("#phoneLookup").value),box=$("#ordersResult");if(!phone){box.innerHTML='<p class="form-message">شماره موبایل را وارد کنید.</p>';return}
 if(CONFIG.SUPABASE_URL.includes("YOUR_")){const o=JSON.parse(localStorage.getItem("last_order")||"null");box.innerHTML=o&&normalizePhone(o.phone)===phone?orderCard(o):'<div class="empty-state">سفارشی برای این شماره پیدا نشد.</div>';return}
 const {data,error}=await sb.rpc("lookup_orders",{customer_phone:phone});
 if(error||!data?.length){box.innerHTML='<div class="empty-state">سفارشی برای این شماره پیدا نشد.</div>';return}
 box.innerHTML=data.map(orderCard).join("");
}
function orderCard(o){return `<div class="order-card"><div><strong>${escapeHtml(o.order_number)}</strong><small style="display:block;color:#89918c">${new Date(o.created_at).toLocaleString("fa-IR")}</small></div><b>${money(o.final_total)}</b><span class="status">${escapeHtml(o.status)}</span><a class="outline-btn" href="invoice.html?order=${encodeURIComponent(o.order_number)}">فاکتور</a></div>`}
function showInvoice(o){location.href="invoice.html?demo=1&order="+encodeURIComponent(o.order_number)}
function openCart(){$("#cartDrawer").classList.add("open");$("#drawerOverlay").classList.add("open")}
function closeCart(){$("#cartDrawer").classList.remove("open");$("#drawerOverlay").classList.remove("open")}
function toast(t){let x=document.createElement("div");x.className="toast";x.textContent=t;document.body.appendChild(x);setTimeout(()=>x.remove(),2500)}
function normalizePhone(v){return String(v||"").replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/\D/g,"")}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escapeAttr(s){return escapeHtml(s)}
