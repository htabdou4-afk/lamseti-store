
-- Server-side order validation. This trigger is the source of truth for cart prices.
create or replace function public.validate_lamseti_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  normalized_items jsonb := '[]'::jsonb;
  product_id uuid;
  product_name text;
  product_price numeric(12,2);
  item_qty integer;
  computed_total numeric(12,2) := 0;
  raw_qty text;
begin
  if length(trim(coalesce(new.customer_name,''))) < 2 or length(new.customer_name) > 100 then
    raise exception 'Invalid customer name';
  end if;
  if length(regexp_replace(coalesce(new.phone,''),'\\s','','g')) < 8 or length(new.phone) > 30 then
    raise exception 'Invalid phone number';
  end if;

  new.status := 'new';
  new.customer_name := trim(new.customer_name);
  new.phone := trim(new.phone);

  if new.order_type = 'cart' then
    if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) < 1 or jsonb_array_length(new.items) > 50 then
      raise exception 'Invalid cart items';
    end if;

    for item in select value from jsonb_array_elements(new.items)
    loop
      begin
        product_id := (item->>'product_id')::uuid;
      exception when others then
        raise exception 'Invalid product identifier';
      end;
      raw_qty := item->>'quantity';
      if raw_qty is null or raw_qty !~ '^[1-9][0-9]*$' then
        raise exception 'Invalid item quantity';
      end if;
      item_qty := raw_qty::integer;
      if item_qty < 1 or item_qty > 99 then
        raise exception 'Item quantity out of range';
      end if;

      select p.name, p.price into product_name, product_price
      from public.products p
      where p.id = product_id and p.is_active = true;
      if not found then
        raise exception 'Product is unavailable';
      end if;

      normalized_items := normalized_items || jsonb_build_array(jsonb_build_object(
        'product_id', product_id,
        'name', product_name,
        'unit_price', product_price,
        'quantity', item_qty
      ));
      computed_total := computed_total + product_price * item_qty;
    end loop;

    new.items := normalized_items;
    new.total_amount := computed_total;
  elsif new.order_type in ('notebook','business_cards') then
    raw_qty := new.custom_details->>'quantity';
    if raw_qty is null or raw_qty !~ '^[1-9][0-9]*$' then
      raise exception 'Invalid custom order quantity';
    end if;
    item_qty := raw_qty::integer;
    if (new.order_type = 'notebook' and item_qty > 500)
       or (new.order_type = 'business_cards' and item_qty > 50000) then
      raise exception 'Custom order quantity out of range';
    end if;
    if octet_length(coalesce(new.custom_details,'{}'::jsonb)::text) > 12000 then
      raise exception 'Custom order details are too large';
    end if;
    new.items := '[]'::jsonb;
    new.total_amount := 0;
  else
    raise exception 'Unsupported order type';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_lamseti_order_before_insert on public.orders;
create trigger validate_lamseti_order_before_insert
before insert on public.orders
for each row execute function public.validate_lamseti_order();

