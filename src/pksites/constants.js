export const PROC = ['absorption', 'distribution', 'metabolism', 'excretion'];

export const TISSUES = [
  'small intestine', 'liver', 'bile duct', 'kidney', 'blood', 'blood-brain barrier',
  'brain', 'placenta', 'mammary gland', 'lung', 'skin', 'skeletal muscle', 'adipose tissue',
  'stomach', 'ileum', 'heart', 'adrenal gland', 'platelet', 'ovary', 'neuromuscular junction'
];

export const W = { drugbank_actor: 3, paper_pgx: 2, drugbank_text: 1 };
export const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
export const MAX = 8;

// Body drawing geometry — measured in the drawing's own 105×195 viewBox
export const BODY_W = 105.43713;
export const BODY_H = 194.70567;
export const BODY_SCALE = 3.1;
export const BODY_X = 160;
export const BODY_Y = 8;

export const ORGANS = [
  { t: 'brain', id: 'UBERON_0000955', label: 'brain', side: 'R', ax: 57, ay: 5 },
  { t: 'blood-brain barrier', id: 'UBERON_0000955', label: 'blood–brain barrier', side: 'L', ax: 45, ay: 7, proxy: true },
  { t: 'lung', id: 'UBERON_0002048', label: 'lung', side: 'R', ax: 61, ay: 42 },
  { t: 'mammary gland', id: 'UBERON_0000310', label: 'mammary gland', side: 'L', ax: 39, ay: 47 },
  { t: 'heart', id: 'UBERON_0000948', label: 'heart', side: 'R', ax: 54, ay: 47 },
  { t: 'blood', id: 'UBERON_0001981', label: 'blood', side: 'L', ax: 28, ay: 62, whole: true },
  { t: 'adrenal gland', id: 'UBERON_0002369', label: 'adrenal gland', side: 'R', ax: 58, ay: 59 },
  { t: 'stomach', id: 'UBERON_0000945', label: 'stomach', side: 'R', ax: 62, ay: 61 },
  { t: 'liver', id: 'UBERON_0002107', label: 'liver', side: 'L', ax: 41, ay: 65 },
  { t: 'kidney', id: 'UBERON_0002113', label: 'kidney', side: 'R', ax: 59, ay: 68 },
  { t: 'bile duct', id: 'UBERON_0002110', label: 'bile duct', side: 'L', ax: 45, ay: 69 },
  { t: 'small intestine', id: 'UBERON_0002108', label: 'small intestine', side: 'R', ax: 60, ay: 80 },
  { t: 'adipose tissue', id: 'UBERON_0001013', label: 'adipose tissue', side: 'L', ax: 34, ay: 82, whole: true },
  { t: 'ileum', id: 'UBERON_0002116', label: 'ileum', side: 'R', ax: 57, ay: 87 },
  { t: 'placenta', id: 'UBERON_0001987', label: 'placenta', side: 'L', ax: 51, ay: 88 },
  { t: 'ovary', id: 'UBERON_0000992', label: 'ovary', side: 'R', ax: 57, ay: 90 },
  { t: 'skeletal muscle', id: 'UBERON_0001134', label: 'skeletal muscle', side: 'L', ax: 40, ay: 112, whole: true },
  { t: 'skin', id: 'UBERON_0000014', label: 'skin', side: 'R', ax: 90, ay: 118, whole: true },
];
