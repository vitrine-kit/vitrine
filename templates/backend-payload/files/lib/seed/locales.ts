// Optional non-default locale copy for the demo seed when Payload localization is enabled.
// Slugs stay shared; only human-readable fields differ.

export const demoLocales = {
  categories: {
    apparel: {
      ru: {
        title: 'Одежда',
        description: 'Повседневные слои — футболки, худи и носки с выбором размера.',
      },
    },
    accessories: {
      ru: {
        title: 'Аксессуары',
        description: 'Кепки и сумки, которые дополняют простой мерч-ассортимент.',
      },
    },
  },
  products: {
    'classic-tee': {
      ru: {
        title: 'Классическая футболка',
        description:
          'Прямой крой из хлопка средней плотности на каждый день. Мягкая фактура, усиленные плечевые швы. Выберите размер ниже и добавьте в корзину.',
        seo: {
          title: 'Классическая футболка — хлопок',
          description: 'Демо-товар одежды с несколькими размерами.',
        },
      },
    },
    'zip-hoodie': {
      ru: {
        title: 'Худи на молнии',
        description:
          'Флисовое худи на молнии с объёмным капюшоном. Носите поверх футболки или застёгнутым в прохладный вечер.',
        seo: {
          title: 'Худи на молнии — флис',
          description: 'Демо-худи с размерами и галереей.',
        },
      },
    },
    'logo-cap': {
      ru: {
        title: 'Кепка с логотипом',
        description: 'Структурированная кепка с регулируемой застёжкой. Выберите цвет и добавьте в корзину.',
        seo: {
          title: 'Кепка с логотипом',
          description: 'Демо-аксессуар с цветовыми вариантами.',
        },
      },
    },
  },
} as const;
