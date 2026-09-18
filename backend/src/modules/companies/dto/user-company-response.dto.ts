import { ApiProperty } from '@nestjs/swagger';
import { CompanyResponseDto } from './company-response.dto.js';

export class UserCompanyResponseDto {
  @ApiProperty({ description: 'Empresa do usuário', type: CompanyResponseDto })
  company!: CompanyResponseDto;

  @ApiProperty({ description: 'Papel do usuário na empresa', example: 'MERCHANT_OWNER' })
  role!: string;
}
