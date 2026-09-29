import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { StorageService } from '@/common/storage/storage.service.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';

interface UploadedImage {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('image')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES },
      fileFilter: (_request, file, callback) => {
        if (!file.mimetype?.startsWith('image/')) {
          callback(new BadRequestException('Apenas imagens são permitidas'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Enviar uma imagem (logo/capa) e obter a URL pública',
  })
  @ApiCreatedResponse({ description: 'Imagem enviada' })
  @ApiBadRequestResponse({ description: 'Arquivo ausente ou inválido', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Armazenamento indisponível', type: ErrorResponseDto })
  async uploadImage(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file?: UploadedImage,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatório');
    }

    const key = this.storage.buildKey(`stores/${userId}`, file.originalname);
    const url = await this.storage.upload(file.buffer, key, file.mimetype);

    return { url, key };
  }
}
