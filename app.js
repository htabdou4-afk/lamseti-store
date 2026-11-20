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
  let cart = (() => { try { const value=JSON.parse(localStorage.getItem("lamseti_cart") || "[]"); return Array.isArray(value) ? value.filter(x=>x && x.id!=null && Number.isFinite(Number(x.qty)) && Number(x.qty)>0).map(x=>({id:String(x.id),qty:Math.min(99,Math.max(1,Math.floor(Number(x.qty))))})) : []; } catch { return []; } })();
  let currentUser = null, toastTimer;

  function toast(msg) { const el=$("toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),3200); }
  function modal(id, open=true) { $(id).classList.toggle("open",open); $(id).setAttribute("aria-hidden",String(!open)); }
  function requireBackend() { if (!supabase) { toast("تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات الاتصال."); return false; } return true; }
  function saveCart() {
    try { localStorage.setItem("lamseti_cart",JSON.stringify(cart)); }
    catch (error) { console.warn("Cart persistence failed.",error); toast("تعذر حفظ السلة محلياً على هذا الجهاز."); }
    updateCartCount();
  }
  function updateCartCount() { $("cartCount").textContent=cart.reduce((n,x)=>n+x.qty,0); }
  function waUrl(message) { const phone=(settings.whatsapp||"").replace(/\D/g,""); if(!/^213\d{8,9}$/.test(phone)){toast("لم يتم ضبط رقم واتساب المتجر بعد. تم حفظ الطلب ويمكنك ضبط الرقم من إعدادات الإدارة.");return null;} return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`; }
  function prepareWhatsAppWindow() { const phone=(settings.whatsapp||"").replace(/\D/g,""); return /^213\d{8,9}$/.test(phone) ? window.open("about:blank","_blank") : null; }
  function finishWhatsAppWindow(popup,message) { const url=waUrl(message); if(!url){popup?.close();return;} if(popup) popup.location.href=url; else toast("تم حفظ الطلب. تعذر فتح واتساب تلقائياً، يمكنك فتحه يدوياً وإرسال تفاصيل الطلب."); }
  async function loadSettings() {
    if (supabase) {
      try {
        const {data,error}=await supabase.from("store_settings").select("*").eq("id",1).maybeSingle();
        if(error) throw error;
        if(data) settings={...settings,...data};
      } catch(error) { console.error("Settings load failed",error); }
    }
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
  $("productGrid").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(!b)return;const id=b.dataset.add,p=products.find(x=>String(x.id)===String(id));if(!p)return;const line=cart.find(x=>String(x.id)===String(id));if(line){if(line.qty>=99){toast("الحد الأقصى 99 قطعة من المنتج الواحد.");return;}line.qty++;}
    else cart.push({id,qty:1});
    saveCart();toast("أضيف المنتج إلى السلة.");});
  function openCart() {
    const rows=cart.map(c=>{const p=products.find(x=>String(x.id)===String(c.id));if(!p)return "";return `<div class="cart-line"><div><b>${escapeHtml(p.name)}</b><br><span>${money(p.price)} للوحدة</span></div><div class="qty-controls"><button data-qty="${escapeHtml(p.id)}" data-delta="-1">−</button><b>${c.qty}</b><button data-qty="${escapeHtml(p.id)}" data-delta="1">+</button></div></div>`;}).join("");
    const total=cart.reduce((sum,c)=>sum+(Number(products.find(p=>String(p.id)===String(c.id))?.price)||0)*c.qty,0);
    $("cartContent").innerHTML=`<h2>سلة المشتريات</h2>${rows||'<div class="empty">السلة فارغة حالياً.</div>'}${rows?`<div class="cart-total"><span>المجموع (دون التوصيل)</span><span>${money(total)}</span></div><p class="form-note">${escapeHtml(settings.shipping_note||"يتم تأكيد التوصيل حسب المنطقة.")}</p><form id="checkoutForm"><div class="form-grid"><label>الاسم الكامل *<input name="customer_name" required></label><label>رقم الهاتف *<input name="phone" required type="tel"></label><label>الولاية *<input name="wilaya" required></label><label>البلدية *<input name="city" required></label><label class="full">عنوان التوصيل *<textarea name="address" required rows="2"></textarea></label><label class="full">ملاحظات<textarea name="notes" rows="2"></textarea></label></div><button class="btn primary full-btn">تأكيد الطلب</button></form>`:""}`;
    modal("cartModal");
  }
  $("cartOpen").addEventListener("click",openCart);
  $("cartContent").addEventListener("click",e=>{const b=e.target.closest("[data-qty]");if(!b)return;const id=b.dataset.qty,delta=Number(b.dataset.delta),line=cart.find(x=>String(x.id)===String(id));if(line){
      if(delta>0&&line.qty>=99){toast("الحد الأقصى 99 قطعة من المنتج الواحد.");return;}
      line.qty+=delta;
    }
    cart=cart.filter(x=>x.qty>0);saveCart();openCart();});
  $("cartContent").addEventListener("submit",async e=>{
    if(e.target.id!=="checkoutForm")return;
    e.preventDefault();
    if(!requireBackend())return;
    const submitButton=e.target.querySelector('button:not([type="button"])');
    if(submitButton?.disabled)return;
    const f=Object.fromEntries(new FormData(e.target));
    const items=cart.map(c=>{
      const p=products.find(x=>String(x.id)===String(c.id));
      return p?{product_id:c.id,name:p.name,unit_price:Number(p.price)||0,quantity:c.qty}:null;
    }).filter(Boolean);
    if(items.length!==cart.length){toast("بعض المنتجات في السلة لم تعد متاحة. حدّث السلة قبل تأكيد الطلب.");return;}
    if(!items.length){toast("السلة فارغة أو لم تعد المنتجات متاحة.");return;}
    const total=items.reduce((sum,item)=>sum+item.unit_price*item.quantity,0);
    const waWindow=prepareWhatsAppWindow();
    const order={order_type:"cart",customer_name:f.customer_name,phone:f.phone,wilaya:f.wilaya,city:f.city,delivery_address:f.address,notes:f.notes,items,total_amount:total,status:"new"};
    if(submitButton){submitButton.disabled=true;submitButton.textContent="جارٍ تسجيل الطلب...";}
    let result;
    try { result=await supabase.from("orders").insert(order); }
    catch(error) { result={error}; }
    const {error}=result;
    if(error){waWindow?.close();if(submitButton){submitButton.disabled=false;submitButton.textContent="تأكيد الطلب";}toast("تعذر حفظ الطلب. تحقق من الاتصال وحاول مجدداً.");console.error(error);return;}
    const msg=`طلب جديد من ${settings.store_name}
${items.map(x=>`${x.name} × ${x.quantity} = ${money(x.unit_price*x.quantity)}`).join("\n")}
المجموع دون التوصيل: ${money(total)}
الاسم: ${f.customer_name}
الهاتف: ${f.phone}
العنوان: ${f.wilaya} - ${f.city} - ${f.address}
ملاحظات: ${f.notes||"لا يوجد"}`;
    cart=[];saveCart();modal("cartModal",false);toast("تم تسجيل طلبك بنجاح.");finishWhatsAppWindow(waWindow,msg);
  });
  async function submitCustom(form, type) {
    if(!requireBackend())return;
    const fields=Object.fromEntries(new FormData(form));
    const quantity=Number(fields.quantity);
    const minQuantity=1;
    const maxQuantity=type==="business_cards"?50000:500;
    if(!Number.isInteger(quantity)||quantity<minQuantity||quantity>maxQuantity){
      toast(`الكمية يجب أن تكون رقماً صحيحاً بين ${minQuantity} و${maxQuantity}.`);
      form.elements.quantity?.focus();
      return;
    }
    const submitButton=form.querySelector('button:not([type="button"])');
    if(submitButton?.disabled)return;
    const waWindow=prepareWhatsAppWindow();
    const common={
      customer_name:fields.customer_name,phone:fields.phone,wilaya:fields.wilaya,
      city:fields.city,
      delivery_address:type==="notebook"?fields.address:fields.delivery_address,
      order_type:type,custom_details:fields,status:"new"
    };
    if(submitButton){submitButton.disabled=true;submitButton.dataset.originalText=submitButton.textContent;submitButton.textContent="جارٍ إرسال الطلب...";}
    let result;
    try { result=await supabase.from("orders").insert(common); }
    catch(error) { result={error}; }
    const {error}=result;
    if(error){
      waWindow?.close();
      if(submitButton){submitButton.disabled=false;submitButton.textContent=submitButton.dataset.originalText||"إرسال الطلب";}
      toast("تعذر إرسال الطلب. حاول مجدداً.");console.error(error);return;
    }
    const msg=`طلب مخصص جديد من ${settings.store_name}
النوع: ${type==="notebook"?"دفتر مخصص":"بطاقات أعمال"}
${Object.entries(fields).map(([k,v])=>`${k}: ${v}`).join("\n")}`;
    form.reset();
    if(submitButton){submitButton.disabled=false;submitButton.textContent=submitButton.dataset.originalText||"إرسال الطلب";}
    toast("وصل طلبك بنجاح. سنتواصل معك لتأكيد التفاصيل.");
    finishWhatsAppWindow(waWindow,msg);
  }
  $("notebookForm").addEventListener("submit",e=>{e.preventDefault();submitCustom(e.target,"notebook");});
  $("businessForm").addEventListener("submit",e=>{e.preventDefault();submitCustom(e.target,"business_cards");});
  $("menuToggle").addEventListener("click",()=>{const open=$("mainNav").classList.toggle("open");$("menuToggle").setAttribute("aria-expanded",String(open));});
  $("mainNav").addEventListener("click",e=>{if(e.target.closest("a")){$("mainNav").classList.remove("open");$("menuToggle").setAttribute("aria-expanded","false");}});
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>modal(b.dataset.close,false)));
  document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)modal(m.id,false);}));
  $("adminOpen").addEventListener("click",()=>{if(!requireBackend())return;if(currentUser)openAdmin();else modal("authModal");});
  $("loginForm").addEventListener("submit",async e=>{
    e.preventDefault(); if(!requireBackend())return;
    const form=e.currentTarget,button=form.querySelector('button:not([type="button"])'),f=Object.fromEntries(new FormData(form));
    if(button?.disabled)return;
    if(button){button.disabled=true;button.textContent="جارٍ التحقق...";}
    $("authMessage").textContent="";
    try {
      const {data,error}=await supabase.auth.signInWithPassword({email:f.email,password:f.password});
      if(error) throw error;
      currentUser=data.user; modal("authModal",false); await openAdmin();
    } catch(error) {
      $("authMessage").textContent="تعذر تسجيل الدخول. تحقق من الاتصال والبريد وكلمة المرور.";
      console.error("Login failed",error);
    } finally { if(button){button.disabled=false;button.textContent="تسجيل الدخول";} }
  });
  $("logoutBtn").addEventListener("click",async()=>{
    const button=$("logoutBtn");button.disabled=true;
    try {
      const {error}=await supabase.auth.signOut();if(error)throw error;
      currentUser=null;modal("adminModal",false);toast("تم تسجيل الخروج.");
    } catch(error){toast("تعذر تسجيل الخروج. تحقق من الاتصال.");console.error("Logout failed",error);}
    finally{button.disabled=false;}
  });
  async function isAdmin(){
    if(!currentUser)return false;
    try{const {data,error}=await supabase.from("profiles").select("role").eq("id",currentUser.id).maybeSingle();return !error&&data?.role==="admin";}
    catch(error){console.error("Admin role check failed",error);return false;}
  }
  async function openAdmin(){
    if(!await isAdmin()){
      toast("تعذر التحقق من صلاحية الإدارة لهذا الحساب.");
      try{await supabase.auth.signOut();}catch(error){console.error("Unauthorized session sign-out failed",error);}
      currentUser=null;return;
    }
    modal("adminModal");
    const results=await Promise.allSettled([loadAdminProducts(),loadOrders(),loadAdminSettings()]);
    results.filter(x=>x.status==="rejected").forEach(x=>console.error("Admin panel load failed",x.reason));
  }
  document.querySelectorAll(".admin-tabs button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".admin-tabs button").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".admin-tab").forEach(x=>x.classList.toggle("hidden",x.id!==b.dataset.tab));}));
  $("resetProduct").addEventListener("click",()=>{$("productForm").reset();$("productForm").elements.id.value="";$("productFormTitle").textContent="إضافة منتج";});
  async function loadAdminProducts(){let data,error;try{({data,error}=await supabase.from("products").select("*").order("created_at",{ascending:false}));}catch(err){error=err;}if(error){$("adminProductList").textContent="تعذر تحميل المنتجات.";console.error(error);return;}$("adminProductList").innerHTML=(data||[]).map(p=>`<div class="admin-row"><div class="admin-row-main"><img src="${escapeHtml(imageSrc(p.image_url))}" alt=""><div><b>${escapeHtml(p.name)}</b><br>${money(p.price)} · ${p.is_active?"منشور":"مخفي"}</div></div><div class="admin-row-actions"><button class="small-action" data-edit-product="${p.id}">تعديل</button><button class="small-action" data-delete-product="${p.id}">حذف</button></div></div>`).join("")||"لا توجد منتجات بعد.";}
  $("adminProductList").addEventListener("click",async e=>{const edit=e.target.closest("[data-edit-product]"),del=e.target.closest("[data-delete-product]");if(edit){const {data}=await supabase.from("products").select("*").eq("id",edit.dataset.editProduct).single();if(!data)return;const f=$("productForm");["id","name","price","description","image_url","category","is_active"].forEach(k=>{if(f.elements[k])f.elements[k].value=data[k]??"";});$("productFormTitle").textContent="تعديل المنتج";document.querySelector('[data-tab="adminProducts"]').click();$("productForm").scrollIntoView({behavior:"smooth"});}if(del&&confirm("هل تريد حذف هذا المنتج؟")){const {error}=await supabase.from("products").delete().eq("id",del.dataset.deleteProduct);if(error)toast("تعذر حذف المنتج.");else{toast("تم حذف المنتج.");await loadAdminProducts();await loadProducts();}}});
  $("productForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!requireBackend())return;
    const form=e.currentTarget,button=form.querySelector('button:not([type="button"])');
    if(button?.disabled)return;
    const fd=new FormData(form),id=String(fd.get("id")||"");
    const name=String(fd.get("name")||"").trim(),price=Number(fd.get("price"));
    if(!name||name.length>140||!Number.isFinite(price)||price<0){toast("تحقق من اسم المنتج والسعر.");return;}
    const file=form.elements.image.files[0];
    if(file&&(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024)){
      toast("اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 5 ميغابايت.");return;
    }
    if(button){button.disabled=true;button.textContent="جارٍ حفظ المنتج...";}
    let uploadedPath=null;
    try {
      let imageUrl=String(fd.get("image_url")||"").trim()||null;
      if(file){
        const ext=({ "image/jpeg":"jpg","image/png":"png","image/webp":"webp" })[file.type];
        uploadedPath=`${crypto.randomUUID()}.${ext}`;
        const {error:uploadError}=await supabase.storage.from("product-images").upload(uploadedPath,file,{upsert:false,contentType:file.type});
        if(uploadError)throw uploadError;
        imageUrl=supabase.storage.from("product-images").getPublicUrl(uploadedPath).data.publicUrl;
      }
      const row={name,price,description:String(fd.get("description")||"").trim(),image_url:imageUrl||"notebooks-set.jpg",category:String(fd.get("category")||"notebooks"),is_active:fd.get("is_active")==="true"};
      const query=id?supabase.from("products").update(row).eq("id",id):supabase.from("products").insert(row);
      const {error}=await query;
      if(error)throw error;
      form.reset();form.elements.id.value="";$("productFormTitle").textContent="إضافة منتج";
      toast("تم حفظ المنتج.");await Promise.all([loadAdminProducts(),loadProducts()]);
    } catch(error) {
      if(uploadedPath){const {error:cleanupError}=await supabase.storage.from("product-images").remove([uploadedPath]);if(cleanupError)console.warn("Uploaded image cleanup failed",cleanupError);}
      toast("تعذر حفظ المنتج. تحقق من الاتصال والصلاحيات.");console.error("Product save failed",error);
    } finally {if(button){button.disabled=false;button.textContent="حفظ المنتج";}}
  });
  async function loadOrders(){
    let data,error;
    try {
      ({data,error}=await supabase.from("orders").select("*").order("created_at",{ascending:false}).limit(100));
    } catch(err) { error=err; }
    if(error){$("adminOrderList").textContent="تعذر تحميل الطلبات. تحقق من الاتصال والصلاحيات.";console.error("Orders load failed",error);return;}
    const labels={new:"جديد",confirmed:"تم التأكيد",in_production:"قيد الإنجاز",ready:"جاهز",shipped:"تم الشحن",delivered:"تم التسليم",cancelled:"ملغي"};
    const typeLabels={cart:"طلب منتجات",notebook:"دفتر مخصص",business_cards:"بطاقات أعمال"};
    const detailLabels={customer_name:"اسم العميل",phone:"الهاتف",wilaya:"الولاية",city:"البلدية",cover_name:"الاسم على الغلاف",notebook_type:"نوع الدفتر",size:"المقاس",pages:"عدد الصفحات",paper:"نوع الورق",binding:"التجليد",cover_color:"لون الغلاف",quantity:"الكمية",address:"عنوان التوصيل",design_notes:"ملاحظات التصميم",business_name:"اسم النشاط",display_name:"الاسم على البطاقة",activity:"النشاط",printed_phone:"الهاتف المطبوع",email:"البريد الإلكتروني",social_links:"روابط التواصل",sides:"عدد الأوجه",finish:"التشطيب",logo_status:"حالة الشعار",printed_address:"العنوان المطبوع",delivery_address:"عنوان التوصيل"};
    $("adminOrderList").innerHTML=(data||[]).map(o=>{
      const details=o.order_type==="cart"
        ? (Array.isArray(o.items)?o.items.map(item=>`المنتج: ${item.name||"منتج"} | الكمية: ${item.quantity} | سعر الوحدة: ${money(item.unit_price)}`).join("\n"):"")
        : Object.entries(o.custom_details||{}).map(([key,value])=>`${detailLabels[key]||key}: ${Array.isArray(value)?value.join("، "):String(value??"")}`).join("\n");
      const extra=[details,o.notes?("ملاحظات: "+o.notes):""].filter(Boolean).join("\n");
      return `<article class="admin-row" style="align-items:flex-start"><div style="min-width:0;flex:1"><b>#${escapeHtml(o.id)} · ${escapeHtml(o.customer_name)}</b><br>${escapeHtml(typeLabels[o.order_type]||o.order_type)} · ${escapeHtml(o.phone)} · ${escapeHtml(o.wilaya||"")} / ${escapeHtml(o.city||"")}<br><small>${new Date(o.created_at).toLocaleString("ar-DZ")} · ${money(o.total_amount)}</small><details><summary>تفاصيل الطلب</summary><pre style="white-space:pre-wrap;font:12px inherit">${escapeHtml(extra)}</pre></details></div><select class="status-select" data-order-status="${escapeHtml(o.id)}" data-previous-status="${escapeHtml(o.status)}">${Object.entries(labels).map(([v,l])=>`<option value="${v}" ${o.status===v?"selected":""}>${l}</option>`).join("")}</select></article>`;
    }).join("")||"لا توجد طلبات حتى الآن.";
  }
  $("adminOrderList").addEventListener("change",async e=>{
    const s=e.target.closest("[data-order-status]"); if(!s)return;
    const previous=s.dataset.previousStatus; s.disabled=true;
    try {
      const {data,error}=await supabase.from("orders").update({status:s.value}).eq("id",s.dataset.orderStatus).select("id").maybeSingle();
      if(error||!data)throw error||new Error("Order not updated");
      s.dataset.previousStatus=s.value; toast("تم تحديث حالة الطلب.");
    } catch(error) {
      s.value=previous; toast("تعذر تحديث حالة الطلب."); console.error(error);
    } finally {s.disabled=false;}
  });
  async function loadAdminSettings(){const f=$("settingsForm");Object.entries(settings).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v||"";});}
  $("settingsForm").addEventListener("submit",async e=>{
    e.preventDefault(); const form=e.currentTarget,button=form.querySelector('button:not([type="button"])');
    if(button?.disabled)return;
    const row=Object.fromEntries(new FormData(form)); row.id=1;
    if(!/^213\d{8,9}$/.test(String(row.whatsapp||"").replace(/\D/g,"")) && row.whatsapp.trim()){
      toast("رقم واتساب يجب أن يبدأ بـ 213 ويتبعه 8 أو 9 أرقام."); return;
    }
    if(button){button.disabled=true;button.textContent="جارٍ الحفظ...";}
    try {
      const {data,error}=await supabase.from("store_settings").update(row).eq("id",1).select("id").maybeSingle();
      if(error||!data)throw error||new Error("Settings row not updated");
      settings={...settings,...row}; $("footerContact").textContent=settings.shipping_note||""; toast("تم حفظ الإعدادات.");
    } catch(error){toast("تعذر حفظ الإعدادات.");console.error(error);}
    finally{if(button){button.disabled=false;button.textContent="حفظ الإعدادات";}}
  });
  if(supabase){supabase.auth.getSession().then(({data})=>{currentUser=data.session?.user||null;});supabase.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;});}
  $("year").textContent=new Date().getFullYear();updateCartCount();
  Promise.allSettled([loadSettings(),loadProducts()]).then(results=>{results.forEach((r)=>{if(r.status==="rejected")console.error("Store initialization failed",r.reason);});});
  const links=[...document.querySelectorAll('.main-nav a')],sections=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if("IntersectionObserver" in window){const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){links.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+entry.target.id));}}),{rootMargin:"-30% 0px -60% 0px"});sections.forEach(s=>io.observe(s));}
})();
