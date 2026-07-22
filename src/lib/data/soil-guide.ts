export type SoilGuideEntry = { summary:string; texture:string; fertility:string; retention:string; crops:string[]; maintenance:string; tips:string[] };
export const SOIL_GUIDE: Record<string, SoilGuideEntry> = {
  Clay: {
    summary: 'Heavy, fine-textured soil that stays wet and holds nutrients well.',
    texture: 'Fine particles, sticky and dense when wet',
    fertility: 'High',
    retention: 'Very high (85-100%)',
    crops: ['Rice', 'Sugarcane', 'Potato', 'Ginger'],
    maintenance: 'Keep fields level and manage flooding carefully. Add organic matter and gypsum to reduce compaction and improve structure.',
    tips: ['Use green manure to improve aeration', 'Avoid long waterlogging periods unless planting paddy', 'Rotate with legumes to restore nutrients']
  },
  Loamy: {
    summary: 'The ideal balance of sand, silt, and clay—best for most crops.',
    texture: 'Soft, crumbly, easy to work with',
    fertility: 'Very high',
    retention: 'High (50-75%)',
    crops: ['Tomato', 'Wheat', 'Corn', 'Potato', 'Cotton'],
    maintenance: 'Maintain soil structure with compost and mulch. Avoid overwatering and compacting the soil with heavy machinery.',
    tips: ['Add compost or well-rotted manure every season', 'Use mulches to retain moisture and suppress weeds', 'Rotate crops to keep nutrients balanced']
  },
  Sandy: {
    summary: 'Light, quick-draining soil that warms fast but loses moisture quickly.',
    texture: 'Coarse, gritty, fast-draining',
    fertility: 'Low',
    retention: 'Low (20-30%)',
    crops: ['Carrot', 'Corn', 'Eggplant', 'Melon', 'Peppers'],
    maintenance: 'Boost organic matter and irrigate frequently with smaller doses. Use mulch to reduce evaporation and keep soil cool.',
    tips: ['Apply compost or organic mulch regularly', 'Use drip irrigation for even moisture', 'Avoid heavy fertilizers all at once; split applications']
  },
  Silt: {
    summary: 'Smooth, fertile soil that holds moisture well and drains better than clay.',
    texture: 'Silky, fine but not sticky',
    fertility: 'Medium',
    retention: 'Medium (40-60%)',
    crops: ['Leafy Greens', 'Peppers', 'Herbs', 'Brassicas'],
    maintenance: 'Protect against erosion with cover crops and mulches. Keep organic matter high and avoid compaction during wet periods.',
    tips: ['Use cover crops to prevent topsoil loss', 'Add organic matter to improve structure', 'Avoid working soil when it is too wet']
  }
};
