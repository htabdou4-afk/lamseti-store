/* LAMSETI production frontend. Public publishable key only. Never put a secret/service_role key here. */
(() => {
  const cfg = window.LAMSETI_CONFIG || {};
  const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("YOUR-") &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("YOUR_");
  const supabase = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const $ = id => document.getElementById(id);
  const money = n => `${Number(n || 0).toLocaleString("fr-DZ")} دج`;
  const imageSrc = value => { const src=String(value||"notebooks-set.jpg"); return /^assets\/(?:pink-notebook|blue-notebook|collection|notebooks-set)\.jpg$/.test(src) ? src.slice(7) : src; };
  const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let products = [], settings = {store_name:"LAMSETI", whatsapp:"", order_message:"شكراً لطلبك من LAMSETI.", shipping_note:"يتم تأكيد تكلفة التوصيل حسب الولاية قبل الشحن."};
  let cart = JSON.parse(localStorage.getItem("lamseti_cart") || "[]");
  let currentUser = null, toastTimer;

  function toast(msg) { const el=$("toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),3200); }
  function modal(id, open=true) { $(id).classList.toggle("open",open); $(id).setAttribute("aria-hidden",String(!open)); }
  function requireBackend() { if (!supabase) { toast("تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات الاتصال."); return false; } return true; }
  function saveCart() { localStorage.setItem("lamseti_cart",JSON.stringify(cart)); updateCartCount(); }
  function updateCartCount() { $("cartCount").textContent=cart.reduce((n,x)=>n+x.qty,0); }
  function waUrl(message) { const phone=(settings.whatsapp||"").replace(/\D/g,""); if(!/^213\d{8,9}$/.test(phone)){toast("لم يتم ضبط رقم واتساب المتجر بعد. تم حفظ الطلب ويمكنك ضبط الرقم من إعدادات الإدارة.");return null;} return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`; }
  async function loadSettings() {
    if (!supabase) return;
    const {data,error}=await supabase.from("store_settings").select("*").eq("id",1).maybeSingle();
    if(!error && data) settings={...settings,...data};
    $("footerContact").textContent=settings.shipping_note||"";
  }
  async function loadProducts() {
    if(!supabase) {
      products=[
        {id:"sample-1",name:"دفتر ملاحظاتي الوردي",description:"غلاف مزخرف بالورود والفراشات. يمكن تخصيص الاسم والألوان.",price:450,image_url:"pink-notebook.jpg"},
        {id:"sample-2",name:"دفتر ملاحظاتي الأزرق",description:"تصميم هادئ وأنيق قابل للتعديل حسب الطلب.",price:450,image_url:"blue-notebook.jpg"},
        {id:"sample-3",name:"دفاتر بتصاميم متنوعة",description:"نماذج متعددة للمذكرات والدفاتر الشخصية.",price:500,image_url:"collection.jpg"}
      ];
      renderProducts(); return;
    }
    const {data,error}=await supabase.from("products").select("id,name,description,price,image_url,category").eq("is_active",true).order("created_at",{ascending:false});
    if(error){$("productGrid").innerHTML='<div class="empty">تعذر تحميل المنتجات حالياً. يرجى المحاولة لاحقاً.</div>';console.error(error);return;}
    products=data||[]; renderProducts();
  }
  function renderProducts() {
    $("productGrid").innerHTML=products.length?products.map(p=>`<article class="product-card"><div class="product-image"><img loading="lazy" src="${escapeHtml(imageSrc(p.image_url))}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null;this.src='notebooks-set.jpg'"></div><div class="product-info"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||"منتج من LAMSETI، تواصل معنا لتفاصيل التخصيص.")}</p><div class="product-price">${money(p.price)}</div><button class="btn primary" data-add="${escapeHtml(p.id)}">أضف إلى السلة</button></div></article>`).join(""):'<div class="empty">لا توجد منتجات منشورة حالياً. يمكنك إرسال طلب مخصص.</div>';
  }
  $("productGrid").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(!b)return;const id=b.dataset.add,p=products.find(x=>String(x.id)===String(id));if(!p)return;const line=cart.find(x=>String(x.id)===String(id));if(line)line.qty++;else cart.push({id,qty:1});saveCart();toast("أضيف المنتج إلى السلة.");});
  function openCart() {
    const rows=cart.map(c=>{const p=products.find(x=>String(x.id)===String(c.id));if(!p)return "";return `<div class="cart-line"><div><b>${escapeHtml(p.name)}</b><br><span>${money(p.price)} للوحدة</span></div><div class="qty-controls"><button data-qty="${escapeHtml(p.id)}" data-delta="-1">−</button><b>${c.qty}</b><button data-qty="${escapeHtml(p.id)}" data-delta="1">+</button></div></div>`;}).join("");
    const total=cart.reduce((sum,c)=>sum+(Number(products.find(p=>String(p.id)===String(c.id))?.price)||0)*c.qty,0);
    $("cartContent").innerHTML=`<h2>سلة المشتريات</h2>${rows||'<div class="empty">السلة فارغة حالياً.</div>'}${rows?`<div class="cart-total"><span>المجموع (دون التوصيل)</span><span>${money(total)}</span></div><p class="form-note">${escapeHtml(settings.shipping_note||"يتم تأكيد التوصيل حسب المنطقة.")}</p><form id="checkoutForm"><div class="form-grid"><label>الاسم الكامل *<input name="customer_name" required></label><label>رقم الهاتف *<input name="phone" required type="tel"></label><label>الولاية *<input name="wilaya" required></label><label>البلدية *<input name="city" required></label><label class="full">عنوان التوصيل *<textarea name="address" required rows="2"></textarea></label><label class="full">ملاحظات<textarea name="notes" rows="2"></textarea></label></div><button class="btn primary full-btn">تأكيد الطلب</button></form>`:""}`;
    modal("cartModal");
  }
  $("cartOpen").addEventListener("click",openCart);
  $("cartContent").addEventListener("click",e=>{const b=e.target.closest("[data-qty]");if(!b)return;const id=b.dataset.qty,delta=Number(b.dataset.delta),line=cart.find(x=>String(x.id)===String(id));if(line)line.qty+=delta;cart=cart.filter(x=>x.qty>0);saveCart();openCart();});
  $("cartContent").addEventListener("submit",async e=>{if(e.target.id!=="checkoutForm")return;e.preventDefault();if(!requireBackend())return;const f=Object.fromEntries(new FormData(e.target)),items=cart.map(c=>{const p=products.find(x=>String(x.id)===String(c.id));return {product_id:c.id,name:p?.name,unit_price:p?.price,quantity:c.qty};}),total=items.reduce((s,x)=>s+x.unit_price*x.quantity,0);
    const order={order_type:"cart",customer_name:f.customer_name,phone:f.phone,wilaya:f.wilaya,city:f.city,delivery_address:f.address,notes:f.notes,items,total_amount:total,status:"new"};
    const {data:savedOrder,error}=await supabase.from("orders").insert(order).select("id").single();if(error){toast("تعذر حفظ الطلب. تحقق من الاتصال وحاول مجدداً.");console.error(error);return;}const orderId=savedOrder.id;
    const msg=`طلب جديد من ${settings.store_name}\nرقم الطلب: ${orderId}\n${items.map(x=>`${x.name} × ${x.quantity} = ${money(x.unit_price*x.quantity)}`).join("\n")}\nالمجموع دون التوصيل: ${money(total)}\nالاسم: ${f.customer_name}\nالهاتف: ${f.phone}\nالعنوان: ${f.wilaya} - ${f.city} - ${f.address}\nملاحظات: ${f.notes||"لا يوجد"}`;
    cart=[];saveCart();modal("cartModal",false);toast("تم تسجيل طلبك بنجاح.");const url=waUrl(msg);if(url)window.open(url,"_blank","noopener");
  });
  async function submitCustom(form, type) {
    if(!requireBackend())return;
    const fields=Object.fromEntries(new FormData(form));const common={customer_name:fields.customer_name,phone:fields.phone,wilaya:fields.wilaya,city:fields.city,delivery_address:type==="notebook"?fields.address:fields.delivery_address,order_type:type,custom_details:fields,status:"new"};
    const {data:savedOrder,error}=await supabase.from("orders").insert(common).select("id").single();
    if(error){toast("تعذر إرسال الطلب. حاول مجدداً.");console.error(error);return;}const orderId=savedOrder.id;
    const msg=`طلب مخصص جديد من ${settings.store_name}\nرقم الطلب: ${orderId}\nالنوع: ${type==="notebook"?"دفتر مخصص":"بطاقات أعمال"}\n${Object.entries(fields).map(([k,v])=>`${k}: ${v}`).join("\n")}`;
    form.reset();toast("وصل طلبك بنجاح. سنتواصل معك لتأكيد التفاصيل.");const url=waUrl(msg);if(url)window.open(url,"_blank","noopener");
  }
  $("notebookForm").addEventListener("submit",e=>{e.preventDefault();submitCustom(e.target,"notebook");});
  $("businessForm").addEventListener("submit",e=>{e.preventDefault();submitCustom(e.target,"business_cards");});
  $("menuToggle").addEventListener("click",()=>{const open=$("mainNav").classList.toggle("open");$("menuToggle").setAttribute("aria-expanded",String(open));});
  $("mainNav").addEventListener("click",e=>{if(e.target.closest("a")){$("mainNav").classList.remove("open");$("menuToggle").setAttribute("aria-expanded","false");}});
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>modal(b.dataset.close,false)));
  document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)modal(m.id,false);}));
  $("adminOpen").addEventListener("click",()=>{if(!requireBackend())return;if(currentUser)openAdmin();else modal("authModal");});
  $("loginForm").addEventListener("submit",async e=>{e.preventDefault();if(!requireBackend())return;const f=Object.fromEntries(new FormData(e.target));const {data,error}=await supabase.auth.signInWithPassword({email:f.email,password:f.password});if(error){$("authMessage").textContent="تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.";return;}currentUser=data.user;modal("authModal",false);await openAdmin();});
  $("logoutBtn").addEventListener("click",async()=>{await supabase.auth.signOut();currentUser=null;modal("adminModal",false);toast("تم تسجيل الخروج.");});
  async function isAdmin(){if(!currentUser)return false;const {data,error}=await supabase.from("profiles").select("role").eq("id",currentUser.id).maybeSingle();return !error&&data?.role==="admin";}
  async function openAdmin(){if(!await isAdmin()){toast("هذا الحساب لا يملك صلاحية إدارة المتجر.");await supabase.auth.signOut();currentUser=null;return;}modal("adminModal");await Promise.all([loadAdminProducts(),loadOrders(),loadAdminSettings()]);}
  document.querySelectorAll(".admin-tabs button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".admin-tabs button").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".admin-tab").forEach(x=>x.classList.toggle("hidden",x.id!==b.dataset.tab));}));
  $("resetProduct").addEventListener("click",()=>{$("productForm").reset();$("productForm").elements.id.value="";$("productFormTitle").textContent="إضافة منتج";});
  async function loadAdminProducts(){const {data,error}=await supabase.from("products").select("*").order("created_at",{ascending:false});if(error){$("adminProductList").textContent="تعذر تحميل المنتجات.";return;}$("adminProductList").innerHTML=(data||[]).map(p=>`<div class="admin-row"><div class="admin-row-main"><img src="${escapeHtml(imageSrc(p.image_url))}" alt=""><div><b>${escapeHtml(p.name)}</b><br>${money(p.price)} · ${p.is_active?"منشور":"مخفي"}</div></div><div class="admin-row-actions"><button class="small-action" data-edit-product="${p.id}">تعديل</button><button class="small-action" data-delete-product="${p.id}">حذف</button></div></div>`).join("")||"لا توجد منتجات بعد.";}
  $("adminProductList").addEventListener("click",async e=>{const edit=e.target.closest("[data-edit-product]"),del=e.target.closest("[data-delete-product]");if(edit){const {data}=await supabase.from("products").select("*").eq("id",edit.dataset.editProduct).single();if(!data)return;const f=$("productForm");["id","name","price","description","image_url","category","is_active"].forEach(k=>{if(f.elements[k])f.elements[k].value=data[k]??"";});$("productFormTitle").textContent="تعديل المنتج";document.querySelector('[data-tab="adminProducts"]').click();$("productForm").scrollIntoView({behavior:"smooth"});}if(del&&confirm("هل تريد حذف هذا المنتج؟")){const {error}=await supabase.from("products").delete().eq("id",del.dataset.deleteProduct);if(error)toast("تعذر حذف المنتج.");else{toast("تم حذف المنتج.");await loadAdminProducts();await loadProducts();}}});
  $("productForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.target,fd=new FormData(f),id=fd.get("id");let imageUrl=fd.get("image_url")||null;const file=f.elements.image.files[0];if(file){if(file.size>5*1024*1024){toast("حجم الصورة يجب ألا يتجاوز 5 ميغابايت.");return;}const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");const path=`${crypto.randomUUID()}.${ext}`;const {error:upErr}=await supabase.storage.from("product-images").upload(path,file,{upsert:false,contentType:file.type});if(upErr){toast("تعذر رفع الصورة. تحقق من إعداد Storage.");console.error(upErr);return;}const {data}=supabase.storage.from("product-images").getPublicUrl(path);imageUrl=data.publicUrl;}
    const row={name:fd.get("name"),price:Number(fd.get("price")),description:fd.get("description"),image_url:imageUrl||"assets/notebooks-set.jpg",category:fd.get("category"),is_active:fd.get("is_active")==="true"};
    const q=id?supabase.from("products").update(row).eq("id",id):supabase.from("products").insert(row);const {error}=await q;if(error){toast("تعذر حفظ المنتج.");console.error(error);return;}f.reset();f.elements.id.value="";$("productFormTitle").textContent="إضافة منتج";toast("تم حفظ المنتج.");await loadAdminProducts();await loadProducts();
  });
  async function loadOrders(){const {data,error}=await supabase.from("orders").select("*").order("created_at",{ascending:false}).limit(100);if(error){$("adminOrderList").textContent="تعذر تحميل الطلبات.";return;}const labels={new:"جديد",confirmed:"تم التأكيد",in_production:"قيد الإنجاز",ready:"جاهز",shipped:"تم الشحن",delivered:"تم التسليم",cancelled:"ملغي"};$("adminOrderList").innerHTML=(data||[]).map(o=>`<article class="admin-row" style="align-items:flex-start"><div style="min-width:0;flex:1"><b>#${o.id} · ${escapeHtml(o.customer_name)}</b><br>${escapeHtml(o.order_type)} · ${escapeHtml(o.phone)} · ${escapeHtml(o.wilaya||"")} / ${escapeHtml(o.city||"")}<br><small>${new Date(o.created_at).toLocaleString("ar-DZ")} · ${money(o.total_amount)}</small><details><summary>تفاصيل الطلب</summary><pre style="white-space:pre-wrap;font:12px inherit">${escapeHtml(JSON.stringify(o.custom_details||o.items||{},null,2))}\n${escapeHtml(o.notes||"")}</pre></details></div><select class="status-select" data-order-status="${o.id}">${Object.entries(labels).map(([v,l])=>`<option value="${v}" ${o.status===v?"selected":""}>${l}</option>`).join("")}</select></article>`).join("")||"لا توجد طلبات حتى الآن.";}
  $("adminOrderList").addEventListener("change",async e=>{const s=e.target.closest("[data-order-status]");if(!s)return;const {error}=await supabase.from("orders").update({status:s.value}).eq("id",s.dataset.orderStatus);toast(error?"تعذر تحديث حالة الطلب.":"تم تحديث حالة الطلب.");});
  async function loadAdminSettings(){const f=$("settingsForm");Object.entries(settings).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v||"";});}
  $("settingsForm").addEventListener("submit",async e=>{e.preventDefault();const row=Object.fromEntries(new FormData(e.target));row.id=1;const {error}=await supabase.from("store_settings").update(row).eq("id",1);if(error){toast("تعذر حفظ الإعدادات.");console.error(error);return;}settings={...settings,...row};$("footerContact").textContent=settings.shipping_note||"";toast("تم حفظ الإعدادات.");});
  if(supabase){supabase.auth.getSession().then(({data})=>{currentUser=data.session?.user||null;});supabase.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;});}
  $("year").textContent=new Date().getFullYear();updateCartCount();
  Promise.all([loadSettings(),loadProducts()]);
  const links=[...document.querySelectorAll('.main-nav a')],sections=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if("IntersectionObserver" in window){const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){links.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+entry.target.id));}}),{rootMargin:"-30% 0px -60% 0px"});sections.forEach(s=>io.observe(s));}
})();
