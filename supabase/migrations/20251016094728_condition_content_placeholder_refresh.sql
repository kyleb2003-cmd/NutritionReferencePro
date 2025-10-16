-- Fill any NULL or empty handout fields with a simple placeholder
update public.condition_content
set
  overview = coalesce(nullif(overview, ''), 'Content coming soon.'),
  mealplan_1400 = coalesce(nullif(mealplan_1400, ''), 'Content coming soon.'),
  mealplan_1800 = coalesce(nullif(mealplan_1800, ''), 'Content coming soon.'),
  mealplan_2200 = coalesce(nullif(mealplan_2200, ''), 'Content coming soon.'),
  mealplan_2600 = coalesce(nullif(mealplan_2600, ''), 'Content coming soon.'),
  shopping_list = coalesce(nullif(shopping_list, ''), 'Content coming soon.'),
  rd_referral = coalesce(nullif(rd_referral, ''), 'Content coming soon.'),
  eat_this_not_that = coalesce(nullif(eat_this_not_that, ''), 'Content coming soon.');

-- Ensure a row exists for every condition
insert into public.condition_content (condition_id, overview)
select c.id, 'Content coming soon.'
from public.conditions c
left join public.condition_content cc on cc.condition_id = c.id
where cc.condition_id is null;
