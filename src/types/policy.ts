export type District = '昌平区' | '海淀区';

export type GroupSlug =
  | 'beijing-huji'       // 北京户籍
  | 'work-permit'        // 持工作居住证（工居证）
  | 'residence-permit'   // 持居住证（非京籍）
  | 'no-permit';         // 无证件

export interface Material {
  name: string;       // 材料名称
  detail?: string;    // 补充说明
  required: boolean;  // 必须 or 参考
}

export interface Condition {
  title: string;
  items: string[];
}

export interface PolicyGroup {
  slug: GroupSlug;
  label: string;
  tagColor: string;        // Tailwind class
  district: District;
  priority: number;        // 1=最优先
  priorityLabel: string;  // "与京籍相同" 等
  conditions: Condition[];
  materials: Material[][];  // 分组材料，每组有标题
  materialGroups: string[]; // 每组材料的标题
  notes: string[];
  keyDates?: string[];
}
