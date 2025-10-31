export type DietHandout = {
  whatItIs: string
  whoItsFor: string
  mealPlan: {
    intro: string
    days: Array<{ title: string; meals: string[] }>
  }
  samplePlate: {
    description: string
    imagePath?: string
  }
  swaps: Array<{ from: string; to: string }>
  moreInfo: Array<{ label: string; url: string }>
  disclaimer: string
}

export type DietGuide = {
  slug: string
  name: string
  whatItIs: string
  corePrinciples: string[]
  samplePlate: string[]
  swaps: string[]
  gettingStarted: string[]
  moreInfo: Array<{ label: string; url: string }>
  disclaimer: string
  handout?: DietHandout
}

const DEFAULT_DISCLAIMER =
  'This guide is for educational purposes and does not replace individualized medical advice. Review medical history, medications, and allergies before recommending dietary changes.'

export const dietGuides: DietGuide[] = [
  {
    slug: 'mediterranean',
    name: 'Mediterranean',
    whatItIs:
      'A plant-forward eating pattern inspired by coastal regions that emphasizes minimally processed foods, seafood, and healthy fats to support cardiovascular and metabolic health.',
    corePrinciples: [
      'Base meals around vegetables, fruits, whole grains, legumes, nuts, and seeds.',
      'Use extra-virgin olive oil as the primary added fat; limit butter and tropical oils.',
      'Prioritize fish and seafood twice per week; enjoy poultry, eggs, and dairy in moderation.',
      'Limit red meat, processed meats, and ultra-processed snacks or sweets.',
      'Share meals and savor food mindfully to encourage satisfaction and portion awareness.',
    ],
    samplePlate: [
      'Half plate: spinach salad with tomatoes, cucumbers, olives, and vinaigrette.',
      'Quarter plate: grilled salmon with lemon and herbs.',
      'Quarter plate: farro tossed with roasted vegetables.',
      'Extras: tzatziki, fresh fruit, and sparkling water with citrus.',
    ],
    swaps: [
      'Swap butter for extra-virgin olive oil when sautéing or finishing dishes.',
      'Use hummus or bean spreads instead of processed deli meats for sandwiches.',
      'Choose yogurt with berries and nuts over pastries or sweetened cereals.',
      'Select herbal teas or water with fruit instead of sugar-sweetened beverages.',
    ],
    gettingStarted: [
      'Plan one meatless meal each week featuring beans or lentils.',
      'Stock the pantry with canned tomatoes, chickpeas, olives, and whole grains for quick meals.',
      'Keep pre-washed greens and cut vegetables ready for easy salads.',
      'Schedule regular fish or seafood nights; use frozen fillets for speed.',
      'Finish meals with fruit, yogurt, or a small portion of dark chocolate.',
    ],
    moreInfo: [
      {
        label: 'American Heart Association – Mediterranean eating pattern',
        url: 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/nutrition-basics/mediterranean-diet',
      },
      {
        label: 'Harvard T.H. Chan School of Public Health – Mediterranean Diet overview',
        url: 'https://www.hsph.harvard.edu/nutritionsource/healthy-weight/diet-reviews/mediterranean-diet/',
      },
      {
        label: 'Oldways – Mediterranean Diet resources & pyramid',
        url: 'https://oldwayspt.org/resources/mediterranean-diet-pyramid',
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
    handout: {
      whatItIs:
        'The Mediterranean Diet is a flexible eating pattern inspired by traditional cuisines of countries bordering the Mediterranean Sea. It emphasizes minimally processed foods, plants as the foundation of meals, extra-virgin olive oil as the primary fat, routine seafood intake, and moderate dairy. Desserts and red meat are occasional.',
      whoItsFor:
        'Adults seeking an evidence-based pattern for heart and metabolic health, weight management, and healthy aging. It’s appropriate for most patients and can be adapted for diabetes, hypertension, and general cardiovascular risk reduction. Patients with food allergies, celiac disease, or chronic kidney disease may need individualized adjustments.',
      mealPlan: {
        intro: 'Portions are examples; personalize clinically as needed.',
        days: [
          {
            title: 'Day 1',
            meals: [
              'Breakfast: Greek yogurt (plain), berries, chia, drizzle of olive oil',
              'Lunch: Farro bowl with chickpeas, cucumber, tomato, olives, feta, lemon-olive oil dressing',
              'Snack: Apple + 1 oz almonds',
              'Dinner: Baked salmon, roasted zucchini & peppers, small side of whole-grain couscous',
            ],
          },
          {
            title: 'Day 2',
            meals: [
              'Breakfast: Oatmeal cooked with milk, walnuts, sliced banana, cinnamon',
              'Lunch: Lentil soup, side salad with EVOO & balsamic, whole-grain bread',
              'Snack: Carrot sticks + hummus',
              'Dinner: Whole-wheat pasta with tomato-garlic sauce, sautéed spinach, shaved parmesan',
            ],
          },
          {
            title: 'Day 3',
            meals: [
              'Breakfast: Veggie omelet (spinach, tomato, onion) with whole-grain toast',
              'Lunch: Tuna (or white-bean) salad with olives, capers, arugula, olive oil + lemon; whole-grain crackers',
              'Snack: Pear + 2 Tbsp mixed seeds',
              'Dinner: Roasted chicken thighs, herbed potatoes, side salad with olive oil & lemon',
            ],
          },
        ],
      },
      samplePlate: {
        description:
          'A simple plate visual: ~½ non-starchy vegetables; ~¼ whole grains or starchy vegetables; ~¼ lean protein (fish/legumes/poultry); plus a small portion of nuts/seeds and olive oil for dressing. Water most often; coffee/tea unsweetened; limit sugary drinks.',
        imagePath: '/assets/diets/mediterranean/plate.svg',
      },
      swaps: [
        { from: 'Butter', to: 'Extra-virgin olive oil' },
        { from: 'White bread', to: 'Whole-grain bread' },
        { from: 'Processed deli meat', to: 'Beans, lentils, or grilled poultry/fish' },
        { from: 'Creamy dressings', to: 'Olive oil + lemon or vinaigrette' },
        { from: 'Sugary desserts', to: 'Fruit with nuts or yogurt' },
        { from: 'Chips', to: 'Roasted chickpeas or olives' },
        { from: 'Refined pasta', to: 'Whole-wheat or legume-based pasta' },
      ],
      moreInfo: [
        {
          label: 'American Heart Association – Mediterranean eating pattern',
          url: 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/nutrition-basics/mediterranean-diet',
        },
        {
          label: 'Harvard T.H. Chan School of Public Health – Mediterranean Diet overview',
          url: 'https://www.hsph.harvard.edu/nutritionsource/healthy-weight/diet-reviews/mediterranean-diet/',
        },
        {
          label: 'Oldways – Mediterranean Diet resources & pyramid',
          url: 'https://oldwayspt.org/resources/mediterranean-diet-pyramid',
        },
      ],
      disclaimer:
        'This handout is for educational purposes and does not replace medical advice. Patients with specific conditions should follow individualized recommendations from their healthcare team.',
    },
  },
  {
    slug: 'dash',
    name: 'DASH (Dietary Approaches to Stop Hypertension)',
    whatItIs:
      'A flexible eating pattern created to lower blood pressure by emphasizing produce, low-fat dairy, lean proteins, and foods rich in potassium, calcium, and magnesium.',
    corePrinciples: [
      'Fill half the plate with fruits and vegetables at most meals.',
      'Choose low-fat or fat-free dairy, lean poultry, fish, beans, and nuts for protein.',
      'Select whole grains such as oats, brown rice, and whole-wheat pasta for fiber.',
      'Limit sodium by cooking with herbs, spices, and citrus instead of salt.',
      'Reduce intake of processed meats, sugary drinks, and desserts.',
    ],
    samplePlate: [
      'Half plate: roasted broccoli, carrots, and bell peppers.',
      'Quarter plate: baked chicken breast seasoned with garlic and herbs.',
      'Quarter plate: quinoa pilaf with chickpeas.',
      'Side: low-fat yogurt with berries and cinnamon.',
    ],
    swaps: [
      'Use herbs, garlic, and vinegar instead of salt-based seasoning blends.',
      'Replace processed deli meats with sliced turkey or beans.',
      'Swap chips for unsalted nuts, air-popped popcorn, or crunchy vegetables.',
      'Choose sparkling water with fruit instead of soda.',
    ],
    gettingStarted: [
      'Review nutrition labels and aim for less than 2,300 mg sodium per day (1,500 mg for stricter plans).',
      'Batch-cook whole grains to speed up weeknight meals.',
      'Rinse canned beans and vegetables to remove excess sodium.',
      'Flavor dishes with citrus, vinegar, fresh herbs, and salt-free spice blends.',
      'Schedule grocery time to stock fruits and vegetables in advance.',
    ],
    moreInfo: [
      {
        label: 'National Heart, Lung, and Blood Institute — DASH Eating Plan',
        url: 'https://www.nhlbi.nih.gov/education/dash-eating-plan',
      },
      {
        label: 'American Heart Association — Lower Blood Pressure with DASH',
        url: 'https://www.heart.org/en/health-topics/high-blood-pressure/eating-to-reduce-high-blood-pressure',
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  },
  {
    slug: 'low-fodmap',
    name: 'Low FODMAP',
    whatItIs:
      'A short-term therapeutic approach for IBS and related GI symptoms that limits fermentable carbohydrates which can trigger bloating, gas, and discomfort.',
    corePrinciples: [
      'Limit high FODMAP foods during the elimination phase (2–6 weeks).',
      'Focus on allowed staples such as rice, oats, quinoa, lactose-free dairy, firm tofu, and many fruits and vegetables.',
      'Read ingredient labels carefully for hidden FODMAP sources (inulin, honey, high-fructose corn syrup).',
      'After symptom calm, reintroduce food groups systematically with guidance from a dietitian.',
      'Aim for long-term personalization rather than indefinite restriction.',
    ],
    samplePlate: [
      'Half plate: sautéed zucchini, carrots, and baby spinach in garlic-infused oil (remove garlic solids).',
      'Quarter plate: grilled chicken with lemon and herbs.',
      'Quarter plate: brown rice or quinoa.',
      'Side: lactose-free yogurt with strawberries and chia seeds.',
    ],
    swaps: [
      'Use garlic-infused oil instead of whole garlic or onion.',
      'Select lactose-free milk or plant milks low in FODMAPs (almond, lactose-free cow’s milk).',
      'Choose maple syrup or table sugar over honey or agave.',
      'Replace wheat pasta with rice, corn, or quinoa-based pasta.',
    ],
    gettingStarted: [
      'Work with a dietitian trained in the low FODMAP process for personalized guidance.',
      'Download a reputable low FODMAP food list or app for quick reference.',
      'Plan weekly menus to maintain adequate fiber and nutrient variety.',
      'Journal symptoms, portions, and stressors to guide reintroduction phases.',
      'After elimination, reintroduce one food group at a time to identify personal triggers.',
    ],
    moreInfo: [
      {
        label: 'Monash University FODMAP Program',
        url: 'https://www.monashfodmap.com',
      },
      {
        label: 'Academy of Nutrition and Dietetics — Low FODMAP Overview',
        url: 'https://www.eatright.org/health/diseases-and-conditions/digestive-disorders/what-is-the-low-fodmap-diet',
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  },
  {
    slug: 'mind',
    name: 'MIND (Mediterranean–DASH Intervention for Neurodegenerative Delay)',
    whatItIs:
      'A hybrid of the Mediterranean and DASH diets created to support brain health through antioxidant-rich foods and healthy fats.',
    corePrinciples: [
      'Prioritize leafy greens and other colorful vegetables daily.',
      'Include berries at least twice per week for polyphenols.',
      'Choose nuts, seeds, and legumes for plant-based proteins.',
      'Use olive oil as the main fat; limit butter, pastries, and fried foods.',
      'Include fish weekly and poultry regularly; reserve red meats for occasional meals.',
    ],
    samplePlate: [
      'Half plate: kale and blueberry salad with walnuts and olive oil dressing.',
      'Quarter plate: baked cod with rosemary and lemon.',
      'Quarter plate: barley pilaf with mushrooms and onions.',
      'Extras: side of beans or lentils and water infused with citrus.',
    ],
    swaps: [
      'Snack on walnuts or pumpkin seeds instead of fried chips.',
      'Use olive oil on toast or vegetables instead of butter.',
      'Choose whole-grain toast for breakfast instead of pastries.',
      'Replace sugary desserts with fresh or frozen berries.',
    ],
    gettingStarted: [
      'Plan weekly grocery lists around leafy greens, berries, nuts, and beans.',
      'Batch-cook grains and legumes for quick bowls or salads.',
      'Keep frozen berries and vegetables on hand for smoothies and sides.',
      'Experiment with herb and spice blends to flavor vegetables and fish.',
      'Track how often fish, berries, and greens appear to stay on target.',
    ],
    moreInfo: [
      {
        label: 'Rush University Medical Center — MIND Diet Basics',
        url: 'https://www.rush.edu/news/mind-diet',
      },
      {
        label: 'Alzheimer’s Association — Healthy Eating for Brain Health',
        url: 'https://www.alz.org/help-support/brain_health/10_ways_to_love_your_brain-food',
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  },
  {
    slug: 'heart-healthy',
    name: 'Heart-Healthy',
    whatItIs:
      'A cardioprotective approach focused on lowering LDL cholesterol, managing blood pressure, and supporting weight and glucose control with minimally processed foods.',
    corePrinciples: [
      'Emphasize vegetables, fruits, legumes, whole grains, and high-fiber foods.',
      'Include fatty fish (salmon, sardines, trout) twice per week for omega-3 fats.',
      'Choose lean proteins and plant proteins while limiting processed and red meats.',
      'Select unsaturated fats (olive, avocado, canola oils) and reduce saturated and trans fats.',
      'Limit sodium, added sugars, and refined carbohydrates.',
    ],
    samplePlate: [
      'Half plate: roasted Brussels sprouts, carrots, and bell peppers.',
      'Quarter plate: grilled trout with lemon.',
      'Quarter plate: wild rice blend.',
      'Side: mixed greens with beans, seeds, and light vinaigrette.',
    ],
    swaps: [
      'Use avocado or olive oil-based spreads instead of butter.',
      'Swap refined grains for whole grains such as brown rice or whole-wheat pasta.',
      'Choose plain yogurt topped with fruit in place of sweetened desserts.',
      'Replace processed meats with roasted poultry, beans, or lentils.',
    ],
    gettingStarted: [
      'Schedule time to read nutrition labels and choose lower-sodium options.',
      'Plan fish meals in advance; keep frozen fillets or canned salmon on hand.',
      'Incorporate beans or lentils into soups, salads, or entrees three times per week.',
      'Aim for at least 25–30 grams of fiber daily through whole foods.',
      'Combine dietary changes with movement, stress management, and sleep hygiene.',
    ],
    moreInfo: [
      {
        label: 'American Heart Association — Healthy Eating Recommendations',
        url: 'https://www.heart.org/en/healthy-living/healthy-eating',
      },
      {
        label: 'National Heart, Lung, and Blood Institute — Heart-Healthy Living',
        url: 'https://www.nhlbi.nih.gov/health/heart-healthy-living',
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  },
]

export const dietGuideMap = new Map(dietGuides.map((diet) => [diet.slug, diet]))
