export interface ModulePermission {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export type UserModulePermissions = Record<string, ModulePermission>;

export interface PermissionProfile {
  role?: string;
  pages_access?: string[] | any;
  modules_access?: any;
  active?: number;
}

/**
 * Returns the granular permissions for a given module.
 * Administrators always have full permissions.
 * Operators have explicit view/edit/delete access based on modules_access map.
 */
export function getModulePermission(profile?: PermissionProfile | null, moduleTitle?: string): ModulePermission {
  if (!profile || !moduleTitle) {
    return { view: false, edit: false, delete: false };
  }

  // Administrator role has full unrestricted access
  if (profile.role === "Administrator") {
    return { view: true, edit: true, delete: true };
  }

  let modAccess = profile.modules_access;
  if (typeof modAccess === "string") {
    try {
      modAccess = JSON.parse(modAccess);
    } catch {
      modAccess = {};
    }
  }

  // Legacy format support (array of module titles)
  if (Array.isArray(modAccess)) {
    const has = modAccess.includes(moduleTitle);
    return { view: has, edit: has, delete: has };
  }

  if (modAccess && typeof modAccess === "object") {
    const perm = modAccess[moduleTitle];
    if (perm && typeof perm === "object") {
      return {
        view: !!perm.view,
        edit: !!perm.edit,
        delete: !!perm.delete,
      };
    }
  }

  return { view: false, edit: false, delete: false };
}

export function canViewModule(profile?: PermissionProfile | null, moduleTitle?: string): boolean {
  return getModulePermission(profile, moduleTitle).view;
}

export function canEditModule(profile?: PermissionProfile | null, moduleTitle?: string): boolean {
  return getModulePermission(profile, moduleTitle).edit;
}

export function canDeleteModule(profile?: PermissionProfile | null, moduleTitle?: string): boolean {
  return getModulePermission(profile, moduleTitle).delete;
}

/**
 * Checks if a user has access to a top-level page.
 * Administrator: has access to all pages.
 * Operator: has access if the page is in pages_access OR if they have view access to any sub-module of that page.
 */
export function canAccessPage(profile?: PermissionProfile | null, pageId?: string, pageModules: string[] = []): boolean {
  if (!profile || !pageId) return false;
  if (pageId === "Dashboard") return true;

  if (profile.role === "Administrator") return true;

  // Check explicit pages_access
  let pages = profile.pages_access;
  if (typeof pages === "string") {
    try {
      pages = JSON.parse(pages);
    } catch {
      pages = [];
    }
  }
  if (Array.isArray(pages) && pages.includes(pageId)) return true;

  // Check if user has view permission for at least one module under this page
  if (pageModules.length > 0) {
    return pageModules.some((m) => canViewModule(profile, m));
  }

  return false;
}
