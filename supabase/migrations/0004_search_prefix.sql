-- CU Marketplace — 0004 search: prefix matching for type-ahead, OR-matching with all-words-first ranking,
-- and matching on the seller's name/tagline and the category, so "snea" finds sneakers from a sneaker seller.

-- "laptop charger" -> 'laptop:* & charger:*' (p_op '&') or 'laptop:* | charger:*' (p_op '|'). Null when empty.
create or replace function public.search_terms(p_q text, p_op text) returns text
language sql immutable as $$
  select nullif(array_to_string(array(
           select w || ':*'
             from regexp_split_to_table(lower(regexp_replace(coalesce(p_q, ''), '[^[:alnum:][:space:]]', ' ', 'g')), '\s+') w
            where length(w) > 0
            limit 8), ' ' || p_op || ' '), '')
$$;

create or replace function public.search_products(p_q text) returns setof public.products
language sql stable set search_path = public, extensions as $$
  with q as (select trim(left(regexp_replace(coalesce(p_q, ''), '\s+', ' ', 'g'), 80)) as raw),
  t as (
    select raw,
           coalesce(to_tsquery('english', coalesce(search_terms(raw, '&'), '')), ''::tsquery) as all_words,
           coalesce(to_tsquery('english', coalesce(search_terms(raw, '|'), '')), ''::tsquery) as any_word,
           coalesce(to_tsquery('simple', coalesce(search_terms(raw, '|'), '')), ''::tsquery) as any_word_simple,
           replace(replace(replace(raw, '\', '\\'), '%', '\%'), '_', '\_') as like_raw
      from q
  )
  select p.* from products p
    join businesses b on b.id = p.business_id
    left join categories c on c.id = p.category_id,
    t
   where t.raw = ''
      or p.search @@ t.any_word
      or p.title ilike '%' || t.like_raw || '%'
      or similarity(p.title, t.raw) > 0.3
      or c.name ilike t.like_raw || '%'
      or to_tsvector('simple', b.name || ' ' || coalesce(b.tagline, '')) @@ t.any_word_simple
   order by
     case when t.raw = '' then 0 else
       (case when p.search @@ t.all_words then 2 else 0 end)
       + ts_rank(p.search, t.any_word)
       + similarity(p.title, t.raw)
     end desc,
     p.score desc, p.created_at desc
$$;

create or replace function public.search_businesses(p_q text) returns setof public.businesses
language sql stable set search_path = public, extensions as $$
  with q as (select trim(left(regexp_replace(coalesce(p_q, ''), '\s+', ' ', 'g'), 80)) as raw),
  t as (
    select raw,
           coalesce(to_tsquery('simple', coalesce(search_terms(raw, '|'), '')), ''::tsquery) as any_word,
           replace(replace(replace(raw, '\', '\\'), '%', '\%'), '_', '\_') as like_raw
      from q
  )
  select b.* from businesses b
    left join categories c on c.id = b.category_id,
    t
   where t.raw = ''
      or b.name ilike '%' || t.like_raw || '%'
      or b.tagline ilike '%' || t.like_raw || '%'
      or to_tsvector('simple', b.name || ' ' || coalesce(b.tagline, '') || ' ' || coalesce(c.name, '')) @@ t.any_word
      or similarity(b.name, t.raw) > 0.3
      or c.name ilike t.like_raw || '%'
   order by case when t.raw = '' then 0 else similarity(b.name, t.raw) end desc, b.rating_count desc
$$;
