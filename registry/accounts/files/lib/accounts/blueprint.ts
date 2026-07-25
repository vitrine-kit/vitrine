import type { BlueprintFieldDef, Extend } from '@vitrine-kit/contracts';

type BlueprintLike = {
  extend: Extend;
  addCollection: (config: {
    slug: string;
    fields: BlueprintFieldDef[];
    [option: string]: unknown;
  }) => void;
};

const isAdmin = ({ req }: { req?: { user?: { collection?: string } } }): boolean =>
  Boolean(req?.user && req.user.collection === 'users');

/** Customers can read/update only themselves; admins can manage all. */
const selfOrAdmin = ({ req }: { req?: { user?: { id?: string | number; collection?: string } } }) => {
  if (!req?.user) return false;
  if (req.user.collection === 'users') return true;
  return { id: { equals: req.user.id } };
};

export function extendAccountsBlueprint(blueprint: BlueprintLike): void {
  blueprint.addCollection({
    slug: 'customers',
    auth: { maxLoginAttempts: 5, lockTime: 10 * 60 * 1000 },
    admin: { useAsTitle: 'email', defaultColumns: ['email', 'name'] },
    access: {
      create: () => true,
      read: selfOrAdmin,
      update: selfOrAdmin,
      delete: isAdmin,
      admin: isAdmin,
    },
    fields: [{ name: 'name', type: 'text', label: 'Name' }],
  });

  blueprint.extend('order', {
    addFields: [
      {
        name: 'customer',
        type: 'relationship',
        relationTo: 'customers',
        label: 'Customer',
      },
    ],
  });
}
