update public.condition_content
set
  overview = coalesce(nullif(overview, ''), '[Placeholder] Content will go here.'),
  mealplan_1400 = coalesce(nullif(mealplan_1400, ''), '[Placeholder] Content will go here.'),
  mealplan_1800 = coalesce(nullif(mealplan_1800, ''), '[Placeholder] Content will go here.'),
  mealplan_2200 = coalesce(nullif(mealplan_2200, ''), '[Placeholder] Content will go here.'),
  mealplan_2600 = coalesce(nullif(mealplan_2600, ''), '[Placeholder] Content will go here.'),
  shopping_list = coalesce(nullif(shopping_list, ''), '[Placeholder] Content will go here.'),
  rd_referral = coalesce(nullif(rd_referral, ''), '[Placeholder] Content will go here.'),
  eat_this_not_that = coalesce(nullif(eat_this_not_that, ''), '[Placeholder] Content will go here.');

insert into public.condition_content (condition_id, overview)
select c.id, '[Placeholder] Content will go here.'
from public.conditions c
left join public.condition_content cc on cc.condition_id = c.id
where cc.condition_id is null;
