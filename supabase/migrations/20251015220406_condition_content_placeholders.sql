update public.condition_content
set
  overview = coalesce(overview, '[Placeholder] Content will go here.'),
  mealplan_1400 = coalesce(mealplan_1400, '[Placeholder] Content will go here.'),
  mealplan_1800 = coalesce(mealplan_1800, '[Placeholder] Content will go here.'),
  mealplan_2200 = coalesce(mealplan_2200, '[Placeholder] Content will go here.'),
  mealplan_2600 = coalesce(mealplan_2600, '[Placeholder] Content will go here.'),
  shopping_list = coalesce(shopping_list, '[Placeholder] Content will go here.'),
  rd_referral = coalesce(rd_referral, '[Placeholder] Content will go here.'),
  eat_this_not_that = coalesce(eat_this_not_that, '[Placeholder] Content will go here.');
