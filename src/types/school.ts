export enum SchoolType {
  Primary = '小学',
  JuniorMiddle = '初中',
  SeniorHigh = '高中',
  NineYear = '九年一贯制',
  Complete = '完全中学',
  TwelveYear = '十二年一贯制',
}

export type District =
  | '东城区'
  | '西城区'
  | '朝阳区'
  | '丰台区'
  | '石景山区'
  | '海淀区'
  | '门头沟区'
  | '房山区'
  | '通州区'
  | '顺义区'
  | '昌平区'
  | '大兴区'
  | '怀柔区'
  | '平谷区'
  | '密云区'
  | '延庆区';

export interface School {
  slug: string;
  name: string;
  type: SchoolType;
  district: District;
  address: string;
  phone: string;
  website?: string;
  founded: number;
  description: string;
  highlights: string[];
  imageUrl?: string;
}
