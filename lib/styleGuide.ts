import { AI_STYLES, findAiStyleBySelection } from './styleLibrary';

/** Một ô trong popup Thư viện phong cách (dữ liệu từ ai_styles.json). */
export interface StyleGuideItem {
  id: string;
  name: string;
  category: string;
  /** Giá trị lưu vào selectedStyle: `Category:Name` (prompt tra theo tên qua findAiStyleBySelection). */
  value: string;
}

export const STYLE_GUIDE_ITEMS: StyleGuideItem[] = AI_STYLES.map((style) => ({
  id: style.id,
  name: style.name,
  category: style.category,
  value: `${style.category}:${style.name}`,
}));

/** Nhóm theo thứ tự xuất hiện đầu tiên, kèm số style mỗi nhóm. */
export function getStyleGuideCategories(
  items: StyleGuideItem[]
): Array<{ category: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  return [...counts].map(([category, count]) => ({ category, count }));
}

/** `null` = tất cả nhóm. */
export function filterStyleGuideItems(
  items: StyleGuideItem[],
  category: string | null
): StyleGuideItem[] {
  return category ? items.filter((item) => item.category === category) : items;
}

/** So theo style thực (cả giá trị cũ dạng `Style:Photorealistic`). */
export function isStyleGuideItemSelected(item: StyleGuideItem, selectedStyle: string): boolean {
  return findAiStyleBySelection(selectedStyle)?.id === item.id;
}

/** Tên hiển thị của style đang chọn (không kèm category); style lạ → phần sau dấu `:`. */
export function getStyleDisplayName(selectedStyle: string): string {
  if (!selectedStyle) return '';
  const style = findAiStyleBySelection(selectedStyle);
  if (style) return style.name;
  const parts = selectedStyle.split(':');
  return (parts.length > 1 ? parts.slice(1).join(':') : parts[0]).trim();
}
