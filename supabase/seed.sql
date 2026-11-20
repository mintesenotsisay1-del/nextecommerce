-- ══════════════════════════════════════════════════════════════════
--  Sole & Stone — demo seed data
--  Run AFTER supabase/schema.sql.
--  Uses fixed UUIDs so you can re-run with ON CONFLICT.
-- ══════════════════════════════════════════════════════════════════

insert into public.products
  (id, slug, name, brand, category, gender, color, color_family, price, compare_at_price, images, sizes, rating, review_count, tags, short_description, description, details, care)
values
  ('11111111-1111-4111-8111-111111111101','air-max-1-white-orange','Air Max 1 "White · Orange"','Nike','sneakers','unisex','White / Bright Mandarin','white',149,null,
   array['/img/products/am1-orange-white.jpg','/img/products/aj1-low-sbb.jpg','/img/products/sb-names-white.jpg'],
   '[{"size":"US 7","stock":4},{"size":"US 8","stock":7},{"size":"US 9","stock":9},{"size":"US 10","stock":6},{"size":"US 11","stock":3},{"size":"US 12","stock":0}]'::jsonb,
   4.8,214,array['new'],
   'The everyday icon with visible air cushioning.',
   'A timeless silhouette reborn in a crisp white upper with bright mandarin accents.',
   array['Visible Air sole unit','Suede + mesh upper','Foam midsole','Rubber outsole with herringbone grip'],
   'Wipe with a soft, damp cloth. Do not machine wash.'),

  ('11111111-1111-4111-8111-111111111102','free-rn-flyknit-crimson','Free RN Flyknit "Crimson"','Nike','running','unisex','University Red / Team Crimson','red',99,139,
   array['/img/products/crimson-flyknit.jpg','/img/products/lunar-black.jpg','/img/products/am1-orange-white.jpg'],
   '[{"size":"US 7","stock":6},{"size":"US 8","stock":8},{"size":"US 9","stock":5},{"size":"US 10","stock":4},{"size":"US 11","stock":8},{"size":"US 12","stock":2}]'::jsonb,
   4.6,187,array['sale'],
   'Featherweight knit runner — 29% off this week.',
   'One-piece Flyknit construction with gradient Free outsole for a natural ride.',
   array['One-piece Flyknit upper','Free flex-groove outsole','Weight: 210 g','Pull-tab heel'],
   'Hand wash with mild soap and air dry away from heat.'),

  ('11111111-1111-4111-8111-111111111103','air-jordan-1-bred-toe','Air Jordan 1 Retro High OG "Bred Toe"','Jordan','sneakers','men','Gym Red / Black / White','black',189,null,
   array['/img/products/aj1-bred-toe.jpg','/img/products/aj1-low-sbb.jpg','/img/products/aj1-low-sbb.jpg'],
   '[{"size":"US 8","stock":2},{"size":"US 9","stock":3},{"size":"US 10","stock":5},{"size":"US 11","stock":4},{"size":"US 12","stock":2}]'::jsonb,
   4.9,431,array['bestseller','limited'],
   'The grail — leather high-top in heavy rotation since ''85.',
   'Full-grain leather in Bred Toe blocking with encapsulated Air sole.',
   array['Full-grain leather upper','Encapsulated Air-Sole','Woven Jumpman tongue label','Red wax laces included'],
   'Store away from direct sunlight. Use a leather conditioner sparingly.'),

  ('11111111-1111-4111-8111-111111111104','vans-old-skool-port-royale','Old Skool "Port Royale"','Vans','sneakers','unisex','Port Royale / True White','burgundy',69,null,
   array['/img/products/old-skool-burgundy.jpg','/img/products/sb-names-white.jpg','/img/products/aj1-low-sbb.jpg'],
   '[{"size":"US 6","stock":7},{"size":"US 7","stock":9},{"size":"US 8","stock":11},{"size":"US 9","stock":8},{"size":"US 10","stock":9},{"size":"US 11","stock":6}]'::jsonb,
   4.5,512,array['bestseller'],
   'Where skate style was born — signature side stripe.',
   'Durable suede and canvas uppers with the iconic Jazz stripe and Waffle outsole.',
   array['Signature Jazz Stripe','Suede and canvas upper','Original Waffle Outsole','Reinforced toe caps'],
   'Machine-washable on cold in a laundry bag. Air dry only.'),

  ('11111111-1111-4111-8111-111111111105','timberland-6-inch-premium','6-Inch Premium Boot','Timberland','boots','men','Rust Nubuck','brown',199,null,
   array['/img/products/timberland-brown.jpg','/img/products/af1-carhartt-tan.jpg'],
   '[{"size":"US 7","stock":4},{"size":"US 8","stock":6},{"size":"US 9","stock":7},{"size":"US 10","stock":8},{"size":"US 11","stock":5},{"size":"US 12","stock":3}]'::jsonb,
   4.8,356,array['bestseller'],
   'Waterproof nubuck work-boot icon.',
   'The original waterproof boot in premium nubuck with seam-sealed construction.',
   array['Seam-sealed waterproof construction','Premium full-grain nubuck','Padded collar','Rust-proof hardware'],
   'Condition with a nubuck-specific wax. Use a suede brush monthly.'),

  ('11111111-1111-4111-8111-111111111106','aldo-stiletto-floral','Floral Pointed Pump','ALDO','heels','women','Lapis Floral','blue',89,119,
   array['/img/products/floral-heels-blue.jpg'],
   '[{"size":"EU 36","stock":3},{"size":"EU 37","stock":5},{"size":"EU 38","stock":6},{"size":"EU 39","stock":4},{"size":"EU 40","stock":5},{"size":"EU 41","stock":2}]'::jsonb,
   4.3,87,array['sale'],
   'Satin stiletto in a hand-painted floral finish.',
   'Show-stopping pointed toe in lapis satin with hand-painted florals.',
   array['10.5 cm stiletto heel','Hand-painted satin upper','Pointed toe','Padded insole'],
   'Keep away from rain. Store with a shoe tree.'),

  ('11111111-1111-4111-8111-111111111107','double-monk-strap-brown','Double Monk Strap','Hugo Boss','dress','men','Cognac Calfskin','brown',249,null,
   array['/img/products/monk-strap-brown.jpg','/img/products/timberland-brown.jpg'],
   '[{"size":"US 7","stock":2},{"size":"US 8","stock":3},{"size":"US 9","stock":4},{"size":"US 10","stock":4},{"size":"US 11","stock":2},{"size":"US 12","stock":1}]'::jsonb,
   4.7,64,'{}',
   'Calfskin monk strap — hand-finished in Italy by artisans.',
   'Cognac hand-burnished calfskin with a Blake-stitched leather sole.',
   array['Blake-stitched leather sole','Hand-burnished finish','Twin brushed-metal buckles','Leather lining'],
   'Polish monthly; rotate use to let the leather rest.')

on conflict (slug) do update set
  price = excluded.price,
  compare_at_price = excluded.compare_at_price,
  images = excluded.images,
  sizes = excluded.sizes,
  short_description = excluded.short_description;

-- Optional demo reviews (only attach to the first product kept)
insert into public.reviews (product_id, author, rating, body)
select id, 'Michael T.', 5, 'The white/orange combo is unreal in person. Ordering half a size down works best.'
from public.products where slug = 'air-max-1-white-orange'
on conflict do nothing;
