import i18n from '../i18n';

export interface IAtvFormat {
  name: string;
  nameEs?: string;
  model?: string;
  unitNumber?: string;
  color?: string;
  colorEs?: string;
}

export const formatAtvName = (atv: IAtvFormat | null | undefined, lang?: string): string => {
  if (!atv) return 'Unknown Vehicle';
  
  const currentLang = lang || i18n.language || 'en';
  const isEs = currentLang.startsWith('es');
  
  const nameToUse = isEs && atv.nameEs ? atv.nameEs : atv.name;
  const colorToUse = isEs && atv.colorEs ? atv.colorEs : atv.color;
  
  const baseName = atv.model ? `${nameToUse} ${atv.model}` : nameToUse;
  
  if (atv.unitNumber && colorToUse) {
    return `${atv.unitNumber} - ${baseName} - ${colorToUse}`;
  } else if (atv.unitNumber) {
    return `${atv.unitNumber} - ${baseName}`;
  } else {
    return baseName;
  }
};
