export enum PlanFeature {
  MAX_STORES = 'MAX_STORES',
  MAX_PRODUCTS = 'MAX_PRODUCTS',
  MAX_IMPORTS = 'MAX_IMPORTS',
  MAX_MEMBERS = 'MAX_MEMBERS',
  ANALYTICS = 'ANALYTICS',
  ALERTS = 'ALERTS',
}

export const PLAN_FEATURE_DESCRIPTIONS: Record<PlanFeature, string> = {
  [PlanFeature.MAX_STORES]: 'Número máximo de lojas',
  [PlanFeature.MAX_PRODUCTS]: 'Número máximo de produtos',
  [PlanFeature.MAX_IMPORTS]: 'Número máximo de importações',
  [PlanFeature.MAX_MEMBERS]: 'Número máximo de membros',
  [PlanFeature.ANALYTICS]: 'Acesso a analytics e inteligência',
  [PlanFeature.ALERTS]: 'Acesso a alertas de preço/estoque',
};

export const DEFAULT_PLAN_TIER = 'FREE';
