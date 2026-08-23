const CONFIG={SUPABASE_URL:"https://uvvbugnapdxnarartxvy.supabase.co",SUPABASE_ANON_KEY:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2dmJ1Z25hcGR4bmFyYXJ0eHZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NjkyNzUsImV4cCI6MjEwMzA0NTI3NX0.W_3xAz8rw6MzGbxc0gqMfM_cZA5SRvw2vB80QForuMU"};
const sb=supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY);
const $=s=>document.querySelector(s), money=n=>new Intl.NumberFormat("fa-IR").format(Math.round(Number(n)||0))+" تومان",num=n=>new Intl.NumberFormat("fa-IR").format(Number(n)||0);
let allProducts=[],allOrders=[],editingImageUrl="";

document.addEventListener("DOMContentLoaded",async()=>{bind();if(CONFIG.SUPABASE_URL.includes("YOUR_")){$("#loginView").classList.remove("hidden");return}const {data:{session}}=await sb.auth.getSession();if(session)await enterApp(session);});
function bind(){
 $("#loginForm").onsubmit=login;$("#logoutBtn").onclick=logout;$("#newProductBtn").onclick=()=>openProduct();
 $("#productForm").onsubmit=saveProduct;$("#productImage").onchange=previewImage;
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
async function refresh(){await Promise.all([loadProducts(),loadOrders()]);renderStats()}
async function loadProducts(){const {data,error}=await sb.from("products").select("*").order("created_at",{ascending:false});if(error)return toast(error.message);allProducts=data||[];renderProducts()}
async function loadOrders(){const {data,error}=await sb.from("orders").select("*").order("created_at",{ascending:false});if(error)return toast(error.message);allOrders=data||[];renderOrders()}
function renderStats(){const sales=allOrders.filter(o=>o.status!=="لغو شده").reduce((a,o)=>a+Number(o.final_total),0),newOrders=allOrders.filter(o=>o.status==="ثبت شده").length,low=allProducts.filter(p=>Number(p.stock)<=5).length;$("#statsGrid").innerHTML=`<div class="stat"><small>تعداد محصولات</small><strong>${num(allProducts.length)}</strong></div><div class="stat"><small>تعداد سفارش‌ها</small><strong>${num(allOrders.length)}</strong></div><div class="stat"><small>مجموع فروش</small><strong>${money(sales)}</strong></div><div class="stat"><small>سفارش جدید / کم‌موجودی</small><strong>${num(newOrders)} / ${num(low)}</strong></div>`}
function renderProducts(){const q=($("#adminSearch").value||"").toLowerCase();const list=allProducts.filter(p=>p.name.toLowerCase().includes(q));$("#adminProducts").innerHTML=list.map(p=>`<div class="admin-product"><img src="${p.image_url||'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2255%22 height=%2255%22%3E%3Ctext x=%2250%25%22 y=%2255%25%22 text-anchor=%22middle%22 font-size=%2225%22%3E🧺%3C/text%3E%3C/svg%3E'}" alt=""><div><h3>${esc(p.name)}</h3><small>${esc(p.unit)} · تخفیف ${num(calcDiscount(p.consumer_price,p.store_price))}٪</small></div><div class="admin-price">${money(p.store_price)}</div><div class="admin-stock">موجودی: ${num(p.stock)}</div><div class="row-actions"><button class="small-btn" onclick="openProduct('${p.id}')">ویرایش</button><button class="small-btn danger" onclick="deleteProduct('${p.id}')">حذف</button></div></div>`).join("")||'<div class="empty-state">محصولی وجود ندارد.</div>'}
function renderOrders(){const f=$("#statusFilter").value,list=allOrders.filter(o=>!f||o.status===f);$("#adminOrders").innerHTML=list.map(o=>`<div class="admin-order"><div class="admin-order-head"><div><h3>${esc(o.order_number)}</h3><small>${new Date(o.created_at).toLocaleString("fa-IR")}</small></div><strong>${money(o.final_total)}</strong></div><div class="admin-order-body"><div>مشتری<br><b>${esc(o.customer_name)}</b></div><div>موبایل<br><b>${esc(o.phone)}</b></div><div>آدرس<br><b>${esc(o.address)}</b></div></div><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><select onchange="changeStatus('${o.id}',this.value)">${["ثبت شده","تأیید شده","آماده ارسال","در حال ارسال","تحویل شده","لغو شده"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select><a class="small-btn" href="invoice.html?order=${encodeURIComponent(o.order_number)}">مشاهده فاکتور</a></div></div>`).join("")||'<div class="empty-state">سفارشی وجود ندارد.</div>'}
function openProduct(id=null){const f=$("#productForm");f.reset();f.id.value="";editingImageUrl="";$("#imagePreview").innerHTML="";$("#productModalTitle").textContent=id?"ویرایش محصول":"افزودن محصول";if(id){const p=allProducts.find(x=>x.id===id);if(!p)return;for(const k of ["name","unit","consumer_price","store_price","stock","description"])f[k].value=p[k]??"";f.id.value=id;editingImageUrl=p.image_url||"";if(editingImageUrl)$("#imagePreview").innerHTML=`<img src="${editingImageUrl}" alt="">`;updateDiscount()}$("#productMessage").textContent="";$("#productModal").classList.add("open")}
function updateDiscount(){const c=Number(document.querySelector("[name=consumer_price]").value),s=Number(document.querySelector("[name=store_price]").value);$("#discountPreview").textContent=(c>0&&s<=c?num(Math.max(0,Math.round((c-s)/c*100))):"۰")+"٪"}
function previewImage(e){const file=e.target.files[0];if(!file)return;if(file.size>5*1024*1024){$("#productMessage").textContent="حجم عکس باید کمتر از ۵ مگابایت باشد.";e.target.value="";return}const u=URL.createObjectURL(file);$("#imagePreview").innerHTML=`<img src="${u}" alt="پیش‌نمایش">`}
async function saveProduct(e){e.preventDefault();const f=new FormData(e.target),c=Number(f.get("consumer_price")),s=Number(f.get("store_price"));if(s>c){$("#productMessage").textContent="قیمت فروشگاه نمی‌تواند بیشتر از قیمت مصرف‌کننده باشد.";return}const msg=$("#productMessage");msg.textContent="در حال ذخیره...";
 let imageUrl=editingImageUrl;const file=$("#productImage").files[0];
 if(file){const ext=(file.name.split(".").pop()||"jpg").toLowerCase(),path=`${crypto.randomUUID()}.${ext}`;const up=await sb.storage.from("product-images").upload(path,file,{upsert:false,contentType:file.type});if(up.error){msg.textContent="آپلود عکس انجام نشد.";return}const {data}=sb.storage.from("product-images").getPublicUrl(path);imageUrl=data.publicUrl}
 const payload={name:f.get("name").trim(),description:f.get("description").trim(),consumer_price:c,store_price:s,stock:Number(f.get("stock")),unit:f.get("unit").trim(),image_url:imageUrl,updated_at:new Date().toISOString()};
 let result;if(f.get("id"))result=await sb.from("products").update(payload).eq("id",f.get("id"));else result=await sb.from("products").insert(payload);
 if(result.error){msg.textContent=result.error.message;return}$("#productModal").classList.remove("open");await refresh();toast("محصول با موفقیت ذخیره شد")}
async function deleteProduct(id){if(!confirm("این محصول حذف شود؟"))return;const {error}=await sb.from("products").delete().eq("id",id);if(error)toast("حذف انجام نشد");else{await refresh();toast("محصول حذف شد")}}
async function changeStatus(id,status){const {error}=await sb.from("orders").update({status}).eq("id",id);if(error)toast("تغییر وضعیت انجام نشد");else{await loadOrders();renderStats();toast("وضعیت سفارش تغییر کرد")}}
function switchTab(id,b){document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".admin-panel").forEach(x=>x.classList.add("hidden"));$("#"+id).classList.remove("hidden")}
function calcDiscount(c,s){return c>0?Math.max(0,Math.round((c-s)/c*100)):0}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(t){let x=document.createElement("div");x.className="toast";x.textContent=t;document.body.appendChild(x);setTimeout(()=>x.remove(),2500)}
