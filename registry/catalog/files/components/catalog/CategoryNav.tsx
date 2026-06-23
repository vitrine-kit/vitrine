// Навигация по категориям — презентационная. Данные приходят пропсом из хоста
// слота (<Slot name="global.header-nav" categories={…} />).
import type { Category } from '@vitrine-kit/contracts';

export interface CategoryNavProps {
  categories: Category[];
}

export function CategoryNav({ categories }: CategoryNavProps) {
  return (
    <nav aria-label="Категории" className="vt-category-nav">
      <ul role="list" className="flex flex-wrap gap-gutter">
        {categories.map((category) => (
          <li key={category.id}>
            <a
              href={`/categories/${category.slug}`}
              className="text-fg transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 ring-ring"
            >
              {category.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
