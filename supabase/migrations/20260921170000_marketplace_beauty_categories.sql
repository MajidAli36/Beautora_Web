-- Beautora Marketplace: Perfume, Jewelry, Hair Care + subcategories

-- Parent categories (upsert by slug)
insert into public.marketplace_categories (name, slug, sort_order, kind, is_active)
values
  ('Perfume & Fragrance', 'perfume-fragrance', 5, 'product', true),
  ('Hair Care', 'hair-care', 10, 'product', true),
  ('Jewelry', 'jewelry', 15, 'product', true)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  kind = excluded.kind,
  is_active = true,
  parent_id = null;

-- Perfume & Fragrance children
insert into public.marketplace_categories (name, slug, sort_order, parent_id, kind, is_active)
select v.name, v.slug, v.sort_order, p.id, 'product', true
from public.marketplace_categories p
cross join (
  values
    ('Women''s Perfume', 'womens-perfume', 1),
    ('Men''s Perfume', 'mens-perfume', 2),
    ('Unisex Perfume', 'unisex-perfume', 3),
    ('Body Mist', 'body-mist', 4),
    ('Attar', 'attar', 5)
) as v(name, slug, sort_order)
where p.slug = 'perfume-fragrance'
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  is_active = true;

-- Jewelry children
insert into public.marketplace_categories (name, slug, sort_order, parent_id, kind, is_active)
select v.name, v.slug, v.sort_order, p.id, 'product', true
from public.marketplace_categories p
cross join (
  values
    ('Earrings', 'earrings', 1),
    ('Necklaces', 'necklaces', 2),
    ('Bracelets', 'bracelets', 3),
    ('Rings', 'rings', 4),
    ('Anklets', 'anklets', 5),
    ('Jewelry Sets', 'jewelry-sets', 6)
) as v(name, slug, sort_order)
where p.slug = 'jewelry'
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  is_active = true;

-- Hair Care children
insert into public.marketplace_categories (name, slug, sort_order, parent_id, kind, is_active)
select v.name, v.slug, v.sort_order, p.id, 'product', true
from public.marketplace_categories p
cross join (
  values
    ('Shampoo', 'shampoo', 1),
    ('Conditioner', 'conditioner', 2),
    ('Hair Oil', 'hair-oil', 3),
    ('Hair Mask', 'hair-mask', 4),
    ('Hair Styling', 'hair-styling', 5)
) as v(name, slug, sort_order)
where p.slug = 'hair-care'
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  is_active = true;
