-- فقط این بخش را یک‌بار در SQL Editor پروژه Supabase اجرا کنید
insert into public.site_settings(key,value) values ('minimum_order_amount','0')
on conflict(key) do nothing;

create or replace function public.create_order(
  customer_name text, phone text, address text, note text default '',
  items jsonb default '[]'::jsonb, delivery_method text default 'pickup'
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid; v_order_number text; v_subtotal bigint := 0; v_final bigint := 0;
  v_item jsonb; v_product public.products%rowtype; v_qty integer; v_discount bigint;
  v_shipping bigint := 0; v_minimum_order bigint := 0;
begin
  if delivery_method not in ('pickup','delivery') then raise exception 'روش دریافت نامعتبر است'; end if;
  if delivery_method='delivery' then
    if coalesce((select value from public.site_settings where key='shipping_enabled'),'true') <> 'true' then raise exception 'ارسال در حال حاضر غیرفعال است'; end if;
    v_shipping := coalesce((select nullif(value,'')::bigint from public.site_settings where key='shipping_cost'),0);
  end if;
  if length(trim(customer_name)) < 2 then raise exception 'نام مشتری نامعتبر است'; end if;
  if regexp_replace(phone,'[^0-9]','','g') !~ '^09[0-9]{9}$' then raise exception 'شماره موبایل باید دقیقاً ۱۱ رقم و با 09 شروع شود'; end if;
  if length(trim(address)) < 5 then raise exception 'آدرس نامعتبر است'; end if;
  if jsonb_array_length(items)=0 then raise exception 'سبد خرید خالی است'; end if;
  for v_item in select * from jsonb_array_elements(items) loop
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid for update;
    if not found then raise exception 'محصول پیدا نشد'; end if;
    if not v_product.is_visible then raise exception 'این محصول در حال حاضر قابل سفارش نیست'; end if;
    v_qty := greatest(0,(v_item->>'quantity')::integer);
    if v_qty < 1 then raise exception 'تعداد محصول نامعتبر است'; end if;
    if v_qty > v_product.stock then raise exception 'stock: موجودی % کافی نیست',v_product.name; end if;
    v_subtotal := v_subtotal + v_product.consumer_price*v_qty;
    v_final := v_final + (case when v_product.store_price_enabled then v_product.store_price else v_product.consumer_price end)*v_qty;
  end loop;
  v_minimum_order := coalesce((select nullif(value,'')::bigint from public.site_settings where key='minimum_order_amount'),0);
  if v_minimum_order > 0 and v_final < v_minimum_order then raise exception 'حداقل مبلغ سفارش % تومان است', v_minimum_order; end if;
  v_final := v_final + v_shipping;
  v_order_number := nextval('public.invoice_number_seq')::text;
  while exists(select 1 from public.orders where order_number=v_order_number) loop v_order_number := nextval('public.invoice_number_seq')::text; end loop;
  insert into public.orders(order_number,customer_name,phone,address,note,subtotal,discount_total,final_total,delivery_method,shipping_cost)
  values(v_order_number,trim(customer_name),regexp_replace(phone,'[^0-9]','','g'),trim(address),coalesce(note,''),v_subtotal,v_subtotal-(v_final-v_shipping),v_final,delivery_method,v_shipping) returning id into v_order_id;
  for v_item in select * from jsonb_array_elements(items) loop
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid for update; v_qty := (v_item->>'quantity')::integer;
    update public.products set stock=stock-v_qty,updated_at=now() where id=v_product.id;
    v_discount := case when v_product.consumer_price>0 then round((v_product.consumer_price-v_product.store_price)*100.0/v_product.consumer_price) else 0 end;
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,consumer_price,discount_percent,total)
    values(v_order_id,v_product.id,v_product.name,v_qty,case when v_product.store_price_enabled then v_product.store_price else v_product.consumer_price end,v_product.consumer_price,case when v_product.store_price_enabled then v_discount else 0 end,(case when v_product.store_price_enabled then v_product.store_price else v_product.consumer_price end)*v_qty);
  end loop;
  return jsonb_build_object('order_number',v_order_number,'order_id',v_order_id);
end $$;

grant execute on function public.create_order(text,text,text,text,jsonb,text) to anon, authenticated;
