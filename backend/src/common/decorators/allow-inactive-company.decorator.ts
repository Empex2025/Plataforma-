import { SetMetadata } from '@nestjs/common';

export const COMPANY_SCOPE_INACTIVE_KEY = 'companyScopeAllowInactive';

export const AllowInactiveCompany = () => SetMetadata(COMPANY_SCOPE_INACTIVE_KEY, true);
