/**
 * Whisky catalog enrichment seed.
 * Run: npx tsx --env-file=../../apps/api/.env src/seed/enrich.ts
 */
import { db, queryClient } from '../db.js';
import { sql } from 'drizzle-orm';

// ─── Whisky catalog ───────────────────────────────────────────────────────────
const WHISKIES: Array<{
  name: string;
  distillery: string;
  age: number | null;
  volume: number;
  category: string;
  region: string | null;
  cask: string | null;
  abv: number;
  imageUrl: string | null;
}> = [
  // MACALLAN
  { name: 'The Macallan 12 Year Old Sherry Oak', distillery: 'Macallan', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Sherry', abv: 43, imageUrl: 'https://cdn.thewhiskyexchange.com/img/products/whim_mac_12y_sho.jpg' },
  { name: 'The Macallan 18 Year Old Sherry Oak', distillery: 'Macallan', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Sherry', abv: 43, imageUrl: 'https://cdn.thewhiskyexchange.com/img/products/whim_mac_18y_sho.jpg' },
  { name: 'The Macallan Double Cask 12 Year Old', distillery: 'Macallan', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Double Cask', abv: 40, imageUrl: 'https://cdn.thewhiskyexchange.com/img/products/whim_mac_dc12.jpg' },
  { name: 'The Macallan Double Cask 15 Year Old', distillery: 'Macallan', age: 15, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Double Cask', abv: 43, imageUrl: null },
  { name: 'The Macallan Rare Cask', distillery: 'Macallan', age: null, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Rare Cask', abv: 43, imageUrl: null },
  // GLENFIDDICH
  { name: 'Glenfiddich 12 Year Old', distillery: 'Glenfiddich', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Glenfiddich 15 Year Old Solera', distillery: 'Glenfiddich', age: 15, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Solera Vat', abv: 40, imageUrl: null },
  { name: 'Glenfiddich 18 Year Old Small Batch', distillery: 'Glenfiddich', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Oloroso Sherry', abv: 40, imageUrl: null },
  { name: 'Glenfiddich 21 Year Old Gran Reserva', distillery: 'Glenfiddich', age: 21, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Caribbean Rum', abv: 40, imageUrl: null },
  // GLENLIVET
  { name: 'The Glenlivet 12 Year Old', distillery: 'Glenlivet', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'The Glenlivet 15 Year Old French Oak', distillery: 'Glenlivet', age: 15, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'French Oak', abv: 40, imageUrl: null },
  { name: 'The Glenlivet 18 Year Old', distillery: 'Glenlivet', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American & French Oak', abv: 40, imageUrl: null },
  // LAGAVULIN
  { name: 'Lagavulin 8 Year Old', distillery: 'Lagavulin', age: 8, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'European Oak', abv: 48, imageUrl: null },
  { name: 'Lagavulin 16 Year Old', distillery: 'Lagavulin', age: 16, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'European Oak', abv: 43, imageUrl: null },
  { name: 'Lagavulin Distillers Edition', distillery: 'Lagavulin', age: 16, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'Pedro Ximenez', abv: 43, imageUrl: null },
  // LAPHROAIG
  { name: 'Laphroaig 10 Year Old', distillery: 'Laphroaig', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Laphroaig Quarter Cask', distillery: 'Laphroaig', age: null, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'Quarter Cask', abv: 48, imageUrl: null },
  { name: 'Laphroaig 10 Year Old Cask Strength', distillery: 'Laphroaig', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American Oak', abv: 58, imageUrl: null },
  // ARDBEG
  { name: 'Ardbeg 10 Year Old', distillery: 'Ardbeg', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American Oak', abv: 46, imageUrl: null },
  { name: 'Ardbeg Uigeadail', distillery: 'Ardbeg', age: null, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'Oloroso Sherry', abv: 54.2, imageUrl: null },
  { name: 'Ardbeg Corryvreckan', distillery: 'Ardbeg', age: null, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'French Oak', abv: 57.1, imageUrl: null },
  // BOWMORE
  { name: 'Bowmore 12 Year Old', distillery: 'Bowmore', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Bowmore 15 Year Old Darkest', distillery: 'Bowmore', age: 15, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'Oloroso Sherry', abv: 43, imageUrl: null },
  { name: 'Bowmore 18 Year Old', distillery: 'Bowmore', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American & European Oak', abv: 43, imageUrl: null },
  // HIGHLAND PARK
  { name: 'Highland Park 12 Year Old Viking Honour', distillery: 'Highland Park', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Islands', cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Highland Park 18 Year Old Viking Pride', distillery: 'Highland Park', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Islands', cask: 'American & European Oak', abv: 43, imageUrl: null },
  // GLENMORANGIE
  { name: 'Glenmorangie The Original 10 Year Old', distillery: 'Glenmorangie', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American White Oak', abv: 40, imageUrl: null },
  { name: 'Glenmorangie Lasanta 12 Year Old', distillery: 'Glenmorangie', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'Sherry', abv: 43, imageUrl: null },
  { name: 'Glenmorangie Quinta Ruban 14 Year Old', distillery: 'Glenmorangie', age: 14, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'Port', abv: 46, imageUrl: null },
  { name: "Glenmorangie Nectar D'Or 12 Year Old", distillery: 'Glenmorangie', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'Sauternes', abv: 46, imageUrl: null },
  // DALMORE
  { name: 'The Dalmore 12 Year Old', distillery: 'Dalmore', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American White Oak & Sherry', abv: 40, imageUrl: null },
  { name: 'The Dalmore 15 Year Old', distillery: 'Dalmore', age: 15, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American White Oak & Sherry', abv: 40, imageUrl: null },
  // GLENFARCLAS
  { name: 'Glenfarclas 10 Year Old', distillery: 'Glenfarclas', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Sherry', abv: 40, imageUrl: null },
  { name: 'Glenfarclas 15 Year Old', distillery: 'Glenfarclas', age: 15, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Sherry', abv: 46, imageUrl: null },
  { name: 'Glenfarclas 25 Year Old', distillery: 'Glenfarclas', age: 25, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Sherry', abv: 43, imageUrl: null },
  // BRUICHLADDICH
  { name: 'Bruichladdich The Classic Laddie', distillery: 'Bruichladdich', age: null, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American Oak', abv: 50, imageUrl: null },
  { name: 'Bruichladdich Port Charlotte 10 Year Old', distillery: 'Bruichladdich', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American & European Oak', abv: 50, imageUrl: null },
  // CAOL ILA
  { name: 'Caol Ila 12 Year Old', distillery: 'Caol Ila', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American Oak', abv: 43, imageUrl: null },
  { name: 'Caol Ila Moch', distillery: 'Caol Ila', age: null, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American Oak', abv: 43, imageUrl: null },
  // OBAN
  { name: 'Oban 14 Year Old', distillery: 'Oban', age: 14, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 43, imageUrl: null },
  // SPRINGBANK
  { name: 'Springbank 10 Year Old', distillery: 'Springbank', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Campbeltown', cask: 'Bourbon', abv: 46, imageUrl: null },
  { name: 'Springbank 15 Year Old', distillery: 'Springbank', age: 15, volume: 700, category: 'scotch_single_malt', region: 'Campbeltown', cask: 'Bourbon & Sherry', abv: 46, imageUrl: null },
  // COMPASS BOX
  { name: 'Compass Box Great King Street', distillery: 'Compass Box', age: null, volume: 700, category: 'scotch_blended', region: 'Lowland', cask: 'American Oak', abv: 43, imageUrl: null },
  // BOURBON
  { name: "Maker's Mark", distillery: "Maker's Mark", age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'American White Oak', abv: 45, imageUrl: null },
  { name: 'Buffalo Trace', distillery: 'Buffalo Trace', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 45, imageUrl: null },
  { name: 'Woodford Reserve', distillery: 'Woodford Reserve', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 43.2, imageUrl: null },
  { name: 'Bulleit Bourbon', distillery: 'Bulleit', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'American White Oak', abv: 45, imageUrl: null },
  { name: 'Wild Turkey 101', distillery: 'Wild Turkey', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'American White Oak', abv: 50.5, imageUrl: null },
  { name: 'Knob Creek 9 Year Old', distillery: 'Knob Creek', age: 9, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 50, imageUrl: null },
  { name: 'Four Roses Small Batch', distillery: 'Four Roses', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'American Oak', abv: 45, imageUrl: null },
  { name: 'Elijah Craig Small Batch', distillery: 'Heaven Hill', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 47, imageUrl: null },
  { name: 'Eagle Rare 10 Year Old', distillery: 'Buffalo Trace', age: 10, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 45, imageUrl: null },
  { name: "Blanton's Original Single Barrel", distillery: 'Buffalo Trace', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 46.5, imageUrl: null },
  { name: "Michter's US1 Small Batch Bourbon", distillery: "Michter's", age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 45.7, imageUrl: null },
  // RYE
  { name: 'Bulleit Rye', distillery: 'Bulleit', age: null, volume: 700, category: 'rye', region: 'Kentucky', cask: 'American White Oak', abv: 45, imageUrl: null },
  { name: 'WhistlePig 10 Year Old', distillery: 'WhistlePig', age: 10, volume: 700, category: 'rye', region: 'Vermont', cask: 'American Oak', abv: 50, imageUrl: null },
  { name: 'Rittenhouse Rye Bottled-in-Bond', distillery: 'Heaven Hill', age: 4, volume: 700, category: 'rye', region: 'Kentucky', cask: 'New American Oak', abv: 50, imageUrl: null },
  // IRISH
  { name: 'Redbreast 12 Year Old', distillery: 'Midleton', age: 12, volume: 700, category: 'irish_single_pot_still', region: 'Cork', cask: 'Bourbon & Sherry', abv: 40, imageUrl: null },
  { name: 'Redbreast 15 Year Old', distillery: 'Midleton', age: 15, volume: 700, category: 'irish_single_pot_still', region: 'Cork', cask: 'Bourbon & Sherry', abv: 46, imageUrl: null },
  { name: 'Green Spot Single Pot Still', distillery: 'Midleton', age: null, volume: 700, category: 'irish_single_pot_still', region: 'Cork', cask: 'Bourbon & Sherry', abv: 40, imageUrl: null },
  { name: 'Yellow Spot 12 Year Old', distillery: 'Midleton', age: 12, volume: 700, category: 'irish_single_pot_still', region: 'Cork', cask: 'Bourbon, Sherry & Malaga', abv: 46, imageUrl: null },
  { name: 'Jameson Original', distillery: 'Midleton', age: null, volume: 700, category: 'irish_blended', region: 'Cork', cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Teeling Single Grain', distillery: 'Teeling', age: null, volume: 700, category: 'irish_single_grain', region: 'Dublin', cask: 'California Red Wine', abv: 46, imageUrl: null },
  { name: 'Teeling Single Malt', distillery: 'Teeling', age: null, volume: 700, category: 'irish_single_malt', region: 'Dublin', cask: 'Rum, Port, Sherry', abv: 46, imageUrl: null },
  { name: 'Powers Gold Label', distillery: 'Midleton', age: null, volume: 700, category: 'irish_blended', region: 'Cork', cask: 'Bourbon', abv: 43.2, imageUrl: null },
  // JAPANESE
  { name: 'Nikka Whisky From The Barrel', distillery: 'Nikka', age: null, volume: 500, category: 'japanese_blended', region: 'Hokkaido', cask: 'Bourbon, Sherry, New Oak', abv: 51.4, imageUrl: null },
  { name: 'Nikka Pure Malt Black', distillery: 'Nikka', age: null, volume: 700, category: 'japanese_blended_malt', region: 'Hokkaido', cask: 'Bourbon & Sherry', abv: 43, imageUrl: null },
  { name: 'Suntory Toki', distillery: 'Suntory', age: null, volume: 700, category: 'japanese_blended', region: 'Japan', cask: 'American White Oak', abv: 43, imageUrl: null },
  { name: 'Yamazaki 12 Year Old', distillery: 'Suntory', age: 12, volume: 700, category: 'japanese_single_malt', region: 'Osaka', cask: 'Mizunara, Sherry, American Oak', abv: 43, imageUrl: null },
  { name: 'Hakushu 12 Year Old', distillery: 'Suntory', age: 12, volume: 700, category: 'japanese_single_malt', region: 'Yamanashi', cask: 'American & European Oak', abv: 43, imageUrl: null },
  { name: 'Hibiki Japanese Harmony', distillery: 'Suntory', age: null, volume: 700, category: 'japanese_blended', region: 'Japan', cask: 'American, European, Mizunara', abv: 43, imageUrl: null },
  { name: 'Togouchi 12 Year Old', distillery: 'Chugoku Jozo', age: 12, volume: 700, category: 'japanese_blended', region: 'Hiroshima', cask: 'American & European Oak', abv: 40, imageUrl: null },
  // TAIWANESE
  { name: 'Kavalan Solist Vinho Barrique', distillery: 'Kavalan', age: null, volume: 700, category: 'taiwanese_single_malt', region: 'Yilan', cask: 'Vinho Barrique', abv: 57.8, imageUrl: null },
  { name: 'Kavalan Classic', distillery: 'Kavalan', age: null, volume: 700, category: 'taiwanese_single_malt', region: 'Yilan', cask: 'American & European Oak', abv: 40, imageUrl: null },
  // INDIAN
  { name: 'Paul John Bold', distillery: 'Paul John', age: null, volume: 700, category: 'indian_single_malt', region: 'Goa', cask: 'American White Oak', abv: 46, imageUrl: null },
  { name: 'Amrut Fusion', distillery: 'Amrut', age: null, volume: 700, category: 'indian_single_malt', region: 'Bangalore', cask: 'American & Peated Malt', abv: 50, imageUrl: null },
  // ADDITIONAL SCOTCH
  { name: 'Aberfeldy 12 Year Old', distillery: 'Aberfeldy', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Balvenie DoubleWood 12 Year Old', distillery: 'Balvenie', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Bourbon & Sherry', abv: 40, imageUrl: null },
  { name: 'Balvenie Caribbean Cask 14 Year Old', distillery: 'Balvenie', age: 14, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Rum', abv: 43, imageUrl: null },
  { name: 'Balvenie PortWood 21 Year Old', distillery: 'Balvenie', age: 21, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Port', abv: 40, imageUrl: null },
  { name: 'Craigellachie 13 Year Old', distillery: 'Craigellachie', age: 13, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American Oak', abv: 46, imageUrl: null },
  { name: 'Glen Scotia 15 Year Old', distillery: 'Glen Scotia', age: 15, volume: 700, category: 'scotch_single_malt', region: 'Campbeltown', cask: 'American Oak', abv: 46, imageUrl: null },
  { name: 'Ardmore Legacy', distillery: 'Ardmore', age: null, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'Bourbon', abv: 40, imageUrl: null },
  { name: 'Tomatin 12 Year Old', distillery: 'Tomatin', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American & European Oak', abv: 43, imageUrl: null },
  { name: 'GlenDronach 12 Year Old', distillery: 'GlenDronach', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'Sherry', abv: 43, imageUrl: null },
  { name: 'GlenDronach 18 Year Old Allardice', distillery: 'GlenDronach', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'Oloroso Sherry', abv: 46, imageUrl: null },
  { name: 'Benriach The Original Ten', distillery: 'BenRiach', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Bourbon & Virgin Oak', abv: 43, imageUrl: null },
  { name: 'Kilchoman Machir Bay', distillery: 'Kilchoman', age: null, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'Bourbon & Sherry', abv: 46, imageUrl: null },
  { name: 'Bunnahabhain 12 Year Old', distillery: 'Bunnahabhain', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American & European Oak', abv: 46.3, imageUrl: null },
  { name: 'Isle of Jura 10 Year Old', distillery: 'Isle of Jura', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Islands', cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Talisker 10 Year Old', distillery: 'Talisker', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Islands', cask: 'American Oak', abv: 45.8, imageUrl: null },
  { name: 'Talisker Storm', distillery: 'Talisker', age: null, volume: 700, category: 'scotch_single_malt', region: 'Islands', cask: 'American & European Oak', abv: 45.8, imageUrl: null },
  { name: 'Ledaig 10 Year Old', distillery: 'Tobermory', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Islands', cask: 'American & European Oak', abv: 46.3, imageUrl: null },
  // BLENDED SCOTCH
  { name: 'Johnnie Walker Black Label 12 Year Old', distillery: 'Johnnie Walker', age: 12, volume: 700, category: 'scotch_blended', region: null, cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Johnnie Walker Blue Label', distillery: 'Johnnie Walker', age: null, volume: 700, category: 'scotch_blended', region: null, cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Chivas Regal 12 Year Old', distillery: 'Chivas Brothers', age: 12, volume: 700, category: 'scotch_blended', region: null, cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Chivas Regal 18 Year Old', distillery: 'Chivas Brothers', age: 18, volume: 700, category: 'scotch_blended', region: null, cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'The Famous Grouse', distillery: 'Edrington', age: null, volume: 700, category: 'scotch_blended', region: null, cask: 'American & European Oak', abv: 40, imageUrl: null },
  // TENNESSEE
  { name: "Jack Daniel's Old No. 7", distillery: "Jack Daniel's", age: null, volume: 700, category: 'tennessee', region: 'Tennessee', cask: 'New American Oak (Charcoal Mellowed)', abv: 40, imageUrl: null },
  { name: 'Gentleman Jack', distillery: "Jack Daniel's", age: null, volume: 700, category: 'tennessee', region: 'Tennessee', cask: 'New American Oak', abv: 40, imageUrl: null },
  { name: "Jack Daniel's Single Barrel Select", distillery: "Jack Daniel's", age: null, volume: 700, category: 'tennessee', region: 'Tennessee', cask: 'New American Oak', abv: 47, imageUrl: null },
  { name: 'George Dickel No. 12', distillery: 'George Dickel', age: null, volume: 700, category: 'tennessee', region: 'Tennessee', cask: 'New American Oak', abv: 45, imageUrl: null },

  // ── SPEYSIDE ADDITIONS ──────────────────────────────────────────────────────
  { name: 'Glen Grant 10 Year Old', distillery: 'Glen Grant', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Glen Grant 18 Year Old Rare Edition', distillery: 'Glen Grant', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Oloroso Sherry', abv: 43, imageUrl: null },
  { name: 'Glenrothes 12 Year Old', distillery: 'Glenrothes', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Glenrothes 18 Year Old', distillery: 'Glenrothes', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Sherry', abv: 43, imageUrl: null },
  { name: 'Tamdhu 10 Year Old', distillery: 'Tamdhu', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Sherry', abv: 40, imageUrl: null },
  { name: 'Tamdhu 12 Year Old', distillery: 'Tamdhu', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Oloroso Sherry', abv: 43, imageUrl: null },
  { name: 'Knockando 12 Year Old', distillery: 'Knockando', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American & European Oak', abv: 43, imageUrl: null },
  { name: 'Speyburn 10 Year Old', distillery: 'Speyburn', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Strathisla 12 Year Old', distillery: 'Strathisla', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American & European Oak', abv: 43, imageUrl: null },
  { name: 'Longmorn 16 Year Old', distillery: 'Longmorn', age: 16, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American Oak', abv: 48, imageUrl: null },
  { name: 'Benromach 10 Year Old', distillery: 'Benromach', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American & European Oak', abv: 43, imageUrl: null },
  { name: 'Benromach Organic', distillery: 'Benromach', age: null, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American Oak', abv: 43, imageUrl: null },
  { name: 'Glenfiddich 15 Year Old Solera', distillery: 'Glenfiddich', age: 15, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Solera Vat', abv: 40, imageUrl: null },
  { name: 'Glenfiddich 26 Year Old Excellence', distillery: 'Glenfiddich', age: 26, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American & European Oak', abv: 43, imageUrl: null },
  { name: 'Glenfarclas 40 Year Old', distillery: 'Glenfarclas', age: 40, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Sherry', abv: 46, imageUrl: null },
  { name: 'Glenfarclas 105 Cask Strength', distillery: 'Glenfarclas', age: null, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Sherry', abv: 60, imageUrl: null },
  { name: 'GlenAllachie 12 Year Old', distillery: 'GlenAllachie', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Oloroso & PX Sherry', abv: 46, imageUrl: null },
  { name: 'GlenAllachie 15 Year Old', distillery: 'GlenAllachie', age: 15, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'Oloroso & PX Sherry', abv: 46, imageUrl: null },
  { name: 'Mortlach 16 Year Old', distillery: 'Mortlach', age: 16, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American & European Oak', abv: 43.4, imageUrl: null },
  { name: 'Singleton of Glendullan 12 Year Old', distillery: 'Singleton', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Cragganmore 12 Year Old', distillery: 'Cragganmore', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Linkwood 12 Year Old', distillery: 'Linkwood', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American Oak', abv: 43, imageUrl: null },
  { name: 'Miltonduff 10 Year Old', distillery: 'Miltonduff', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Tomintoul 10 Year Old', distillery: 'Tomintoul', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Speyside', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Glencadam 10 Year Old', distillery: 'Glencadam', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 46, imageUrl: null },
  { name: 'Glencadam 15 Year Old', distillery: 'Glencadam', age: 15, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 46, imageUrl: null },

  // ── HIGHLAND ADDITIONS ──────────────────────────────────────────────────────
  { name: 'Clynelish 14 Year Old', distillery: 'Clynelish', age: 14, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 46, imageUrl: null },
  { name: 'Dalwhinnie 15 Year Old', distillery: 'Dalwhinnie', age: 15, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 43, imageUrl: null },
  { name: 'Edradour 10 Year Old', distillery: 'Edradour', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Glengoyne 10 Year Old', distillery: 'Glengoyne', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Glengoyne 18 Year Old', distillery: 'Glengoyne', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'Oloroso Sherry', abv: 43, imageUrl: null },
  { name: 'Glengoyne 21 Year Old', distillery: 'Glengoyne', age: 21, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'Oloroso Sherry', abv: 43, imageUrl: null },
  { name: 'Ben Nevis 10 Year Old', distillery: 'Ben Nevis', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American & European Oak', abv: 46, imageUrl: null },
  { name: 'Balblair 12 Year Old', distillery: 'Balblair', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 46, imageUrl: null },
  { name: 'Balblair 18 Year Old', distillery: 'Balblair', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American & European Oak', abv: 46, imageUrl: null },
  { name: 'Royal Lochnagar 12 Year Old', distillery: 'Royal Lochnagar', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Old Pulteney 12 Year Old', distillery: 'Old Pulteney', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Old Pulteney 18 Year Old', distillery: 'Old Pulteney', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 46, imageUrl: null },
  { name: 'Glenturret 10 Year Old', distillery: 'Glenturret', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Wolfburn Aurora', distillery: 'Wolfburn', age: null, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 46, imageUrl: null },
  { name: 'Aberfeldy 16 Year Old', distillery: 'Aberfeldy', age: 16, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Tomatin 18 Year Old', distillery: 'Tomatin', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Highland', cask: 'Oloroso Sherry', abv: 46, imageUrl: null },

  // ── LOWLAND ADDITIONS ───────────────────────────────────────────────────────
  { name: 'Auchentoshan American Oak', distillery: 'Auchentoshan', age: null, volume: 700, category: 'scotch_single_malt', region: 'Lowland', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Auchentoshan 12 Year Old', distillery: 'Auchentoshan', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Lowland', cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Auchentoshan 18 Year Old', distillery: 'Auchentoshan', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Lowland', cask: 'American Oak', abv: 43, imageUrl: null },
  { name: 'Glenkinchie 12 Year Old', distillery: 'Glenkinchie', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Lowland', cask: 'American Oak', abv: 43, imageUrl: null },
  { name: 'Bladnoch 10 Year Old', distillery: 'Bladnoch', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Lowland', cask: 'American Oak', abv: 46.7, imageUrl: null },

  // ── CAMPBELTOWN ADDITIONS ───────────────────────────────────────────────────
  { name: 'Glen Scotia Double Cask', distillery: 'Glen Scotia', age: null, volume: 700, category: 'scotch_single_malt', region: 'Campbeltown', cask: 'Bourbon & Sherry', abv: 46, imageUrl: null },
  { name: 'Kilkerran 12 Year Old', distillery: 'Kilkerran', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Campbeltown', cask: 'Bourbon & Sherry', abv: 46, imageUrl: null },
  { name: 'Hazelburn 10 Year Old', distillery: 'Springbank', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Campbeltown', cask: 'American & European Oak', abv: 46, imageUrl: null },
  { name: 'Longrow Red', distillery: 'Springbank', age: null, volume: 700, category: 'scotch_single_malt', region: 'Campbeltown', cask: 'Red Wine', abv: 52.7, imageUrl: null },

  // ── ISLANDS ADDITIONS ───────────────────────────────────────────────────────
  { name: 'Isle of Arran 10 Year Old', distillery: 'Arran', age: 10, volume: 700, category: 'scotch_single_malt', region: 'Islands', cask: 'American & European Oak', abv: 46, imageUrl: null },
  { name: 'Isle of Arran 18 Year Old', distillery: 'Arran', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Islands', cask: 'Sherry', abv: 46, imageUrl: null },
  { name: 'Scapa Skiren', distillery: 'Scapa', age: null, volume: 700, category: 'scotch_single_malt', region: 'Islands', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Tobermory 12 Year Old', distillery: 'Tobermory', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Islands', cask: 'American & European Oak', abv: 46.3, imageUrl: null },
  { name: 'Talisker 18 Year Old', distillery: 'Talisker', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Islands', cask: 'American Oak', abv: 45.8, imageUrl: null },
  { name: 'Talisker Port Ruighe', distillery: 'Talisker', age: null, volume: 700, category: 'scotch_single_malt', region: 'Islands', cask: 'Port', abv: 45.8, imageUrl: null },

  // ── ISLAY ADDITIONS ─────────────────────────────────────────────────────────
  { name: 'Kilchoman Sanaig', distillery: 'Kilchoman', age: null, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'Sherry', abv: 46, imageUrl: null },
  { name: 'Bruichladdich Octomore 12.1', distillery: 'Bruichladdich', age: 5, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American Oak', abv: 59.9, imageUrl: null },
  { name: 'Ardbeg An Oa', distillery: 'Ardbeg', age: null, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'Pedro Ximenez & American Oak', abv: 46.6, imageUrl: null },
  { name: 'Bowmore No. 1', distillery: 'Bowmore', age: null, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Laphroaig 18 Year Old', distillery: 'Laphroaig', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American Oak', abv: 48, imageUrl: null },
  { name: 'Caol Ila 18 Year Old', distillery: 'Caol Ila', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American Oak', abv: 43, imageUrl: null },
  { name: 'Bunnahabhain 18 Year Old', distillery: 'Bunnahabhain', age: 18, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'Sherry', abv: 46.3, imageUrl: null },
  { name: 'Lagavulin 12 Year Old Cask Strength', distillery: 'Lagavulin', age: 12, volume: 700, category: 'scotch_single_malt', region: 'Islay', cask: 'American Oak', abv: 56.4, imageUrl: null },

  // ── BLENDED SCOTCH ADDITIONS ────────────────────────────────────────────────
  { name: 'Monkey Shoulder', distillery: 'William Grant & Sons', age: null, volume: 700, category: 'scotch_blended_malt', region: null, cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Naked Malt', distillery: 'Naked Malt', age: null, volume: 700, category: 'scotch_blended_malt', region: null, cask: 'Sherry', abv: 40, imageUrl: null },
  { name: 'Johnnie Walker Green Label 15 Year Old', distillery: 'Johnnie Walker', age: 15, volume: 700, category: 'scotch_blended_malt', region: null, cask: 'American & European Oak', abv: 43, imageUrl: null },
  { name: "Ballantine's 17 Year Old", distillery: "Ballantine's", age: 17, volume: 700, category: 'scotch_blended', region: null, cask: 'American & European Oak', abv: 43, imageUrl: null },
  { name: 'Royal Salute 21 Year Old', distillery: 'Chivas Brothers', age: 21, volume: 700, category: 'scotch_blended', region: null, cask: 'American & European Oak', abv: 40, imageUrl: null },
  { name: 'Compass Box Great King Street', distillery: 'Compass Box', age: null, volume: 700, category: 'scotch_blended', region: null, cask: 'American Oak', abv: 43, imageUrl: null },
  { name: 'Dewar\'s 18 Year Old', distillery: "Dewar's", age: 18, volume: 700, category: 'scotch_blended', region: null, cask: 'Oloroso Sherry', abv: 40, imageUrl: null },

  // ── MORE BOURBON ────────────────────────────────────────────────────────────
  { name: "Angel's Envy Bourbon", distillery: "Angel's Envy", age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'Port Wine Barrel Finish', abv: 43.3, imageUrl: null },
  { name: 'Old Forester 86 Proof', distillery: 'Brown-Forman', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 43, imageUrl: null },
  { name: 'Old Forester 1920 Prohibition Style', distillery: 'Brown-Forman', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 57.5, imageUrl: null },
  { name: 'W.L. Weller Special Reserve', distillery: 'Buffalo Trace', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 45, imageUrl: null },
  { name: 'W.L. Weller Antique 107', distillery: 'Buffalo Trace', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 53.5, imageUrl: null },
  { name: 'Evan Williams Single Barrel', distillery: 'Heaven Hill', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 43.3, imageUrl: null },
  { name: "Russell's Reserve 10 Year Old", distillery: 'Wild Turkey', age: 10, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 45, imageUrl: null },
  { name: 'Woodford Reserve Double Oaked', distillery: 'Woodford Reserve', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'Double Oaked', abv: 43.2, imageUrl: null },
  { name: "Maker's Mark 46", distillery: "Maker's Mark", age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'French Oak Staves', abv: 47, imageUrl: null },
  { name: "Basil Hayden's 8 Year Old", distillery: 'Jim Beam', age: 8, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 40, imageUrl: null },
  { name: 'Jim Beam Black Extra-Aged', distillery: 'Jim Beam', age: null, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 43, imageUrl: null },
  { name: "Pappy Van Winkle's Family Reserve 10 Year Old", distillery: 'Buffalo Trace', age: 10, volume: 700, category: 'bourbon', region: 'Kentucky', cask: 'New American Oak', abv: 53.5, imageUrl: null },

  // ── MORE RYE ────────────────────────────────────────────────────────────────
  { name: 'Sazerac Rye', distillery: 'Buffalo Trace', age: null, volume: 700, category: 'rye', region: 'Kentucky', cask: 'New American Oak', abv: 45, imageUrl: null },
  { name: 'High West Double Rye', distillery: 'High West', age: null, volume: 700, category: 'rye', region: 'Utah', cask: 'New American Oak', abv: 46, imageUrl: null },
  { name: 'Templeton Rye 4 Year Old', distillery: 'Templeton', age: 4, volume: 700, category: 'rye', region: 'Iowa', cask: 'New American Oak', abv: 40, imageUrl: null },
  { name: 'Redemption Rye', distillery: 'Redemption', age: null, volume: 700, category: 'rye', region: 'Indiana', cask: 'New American Oak', abv: 46, imageUrl: null },

  // ── MORE IRISH ──────────────────────────────────────────────────────────────
  { name: 'Method & Madness Single Malt', distillery: 'Midleton', age: null, volume: 700, category: 'irish_single_malt', region: 'Cork', cask: 'French Oak', abv: 46, imageUrl: null },
  { name: 'Dingle Single Malt', distillery: 'Dingle', age: null, volume: 700, category: 'irish_single_malt', region: 'Kerry', cask: 'Bourbon & Sherry', abv: 46.5, imageUrl: null },
  { name: 'Connemara Peated Single Malt', distillery: 'Cooley', age: null, volume: 700, category: 'irish_single_malt', region: 'Louth', cask: 'Bourbon', abv: 40, imageUrl: null },
  { name: 'The Tyrconnell Single Malt', distillery: 'Cooley', age: null, volume: 700, category: 'irish_single_malt', region: 'Louth', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Tullamore DEW 12 Year Old Special Reserve', distillery: 'Tullamore DEW', age: 12, volume: 700, category: 'irish_blended', region: 'Offaly', cask: 'Bourbon, Sherry & Rum', abv: 40, imageUrl: null },
  { name: "Powers John's Lane 12 Year Old", distillery: 'Midleton', age: 12, volume: 700, category: 'irish_single_pot_still', region: 'Cork', cask: 'Bourbon & Sherry', abv: 46, imageUrl: null },
  { name: 'Blue Spot 7 Year Old', distillery: 'Midleton', age: 7, volume: 700, category: 'irish_single_pot_still', region: 'Cork', cask: 'Bourbon & Sherry', abv: 58.5, imageUrl: null },
  { name: 'Teeling Brabazon Series 1', distillery: 'Teeling', age: null, volume: 700, category: 'irish_single_malt', region: 'Dublin', cask: 'Sweet Stout', abv: 49.5, imageUrl: null },
  { name: 'Writers Tears Copper Pot', distillery: 'Walsh Whiskey', age: null, volume: 700, category: 'irish_blended_malt', region: 'Carlow', cask: 'Bourbon', abv: 40, imageUrl: null },

  // ── MORE JAPANESE ───────────────────────────────────────────────────────────
  { name: 'Nikka Coffey Malt', distillery: 'Nikka', age: null, volume: 700, category: 'japanese_single_malt', region: 'Miyagi', cask: 'American Oak', abv: 45, imageUrl: null },
  { name: 'Nikka Coffey Grain', distillery: 'Nikka', age: null, volume: 700, category: 'japanese_single_grain', region: 'Miyagi', cask: 'American Oak', abv: 45, imageUrl: null },
  { name: 'Nikka Pure Malt Red', distillery: 'Nikka', age: null, volume: 700, category: 'japanese_blended_malt', region: 'Hokkaido', cask: 'Sherry', abv: 43, imageUrl: null },
  { name: 'Mars Komagatake', distillery: 'Mars', age: null, volume: 700, category: 'japanese_single_malt', region: 'Nagano', cask: 'American & European Oak', abv: 48, imageUrl: null },
  { name: 'Hakushu 18 Year Old', distillery: 'Suntory', age: 18, volume: 700, category: 'japanese_single_malt', region: 'Yamanashi', cask: 'American & European Oak', abv: 43, imageUrl: null },
  { name: 'Yamazaki 18 Year Old', distillery: 'Suntory', age: 18, volume: 700, category: 'japanese_single_malt', region: 'Osaka', cask: 'Mizunara, Sherry, American Oak', abv: 43, imageUrl: null },
  { name: 'Hibiki 21 Year Old', distillery: 'Suntory', age: 21, volume: 700, category: 'japanese_blended', region: 'Japan', cask: 'American, European, Mizunara', abv: 43, imageUrl: null },
  { name: 'Kirin Fuji Gotemba 18 Year Old', distillery: 'Kirin', age: 18, volume: 700, category: 'japanese_blended', region: 'Shizuoka', cask: 'American & European Oak', abv: 43, imageUrl: null },
  { name: 'Togouchi Premium', distillery: 'Chugoku Jozo', age: null, volume: 700, category: 'japanese_blended', region: 'Hiroshima', cask: 'American & European Oak', abv: 40, imageUrl: null },

  // ── CANADIAN ────────────────────────────────────────────────────────────────
  { name: 'Crown Royal Deluxe', distillery: 'Crown Royal', age: null, volume: 700, category: 'canadian', region: 'Manitoba', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Crown Royal XR Extra Rare', distillery: 'Crown Royal', age: null, volume: 700, category: 'canadian', region: 'Manitoba', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Canadian Club 12 Year Old', distillery: 'Canadian Club', age: 12, volume: 700, category: 'canadian', region: 'Ontario', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: "JP Wiser's 18 Year Old", distillery: 'Corby Spirit & Wine', age: 18, volume: 700, category: 'canadian', region: 'Ontario', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Forty Creek Barrel Select', distillery: 'Forty Creek', age: null, volume: 700, category: 'canadian', region: 'Ontario', cask: 'American Oak', abv: 40, imageUrl: null },

  // ── WORLD WHISKIES ──────────────────────────────────────────────────────────
  { name: 'Starward Nova', distillery: 'Starward', age: null, volume: 700, category: 'australian_single_malt', region: 'Victoria', cask: 'Australian Red Wine', abv: 41, imageUrl: null },
  { name: 'Starward Two-Fold', distillery: 'Starward', age: null, volume: 700, category: 'australian_blended_malt', region: 'Victoria', cask: 'Australian Red Wine', abv: 40, imageUrl: null },
  { name: 'Lark Classic Cask', distillery: 'Lark', age: null, volume: 500, category: 'australian_single_malt', region: 'Tasmania', cask: 'American Oak', abv: 43, imageUrl: null },
  { name: 'Paul John Brilliance', distillery: 'Paul John', age: null, volume: 700, category: 'indian_single_malt', region: 'Goa', cask: 'American White Oak', abv: 46, imageUrl: null },
  { name: 'Amrut Double Cask', distillery: 'Amrut', age: null, volume: 700, category: 'indian_single_malt', region: 'Bangalore', cask: 'American & Oloroso Sherry', abv: 46, imageUrl: null },
  { name: 'Kavalan Ex-Bourbon Oak', distillery: 'Kavalan', age: null, volume: 700, category: 'taiwanese_single_malt', region: 'Yilan', cask: 'American Oak', abv: 46, imageUrl: null },
  { name: 'Kavalan Concertmaster Port Cask Finish', distillery: 'Kavalan', age: null, volume: 700, category: 'taiwanese_single_malt', region: 'Yilan', cask: 'Port', abv: 40, imageUrl: null },
  { name: 'Penderyn Madeira', distillery: 'Penderyn', age: null, volume: 700, category: 'welsh_single_malt', region: 'Wales', cask: 'Madeira', abv: 46, imageUrl: null },
  { name: 'Penderyn Legend', distillery: 'Penderyn', age: null, volume: 700, category: 'welsh_single_malt', region: 'Wales', cask: 'Bourbon', abv: 41, imageUrl: null },
  { name: 'Mackmyra Brukswhisky', distillery: 'Mackmyra', age: null, volume: 700, category: 'swedish_single_malt', region: 'Sweden', cask: 'American & Swedish Oak', abv: 41.4, imageUrl: null },
  { name: 'Stauning KAOS', distillery: 'Stauning', age: null, volume: 700, category: 'danish_blended_malt', region: 'Denmark', cask: 'American & European Oak', abv: 46, imageUrl: null },
  { name: 'Stauning Rye', distillery: 'Stauning', age: null, volume: 700, category: 'danish_rye', region: 'Denmark', cask: 'American Oak', abv: 48, imageUrl: null },
  { name: 'Westland American Single Malt', distillery: 'Westland', age: null, volume: 700, category: 'american_single_malt', region: 'Washington', cask: 'American Oak', abv: 46, imageUrl: null },
  { name: 'Balcones Texas Single Malt', distillery: 'Balcones', age: null, volume: 700, category: 'american_single_malt', region: 'Texas', cask: 'American Oak', abv: 53, imageUrl: null },
  { name: 'Corsair Triple Smoke', distillery: 'Corsair', age: null, volume: 700, category: 'american_single_malt', region: 'Tennessee', cask: 'American Oak', abv: 40, imageUrl: null },
  { name: 'Waterford Organic Gaia 1.1', distillery: 'Waterford', age: null, volume: 700, category: 'irish_single_malt', region: 'Waterford', cask: 'American Oak', abv: 50, imageUrl: null },
  { name: 'Sullivan\'s Cove American Oak', distillery: "Sullivan's Cove", age: null, volume: 700, category: 'australian_single_malt', region: 'Tasmania', cask: 'American Oak', abv: 47.5, imageUrl: null },
];

// Realistic price ranges by category and age (GBP)
function mockPrice(category: string, age: number | null, abv: number): number {
  const base = category.startsWith('japanese') ? 80
    : category.startsWith('taiwanese') ? 70
    : category.startsWith('indian') ? 55
    : category.startsWith('bourbon') || category === 'rye' ? 45
    : category.startsWith('irish') ? 50
    : category.startsWith('scotch_single_malt') ? 55
    : category.startsWith('scotch_blended') ? 30
    : 40;

  const ageMult = age ? (1 + (age - 10) * 0.12) : 1;
  const abvMult = abv > 50 ? 1.1 : 1;
  const price = base * ageMult * abvMult;
  // Add ±15% random variation
  return Math.round(price * (0.85 + Math.random() * 0.3) * 100) / 100;
}

async function main() {
  console.log('Fetching existing retailers...');
  // db.execute returns the rows directly as an array
  const retailerRows = await db.execute<{ id: string; name: string; country: string; currency: string }>(
    sql`SELECT id, name, country, currency FROM retailers LIMIT 20`
  );

  if (retailerRows.length === 0) {
    console.error('No retailers found. Run the base seed first.');
    process.exit(1);
  }

  console.log(`Found ${retailerRows.length} retailers`);

  // Select up to 5 retailers for price seeding
  const retailerList = Array.from(retailerRows).slice(0, 5);

  let inserted = 0;
  let skipped = 0;
  let pricesAdded = 0;

  for (const w of WHISKIES) {
    try {
      // Check if product with this name already exists
      const existing = await db.execute<{ id: string }>(
        sql`SELECT id FROM products WHERE name = ${w.name} LIMIT 1`
      );

      let productId: string;

      if (existing.length > 0) {
        productId = existing[0]!.id;
        // Update image_url if we now have one and didn't before
        if (w.imageUrl) {
          await db.execute(sql`
            UPDATE products
            SET image_url = ${w.imageUrl}, updated_at = NOW()
            WHERE id = ${productId} AND image_url IS NULL
          `);
        }
        skipped++;
      } else {
        // Insert new product
        const result = await db.execute<{ id: string }>(sql`
          INSERT INTO products (id, name, distillery, age_years, volume_ml, category, region, cask_type, abv, image_url, created_at, updated_at)
          VALUES (
            gen_random_uuid(),
            ${w.name},
            ${w.distillery},
            ${w.age},
            ${w.volume},
            ${w.category},
            ${w.region},
            ${w.cask},
            ${w.abv}::numeric,
            ${w.imageUrl},
            NOW(),
            NOW()
          )
          RETURNING id
        `);

        productId = result[0]?.id ?? '';
        if (!productId) {
          console.error(`No id returned for ${w.name}`);
          continue;
        }
        inserted++;
      }

      // Add price snapshots from multiple retailers
      for (const retailer of retailerList) {
        // Only ~60% chance per retailer — not all whiskies available everywhere
        if (Math.random() > 0.6) continue;

        const priceLocal = mockPrice(w.category, w.age, w.abv);
        const currency = retailer.currency || 'GBP';
        const sourceProductId = `seed-${productId}-${retailer.id}`;

        // Create or get source_mapping (unique on retailer_id + source_product_id)
        const mappingResult = await db.execute<{ id: string }>(sql`
          INSERT INTO source_mappings (id, canonical_product_id, retailer_id, source_url, source_product_id, created_at)
          VALUES (
            gen_random_uuid(),
            ${productId},
            ${retailer.id},
            ${`https://example.com/products/${productId}`},
            ${sourceProductId},
            NOW()
          )
          ON CONFLICT (retailer_id, source_product_id) DO UPDATE
            SET source_url = EXCLUDED.source_url
          RETURNING id
        `);

        const mappingId = mappingResult[0]?.id;
        if (!mappingId) continue;

        // Insert price snapshot — plain INSERT (table is append-only, no unique constraint)
        await db.execute(sql`
          INSERT INTO price_snapshots (canonical_product_id, source_mapping_id, currency, price_local, price_usd, in_stock, scraped_at)
          VALUES (
            ${productId},
            ${mappingId},
            ${currency},
            ${priceLocal}::numeric,
            ${(priceLocal * 1.26).toFixed(2)}::numeric,
            true,
            NOW() - (random() * interval '24 hours')
          )
        `);

        pricesAdded++;
      }

      if ((inserted + skipped) % 10 === 0 && inserted + skipped > 0) {
        console.log(`Progress: ${inserted} new / ${skipped} existing (${inserted + skipped}/${WHISKIES.length}), ${pricesAdded} prices`);
      }
    } catch (err) {
      console.error(`Failed ${w.name}:`, (err as Error).message.substring(0, 120));
    }
  }

  console.log(`\nDone!`);
  console.log(`  Products inserted: ${inserted}`);
  console.log(`  Products already existed: ${skipped}`);
  console.log(`  Price snapshots added: ${pricesAdded}`);

  await queryClient.end();
  process.exit(0);
}

main().catch(console.error);
