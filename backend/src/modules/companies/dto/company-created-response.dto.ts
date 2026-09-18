import { ApiProperty } from '@nestjs/swagger';
import { CompanyResponseDto } from './company-response.dto.js';

export class CompanyMembershipResponseDto {
  @ApiProperty({ description: 'Papel do usuário na empresa', example: 'MERCHANT_OWNER' })
  role!: string;

  @ApiProperty({ description: 'Data de criação do vínculo' })
  createdAt!: Date;
}

export class CompanyCreatedResponseDto {
  @ApiProperty({ description: 'Empresa criada', type: CompanyResponseDto })
  company!: CompanyResponseDto;

  @ApiProperty({ description: 'Vínculo do usuário criador com a empresa', type: CompanyMembershipResponseDto })
  membership!: CompanyMembershipResponseDto;
}
