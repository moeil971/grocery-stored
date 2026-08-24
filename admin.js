const CONFIG={SUPABASE_URL:"https://uvvbugnapdxnarartxvy.supabase.co",SUPABASE_ANON_KEY:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2dmJ1Z25hcGR4bmFyYXJ0eHZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NjkyNzUsImV4cCI6MjEwMzA0NTI3NX0.W_3xAz8rw6MzGbxc0gqMfM_cZA5SRvw2vB80QForuMU"};
const sb=supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY);
const $=s=>document.querySelector(s), money=n=>new Intl.NumberFormat("fa-IR").format(Math.round(Number(n)||0))+" تومان",num=n=>new Intl.NumberFormat("fa-IR").format(Number(n)||0);
let allProducts=[],allOrders=[],allCategories=[],allCustomers=[],editingImageUrl="";let siteSettings={};

document.addEventListener("DOMContentLoaded",async()=>{bind();if(CONFIG.SUPABASE_URL.includes("YOUR_")){$("#loginView").classList.remove("hidden");return}const {data:{session}}=await sb.auth.getSession();if(session)await enterApp(session);});
function bind(){
 $("#loginForm").onsubmit=login;$("#logoutBtn").onclick=logout;$("#newProductBtn").onclick=()=>openProduct();
 $("#productForm").onsubmit=saveProduct;$("#settingsForm").onsubmit=saveSettings;$("#customersPdfBtn").onclick=printCustomers;$("#productImage").onchange=previewImage;
 $("#categoryForm").onsubmit=addCategory;
 ["consumer_price","store_price"].forEach(n=>document.querySelector(`[name=${n}]`).oninput=updateDiscount);
 $("#adminSearch").oninput=renderProducts;$("#statusFilter").onchange=renderOrders;
 document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).classList.remove("open"));
 document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab,b));
}
async function login(e){e.preventDefault();if(CONFIG.SUPABASE_URL.includes("YOUR_")){$("#loginMessage").textContent="ابتدا Supabase URL و Anon Key را در admin.js قرار دهید.";return}const f=new FormData(e.target);const {data,error}=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});if(error){
  console.error("Supabase login error:", error);
  $("#loginMessage").textContent = `خطای ورود: ${error.message || "خطای نامشخص"} (کد: ${error.status || "—"})`;
  return
}await enterApp(data.session)}
async function enterApp(session){
 const {data:admin}=await sb.from("admins").select("user_id").eq("user_id",session.user.id).maybeSingle();
 if(!admin){await sb.auth.signOut();$("#loginMessage").textContent="این حساب دسترسی مدیر ندارد.";return}
 $("#loginView").classList.add("hidden");$("#adminApp").classList.remove("hidden");$("#adminEmail").textContent=session.user.email;await refresh();
}
async function logout(){await sb.auth.signOut();location.reload()}
async function refresh(){await Promise.all([loadProducts(),loadOrders(),loadCategories(),loadCustomers(),loadSettings()]);renderStats()}
async function loadCategories(){const {data,error}=await sb.from("categories").select("*").order("sort_order",{ascending:true});if(error)return toast(error.message);allCategories=data||[];renderCategoryManager();renderProductCatChecks()}
async function loadProducts(){const {data,error}=await sb.from("products").select("*, product_categories(category_id)").order("created_at",{ascending:false});if(error)return toast(error.message);allProducts=(data||[]).map(p=>({...p,category_ids:(p.product_categories||[]).map(x=>x.category_id)}));renderProducts()}
async function loadOrders(){const {data,error}=await sb.from("orders").select("*").order("created_at",{ascending:false});if(error)return toast(error.message);allOrders=data||[];renderOrders()}
async function loadCustomers(){const {data,error}=await sb.rpc("get_all_customers");if(error){console.error(error);allCustomers=[]}else allCustomers=data||[];renderCustomers()}
async function loadSettings(){const {data,error}=await sb.from("site_settings").select("*");if(!error)(data||[]).forEach(x=>siteSettings[x.key]=x.value);const f=$("#settingsForm");if(f){f.shipping_cost.value=Number(siteSettings.shipping_cost||0);f.shipping_enabled.checked=siteSettings.shipping_enabled!=="false";}}
function renderCustomers(){
 const box=$("#customersList");if(!box)return;
 box.innerHTML=allCustomers.map(c=>`<div class="customer-card"><div class="customer-head"><div><strong>${esc(c.full_name||"بدون نام")}</strong><small style="display:block">${esc(c.phone)}</small></div><span class="status">${num(c.order_count)} سفارش</span></div><small>آدرس: ${esc(c.address||"ثبت نشده")}</small></div>`).join("")||'<div class="empty-state">هنوز مشتری ثبت نشده است.</div>';
}
async function uploadSettingImage(file,key){
 if(!file)return null;
 const ext=(file.name.split(".").pop()||"jpg").toLowerCase(),path=`settings/${key}-${crypto.randomUUID()}.${ext}`;
 const up=await sb.storage.from("product-images").upload(path,file,{upsert:false,contentType:file.type});
 if(up.error)throw up.error;
 return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
async function saveSettings(e){
 e.preventDefault();const msg=$("#settingsMessage");msg.textContent="در حال ذخیره...";
 try{
  const f=new FormData(e.target);
  const banner=await uploadSettingImage($("#bannerImage").files[0],"banner");
  const logo=await uploadSettingImage($("#logoImage").files[0],"logo");
  const values={shipping_cost:String(Number(f.get("shipping_cost")||0)),shipping_enabled:f.get("shipping_enabled")?"true":"false"};
  if(banner)values.banner_url=banner;if(logo)values.logo_url=logo;
  for(const [key,value] of Object.entries(values))await sb.from("site_settings").upsert({key,value,updated_at:new Date().toISOString()});
  await loadSettings();msg.textContent="تنظیمات ذخیره شد.";toast("تنظیمات ذخیره شد");
 }catch(err){msg.textContent=err.message||"ذخیره تنظیمات انجام نشد."}
}
function printCustomers(){
 const rows=allCustomers.map(c=>`<tr><td>${esc(c.full_name)}</td><td>${esc(c.phone)}</td><td>${esc(c.address)}</td><td>${num(c.order_count)}</td></tr>`).join("");
 const w=window.open("","_blank");if(!w)return;
 w.document.write(`<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>لیست مشتریان فروشگاه معیلی</title><style>body{font-family:Arial,sans-serif;padding:24px}h1{text-align:center}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:right}</style></head><body><h1>لیست مشتریان فروشگاه معیلی</h1><p>تعداد مشتریان: ${num(allCustomers.length)}</p><table><thead><tr><th>نام</th><th>موبایل</th><th>آدرس</th><th>تعداد سفارش</th></tr></thead><tbody>${rows}</tbody></table><script>window.print()</script></body></html>`);w.document.close();
}
function renderStats(){const sales=allOrders.filter(o=>o.status!=="لغو شده").reduce((a,o)=>a+Number(o.final_total),0),newOrders=allOrders.filter(o=>o.status==="ثبت شده").length,low=allProducts.filter(p=>Number(p.stock)<=5).length;$("#statsGrid").innerHTML=`<div class="stat"><small>تعداد محصولات</small><strong>${num(allProducts.length)}</strong></div><div class="stat"><small>تعداد سفارش‌ها</small><strong>${num(allOrders.length)}</strong></div><div class="stat"><small>مجموع فروش</small><strong>${money(sales)}</strong></div><div class="stat"><small>سفارش جدید / کم‌موجودی</small><strong>${num(newOrders)} / ${num(low)}</strong></div>`}
function renderProducts(){const q=($("#adminSearch").value||"").toLowerCase();const list=allProducts.filter(p=>p.name.toLowerCase().includes(q));$("#adminProducts").innerHTML=list.map(p=>`<div class="admin-product"><img src="${p.image_url||'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2255%22 height=%2255%22%3E%3Ctext x=%2250%25%22 y=%2255%25%22 text-anchor=%22middle%22 font-size=%2225%22%3E🧺%3C/text%3E%3C/svg%3E'}" alt=""><div><h3>${esc(p.name)}</h3><small>${esc(p.unit)} · تخفیف ${num(calcDiscount(p.consumer_price,p.store_price))}٪</small>${productCatTags(p)}</div><div class="admin-price">${money(p.store_price_enabled===false?p.consumer_price:p.store_price)}</div><div class="admin-stock">موجودی: ${num(p.stock)} · ${p.is_visible===false?"مخفی":"منتشر"}</div><div class="row-actions"><button class="eye-btn" title="نمایش/مخفی" onclick="toggleVisibility('${p.id}',${p.is_visible!==false})">${p.is_visible===false?"🙈":"👁"}</button><button class="small-btn" onclick="openProduct('${p.id}')">ویرایش</button><button class="small-btn danger" onclick="deleteProduct('${p.id}')">حذف</button></div></div>`).join("")||'<div class="empty-state">محصولی وجود ندارد.</div>'}
function productCatTags(p){const cats=(p.category_ids||[]).map(id=>allCategories.find(c=>c.id===id)).filter(Boolean);if(!cats.length)return"";return `<div class="cat-tags">${cats.map(c=>`<span style="background:${c.color}">${esc(c.name)}</span>`).join("")}</div>`}
function renderCategoryManager(){$("#categoryManager").innerHTML=allCategories.map(c=>`<div class="category-row"><span class="dot" style="background:${c.color}"></span><input type="text" value="${esc(c.name)}" onchange="renameCategory('${c.id}',this.value)"><input type="color" value="${c.color}" onchange="recolorCategory('${c.id}',this.value)"><button class="small-btn danger" onclick="deleteCategory('${c.id}')">حذف</button></div>`).join("")||'<div class="empty-state">هنوز دسته‌بندی‌ای ثبت نکرده‌اید.</div>'}
async function addCategory(e){e.preventDefault();const f=new FormData(e.target),name=String(f.get("name")).trim(),color=f.get("color");if(!name)return;const {error}=await sb.from("categories").insert({name,color,sort_order:allCategories.length});const msg=$("#categoryMessage");if(error){msg.textContent=error.message;return}msg.textContent="";e.target.reset();$("#newCategoryColor").value="#FF5A1F";await loadCategories();toast("دسته‌بندی اضافه شد")}
async function renameCategory(id,name){name=name.trim();if(!name)return;const {error}=await sb.from("categories").update({name}).eq("id",id);if(error)toast(error.message);else await loadCategories()}
async function recolorCategory(id,color){const {error}=await sb.from("categories").update({color}).eq("id",id);if(error)toast(error.message);else await loadCategories()}
async function deleteCategory(id){if(!confirm("این دسته‌بندی حذف شود؟ محصولات مربوطه از این دسته خارج می‌شوند."))return;const {error}=await sb.from("categories").delete().eq("id",id);if(error)toast("حذف انجام نشد");else{await Promise.all([loadCategories(),loadProducts()]);toast("دسته‌بندی حذف شد")}}
function renderProductCatChecks(selectedIds=[]){$("#productCatChecks").innerHTML=allCategories.map(c=>`<label><input type="checkbox" value="${c.id}" ${selectedIds.includes(c.id)?"checked":""}><span class="dot" style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${c.color}"></span>${esc(c.name)}</label>`).join("")||'<small style="color:var(--ink-soft)">ابتدا از تب «دسته‌بندی‌ها» یک دسته اضافه کنید.</small>'}
function renderOrders(){const f=$("#statusFilter").value,list=allOrders.filter(o=>!f||o.status===f);$("#adminOrders").innerHTML=list.map(o=>`<div class="admin-order"><div class="admin-order-head"><div><h3>${esc(o.order_number)}</h3><small>${new Date(o.created_at).toLocaleString("fa-IR")}</small></div><strong>${money(o.final_total)}</strong></div><div class="admin-order-body"><div>مشتری<br><b>${esc(o.customer_name)}</b></div><div>موبایل<br><b>${esc(o.phone)}</b></div><div>آدرس<br><b>${esc(o.address)}</b></div></div><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><select onchange="changeStatus('${o.id}',this.value)">${["ثبت شده","تأیید شده","آماده ارسال","در حال ارسال","تحویل شده","لغو شده"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select><a class="small-btn" href="invoice.html?order=${encodeURIComponent(o.order_number)}">مشاهده فاکتور</a></div></div>`).join("")||'<div class="empty-state">سفارشی وجود ندارد.</div>'}
function openProduct(id=null){const f=$("#productForm");f.reset();f.id.value="";editingImageUrl="";$("#imagePreview").innerHTML="";$("#productModalTitle").textContent=id?"ویرایش محصول":"افزودن محصول";let selectedCats=[];if(id){const p=allProducts.find(x=>x.id===id);if(!p)return;for(const k of ["name","unit","consumer_price","store_price","stock","description"])f[k].value=p[k]??"";f.is_visible.checked=p.is_visible!==false;f.show_discount_badge.checked=p.show_discount_badge!==false;f.store_price_enabled.checked=p.store_price_enabled!==false;f.is_popular.checked=!!p.is_popular;f.id.value=id;editingImageUrl=p.image_url||"";selectedCats=p.category_ids||[];if(editingImageUrl)$("#imagePreview").innerHTML=`<img src="${editingImageUrl}" alt="">`;updateDiscount()}renderProductCatChecks(selectedCats);$("#productMessage").textContent="";$("#productModal").classList.add("open")}
function updateDiscount(){const c=Number(document.querySelector("[name=consumer_price]").value),s=Number(document.querySelector("[name=store_price]").value);$("#discountPreview").textContent=(c>0&&s<=c?num(Math.max(0,Math.round((c-s)/c*100))):"۰")+"٪"}
function previewImage(e){const file=e.target.files[0];if(!file)return;if(file.size>5*1024*1024){$("#productMessage").textContent="حجم عکس باید کمتر از ۵ مگابایت باشد.";e.target.value="";return}const u=URL.createObjectURL(file);$("#imagePreview").innerHTML=`<img src="${u}" alt="پیش‌نمایش">`}
async function saveProduct(e){e.preventDefault();const f=new FormData(e.target),c=Number(f.get("consumer_price")),s=Number(f.get("store_price"));if(s>c){$("#productMessage").textContent="قیمت فروشگاه نمی‌تواند بیشتر از قیمت مصرف‌کننده باشد.";return}const msg=$("#productMessage");msg.textContent="در حال ذخیره...";
 let imageUrl=editingImageUrl;const file=$("#productImage").files[0];
 if(file){const ext=(file.name.split(".").pop()||"jpg").toLowerCase(),path=`${crypto.randomUUID()}.${ext}`;const up=await sb.storage.from("product-images").upload(path,file,{upsert:false,contentType:file.type});if(up.error){msg.textContent="آپلود عکس انجام نشد.";return}const {data}=sb.storage.from("product-images").getPublicUrl(path);imageUrl=data.publicUrl}
 const payload={name:f.get("name").trim(),description:f.get("description").trim(),consumer_price:c,store_price:s,stock:Number(f.get("stock")),unit:f.get("unit").trim(),image_url:imageUrl,is_visible:f.get("is_visible")==="on",show_discount_badge:f.get("show_discount_badge")==="on",store_price_enabled:f.get("store_price_enabled")==="on",is_popular:f.get("is_popular")==="on",updated_at:new Date().toISOString()};
 let productId=f.get("id");
 let result;if(productId)result=await sb.from("products").update(payload).eq("id",productId);else{result=await sb.from("products").insert(payload).select().single()}
 if(result.error){msg.textContent=result.error.message;return}
 if(!productId)productId=result.data.id;
 const selectedCats=[...document.querySelectorAll('#productCatChecks input:checked')].map(x=>x.value);
 await sb.from("product_categories").delete().eq("product_id",productId);
 if(selectedCats.length)await sb.from("product_categories").insert(selectedCats.map(category_id=>({product_id:productId,category_id})));
 $("#productModal").classList.remove("open");await refresh();toast("محصول با موفقیت ذخیره شد")}
async function toggleVisibility(id,current){const {error}=await sb.from("products").update({is_visible:!current}).eq("id",id);if(error)toast("تغییر وضعیت نمایش انجام نشد");else{await loadProducts();toast(!current?"محصول منتشر شد":"محصول مخفی شد")}}
async function deleteProduct(id){if(!confirm("این محصول حذف شود؟"))return;const {error}=await sb.from("products").delete().eq("id",id);if(error)toast("حذف انجام نشد");else{await refresh();toast("محصول حذف شد")}}
async function changeStatus(id,status){const {error}=await sb.from("orders").update({status}).eq("id",id);if(error)toast("تغییر وضعیت انجام نشد");else{await loadOrders();renderStats();toast("وضعیت سفارش تغییر کرد")}}
function switchTab(id,b){document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".admin-panel").forEach(x=>x.classList.add("hidden"));$("#"+id).classList.remove("hidden")}
function calcDiscount(c,s){return c>0?Math.max(0,Math.round((c-s)/c*100)):0}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(t){let x=document.createElement("div");x.className="toast";x.textContent=t;document.body.appendChild(x);setTimeout(()=>x.remove(),2500)}
