export type Quiz = { q:string; opts:string[]; ans:number; explanation:string };
export const QUIZZES: Quiz[] = [
  {
    q: 'What is the ideal soil pH for most vegetables?',
    opts: ['4.5-5.0', '6.0-7.0', '8.0-8.5', '3.0-4.0'],
    ans: 1,
    explanation: 'Most vegetables prefer slightly acidic to neutral soil, around pH 6.0-7.0, for strong nutrient uptake and growth.'
  },
  {
    q: 'How many hours of direct sunlight do most crops need daily?',
    opts: ['2-3 hours', '4-5 hours', '6-8 hours', '10-12 hours'],
    ans: 2,
    explanation: 'Most field crops need about 6-8 hours of direct sunlight for strong photosynthesis and healthy growth.'
  },
  {
    q: 'Which practice helps keep disease pressure low in the field?',
    opts: ['Plant same crop each season', 'Apply pesticide every day', 'Rotate crops and remove infected plants', 'Water at night only'],
    ans: 2,
    explanation: 'Crop rotation and removing infected plants reduce disease build-up and keep pathogens from spreading.'
  },
  {
    q: 'What does NPK refer to on fertilizer labels?',
    opts: ['Nitrogen, Potash, Phosphorus', 'Nitrogen, Phosphorus, Potash', 'Nitrate, Potassium, Phosphate', 'Natural, Protein, Kelp'],
    ans: 1,
    explanation: 'NPK stands for Nitrogen, Phosphorus, and Potash (Potassium), the main nutrients crops need.'
  },
  {
    q: 'What is the best way to water a crop during dry spells?',
    opts: ['Flood the whole field', 'Use drip or sprinkler irrigation', 'Water only once a month', 'Water at noon only'],
    ans: 1,
    explanation: 'Drip or sprinkler systems apply water consistently and reduce waste compared to flooding or random watering.'
  },
  {
    q: 'Which symptom is most likely a sign of nutrient deficiency?',
    opts: ['Bright new leaves', 'Yellowing older leaves', 'Vigorous growth', 'Thick stems'],
    ans: 1,
    explanation: 'Yellowing older leaves often indicate nutrient deficiency, commonly nitrogen or magnesium lack.'
  },
  {
    q: 'How often should farmers scout their field for pests during growing season?',
    opts: ['Once per season', 'Once per month', 'Once per week', 'Only after harvest'],
    ans: 2,
    explanation: 'Weekly scouting helps catch pests and diseases early before they become a major problem.'
  },
  {
    q: 'What is the best time of day to apply foliar sprays or pesticides?',
    opts: ['Midday heat', 'Early morning or late afternoon', 'Late night', 'During rain'],
    ans: 1,
    explanation: 'Early morning or late afternoon reduces evaporation and helps spray droplets stick to leaves.'
  },
  {
    q: 'Why is soil organic matter important?',
    opts: ['It makes soil heavy', 'It increases water retention and fertility', 'It stops sunlight', 'It attracts pests'],
    ans: 1,
    explanation: 'Organic matter improves water retention, nutrient availability, and soil structure, benefiting crops.'
  },
  {
    q: 'What is the main benefit of using cover crops?',
    opts: ['Reduce erosion and add nutrients', 'Stop growth completely', 'Increase pests', 'Use more water'],
    ans: 0,
    explanation: 'Cover crops protect the soil from erosion, add organic matter, and help maintain nutrient balance.'
  }
];
